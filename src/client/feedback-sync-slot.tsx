import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { DesktopFeedbackSync, type FeedbackReader } from './feedback-sync.js'

const slot = 'conversation.chat.assistant-actions'

export function registerDesktopFeedbackSync(ctx: Context) {
  const sync = new DesktopFeedbackSync(sessionId => new EventSource(`/api/dsh-mobile/feedback-events?sessionId=${encodeURIComponent(sessionId)}`))
  ctx.effect(() => () => sync.dispose(), 'dsh-mobile: desktop feedback sync')
  const subscribe = (listener: () => void) => ctx.slots.subscribe(slot, listener)
  const snapshot = () => ctx.slots.entries(slot)

  function FeedbackSync({ sessionId }: { sessionId: string }) {
    const entries = useSyncExternalStore(subscribe, snapshot, snapshot)
    const [failed, setFailed] = useState(false)
    useEffect(() => {
      setFailed(false)
      const entry = ctx.slots.entriesOfSlot(slot).find(entry => entry.options.id === 'feedback' && entry.locale === 'feedback')
      if (!entry?.inject) return
      // SlotCore 的存储层擦除了参数类型；该公开槽按原声明只接收 sessionId。
      const inject = entry.inject as (sessionId: string) => { hooks?: { feedback?: FeedbackReader } }
      const controller = inject(sessionId).hooks?.feedback
      if (typeof controller?.resync !== 'function') return
      return sync.subscribe(controller, sessionId, setFailed)
    }, [entries, sessionId])
    return failed ? <div role="status">评价同步暂时中断，请重新打开会话。</div> : null
  }

  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay', id: 'dsh-mobile-feedback-sync', order: 3,
  }, FeedbackSync))
}
