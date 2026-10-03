import { afterEach, expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { build } from 'esbuild'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { discoverProviderModels } from '../src/provider-model-discovery.js'
import { discoverySource } from '../compatibility/model-discovery/changes.mjs'

const cleanup: Array<() => unknown> = []
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose() })
async function fixture(protectedDraft = false) {
  const outfile = resolve(`artifacts/tests/pi-ai-discovery${protectedDraft ? '-protected' : ''}.cjs`)
  const source = await readFile(resolve('../deepseek-harness/packages/llm/llm-pi-ai/src/discovery.ts'), 'utf8')
  await build({ stdin: { contents: protectedDraft ? discoverySource(source.replaceAll('\r\n', '\n')) : source,
    resolveDir: resolve('../deepseek-harness/packages/llm/llm-pi-ai/src'), loader: 'ts' }, outfile,
    bundle: true, platform: 'node', format: 'cjs', nodePaths: [resolve('node_modules')], external: ['@deepseek-ai/*'], logLevel: 'silent' })
  const { discoverModels } = createRequire(import.meta.url)(outfile)
  const ctx = new Context(), fiber = ctx.plugin(LlmRuntime); await fiber; cleanup.push(() => fiber.dispose())
  const calls: Array<{ url?: string; authorization?: string; header?: string }> = []
  const apiKeys: Array<string | undefined> = []
  let redirectTo: string | undefined
  const server = createServer((req, res) => {
    calls.push({ url: req.url, authorization: req.headers.authorization, header: req.headers['x-fixture'] as string })
    apiKeys.push(req.headers['x-api-key'] as string | undefined)
    if (redirectTo) { res.writeHead(302, { location: redirectTo }).end(); return }
    res.setHeader('Content-Type', 'application/json').end(JSON.stringify({ data: [{ id: 'local-a' }, { id: 'local-b' }] }))
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  cleanup.push(() => new Promise<void>(done => server.close(() => done())))
  const address = server.address() as { port: number }
  const state = { config: { providers: { 'fixture-route': { api: 'openai-completions', baseURL: `http://127.0.0.1:${address.port}/v1` }, deepseek: {} } } }
  let credentialsRead = 0
  // 对齐原index.ts：无provider或未配置路由不带入任何已保存profile。
  ctx.llm.registerModelDiscovery('llm-pi-ai', (request, signal) => discoverModels({ ...request, signal }, () => request.provider !== undefined && Object.hasOwn(state.config.providers, request.provider) ? ({
    headers: { 'x-fixture': 'local-only' }, resolveApiKey: () => { credentialsRead++; return 'test-only-key' },
  }) : undefined, protectedDraft ? { redirect: 'error' } : undefined))
  const settings = { get: () => state.config }
  return { ctx, state, calls, apiKeys, settings, redirect: (url: string) => { redirectTo = url }, credentialsRead: () => credentialsRead,
    run: (route = 'fixture-route', signal = new AbortController().signal) => discoverProviderModels(route, () => settings, () => ctx.llm, signal) }
}

test('原LlmRuntime及pi-ai发现经真实本机HTTP使用电脑配置，内置目录不访问端点或认证', async () => {
  const f = await fixture(), config = structuredClone(f.state.config)
  const result = await f.run()
  expect(result).toEqual({ provider: 'fixture-route', rows: [{ id: 'local-a', name: 'local-a' }, { id: 'local-b', name: 'local-b' }] })
  expect(f.calls).toEqual([{ url: '/v1/models', authorization: 'Bearer test-only-key', header: 'local-only' }])
  expect(f.credentialsRead()).toBe(1); expect(f.state.config).toEqual(config)
  const catalog = await f.run('deepseek')
  expect(catalog.rows.length).toBeGreaterThan(1)
  expect(f.calls).toHaveLength(1); expect(f.credentialsRead()).toBe(1)
  expect(JSON.stringify(result)).not.toMatch(/test-only-key|local-only|127\.0\.0\.1/)
  await expect(f.run('not-configured')).rejects.toThrow('remote_settings_unavailable')
})

test('取消、配置变化和服务失败不返回迟到候选或原始错误', async () => {
  const config = { providers: { route: {} } }, state = { config }
  const settings = { get: () => state.config }
  let finish!: (value: Array<{ id: string }>) => void
  const runtime = { discoverModels: () => new Promise<Array<{ id: string }>>(resolve => { finish = resolve }) }
  const controller = new AbortController()
  const request = discoverProviderModels('route', () => settings, () => runtime, controller.signal)
  controller.abort(); finish([{ id: 'late' }]); await expect(request).rejects.toThrow()
  const changed = discoverProviderModels('route', () => settings, () => runtime, new AbortController().signal)
  state.config = { providers: { route: {} } }; finish([{ id: 'old-config' }])
  await expect(changed).rejects.toThrow('remote_settings_stale')
  await expect(discoverProviderModels('route', () => settings, () => ({ discoverModels: async () => { throw Error('PRIVATE_URL_AND_KEY') } }), new AbortController().signal))
    .rejects.toThrow('remote_model_discovery_failed')
})

test('原发现器的无路由草稿只使用临时Key，不读取已保存凭据或部署headers', async () => {
  const f = await fixture(), config = structuredClone(f.state.config)
  const baseURL = f.state.config.providers['fixture-route'].baseURL
  const rows = await f.ctx.llm.discoverModels('llm-pi-ai', { baseURL, api: 'openai-completions', apiKey: 'draft-only-key' })
  expect(rows.map(row => row.id)).toEqual(['local-a', 'local-b'])
  expect(f.calls).toEqual([{ url: '/v1/models', authorization: 'Bearer draft-only-key', header: undefined }])
  expect(f.credentialsRead()).toBe(0)
  await f.ctx.llm.discoverModels('llm-pi-ai', { baseURL, api: 'openai-completions' })
  expect(f.calls[1]).toEqual({ url: '/v1/models', authorization: undefined, header: undefined })
  expect(f.state.config).toEqual(config)
})

test('原发现器携带路由时临时Key覆盖旧Key但保留部署headers，内置路由优先返回目录', async () => {
  const f = await fixture()
  const baseURL = f.state.config.providers['fixture-route'].baseURL
  await f.ctx.llm.discoverModels('llm-pi-ai', { provider: 'fixture-route', baseURL, api: 'anthropic-messages', apiKey: 'draft-only-key' })
  expect(f.credentialsRead()).toBe(0)
  expect(f.calls[0]?.header).toBe('local-only')
  expect(f.calls[0]?.url).toBe('/v1/models?limit=1000')
  expect(f.apiKeys[0]).toBe('draft-only-key')
  const rows = await f.ctx.llm.discoverModels('llm-pi-ai', { provider: 'deepseek', baseURL, api: 'openai-completions', apiKey: 'draft-only-key' })
  expect(rows.length).toBeGreaterThan(1)
  expect(f.calls).toHaveLength(1)
})

test('原发现器基线会自动跟随跨源重定向且携带Anthropic认证头，草稿接入必须补目标约束', async () => {
  const f = await fixture(), destination = await fixture()
  f.redirect(destination.state.config.providers['fixture-route'].baseURL + '/models')
  await f.ctx.llm.discoverModels('llm-pi-ai', {
    baseURL: f.state.config.providers['fixture-route'].baseURL,
    api: 'anthropic-messages', apiKey: 'synthetic-redirect-test-key',
  })
  // 只记录上游真实行为，不能把该断言通过当成Remote已具备安全草稿探测。
  expect(destination.apiKeys).toEqual(['synthetic-redirect-test-key'])
  expect(f.credentialsRead()).toBe(0)
  expect(destination.credentialsRead()).toBe(0)
})

test.each(['openai-completions', 'anthropic-messages'])('受限草稿发现拒绝%s重定向，目标服务没有收到认证或请求', async api => {
  const f = await fixture(true), destination = await fixture()
  f.redirect(destination.state.config.providers['fixture-route'].baseURL + '/models')
  await expect(f.ctx.llm.discoverModels('llm-pi-ai', {
    baseURL: f.state.config.providers['fixture-route'].baseURL,
    api, apiKey: 'synthetic-draft-key',
  })).rejects.toThrow()
  expect(f.calls).toHaveLength(1)
  expect(destination.calls).toEqual([])
  expect(destination.apiKeys).toEqual([])
})

test('受限发现保留原成功解析及临时Key行为，不写配置', async () => {
  const f = await fixture(true), config = structuredClone(f.state.config)
  const rows = await f.ctx.llm.discoverModels('llm-pi-ai', {
    baseURL: f.state.config.providers['fixture-route'].baseURL,
    api: 'openai-completions', apiKey: 'synthetic-draft-key',
  })
  expect(rows.map(row => row.id)).toEqual(['local-a', 'local-b'])
  expect(f.calls[0]?.authorization).toBe('Bearer synthetic-draft-key')
  expect(f.calls[0]?.header).toBeUndefined()
  expect(f.credentialsRead()).toBe(0)
  expect(f.state.config).toEqual(config)
})
