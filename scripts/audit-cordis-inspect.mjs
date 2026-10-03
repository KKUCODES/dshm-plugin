import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { Context } from '@deepseek-ai/cordis';

// 运行未经修改的上下游注册表。仅跨页面传输与 Agent 身份是隔离夹具；不连接用户 DSH 或模型。
const output = resolve('artifacts/cordis-inspect-audit');
await mkdir(output, { recursive: true });
const sources = {
  host: resolve('../deepseek-harness/packages/extensions/cordis-host-runner/src/inspect-registry.ts'),
  client: resolve('../deepseek-harness/packages/extensions/cordis-client-runner/src/client/inspect-registry.ts'),
};
const hashes = {};
for (const [name, path] of Object.entries(sources)) {
  const source = await readFile(path, 'utf8');
  hashes[name] = createHash('sha256').update(source).digest('hex');
  await build({ stdin: { contents: source, sourcefile: path, loader: 'ts', resolveDir: resolve('.') },
    outfile: resolve(output, `${name}.mjs`), bundle: true, platform: 'node', format: 'esm', packages: 'external' });
}
const { CordisInspectRegistryService } = await import(pathToFileURL(resolve(output, 'host.mjs')).href);
const { ClientCordisInspectRegistry } = await import(pathToFileURL(resolve(output, 'client.mjs')).href);
const report = { scope: 'isolated original Host and Client registries; fixture transport; no Android/network/model',
  sourceHashes: hashes, checks: [] };
const manifest = (id, outputType = 'string') => ({ id, description: `${id} fixture provider`, methods: [{
  name: 'read', description: 'Read a fixture value',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: outputType },
}] });
const tick = () => new Promise(resolve => setImmediate(resolve));

async function check(name, run) {
  const ctx = new Context();
  const pending = [];
  try {
    await ctx.plugin(CordisInspectRegistryService);
    const registry = ctx.cordisInspect;
    const agent = { id: 'cordis-audit-session' };
    const query = (id, input = {}, owner = agent) => {
      const abort = new AbortController(); pending.push(abort);
      return { abort, result: registry.query('client', id, 'read', input, owner, abort.signal) };
    };
    const evidence = await run({ ctx, registry, agent, query });
    report.checks.push({ name, passed: true, evidence });
  } finally {
    for (const controller of pending) controller.abort();
    await ctx.fiber.dispose();
  }
}

