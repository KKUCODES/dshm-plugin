import { afterEach, expect, test, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { build } from 'esbuild'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { ProviderModels } from '../src/provider-models.js'

const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); vi.restoreAllMocks() })
class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = { 'llm-pi-ai': { providers: { alpha: { models: [{ id: 'one', name: 'One', input: ['image'],
    compat: { supportsStore: false }, future: 'TEST_HIDDEN_KEEP' }] } } } }
  writes = 0
  writableFlag = true
  get writable() { return this.writableFlag }
  protected async load() { return structuredClone(this.doc) }
  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>) { this.writes++; this.doc[ns] = structuredClone(section) }
}
async function fixture() {
  const outfile = resolve('artifacts/tests/pi-ai-model-edit-config.cjs')
  await build({ entryPoints: [resolve('../deepseek-harness/packages/llm/llm-pi-ai/src/config.ts')], outfile,
    bundle: true, platform: 'node', format: 'cjs', nodePaths: [resolve('node_modules')], external: ['@deepseek-ai/*'], logLevel: 'silent' })
  const { Config, assertServiceable } = createRequire(import.meta.url)(outfile)
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanups.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  provider.register('llm-pi-ai', Config, { base: { providers: { alpha: { api: 'openai-completions', baseURL: 'https://example.invalid',
    apiKeyEnv: 'TEST_REF_KEEP', models: [{ id: 'base' }] } } }, validate: value => assertServiceable(value) })
  let attached = true
  const adapter = new ProviderModels(() => attached ? ctx.get('settings') : undefined); cleanups.push(() => adapter.dispose())
  return { adapter, provider, detach: () => { attached = false } }
}
const operation = (view: ReturnType<ProviderModels['read']>) => ({ method: 'remote.providerModelsWrite' as const, provider: view.provider,
  snapshot: view.snapshot, expectedRevision: view.revision, change: { op: 'set' as const, rows: view.rows } })
const signal = () => new AbortController().signal

test('原设置与pi-ai校验参与模型新增/改名/移除和恢复继承，隐藏字段保留且不返回', async () => {
  const { adapter, provider } = await fixture(), view = adapter.read('one', 'alpha')
  expect(JSON.stringify(view)).not.toMatch(/TEST_HIDDEN|TEST_REF/)
  expect(view.rows[0]?.compat).toMatchObject({ supportsStore: false })
  expect(view.rows[0]?.advanced?.input).toEqual(['image'])
  const next = await adapter.write('one', { ...operation(view), change: { op: 'set', rows: [
    { ...view.rows[0]!, id: 'renamed', contextWindow: 128000 }, { id: 'new-model', name: 'New' },
  ] } }, signal())
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { apiKeyEnv: 'TEST_REF_KEEP', models: [
    { id: 'renamed', input: ['image'], compat: { supportsStore: false }, future: 'TEST_HIDDEN_KEEP' }, { id: 'new-model' },
  ] } } })
  const removed = await adapter.write('one', { ...operation(next), change: { op: 'set', rows: [next.rows[1]!] } }, signal())
  expect(removed.rows.map(row => row.id)).toEqual(['new-model'])
  const inherited = await adapter.write('one', { ...operation(removed), change: { op: 'unset' } }, signal())
  expect(inherited.overridden).toBe(false); expect(inherited.rows.map(row => row.id)).toEqual(['base'])
  expect(provider.writes).toBe(3)
})

test('模型兼容配置仍由原协议校验，支持保存/继承且不覆盖未编辑字段', async () => {
  const { adapter, provider } = await fixture()
  let view = adapter.read('one', 'alpha')
  const request = (compat: unknown) => ({ ...operation(view), change: { op: 'set' as const,
    rows: [{ ...view.rows[0]!, compat }] } })
  view = await adapter.write('one', request({ supportsStore: true, maxTokensField: 'max_tokens', thinkingFormat: 'chat-template',
    vllmPriority: -1, chatTemplateKwargs: { enable_thinking: { $var: 'thinking.enabled', omitWhenOff: true }, empty: null, count: 2 } }) as Parameters<ProviderModels['write']>[1], signal())
  expect(view.rows[0]?.compat).toMatchObject({ supportsStore: true, maxTokensField: 'max_tokens', vllmPriority: -1,
    chatTemplateKwargs: { enable_thinking: { $var: 'thinking.enabled', omitWhenOff: true }, empty: null } })
  const { compat: ignored, ...oldRow } = view.rows[0]!
  view = await adapter.write('one', { ...operation(view), change: { op: 'set', rows: [{ ...oldRow, name: 'Preserve compat' }] } }, signal())
  expect(view.rows[0]?.compat).toMatchObject({ supportsStore: true })
  const writes = provider.writes
  // 类型合法但 completions 不接受 Anthropic 的 temperature 兼容开关，原业务校验拒绝。
  await expect(adapter.write('one', request({ supportsTemperature: false }) as Parameters<ProviderModels['write']>[1], signal())).rejects.toThrow('remote_settings_write_unconfirmed')
  expect(provider.writes).toBe(writes)
  view = adapter.read('one', 'alpha')
  view = await adapter.write('one', request({}) as Parameters<ProviderModels['write']>[1], signal())
  // 原 schemastery 会物化空模板字典；它们不等于用户保存了覆盖。
  expect(view.rows[0]?.compat).toEqual({ chatTemplateKwargs: {}, chatTemplateArgs: {} })
  expect((provider.doc['llm-pi-ai'] as { providers: { alpha: { models: Array<{ compat?: unknown }> } } }).providers.alpha.models[0]?.compat).toBeUndefined()
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { apiKeyEnv: 'TEST_REF_KEEP', models: [{ future: 'TEST_HIDDEN_KEEP', input: ['image'] }] } } })
})

