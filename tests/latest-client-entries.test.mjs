import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { prepareLatestClientEntries } from '../compatibility/latest-upstream/client-entries.mjs';

const sourceRoot = process.env.DSHM_LATEST_SOURCE_ROOT;
if (sourceRoot === undefined) await prepareLatestClientEntries();
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check'), require = createRequire(resolve(runtime, 'package.json'));
const { Context } = await import(pathToFileURL(sourceRoot === undefined ? require.resolve('@deepseek-ai/cordis') : resolve(sourceRoot, 'vendor/cordis/src/index.ts')).href);
const { default: Loader } = await import(pathToFileURL(sourceRoot === undefined ? require.resolve('@deepseek-ai/cordis-plugin-loader') : resolve(sourceRoot, 'vendor/loader/src/index.ts')).href);
let registration;
let exports;
if (sourceRoot === undefined) {
  runInNewContext(await readFile(require.resolve('@deepseek-ai/dsh-client-modules/client'), 'utf8'), {
  window: { __ModuleLoader__: { load: value => { registration = value; } } }, console,
  // DOM 仅用于原 bootstrap 清理样式；真实 Host/手机页面另由跨端专项验证。
  document: { querySelectorAll: () => [] },
  });
  exports = registration.factory(() => { throw Error('bootstrap_must_be_dependency_free'); });
} else {
  // 执行原源码模块系统和Loader，不用编译候选的VM结果冒充源码结果。
  exports = await import(pathToFileURL(resolve(sourceRoot, 'packages/client/modules/src/client/index.ts')).href);
}
const bootstrap = '@deepseek-ai/dsh-client-modules';
function graph(rev = 'one') {
  const ids = [bootstrap, '@test/stable', '@test/changing', '@test/desktop'];
  return { rev, entries: ids.map(id => ({ id, rev: id === '@test/changing' ? rev : 'one', url: `${id}?rev=${rev}` })),
    batches: ids.map(id => ({ phase: id === bootstrap ? 'bootstrap' : 'application', entries: [id], url: `${id}?rev=${rev}`, rev })) };
}
async function fixture(t, selected = true) {
  const started = [], stopped = [], target = { mode: 'queue', pendingQueue: [], load() {} };
  const modules = exports.createClientModuleSystem(target, { id: bootstrap, exports }, { boot: graph(), staticModules: {},
    loadBundle: async url => { const id = url.split('?')[0]; target.load({ id, factory: () => ({ apply(ctx) {
      started.push(id); ctx.effect(() => () => stopped.push(id));
    } }) }); } });
  const ctx = new Context(); t.after(() => ctx.fiber.dispose()); await ctx.plugin(Loader);
  let loader;
  await ctx.plugin({ inject: ['loader'], apply(scope) { loader = scope.loader; } }); loader.internal = modules;
  const manifest = selected ? { ...modules.manifest, plugins: modules.manifest.plugins.filter(row => row.id !== '@test/desktop') } : modules.manifest;
  await modules.entries.start(loader, manifest);
  return { ctx, loader, modules, started, stopped, selected: manifest.plugins.map(row => row.id),
    stable: () => [...loader.entries()].find(row => row.options.name === '@test/stable').fiber };
}

test('新版 bootstrap 与真实 Loader：仅替换改变插件，保留其他实例与完整依赖图', async t => {
  const f = await fixture(t), stable = f.stable();
  await f.modules.entries.syncSelected(graph('two'), f.selected);
  assert.equal(f.stable(), stable); assert.equal(f.started.filter(id => id === '@test/changing').length, 2);
  assert.equal(f.stopped.filter(id => id === '@test/changing').length, 1);
  assert.equal(f.started.includes('@test/desktop'), false); assert(f.modules.manifest.modules.some(row => row.id === '@test/desktop'));
  await f.modules.entries.syncSelected(graph('two'), f.selected.filter(id => id !== '@test/changing'));
  assert(![...f.loader.entries()].some(row => row.options.name === '@test/changing'));
  await f.modules.entries.reload('@test/desktop', 'two'); assert.equal(f.started.includes('@test/desktop'), false);
  await f.modules.entries.syncSelected(graph('two'), f.selected);
  assert.equal(f.stable(), stable); assert.equal(f.started.filter(id => id === '@test/changing').length, 3);
  await f.ctx.fiber.dispose(); assert.equal(f.started.length, f.stopped.length);
});

test('新版非法名单拒绝、移除后重装、桌面原全量 sync 与销毁边界', async t => {
  const f = await fixture(t), stable = f.stable();
  for (const ids of [['@unknown'], ['@test/stable', '@test/stable'], null, [42]])
    assert.throws(() => f.modules.entries.syncSelected(graph('two'), ids), /invalid activation selection/);
  assert.equal(f.stopped.length, 0); assert.equal(f.modules.manifest.rev, 'one');
  const absent = graph('removed'); absent.entries = absent.entries.filter(row => row.id !== '@test/changing');
  absent.batches = absent.batches.filter(row => !row.entries.includes('@test/changing'));
  await f.modules.entries.syncSelected(absent, f.selected.filter(id => id !== '@test/changing'));
  assert.equal(f.modules.loadCache.has('@test/changing'), false);
  await f.modules.entries.syncSelected(graph(), f.selected);
  assert.equal(f.modules.entries.state.getSnapshot().failures.length, 0); assert.equal(f.stable(), stable);
  const desktop = await fixture(t, false); await desktop.modules.entries.sync(graph('two'));
  assert.equal(desktop.started.filter(id => id === '@test/desktop').length, 1);
  await desktop.ctx.fiber.dispose(); const count = desktop.started.length;
  await desktop.modules.entries.sync(graph('three')); assert.equal(desktop.started.length, count); assert.equal(desktop.stopped.length, count);
});
