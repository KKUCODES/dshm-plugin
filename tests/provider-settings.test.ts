import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { ProviderSettings } from '../src/provider-settings.js'
import { providerSettingsWriteSchema, providerKeySetupSchema } from '@dsh-mobile/protocol'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = { 'llm-pi-ai': { providers: { alpha: { displayName: 'Alpha', timeoutMs: 1000,
    apiKeyEnv: 'TEST_SECRET', baseURL: 'https://TEST_SECRET.invalid', headers: { Authorization: 'TEST_SECRET' }, unknown: 'TEST_SECRET' } } } }
  writes = 0
  writableFlag = true
  rejectPersist = false
  get writable() { return this.writableFlag }
  protected async load() { return structuredClone(this.doc) }
  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>) {
    if (this.rejectPersist) throw Error('TEST_SECRET')
    this.writes++; this.doc[ns] = structuredClone(section)
  }
}
const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).reverse().forEach(cleanup => cleanup()) })
async function fixture(keyAvailable = false, protocols = false) {
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanups.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  const configSchema: Schema<Record<string, unknown>> = Schema.object({ providers: Schema.dict(Schema.object({ displayName: Schema.string(),
    api: Schema.union(['openai-completions', 'anthropic-messages']),
    timeoutMs: Schema.natural(), defaultContextWindow: Schema.number().step(1).min(1).default(262144),
    defaultMaxTokens: Schema.number().step(1).min(1).default(32768), streamIdleTimeoutMs: Schema.number().min(Number.MIN_VALUE).default(300000),
    cacheRetention: Schema.union(['none', 'short', 'long']), transport: Schema.union(['sse', 'websocket', 'websocket-cached', 'auto']),
  })) })
  provider.register('llm-pi-ai', configSchema, { base: { providers: { alpha: { timeoutMs: 900 }, beta: { displayName: 'Beta' } } } })
  let attached = true
  const directoryState = { declared: true, attached: true };
  const directory = { listProviders: () => [], listConfigurableProviders: () => [{ provider: 'alpha', displayName: 'Alpha',
    settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'alpha'], declared: directoryState.declared }] };
  const adapter = new ProviderSettings(() => attached ? ctx.get('settings') : undefined, () => keyAvailable,
    () => protocols && directoryState.attached ? directory : undefined); cleanups.push(() => adapter.dispose())
  return { adapter, provider, directoryState, detach: () => { attached = false } }
}

test('自定义路由协议来自原schema并要求确认，内置/服务变化与任意值不写入', async () => {
  const f = await fixture(false, true);
  const protocol = (view: ReturnType<ProviderSettings['read']>, value = 'anthropic-messages') => ({
    ...operation(view), edits: [], protocolChange: { value, confirmed: true as const },
  });
  let view = f.adapter.read('owner', 'alpha');
  expect(view.protocol?.choices).toEqual(['openai-completions', 'anthropic-messages']);
  for (const protocolChange of [{ value: 'anthropic-messages' }, { value: 'anthropic-messages', confirmed: false },
    { value: 'anthropic-messages', confirmed: true, headers: {} }])
    expect(providerSettingsWriteSchema.safeParse({ ...protocol(view), protocolChange }).success).toBe(false);
  await expect(f.adapter.write('owner', protocol(view, 'unknown'), signal())).rejects.toThrow('remote_settings_invalid');
  expect(f.provider.writes).toBe(0);
  view = f.adapter.read('owner', 'alpha');
  const saved = await f.adapter.write('owner', protocol(view), signal());
  expect(saved.protocol?.value).toBe('anthropic-messages');
  expect(f.provider.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { api: 'anthropic-messages',
    apiKeyEnv: 'TEST_SECRET', baseURL: 'https://TEST_SECRET.invalid', headers: { Authorization: 'TEST_SECRET' } } } });
  expect(JSON.stringify(saved)).not.toContain('TEST_SECRET');
  view = f.adapter.read('owner', 'alpha'); f.directoryState.declared = false;
  await expect(f.adapter.write('owner', protocol(view), signal())).rejects.toThrow('remote_settings_stale');
  expect(f.adapter.read('owner', 'alpha').protocol).toBeUndefined();
  f.directoryState.declared = true; view = f.adapter.read('owner', 'alpha'); f.directoryState.attached = false;
  await expect(f.adapter.write('owner', protocol(view), signal())).rejects.toThrow('remote_settings_stale');
  expect(f.provider.writes).toBe(1);
});

