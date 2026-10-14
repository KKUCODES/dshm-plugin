import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-message-feedback'

/** 仅发失效通知；不发布假的 Session，不在持久化写锁内读取反馈。 */
export class FeedbackNotifications {
  private readonly listeners = new Map<string, Set<() => void>>()
  private readonly lifetime = new AbortController()

  constructor(ctx: Context) {
    ctx.on('session/event', (session, event) => {
      if (event.type === 'feedback/message-put' || event.type === 'feedback/message-delete') this.changed(session.id)
    })
    ctx.on('feedback/committed', inspection => {
      const event = inspection.events.at(-1)
      // alpha.1 的 inspection 类型尚未列出反馈事件；按事件名核对，兼容两版声明。
      if (!['feedback/message-put', 'feedback/message-delete'].includes(event?.type ?? '')) return
      this.changed(inspection.meta.id)
    })
    ctx.effect(() => () => { this.lifetime.abort(); this.listeners.clear() }, 'dsh-mobile: feedback notifications')
  }

  private changed(sessionId: string) {
    for (const listener of this.listeners.get(sessionId) ?? []) listener()
  }

  async *follow(sessionId: string, caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal])
    signal.throwIfAborted()
    let revision = 0, delivered = 0, wake: (() => void) | undefined
    const notify = () => { const resolve = wake; wake = undefined; resolve?.() }
    const changed = () => { revision++; notify() }
    const listeners = this.listeners.get(sessionId) ?? new Set<() => void>()
    this.listeners.set(sessionId, listeners); listeners.add(changed)
    signal.addEventListener('abort', notify, { once: true })
    try {
      // 先监听，再让客户端重读，封住首次 list 与订阅建立之间的窗口。
      yield { type: 'ready' as const, revision: 0 }
      while (!signal.aborted) {
        if (revision !== delivered) {
          delivered = revision
          yield { type: 'changed' as const, revision: delivered }
        } else await new Promise<void>(resolve => { wake = resolve })
      }
    } finally {
      signal.removeEventListener('abort', notify)
      listeners.delete(changed)
      if (!listeners.size) this.listeners.delete(sessionId)
    }
  }
}
