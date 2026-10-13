import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { prepareLatestCordisScopes, transformLatestCordis } from '../compatibility/latest-upstream/cordis-scopes.mjs';
import { sourceCordisDeclarations, sourceCordisRemoteNames, transformSourceCordisScopes } from '../compatibility/latest-upstream/source-cordis-scopes.mjs';

const sourceRoot = process.env.DSHM_LATEST_SOURCE_ROOT;
if (sourceRoot === undefined) await prepareLatestCordisScopes();
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check'), require = createRequire(resolve(runtime, 'package.json'));
const sourceEntries = {
  '@deepseek-ai/cordis': 'vendor/cordis/src/index.ts',
  '@deepseek-ai/dsh-cordis-host-runner': 'packages/extensions/cordis-host-runner/src/index.ts',
  '@deepseek-ai/dsh-cordis-host-runner/typert': 'packages/extensions/cordis-host-runner/lib/typert.host.js',
  '@deepseek-ai/dsh-client-connection': 'packages/client/connection/src/index.ts',
  '@deepseek-ai/dsh-typert-registry': 'packages/typert/registry/src/index.ts',
  '@deepseek-ai/dsh-api-gateway': 'packages/api/gateway/src/index.ts',
  '@deepseek-ai/dsh-system-prompt': 'packages/core/system-prompt/src/index.ts',
  '@deepseek-ai/dsh-tools': 'packages/core/tools/src/index.ts',
};
const load = name => {
  if (sourceRoot === undefined) return import(pathToFileURL(require.resolve(name)).href);
  if (!Object.hasOwn(sourceEntries, name)) throw Error('unsupported_source_test_entry');
  // Runner与服务用实际TS；codec用本次固定源码生成的原typert文件，不回退旧版npm。
  return import(pathToFileURL(resolve(sourceRoot, sourceEntries[name])).href);
};
const { Context } = await load('@deepseek-ai/cordis');
const bundled = await load('@deepseek-ai/dsh-cordis-host-runner');
const entries = sourceRoot === undefined ? [
  ['main', bundled.CordisInspectRegistryService],
  ['types-runtime', (await import(pathToFileURL(resolve(runtime, 'node_modules/@deepseek-ai/dsh-cordis-host-runner/lib/types/inspect-registry.js')).href)).CordisInspectRegistryService],
] : [['source', bundled.CordisInspectRegistryService]];
const manifest = (id, type = 'string') => ({ id, description: 'Isolated fixture provider', methods: [{ name: 'read', description: 'Read fixture',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type } }] });
const ids = registry => registry.list().filter(item => item.platform === 'client').map(item => item.id);
const tick = () => new Promise(resolve => setImmediate(resolve));
async function fixture(t, Registry) {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose()); await ctx.plugin(Registry, 1000);
  return { ctx, registry: ctx.cordisInspect };
}