const setupKey = (view: ReturnType<ProviderSettings['read']>) => ({ method: 'remote.providerKeySetup' as const,
  provider: view.provider, snapshot: view.snapshot, expectedRevision: view.revision, confirmed: true as const })

test('无引用路由可启用独立Key，已有/基础引用、跨连接与任意引用注入拒绝', async () => {
  const f = await fixture(true), before = structuredClone(f.provider.get('llm-pi-ai') as Record<string, unknown>)
  const existing = f.adapter.read('one', 'alpha')
  expect(existing.keySetupAvailable).toBe(false)
  await expect(f.adapter.write('one', setupKey(existing), signal())).rejects.toThrow('remote_settings_stale')
  const view = f.adapter.read('one', 'beta'), write = setupKey(view)
  expect(view.keySetupAvailable).toBe(true)
  for (const raw of [{ ...write, ref: 'TEST_SECRET' }, { ...write, value: 'TEST_SECRET' }, { ...write, confirmed: false },
    { ...write, edits: [] }]) expect(providerKeySetupSchema.safeParse(raw).success).toBe(false)
  await expect(f.adapter.write('two', write, signal())).rejects.toThrow('remote_settings_stale')
  await expect(f.adapter.write('one', { ...write, provider: 'alpha' }, signal())).rejects.toThrow('remote_settings_stale')
  const after = await f.adapter.write('one', write, signal())
  expect(after.keySetupAvailable).toBe(false)
  expect(JSON.stringify(after)).not.toContain('DSHM_PROVIDER_')
  expect(f.provider.get('llm-pi-ai')).toMatchObject(before)
  const profiles = (f.provider.get('llm-pi-ai') as { providers: Record<string, { apiKeyEnv?: string }> }).providers
  expect(profiles.beta?.apiKeyEnv).toMatch(/^DSHM_PROVIDER_[A-F0-9]{32}_API_KEY$/)
  expect(profiles.alpha?.apiKeyEnv).toBe('TEST_SECRET')
  expect(f.provider.writes).toBe(1)
  await expect(f.adapter.write('one', write, signal())).rejects.toThrow('remote_settings_stale')
  await expect(f.adapter.write('one', setupKey(f.adapter.read('one', 'beta')), signal())).rejects.toThrow('remote_settings_stale')
})

test('Key启用遵守凭据服务、配置代次、只读、取消及未知结果边界', async () => {
  const unavailable = await fixture()
  expect(unavailable.adapter.read('one', 'beta').keySetupAvailable).toBe(false)
  await expect(unavailable.adapter.write('one', setupKey(unavailable.adapter.read('one', 'beta')), signal())).rejects.toThrow('remote_settings_stale')
  const f = await fixture(true)
  let view = f.adapter.read('one', 'beta'); f.provider.writableFlag = false
  await expect(f.adapter.write('one', setupKey(view), signal())).rejects.toThrow('remote_settings_read_only')
  f.provider.writableFlag = true; view = f.adapter.read('one', 'beta')
  await f.provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'beta', 'displayName'], value: 'Changed' }])
  await expect(f.adapter.write('one', setupKey(view), signal())).rejects.toThrow('remote_settings_stale')
  view = f.adapter.read('one', 'beta'); const aborted = new AbortController(); aborted.abort()
  await expect(f.adapter.write('one', setupKey(view), aborted.signal)).rejects.toThrow()
  view = f.adapter.read('one', 'beta'); f.provider.rejectPersist = true
  await expect(f.adapter.write('one', setupKey(view), signal())).rejects.toThrow('remote_settings_write_unconfirmed')
  expect(f.provider.writes).toBe(1)
})
const operation = (view: ReturnType<ProviderSettings['read']>, value = 2000) => ({ method: 'remote.providerSettingsWrite' as const,
  provider: view.provider, snapshot: view.snapshot, expectedRevision: view.revision, edits: [{ op: 'set' as const, key: 'timeoutMs' as const, value }] })
const signal = () => new AbortController().signal

