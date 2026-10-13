import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { prepareLatestCordisClientLifetime } from '../compatibility/latest-upstream/cordis-client-lifetime.mjs';

const sourceRoot = process.env.DSHM_LATEST_SOURCE_ROOT;
const report = sourceRoot === undefined ? await prepareLatestCordisClientLifetime() : { files: [
  { path: resolve(sourceRoot, 'packages/extensions/ui-cordis/src/client/inventory.ts') },
  { path: resolve(sourceRoot, 'packages/extensions/cordis-client-runner/src/client/inspect-registry.ts') },
  { path: resolve(sourceRoot, 'packages/api/remotes/src/remote-events.ts'),
    backup: resolve(import.meta.dirname, '../artifacts/latest-source-patches/original/packages/api/remotes/src/remote-events.ts') },
] };
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check'), require = createRequire(resolve(runtime, 'package.json'));
const { Context } = await import(pathToFileURL(sourceRoot === undefined ? require.resolve('@deepseek-ai/cordis') : resolve(sourceRoot, 'vendor/cordis/src/index.ts')).href);
// 执行实际候选 bundle 中的原注册表/函数；只用受控异步端点重现迟到、重连及合并时序。
async function extract(path, name, globals = {}) {
  const source = await readFile(path, 'utf8'), file = ts.createSourceFile('bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), matches = [];
  const visit = node => {
    if ((ts.isFunctionDeclaration(node) && node.name?.text === name)
      || (ts.isClassExpression(node) && ts.isVariableDeclaration(node.parent) && node.parent.name.getText(file) === name)) matches.push(node);
    ts.forEachChild(node, visit);
  }; visit(file); assert.equal(matches.length, 1);
  return runInNewContext('(' + matches[0].getText(file) + ')', { Promise, Set, Map, Error, AbortController, queueMicrotask, console, ...globals });
}
const inspectSource = sourceRoot === undefined ? undefined : await import(pathToFileURL(report.files[1].path).href);
const Inspect = inspectSource === undefined ? await extract(report.files[1].path, 'ClientCordisInspectRegistry') : inspectSource.ClientCordisInspectRegistry;
const provide = inspectSource === undefined ? await extract(report.files[1].path, 'provideClientCordisInspect') : inspectSource.provideClientCordisInspect;
const createInventory = sourceRoot === undefined ? await extract(report.files[0].path, 'createCordisInventory')
  : (await import(pathToFileURL(report.files[0].path).href)).createCordisInventory;
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const row = { pluginId: 'latest-owned-fixture', agentId: 'fixture', packages: [] };
function inventoryFixture() {
  const calls = [], errors = [], publications = [];
  const inventory = createInventory({ inventory() { const pending = Promise.withResolvers(); calls.push(pending); return pending.promise; } }, e => errors.push(e));
  inventory.subscribe(() => publications.push(inventory.getSnapshot())); return { inventory, calls, errors, publications };
}

test('候选原客户端：Cordis fiber 销毁后不再上报空目录或迟到错误', async t => {
  const calls = [], errors = [], pending = Promise.withResolvers(), ctx = new Context(); t.after(() => ctx.fiber.dispose());
  const registry = new Inspect({ sync: async providers => { calls.push(Array.from(providers, row => row.id)); await pending.promise; }, resolve: async () => {} });
  const saved = console.error; console.error = (...args) => errors.push(args);
  try {
    provide(ctx, registry); ctx.effect(() => registry.register({ manifest: { id: 'phone', methods: [] }, query: async () => null }));
    await flush(); assert.deepEqual(calls, [['phone']]); await ctx.fiber.dispose(); pending.reject(Error('old connection aborted')); await flush();
    assert.equal(calls.length, 1); assert.equal(errors.length, 0); assert.throws(() => registry.register({ manifest: { id: 'late' } }), /disposed/);
  } finally { console.error = saved; }
});

test('候选原客户端：旧微任务与排队同步失效，重连仅上报保留的当前提供者', async () => {
  const calls = [], first = Promise.withResolvers();
  const registry = new Inspect({ sync: async providers => { calls.push(Array.from(providers, row => row.id)); if (calls.length === 1) await first.promise; }, resolve: async () => {} });
  registry.register({ manifest: { id: 'first', methods: [] }, query: async () => null }); await flush();
  registry.register({ manifest: { id: 'second', methods: [] }, query: async () => null }); await flush();
  registry.reset(); first.resolve(); await flush(); assert.equal(calls.length, 1);
  registry.publish(); await flush(); assert.deepEqual(calls[1], ['first', 'second']);
  registry.register({ manifest: { id: 'third', methods: [] }, query: async () => null }); registry.dispose(); await flush(); assert.equal(calls.length, 2);
});

test('候选原客户端：旧查询完成不能删除重连后复用同一 queryId 的新查询', async () => {
  const queries = [], answers = [];
  const registry = new Inspect({ sync: async () => {}, resolve: async (...args) => answers.push(args) });
  registry.register({ manifest: { id: 'provider', methods: [{ name: 'read' }] }, query: async (_method, _input, ctx) => {
    const pending = Promise.withResolvers(); queries.push({ ...pending, signal: ctx.signal }); return pending.promise;
  } });
  const request = { requestId: 'same-query', agentId: 'fixture', provider: 'provider', method: 'read' };
  const old = registry.query(request); registry.reset(); assert.equal(queries[0].signal.aborted, true);
  const current = registry.query(request); queries[0].resolve('old'); await old;
  registry.close(request.requestId); assert.equal(queries[1].signal.aborted, true); queries[1].resolve('current'); await current;
  assert.deepEqual(answers, []); registry.dispose();
});

test('候选原 inventory：读取中的变化合并为后续读取，旧移除快照不恢复条目', async () => {
  const f = inventoryFixture(); f.inventory.refresh(); f.inventory.refresh(); f.inventory.refresh(); assert.equal(f.calls.length, 1);
  f.calls[0].resolve([row]); await flush(); assert.equal(f.calls.length, 2);
  f.inventory.retire(row.pluginId); f.inventory.refresh(); f.calls[1].resolve([row]); await flush();
  assert(f.publications.slice(1).every(snapshot => !snapshot.rows.some(value => value.pluginId === row.pluginId)));
  f.calls[2].resolve([]); await flush(); assert.equal(f.calls.length, 3); assert.deepEqual(f.errors, []);
});

test('候选原 inventory：reset/dispose 屏蔽旧错误和排队读取，当前失败保留展示', async () => {
  for (const kind of ['reset', 'dispose']) {
    const f = inventoryFixture(); f.inventory.refresh(); f.inventory.refresh(); f.inventory[kind](); f.calls[0].reject(Error('old')); await flush();
    assert.equal(f.calls.length, 1); assert.deepEqual(f.errors, []);
    if (kind === 'reset') {
      f.inventory.refresh(); f.calls[1].reject(Error('current')); await flush(); assert.equal(f.errors.length, 1);
      assert.equal(f.inventory.getSnapshot().error, 'current'); f.inventory.refresh(); f.calls[2].resolve([]); await flush();
      assert.equal(f.inventory.getSnapshot().error, undefined);
    }
  }
});

test('候选原 inventory：旧结算不能清掉新连接的在途读取，新主机同一 ID 可恢复', async () => {
  const f = inventoryFixture(); f.inventory.refresh(); f.inventory.refresh(); f.inventory.retire(row.pluginId); f.inventory.reset();
  f.inventory.refresh(); f.inventory.refresh(); f.calls[0].resolve([row]); await flush(); assert.equal(f.calls.length, 2);
  assert.equal(f.inventory.getSnapshot().read, false); f.calls[1].resolve([row]); await flush(); assert.equal(f.calls.length, 3);
  assert.equal(f.inventory.getSnapshot().rows[0], row); f.calls[2].resolve([]); await flush(); assert.equal(f.calls.length, 3);
});

test('候选原转发清单：仅新增无参数 emit，保留全部原事件与顺序且没有空条目', async () => {
  for (const row of report.files.slice(2)) {
    const getList = text => {
      const file = ts.createSourceFile('events.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); let found;
      const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'API_REMOTE_FORWARDED_EVENTS') found = node.initializer; ts.forEachChild(node, visit); };
      visit(file); assert(found);
      while (ts.isAsExpression(found) || ts.isSatisfiesExpression(found)) found = found.expression;
      return runInNewContext(found.getText(file));
    };
    const before = getList(await readFile(row.backup, 'utf8')), after = getList(await readFile(row.path, 'utf8'));
    assert.equal(after.length, before.length + 1); assert(after.every(value => value && typeof value.event === 'string'));
    assert.equal(JSON.stringify(after.slice(0, -1)), JSON.stringify(before)); assert.equal(after.at(-1).event, 'cordis/inventory-changed');
    assert.equal(after.at(-1).mode, 'emit');
  }
});
