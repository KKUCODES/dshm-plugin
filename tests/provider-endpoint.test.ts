import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { ProviderEndpoint } from '../src/provider-endpoint.js'

class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = {}
  writes = 0; writableFlag = true; fail = false
  get writable() { return this.writableFlag }
  protected async load() { return structuredClone(this.doc) }
  protected async persist(ns: SettingsNamespace, value: Record<string, unknown>) {
    if (this.fail) throw Error('TEST_PRIVATE_FAILURE')
    this.writes++; this.doc[ns] = structuredClone(value)
  }
}
const cleanup: Array<() => void> = []
afterEach(() => { cleanup.splice(0).reverse().forEach(fn => fn()); vi.useRealTimers() })
const configBundle = resolve('artifacts/tests/pi-ai-endpoint-config.cjs')
await build({ entryPoints: [resolve('../deepseek-harness/packages/llm/llm-pi-ai/src/config.ts')], outfile: configBundle,
  bundle: true, platform: 'node', format: 'cjs', nodePaths: [resolve('node_modules')], external: ['@deepseek-ai/*'], logLevel: 'silent' })
const { Config, assertServiceable } = createRequire(import.meta.url)(configBundle)
async function fixture() {
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanup.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  provider.register('llm-pi-ai', Config, { base: { providers: {
    alpha: { api: 'openai-completions', baseURL: 'https://base.invalid/PRIVATE', models: [{ id: 'test-model' }], apiKeyEnv: 'TEST_PRIVATE', headers: { 'X-Test': 'TEST_PRIVATE' } },
    openai: {},
  } }, validate: value => assertServiceable(value) })
  let attached = true
  const directory = { rows: [{ provider: 'openai', displayName: 'OpenAI', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'], declared: false }], available: true }
  const adapter = new ProviderEndpoint(() => attached ? ctx.get('settings') : undefined,
    () => directory.available ? { listConfigurableProviders: () => directory.rows } : undefined); cleanup.push(() => adapter.dispose())
  return { provider, adapter, directory, detach: () => { attached = false } }
}
const operation = (view: ReturnType<ProviderEndpoint['read']>, change: { op: 'unset' } | { op: 'set'; value: string } = { op: 'unset' }) => ({
  method: 'remote.endpointWrite' as const, target: view.target, snapshot: view.snapshot, expectedRevision: view.revision, confirmed: true as const, change,
})
const signal = () => new AbortController().signal

test('原pi-ai设置服务逐路由写入并恢复继承，旧路径/Key/headers不返回且不覆盖', async () => {
  const { adapter, provider } = await fixture(), view = adapter.read('device:connection', 'alpha')
  expect(view).toMatchObject({ origin: 'https://base.invalid', inheritedOrigin: 'https://base.invalid', protocol: 'provider', customPath: true })
  expect(JSON.stringify(view)).not.toContain('PRIVATE')
  const next = await adapter.write('device:connection', operation(view, { op: 'set', value: 'http://127.0.0.1:42345/v1' }), signal())
  expect(next).toMatchObject({ origin: 'http://127.0.0.1:42345', overridden: true })
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { baseURL: 'http://127.0.0.1:42345/v1', apiKeyEnv: 'TEST_PRIVATE', headers: { 'X-Test': 'TEST_PRIVATE' } } } })
  const restored = await adapter.write('device:connection', operation(next), signal())
  expect(restored).toMatchObject({ origin: 'https://base.invalid', overridden: false })
  expect(provider.doc).not.toHaveProperty('llm-pi-ai.providers.alpha.baseURL')
})

test('目录提供方没有单独地址时不猜默认站点；设置和unset沿用原模型目录', async () => {
  const { adapter } = await fixture(), view = adapter.read('one', 'openai')
  expect(view).toMatchObject({ origin: null, inheritedOrigin: null, customPath: false, overridden: false })
  const next = await adapter.write('one', operation(view, { op: 'set', value: 'https://gateway.invalid/v1' }), signal())
  const restored = await adapter.write('one', operation(next), signal())
  expect(restored).toMatchObject({ origin: null, inheritedOrigin: null, overridden: false })
})

test('跨设备、路由、旧版本与重放不能改其他配置；未知路由不创建', async () => {
  const { adapter, provider } = await fixture(), view = adapter.read('one', 'alpha')
  expect(() => adapter.read('one', 'missing')).toThrow('remote_endpoint_unavailable')
  await expect(adapter.write('other', operation(view), signal())).rejects.toThrow('remote_endpoint_stale')
  await expect(adapter.write('one', { ...operation(view), target: { provider: 'openai' } }, signal())).rejects.toThrow('remote_endpoint_stale')
  await provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'alpha', 'displayName'], value: 'Renamed' }])
  await expect(adapter.write('one', operation(view), signal())).rejects.toThrow('remote_endpoint_stale')
  const next = adapter.read('one', 'alpha'); await adapter.write('one', operation(next), signal())
  await expect(adapter.write('one', operation(next), signal())).rejects.toThrow('remote_endpoint_stale')
})