test('原设置服务按路由读取/逐字段写入和恢复继承，不回传或覆盖凭据及未知配置', async () => {
  const { adapter, provider } = await fixture()
  expect(adapter.list()).toEqual({ providers: [{ provider: 'alpha', name: 'Alpha' }, { provider: 'beta', name: 'Beta' }] })
  const view = adapter.read('device:connection', 'alpha')
  expect(JSON.stringify(view)).not.toContain('TEST_SECRET'); expect(view.fields).toHaveLength(7)
  const next = await adapter.write('device:connection', operation(view), signal())
  expect(next.fields.find(field => field.key === 'timeoutMs')).toMatchObject({ value: 2000, overridden: true })
  expect(provider.doc['llm-pi-ai']).toMatchObject({ providers: { alpha: { apiKeyEnv: 'TEST_SECRET', unknown: 'TEST_SECRET', headers: { Authorization: 'TEST_SECRET' } } } })
  const restored = await adapter.write('device:connection', { ...operation(next), edits: [{ op: 'unset', key: 'timeoutMs' }] }, signal())
  expect(restored.fields.find(field => field.key === 'timeoutMs')).toMatchObject({ value: 900, overridden: false })
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { beta: { displayName: 'Beta' } } })
})

test('跨设备/连接、跨提供方和重复提交拒绝；电脑新配置不被旧快照覆盖', async () => {
  const { adapter, provider } = await fixture(), view = adapter.read('one', 'alpha')
  await expect(adapter.write('two', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  await expect(adapter.write('one', { ...operation(view), provider: 'beta' }, signal())).rejects.toThrow('remote_settings_stale')
  await provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'alpha', 'timeoutMs'], value: 4000 }])
  await expect(adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  const fresh = adapter.read('one', 'alpha'); await adapter.write('one', operation(fresh), signal())
  await expect(adapter.write('one', operation(fresh), signal())).rejects.toThrow('remote_settings_stale')
  expect(provider.writes).toBe(2)
})

test('未知路由不创建；只读、服务消失、过期、取消和保存错误保持失败且不泄露原始错误', async () => {
  const f = await fixture()
  expect(() => f.adapter.read('one', 'missing')).toThrow('remote_settings_unavailable')
  let view = f.adapter.read('one', 'alpha'); f.provider.writableFlag = false
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_read_only')
  f.provider.writableFlag = true; view = f.adapter.read('one', 'alpha')
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001)
  try { await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_stale') } finally { clock.mockRestore() }
  view = f.adapter.read('one', 'alpha'); const controller = new AbortController(); controller.abort()
  await expect(f.adapter.write('one', operation(view), controller.signal)).rejects.toThrow()
  view = f.adapter.read('one', 'alpha'); f.provider.rejectPersist = true
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_write_unconfirmed')
  view = f.adapter.read('one', 'alpha'); f.detach()
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  expect(f.provider.writes).toBe(0)
})

test('协议拒绝地址/认证/整树写入、非法值、重复字段和原型路由', async () => {
  const f = await fixture(), valid = operation(f.adapter.read('one', 'alpha'))
  for (const raw of [{ ...valid, provider: '__proto__' }, { ...valid, edits: [{ op: 'set', key: 'baseURL', value: 'https://example.invalid' }] },
    { ...valid, edits: [...valid.edits, ...valid.edits] }, { ...valid, edits: [{ op: 'set', key: 'timeoutMs', value: -1 }] },
    { ...valid, headers: {} }, { ...valid, edits: [{ op: 'set', key: 'transport', value: 'unknown' }] }]) expect(providerSettingsWriteSchema.safeParse(raw).success).toBe(false)
})

