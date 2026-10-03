import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { ComputerSettings } from '../src/computer-settings.js'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = { 'llm-deepseek': { maxTokens: 256, baseURL: 'https://TEST_SECRET.example/?token=TEST_SECRET',
    headers: { Authorization: 'TEST_SECRET' }, branch: { secret: 'TEST_SECRET' }, unknown: 'TEST_SECRET' } }
  writableFlag = true
  writes = 0
  rejectPersist = false
  get writable() { return this.writableFlag }
  protected async load() { return structuredClone(this.doc) }
  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>) {
    if (this.rejectPersist) throw new Error('TEST_SECRET')
    this.writes++; this.doc[ns] = structuredClone(section)
  }
}
const cleanups: Array<() => void> = []
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })
async function fixture() {
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber
  cleanups.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  const registration = provider.register('llm-deepseek', Schema.object({
    maxTokens: Schema.number().min(1).default(1024), thinking: Schema.union(['enabled', 'disabled']),
    reasoningEffort: Schema.union(['off', 'low', 'high', 'max']), defaultContextWindow: Schema.number().default(4096),
    streamIdleTimeoutMs: Schema.number().default(30000), baseURL: Schema.string(), headers: Schema.dict(Schema.string()),
    branch: Schema.union([Schema.object({ secret: Schema.string().role('secret') })]),
  }))
  let attached = true
  // 生产入口每次 ctx.get 都会生成新的 Cordis 代理，不能复用测试缓存的代理掩盖身份问题。
  const adapter = new ComputerSettings(() => attached ? ctx.get('settings') : undefined); cleanups.push(() => adapter.dispose())
  expect(ctx.get('settings')).not.toBe(ctx.get('settings'))
  return { ctx, provider, adapter, registration, detach: () => { attached = false } }
}
const write = (adapter: ComputerSettings, view: ReturnType<ComputerSettings['read']>, key: 'maxTokens', value: number, owner = 'device:connection') =>
  adapter.write(owner, { method: 'remote.settingsWrite', snapshot: view.snapshot, expectedRevision: view.revision,
    edits: [{ op: 'set', key, value }] }, new AbortController().signal)

test('真实设置服务：读/写只投影五个标量，不泄露 schema、URL、头、联合分支和未知字段', async () => {
  const { adapter, provider } = await fixture()
  const view = adapter.read('device:connection')
  expect(JSON.stringify(view)).not.toContain('TEST_SECRET')
  expect(view).not.toHaveProperty('schema'); expect(view).not.toHaveProperty('user')
  const updated = await write(adapter, view, 'maxTokens', 512)
  expect(updated.revision).toBeGreaterThan(view.revision)
  expect(updated.fields.find(field => field.key === 'maxTokens')).toMatchObject({ value: 512, overridden: true })
  expect(JSON.stringify(updated)).not.toContain('TEST_SECRET')
  expect(provider.doc['llm-deepseek']).toMatchObject({ maxTokens: 512, headers: { Authorization: 'TEST_SECRET' }, unknown: 'TEST_SECRET' })
  await adapter.write('device:connection', { method: 'remote.settingsWrite', snapshot: updated.snapshot,
    expectedRevision: updated.revision, edits: [{ op: 'unset', key: 'maxTokens' }] }, new AbortController().signal)
  expect(provider.get('llm-deepseek')).toMatchObject({ maxTokens: 1024 })
  expect(provider.doc['llm-deepseek']).not.toHaveProperty('maxTokens')
})

test('原 DeepSeek Config 的实际默认值能通过投影，字段写入仍经过原 schema', async () => {
  const outfile = resolve('artifacts/tests/deepseek-settings-config.cjs')
  await build({ entryPoints: [resolve('../deepseek-harness/packages/llm/llm-deepseek/src/config.ts')], outfile,
    bundle: true, platform: 'node', format: 'cjs', external: ['@deepseek-ai/*'], logLevel: 'silent' })
  const { Config: DeepSeekConfig } = createRequire(import.meta.url)(outfile)
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanups.push(() => fiber.dispose())
  const provider = ctx.settings as MemorySettings
  provider.register('llm-deepseek', DeepSeekConfig)
  const adapter = new ComputerSettings(() => provider)
  const view = adapter.read('device:connection')
  expect(view.fields).toHaveLength(5)
  const next = await write(adapter, view, 'maxTokens', 4096)
  expect(next.fields.find(field => field.key === 'maxTokens')?.value).toBe(4096)
  expect(JSON.stringify(next)).not.toContain('TEST_SECRET')
})

