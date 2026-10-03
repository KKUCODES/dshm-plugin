import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { ProviderCreation, type ProviderDirectory } from '../src/provider-creation.js'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = {}
  writes = 0
  readOnly = false
  fail = false
  get writable() { return !this.readOnly }
  protected async load() { return structuredClone(this.doc) }
  protected async persist(ns: SettingsNamespace, value: Record<string, unknown>) {
    if (this.fail) throw Error('PRIVATE_VALUE')
    this.writes++; this.doc[ns] = structuredClone(value)
  }
}
const cleanup: Array<() => void> = []
afterEach(() => { cleanup.splice(0).reverse().forEach(fn => fn()); vi.restoreAllMocks() })
async function fixture(realSchema = false) {
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanup.push(() => fiber.dispose())
  const settings = ctx.settings as MemorySettings
  let config: Schema<Record<string, unknown>> = Schema.object({ providers: Schema.dict(Schema.object({ api: Schema.union(['openai-completions', 'anthropic-messages']) })) })
  let validate: ((value: Record<string, unknown>) => void) | undefined
  if (realSchema) {
    const outfile = resolve('artifacts/tests/provider-creation-config.cjs')
    await build({ entryPoints: [resolve('../deepseek-harness/packages/llm/llm-pi-ai/src/config.ts')], outfile, bundle: true,
      platform: 'node', format: 'cjs', nodePaths: [resolve('node_modules')], external: ['@deepseek-ai/*'], logLevel: 'silent' })
    const original = createRequire(import.meta.url)(outfile); config = original.Config; validate = original.assertServiceable
  }
  settings.register('llm-pi-ai', config, { ...(validate ? { validate } : {}) })
  let extra = false, attached = true
  const runtime: ProviderDirectory = {
    listProviders: () => [{ id: 'deepseek-official', name: 'Official' }, ...(extra ? [{ id: 'added-elsewhere', name: 'Changed' }] : [])],
    listConfigurableProviders: () => [{ provider: 'openai', displayName: 'OpenAI', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai'] }],
  }
  const service = new ProviderCreation(() => attached ? ctx.get('settings') : undefined, () => runtime, () => true)
  cleanup.push(() => service.dispose())
  return { service, settings, changeDirectory() { extra = true }, detach() { attached = false } }
}
const signal = () => new AbortController().signal
const custom = (view: ReturnType<ProviderCreation['read']>) => ({ method: 'remote.providerCreationWrite' as const, kind: 'custom' as const,
  provider: 'my-service', name: 'My service', api: 'openai-completions', baseURL: 'https://example.invalid/v1', models: ['model-one'],
  useKey: true, confirmed: true as const, snapshot: view.snapshot, expectedRevision: view.revision })

test('原pi-ai配置校验通过后新建自定义提供方，Key引用独立且不回传，未执行网络请求', async () => {
  const f = await fixture(true), view = f.service.read('one')
  expect(view.protocols).toContain('openai-completions')
  expect(view.available).toEqual([{ provider: 'openai', name: 'OpenAI' }])
  const result = await f.service.create('one', custom(view), signal())
  expect(result.created).toEqual({ provider: 'my-service', useKey: true })
  const profile = Reflect.get(Reflect.get(f.settings.get('llm-pi-ai') as object, 'providers'), 'my-service')
  expect(profile).toMatchObject({ api: 'openai-completions', baseURL: 'https://example.invalid/v1', models: [{ id: 'model-one' }] })
  expect(profile.apiKeyEnv).toMatch(/^DSHM_PROVIDER_[A-F0-9]{32}_API_KEY$/)
  expect(JSON.stringify(result)).not.toContain(profile.apiKeyEnv)
  expect(f.settings.writes).toBe(1)
  await expect(f.service.create('one', custom(view), signal())).rejects.toThrow('remote_settings_stale')
})

test('新建结构化模型经原pi-ai校验一次保存名称容量和输入类型', async () => {
  const f = await fixture(true), view = f.service.read('one')
  const models = [{ id: 'model-one', name: 'Vision model', contextWindow: 128000, maxTokens: 8000, input: ['text' as const, 'image' as const] },
    { id: 'model-two' }]
  await f.service.create('one', { ...custom(view), useKey: false, models }, signal())
  const profile = Reflect.get(Reflect.get(f.settings.get('llm-pi-ai') as object, 'providers'), 'my-service')
  expect(profile.models).toMatchObject(models)
  expect(profile.apiKeyEnv).toBeUndefined()
  expect(f.settings.writes).toBe(1)
})

test('内置目录启用沿原默认值，不设置Key时不创建凭据引用', async () => {
  const f = await fixture(true), view = f.service.read('one')
  await f.service.create('one', { method: 'remote.providerCreationWrite', kind: 'catalog', provider: 'openai', name: '', useKey: false,
    confirmed: true, snapshot: view.snapshot, expectedRevision: view.revision }, signal())
  const profile = Reflect.get(Reflect.get(f.settings.get('llm-pi-ai') as object, 'providers'), 'openai')
  expect(profile.apiKeyEnv).toBeUndefined(); expect(profile.api).toBeUndefined(); expect(profile.baseURL).toBeUndefined()
  expect(f.service.read('one').available).toEqual([])
})

test('既有/内置路由不能被自定义覆盖，协议与目的地址必须合法', async () => {
  const f = await fixture()
  for (const change of [{ provider: 'openai' }, { provider: 'deepseek-official' }, { api: 'unknown' },
    { baseURL: 'https://user:password@example.invalid' }, { models: ['same', 'same'] }, { provider: '__proto__' }]) {
    const view = f.service.read('one')
    await expect(f.service.create('one', { ...custom(view), ...change }, signal())).rejects.toThrow('remote_settings_invalid')
  }
  expect(f.settings.writes).toBe(0)
})

test('连接归属、配置与目录变更、取消、过期、只读和未知写入均保持边界', async () => {
  const f = await fixture(); let view = f.service.read('one')
  await expect(f.service.create('other', custom(view), signal())).rejects.toThrow('remote_settings_stale')
  await f.settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'elsewhere'], value: {} }])
  await expect(f.service.create('one', custom(view), signal())).rejects.toThrow('remote_settings_stale')
  view = f.service.read('one'); f.changeDirectory()
  await expect(f.service.create('one', custom(view), signal())).rejects.toThrow('remote_settings_stale')
  view = f.service.read('one'); const controller = new AbortController(); controller.abort()
  await expect(f.service.create('one', custom(view), controller.signal)).rejects.toThrow()
  view = f.service.read('one'); const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001)
  await expect(f.service.create('one', custom(view), signal())).rejects.toThrow('remote_settings_stale'); clock.mockRestore()
  view = f.service.read('one'); f.settings.readOnly = true
  await expect(f.service.create('one', custom(view), signal())).rejects.toThrow('remote_settings_read_only')
  f.settings.readOnly = false; view = f.service.read('one'); f.settings.fail = true
  await expect(f.service.create('one', custom(view), signal())).rejects.toThrow('remote_settings_write_unconfirmed')
  view = f.service.read('one'); f.detach()
  await expect(f.service.create('one', custom(view), signal())).rejects.toThrow('remote_settings_stale')
  expect(f.settings.writes).toBe(1)
})
