import { randomUUID } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import { afterEach, expect, test, vi } from 'vitest'
import { TaskNotifications, notificationText } from '../src/task-notifications.js'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SessionTitleService from '@deepseek-ai/dsh-session-title'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import type { PendingNotificationChange } from '../src/pending-notifications.js'
import { RemoteAdapter } from '../src/remote-adapter.js'
import type { HostFrame, RemoteContext } from '@dsh-mobile/protocol'

const cleanup: Array<() => unknown> = []
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose() })

test('opt-in previews use the real title and current reply while legacy listeners keep their exact schema', async () => {
  const f = await fixture()
  await f.ctx.plugin(SessionProjectionRegistry)
  await f.ctx.plugin(SessionTitleService, { fallbackMaxWords: 5, fallbackMaxBytes: 40, maxTitleBytes: 80 })
  f.ctx.sessionTitle.rename(f.session, '移动端通知验证')
  const rich = f.service.follow(f.controller.signal, 1)
  await f.stream.next(); await rich.next()
  f.session.append('turn/start', { turn: 1 })
  f.session.append('assistant/message', { turn: 1, step: 1, stream: [], message: createAssistantMessage({
    content: [{ type: 'text', text: '已完成\n检查。```sh\nDO_NOT_COPY_COMMAND\n```可以查看结果。' }],
    source: { provider: 'fixture', model: 'fixture' },
  }) }, { surfaceOp: 'append' })
  f.session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  expect((await rich.next()).value).toMatchObject({ preview: { title: '移动端通知验证', text: '已完成 检查。 可以查看结果。' } })
  expect((await f.stream.next()).value).not.toHaveProperty('preview')
  f.session.append('turn/start', { turn: 2 })
  f.session.append('turn/end', { turn: 2, reason: { kind: 'error', error: { code: 'UNKNOWN', message: 'DO_NOT_COPY_ERROR' } } })
  expect((await rich.next()).value).toMatchObject({ reason: 'error', preview: { title: '移动端通知验证', text: '' } })
  f.session.append('turn/start', { turn: 3 })
  f.session.append('turn/end', { turn: 3, reason: { kind: 'completed' } })
  expect((await rich.next()).value).toMatchObject({ preview: { title: '移动端通知验证', text: '' } })
  await rich.return()
})

test('notification excerpts cap text without splitting emoji or retaining control sequences and fenced code', () => {
  expect(notificationText('a'.repeat(118) + '😀end', 120)).toBe('a'.repeat(118) + '…')
  expect(notificationText('a\u202eb\n c ```private', 240)).toBe('a b c')
  expect(notificationText('x'.repeat(10_000), 240)).toHaveLength(240)
  expect(notificationText('before~~~sh\nprivate~~~after', 240)).toBe('before after')
})

test('pending previews identify the real session without adding payloads to ready or resolved events', async () => {
  const f = await fixture()
  await f.ctx.plugin(SessionProjectionRegistry)
  await f.ctx.plugin(SessionTitleService, { fallbackMaxWords: 5, fallbackMaxBytes: 40, maxTitleBytes: 80 })
  f.ctx.sessionTitle.rename(f.session, '需要你决定的任务')
  let listener: (event: PendingNotificationChange) => void | Promise<void> = () => {}
  const service = new TaskNotifications(f.ctx, () => ({ observe: callback => {
    listener = callback
    return { snapshot: [], dispose: () => {} }
  } }))
  const stream = service.follow(f.controller.signal, 1)
  expect((await stream.next()).value).toEqual({ type: 'ready', generation: service.generation, pendingAvailable: true, pending: [] })
  const item = { eventId: randomUUID(), sessionId: f.session.id, kind: 'approval' as const }
  await listener({ type: 'pending', item })
  expect((await stream.next()).value).toEqual({ type: 'pending', item, preview: { title: '需要你决定的任务', text: '' } })
  await listener({ type: 'resolved', eventId: item.eventId })
  expect((await stream.next()).value).toEqual({ type: 'resolved', eventId: item.eventId })
  await stream.return()
})