test('原版本冲突、跨连接快照、过期表单和重复提交均拒绝，保留电脑的新设置', async () => {
  const { adapter, provider } = await fixture()
  let view = adapter.read('device:connection')
  await expect(write(adapter, view, 'maxTokens', 100, 'other:connection')).rejects.toThrow('remote_settings_stale')
  await provider.mutate('llm-deepseek', [{ op: 'set', path: ['maxTokens'], value: 700 }], view.revision)
  await expect(write(adapter, view, 'maxTokens', 100)).rejects.toThrow('remote_settings_stale')
  view = adapter.read('device:connection')
  await write(adapter, view, 'maxTokens', 800)
  await expect(write(adapter, view, 'maxTokens', 100)).rejects.toThrow('remote_settings_stale')
  expect(provider.get('llm-deepseek')).toMatchObject({ maxTokens: 800 })
  expect(provider.writes).toBe(2)
})

test('只读、服务卸载和带秘密的保存错误不会回传原文或误报成功', async () => {
  const f = await fixture()
  let view = f.adapter.read('device:connection'); f.provider.writableFlag = false
  await expect(write(f.adapter, view, 'maxTokens', 200)).rejects.toThrow('remote_settings_read_only')
  f.provider.writableFlag = true; view = f.adapter.read('device:connection'); f.provider.rejectPersist = true
  await expect(write(f.adapter, view, 'maxTokens', 200)).rejects.toThrow('remote_settings_write_unconfirmed')
  view = f.adapter.read('device:connection'); f.detach()
  await expect(write(f.adapter, view, 'maxTokens', 200)).rejects.toThrow('remote_settings_stale')
  expect(() => f.adapter.read('device:connection')).toThrow('remote_settings_unavailable')
  expect(f.provider.writes).toBe(0)
})

test('排队时的真实 CAS 冲突不覆盖先提交值；快照过期与取消不写入', async () => {
  const f = await fixture(), first = f.adapter.read('device:connection'), second = f.adapter.read('other:connection')
  const results = await Promise.allSettled([write(f.adapter, first, 'maxTokens', 333), write(f.adapter, second, 'maxTokens', 444, 'other:connection')])
  expect(results[0].status).toBe('fulfilled')
  expect(results[1]).toMatchObject({ status: 'rejected', reason: { message: 'remote_settings_stale' } })
  expect(f.provider.writes).toBe(1)
  let view = f.adapter.read('device:connection')
  const now = Date.now(), clock = vi.spyOn(Date, 'now').mockReturnValue(now + 300001)
  try { await expect(write(f.adapter, view, 'maxTokens', 555)).rejects.toThrow('remote_settings_stale') }
  finally { clock.mockRestore() }
  view = f.adapter.read('device:connection')
  const controller = new AbortController(); controller.abort()
  await expect(f.adapter.write('device:connection', { method: 'remote.settingsWrite', snapshot: view.snapshot,
    expectedRevision: view.revision, edits: [{ op: 'unset', key: 'maxTokens' }] }, controller.signal)).rejects.toThrow()
  expect(f.provider.writes).toBe(1)
})

