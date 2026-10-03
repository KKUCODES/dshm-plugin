import { expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import LocalJobRegistry from '@deepseek-ai/dsh-jobs-local'
import type { JobOutcome } from '@deepseek-ai/dsh-jobs'
import { JobControl } from '../src/job-control.js'

test('真实任务注册表隔离会话、代次和运行身份；停止不消费输出且等待真实结束', async () => {
  const ctx = new Context()
  const agents = ctx.plugin(AgentRegistry), jobs = ctx.plugin(LocalJobRegistry, {})
  await agents.await(); await jobs.await()
  const agent = (id: string) => ({ id: SessionId(id), session: Session.create(SessionId(id)), ctx, options: {}, status: 'idle' } as Agent)
  const own = agent('own'), other = agent('other')
  const offOwn = await ctx.agents.register(own), offOther = await ctx.agents.register(other)
  const offController = ctx.jobs.attachController('test-controller')
  const control = new JobControl(ctx)
  let finish!: (outcome: JobOutcome) => void, cancels = 0, reads = 0
  const id = ctx.jobs.start({ kind: 'bash', label: 'fixture', owner: own,
    run: () => ({ cancel() { cancels++ }, readOutput() { reads++; return 'unconsumed' }, done: new Promise(resolve => { finish = resolve }) }) })
  const request = { method: 'remote.jobStop' as const, sessionId: own.id, jobId: id, startedAt: ctx.jobs.get(id, own).startedAt, generation: control.generation }
  try {
    expect(() => control.stop({ ...request, sessionId: other.id })).toThrow('remote_job_missing')
    expect(() => control.stop({ ...request, sessionId: 'gone' })).toThrow('remote_job_session_closed')
    expect(() => control.stop({ ...request, startedAt: request.startedAt + 1 })).toThrow('remote_job_stale')
    expect(() => new JobControl(ctx).stop(request)).toThrow('remote_job_stale')
    expect(cancels).toBe(0)
    expect(control.stop(request)).toEqual({ status: 'requested' })
    expect(ctx.jobs.get(id, own).status).toBe('stopping')
    expect(control.stop(request)).toEqual({ status: 'already-stopping' })
    expect(cancels).toBe(1); expect(reads).toBe(0)
    finish({ status: 'killed' }); await Promise.resolve()
    expect(control.stop(request)).toEqual({ status: 'already-finished' })
    expect(ctx.jobs.get(id, own).status).toBe('killed')
    expect(reads).toBe(0)
  } finally {
    finish({ status: 'killed' }); await Promise.resolve()
    await offOther(); await offOwn(); offController(); await jobs.dispose(); await agents.dispose()
  }
})
