import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Context } from '@deepseek-ai/cordis';
import { LlmRuntime } from '@deepseek-ai/dsh-llm';
const endpoint = process.env.DSHM_ENDPOINT_TEST === '1';
const candidate = await import(endpoint ? '../../artifacts/compatibility/model-discovery-endpoint/after/lib/index.js' : '../../artifacts/compatibility/model-discovery/after/lib/index.js');
const { namespace } = await import(endpoint ? './endpoint.mjs' : './changes.mjs');

test('实际编译插件注册受限发现、旧入口保留，卸载后两者均移除', async () => {
  let destinationCalls = 0;
  const destination = createServer((req, res) => {
    destinationCalls++;
    res.setHeader('content-type', 'application/json').end(JSON.stringify({ data: [{ id: 'real-listing' }] }));
  });
  destination.listen(0, '127.0.0.1'); await once(destination, 'listening');
  const url = `http://127.0.0.1:${destination.address().port}/v1`;
  const redirect = createServer((req, res) => res.writeHead(302, { location: url + '/models' }).end());
  redirect.listen(0, '127.0.0.1'); await once(redirect, 'listening');
  const ctx = new Context(); let llm, plugin;
  try {
    llm = ctx.plugin(LlmRuntime); await llm;
    plugin = ctx.plugin(candidate, { providers: { openai: {} } }); await plugin;
    const draft = { baseURL: `http://127.0.0.1:${redirect.address().port}/v1`, api: 'anthropic-messages', apiKey: 'synthetic-runtime-key' };
    await assert.rejects(ctx.llm.discoverModels(namespace, draft));
    assert.equal(destinationCalls, 0);
    const rows = await ctx.llm.discoverModels(namespace, { ...draft, baseURL: url });
    assert.equal(rows[0].id, 'real-listing');
    assert.equal(destinationCalls, 1);
    await ctx.llm.discoverModels('llm-pi-ai', draft);
    assert.equal(destinationCalls, 2, '原接口保持旧行为');
    if (endpoint) {
      const fromEndpoint = await ctx.llm.discoverModels(namespace, { ...draft, provider: 'openai', baseURL: url });
      assert.equal(fromEndpoint[0].id, 'real-listing', '内置路由也必须实际访问草稿地址');
      assert.equal(destinationCalls, 3);
      const fromCatalog = await ctx.llm.discoverModels('llm-pi-ai', { ...draft, provider: 'openai', baseURL: url });
      assert.ok(fromCatalog.length > 1);
      assert.equal(destinationCalls, 3, '原目录入口仍不请求草稿地址');
    }
    await plugin.dispose(); plugin = undefined;
    await assert.rejects(ctx.llm.discoverModels(namespace, draft), /no model discovery/);
    await assert.rejects(ctx.llm.discoverModels('llm-pi-ai', draft), /no model discovery/);
    assert.equal(destinationCalls, endpoint ? 3 : 2);
  } finally {
    await plugin?.dispose(); await llm?.dispose();
    await Promise.all([destination, redirect].map(server => new Promise(resolve => server.close(resolve))));
  }
});
