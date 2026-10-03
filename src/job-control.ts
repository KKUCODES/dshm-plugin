import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { JobId } from '@deepseek-ai/dsh-jobs'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-agent'
import type { Operation } from '@dsh-mobile/protocol'
import { recoverOutput, type IndependentRegistry } from './job-output.js'

/** 每次 jobs 服务注入生成新身份，旧手机页面不能停止重启后复用 id 的进程。 */
export class JobControl {
  readonly generation = randomUUID()
  private active = true
  constructor(private ctx: Context) {}
  dispose() { this.active = false }
  get outputAvailable() { return this.active && typeof (this.ctx.jobs as IndependentRegistry).readOutputBytes === 'function' }

  async output(operation: Extract<Operation, { method: 'remote.jobOutput' }>, signal: AbortSignal) {
    const read = () => {
      if (!this.active || operation.generation !== this.generation) throw new Error('remote_job_stale')
      const agent = this.ctx.agents.get(operation.sessionId as SessionId)
      if (!agent) throw new Error('remote_job_session_closed')
      const id = operation.jobId as JobId
      let job
      try { job = this.ctx.jobs.get(id, agent) } catch { throw new Error('remote_job_missing') }
      if (job.startedAt !== operation.startedAt) throw new Error('remote_job_stale')
      const jobs = this.ctx.jobs as IndependentRegistry
      if (typeof jobs.readOutputBytes !== 'function') throw new Error('remote_job_output_unavailable')
      try { return jobs.readOutputBytes(id, operation, agent) }
      catch { throw new Error('remote_job_output_failed') }
    }
    return recoverOutput(operation, read, signal)
  }

  stop(operation: Extract<Operation, { method: 'remote.jobStop' }>) {
    if (!this.active || operation.generation !== this.generation) throw new Error('remote_job_stale')
    const agent = this.ctx.agents.get(operation.sessionId as SessionId)
    if (!agent) throw new Error('remote_job_session_closed')
    const id = operation.jobId as JobId
    let job
    // 原 registry.get 对 owner 做隔离；不把另一会话信息和内部异常交给手机。
    try { job = this.ctx.jobs.get(id, agent) }
    catch { throw new Error('remote_job_missing') }
    if (job.startedAt !== operation.startedAt) throw new Error('remote_job_stale')
    if (job.status === 'stopping') return { status: 'already-stopping' }
    if (job.status !== 'running') return { status: 'already-finished' }
    try { return { status: this.ctx.jobs.kill(id, agent, 'DSHM user requested stop') } }
    catch { throw new Error('remote_job_stop_failed') }
  }
}
