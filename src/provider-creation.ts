import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import { providerProtocolChoices } from './provider-protocol.js'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { providerCreationViewSchema, providerCreationWriteSchema, type ProviderCreationWrite } from '@dsh-mobile/protocol'

type Settings = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>
export type ProviderDirectory = Pick<LlmRuntime, 'listProviders' | 'listConfigurableProviders'>
const ns = 'llm-pi-ai'
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const identity = (value: object) => Reflect.get(value, symbols.original) ?? value
type View = ReturnType<typeof providerCreationViewSchema.parse>
type Snapshot = { owner: string; settings: unknown; runtime: unknown; config: unknown; directory: string; view: View; expires: number }

/** 原目录决定内置路由，原schema决定协议；创建不接受任意配置或凭据引用。 */
export class ProviderCreation {
  private snapshots = new Map<string, Snapshot>()
  constructor(private settings: () => Settings | undefined, private runtime: () => ProviderDirectory | undefined, private keyAvailable: () => boolean) {}
  private current() {
    const settings = this.settings(), runtime = this.runtime()
    if (!settings || !runtime) throw Error('remote_settings_unavailable')
    const descriptor = settings.describe({ redactSecrets: true }).find(item => item.ns === ns)
    if (!descriptor) throw Error('remote_settings_unavailable')
    const config = settings.get(ns), profiles = record(record(config).providers)
    const directory = runtime.listConfigurableProviders(), registered = runtime.listProviders()
    // 与原ui-settings的rehydrate/nodeAtPath相同，只读取声明的协议枚举。
    const protocols = providerProtocolChoices(descriptor.schema)
    const available = directory.filter(item => item.settingsNs === ns && item.settingsPath.length === 2 && item.settingsPath[0] === 'providers'
      && item.settingsPath[1] === item.provider && !Object.hasOwn(profiles, item.provider)).map(item => ({ provider: item.provider, name: item.displayName }))
    const taken = [...new Set([...Object.keys(profiles), ...directory.map(item => item.provider), ...registered.map(item => item.id)])].sort()
    return { settings, runtime, descriptor, config, protocols, available, taken, directory: JSON.stringify({ available, taken }) }
  }
  read(owner: string) {
    try {
      const current = this.current(), snapshot = randomUUID()
      const result = providerCreationViewSchema.parse({ snapshot, revision: current.descriptor.revision, writable: current.settings.writable === true,
        applies: current.descriptor.applies === 'restart' ? 'restart' : 'live', keyAvailable: this.keyAvailable(),
        protocols: current.protocols, available: current.available, taken: current.taken })
      for (const [id, value] of this.snapshots) if (value.owner === owner || value.expires <= Date.now()) this.snapshots.delete(id)
      if (this.snapshots.size >= 128) throw Error('remote_settings_busy')
      this.snapshots.set(snapshot, { owner, settings: identity(current.settings), runtime: identity(current.runtime), config: current.config,
        directory: current.directory, view: result, expires: Date.now() + 300000 })
      return result
    } catch (error) { throw Error(error instanceof Error && error.message === 'remote_settings_busy' ? error.message : 'remote_settings_unavailable') }
  }
  async create(owner: string, raw: ProviderCreationWrite, signal: AbortSignal) {
    const parsed = providerCreationWriteSchema.safeParse(raw)
    if (!parsed.success) throw Error('remote_settings_invalid')
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner) throw Error('remote_settings_stale')
    this.snapshots.delete(operation.snapshot)
    let current: ReturnType<ProviderCreation['current']>
    try { current = this.current() } catch { throw Error('remote_settings_stale') }
    if (snapshot.expires <= Date.now() || snapshot.view.revision !== operation.expectedRevision
      || snapshot.config !== current.config || snapshot.settings !== identity(current.settings) || snapshot.runtime !== identity(current.runtime)
      || snapshot.directory !== current.directory) throw Error('remote_settings_stale')
    if (!current.settings.writable) throw Error('remote_settings_read_only')
    if (operation.kind === 'catalog' ? !current.available.some(row => row.provider === operation.provider)
      : current.taken.includes(operation.provider) || !current.protocols.includes(operation.api)) throw Error('remote_settings_invalid')
    if (operation.useKey && !this.keyAvailable()) throw Error('remote_settings_unavailable')
    signal.throwIfAborted()
    const profile = { ...(operation.name ? { displayName: operation.name } : {}),
      // 独立随机引用避免新建路由误用电脑中同名环境凭据；Key内容仅走既有原生窗口。
      ...(operation.useKey ? { apiKeyEnv: `DSHM_PROVIDER_${randomUUID().replaceAll('-', '').toUpperCase()}_API_KEY` } : {}),
      ...(operation.kind === 'custom' ? { api: operation.api, baseURL: operation.baseURL,
        models: operation.models.map(row => typeof row === 'string' ? { id: row } : { ...row }) } : {}) }
    try {
      await current.settings.mutate(ns, [{ op: 'set', path: ['providers', operation.provider], value: profile }], operation.expectedRevision)
      signal.throwIfAborted()
      const after = this.settings()
      if (!after || identity(after) !== snapshot.settings || !Object.hasOwn(record(record(after.get(ns)).providers), operation.provider)) throw Error('changed')
      return { ...snapshot.view, writable: false, created: { provider: operation.provider, useKey: operation.useKey } }
    } catch (error) {
      if (record(error).code === 'SETTINGS_CONFLICT') throw Error('remote_settings_stale')
      throw Error('remote_settings_write_unconfirmed')
    }
  }
  dispose() { this.snapshots.clear() }
}
