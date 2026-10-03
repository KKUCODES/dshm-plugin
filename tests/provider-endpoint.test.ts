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
  const adapter = new ProviderEndpoint(() => attached ? ctx.get('settings') : undefined); cleanup.push(() => adapter.dispose())
  return { provider, adapter, detach: () => { attached = false } }
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
