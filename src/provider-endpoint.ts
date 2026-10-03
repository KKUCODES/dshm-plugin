import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { computerEndpointViewSchema, computerEndpointWriteSchema, providerRouteSchema, type ComputerEndpointWrite } from '@dsh-mobile/protocol'

type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>
const namespace = 'llm-pi-ai'
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const identity = (provider: Provider) => Reflect.get(provider, symbols.original) ?? provider
const endpoint = (value: unknown) => {
  if (value === undefined) return null
  if (typeof value !== 'string') throw Error('invalid')
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw Error('invalid')
  return url
}
type Snapshot = { owner: string; route: string; provider: unknown; config: unknown; revision: number; expires: number }

/** 未配置baseURL时由原提供方模型目录解析；不假定所有模型共用默认站点。 */
export class ProviderEndpoint {
  private snapshots = new Map<string, Snapshot>()
  constructor(private settings: () => Provider | undefined) {}
  read(owner: string, rawRoute: string) {
    try {
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings()
      if (!provider) throw Error('unavailable')
      const view = provider.describe({ redactSecrets: true }).find(item => item.ns === namespace)
      const config = provider.get(namespace), profiles = record(record(config).providers)
      if (!view || !Object.hasOwn(profiles, route)) throw Error('unavailable')
      const current = endpoint(record(profiles[route]).baseURL)
      const inherited = endpoint(record(record(record(view.base).providers)[route]).baseURL)
      const user = record(record(record(view.user).providers)[route])
      const snapshot = randomUUID()
      const result = computerEndpointViewSchema.parse({ snapshot, target: { provider: route }, revision: view.revision,
        writable: provider.writable === true, applies: view.applies === 'restart' ? 'restart' : 'live', protocol: 'provider',
        origin: current?.origin ?? null, inheritedOrigin: inherited?.origin ?? null,
        customPath: !!current && current.pathname !== '/', overridden: Object.hasOwn(user, 'baseURL') })
      for (const [id, entry] of this.snapshots) if ((entry.owner === owner && entry.route === route) || entry.expires <= Date.now()) this.snapshots.delete(id)
      if (this.snapshots.size >= 128) throw Error('capacity')
      this.snapshots.set(snapshot, { owner, route, provider: identity(provider), config, revision: view.revision, expires: Date.now() + 300000 })
      return result
    } catch { throw Error('remote_endpoint_unavailable') }
  }
  async write(owner: string, raw: ComputerEndpointWrite, signal: AbortSignal) {
    const parsed = computerEndpointWriteSchema.safeParse(raw)
    if (!parsed.success || typeof parsed.data.target !== 'object') throw Error('remote_endpoint_invalid')
    const operation = parsed.data, route = parsed.data.target.provider, snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner || snapshot.route !== route) throw Error('remote_endpoint_stale')
    this.snapshots.delete(operation.snapshot)
    let provider: Provider | undefined, config: unknown
    try { provider = this.settings(); config = provider?.get(namespace) } catch { throw Error('remote_endpoint_stale') }
    if (!provider || snapshot.provider !== identity(provider) || config !== snapshot.config || snapshot.expires <= Date.now()
      || snapshot.revision !== operation.expectedRevision) throw Error('remote_endpoint_stale')
    if (!provider.writable) throw Error('remote_endpoint_read_only')
    signal.throwIfAborted()
    try {
      await provider.mutate(namespace, [operation.change.op === 'set'
        ? { op: 'set', path: ['providers', route, 'baseURL'], value: operation.change.value }
        : { op: 'unset', path: ['providers', route, 'baseURL'] }], operation.expectedRevision)
      signal.throwIfAborted()
      const current = this.settings()
      if (!current || identity(current) !== snapshot.provider) throw Error('changed')
      return this.read(owner, route)
    } catch (error) {
      if (record(error).code === 'SETTINGS_CONFLICT') throw Error('remote_endpoint_stale')
      throw Error('remote_endpoint_write_unconfirmed')
    }
  }
  dispose() { this.snapshots.clear() }
}
