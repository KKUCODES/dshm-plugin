import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type { FeedbackNotifications } from './feedback-notifications.js'

/** 仅电脑原页面使用；沿用 Connection 的 Cookie、Host/Origin 校验。 */
export function registerFeedbackEvents(ctx: Context, notifications: FeedbackNotifications) {
  return ctx.connection.fetch.register({
    path: '/api/dsh-mobile/feedback-events', methods: ['GET'], requestBody: 'buffered',
    fetch: async request => {
      const params = new URL(request.url).searchParams
      const sessionId = params.get('sessionId')
      if (!sessionId || sessionId.length > 200 || /[\u0000-\u001f\u007f]/.test(sessionId)
        || [...params.keys()].some(key => key !== 'sessionId') || params.getAll('sessionId').length !== 1) {
        return Response.json({ error: 'invalid_session' }, { status: 400 })
      }
      const lifetime = new AbortController()
      const signal = AbortSignal.any([request.signal, lifetime.signal])
      const events = notifications.follow(sessionId, signal)
      const encoder = new TextEncoder()
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = await events.next()
            if (next.done) controller.close()
            else controller.enqueue(encoder.encode(`data: ${JSON.stringify(next.value)}\n\n`))
          } catch (error) { controller.error(error) }
        },
        async cancel() { lifetime.abort(); await events.return() },
      }, { highWaterMark: 0 })
      return new Response(body, { headers: {
        'content-type': 'text/event-stream', 'cache-control': 'no-store', 'x-accel-buffering': 'no',
      } })
    },
  })
}