try {
  await check('第二个页面完整上报会覆盖电脑独有目录', async ({ registry }) => {
    registry.syncClientManifest([manifest('shared'), manifest('desktop-only')]);
    const before = registry.list().map(item => item.id);
    registry.syncClientManifest([manifest('shared'), manifest('mobile-only')]);
    const after = registry.list().map(item => item.id);
    assert.deepEqual(before, ['shared', 'desktop-only']);
    assert.deepEqual(after, ['shared', 'mobile-only']);
    return { before, after, desktopOnlyLost: true };
  });

  await check('真实客户端卸载最后一个提供者会清空其他页面目录', async ({ registry }) => {
    const snapshots = [];
    const page = () => new ClientCordisInspectRegistry({
      async sync(providers) { snapshots.push(providers.map(item => item.id)); registry.syncClientManifest(providers); },
      async resolve() { throw new Error('No query in this scenario'); },
    });
    const desktop = page(), phone = page();
    const removeDesktop = desktop.register({ manifest: manifest('desktop-only'), query: async () => 'desktop' });
    await tick();
    const removePhone = phone.register({ manifest: manifest('mobile-only'), query: async () => 'phone' });
    await tick(); removePhone(); await tick();
    assert.deepEqual(registry.list(), []);
    desktop.publish(); await tick();
    assert.deepEqual(registry.list().map(item => item.id), ['desktop-only']);
    removeDesktop(); await tick();
    assert.deepEqual(snapshots, [['desktop-only'], ['mobile-only'], [], ['desktop-only'], []]);
    return { snapshots, desktopRepublishRecovers: true };
  });

  await check('重复与无效定义被原校验拒绝且不覆盖旧目录', async ({ registry }) => {
    registry.syncClientManifest([manifest('original')]);
    assert.throws(() => registry.syncClientManifest([manifest('duplicate'), manifest('duplicate')]), /repeats/);
    assert.throws(() => registry.syncClientManifest([manifest('')]), /must not be empty/);
    assert.deepEqual(registry.list().map(item => item.id), ['original']);
    return { originalPreserved: true };
  });

  await check('同名但不同结果契约按最后一次上报替换', async ({ ctx, registry, agent, query }) => {
    registry.syncClientManifest([manifest('shared')]);
    registry.syncClientManifest([manifest('shared', 'number')]);
    let request;
    ctx.on('cordis/inspect-query', value => { request = value; });
    const active = query('shared');
    assert.ok(request);
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'desktop' }), { accepted: false });
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 42 }), { accepted: true });
    assert.equal(await active.result, 42);
    return { previousSchemaAnswerRejected: true, latestSchemaAnswerAccepted: true };
  });

  await check('原查询保留会话身份、输出校验和首次有效结果语义', async ({ ctx, registry, agent, query }) => {
    registry.syncClientManifest([manifest('shared')]);
    let request; const resolved = [];
    ctx.on('cordis/inspect-query', value => { request = value; });
    ctx.on('cordis/inspect-query-resolved', value => resolved.push(value.requestId));
    const active = query('shared');
    assert.ok(request);
    assert.deepEqual(registry.resolveClientQuery({ id: 'other-session' }, request.requestId, { ok: true, data: 'wrong' }), { accepted: false });
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 42 }), { accepted: false });
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: false, reason: 'provider-missing', message: 'absent' }), { accepted: false });
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'first' }), { accepted: true });
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'late' }), { accepted: false });
    assert.equal(await active.result, 'first'); assert.deepEqual(resolved, [request.requestId]);
    await assert.rejects(query('shared', { unexpected: true }).result, /rejected input/);
    return { wrongSessionRejected: true, invalidOutputRejected: true, firstValidWins: true, extraInputRejected: true };
  });

  await check('两个原客户端查询广播的首个有效结果结束其他页面工作', async ({ ctx, registry, agent, query }) => {
    const acks = []; let finishSlow, slowSignal;
    const host = { async sync(providers) { registry.syncClientManifest(providers); },
      async resolve(sessionId, requestId, resolution) {
        assert.equal(sessionId, agent.id);
        acks.push(registry.resolveClientQuery(agent, requestId, resolution));
      } };
    const desktop = new ClientCordisInspectRegistry(host), phone = new ClientCordisInspectRegistry(host);
    const removeDesktop = desktop.register({ manifest: manifest('shared'), query: async (_method, _input, context) => {
      slowSignal = context.signal; return await new Promise(resolve => { finishSlow = resolve; });
    } });
    const removePhone = phone.register({ manifest: manifest('shared'), query: async () => 'phone' });
    await tick();
    const tasks = [];
    ctx.on('cordis/inspect-query', request => { tasks.push(desktop.query(request), phone.query(request)); });
    ctx.on('cordis/inspect-query-resolved', ({ requestId }) => { desktop.close(requestId); phone.close(requestId); });
    const active = query('shared'); assert.equal(await active.result, 'phone');
    assert.equal(slowSignal.aborted, true); finishSlow('desktop'); await Promise.all(tasks);
    assert.deepEqual(acks, [{ accepted: true }]);
    removeDesktop(); removePhone(); await tick();
    return { fasterValidPageWins: true, slowPageCancelled: true, slowPageDoesNotResolve: true };
  });

  await check('工具取消清除待查询并拒绝迟到响应', async ({ ctx, registry, agent, query }) => {
    registry.syncClientManifest([manifest('shared')]);
    let request; const resolved = [];
    ctx.on('cordis/inspect-query', value => { request = value; });
    ctx.on('cordis/inspect-query-resolved', value => resolved.push(value.requestId));
    const active = query('shared'); assert.ok(request);
    const rejected = assert.rejects(active.result, /cancelled/); active.abort.abort(); await rejected;
    assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'late' }), { accepted: false });
    assert.deepEqual(resolved, [request.requestId]);
    return { cancelled: true, lateReplyRejected: true };
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