test('原 pi-ai schema 与提供方业务校验参与保存，不发送模型请求', async () => {
  const outfile = resolve('artifacts/tests/pi-ai-settings-config.cjs')
  await build({ entryPoints: [resolve('../deepseek-harness/packages/llm/llm-pi-ai/src/config.ts')], outfile,
    bundle: true, platform: 'node', format: 'cjs', nodePaths: [resolve('node_modules')], external: ['@deepseek-ai/*'], logLevel: 'silent' })
  const { Config, assertServiceable } = createRequire(import.meta.url)(outfile)
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanups.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  const profile = { api: 'openai-completions', baseURL: 'https://example.invalid/v1', compat: { supportsStore: true },
    models: [{ id: 'test-only-model', compat: { supportsStore: false } }] }
  provider.register('llm-pi-ai', Config, { base: { providers: { alpha: profile } }, validate: value => assertServiceable(value) })
  const directory = { listProviders: () => [], listConfigurableProviders: () => ['alpha', 'beta'].map(provider => ({ provider, displayName: provider,
    settingsNs: 'llm-pi-ai', settingsPath: ['providers', provider], declared: true })) }
  const adapter = new ProviderSettings(() => ctx.get('settings'), () => false, () => directory); cleanups.push(() => adapter.dispose())
  const view = adapter.read('owner', 'alpha')
  expect(view.fields.find(field => field.key === 'defaultMaxTokens')?.value).toBe(32768)
  const updated = await adapter.write('owner', operation(view), signal())
  expect(updated.fields.find(field => field.key === 'timeoutMs')?.value).toBe(2000)
  expect(provider.writes).toBe(1)
  expect(updated.compat?.effective.supportsStore).toBe(true)
  expect(updated.compat?.overrides.supportsStore).toBeUndefined()
  const configured = await adapter.write('owner', { ...operation(updated), edits: [], compat: { supportsStore: false,
    thinkingFormat: 'chat-template', chatTemplateKwargs: { enabled: { $var: 'thinking.enabled' } } } }, signal())
  expect(configured.compat?.overrides).toMatchObject({ supportsStore: false, chatTemplateKwargs: { enabled: { $var: 'thinking.enabled' } } })
  const writes = provider.writes
  await expect(adapter.write('owner', { ...operation(configured), edits: [], compat: { supportsTemperature: false } }, signal()))
    .rejects.toThrow('remote_settings_write_unconfirmed')
  expect(provider.writes).toBe(writes)
  const restored = await adapter.write('owner', { ...operation(adapter.read('owner', 'alpha')), edits: [], compat: {} }, signal())
  expect(restored.compat?.effective.supportsStore).toBe(true)
  expect(restored.compat?.overrides).toEqual({})
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { apiKeyEnv: 'TEST_SECRET',
    models: [{ id: 'test-only-model', compat: { supportsStore: false } }] } } })
  expect(restored.protocol?.value).toBe('openai-completions')
  expect(restored.protocol?.choices).toContain('anthropic-messages')
  const beforeProtocol = structuredClone(provider.get('llm-pi-ai'))
  // 原协议专属的兼容参数不能静默删掉；原校验拒绝切换且完整配置保持。
  await expect(adapter.write('owner', { ...operation(restored), edits: [],
    protocolChange: { value: 'anthropic-messages', confirmed: true } }, signal())).rejects.toThrow('remote_settings_write_unconfirmed')
  expect(provider.get('llm-pi-ai')).toEqual(beforeProtocol)
  const switchable = { api: 'openai-completions', baseURL: profile.baseURL, models: [{ id: 'protocol-test' }] }
  await provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'beta'], value: switchable }])
  const betaView = adapter.read('owner', 'beta')
  const switched = await adapter.write('owner', { ...operation(betaView), edits: [],
    protocolChange: { value: 'anthropic-messages', confirmed: true } }, signal())
  expect(switched.protocol?.value).toBe('anthropic-messages')
  expect(provider.doc['llm-pi-ai']).toMatchObject({ providers: { beta: { ...switchable, api: 'anthropic-messages' } } })
  await provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'beta'], value: profile }])
  const withKey = new ProviderSettings(() => ctx.get('settings'), () => true); cleanups.push(() => withKey.dispose())
  expect((await withKey.write('owner', setupKey(withKey.read('owner', 'beta')), signal())).keySetupAvailable).toBe(false)
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { beta: { ...profile, apiKeyEnv: expect.stringMatching(/^DSHM_PROVIDER_/) } } })
})

test('路由兼容设置保留未知字段；严格协议拒绝任意字段和空写入', async () => {
  const { adapter, provider } = await fixture()
  await provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'alpha', 'compat'], value: { future: 'TEST_SECRET', supportsStore: true } }])
  const view = adapter.read('one', 'alpha')
  expect(JSON.stringify(view)).not.toContain('TEST_SECRET')
  const next = await adapter.write('one', { ...operation(view), edits: [], compat: {} }, signal())
  expect(next.compat?.overrides).toEqual({})
  expect(provider.doc['llm-pi-ai']).toMatchObject({ providers: { alpha: { compat: { future: 'TEST_SECRET' } } } })
  for (const compat of [{ headers: {} }, { supportsStore: null }, { chatTemplateKwargs: { key: { $var: 'secret' } } }]) {
    expect(providerSettingsWriteSchema.safeParse({ ...operation(next), edits: [], compat }).success).toBe(false)
  }
  expect(providerSettingsWriteSchema.safeParse({ ...operation(next), edits: [] }).success).toBe(false)
})
