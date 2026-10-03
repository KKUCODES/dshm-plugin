import { randomUUID } from 'node:crypto'
import { expect, test } from 'vitest'
import type { SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller'
import { brandString } from '@deepseek-ai/dsh-brand'
import { SessionAdapter, type SessionService } from '../src/session-adapter.js'

test('prompt enters the existing session with a stable request id and unsubscribe does not cancel the task', async () => {
  let admitted: SessionPromptRequest | undefined, taskCancels = 0, streamStopped = false
  const service: SessionService = {
    list: async () => ({ items: [] }), page: async () => { throw new Error('unused') },
    prompt: async request => { admitted = request; return { accepted: true } },
    cancel: () => { taskCancels++; return { accepted: true } },
    async *follow(_request, signal) {
      try {
        yield { type: 'snapshot', header: { version: 1, id: brandString<SessionPromptRequest['sessionId']>('already-existing'), createdAt: 0, isSeeded: false },
          cursor: -1, records: [], hasMore: false, projections: { asOfSeq: -1, values: {} } }
        await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
      }
      finally { streamStopped = true }
    },
    async *control() {},
  }
  const adapter = new SessionAdapter(service), frames: unknown[] = [], requestId = randomUUID()
  await adapter.receive({ type: 'request', id: requestId, operation: { method: 'session.prompt', sessionId: 'already-existing', requestId, mode: 'queue', text: '继续' } }, frame => frames.push(frame))
  expect(admitted).toMatchObject({ sessionId: 'already-existing', requestId, mode: 'queue', content: [{ type: 'text', text: '继续' }] })
  const streamId = randomUUID()
  const running = adapter.receive({ type: 'request', id: streamId, operation: { method: 'session.follow', address: { kind: 'session', sessionId: 'already-existing' } } }, frame => frames.push(frame))
  await new Promise(resolve => setImmediate(resolve))
  await adapter.receive({ type: 'cancel', id: streamId }, frame => frames.push(frame)); await running
  expect(streamStopped).toBe(true); expect(taskCancels).toBe(0)
  expect(frames).toContainEqual({ type: 'result', id: requestId, value: { accepted: true } })
  await adapter.receive({ type: 'request', id: randomUUID(), operation: { method: 'session.cancel', sessionId: 'already-existing' } }, () => {})
  expect(taskCancels).toBe(1)
})
