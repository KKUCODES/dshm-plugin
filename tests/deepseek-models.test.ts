import { afterEach, expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { ProviderModels } from '../src/provider-models.js'

class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = { 'llm-deepseek': { apiKeyEnv: 'TEST_PRIVATE_REF', models: [{ id: 'one', name: 'One',
    inputModalities: ['image'], description: 'TEST_PRIVATE_DESCRIPTION', imageMaxBytes: 2048 }] } }
  get writable() { return true }
  protected async load() { return structuredClone(this.doc) }
  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>) { this.doc[ns] = structuredClone(section) }
}
const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()) })
async function fixture() {
  const output = resolve('artifacts/tests/deepseek-models-config.cjs')
  await build({ entryPoints: [resolve('../deepseek-harness/packages/llm/llm-deepseek/src/config.ts')], outfile: output,
    bundle: true, platform: 'node', format: 'cjs', external: ['@deepseek-ai/*'], logLevel: 'silent' })
  const { Config } = createRequire(import.meta.url)(output)
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanups.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  provider.register('llm-deepseek', Config, { base: { models: [{ id: 'base' }] } })
  const service = new ProviderModels(() => ctx.get('settings'), 'llm-deepseek'); cleanups.push(() => service.dispose())
  return { service, provider }
}
const write = (view: ReturnType<ProviderModels['read']>) => ({ method: 'remote.providerModelsWrite' as const, provider: 'deepseek',
  snapshot: view.snapshot, expectedRevision: view.revision, change: { op: 'set' as const, rows: view.rows } })
const signal = () => new AbortController().signal

test('官方原Config保存清单/输入类型和恢复继承，隐藏字段与其他设置保留', async () => {
  const { service, provider } = await fixture()
  let view = service.read('owner', 'deepseek')
  expect(view.rows[0]?.advanced).toEqual({ input: ['image'] })
  expect(view.compatEditable).toBe(false); expect(JSON.stringify(view)).not.toContain('TEST_PRIVATE')
  view = await service.write('owner', { ...write(view), change: { op: 'set', rows: [
    { ...view.rows[0]!, name: 'Updated', contextWindow: 128000, advanced: { input: ['text', 'image'] } }, { id: 'two' },
  ] } }, signal())
  expect(provider.get('llm-deepseek')).toMatchObject({ apiKeyEnv: 'TEST_PRIVATE_REF', models: [
    { id: 'one', description: 'TEST_PRIVATE_DESCRIPTION', imageMaxBytes: 2048, inputModalities: ['text', 'image'] }, { id: 'two' },
  ] })
  view = await service.write('owner', { ...write(view), change: { op: 'set', rows: [{ ...view.rows[0]!, advanced: {} }] } }, signal())
  expect(view.rows[0]?.advanced).toEqual({ input: ['text'] })
  view = await service.write('owner', { ...write(view), change: { op: 'unset' } }, signal())
  expect(view.overridden).toBe(false); expect(view.rows.map(row => row.id)).toEqual(['base'])
})

test('官方模型快照拒绝跨owner/路由/重复提交和pi-ai字段', async () => {
  const { service, provider } = await fixture(), view = service.read('owner', 'deepseek'), operation = write(view)
  expect(() => service.read('owner', 'other')).toThrow('remote_settings_unavailable')
  await expect(service.write('other', operation, signal())).rejects.toThrow('remote_settings_stale')
  await expect(service.write('owner', { ...operation, scope: 'overrides' }, signal())).rejects.toThrow('remote_settings_invalid')
  for (const row of [{ id: 'one', compat: {} }, { id: 'one', advanced: { reasoningEfforts: false as const } }, { id: 'one', advanced: { input: [] } }])
    await expect(service.write('owner', { ...operation, change: { op: 'set', rows: [row] } }, signal())).rejects.toThrow('remote_settings_invalid')
  await provider.mutate('llm-deepseek', [{ op: 'set', path: ['maxTokens'], value: 123 }], view.revision)
  await expect(service.write('owner', operation, signal())).rejects.toThrow('remote_settings_stale')
  const current = write(service.read('owner', 'deepseek'))
  await service.write('owner', current, signal())
  await expect(service.write('owner', current, signal())).rejects.toThrow('remote_settings_stale')
})