test('pending previews work inside the desktop plugin fiber without a direct sessions injection', async () => {
  const f = await fixture()
  await f.ctx.plugin(SessionProjectionRegistry)
  await f.ctx.plugin(SessionTitleService, { fallbackMaxWords: 5, fallbackMaxBytes: 40, maxTitleBytes: 80 })
  f.ctx.sessionTitle.rename(f.session, '插件作用域中的原会话')
  let listener: (event: PendingNotificationChange) => void | Promise<void> = () => {}
  let scoped: TaskNotifications | undefined
  await f.ctx.plugin(scope => {
    scoped = new TaskNotifications(scope, () => ({ observe: callback => {
      listener = callback
      return { snapshot: [], dispose: () => {} }
    } }))
  })
  const stream = scoped!.follow(f.controller.signal, 1)
  await stream.next()
  await listener({ type: 'pending', item: { eventId: randomUUID(), sessionId: f.session.id, kind: 'question' } })
  expect((await stream.next()).value).toMatchObject({ type: 'pending', preview: { title: '插件作用域中的原会话', text: '' } })
  await stream.return()
})

async function fixture() {
  const ctx = new Context()
  cleanup.push(() => ctx.fiber.dispose())
  await ctx.plugin(SessionStore)
  const service = new TaskNotifications(ctx)
  const session = ctx.sessions.create(SessionId('notification-test'))
  const controller = new AbortController()
  cleanup.push(() => controller.abort())
  const stream = service.follow(controller.signal)
  let turn = 0
  const end = (reason: Parameters<typeof session.append<'turn/end'>>[1]['reason']) => {
    session.append('turn/start', { turn: ++turn })
    return session.append('turn/end', { turn, reason })
  }
  return { ctx, service, session, controller, stream, end }
}

test('real Session publication excludes history/cancel/repair, preserves reason and stable record coordinates', async () => {
  const f = await fixture()
  f.end({ kind: 'completed' })
  expect((await f.stream.next()).value).toEqual({ type: 'ready', generation: f.service.generation, pendingAvailable: false, pending: [] })
  f.end({ kind: 'aborted', reason: { kind: 'user' } })
  f.end({ kind: 'interrupted' })
  const complete = f.end({ kind: 'completed' })
  expect((await f.stream.next()).value).toEqual({ type: 'outcome', sessionId: f.session.id,
    seq: complete.seq, time: complete.time, turn: 4, reason: 'completed' })
  for (const reason of [{ kind: 'error', error: { code: 'UNKNOWN', message: 'DO_NOT_FORWARD_SECRET' } },
    { kind: 'blocked' }, { kind: 'max-tokens' }] as const) {
    const original = f.end(reason)
    const event = (await f.stream.next()).value
    expect(event).toMatchObject({ reason: reason.kind, seq: original.seq })
    expect(JSON.stringify(event)).not.toContain('DO_NOT_FORWARD_SECRET')
  }
  const waiting = f.stream.next()
  f.controller.abort()
  expect((await waiting).done).toBe(true)
  const again = f.service.follow(new AbortController().signal)
  await again.next()
  const live = f.end({ kind: 'completed' })
  expect((await again.next()).value).toMatchObject({ seq: live.seq })
  await again.return()
})

test('slow consumer overflows explicitly, disposes subscription and never blocks Session.append', async () => {
  const f = await fixture()
  await f.stream.next()
  for (let i = 0; i < 257; i++) f.end({ kind: 'completed' })
  await expect(f.stream.next()).rejects.toThrow('remote_notifications_overflow')
  const again = f.service.follow(f.controller.signal)
  await again.next()
  const current = f.end({ kind: 'completed' })
  expect((await again.next()).value).toMatchObject({ seq: current.seq })
  const waiting = again.next()
  await f.ctx.fiber.dispose()
  expect((await waiting).done).toBe(true)
})

