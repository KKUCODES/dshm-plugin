import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { Config, resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek'
import { Config as SearchConfig, DEEPSEEK_DEFAULT_BASE_URL } from '@deepseek-ai/dsh-web-search-deepseek'
import { createLaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { ComputerEndpoint } from '../src/computer-endpoint.js'

class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = {}
  reject = false; writes = 0; writableFlag = true
  get writable() { return this.writableFlag }
  protected async load() { return structuredClone(this.doc) }
  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>) {
    if (this.reject) throw new Error('TEST_PRIVATE_FAILURE')
    this.writes++; this.doc[ns] = structuredClone(section)
  }
}
const cleanup: Array<() => void> = []
afterEach(() => { cleanup.splice(0).reverse().forEach(fn => fn()); vi.useRealTimers() })
async function fixture(protocol: 'messages' | 'chat-completions' = 'messages') {
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanup.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  provider.register('llm-deepseek', Config, { base: { protocol, maxTokens: 700 } })
  const environment = createLaunchEnvironmentSnapshot([{ source: 'process', values: { DEEPSEEK_BASE_URL: 'https://example.invalid/TEST_PRIVATE_PATH' } }])
  const endpoint = new ComputerEndpoint(() => ctx.get('settings'), () => environment)
  return { provider, endpoint, environment }
}
const save = (endpoint: ComputerEndpoint, view: ReturnType<ComputerEndpoint['read']>, change: { op: 'unset' } | { op: 'set'; value: string }, owner = 'device:connection') =>
  endpoint.write(owner, { method: 'remote.endpointWrite', snapshot: view.snapshot, expectedRevision: view.revision, confirmed: true, change }, new AbortController().signal)

test('原配置解析、环境回退、版本持久化及 unset 继承；旧完整路径从不回传', async () => {
  const { provider, endpoint, environment } = await fixture()
  const view = endpoint.read('device:connection')
  expect(view).toMatchObject({ origin: 'https://example.invalid', inheritedOrigin: 'https://example.invalid', customPath: true, overridden: false })
  expect(JSON.stringify(view)).not.toContain('TEST_PRIVATE')
  const next = await save(endpoint, view, { op: 'set', value: 'http://127.0.0.1:43210/anthropic' })
  expect(next).toMatchObject({ origin: 'http://127.0.0.1:43210', overridden: true })
  expect(provider.get('llm-deepseek')).toMatchObject({ baseURL: 'http://127.0.0.1:43210/anthropic', maxTokens: 700 })
  const restored = await save(endpoint, next, { op: 'unset' })
  expect(restored).toMatchObject({ origin: view.origin, overridden: false })
  expect(provider.doc['llm-deepseek']).not.toHaveProperty('baseURL')
  expect(resolveAdapterOptions(provider.get('llm-deepseek') as Config, environment).baseURL).toBe('https://example.invalid/TEST_PRIVATE_PATH')
})

test('旧 chat-completions URL 的用户信息、查询与片段不泄露；新版写入拒绝这些字段', async () => {
  const { provider, endpoint } = await fixture('chat-completions')
  await provider.mutate('llm-deepseek', [{ op: 'set', path: ['baseURL'], value: 'https://TEST_PRIVATE:TEST_PRIVATE@example.invalid/TEST_PRIVATE?key=TEST_PRIVATE#TEST_PRIVATE' }], 0)
  const view = endpoint.read('device:connection')
  expect(view.origin).toBe('https://example.invalid'); expect(JSON.stringify(view)).not.toContain('TEST_PRIVATE')
  await expect(save(endpoint, view, { op: 'set', value: 'https://example.invalid/?key=TEST_PRIVATE' })).rejects.toThrow('remote_endpoint_invalid')
})

test('跨设备、重放、过期、原版本冲突、只读及 provider 错误均按原边界拒绝', async () => {
  const { provider, endpoint } = await fixture()
  let view = endpoint.read('device:connection')
  await expect(save(endpoint, view, { op: 'unset' }, 'other:connection')).rejects.toThrow('remote_endpoint_stale')
  await provider.mutate('llm-deepseek', [{ op: 'set', path: ['maxTokens'], value: 900 }], view.revision)
  await expect(save(endpoint, view, { op: 'unset' })).rejects.toThrow('remote_endpoint_stale')
  view = endpoint.read('device:connection'); provider.writableFlag = false
  await expect(save(endpoint, view, { op: 'unset' })).rejects.toThrow('remote_endpoint_read_only')
  provider.writableFlag = true; view = endpoint.read('device:connection'); provider.reject = true
  await expect(save(endpoint, view, { op: 'unset' })).rejects.toThrow('remote_endpoint_write_unconfirmed')
  await expect(save(endpoint, view, { op: 'unset' })).rejects.toThrow('remote_endpoint_stale')
  provider.reject = false; view = endpoint.read('device:connection'); vi.useFakeTimers(); vi.setSystemTime(Date.now() + 300001)
  await expect(save(endpoint, view, { op: 'unset' })).rejects.toThrow('remote_endpoint_stale')
  expect(provider.get('llm-deepseek')).toMatchObject({ maxTokens: 900 })
})

test('网页搜索的独立地址与模型快照隔离；环境回退、默认恢复和原配置持久化', async () => {
  const { provider, endpoint } = await fixture()
  provider.register('web-search-deepseek', SearchConfig, { base: { maxUses: 5 } })
  const env = createLaunchEnvironmentSnapshot([{ source: 'process', values: {
    DEEPSEEK_BASE_URL: 'https://chat.invalid/PRIVATE', DEEPSEEK_SEARCH_BASE_URL: 'https://search.invalid/PRIVATE?secret=PRIVATE',
  } }])
  const search = new ComputerEndpoint(() => provider, () => env, 'web-search-deepseek')
  const view = search.read('device:connection')
  expect(view).toMatchObject({ target: 'web-search-deepseek', origin: 'https://search.invalid', inheritedOrigin: 'https://search.invalid', customPath: true })
  expect(JSON.stringify(view)).not.toContain('PRIVATE')
  const raw = { method: 'remote.endpointWrite' as const, target: 'web-search-deepseek' as const, snapshot: view.snapshot,
    expectedRevision: view.revision, confirmed: true as const, change: { op: 'set' as const, value: 'http://127.0.0.1:12345/anthropic/v1' } }
  await expect(endpoint.write('device:connection', raw, new AbortController().signal)).rejects.toThrow('remote_endpoint_invalid')
  const next = await search.write('device:connection', raw, new AbortController().signal)
  expect(provider.get('web-search-deepseek')).toMatchObject({ baseURL: raw.change.value, maxUses: 5 })
  expect(provider.get('llm-deepseek')).not.toHaveProperty('baseURL')
  await search.write('device:connection', { ...raw, snapshot: next.snapshot, expectedRevision: next.revision, change: { op: 'unset' } }, new AbortController().signal)
  expect(search.read('device:connection').origin).toBe('https://search.invalid')
  const defaults = new ComputerEndpoint(() => provider, () => createLaunchEnvironmentSnapshot([{ source: 'process', values: { DEEPSEEK_BASE_URL: 'https://chat.invalid' } }]), 'web-search-deepseek')
  expect(defaults.read('device:connection').origin).toBe(new URL(DEEPSEEK_DEFAULT_BASE_URL).origin)
})
