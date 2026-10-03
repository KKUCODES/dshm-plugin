import { symbols } from '@deepseek-ai/cordis'

/** 兼容服务只供 Host 使用，页面不能取得句柄或指定所属连接。 */
export interface CordisInspectService {
  readonly dshmClientManifestScopesVersion: 1
  createClientManifestScope(): { run<T>(callback: () => T): T; dispose(): void }
}

type Binding = {
  closed: boolean
  service?: CordisInspectService
  scope?: ReturnType<CordisInspectService['createClientManifestScope']>
}

// Cordis 每次 get 都可创建新代理；比较原服务身份，调用仍保留上下文代理。
function sameService(left: CordisInspectService | undefined, right: CordisInspectService | undefined) {
  const identity = (value: CordisInspectService | undefined) => value
    ? (value as CordisInspectService & { [symbols.original]?: object })[symbols.original] ?? value : undefined
  return identity(left) === identity(right)
}

export function cordisInspectService(value: unknown, runner: unknown): CordisInspectService | undefined {
  if (runner === null || typeof runner !== 'object' || (runner as { dshmRemoteVersion?: unknown }).dshmRemoteVersion !== 1) return undefined
  if (value === null || typeof value !== 'object') return undefined
  const service = value as Partial<CordisInspectService>
  return service.dshmClientManifestScopesVersion === 1 && typeof service.createClientManifestScope === 'function'
    ? service as CordisInspectService : undefined
}

/** 生命周期来自已鉴权连接的原 $events；重新订阅取代旧代，旧清理不影响新代。 */
export class CordisConnections {
  private readonly bindings = new Map<string, Binding>()
  constructor(private readonly current: () => CordisInspectService | undefined) {}

  get available() { return this.current() !== undefined }

  attach(owner: string): () => void {
    const previous = this.bindings.get(owner)
    if (previous) this.close(previous)
    const binding: Binding = { closed: false }
    this.bindings.set(owner, binding)
    return () => {
      this.close(binding)
      if (this.bindings.get(owner) === binding) this.bindings.delete(owner)
    }
  }

  async run<T>(owner: string, signal: AbortSignal, callback: () => Promise<T>): Promise<T> {
    signal.throwIfAborted()
    const binding = this.bindings.get(owner)
    if (!binding || binding.closed) throw new Error('remote_cordis_connection_required')
    const service = this.current()
    if (!service) throw new Error('remote_cordis_unavailable')
    if (!sameService(binding.service, service)) {
      binding.scope?.dispose()
      binding.scope = service.createClientManifestScope()
      binding.service = service
    }
    const scope = binding.scope!
    const result = await scope.run(callback)
    signal.throwIfAborted()
    if (binding.closed || this.bindings.get(owner) !== binding || binding.scope !== scope || !sameService(this.current(), service))
      throw new Error('remote_cordis_connection_expired')
    return result
  }

  private close(binding: Binding) {
    if (binding.closed) return
    binding.closed = true
    binding.scope?.dispose()
  }

  dispose() {
    for (const binding of this.bindings.values()) this.close(binding)
    this.bindings.clear()
  }
}
