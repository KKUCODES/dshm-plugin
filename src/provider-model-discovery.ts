import { symbols } from '@deepseek-ai/cordis'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import type { LlmRuntime, LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm'
import { providerRouteSchema, providerModelsDiscoveryViewSchema } from '@dsh-mobile/protocol'

type Settings = Pick<SettingsProvider, 'get'>
export type ModelDiscovery = Pick<LlmRuntime, 'discoverModels'>
const namespace = 'llm-pi-ai'
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const identity = (service: object) => Reflect.get(service, symbols.original) ?? service

/** 仅读取电脑已保存路由；不接受手机传入地址或凭据，不改设置。 */
export async function discoverProviderModels(rawRoute: string, settings: () => Settings | undefined,
  runtime: () => ModelDiscovery | undefined, signal: AbortSignal) {
  try {
    const route = providerRouteSchema.parse(rawRoute), provider = settings(), llm = runtime()
    if (!provider || !llm) throw Error('remote_settings_unavailable')
    const config = provider.get(namespace), profiles = object(object(config).providers)
    if (!Object.hasOwn(profiles, route)) throw Error('remote_settings_unavailable')
    const profile = object(profiles[route])
    const request: LlmModelDiscoveryRequest = { provider: route }
    if (typeof profile.baseURL === 'string') request.baseURL = profile.baseURL
    if (typeof profile.api === 'string') request.api = profile.api
    signal.throwIfAborted()
    const rows = await llm.discoverModels(namespace, request, AbortSignal.any([signal, AbortSignal.timeout(20000)]))
    signal.throwIfAborted()
    const latest = settings(), currentRuntime = runtime()
    if (!latest || !currentRuntime || identity(latest) !== identity(provider) || latest.get(namespace) !== config
      || identity(currentRuntime) !== identity(llm)) throw Error('remote_settings_stale')
    // 原服务输出也只投影公开候选字段；错误不得带回端点、headers或认证内容。
    return providerModelsDiscoveryViewSchema.parse({ provider: route, rows: rows.map(row => ({ id: row.id,
      ...(row.name === undefined ? {} : { name: row.name }),
      ...(row.contextWindow === undefined ? {} : { contextWindow: row.contextWindow }),
      ...(row.maxTokens === undefined ? {} : { maxTokens: row.maxTokens }),
      ...(row.inputModalities === undefined ? {} : { inputModalities: row.inputModalities }),
    })) })
  } catch (error) {
    signal.throwIfAborted()
    if (error instanceof Error && ['remote_settings_unavailable', 'remote_settings_stale'].includes(error.message)) throw error
    throw Error('remote_model_discovery_failed')
  }
}