for (const [entry, Registry] of entries) {
  test(`${entry}: 电脑、两个手机目录独立，冲突原子拒绝与不可变 JSON 契约`, async t => {
    const { registry } = await fixture(t, Registry);
    registry.register({ manifest: manifest('host'), query: async () => 'host' });
    const desktop = manifest('shared'); desktop.methods.push({ ...desktop.methods[0], name: 'other' });
    registry.syncClientManifest([manifest('desktop'), desktop]);
    const first = registry.createClientManifestScope(), second = registry.createClientManifestScope();
    const equivalent = structuredClone(desktop); equivalent.methods.reverse();
    equivalent.methods[0].inputSchema = { additionalProperties: false, properties: {}, type: 'object' };
    first.sync([manifest('phone'), equivalent]); second.sync([manifest('other-phone')]);
    assert.deepEqual(ids(registry), ['desktop', 'shared', 'phone', 'other-phone']);
    desktop.methods[0].outputSchema.type = 'number'; equivalent.methods[0].outputSchema.type = 'boolean';
    const row = registry.list().find(row => row.id === 'shared'); assert.equal(row.methods[0].outputSchema.type, 'string');
    assert.throws(() => { row.methods[0].outputSchema.type = 'number'; }, TypeError);
    for (const invalid of [[manifest('shared', 'number')], [manifest('x'), manifest('x')], [manifest('')]])
      assert.throws(() => first.sync(invalid));
    assert.deepEqual(ids(registry), ['desktop', 'shared', 'phone', 'other-phone']);
    first.sync([]); assert.deepEqual(ids(registry), ['desktop', 'shared', 'other-phone']);
    second.dispose(); second.dispose(); assert.deepEqual(ids(registry), ['desktop', 'shared']);
    registry.syncClientManifest([]); assert.deepEqual(ids(registry), []);
    assert.deepEqual(registry.list().map(row => [row.platform, row.id]), [['host', 'host']]);
    assert.throws(() => second.sync([manifest('stale')]), /closed/);
  });

  test(`${entry}: await 保留连接归属，断线/服务关闭拒绝迟到写入及新句柄`, async t => {
    for (const serviceClose of [false, true]) {
      const { ctx, registry } = await fixture(t, Registry); registry.syncClientManifest([manifest('desktop')]);
      const first = registry.createClientManifestScope(), second = registry.createClientManifestScope(); let release;
      const pending = first.run(async () => {
        await new Promise(resolve => { release = resolve; }); registry.syncClientManifest([manifest('late')]);
      });
      const rejected = assert.rejects(pending, /closed/);
      await second.run(async () => { await tick(); registry.syncClientManifest([manifest('second')]); });
      assert.deepEqual(ids(registry), ['desktop', 'second']);
      if (serviceClose) await ctx.fiber.dispose(); else first.dispose();
      release(); await rejected; assert.deepEqual(ids(registry), serviceClose ? [] : ['desktop', 'second']);
      if (serviceClose) {
        assert.throws(() => registry.createClientManifestScope(), /closed/);
        assert.throws(() => registry.syncClientManifest([manifest('late-desktop')]), /closed/);
        second.dispose(); assert.deepEqual(ids(registry), []);
      }
    }
  });

  test(`${entry}: 原查询验证会话和结果，断线不替代原取消/结算`, async t => {
    const { ctx, registry } = await fixture(t, Registry), scope = registry.createClientManifestScope();
    scope.sync([manifest('phone')]); const agent = { id: 'isolated-agent' }, controller = new AbortController();
    t.after(() => controller.abort()); let request; ctx.on('cordis/inspect-query', value => { request = value; });
    const result = registry.query('client', 'phone', 'read', {}, agent, controller.signal); assert(request);
    assert.deepEqual(registry.resolveClientQuery({ id: 'other' }, request.requestId, { ok: true, data: 'wrong' }), { accepted: false });
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 42 }), { accepted: false });
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'valid' }), { accepted: true });
    assert.equal(await result, 'valid');
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'late' }), { accepted: false });
    const cancelled = registry.query('client', 'phone', 'read', {}, agent, controller.signal), rejected = assert.rejects(cancelled, /cancelled/);
    scope.dispose(); await assert.rejects(registry.query('client', 'phone', 'read', {}, agent, controller.signal), /not registered/);
    controller.abort(); await rejected;
  });
}

test('所有原 Remote 方法有生命周期保护，未知字节不静默覆盖', async () => {
  assert.equal(bundled.DynamicCordisRunnerService.prototype.constructor.name, 'DynamicCordisRunnerService');
  const report = sourceRoot === undefined ? await prepareLatestCordisScopes() : undefined;
  const names = report?.remoteMethods ?? sourceCordisRemoteNames; assert.equal(names.length, 12);
  for (const name of names) {
    const method = bundled.DynamicCordisRunnerService.prototype[name];
    assert.equal(typeof method, 'function');
    // 装饰器仍保留原方法，此处核对实际调用而不以字符串出现当成功能验收。
    await assert.rejects(Promise.resolve().then(() => method.call({ inspectRegistry: {
      assertClientManifestScope() { throw Error('closed-generation'); },
    } })), /closed-generation/);
  }
  if (sourceRoot !== undefined) {
    const relative = 'packages/extensions/cordis-host-runner/src/';
    for (const file of ['index.ts', 'inspect-registry.ts']) {
      const source = (await readFile(resolve(sourceRoot, relative, file), 'utf8')).replaceAll('\r\n', '\n');
      const original = (await readFile(resolve(import.meta.dirname, '../artifacts/latest-source-patches/original', relative, file), 'utf8')).replaceAll('\r\n', '\n');
      assert.equal(transformSourceCordisScopes(file, original), source);
      assert.throws(() => transformSourceCordisScopes(file, original + '\n'), /unsupported_input/);
      assert.throws(() => transformSourceCordisScopes(file, source), /unsupported_input/);
      if (file === 'index.ts') assert.deepEqual(sourceCordisDeclarations(source), sourceCordisDeclarations(original));
      else assert(source.includes('DshmAsyncLocalStorage<symbol>'));
    }
    return;
  }
  const source = await readFile(report.files[0].path, 'utf8');
  assert(source.includes('DshmAsyncLocalStorage')); assert(report.files.every(row => row.before !== row.after));
  assert.throws(() => transformLatestCordis(source, true, true), /unsupported_input/);
  const original = await readFile(report.files[0].backup, 'utf8');
  assert.throws(() => transformLatestCordis(original + '\n', true, true), /unsupported_input/);
});

