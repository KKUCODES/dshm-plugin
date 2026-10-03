import { expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { ModelProbe } from '../src/model-probe.js'
import type { LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'

class MemorySettings extends SettingsProvider {
  writes = 0
  get writable() { return true }
  protected async load() { return {} }
  protected async persist(_ns: SettingsNamespace, _value: Record<string, unknown>) { this.writes++ }
}
async function fixture() {
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber
  const settings = ctx.settings as MemorySettings
  settings.register('llm-pi-ai', Schema.object({ providers: Schema.dict(Schema.object({})) }))
  await settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers'], value: { route: {} } }])
  const calls: Array<{ ns: string; request: LlmModelDiscoveryRequest }> = []
  const state = { credentials: 0, allowed: true, time: 1000, delayed: false }
  let finish: ((rows: Array<{ id: string }>) => void) | undefined
  const runtime = { discoverModels: async (ns: string, request: LlmModelDiscoveryRequest) => {
    calls.push({ ns, request })
    if (state.delayed) return new Promise<Array<{ id: string }>>(resolve => { finish = resolve })
    return [{ id: 'candidate' }]
  } }
  const probe = new ModelProbe({ settings: () => settings, runtime: () => runtime,
    credentialRevision: () => state.credentials, permitted: () => state.allowed }, () => state.time)
  return { probe, state, calls, settings, finish: () => finish?.([{ id: 'late' }]), close: async () => { probe.dispose(); await fiber.dispose() } }
}
const prepare = (mode = 'none') => ({ method: 'remote.modelProbePrepare', baseURL: 'http://127.0.0.1:12345/v1',
  api: 'openai-completions', authentication: mode === 'stored' ? { mode, provider: 'route' } : { mode } })
const execute = (snapshot: string, mode = 'none') => ({ method: 'remote.modelProbeExecute', snapshot, mode, confirmed: true,
  ...(mode === 'temporary' ? { apiKey: 'synthetic-only-key' } : {}) })

test('能力检查使用真实Runtime，缺少专用注册时关闭且从不进入发现回调', async () => {
  const f = await fixture(), ctx = new Context(), fiber = ctx.plugin(LlmRuntime)
  await fiber
  let calls = 0
  const probe = new ModelProbe({ settings: () => f.settings, runtime: () => ctx.llm,
    credentialRevision: () => 0, permitted: () => true })
  try {
    expect(await probe.available()).toBe(false)
    const unregister = ctx.llm.registerModelDiscovery('dshm.pi-ai-endpoint-v2', async () => { calls++; return [] })
    expect(await probe.available()).toBe(true)
    expect(calls).toBe(0)
    unregister()
    expect(await probe.available()).toBe(false)
    probe.dispose()
    expect(await probe.available()).toBe(false)
  } finally { await fiber.dispose(); await f.close() }
})

test('快照按设备一次消费；临时和无认证不带路由，保存认证才使用已登记路由', async () => {
  const f = await fixture()
  try {
    const writes = f.settings.writes
    for (const mode of ['none', 'temporary', 'stored']) {
      const view = f.probe.prepare('device-a', prepare(mode))
      expect(JSON.stringify(view)).not.toContain('apiKey')
      await expect(f.probe.execute('device-b', execute(view.snapshot, mode), new AbortController().signal)).rejects.toThrow('remote_settings_stale')
      expect(await f.probe.execute('device-a', execute(view.snapshot, mode), new AbortController().signal)).toEqual({ rows: [{ id: 'candidate' }] })
      const call = f.calls.at(-1)!
      expect(call.ns).toBe('dshm.pi-ai-endpoint-v2')
      expect(call.request.provider).toBe(mode === 'stored' ? 'route' : undefined)
      expect(call.request.apiKey).toBe(mode === 'temporary' ? 'synthetic-only-key' : undefined)
      await expect(f.probe.execute('device-a', execute(view.snapshot, mode), new AbortController().signal)).rejects.toThrow('remote_settings_stale')
    }
    expect(f.settings.writes).toBe(writes)
    expect(f.calls).toHaveLength(3)
  } finally { await f.close() }
})

test('过期、凭据变化、配置变化和撤权均在发出请求前拒绝', async () => {
  const f = await fixture()
  try {
    let view = f.probe.prepare('a', prepare()); f.state.time += 300000
    await expect(f.probe.execute('a', execute(view.snapshot), new AbortController().signal)).rejects.toThrow('remote_settings_stale')
    view = f.probe.prepare('a', prepare()); f.state.credentials++
    await expect(f.probe.execute('a', execute(view.snapshot), new AbortController().signal)).rejects.toThrow('remote_settings_stale')
    view = f.probe.prepare('a', prepare())
    await f.settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers'], value: { route: {}, second: {} } }])
    await expect(f.probe.execute('a', execute(view.snapshot), new AbortController().signal)).rejects.toThrow('remote_settings_stale')
    view = f.probe.prepare('a', prepare()); f.state.allowed = false
    await expect(f.probe.execute('a', execute(view.snapshot), new AbortController().signal)).rejects.toThrow('remote_management_required')
    expect(f.calls).toHaveLength(0)
  } finally { await f.close() }
})

test('认证模式不匹配消费快照；返回的准备对象不能改变Host目标', async () => {
  const f = await fixture()
  try {
    const bad = f.probe.prepare('a', prepare())
    await expect(f.probe.execute('a', execute(bad.snapshot, 'stored'), new AbortController().signal)).rejects.toThrow('remote_model_probe_invalid')
    await expect(f.probe.execute('a', execute(bad.snapshot), new AbortController().signal)).rejects.toThrow('remote_settings_stale')
    const view = f.probe.prepare('a', prepare()); view.baseURL = 'https://changed.invalid'
    await f.probe.execute('a', execute(view.snapshot), new AbortController().signal)
    expect(f.calls[0]?.request.baseURL).toBe(prepare().baseURL)
  } finally { await f.close() }
})

test('取消或主动失效阻止迟到结果；同设备处理中不新建快照', async () => {
  const f = await fixture()
  try {
    f.state.delayed = true
    const view = f.probe.prepare('a', prepare()), controller = new AbortController()
    const pending = f.probe.execute('a', execute(view.snapshot), controller.signal)
    expect(() => f.probe.prepare('a', prepare())).toThrow('remote_settings_busy')
    f.probe.invalidate('a'); f.finish()
    await expect(pending).rejects.toThrow('remote_model_discovery_failed')
    const next = f.probe.prepare('a', prepare())
    const cancelled = f.probe.execute('a', execute(next.snapshot), controller.signal)
    controller.abort(); f.finish(); await expect(cancelled).rejects.toThrow()
    const last = f.probe.prepare('a', prepare()); f.probe.invalidate('a')
    await expect(f.probe.execute('a', execute(last.snapshot), new AbortController().signal)).rejects.toThrow('remote_settings_stale')
  } finally { await f.close() }
})
