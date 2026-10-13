import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { prepareLatestModelDiscovery } from '../compatibility/latest-upstream/model-discovery.mjs';

const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const require = createRequire(pathToFileURL(resolve(runtime, 'package.json')));
const sourceRoot = process.env.DSHM_LATEST_SOURCE_ROOT;
// 明确源码入口，防止缺少根依赖时向祖先目录解析到旧版插件依赖。
const sourceEntries = {
  '@deepseek-ai/cordis': 'vendor/cordis/src/index.ts',
  '@deepseek-ai/dsh-llm': 'packages/llm/llm/src/index.ts',
  '@deepseek-ai/dsh-llm-pi-ai': 'packages/llm/llm-pi-ai/src/index.ts',
  '@deepseek-ai/dsh-credentials-local': 'packages/credentials/credentials-local/src/index.ts',
  '@deepseek-ai/dsh-credentials': 'packages/credentials/credentials/src/index.ts',
  '@deepseek-ai/dsh-launch-environment': 'packages/util/launch-environment/src/index.ts',
};
const load = name => import(pathToFileURL(sourceRoot === undefined ? require.resolve(name) : resolve(sourceRoot, sourceEntries[name])).href);
if (sourceRoot === undefined) await prepareLatestModelDiscovery();
const [{ Context }, { LlmRuntime }, pi, { LocalCredentialProvider }, { credentialRef }, { createLaunchEnvironmentSnapshot }] = await Promise.all([
  load('@deepseek-ai/cordis'), load('@deepseek-ai/dsh-llm'), load('@deepseek-ai/dsh-llm-pi-ai'),
  load('@deepseek-ai/dsh-credentials-local'), load('@deepseek-ai/dsh-credentials'), load('@deepseek-ai/dsh-launch-environment'),
]);
const namespace = 'llm-pi-ai:dshm-endpoint-v2';