test('插件数值设置保留继承层、限定快照 namespace，原路径与未知值不会跨设备', async () => {
  const { adapter, provider } = await fixture()
  provider.register('shell', Schema.object({ timeoutMs: Schema.number().default(120000), maxOutputBytes: Schema.number().default(64000), cwd: Schema.string().default('TEST_SECRET') }),
    { base: { timeoutMs: 120000, maxOutputBytes: 64000, cwd: 'TEST_SECRET', pwshPath: 'TEST_SECRET', headers: 'TEST_SECRET' } })
  provider.register('agent-loop', Schema.object({ maxParallelToolCalls: Schema.number().min(1).step(1).default(4) }))
  await provider.mutate('shell', [{ op: 'set', path: ['timeoutMs'], value: 130000 }])
  const shell = adapter.read('device:connection', 'shell'), loop = adapter.read('device:connection', 'agent-loop')
  expect(shell.fields.find(field => field.key === 'timeoutMs')).toMatchObject({ value: 130000, base: 120000, user: 130000, overridden: true })
  expect(JSON.stringify(shell)).not.toContain('TEST_SECRET')
  await expect(adapter.write('device:connection', { method: 'remote.settingsWrite', namespace: 'agent-loop', snapshot: shell.snapshot,
    expectedRevision: shell.revision, edits: [{ op: 'set', key: 'maxParallelToolCalls', value: 2 }] }, new AbortController().signal)).rejects.toThrow('remote_settings_stale')
  const updated = await adapter.write('device:connection', { method: 'remote.settingsWrite', namespace: 'shell', snapshot: shell.snapshot,
    expectedRevision: shell.revision, edits: [{ op: 'unset', key: 'timeoutMs' }] }, new AbortController().signal)
  expect(updated.fields.find(field => field.key === 'timeoutMs')).toMatchObject({ value: 120000, base: 120000, overridden: false })
  expect(updated.fields.find(field => field.key === 'timeoutMs')).not.toHaveProperty('user')
  // 读取另一个 namespace 不会使此前页面的快照失效。
  await adapter.write('device:connection', { method: 'remote.settingsWrite', namespace: 'agent-loop', snapshot: loop.snapshot,
    expectedRevision: loop.revision, edits: [{ op: 'set', key: 'maxParallelToolCalls', value: 2 }] }, new AbortController().signal)
  expect(provider.get('agent-loop')).toMatchObject({ maxParallelToolCalls: 2 })
})

test('原 Subagent 模型服务原子校验两个字段，版本冲突不会覆盖新授权', async () => {
  const outfile = resolve('artifacts/tests/subagent-model-settings.cjs')
  await build({ entryPoints: [resolve('../deepseek-harness/packages/subagent/tool-subagent/src/model-selection-settings.ts')], outfile,
    bundle: true, platform: 'node', format: 'cjs', external: ['@deepseek-ai/*'], logLevel: 'silent' })
  const { SubagentModelSelectionConfig } = createRequire(import.meta.url)(outfile)
  const { ctx, adapter, provider } = await fixture()
  const service = ctx.plugin(SubagentModelSelectionConfig); await service; cleanups.push(() => service.dispose())
  const ns = 'subagent-model-selection'
  const initial = adapter.read('device:connection', ns)
  expect(initial.fields).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'enabled', value: false, overridden: false }),
    expect.objectContaining({ key: 'allowedModels', value: [], overridden: false }),
  ]))
  const operation = (view: ReturnType<ComputerSettings['read']>, edits: Parameters<ComputerSettings['write']>[1]['edits']): Parameters<ComputerSettings['write']>[1] => ({ method: 'remote.settingsWrite',
    namespace: ns, snapshot: view.snapshot, expectedRevision: view.revision, edits })
  const signal = new AbortController().signal
  await expect(adapter.write('device:connection', operation(initial, [{ op: 'set', key: 'enabled', value: true }]), signal)).rejects.toThrow('remote_settings_write_unconfirmed')
  expect(provider.get(ns)).toMatchObject({ enabled: false, allowedModels: [] })
  const routes = [{ provider: 'deepseek', model: 'deepseek-chat' }]
  const next = await adapter.write('device:connection', operation(adapter.read('device:connection', ns), [
    { op: 'set', key: 'enabled', value: true }, { op: 'set', key: 'allowedModels', value: routes },
  ]), signal)
  expect(provider.get(ns)).toMatchObject({ enabled: true, allowedModels: routes })
  await provider.mutate(ns, [{ op: 'set', path: ['enabled'], value: false }])
  await expect(adapter.write('device:connection', operation(next, [{ op: 'set', key: 'enabled', value: true }]), signal)).rejects.toThrow('remote_settings_stale')
  await adapter.write('device:connection', operation(adapter.read('device:connection', ns), [
    { op: 'unset', key: 'enabled' }, { op: 'unset', key: 'allowedModels' },
  ]), signal)
  expect(provider.get(ns)).toMatchObject({ enabled: false, allowedModels: [] })
  expect(provider.doc[ns]).toEqual({})
})
