import { afterEach, expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { build } from 'esbuild'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { ProviderModels } from '../src/provider-models.js'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).reverse().forEach(fn => fn()))
async function fixture() {
  const outfile = resolve('artifacts/tests/pi-ai-overrides-config.cjs')
  await build({ stdin: { resolveDir: resolve('../deepseek-harness/packages/llm/llm-pi-ai/src'),
    contents: "export { Config, assertServiceable } from './config.ts'; export { catalogModels, resolveRouteModels } from './catalog.ts';", loader: 'ts' },
    outfile, bundle: true, platform: 'node', format: 'cjs', nodePaths: [resolve('node_modules')], external: ['@deepseek-ai/*'], logLevel: 'silent' })
  const { Config, assertServiceable, catalogModels, resolveRouteModels } = createRequire(import.meta.url)(outfile)
  const ids: string[] = [...catalogModels('deepseek').keys()]
  expect(ids.length).toBeGreaterThan(1)
  class MemorySettings extends SettingsProvider {
    doc: Record<string, unknown> = { 'llm-pi-ai': { providers: { deepseek: {
      modelOverrides: { [ids[0]!]: { name: 'User name', future: 'TEST_HIDDEN' } }, apiKeyEnv: 'TEST_KEY_REF',
    } } } }
    writes = 0
    get writable() { return true }
    protected async load() { return structuredClone(this.doc) }
    protected async persist(ns: SettingsNamespace, section: Record<string, unknown>) { this.writes++; this.doc[ns] = structuredClone(section) }
  }
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanups.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  provider.register('llm-pi-ai', Config, { base: { providers: { deepseek: { modelOverrides: { [ids[0]!]: { name: 'Base name' } } } } },
    validate: value => assertServiceable(value) })
  const adapter = new ProviderModels(() => ctx.get('settings')); cleanups.push(() => adapter.dispose())
  return { adapter, provider, ids, resolved: () => resolveRouteModels({ provider: 'deepseek', ...(provider.get('llm-pi-ai') as { providers: { deepseek: object } }).providers.deepseek }) as { models: Array<{ id: string; name: string }> } }
}
const op = (view: ReturnType<ProviderModels['read']>) => ({ method: 'remote.providerModelsWrite' as const, scope: 'overrides' as const,
  provider: 'deepseek', snapshot: view.snapshot, expectedRevision: view.revision, change: { op: 'set' as const, rows: view.rows } })
const signal = () => new AbortController().signal

test('原内置目录按单个模型覆盖，保留其他模型与未来字段；移除用户覆盖恢复基础配置', async () => {
  const f = await fixture(), view = f.adapter.read('owner', 'deepseek', 'overrides')
  expect(view.scope).toBe('overrides'); expect(view.blockedByModels).toBe(false)
  expect(view.rows).toHaveLength(1); expect(JSON.stringify(view)).not.toMatch(/TEST_HIDDEN|TEST_KEY_REF/)
  const next = await f.adapter.write('owner', { ...op(view), change: { op: 'set', rows: [
    { ...view.rows[0]!, name: 'Updated name', maxTokens: 4096, compat: { supportsStore: false } },
    { id: f.ids[1]!, name: 'Second name' },
  ] } }, signal())
  const config = f.provider.get('llm-pi-ai') as { providers: { deepseek: { models: unknown[]; modelOverrides: Record<string, object> } } }
  expect(config.providers.deepseek.models).toEqual([])
  expect(config.providers.deepseek.modelOverrides[f.ids[0]!]).toMatchObject({ name: 'Updated name', future: 'TEST_HIDDEN', maxTokens: 4096 })
  const catalog = f.resolved()
  expect(catalog.models.length).toBe(f.ids.length)
  expect(catalog.models.find(row => row.id === f.ids[0])?.name).toBe('Updated name')
  expect(catalog.models.find(row => row.id === f.ids[1])?.name).toBe('Second name')
  const removed = await f.adapter.write('owner', { ...op(next), change: { op: 'set', rows: [next.rows[1]!] } }, signal())
  expect(removed.rows.map(row => row.id)).toEqual([f.ids[1]])
  expect(f.resolved().models.find(row => row.id === f.ids[0])?.name).toBe('Base name')
  const restored = await f.adapter.write('owner', { ...op(removed), change: { op: 'unset' } }, signal())
  expect(restored.rows).toEqual([]); expect(restored.overridden).toBe(false)
  expect(f.resolved().models.length).toBe(f.ids.length)
  expect(f.provider.doc['llm-pi-ai']).toMatchObject({ providers: { deepseek: { apiKeyEnv: 'TEST_KEY_REF' } } })
})

test('清单/覆盖快照隔离；无效模型与并列自定义清单由原校验拒绝，不部分持久化', async () => {
  const f = await fixture(), view = f.adapter.read('owner', 'deepseek', 'overrides')
  const list = f.adapter.read('owner', 'deepseek')
  await expect(f.adapter.write('owner', { ...op(list) }, signal())).rejects.toThrow('remote_settings_stale')
  await expect(f.adapter.write('other', op(view), signal())).rejects.toThrow('remote_settings_stale')
  await expect(f.adapter.write('owner', { ...op(view), change: { op: 'set', rows: [{ id: 'not-in-the-original-catalog' }] } }, signal()))
    .rejects.toThrow('remote_settings_write_unconfirmed')
  expect(f.provider.writes).toBe(0)
  expect(f.resolved().models.find(row => row.id === f.ids[0])?.name).toBe('User name')
  await f.provider.mutate('llm-pi-ai', [{ op: 'unset', path: ['providers', 'deepseek', 'modelOverrides'] },
    { op: 'set', path: ['providers', 'deepseek', 'modelOverrides', f.ids[0]!], value: {} }])
  // base层本身有覆盖，不能靠用户层unset抹掉；并列清单原服务必须拒绝。
  const latest = f.adapter.read('owner', 'deepseek')
  await expect(f.adapter.write('owner', { ...op(latest), scope: undefined, change: { op: 'set', rows: [{ id: f.ids[0]! }] } }, signal()))
    .rejects.toThrow('remote_settings_write_unconfirmed')
  expect(f.provider.writes).toBe(1)
})