test('新版实际注册/解析器：三类认证、目录捷径隔离、两种跳转拒绝、取消及卸载', { timeout: 10000 }, async () => {
  const calls = [], targetCalls = [];
  const target = createServer((req, res) => {
    targetCalls.push(req.headers);
    res.setHeader('content-type', 'application/json').end(JSON.stringify({ data: [{ id: 'redirect-target' }] }));
  });
  target.listen(0, '127.0.0.1'); await once(target, 'listening');
  const server = createServer((req, res) => {
    calls.push({ path: req.url, headers: req.headers });
    if (req.url.startsWith('/redirect/')) return res.writeHead(302, { location: `http://127.0.0.1:${target.address().port}/v1/models` }).end();
    if (req.url.startsWith('/slow/')) return;
    res.setHeader('content-type', 'application/json').end(JSON.stringify({ data: [
      { id: 'discovered', display_name: '实际发现', context_window: 128001, max_output_tokens: 4097 },
      { id: 'discovered', name: 'Duplicate must not replace first' },
    ] }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const baseURL = `http://127.0.0.1:${server.address().port}/v1`, ctx = new Context();
  ctx.provide('launchEnvironment', createLaunchEnvironmentSnapshot([{ source: 'process', values: {} }]));
  await mkdir(resolve(runtime, 'discovery-tests'), { recursive: true });
  const home = await mkdtemp(resolve(runtime, 'discovery-tests/auth-'));
  const llm = ctx.plugin(LlmRuntime), credentials = ctx.plugin(LocalCredentialProvider, { path: resolve(home, '.credentials.yaml'), watch: false });
  await llm; await credentials;
  await ctx.credentials.set(credentialRef('DSHM_DISCOVERY_SYNTHETIC_KEY'), 'synthetic-stored-only');
  const plugin = ctx.plugin(pi, { providers: { openai: { apiKeyEnv: 'DSHM_DISCOVERY_SYNTHETIC_KEY', headers: { 'x-isolated-provider': 'original-header' } } } });
  await plugin;
  const discover = request => ctx.llm.discoverModels(namespace, { api: 'openai-completions', baseURL, ...request });
  try {
    await assert.rejects(ctx.llm.discoverModels(namespace, {}), { code: 'INVALID_DISCOVERY' });
    assert.equal(calls.length, 0, '能力查询不发 HTTP');
    const rows = await discover({});
    assert.deepEqual(rows, [{ id: 'discovered', name: '实际发现', contextWindow: 128001, maxTokens: 4097 }]);
    assert.equal(calls.at(-1).headers.authorization, undefined);
    assert.equal(calls.at(-1).headers['x-isolated-provider'], undefined);
    await discover({ provider: 'openai' });
    assert.equal(calls.at(-1).headers.authorization, 'Bearer synthetic-stored-only');
    assert.equal(calls.at(-1).headers['x-isolated-provider'], 'original-header');
    await discover({ provider: 'openai', apiKey: 'synthetic-temporary-only' });
    assert.equal(calls.at(-1).headers.authorization, 'Bearer synthetic-temporary-only');
    const beforeCatalog = calls.length;
    assert.ok((await ctx.llm.discoverModels('llm-pi-ai', { provider: 'openai', baseURL })).length > 1);
    assert.equal(calls.length, beforeCatalog, '原目录入口保持内置目录捷径');
    for (const api of ['openai-completions', 'anthropic-messages']) {
      const redirect = { api, baseURL: baseURL.replace('/v1', '/redirect/v1'), apiKey: 'synthetic-redirect-only' };
      await assert.rejects(discover(redirect), { code: 'DISCOVERY_FAILED' });
      assert.equal(targetCalls.length, 0, '目标未收到跳转请求或认证');
    }
    // 原电脑接口保留官方行为；受限手机接口不改变它。
    await ctx.llm.discoverModels('llm-pi-ai', { baseURL: baseURL.replace('/v1', '/redirect/v1'), api: 'openai-completions' });
    assert.equal(targetCalls.length, 1);
    const beforeInvalid = calls.length;
    await assert.rejects(discover({ apiKey: '不可作为头部的Key' }), { code: 'INVALID_CREDENTIAL' });
    assert.equal(calls.length, beforeInvalid);
    const controller = new AbortController();
    const pending = ctx.llm.discoverModels(namespace, { api: 'openai-completions', baseURL: baseURL.replace('/v1', '/slow/v1') }, controller.signal);
    const deadline = Date.now() + 2000;
    while (!calls.some(row => row.path.startsWith('/slow/')) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    const observed = calls.some(row => row.path.startsWith('/slow/'));
    controller.abort(); await assert.rejects(pending, { code: 'ABORTED' });
    assert.equal(observed, true, '先观察实际请求，再验证在途取消');
    assert.equal((await ctx.credentials.resolve(credentialRef('DSHM_DISCOVERY_SYNTHETIC_KEY'))).value, 'synthetic-stored-only');
    await plugin.dispose();
    await assert.rejects(discover({}), { code: 'NO_DISCOVERY' });
    await assert.rejects(ctx.llm.discoverModels('llm-pi-ai', { baseURL }), { code: 'NO_DISCOVERY' });
  } finally {
    await plugin.dispose(); await credentials.dispose(); await llm.dispose();
    server.closeAllConnections(); target.closeAllConnections();
    await Promise.all([server, target].map(server => new Promise(resolve => server.close(resolve))));
  }
});

test('新版实例映射仅固定探测通道；缺少唯一实例时不回退原入口', async () => {
  const path = resolve(runtime, 'profile-providers-test.mjs');
  await build({ entryPoints: [resolve(root, 'src/profile-providers.ts')], outfile: path, bundle: true,
    platform: 'node', format: 'esm', external: ['@deepseek-ai/*'], logLevel: 'silent' });
  const { profileProviders } = await import(pathToFileURL(path).href);
  const calls = [], signal = new AbortController().signal;
  const native = { listProviders: () => [], listConfigurableProviders: () => [{ settingsNs: 'custom-entry' }],
    discoverModels: (...args) => { calls.push(args); return Promise.resolve([]); } };
  let available = true;
  const settings = { entryId: ns => available && ns === 'llm-pi-ai' ? 'custom-entry' : undefined,
    namespaceOf: id => id === 'custom-entry' ? 'llm-pi-ai' : undefined };
  const mapped = profileProviders(native, settings), request = { baseURL: 'http://127.0.0.1:1/v1' };
  await mapped.discoverModels('dshm.pi-ai-endpoint-v2', request, signal);
  await mapped.discoverModels('llm-pi-ai', request, signal);
  assert.deepEqual(calls, [['custom-entry:dshm-endpoint-v2', request, signal], ['custom-entry', request, signal]]);
  assert.equal(mapped.listConfigurableProviders()[0].settingsNs, 'llm-pi-ai');
  available = false;
  assert.throws(() => mapped.discoverModels('dshm.pi-ai-endpoint-v2', request, signal), /remote_model_discovery_unavailable/);
  assert.throws(() => mapped.discoverModels('unknown', request, signal), /remote_model_discovery_unavailable/);
  assert.equal(calls.length, 2);
});