test('只读、过期、取消、服务移除、无效地址及原服务写入失败不冒充成功或泄露输入', async () => {
  const f = await fixture(); let view = f.adapter.read('one', 'alpha')
  await expect(f.adapter.write('one', operation(view, { op: 'set', value: 'https://user:PRIVATE@example.invalid' }), signal())).rejects.toThrow('remote_endpoint_invalid')
  f.provider.writableFlag = false; await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_endpoint_read_only')
  f.provider.writableFlag = true; view = f.adapter.read('one', 'alpha')
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001)
  try { await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_endpoint_stale') } finally { clock.mockRestore() }
  view = f.adapter.read('one', 'alpha'); const controller = new AbortController(); controller.abort()
  await expect(f.adapter.write('one', operation(view), controller.signal)).rejects.toThrow()
  expect(f.provider.writes).toBe(0)
  view = f.adapter.read('one', 'alpha'); f.provider.fail = true
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_endpoint_write_unconfirmed')
  view = f.adapter.read('one', 'alpha'); f.detach()
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_endpoint_stale')
})

test('恢复策略按请求协商；已有继承地址和官方目录默认均可恢复，旧客户端视图不增加字段', async () => {
  const { adapter } = await fixture()
  expect(adapter.read('one', 'alpha')).not.toHaveProperty('resettable')
  expect(adapter.read('one', 'alpha', true).resettable).toBe(true)
  const view = adapter.read('one', 'openai', true)
  expect(view.resettable).toBe(true)
  const next = await adapter.write('one', { ...operation(view, { op: 'set', value: 'https://gateway.invalid/v1' }), resetPolicy: true }, signal())
  expect(next.resettable).toBe(true)
  const restored = await adapter.write('one', { ...operation(next), resetPolicy: true }, signal())
  expect(restored).toMatchObject({ origin: null, overridden: false, resettable: true })
})

test('自定义提供方无默认地址时明确拒绝旧客户端与绕过页面的恢复，显式地址写入仍可用', async () => {
  const { adapter, provider } = await fixture()
  await provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'manual'], value: {
    api: 'openai-completions', baseURL: 'https://manual.invalid/v1', models: [{ id: 'manual-model' }],
  } }])
  const view = adapter.read('one', 'manual', true), writes = provider.writes
  expect(view).toMatchObject({ resettable: false, overridden: true, inheritedOrigin: null })
  await expect(adapter.write('one', { ...operation(view), resetPolicy: true }, signal())).rejects.toThrow('remote_endpoint_reset_unavailable')
  const legacy = adapter.read('one', 'manual')
  expect(legacy).not.toHaveProperty('resettable')
  await expect(adapter.write('one', operation(legacy), signal())).rejects.toThrow('remote_endpoint_reset_unavailable')
  expect(provider.writes).toBe(writes)
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { manual: { baseURL: 'https://manual.invalid/v1' } } })
  const fresh = adapter.read('one', 'manual', true)
  const saved = await adapter.write('one', { ...operation(fresh, { op: 'set', value: 'http://127.0.0.1:42123/v1' }), resetPolicy: true }, signal())
  expect(saved).toMatchObject({ origin: 'http://127.0.0.1:42123', resettable: false })
  expect(provider.writes).toBe(writes + 1)
})

test('目录缺失、身份不匹配或重复时不猜默认地址；读取后目录移除也不能恢复', async () => {
  const { adapter, provider, directory } = await fixture()
  const view = adapter.read('one', 'openai', true)
  directory.available = false
  await expect(adapter.write('one', operation(view), signal())).rejects.toThrow('remote_endpoint_reset_unavailable')
  expect(provider.writes).toBe(0)
  expect(adapter.read('one', 'openai', true).resettable).toBe(false)
  directory.available = true
  directory.rows[0]!.declared = true
  expect(adapter.read('one', 'openai', true).resettable).toBe(false)
  directory.rows[0]!.declared = false
  directory.rows[0]!.settingsNs = 'other-namespace'
  expect(adapter.read('one', 'openai', true).resettable).toBe(false)
  directory.rows[0]!.settingsNs = 'llm-pi-ai'
  directory.rows.push({ ...directory.rows[0]! })
  expect(adapter.read('one', 'openai', true).resettable).toBe(false)
  directory.available = false
  expect(adapter.read('one', 'alpha', true).resettable).toBe(true)
})
