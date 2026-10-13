import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import type { LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek'
import { DEEPSEEK_DEFAULT_BASE_URL } from '@deepseek-ai/dsh-web-search-deepseek'
import { computerEndpointWriteSchema, type ComputerEndpointWrite } from '@dsh-mobile/protocol'

type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>
const identity = (value: Provider) => Reflect.get(value, symbols.original) ?? value
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
type Snapshot = { owner: string; provider: unknown; config: unknown; revision: number; expires: number }

/** 用原 DeepSeek 解析器处理环境回退；原设置服务负责版本校验及逐字段持久化。 */
export class ComputerEndpoint {
  private snapshots = new Map<string, Snapshot>()
  constructor(private provider: () => Provider | undefined, private environment: () => LaunchEnvironmentSnapshot, private target?: 'web-search-deepseek') {}
  private get namespace() { return this.target ?? 'llm-deepseek' }
  private options(raw: Record<string, unknown>, environment: LaunchEnvironmentSnapshot) {
    // 原搜索插件 resolveOptions 的固定优先级；搜索从不继承 DEEPSEEK_BASE_URL。
    if (this.target) return { protocol: 'messages' as const,
      baseURL: (raw.baseURL ?? environment.get('DEEPSEEK_SEARCH_BASE_URL')?.value ?? DEEPSEEK_DEFAULT_BASE_URL) as string }
    const options = resolveAdapterOptions(raw as Parameters<typeof resolveAdapterOptions>[0], environment)
    // 新版解析器固定使用 Messages 协议；旧版返回显式 protocol。
    return { ...options, protocol: 'protocol' in options ? options.protocol : 'messages' as const }
  }
  read(owner: string) {
    try {
      const provider = this.provider()
      if (!provider) throw new Error('unavailable')
      const view = provider.describe({ redactSecrets: true }).find(item => item.ns === this.namespace)
      if (!view || !Number.isSafeInteger(view.revision) || view.revision < 0) throw new Error('invalid')
      const config = provider.get(this.namespace), raw = record(config), environment = this.environment()
      const options = this.options(raw, environment)
      const inherited = this.options({ ...raw, baseURL: record(view.base).baseURL }, environment)
      const url = new URL(options.baseURL), fallback = new URL(inherited.baseURL)
      if (![url, fallback].every(item => ['https:', 'http:'].includes(item.protocol))) throw new Error('invalid')
      for (const [id, item] of this.snapshots) if (item.owner === owner || item.expires <= Date.now()) this.snapshots.delete(id)
      if (this.snapshots.size >= 128) throw new Error('capacity')
      const snapshot = randomUUID()
      this.snapshots.set(snapshot, { owner, provider: identity(provider), config, revision: view.revision, expires: Date.now() + 300000 })
      return { snapshot, ...(this.target ? { target: this.target } : {}), revision: view.revision, writable: provider.writable === true,
        applies: view.applies === 'restart' ? 'restart' as const : 'live' as const, protocol: options.protocol,
        origin: url.origin, inheritedOrigin: fallback.origin, customPath: url.pathname !== '/', overridden: Object.hasOwn(record(view.user), 'baseURL') }
    } catch { throw new Error('remote_endpoint_unavailable') }
  }
  async write(owner: string, raw: ComputerEndpointWrite, signal: AbortSignal) {
    const parsed = computerEndpointWriteSchema.safeParse(raw)
    if (!parsed.success || parsed.data.target !== this.target) throw new Error('remote_endpoint_invalid')
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner) throw new Error('remote_endpoint_stale')
    this.snapshots.delete(operation.snapshot)
    let provider: Provider | undefined
    try { provider = this.provider() } catch { throw new Error('remote_endpoint_stale') }
    if (!provider || snapshot.expires <= Date.now() || snapshot.provider !== identity(provider) || snapshot.config !== provider.get(this.namespace)
      || snapshot.revision !== operation.expectedRevision) throw new Error('remote_endpoint_stale')
    if (!provider.writable) throw new Error('remote_endpoint_read_only')
    signal.throwIfAborted()
    try {
      await provider.mutate(this.namespace, [operation.change.op === 'set'
        ? { op: 'set', path: ['baseURL'], value: operation.change.value } : { op: 'unset', path: ['baseURL'] }], operation.expectedRevision)
      signal.throwIfAborted()
      if (identity(this.provider()!) !== snapshot.provider) throw new Error('changed')
      return this.read(owner)
    } catch (error) {
      if (record(error).code === 'SETTINGS_CONFLICT') throw new Error('remote_endpoint_stale')
      throw new Error('remote_endpoint_write_unconfirmed')
    }
  }
  dispose() { this.snapshots.clear() }
}
