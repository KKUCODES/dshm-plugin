import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import type { SettingsProvider } from '@deepseek-ai/dsh-settings'
import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { modelProbePrepareSchema, modelProbeExecuteSchema, modelProbePreparedSchema, modelProbeResultSchema,
  type ModelProbePrepared } from '@dsh-mobile/protocol'

type Settings = Pick<SettingsProvider, 'get' | 'describe'>
const identity = (value: object) => Reflect.get(value, symbols.original) ?? value
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export interface ModelProbeServices {
  settings: () => Settings | undefined
  runtime: () => Pick<LlmRuntime, 'discoverModels'> | undefined
  credentialRevision: () => number
  permitted: (owner: string) => boolean
}
type State = { settings: unknown; runtime: unknown; config: unknown; revision: number; credentials: number }
type Prepared = { owner: string; view: ModelProbePrepared; state: State }

/** 一次性准备结果仅保存在Host；不保存临时Key，不返回底层错误正文。 */
export class ModelProbe {
  private snapshots = new Map<string, Prepared>()
  private active = new Map<string, AbortController>()
  private disposed = false
  constructor(private services: ModelProbeServices, private now = Date.now) {}
  async available() {
    const runtime = this.services.runtime(), settings = this.services.settings();
    const revision = this.services.credentialRevision()
    if (this.disposed || !runtime || !settings || !Number.isSafeInteger(revision) || revision < 0) return false
    // 原Runtime先检查注册，再拒绝空目标；此检查不会进入发现器或发网络请求。
    try { await runtime.discoverModels('dshm.pi-ai-endpoint-v2', {}); return false }
    catch (error) {
      return !this.disposed && identity(runtime) === identity(this.services.runtime() ?? {})
        && identity(settings) === identity(this.services.settings() ?? {}) && record(error).code === 'INVALID_DISCOVERY'
    }
  }
  private current(owner: string) {
    if (this.disposed || !this.services.permitted(owner)) throw Error('remote_management_required')
    const settings = this.services.settings(), runtime = this.services.runtime()
    if (!settings || !runtime) throw Error('remote_settings_unavailable')
    const descriptor = settings.describe({ redactSecrets: true }).find(item => item.ns === 'llm-pi-ai')
    const credentials = this.services.credentialRevision()
    if (!descriptor || !Number.isSafeInteger(descriptor.revision) || descriptor.revision < 0
      || !Number.isSafeInteger(credentials) || credentials < 0) throw Error('remote_settings_unavailable')
    return { settings: identity(settings), runtime: identity(runtime), config: settings.get('llm-pi-ai'), revision: descriptor.revision, credentials }
  }
  prepare(owner: string, raw: unknown) {
    const request = modelProbePrepareSchema.safeParse(raw)
    if (!request.success) throw Error('remote_model_probe_invalid')
    const state = this.current(owner), { baseURL, api, authentication } = request.data
    if (authentication.mode === 'stored' && !Object.hasOwn(record(record(state.config).providers), authentication.provider)) throw Error('remote_settings_unavailable')
    if (this.active.has(owner)) throw Error('remote_settings_busy')
    for (const [id, entry] of this.snapshots) if (entry.owner === owner || entry.view.expiresAt <= this.now()) this.snapshots.delete(id)
    if (this.snapshots.size >= 128) throw Error('remote_settings_busy')
    const view = modelProbePreparedSchema.parse({ snapshot: randomUUID(), expiresAt: this.now() + 300000, baseURL, api, authentication })
    this.snapshots.set(view.snapshot, { owner, state, view })
    return modelProbePreparedSchema.parse(view)
  }
  private validate(owner: string, prepared: Prepared) {
    const current = this.current(owner)
    if (prepared.view.expiresAt <= this.now() || (Object.keys(current) as Array<keyof State>).some(key => current[key] !== prepared.state[key])) throw Error('remote_settings_stale')
  }
  async execute(owner: string, raw: unknown, signal: AbortSignal) {
    const parsed = modelProbeExecuteSchema.safeParse(raw)
    if (!parsed.success) throw Error('remote_model_probe_invalid')
    const operation = parsed.data, prepared = this.snapshots.get(operation.snapshot)
    if (!prepared || prepared.owner !== owner) throw Error('remote_settings_stale')
    this.snapshots.delete(operation.snapshot)
    if (operation.mode !== prepared.view.authentication.mode) throw Error('remote_model_probe_invalid')
    this.validate(owner, prepared); signal.throwIfAborted()
    if (this.active.has(owner)) throw Error('remote_settings_busy')
    const controller = new AbortController(), fused = AbortSignal.any([signal, controller.signal, AbortSignal.timeout(20000)])
    this.active.set(owner, controller)
    try {
      const { baseURL, api, authentication } = prepared.view
      const rows = await this.services.runtime()!.discoverModels('dshm.pi-ai-endpoint-v2', {
        baseURL, api,
        ...(authentication.mode === 'stored' ? { provider: authentication.provider } : {}),
        ...(operation.mode === 'temporary' ? { apiKey: operation.apiKey } : {}),
      }, fused)
      fused.throwIfAborted(); this.validate(owner, prepared)
      return modelProbeResultSchema.parse({ rows: rows.map(row => ({ id: row.id,
        ...(row.name === undefined ? {} : { name: row.name }),
        ...(row.contextWindow === undefined ? {} : { contextWindow: row.contextWindow }),
        ...(row.maxTokens === undefined ? {} : { maxTokens: row.maxTokens }),
        ...(row.inputModalities === undefined ? {} : { inputModalities: row.inputModalities }),
      })) })
    } catch (error) {
      signal.throwIfAborted()
      if (error instanceof Error && ['remote_settings_stale', 'remote_management_required'].includes(error.message)) throw error
      throw Error('remote_model_discovery_failed')
    } finally { this.active.delete(owner) }
  }
  invalidate(owner: string) {
    for (const [id, entry] of this.snapshots) if (entry.owner === owner) this.snapshots.delete(id)
    this.active.get(owner)?.abort()
  }
  dispose() {
    this.disposed = true; this.snapshots.clear()
    for (const controller of this.active.values()) controller.abort()
  }
}
