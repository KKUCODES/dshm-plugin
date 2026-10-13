import { symbols } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { providerCardViewSchema } from '@dsh-mobile/protocol'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import type { ProviderDirectory } from './provider-creation.js'
import type { ComputerKeyServices } from './computer-key.js'

type Services = {
  settings: () => Pick<SettingsProvider, 'get' | 'describe'> | undefined
  directory: () => ProviderDirectory | undefined
  key: ComputerKeyServices | undefined
}
const identity = (value: object) => Reflect.get(value, symbols.original) ?? value
const child = (value: unknown, key: string): unknown => value !== null && typeof value === 'object'
  && Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined

/** 目录决定配置坐标；手机只能选择路由，不能提供 namespace/path/凭据引用。 */
export async function readProviderCard(services: Services, route: string, signal: AbortSignal) {
  const capture = () => {
    const settings = services.settings(), directory = services.directory(), credentials = services.key?.credentials()
    if (!settings || !directory || !credentials) throw Error('remote_settings_unavailable')
    const entries = directory.listConfigurableProviders().filter(row => row.provider === route)
    if (entries.length !== 1) throw Error('remote_settings_unavailable')
    const row = entries[0]!
    const provider = providerCardViewSchema.shape.provider.parse({ provider: row.provider, displayName: row.displayName,
      settingsNs: row.settingsNs, settingsPath: [...row.settingsPath],
      active: directory.listProviders().some(value => value.id === route),
      ...(row.declared === undefined ? {} : { declared: row.declared }),
      ...(row.error === undefined ? {} : { error: '提供方暂不可用' }) })
    const served = settings.describe({ redactSecrets: true }).some(view => view.ns === provider.settingsNs)
    const config = served ? settings.get(provider.settingsNs) : undefined
    const profile = provider.settingsPath.reduce<unknown>(child, config)
    const configured = served && (provider.settingsPath.length === 0 || profile !== undefined)
    const named = child(profile, 'apiKeyEnv')
    // 与原 ModelsSettingsStore 相同：无命名引用时只查询路由约定槽位的“已配置”状态。
    const refName = typeof named === 'string' && named.length > 0 ? named : `${route.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
    if (refName.toUpperCase().startsWith('DSH_MOBILE_') || refName.toUpperCase() === services.key?.enrollmentRef.toUpperCase())
      throw Error('remote_settings_unavailable')
    return { settings: identity(settings), directory: identity(directory), credentials, config, provider, configured,
      ref: credentialRef(refName), revision: services.key?.revision() }
  }
  try {
    signal.throwIfAborted()
    const before = capture(), info = await before.credentials.describe(before.ref)
    signal.throwIfAborted()
    const after = capture()
    if (before.settings !== after.settings || before.directory !== after.directory
      || identity(before.credentials) !== identity(after.credentials) || before.config !== after.config || before.ref !== after.ref
      || before.revision !== after.revision || JSON.stringify(before.provider) !== JSON.stringify(after.provider))
      throw Error('remote_settings_stale')
    return providerCardViewSchema.parse({ provider: before.provider, configured: before.configured, keyConfigured: info.configured })
  } catch (error) {
    signal.throwIfAborted()
    throw Error(error instanceof Error && error.message === 'remote_settings_stale' ? error.message : 'remote_settings_unavailable')
  }
}
