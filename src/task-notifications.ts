import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { SessionId, type Session } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-title'
import type { PendingNotificationObserver, PendingNotificationChange } from './pending-notifications.js'

export interface TaskOutcome {
  type: 'outcome'
  sessionId: string
  seq: number
  time: number
  turn: number
  reason: 'completed' | 'error' | 'blocked' | 'max-tokens'
}

export interface TaskNotificationPreview { title: string; text: string }

/** 只取有限正文；代码块、推理、工具参数和错误详情不进入通知。 */
export function notificationText(value: string, limit: number): string {
  const plain = value.slice(0, 4096).replace(/(```|~~~)[\s\S]*?(?:\1|$)/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim()
  if (plain.length <= limit) return plain
  const prefix = plain.slice(0, limit - 1).replace(/[\ud800-\udbff]$/, '')
  return prefix + '…'
}

/** 只转发订阅期间的原会话结算；摘要由客户端显式协商，不回放历史。 */
export class TaskNotifications {
  readonly generation = randomUUID()
  private readonly listeners = new Set<(event: TaskOutcome & { preview: TaskNotificationPreview }) => void>()
  private readonly lifetime = new AbortController()
  private readonly replies = new WeakMap<Session, { turn: number; text: string }>()

  constructor(private readonly ctx: Context, private readonly pending: () => PendingNotificationObserver | undefined = () => undefined) {
    ctx.on('session/event', (session, event) => {
      if (event.type === 'turn/start') this.replies.delete(session)
      if (event.type === 'assistant/message') {
        const text = notificationText(event.data.message.content.filter(block => block.type === 'text').map(block => block.text).join(' '), 240)
        if (text) this.replies.set(session, { turn: event.data.turn, text })
      }
      if (event.type !== 'turn/end') return
      const reason = event.data.reason.kind
      // aborted 是取消；interrupted 是旧日志修复；未知扩展原因不能猜成成功。
      if (reason !== 'completed' && reason !== 'error' && reason !== 'blocked' && reason !== 'max-tokens') return
      const outcome: TaskOutcome = { type: 'outcome', sessionId: session.id, seq: event.seq,
        time: event.time, turn: event.data.turn, reason }
      const reply = this.replies.get(session)
      const preview = this.preview(session, reason === 'completed' && reply?.turn === event.data.turn ? reply.text : '')
      for (const listener of this.listeners) listener({ ...outcome, preview })
    })
    ctx.effect(() => () => { this.lifetime.abort(); this.listeners.clear() }, 'dsh-mobile: task notifications')
  }

  get pendingAvailable() { return !!this.pending() }

  private preview(session: Session | undefined, text = ''): TaskNotificationPreview {
    return { title: notificationText(session ? this.ctx.get('sessionTitle')?.get(session)?.title ?? '' : '', 120), text }
  }

  async *follow(caller: AbortSignal, previewVersion?: 1) {
    const signal = AbortSignal.any([caller, this.lifetime.signal])
    signal.throwIfAborted()
    if (this.listeners.size >= 64) throw new Error('remote_notifications_busy')
    const queue: Array<(TaskOutcome & { preview: TaskNotificationPreview }) | PendingNotificationChange> = []
    let overflow = false, wake: (() => void) | undefined
    const notify = () => { const resolve = wake; wake = undefined; resolve?.() }
    const receive = (event: (TaskOutcome & { preview: TaskNotificationPreview }) | PendingNotificationChange) => {
      if (overflow || signal.aborted) return
      if (queue.length >= 256) { overflow = true; queue.length = 0 }
      else queue.push(event)
      notify()
    }
    this.listeners.add(receive)
    signal.addEventListener('abort', notify, { once: true })
    let observation: ReturnType<PendingNotificationObserver['observe']> | undefined
    try {
      // 同步快照和后续变化来自同一个原 Gateway，不能通过延时猜初始集合。
      observation = this.pending()?.observe(receive)
      yield { type: 'ready' as const, generation: this.generation, pendingAvailable: !!observation, pending: observation?.snapshot ?? [] }
      while (!signal.aborted) {
        // 慢客户端必须重建实时订阅；不能静默丢失后声称事件完整。
        if (overflow) throw new Error('remote_notifications_overflow')
        const event = queue.shift()
        if (event?.type === 'outcome') {
          // 旧客户端严格校验原字段；仅协商过的连接收到摘要。
          const { preview, ...legacy } = event
          yield previewVersion === 1 ? event : legacy
        } else if (event?.type === 'pending' && previewVersion === 1) {
          // 通知服务位于插件fiber，sessions并非其直接注入项；按可选服务读取，避免待办中断整个流。
          yield { ...event, preview: this.preview(this.ctx.get('sessions')?.get(SessionId(event.item.sessionId))) }
        } else if (event) yield event
        else await new Promise<void>(resolve => { wake = resolve })
      }
    } finally {
      observation?.dispose()
      signal.removeEventListener('abort', notify)
      this.listeners.delete(receive)
      queue.length = 0
    }
  }
}