async function runnerFixture(t) {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  // 原 Connection/Gateway、生成 codec 和完整 Runner；Agent 仅为受控调用归属，不执行模型。
  ctx.provide('credentials', { readRecord: async () => undefined, modifyRecord: async (_, change) => change(undefined) });
  for (const name of ['@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-typert-registry', '@deepseek-ai/dsh-api-gateway',
    '@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-tools']) {
    const module = await load(name); await ctx.plugin(module.default ?? module);
  }
  await ctx.plugin(bundled.default, { vmTimeoutMs: 100 });
  ctx.typert.register((await load('@deepseek-ai/dsh-cordis-host-runner/typert')).TYPERT);
  let gate, injected;
  const agent = { id: 'scopes-runner-test', steer() {}, inject() { injected?.(); } };
  ctx.provide('agents', { get: id => id === agent.id ? agent : undefined });
  ctx.typert.lookups.register('agent', { parameter: 'agent', wire: 'agentId', hostTypeSymbol: '@deepseek-ai/dsh-agent#Agent',
    wireTypeSymbol: '@deepseek-ai/dsh-session/types#SessionId', async resolve(id) {
      const held = gate; gate = undefined; await held?.(); return id === agent.id ? agent : undefined;
    } });
  const api = ctx.dynamicCordisRunner, registry = ctx.cordisInspect, scope = registry.createClientManifestScope(); t.after(() => scope.dispose());
  const fetcher = ctx.connection.createSharedFetchHandler('/api');
  const call = (name, args, owner = scope) => owner.run(async () => {
    const method = `dynamicCordisRunner/${name}`;
    const response = await fetcher.fetch(new Request(`http://localhost/api/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'isolated-rpc', method, payload: { args } }) }));
    assert.equal(response.status, 200); return (await response.json()).result;
  });
  const define = (host = 'return { apply() { harness.handle("echo", value => ({ echoed: value })); } }') => api.define({
    sessionId: agent.id, plugin: { kind: 'new', idPrefix: 'scopes' }, name: 'Scope fixture', purpose: 'Isolated original RPC',
    code: { host, client: 'return { apply() {} }' } });
  return { ctx, api, registry, agent, scope, call, define,
    holdLookup() { const reached = Promise.withResolvers(), wait = Promise.withResolvers(); gate = async () => { reached.resolve(); await wait.promise; };
      return { reached: reached.promise, release: wait.resolve }; },
    onInject(callback) { injected = callback; } };
}
const originalResult = result => { assert.equal(result.ok, true, JSON.stringify(result)); return result.value; };

test('真实新版生成 RPC：手机目录、动态 Host handler 与桌面持续工作保留原语义', async t => {
  const f = await runnerFixture(t); f.registry.syncClientManifest([manifest('desktop')]);
  assert.equal(originalResult(await f.call('syncInspectManifest', { providers: [manifest('phone')] })), null);
  assert.deepEqual(ids(f.registry), ['desktop', 'phone']);
  const definition = f.define(), target = { agentId: f.agent.id, pluginId: definition.pluginId };
  const started = originalResult(await f.call('runHostHalf', { ...target, packageId: definition.packageId, mode: 'run', requestId: null, approveFutureVersions: false }));
  assert.equal(started.ok, true); assert.equal(originalResult(await f.call('getClientCode', { ...target, pluginRunId: started.pluginRunId })).code, 'return { apply() {} }');
  const held = Promise.withResolvers(); let continued;
  f.onInject(() => { continued = held.promise.then(() => { f.registry.assertClientManifestScope(); return true; }); });
  assert.equal(originalResult(await f.call('settleUserRun', { ...target, resolution: { ok: true, pluginRunId: started.pluginRunId } })).status, 'running');
  assert.deepEqual(originalResult(await f.call('invoke', { pluginId: target.pluginId, pluginRunId: started.pluginRunId, method: 'echo', args: 'payload' })),
    { ok: true, value: { echoed: 'payload' } });
  assert(continued); f.scope.dispose(); held.resolve(); assert.equal(await continued, true);
  assert.deepEqual(ids(f.registry), ['desktop']);
  assert.equal(f.api.inventory()[0].activeRun.pluginRunId, started.pluginRunId);
  const next = f.registry.createClientManifestScope(); t.after(() => next.dispose());
  assert.equal(originalResult(await f.call('stopFromPanel', target, next)).ok, true);
  assert.equal(originalResult(await f.call('undefineFromPanel', target, next)).ok, true);
  assert.deepEqual(originalResult(await f.call('inventory', {}, next)), []);
});

test('真实新版原参数解码中断线，迟到 runHostHalf 不得开始运行', async t => {
  const f = await runnerFixture(t), definition = f.define(), held = f.holdLookup();
  const pending = f.call('runHostHalf', { agentId: f.agent.id, pluginId: definition.pluginId, packageId: definition.packageId,
    mode: 'run', requestId: null, approveFutureVersions: false });
  await held.reached; f.scope.dispose(); held.release(); const result = await pending;
  assert.equal(result.ok, false); assert.match(JSON.stringify(result), /connection is closed/);
  assert.equal(f.api.inventory()[0].activeRun, undefined); assert.equal(f.api.inventory()[0].latestRun, undefined);
});

for (const phase of ['starting-host', 'client-pending']) test(`新版真实 Runner：${phase} 期间旧拒绝和重复批准失败不抢先结算`, async t => {
  const f = await runnerFixture(t), definition = f.define(); let request;
  f.ctx.on('cordis/request-run', value => { request = value; });
  assert.equal((await f.api.run(f.agent, definition.pluginId, definition.packageId, 'run')).status, 'awaiting-approval'); assert(request);
  const start = () => f.api.runHostHalf(f.agent, definition.pluginId, definition.packageId, 'run', request.requestId, false);
  const pending = start(); if (phase === 'client-pending') await pending;
  assert.equal(f.api.inventory()[0].latestRun.status, phase);
  assert.deepEqual(await f.api.resolveRequestRun(request.requestId, { ok: false, reason: 'rejected' }), { accepted: false });
  assert.equal((await start()).ok, false);
  assert.deepEqual(await f.api.resolveRequestRun(request.requestId, { ok: false, reason: 'host-half-failed', message: 'Repeated approval rejected' }), { accepted: false });
  const started = await pending; assert.equal(started.ok, true);
  const accepted = await f.call('resolveRequestRun', { requestId: request.requestId, resolution: { ok: true, pluginRunId: started.pluginRunId } });
  assert.deepEqual(originalResult(accepted), { accepted: true });
  assert.equal(f.api.inventory()[0].latestRun.status, 'running');
  assert.deepEqual(originalResult(await f.call('resolveRequestRun', { requestId: request.requestId,
    resolution: { ok: true, pluginRunId: started.pluginRunId } })), { accepted: false });
});

test('新版真实 Runner：批准前拒绝、真实 Host/Client 加载失败仍沿原回收结算', async t => {
  for (const scenario of ['decline', 'host-failure', 'client-failure']) {
    const f = await runnerFixture(t), definition = f.define(scenario === 'host-failure' ? 'throw Error("EXPECTED_HOST_FAILURE")' : undefined); let request;
    f.ctx.on('cordis/request-run', value => { request = value; });
    await f.api.run(f.agent, definition.pluginId, definition.packageId, 'run');
    const start = () => f.api.runHostHalf(f.agent, definition.pluginId, definition.packageId, 'run', request.requestId, false);
    if (scenario === 'decline') {
      assert.deepEqual(await f.api.resolveRequestRun(request.requestId, { ok: false, reason: 'rejected' }), { accepted: true });
      assert.equal((await start()).ok, false); assert.equal(f.api.inventory()[0].latestRun.status, 'rejected');
    } else {
      const started = await start(); assert.equal(started.ok, scenario !== 'host-failure');
      assert.deepEqual(await f.api.resolveRequestRun(request.requestId, scenario === 'host-failure'
        ? { ok: false, reason: 'host-half-failed', message: started.message }
        : { ok: false, reason: 'client-half-failed', pluginRunId: started.pluginRunId, startedHere: true, message: 'EXPECTED_CLIENT_FAILURE' }), { accepted: true });
      assert.equal(f.api.inventory()[0].latestRun.status, 'failed');
    }
    assert.equal(f.api.inventory()[0].activeRun, undefined);
  }
});

test('新版真实 Runner：新增/同插件新版本/删除后发出目录通知，失败操作不伪造通知', async t => {
  const f = await runnerFixture(t), snapshots = [];
  f.ctx.on('cordis/inventory-changed', () => { snapshots.push(f.api.inventory()); });
  const definition = f.define(); assert.equal(snapshots.length, 1); assert.equal(snapshots[0][0].packages.length, 1);
  f.api.define({ sessionId: f.agent.id, plugin: { kind: 'existing', pluginId: definition.pluginId }, name: 'Second version', purpose: 'Same plugin new package',
    code: { client: 'return { apply() {} }' } });
  assert.equal(snapshots.length, 2); assert.equal(snapshots[1][0].packages.length, 2);
  assert.throws(() => f.api.define({ sessionId: f.agent.id, plugin: { kind: 'existing', pluginId: 'missing' }, name: 'Missing', purpose: 'Denied', code: { client: 'return {}' } }));
  assert.equal((await f.api.undefine(f.agent, 'missing')).ok, false); assert.equal(snapshots.length, 2);
  assert.equal((await f.api.undefine(f.agent, definition.pluginId)).ok, true); assert.equal(snapshots.length, 3); assert.deepEqual(snapshots[2], []);
});
