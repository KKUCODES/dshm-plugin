import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { computerKeyTargetSchema, computerKeyWriteSchema, type ComputerKeyWrite } from '@dsh-mobile/protocol'

const defaultRef = 'DEEPSEEK_API_KEY'
type Provider = Pick<CredentialProvider, 'describe' | 'set' | 'unset'>
export interface ComputerKeyServices {
  credentials: () => Provider | undefined
  settings: () => Pick<SettingsProvider, 'get'> | undefined
  revision: () => number
  enrollmentRef: string
}
const identity = (provider: Provider) => Reflect.get(provider, symbols.original) ?? provider
type Target = ComputerKeyWrite['target']
const sameTarget = (left: Target, right: Target) => typeof left === 'object' && typeof right === 'object' ? left.provider === right.provider : left === right
type Snapshot = { owner: string; target: Target; provider: unknown; config: unknown; ref: string; revision: number; expires: number; writable: boolean }

/** 只写凭据服务；不调用 resolve，不返回来源或 provider 的错误文本。 */
export class ComputerKey {
  private snapshots = new Map<string, Snapshot>()
  private busy = false
  constructor(private services: ComputerKeyServices, private target?: 'web-search-deepseek') {}
  private current(target: Target = this.target) {
    const provider = this.services.credentials()
    const root = this.services.settings()?.get(typeof target === 'object' ? 'llm-pi-ai' : target ?? 'llm-deepseek')
    let config = root
    if (typeof target === 'object') {
      const profiles = root && typeof root === 'object' ? Reflect.get(root, 'providers') : undefined
      config = profiles && typeof profiles === 'object' && !Array.isArray(profiles) && Object.hasOwn(profiles, target.provider)
        ? Reflect.get(profiles, target.provider) : undefined
    }
    if (!provider || !config || typeof config !== 'object' || Array.isArray(config)) throw new Error('remote_key_unavailable')
    // 引用只能来自电脑已登记的模型/搜索配置；手机仍只提交一次性快照，不能选任意凭据。
    const configuredRef = Reflect.get(config, 'apiKeyEnv') ?? (typeof target === 'object' ? undefined : defaultRef)
    if (typeof configuredRef !== 'string' || configuredRef.toUpperCase() === this.services.enrollmentRef.toUpperCase()
      || configuredRef.toUpperCase().startsWith('DSH_MOBILE_')) throw new Error('remote_key_reference_unsupported')
    let ref: ReturnType<typeof credentialRef>
    try { ref = credentialRef(configuredRef) } catch { throw new Error('remote_key_reference_unsupported') }
    const literal = target === 'web-search-deepseek' && typeof Reflect.get(config, 'apiKey') === 'string' && Reflect.get(config, 'apiKey').length > 0
    return { provider, config, ref, literal, revision: this.services.revision() }
  }
  async read(owner: string, rawTarget: Target = this.target) {
    try {
      const target = rawTarget === undefined ? undefined : computerKeyTargetSchema.parse(rawTarget)
      const current = this.current(target), info = current.literal ? { configured: true, writable: false } : await current.provider.describe(current.ref), after = this.current(target)
      if (identity(current.provider) !== identity(after.provider) || current.config !== after.config || current.ref !== after.ref || current.revision !== after.revision)
        throw new Error('remote_key_stale')
      if (typeof info.configured !== 'boolean' || typeof info.writable !== 'boolean') throw new Error('remote_key_unavailable')
      for (const [id, item] of this.snapshots) if (item.owner === owner || item.expires <= Date.now()) this.snapshots.delete(id)
      if (this.snapshots.size >= 128) throw new Error('remote_key_busy')
      const snapshot = randomUUID()
      this.snapshots.set(snapshot, { owner, target, provider: identity(current.provider), config: current.config, ref: current.ref,
        revision: current.revision, expires: Date.now() + 300000, writable: info.writable })
      return { snapshot, provider: typeof target === 'object' ? target.provider : target ? 'deepseek-search' : 'deepseek-official',
        ...(typeof target === 'object' ? { target } : {}), configured: info.configured, writable: info.writable }
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      throw new Error(['remote_key_stale', 'remote_key_busy', 'remote_key_reference_unsupported'].includes(code) ? code : 'remote_key_unavailable')
    }
  }
  async write(owner: string, raw: ComputerKeyWrite, signal: AbortSignal) {
    const parsed = computerKeyWriteSchema.safeParse(raw)
    if (!parsed.success || (typeof parsed.data.target !== 'object' && parsed.data.target !== this.target)) throw new Error('remote_key_invalid')
    if (this.busy) throw new Error('remote_key_busy')
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner) throw new Error('remote_key_stale')
    if (!sameTarget(operation.target, snapshot.target)) throw new Error('remote_key_invalid')
    this.snapshots.delete(operation.snapshot)
    let current: ReturnType<ComputerKey['current']>
    try { current = this.current(operation.target) } catch { throw new Error('remote_key_stale') }
    if (snapshot.expires <= Date.now() || snapshot.config !== current.config || snapshot.provider !== identity(current.provider)
      || snapshot.ref !== current.ref || snapshot.revision !== current.revision) throw new Error('remote_key_stale')
    if (!snapshot.writable) throw new Error('remote_key_read_only')
    signal.throwIfAborted()
    this.busy = true
    try {
      // 原 provider 负责只读来源遮蔽与持久化；没有跨其他客户端的原子 CAS，不能声称有此保证。
      if (operation.change.op === 'set') await current.provider.set(current.ref, operation.change.value)
      else await current.provider.unset(current.ref)
      signal.throwIfAborted()
      const after = this.current(operation.target)
      if (snapshot.config !== after.config || snapshot.ref !== after.ref || snapshot.provider !== identity(after.provider)) throw new Error('changed')
      this.snapshots.clear()
      return await this.read(owner, operation.target)
    } catch { throw new Error('remote_key_write_unconfirmed') }
    finally { this.busy = false }
  }
  dispose() { this.snapshots.clear() }
}
