import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Context } from '@deepseek-ai/cordis';
import Loader from '@deepseek-ai/cordis-plugin-loader';
import { resolve } from 'node:path';
import { prepare, outputRoot } from './build.mjs';

await prepare();
const exports = createRequire(import.meta.url)(resolve(outputRoot, 'test-runtime.cjs'));
const bootstrap = '@deepseek-ai/dsh-client-modules';
function graph(rev = 'one') {
  const ids = [bootstrap, '@test/stable', '@test/changing', '@test/desktop'];
  return { rev, entries: ids.map(id => ({ id, rev: id === '@test/changing' ? rev : 'one', url: `${id}?rev=${rev}` })),
    batches: ids.map(id => ({ phase: id === bootstrap ? 'bootstrap' : 'application', entries: [id], url: `${id}?rev=${rev}`, rev })) };
}
async function fixture(selected = true) {
  const target = { mode: 'queue', pendingQueue: [], load() {} }, started = [], stopped = [];
  const modules = exports.createClientModuleSystem(target, { id: bootstrap, exports }, { boot: graph(), staticModules: {},
    loadBundle: async url => { const id = url.split('?')[0]; target.load({ id, factory: () => ({ apply(ctx) {
      started.push(id); ctx.effect(() => () => stopped.push(id));
    } }) }); } });
  const parent = new Context(); let ctx;
  const owner = parent.plugin({ apply(scope) { ctx = scope; } });
  await owner.await(); await ctx.plugin(Loader);
  let loader;
  await ctx.plugin({ inject: ['loader'], apply(scope) { loader = scope.loader; } }).await();
  loader.internal = modules;
  const manifest = selected ? { ...modules.manifest, plugins: modules.manifest.plugins.filter(row => row.id !== '@test/desktop') } : modules.manifest;
  await modules.entries.start(loader, manifest);
  const selection = manifest.plugins.map(row => row.id);
  return { modules, loader, started, stopped, selection, dispose: () => owner.dispose() };
}

test('增量仅替换变化模块，选择名单可缩小/恢复且完整模块表保留', async () => {
  const f = await fixture();
  try {
    const stable = [...f.loader.entries()].find(entry => entry.options.name === '@test/stable').fiber;
    await f.modules.entries.syncSelected(graph('two'), f.selection);
    assert.equal([...f.loader.entries()].find(entry => entry.options.name === '@test/stable').fiber, stable);
    assert.equal(f.started.filter(id => id === '@test/changing').length, 2);
    assert.equal(f.stopped.filter(id => id === '@test/changing').length, 1);
    assert.equal(f.started.includes('@test/desktop'), false);
    assert.equal(f.modules.manifest.modules.some(row => row.id === '@test/desktop'), true);
    await f.modules.entries.syncSelected(graph('two'), f.selection.filter(id => id !== '@test/changing'));
    assert.equal([...f.loader.entries()].some(entry => entry.options.name === '@test/changing'), false);
    await f.modules.entries.reload('@test/desktop', 'two');
    assert.equal(f.started.includes('@test/desktop'), false);
    await f.modules.entries.syncSelected(graph('two'), f.selection);
    assert.equal([...f.loader.entries()].find(entry => entry.options.name === '@test/stable').fiber, stable);
    assert.equal(f.started.filter(id => id === '@test/changing').length, 3);
  } finally { await f.dispose(); }
  assert.equal(f.started.length, f.stopped.length);
});

test('非法或重复激活名单在修改任何实例前拒绝', async () => {
  const f = await fixture();
  try {
    const count = f.started.length;
    for (const ids of [['@unknown/plugin'], ['@test/stable', '@test/stable'], null, [42]]) {
      assert.throws(() => f.modules.entries.syncSelected(graph('two'), ids), /invalid activation selection/);
    }
    assert.equal(f.started.length, count); assert.equal(f.stopped.length, 0);
    assert.equal(f.modules.manifest.rev, 'one');
  } finally { await f.dispose(); }
});

test('卸载从图中移除后，同版本重装恢复原插件实例并保持其他实例', async () => {
  const f = await fixture();
  try {
    const stable = [...f.loader.entries()].find(entry => entry.options.name === '@test/stable').fiber;
    const absent = graph('removed');
    absent.entries = absent.entries.filter(row => row.id !== '@test/changing');
    absent.batches = absent.batches.filter(row => !row.entries.includes('@test/changing'));
    await f.modules.entries.syncSelected(absent, f.selection.filter(id => id !== '@test/changing'));
    assert.equal(f.modules.loadCache.has('@test/changing'), false);
    await f.modules.entries.syncSelected(graph(), f.selection);
    assert.deepEqual(f.modules.entries.state.getSnapshot().failures, []);
    assert.equal([...f.loader.entries()].find(entry => entry.options.name === '@test/changing').fiber.state, 2);
    assert.equal([...f.loader.entries()].find(entry => entry.options.name === '@test/stable').fiber, stable);
    assert.equal(f.started.filter(id => id === '@test/changing').length, 2);
  } finally { await f.dispose(); }
});

test('原桌面 sync 仍全量激活，销毁后同步不再创建插件', async () => {
  const f = await fixture(false);
  await f.modules.entries.sync(graph('two'));
  assert.equal(f.started.filter(id => id === '@test/desktop').length, 1);
  await f.dispose();
  const count = f.started.length;
  await f.modules.entries.sync(graph('three'));
  assert.equal(f.started.length, count); assert.equal(f.stopped.length, count);
});
