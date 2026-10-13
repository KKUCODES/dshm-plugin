import { symbols } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import type { ProviderDirectory } from './provider-creation.js'
import type { ComputerKeyServices } from './computer-key.js'

type Services = {
  settings: () => Pick<SettingsProvider, 'get' | 'describe' | 'writable'> | undefined
  directory: () => ProviderDirectory | undefined
  key: ComputerKeyServices | undefined
  accountAvailable?: (signal: AbortSignal) => Promise<boolean>
}
const identity = (value: object) => Reflect.get(value, symbols.original) ?? value
const child = (value: unknown, key: string): unknown => value !== null && typeof value === 'object'
  && Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined
type Result = { kind: 'provider-ready' | 'adapter-absent' | 'credential-missing' | 'unavailable' }

/** 对齐原ModelsSettingsStore/providerUsable：任何活跃且满足其认证方式的路由都可结束引导。 */
export async function readModelReadiness(services: Services, signal: AbortSignal): Promise<Result> {
  const capture = () => {
    const settings = services.settings(), directory = services.directory(), credentials = services.key?.credentials()
    if (!settings || !directory || !credentials) throw Error('unavailable')
    const active = directory.listProviders(), declared = directory.listConfigurableProviders()
    const served = new Set<string>(settings.describe({ redactSecrets: true }).map(view => view.ns))
    const configs = new Map(declared.map(row => [row.settingsNs, served.has(row.settingsNs) ? settings.get(row.settingsNs) : undefined]))
    const rows = declared.map(row => {
      const profile = row.settingsPath.reduce<unknown>(child, configs.get(row.settingsNs))
      const named = child(profile, 'apiKeyEnv')
      return { ...row, active: active.some(route => route.id === row.provider),
        ref: typeof named === 'string' && named.length > 0 ? named : undefined }
    })
    // 原目录合并也包含没有设置坐标的活跃路由，这类路由自行负责认证。
    const unmanaged = active.some(route => !declared.some(row => row.provider === route.id))
    return { settings: identity(settings), directory: identity(directory), credentials, configs, rows, unmanaged,
      writable: settings.writable === true, revision: services.key?.revision(), directoryState: JSON.stringify([active, declared]) }
  }
  try {
    signal.throwIfAborted()
    const before = capture()
    // 新版账号路由没有 apiKeyEnv；是否可用须由原账号适配器确认，不能当成免认证路由。
    let accountReady = false
    if (before.rows.some(row => row.active && row.provider === 'deepseek-account')) {
      try { accountReady = await services.accountAvailable?.(signal) === true } catch { signal.throwIfAborted() }
    }
    const refs = [...new Set(before.rows.filter(row => row.provider !== 'deepseek-account')
      .map(row => row.ref ?? `${row.provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`))]
    let statuses = new Map<string, { configured: boolean; writable: boolean }>(), failed = false
    try {
      // 与原批量describe一致：任一读取失败则整个凭据补充不可用；无认证路由仍可用。
      const values = await Promise.all(refs.map(async name => {
        if (name.toUpperCase().startsWith('DSH_MOBILE_') || name.toUpperCase() === services.key?.enrollmentRef.toUpperCase()) throw Error('reserved')
        return [name, await before.credentials.describe(credentialRef(name))] as const
      }))
      statuses = new Map(values)
    } catch { failed = true }
    signal.throwIfAborted()
    const after = capture()
    if (before.settings !== after.settings || before.directory !== after.directory
      || identity(before.credentials) !== identity(after.credentials) || before.revision !== after.revision
      || before.writable !== after.writable || before.directoryState !== after.directoryState
      || before.configs.size !== after.configs.size || [...before.configs].some(([ns, config]) => after.configs.get(ns) !== config))
      throw Error('remote_settings_stale')
    if (before.unmanaged || before.rows.some(row => row.active && (row.provider === 'deepseek-account' ? accountReady
      : row.ref === undefined || statuses.get(row.ref)?.configured === true)))
      return { kind: 'provider-ready' }
    const official = before.rows.find(row => row.provider === 'deepseek-official' && row.settingsNs === 'llm-deepseek' && row.settingsPath.length === 0)
    if (!official) return { kind: 'adapter-absent' }
    if (!official.active || failed || !official.ref || !before.writable || statuses.get(official.ref)?.writable !== true)
      return { kind: 'unavailable' }
    return { kind: 'credential-missing' }
  } catch (error) {
    signal.throwIfAborted()
    if (error instanceof Error && error.message === 'remote_settings_stale') throw error
    return { kind: 'unavailable' }
  }
}
