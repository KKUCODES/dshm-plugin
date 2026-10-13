import { isProfileDshVersion } from './profile-dsh-version.js'
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { JobId } from '@deepseek-ai/dsh-jobs'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-agent'
import type { Operation } from '@dsh-mobile/protocol'
import { recoverOutput, type IndependentRegistry } from './job-output.js'
import { ringOutput, type RingJobRegistry } from './job-ring.js'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { JobStatus } from '@deepseek-ai/dsh-jobs'

interface LegacyJobRegistry extends IndependentRegistry {
  get(id: JobId, caller: Agent): { startedAt: number; status: JobStatus }
  kill(id: JobId, caller: Agent, reason?: string): 'requested' | 'already-finished'
}

/** 每次 jobs 服务注入生成新身份，旧手机页面不能停止重启后复用 id 的进程。 */
export class JobControl {
  readonly generation = randomUUID()
  private active = true
  constructor(private ctx: Context, private version = '0.1.6-alpha.2') {}
  dispose() { this.active = false }
  get outputCoordinates() { return isProfileDshVersion(this.version) ? 'ring' as const : 'channel' as const }
  get outputAvailable() {
    return this.active && (this.outputCoordinates === 'ring'
      ? typeof Reflect.get(this.ctx.jobs, 'readAt') === 'function' : typeof (this.ctx.jobs as IndependentRegistry).readOutputBytes === 'function')
  }

  private job(id: JobId, agent: Agent) {
    return this.outputCoordinates === 'ring' ? (this.ctx.jobs as unknown as RingJobRegistry).get(id, agent.id)
      : (this.ctx.jobs as unknown as LegacyJobRegistry).get(id, agent)
  }

  async output(operation: Extract<Operation, { method: 'remote.jobOutput' }>, signal: AbortSignal) {
    const read = () => {
      if (!this.active || operation.generation !== this.generation) throw new Error('remote_job_stale')
      const agent = this.ctx.agents.get(operation.sessionId as SessionId)
      if (!agent) throw new Error('remote_job_session_closed')
      const id = operation.jobId as JobId
      let job
      try { job = this.job(id, agent) } catch { throw new Error('remote_job_missing') }
      if (job.startedAt !== operation.startedAt) throw new Error('remote_job_stale')
      const jobs = this.ctx.jobs as IndependentRegistry
      if (typeof jobs.readOutputBytes !== 'function') throw new Error('remote_job_output_unavailable')
      try { return jobs.readOutputBytes(id, operation, agent) }
      catch { throw new Error('remote_job_output_failed') }
    }
    if (this.outputCoordinates === 'ring') {
      signal.throwIfAborted()
      if (!this.active || operation.generation !== this.generation) throw new Error('remote_job_stale')
      const agent = this.ctx.agents.get(operation.sessionId as SessionId)
      if (!agent) throw new Error('remote_job_session_closed')
      const id = operation.jobId as JobId
      let job
      try { job = this.job(id, agent) } catch { throw new Error('remote_job_missing') }
      if (job.startedAt !== operation.startedAt) throw new Error('remote_job_stale')
      try { return ringOutput(this.ctx.jobs as unknown as RingJobRegistry, id, agent.id, operation) }
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
    try { job = this.job(id, agent) }
    catch { throw new Error('remote_job_missing') }
    if (job.startedAt !== operation.startedAt) throw new Error('remote_job_stale')
    if (job.status === 'stopping') return { status: 'already-stopping' }
    if (job.status !== 'running') return { status: 'already-finished' }
    try { return { status: this.outputCoordinates === 'ring'
      ? (this.ctx.jobs as unknown as RingJobRegistry).kill(id, agent.id, 'DSHM user requested stop')
      : (this.ctx.jobs as unknown as LegacyJobRegistry).kill(id, agent, 'DSHM user requested stop') } }
    catch { throw new Error('remote_job_stop_failed') }
  }
}