test('subscription capacity and pre-aborted callers release resources for later connections', async () => {
  const f = await fixture()
  const aborted = new AbortController(); aborted.abort()
  await expect(f.service.follow(aborted.signal).next()).rejects.toMatchObject({ name: 'AbortError' })
  const streams = Array.from({ length: 64 }, () => f.service.follow(f.controller.signal))
  for (const stream of streams) await stream.next()
  await expect(f.service.follow(f.controller.signal).next()).rejects.toThrow('remote_notifications_busy')
  await streams[0]!.return()
  const replacement = f.service.follow(f.controller.signal)
  expect((await replacement.next()).value).toMatchObject({ type: 'ready' })
  await replacement.return()
  for (const stream of streams.slice(1)) await stream.return()
})

test('RemoteAdapter negotiates, enforces host identity and cancels the actual task stream without management', async () => {
  const f = await fixture()
  const context: RemoteContext = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
  const unused = () => { throw new Error('unrelated service must not run') }
  const adapter = new RemoteAdapter({ version: '0.1.6-alpha.2', taskNotifications: f.service,
    connection: { createSharedFetchHandler: unused }, gateway: { wireStream: { open: unused, failure: unused } },
    modules: { graph: () => ({ rev: 'test', entries: [], batches: [] }), onGraphChanged: unused, fetchBundle: unused },
  }, context.hostId)
  cleanup.push(() => adapter.dispose())
  const frames: HostFrame[] = [], id = randomUUID()
  await adapter.receive({ type: 'request', id: randomUUID(), context,
    operation: { method: 'remote.negotiate', version: 2 } }, frame => frames.push(frame))
  expect(frames.pop()).toMatchObject({ type: 'result', value: { taskNotifications: true } })
  await adapter.receive({ type: 'request', id: randomUUID(), context: { ...context, hostId: randomUUID() },
    operation: { method: 'remote.taskFollow' } }, frame => frames.push(frame))
  expect(frames.pop()).toMatchObject({ type: 'error', code: 'remote_identity_denied' })
  const running = adapter.receive({ type: 'request', id, context,
    operation: { method: 'remote.taskFollow' } }, frame => frames.push(frame))
  await vi.waitFor(() => expect(frames).toHaveLength(1))
  const original = f.end({ kind: 'completed' })
  await vi.waitFor(() => expect(frames).toHaveLength(2))
  expect(frames[1]).toMatchObject({ type: 'event', id, value: { seq: original.seq, reason: 'completed' } })
  await adapter.receive({ type: 'cancel', id }, frame => frames.push(frame))
  await running
  f.end({ kind: 'completed' })
  expect(frames).toHaveLength(2)

  // 同步发布使真实队列超限，检查适配器释放请求后允许同一连接重新订阅。
  frames.length = 0
  const overflowing = adapter.receive({ type: 'request', id, context,
    operation: { method: 'remote.taskFollow' } }, frame => frames.push(frame))
  await vi.waitFor(() => expect(frames).toHaveLength(1))
  for (let index = 0; index < 257; index++) f.end({ kind: 'completed' })
  await overflowing
  expect(frames.at(-1)).toEqual({ type: 'error', id, code: 'remote_notifications_overflow' })
  expect(frames.filter(frame => frame.type === 'error')).toHaveLength(1)

  frames.length = 0
  const recovered = adapter.receive({ type: 'request', id, context,
    operation: { method: 'remote.taskFollow' } }, frame => frames.push(frame))
  await vi.waitFor(() => expect(frames).toHaveLength(1))
  expect(frames[0]).toMatchObject({ type: 'event', id, value: { type: 'ready', generation: f.service.generation } })
  const fresh = f.end({ kind: 'completed' })
  await vi.waitFor(() => expect(frames).toHaveLength(2))
  expect(frames[1]).toMatchObject({ type: 'event', id, value: { seq: fresh.seq } })
  await adapter.receive({ type: 'cancel', id }, frame => frames.push(frame))
  await recovered
})