test('输入类型与思考档位经原pi-ai服务保存，继承/关闭不同，省略新字段保留旧值', async () => {
  const { adapter, provider } = await fixture()
  let view = adapter.read('one', 'alpha')
  const update = (advanced: unknown) => ({ ...operation(view), change: { op: 'set' as const,
    rows: [{ ...view.rows[0]!, advanced }] } })
  // 非 off 的空值、只声明 off 与空声明，均不等于继承。
  for (const reasoningEfforts of [null, {}, { off: null }, { high: null }, { high: '' }]) {
    await expect(adapter.write('one', update({ reasoningEfforts }) as Parameters<ProviderModels['write']>[1], signal())).rejects.toThrow('remote_settings_invalid')
  }
  view = await adapter.write('one', update({ input: ['text', 'image'], reasoningEfforts: { off: null, high: 'high' } }) as Parameters<ProviderModels['write']>[1], signal())
  expect(view.rows[0]?.advanced).toEqual({ input: ['text', 'image'], reasoningEfforts: { off: null, high: 'high' } })
  const { advanced: ignored, ...oldClientRow } = view.rows[0]!
  view = await adapter.write('one', { ...operation(view), change: { op: 'set', rows: [{ ...oldClientRow, name: 'Old client' }] } }, signal())
  expect(view.rows[0]?.advanced?.reasoningEfforts).toEqual({ off: null, high: 'high' })
  view = await adapter.write('one', update({ reasoningEfforts: false }) as Parameters<ProviderModels['write']>[1], signal())
  expect(view.rows[0]?.advanced?.reasoningEfforts).toBe(false)
  view = await adapter.write('one', update({}) as Parameters<ProviderModels['write']>[1], signal())
  expect(view.rows[0]?.advanced?.reasoningEfforts).toBeUndefined()
  expect(provider.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { apiKeyEnv: 'TEST_REF_KEEP', models: [
    { compat: { supportsStore: false }, future: 'TEST_HIDDEN_KEEP' },
  ] } } })
})

test('跨设备/路由/快照行、重放和电脑并发修改不能覆盖配置', async () => {
  const { adapter, provider } = await fixture(), view = adapter.read('one', 'alpha')
  await expect(adapter.write('two', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  await expect(adapter.write('one', { ...operation(view), provider: 'other' }, signal())).rejects.toThrow('remote_settings_stale')
  await expect(adapter.write('one', { ...operation(view), change: { op: 'set', rows: [{ id: 'one', source: randomUUID() }] } }, signal())).rejects.toThrow('remote_settings_stale')
  await adapter.write('one', operation(view), signal())
  await expect(adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  const fresh = adapter.read('one', 'alpha')
  await provider.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'alpha', 'displayName'], value: 'Changed on desktop' }])
  await expect(adapter.write('one', operation(fresh), signal())).rejects.toThrow('remote_settings_stale')
})

test('只读、过期、取消、服务脱离和原业务拒绝不写入或冒充成功', async () => {
  const f = await fixture()
  let view = f.adapter.read('one', 'alpha'); f.provider.writableFlag = false
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_read_only')
  f.provider.writableFlag = true; view = f.adapter.read('one', 'alpha')
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001)
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_stale'); clock.mockRestore()
  view = f.adapter.read('one', 'alpha'); const cancelled = new AbortController(); cancelled.abort()
  await expect(f.adapter.write('one', operation(view), cancelled.signal)).rejects.toThrow()
  view = f.adapter.read('one', 'alpha')
  // 自定义路由无内置目录，原业务校验必须拒绝清空最后一个模型。
  await expect(f.adapter.write('one', { ...operation(view), change: { op: 'set', rows: [] } }, signal())).rejects.toThrow('remote_settings_write_unconfirmed')
  expect(f.provider.writes).toBe(0)
  view = f.adapter.read('one', 'alpha'); f.detach()
  await expect(f.adapter.write('one', operation(view), signal())).rejects.toThrow('remote_settings_stale')
})
