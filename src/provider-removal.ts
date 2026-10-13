import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import { providerRouteSchema, providerRemovalViewSchema, providerRemovalWriteSchema, type ProviderRemovalWrite } from '@dsh-mobile/protocol'

type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>
const namespace = 'llm-pi-ai'
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const identity = (provider: Provider) => Reflect.get(provider, symbols.original) ?? provider
type View = ReturnType<typeof providerRemovalViewSchema.parse>
type Snapshot = { owner: string; provider: unknown; config: unknown; view: View; expires: number }

/** 删除用户层的整个路由；基础层路由和独立凭据不属于此操作。 */
export class ProviderRemoval {
  private snapshots = new Map<string, Snapshot>()
  constructor(private settings: () => Provider | undefined) {}
  read(owner: string, rawRoute: string) {
    try {
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings()
      if (!provider) throw Error('unavailable')
      const view = provider.describe({ redactSecrets: true }).find(item => item.ns === namespace)
      const config = provider.get(namespace), profiles = record(record(config).providers)
      if (!view || !Object.hasOwn(profiles, route)) throw Error('unavailable')
      const profile = record(profiles[route]), snapshot = randomUUID()
      const result = providerRemovalViewSchema.parse({ provider: route, name: typeof profile.displayName === 'string' ? profile.displayName : route,
        snapshot, revision: view.revision, writable: provider.writable === true,
        removable: Object.hasOwn(record(record(view.user).providers), route) && !Object.hasOwn(record(record(view.base).providers), route),
        removed: false, keepsCredential: typeof profile.apiKeyEnv === 'string', applies: view.applies === 'restart' ? 'restart' : 'live' })
      for (const [id, entry] of this.snapshots) if ((entry.owner === owner && entry.view.provider === route) || entry.expires <= Date.now()) this.snapshots.delete(id)
      if (this.snapshots.size >= 128) throw Error('remote_settings_busy')
      this.snapshots.set(snapshot, { owner, provider: identity(provider), config, view: result, expires: Date.now() + 300000 })
      return result
    } catch (error) { throw Error(error instanceof Error && error.message === 'remote_settings_busy' ? error.message : 'remote_settings_unavailable') }
  }
  async remove(owner: string, raw: ProviderRemovalWrite, signal: AbortSignal) {
    const parsed = providerRemovalWriteSchema.safeParse(raw)
    if (!parsed.success) throw Error('remote_settings_invalid')
    const operation = parsed.data, entry = this.snapshots.get(operation.snapshot)
    if (!entry || entry.owner !== owner || entry.view.provider !== operation.provider) throw Error('remote_settings_stale')
    this.snapshots.delete(operation.snapshot)
    let provider: Provider | undefined
    try { provider = this.settings() } catch { throw Error('remote_settings_unavailable') }
    if (!provider || identity(provider) !== entry.provider || entry.expires <= Date.now()
      || entry.view.revision !== operation.expectedRevision) throw Error('remote_settings_stale')
    try { if (provider.get(namespace) !== entry.config) throw Error('changed') } catch { throw Error('remote_settings_stale') }
    if (!provider.writable) throw Error('remote_settings_read_only')
    if (!entry.view.removable) throw Error('remote_provider_inherited')
    signal.throwIfAborted()
    try {
      // 不将局部视图写回整棵配置，也不删除可能被其他提供方共用的Key。
      await provider.mutate(namespace, [{ op: 'unset', path: ['providers', operation.provider] }], operation.expectedRevision)
      signal.throwIfAborted()
      const current = this.settings()
      if (!current || identity(current) !== entry.provider || Object.hasOwn(record(record(current.get(namespace)).providers), operation.provider)) throw Error('changed')
      return { ...entry.view, removed: true, removable: false, writable: false }
    } catch (error) {
      if (record(error).code === 'SETTINGS_CONFLICT') throw Error('remote_settings_stale')
      throw Error('remote_settings_write_unconfirmed')
    }
  }
  dispose() { this.snapshots.clear() }
}
