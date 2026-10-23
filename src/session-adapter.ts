import type { SessionController, SessionAddress, SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller'
import { brandString } from '@deepseek-ai/dsh-brand'
import { clientFrameSchema, type HostFrame, type Operation } from '@dsh-mobile/protocol'

export type SessionService = Pick<SessionController, 'list' | 'page' | 'follow' | 'control' | 'prompt' | 'cancel'>
type SessionId = SessionPromptRequest['sessionId']
const address = (value: Extract<Operation, { method: 'session.follow' }>['address']): SessionAddress =>
  value.kind === 'session' ? { kind: 'session', sessionId: brandString<SessionId>(value.sessionId) }
    : { ...value, parentSessionId: brandString<SessionId>(value.parentSessionId), childSessionId: brandString<SessionId>(value.childSessionId) }

/** 适配已发布的 SessionController，取消传输只中止订阅，停止 Agent 必须显式 session.cancel。 */
export class SessionAdapter {
  private requests = new Map<string, AbortController>()
  constructor(private service: SessionService) {}
  async receive(raw: unknown, send: (frame: HostFrame) => unknown): Promise<void> {
    const frame = clientFrameSchema.parse(raw)
    if (frame.type === 'cancel') { this.requests.get(frame.id)?.abort(); return }
    if (frame.type === 'responseAck' || frame.type === 'ack' || frame.type === 'uploadChunk' || frame.type === 'uploadEnd') return
    if (this.requests.has(frame.id)) throw new Error('duplicate_request_id')
    if (this.requests.size >= 256) { send({ type: 'error', id: frame.id, code: 'host_capacity' }); return }
    const controller = new AbortController(), signal = controller.signal
    this.requests.set(frame.id, controller)
    const emit = (value: HostFrame) => { if (!signal.aborted) return send(value) }
    try {
      const operation = frame.operation
      if (operation.method.startsWith('remote.')) throw new Error('remote_transport_unavailable')
      if (operation.method === 'session.follow' || operation.method === 'session.control') {
        const stream = operation.method === 'session.control' ? this.service.control(signal)
          : this.service.follow({ address: address(operation.address), maxMessages: operation.maxMessages ?? 30, assistantStream: true }, signal)
        for await (const value of stream) {
          if (signal.aborted) break
          await emit({ type: 'event', id: frame.id, value })
        }
        await emit({ type: 'end', id: frame.id })
      } else {
        let value: unknown
        switch (operation.method) {
          case 'session.list': value = await this.service.list({}, signal); break
          case 'session.page': value = await this.service.page({ address: address(operation.address), throughSeq: operation.throughSeq,
            beforeSeq: operation.beforeSeq, maxMessages: operation.maxMessages ?? 30 }, signal); break
          case 'session.prompt': value = await this.service.prompt({ sessionId: brandString<SessionId>(operation.sessionId), requestId: brandString<SessionPromptRequest['requestId']>(operation.requestId),
            mode: operation.mode, content: [{ type: 'text', text: operation.text }] }, signal); break
          case 'session.cancel': value = this.service.cancel({ sessionId: brandString<SessionId>(operation.sessionId) }); break
        }
        await emit({ type: 'result', id: frame.id, value })
      }
    } catch (error) {
      // 只转发已定义的机器错误码，避免把本地路径、凭据或堆栈发往公网。
      const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        && /^[a-z][a-z0-9_/-]{0,99}$/.test(error.code) ? error.code : 'session_operation_failed'
      await emit({ type: 'error', id: frame.id, code })
    } finally { this.requests.delete(frame.id) }
  }
  dispose() { for (const controller of this.requests.values()) controller.abort(); this.requests.clear() }
}
