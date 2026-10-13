import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import type { ToolDispatchExecution, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type { Operation } from '@dsh-mobile/protocol'
import { recoverOutput, type IndependentOutput } from './job-output.js'

/** 固定兼容补丁的电脑内部能力；不向手机发布读者、spill 路径或进程控制对象。 */
type ForegroundOutput = { readonly stdout: OutputReader; readonly stderr: OutputReader }
type OutputReader = { readonly readBytesFrom?: (fromByte: number, maxBytes: number) => Omit<Extract<IndependentOutput, { state: 'available' }>, 'state'> }
type IdentityHeader = object & { readonly delegationDepth?: unknown }
// 新版原 SessionQuery.observeSession 契约；旧版没有该能力时保留原释放即失效的边界。
type SessionReader = { observeSession(id: SessionId, options: { signal: AbortSignal; projectionMode: 'none' }): Promise<{
  readonly header: IdentityHeader; readonly events: readonly SessionEvent[]; [Symbol.dispose](): void
}> }
declare module '@deepseek-ai/cordis' {
  interface Events {
    'tools/shell-output'(exec: Readonly<ToolExecution>, output: ForegroundOutput): void
  }
}
type Entry = {
  id: string; owner: Agent; token: ToolExecution['token']; rootCallTime: number
  header: IdentityHeader; root: SessionEvent; retired?: boolean
  status: 'running' | 'completed' | 'killed' | 'failed'; output?: ForegroundOutput; finishedAt?: number
}
const key = (sessionId: string, rootCallId: string, callId: string) => JSON.stringify([sessionId, rootCallId, callId])
const rootKey = (sessionId: string, callId: string) => JSON.stringify([sessionId, callId])
const RETAIN_MS = 30 * 60 * 1000

/** 真实工具身份注册表：围绕原工具观察，不改执行、审批、取消或持久会话记录。 */
export class CommandOutput {
  readonly generation = randomUUID()
  private active = true
  private reader?: SessionReader
  private readonly entries = new Map<string, Entry>()
  private readonly roots = new Map<string, { session: Session; event: SessionEvent }>()
  private readonly timer: ReturnType<typeof setInterval>

  constructor(private ctx: Context) {
    ctx.inject(['sessionQuery'], scope => {
      const reader = scope.get('sessionQuery') as SessionReader | undefined
      if (typeof reader?.observeSession !== 'function') return
      this.reader = reader
      // Cordis 每次 get 可生成新代理；用实际注入生命周期确定服务代次。
      scope.effect(() => () => {
        if (this.reader !== reader) return
        this.reader = undefined
        for (const [id, entry] of this.entries) if (entry.retired) this.entries.delete(id)
      }, 'dsh-mobile: command history identity')
    })
    ctx.on('session/event', (session, event) => {
      if (!this.active || event.type !== 'tool/call') return
      this.roots.set(rootKey(session.id, event.data.callId), { session, event })
      while (this.roots.size > 512) this.roots.delete(this.roots.keys().next().value!)
    })
    ctx.on('tools/execute', (exec, next) => {
      // 观察故障不能抢走原执行/终止路径，尤其不能遗弃已准备的工具。
      try { this.begin(exec) } catch { /* 本次不提供独立输出，原调用照常。 */ }
      return next()
    })
    ctx.on('tools/shell-output', (exec, output) => {
      const entry = this.forExecution(exec)
      if (entry?.status === 'running') entry.output = output
    })
    ctx.on('tools/result', (exec, result) => { this.finish(exec, result); return undefined })
    ctx.on('agent/disposed', ({ agent }) => this.removeOwner(agent))
    ctx.on('session/disposed', session => {
      for (const [id, entry] of this.entries) if (entry.owner.session === session) this.retire(id, entry)
      for (const [id, root] of this.roots) if (root.session === session) this.roots.delete(id)
    })
    this.timer = setInterval(() => this.prune(), 60000); this.timer.unref()
  }
  get available() {
    if (!this.active) return false
    const shell = this.ctx.get('shell') as { foregroundOutputVersion?: unknown } | undefined
    return shell?.foregroundOutputVersion === 1
  }
  dispose() { this.active = false; clearInterval(this.timer); this.entries.clear(); this.roots.clear() }
  private prune() {
    const oldest = Date.now() - RETAIN_MS
    for (const [id, entry] of this.entries) if (entry.finishedAt !== undefined && entry.finishedAt < oldest) this.entries.delete(id)
  }
  private removeOwner(agent: Agent) {
    for (const [id, entry] of this.entries) if (entry.owner === agent) this.retire(id, entry)
    for (const [id, root] of this.roots) if (root.session === agent.session) this.roots.delete(id)
  }
  private sessionReader() {
    return this.reader
  }
  private retire(id: string, entry: Entry) {
    // 原子任务结算释放 handle；仅保留已经结束的输出，不延长执行或重建 Agent。
    if (entry.finishedAt !== undefined && entry.output && this.sessionReader()) entry.retired = true
    else this.entries.delete(id)
  }
  private begin(exec: ToolDispatchExecution) {
    if (!this.available || !exec.agent || !['pwsh', 'bash'].includes(exec.name)
      || (exec.arguments as { run_in_background?: unknown } | null)?.run_in_background === true) return
    const owner = this.ctx.agents.get(exec.agent.id), root = this.roots.get(rootKey(exec.agent.id, exec.rootCallId))
    if (owner !== exec.agent || root?.session !== owner.session) return
    const id = key(owner.id, exec.rootCallId, exec.callId)
    // 同一会话复用调用 id 视为失效，不覆盖仍被手机持有的旧输出。
    if (this.entries.has(id)) {
      if (this.entries.get(id)!.token !== exec.token) this.entries.delete(id)
      return
    }
    this.prune()
    if (this.entries.size >= 128) {
      const finished = [...this.entries].find(([, entry]) => entry.finishedAt !== undefined)
      if (finished) this.entries.delete(finished[0]); else return
    }
    this.entries.set(id, { id: randomUUID(), owner, token: exec.token, rootCallTime: root.event.time,
      header: structuredClone(owner.session.header), root: structuredClone(root.event), status: 'running' })
  }
  private forExecution(exec: Readonly<ToolExecution>) {
    if (!this.active || !exec.agent) return
    const entry = this.entries.get(key(exec.agent.id, exec.rootCallId, exec.callId))
    if (entry?.owner !== exec.agent || entry.token !== exec.token || entry.retired) return
    return entry
  }
  private finish(exec: Readonly<ToolExecution>, result: Readonly<ToolExecutionResult>) {
    const entry = this.forExecution(exec)
    if (!entry) return
    const value = !result.isError ? result.value as { exitCode?: unknown; timedOut?: boolean; aborted?: boolean } : undefined
    entry.status = exec.signal.aborted || value?.aborted ? 'killed'
      : result.isError || value?.timedOut || typeof value?.exitCode === 'number' && value.exitCode !== 0 ? 'failed' : 'completed'
    entry.finishedAt = Date.now()
  }
  async read(operation: Extract<Operation, { method: 'remote.commandOutput' }>, signal: AbortSignal) {
    let observed: Entry | undefined
    const locate = () => {
      if (!this.available || operation.generation !== this.generation) throw new Error('remote_command_stale')
      this.prune()
      const agent = this.ctx.agents.get(operation.sessionId as SessionId)
      const entry = this.entries.get(key(operation.sessionId, operation.rootCallId, operation.callId))
      if (!entry || !entry.retired && entry.owner !== agent) throw new Error('remote_command_missing')
      if (entry.rootCallTime !== operation.rootCallTime || operation.outputId && entry.id !== operation.outputId
        || observed && entry !== observed || !operation.outputId && operation.fromByte !== 0) throw new Error('remote_command_stale')
      observed = entry
      if (!Number.isSafeInteger(operation.fromByte) || operation.fromByte < 0 || !Number.isSafeInteger(operation.maxBytes)
        || operation.maxBytes < 1 || operation.maxBytes > 65536 || !['stdout', 'stderr'].includes(operation.stream)) throw new Error('remote_command_range')
      return entry
    }
    const verifyRetired = async () => {
      const entry = locate()
      if (!entry.retired) return
      const query = this.sessionReader()
      if (!query) throw new Error('remote_command_stale')
      const observation = await query.observeSession(operation.sessionId as SessionId, { signal, projectionMode: 'none' })
      try {
        signal.throwIfAborted(); locate()
        if (this.sessionReader() !== query) throw new Error('remote_command_stale')
        // 原冷读把未声明的 delegationDepth 规范为 0；其余 header 与完整根事件必须保持。
        const normalize = (header: IdentityHeader) => ({ ...header, delegationDepth: header.delegationDepth ?? 0 })
        if (!isDeepStrictEqual(normalize(observation.header), normalize(entry.header))
          || !isDeepStrictEqual(observation.events[entry.root.seq], entry.root)) throw new Error('remote_command_stale')
      } finally { observation[Symbol.dispose]() }
    }
    const read = () => {
      const entry = locate()
      const reader = entry.output?.[operation.stream].readBytesFrom
      const output: IndependentOutput = reader ? { state: 'available', ...reader(operation.fromByte, operation.maxBytes) }
        : { state: entry.status === 'running' && !entry.output ? 'pending' : 'unsupported' }
      return { output, snapshot: { status: entry.status } }
    }
    await verifyRetired()
    const result = await recoverOutput(operation, read, signal)
    signal.throwIfAborted()
    // 同步读和磁盘补读都在返回前再次验证生命周期；响应丢弃由 RemoteAdapter 的 signal 完成。
    read()
    await verifyRetired()
    return { ...result, outputId: observed!.id }
  }
}
