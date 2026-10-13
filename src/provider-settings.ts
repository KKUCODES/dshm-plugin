import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import type { ProviderDirectory } from './provider-creation.js'
import { providerProtocolChoices } from './provider-protocol.js'
import { providerRouteSchema, providerSettingValues, providerSettingsViewSchema, providerDirectorySchema,
  providerSettingsWriteSchema, providerKeySetupSchema, modelCompatKeys, type ProviderSettingsWrite, type ProviderKeySetup } from '@dsh-mobile/protocol'

const namespace = 'llm-pi-ai'
type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const identity = (provider: object) => Reflect.get(provider, symbols.original) ?? provider
type Snapshot = { owner: string; route: string; provider: unknown; config: unknown; revision: number; expires: number;
  protocol?: { runtime: unknown; choices: string[] } }
const declaredRoute = (runtime: ProviderDirectory, route: string) => runtime.listConfigurableProviders().some(row =>
  row.provider === route && row.settingsNs === namespace && row.settingsPath.length === 2
  && row.settingsPath[0] === 'providers' && row.settingsPath[1] === route && row.declared === true)

/** 只修改既有路由的已审阅字段，不能经此入口创建路由或覆盖整个配置树。 */
export class ProviderSettings {
  private snapshots = new Map<string, Snapshot>()
  constructor(private settings: () => Provider | undefined, private keyAvailable: () => boolean = () => false,
    private directory: () => ProviderDirectory | undefined = () => undefined) {}
  list() {
    try {
      const provider = this.settings()
      if (!provider) throw Error('remote_settings_unavailable')
      const profiles = object(object(provider.get(namespace)).providers)
      return providerDirectorySchema.parse({ providers: Object.entries(profiles).map(([route, profile]) => ({
        provider: route, name: typeof object(profile).displayName === 'string' ? object(profile).displayName : route,
      })) })
    } catch { throw Error('remote_settings_unavailable') }
  }
  read(owner: string, rawRoute: string) {
    try {
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings()
      if (!provider) throw Error('remote_settings_unavailable')
      const view = provider.describe({ redactSecrets: true }).find(view => view.ns === namespace)
      const profiles = object(object(view?.value).providers)
      if (!view || !Object.hasOwn(profiles, route)) throw Error('remote_settings_unavailable')
      const profile = object(profiles[route]), user = object(object(object(view.user).providers)[route])
      const snapshot = randomUUID()
      const runtime = this.directory()
      const choices = runtime && declaredRoute(runtime, route) ? providerProtocolChoices(view.schema) : []
      const compat = (value: unknown) => Object.fromEntries(Object.entries(object(value)).filter(([key]) => modelCompatKeys.includes(key)))
      const result = providerSettingsViewSchema.parse({ provider: route, snapshot, revision: view.revision,
        writable: provider.writable === true, applies: view.applies === 'restart' ? 'restart' : 'live',
        keySetupAvailable: this.keyAvailable() && object(object(object(provider.get(namespace)).providers)[route]).apiKeyEnv === undefined,
        ...(choices.length ? { protocol: { choices, ...(typeof profile.api === 'string' ? { value: profile.api } : {}) } } : {}),
        compat: { effective: compat(profile.compat), overrides: compat(user.compat) },
        fields: Object.entries(providerSettingValues).map(([key, schema]) => ({ key,
          ...(profile[key] === undefined ? {} : { value: schema.parse(profile[key]) }), overridden: Object.hasOwn(user, key),
        })),
      })
      for (const [id, value] of this.snapshots) if ((value.owner === owner && value.route === route) || value.expires <= Date.now()) this.snapshots.delete(id)
      if (this.snapshots.size >= 128) throw Error('remote_settings_busy')
      this.snapshots.set(snapshot, { owner, route, provider: identity(provider), config: provider.get(namespace),
        revision: view.revision, expires: Date.now() + 300000,
        ...(runtime && choices.length ? { protocol: { runtime: identity(runtime), choices } } : {}) })
      return result
    } catch (error) { throw Error(error instanceof Error && error.message === 'remote_settings_busy' ? error.message : 'remote_settings_unavailable') }
  }
  async write(owner: string, raw: ProviderSettingsWrite | ProviderKeySetup, signal: AbortSignal) {
    const parsed = raw.method === 'remote.providerKeySetup' ? providerKeySetupSchema.safeParse(raw) : providerSettingsWriteSchema.safeParse(raw)
    if (!parsed.success) throw Error('remote_settings_invalid')
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner || snapshot.route !== operation.provider) throw Error('remote_settings_stale')
    this.snapshots.delete(operation.snapshot)
    let provider: Provider | undefined
    let config: unknown
    try { provider = this.settings(); config = provider?.get(namespace) } catch { throw Error('remote_settings_unavailable') }
    if (!provider || identity(provider) !== snapshot.provider || snapshot.expires <= Date.now()
      || snapshot.revision !== operation.expectedRevision || config !== snapshot.config) throw Error('remote_settings_stale')
    if (!provider.writable) throw Error('remote_settings_read_only')
    if (operation.method === 'remote.providerSettingsWrite' && operation.protocolChange) {
      const runtime = this.directory()
      if (!snapshot.protocol || !runtime || identity(runtime) !== snapshot.protocol.runtime || !declaredRoute(runtime, snapshot.route))
        throw Error('remote_settings_stale')
      const descriptor = provider.describe({ redactSecrets: true }).find(view => view.ns === namespace)
      if (!descriptor || JSON.stringify(providerProtocolChoices(descriptor.schema)) !== JSON.stringify(snapshot.protocol.choices))
        throw Error('remote_settings_stale')
      if (!snapshot.protocol.choices.includes(operation.protocolChange.value)) throw Error('remote_settings_invalid')
    }
    const setup = operation.method === 'remote.providerKeySetup'
    if (setup && (!this.keyAvailable() || object(object(object(config).providers)[snapshot.route]).apiKeyEnv !== undefined))
      throw Error('remote_settings_stale')
    signal.throwIfAborted()
    try {
      // 仅为无引用的既有路由建立独立槽位，不接受手机指定引用，也不替换已有共享Key。
      const edits: Array<Parameters<Provider['mutate']>[1][number]> = operation.method === 'remote.providerKeySetup'
        ? [{ op: 'set', path: ['providers', snapshot.route, 'apiKeyEnv'], value: `DSHM_PROVIDER_${randomUUID().replaceAll('-', '').toUpperCase()}_API_KEY` }]
        : operation.edits.map(edit => edit.op === 'set'
        ? { op: 'set', path: ['providers', snapshot.route, edit.key], value: edit.value }
        : { op: 'unset', path: ['providers', snapshot.route, edit.key] })
      // 按已公开字段修改用户层，保留基础层继承、模型覆盖与未来未知选项。
      if (operation.method === 'remote.providerSettingsWrite' && operation.compat !== undefined) {
        const values = object(operation.compat)
        for (const key of modelCompatKeys) edits.push(values[key] === undefined
          ? { op: 'unset', path: ['providers', snapshot.route, 'compat', key] }
          : { op: 'set', path: ['providers', snapshot.route, 'compat', key], value: values[key] })
      }
      if (operation.method === 'remote.providerSettingsWrite' && operation.protocolChange)
        edits.push({ op: 'set', path: ['providers', snapshot.route, 'api'], value: operation.protocolChange.value })
      await provider.mutate(namespace, edits, snapshot.revision)
    } catch (error) {
      if (object(error).code === 'SETTINGS_CONFLICT') throw Error('remote_settings_stale')
      throw Error('remote_settings_write_unconfirmed')
    }
    signal.throwIfAborted()
    try {
      const current = this.settings()
      if (!current || identity(current) !== snapshot.provider) throw Error('changed')
      return this.read(owner, snapshot.route)
    } catch { throw Error('remote_settings_write_unconfirmed') }
  }
  dispose() { this.snapshots.clear() }
}
