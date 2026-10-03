import { randomUUID } from 'node:crypto'
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { MAX_FRAME_BYTES, remotePermission, remoteRequestAllowed } from '@dsh-mobile/protocol'

const endpoints = new Set(['pluginManager/installBundle', 'pluginManager/removeBundle', 'pluginManager/setBundleEnabled', 'pluginManager/setPluginEnabled'])
const RETAIN_MS = 60 * 60 * 1000
const record = (value: unknown): Record<string, unknown> | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
type Entry = {
  id: string; owner: string; endpoint: string; payload: string; target: string; requestId?: string
  startedAt: number; finishedAt?: number; result?: Record<string, unknown>; error?: string
}

/** 保存同一电脑运行期间的有界结果；断线只停止读取，不重复提交已接受的包操作。 */
export class PluginOperations {
  readonly generation = randomUUID()
  private entries = new Map<string, Entry>()
  constructor(private connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>, private now = Date.now) {}
  private prune() {
    for (const [id, entry] of this.entries) if (entry.finishedAt !== undefined && this.now() - entry.finishedAt >= RETAIN_MS) this.entries.delete(id)
  }
  private checkGeneration(generation: string) { if (generation !== this.generation) throw new Error('plugin_operation_generation_changed') }
  private summary(entry: Entry) {
    return { id: entry.id, endpoint: entry.endpoint, target: entry.target, requestId: entry.requestId,
      startedAt: entry.startedAt, finishedAt: entry.finishedAt, state: entry.finishedAt === undefined ? 'pending' : entry.error ? 'unknown' : 'complete',
      ok: entry.result?.ok, application: record(entry.result?.value)?.application }
  }
  list(owner: string) {
    this.prune()
    return { generation: this.generation, items: [...this.entries.values()].filter(entry => entry.owner === owner).map(entry => this.summary(entry)) }
  }
  read(owner: string, generation: string, id: string) {
    this.checkGeneration(generation); this.prune()
    const entry = this.entries.get(id)
    if (!entry || entry.owner !== owner) throw new Error('plugin_operation_missing')
    return { ...this.summary(entry), result: entry.result, error: entry.error }
  }
  start(owner: string, generation: string, id: string, endpoint: string, payload: Record<string, unknown>) {
    this.checkGeneration(generation); this.prune()
    if (!endpoints.has(endpoint) || remotePermission(endpoint, false) !== 'management' || !remoteRequestAllowed(endpoint, payload)) throw new Error('remote_operation_denied')
    const encoded = JSON.stringify(payload)
    if (Buffer.byteLength(encoded) > 16 * 1024) throw new Error('plugin_operation_payload_too_large')
    const existing = this.entries.get(id)
    if (existing) {
      if (existing.owner !== owner || existing.endpoint !== endpoint || existing.payload !== encoded) throw new Error('plugin_operation_conflict')
      return this.summary(existing)
    }
    // 同设备的未确认操作结束前拒绝另一笔包写入，避免新页面误重试仍在进行的安装。
    if ([...this.entries.values()].some(entry => entry.owner === owner && entry.finishedAt === undefined)) throw new Error('plugin_operation_busy')
    if (this.entries.size >= 64) throw new Error('plugin_operation_capacity')
    const args = record(payload.args), options = record(args?.options)
    const target = args?.spec ?? args?.name ?? args?.id
    const entry: Entry = { id, owner, endpoint, payload: encoded, target: typeof target === 'string' ? target.slice(0, 4096) : endpoint,
      startedAt: this.now(), ...(typeof options?.requestId === 'string' ? { requestId: options.requestId } : {}) }
    this.entries.set(id, entry)
    void this.execute(entry, payload)
    return this.summary(entry)
  }
  private async execute(entry: Entry, payload: Record<string, unknown>) {
    try {
      // 不使用读取连接的 AbortSignal。安装交给原 manager 后须通过 cancelInstall 显式取消。
      const response = await this.connection.createSharedFetchHandler('/api').fetch(new Request(`http://dsh.internal/api/${entry.endpoint}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: entry.id, method: entry.endpoint, payload }),
      }))
      if (!response.ok) { await response.body?.cancel(); throw new Error('plugin_operation_outcome_unknown') }
      const envelope = record(await response.json()), result = record(envelope?.result)
      if (envelope?.type !== 'server-response' || envelope.rpcId !== entry.id || typeof result?.ok !== 'boolean') throw new Error('plugin_operation_outcome_unknown')
      if (Buffer.byteLength(JSON.stringify(result)) > MAX_FRAME_BYTES / 2) throw new Error('plugin_operation_result_too_large')
      entry.result = result
    } catch (error) {
      entry.error = error instanceof Error && error.message === 'plugin_operation_result_too_large' ? error.message : 'plugin_operation_outcome_unknown'
    } finally { entry.finishedAt = this.now() }
  }
}
