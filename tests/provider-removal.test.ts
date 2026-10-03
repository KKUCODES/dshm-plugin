import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { ProviderRemoval } from '../src/provider-removal.js'

class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = { 'llm-pi-ai': { providers: { alpha: { displayName: 'Alpha', apiKeyEnv: 'PRIVATE_REFERENCE' },
    beta: { displayName: 'Beta', apiKeyEnv: 'PRIVATE_REFERENCE' }, base: { displayName: 'Override' } }, hidden: 'PRIVATE_VALUE' } }
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
const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); vi.restoreAllMocks() })
async function fixture() {
  const ctx = new Context(), fiber = ctx.plugin(MemorySettings); await fiber; cleanups.push(() => fiber.dispose())
  const settings = ctx.settings as MemorySettings
  const schema: Schema<Record<string, unknown>> = Schema.object({ providers: Schema.dict(Schema.object({ displayName: Schema.string(), apiKeyEnv: Schema.string() })) })
  settings.register('llm-pi-ai', schema,
    { base: { providers: { base: { displayName: 'Base' } } } })
  let attached = true
  const service = new ProviderRemoval(() => attached ? ctx.get('settings') : undefined)
  cleanups.push(() => service.dispose())
  return { settings, service, detach() { attached = false } }
}
const operation = (view: ReturnType<ProviderRemoval['read']>) => ({ method: 'remote.providerRemovalWrite' as const,
  provider: view.provider, snapshot: view.snapshot, expectedRevision: view.revision })
const signal = () => new AbortController().signal

test('真实原设置服务仅移除所选用户路由，保留基础层、其他路由与共享Key引用', async () => {
  const { settings, service } = await fixture(), view = service.read('owner', 'alpha')
  expect(view).toMatchObject({ removable: true, keepsCredential: true })
  expect(JSON.stringify(view)).not.toContain('PRIVATE')
  expect(await service.remove('owner', operation(view), signal())).toMatchObject({ removed: true, writable: false })
  expect(settings.get('llm-pi-ai')).toMatchObject({ providers: { beta: { apiKeyEnv: 'PRIVATE_REFERENCE' }, base: { displayName: 'Override' } }, hidden: 'PRIVATE_VALUE' })
  expect(() => service.read('owner', 'alpha')).toThrow('remote_settings_unavailable')
  expect(settings.writes).toBe(1)
})

test('基础层路由不可移除；跨设备/路由、重复请求和配置并发均不能删除新配置', async () => {
  const { service, settings } = await fixture(), base = service.read('one', 'base')
  expect(base.removable).toBe(false)
  await expect(service.remove('one', operation(base), signal())).rejects.toThrow('remote_provider_inherited')
  const view = service.read('one', 'alpha')
  await expect(service.remove('two', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  await expect(service.remove('one', { ...operation(view), provider: 'beta' }, signal())).rejects.toThrow('remote_settings_stale')
  await settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'alpha', 'displayName'], value: 'Changed' }])
  await expect(service.remove('one', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  const fresh = service.read('one', 'alpha'); await service.remove('one', operation(fresh), signal())
  await expect(service.remove('one', operation(fresh), signal())).rejects.toThrow('remote_settings_stale')
})

test('过期、取消、只读、服务消失和保存错误不伪报成功或泄漏原始异常', async () => {
  const f = await fixture(); let view = f.service.read('one', 'alpha')
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001)
  await expect(f.service.remove('one', operation(view), signal())).rejects.toThrow('remote_settings_stale'); clock.mockRestore()
  view = f.service.read('one', 'alpha'); const controller = new AbortController(); controller.abort()
  await expect(f.service.remove('one', operation(view), controller.signal)).rejects.toThrow()
  view = f.service.read('one', 'alpha'); f.settings.readOnly = true
  await expect(f.service.remove('one', operation(view), signal())).rejects.toThrow('remote_settings_read_only')
  f.settings.readOnly = false; view = f.service.read('one', 'alpha'); f.settings.fail = true
  await expect(f.service.remove('one', operation(view), signal())).rejects.toThrow('remote_settings_write_unconfirmed')
  view = f.service.read('one', 'alpha'); f.detach()
  await expect(f.service.remove('one', operation(view), signal())).rejects.toThrow('remote_settings_stale')
  expect(f.settings.writes).toBe(0)
})
