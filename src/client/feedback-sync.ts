export interface FeedbackReader {
  resync(): Promise<{ ok: boolean }>
}

export interface FeedbackEvents {
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: Event) => void) | null
  close(): void
}

/** 同一原 controller 的多个视图共享通知，按原写队列重读，卸载后忽略迟到结果。 */
export class DesktopFeedbackSync {
  private readonly active = new Map<FeedbackReader, { listeners: Set<(failed: boolean) => void>; close(): void }>()

  constructor(private readonly connect: (sessionId: string) => FeedbackEvents) {}

  subscribe(controller: FeedbackReader, sessionId: string, listener: (failed: boolean) => void) {
    let state = this.active.get(controller)
    if (!state) {
      const listeners = new Set<(failed: boolean) => void>()
      let disposed = false, pending = false, dirty = false, connected = false, revision: number | undefined
      const events = this.connect(sessionId)
      const publish = (failed: boolean) => { if (!disposed) for (const fn of listeners) fn(failed) }
      const refresh = async () => {
        dirty = true
        if (pending || disposed) return
        pending = true
        try {
          while (dirty && !disposed) {
            dirty = false
            const result = await controller.resync()
            publish(!result.ok || !connected)
          }
        } catch { publish(true) }
        finally { pending = false }
      }
      events.onmessage = event => {
        if (disposed) return
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'ready' && message.revision === 0) { revision = 0; connected = true }
          else if (message.type === 'changed' && revision !== undefined && Number.isSafeInteger(message.revision) && message.revision > revision) revision = message.revision
          else throw new Error('invalid feedback notification')
          void refresh()
        } catch { connected = false; publish(true); events.close() }
      }
      // EventSource 会自动重连；新的 ready 触发重读，期间绝不重放写操作。
      events.onerror = () => { if (!disposed) { connected = false; revision = undefined; publish(true) } }
      state = { listeners, close: () => { disposed = true; events.onmessage = null; events.onerror = null; events.close() } }
      this.active.set(controller, state)
    }
    state.listeners.add(listener)
    const subscribed = state
    let subscribedHere = true
    return () => {
      if (!subscribedHere) return
      subscribedHere = false
      subscribed.listeners.delete(listener)
      if (!subscribed.listeners.size) { subscribed.close(); this.active.delete(controller) }
    }
  }

  dispose() {
    for (const state of this.active.values()) state.close()
    this.active.clear()
  }
}
