import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve, sep } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import * as connection from '@deepseek-ai/dsh-client-connection'
import CredentialsLocal from '@deepseek-ai/dsh-credentials-local'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import TypertGateway from '@deepseek-ai/dsh-api-gateway'
import SessionStore, { Session, SessionId, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'
import JsonlPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import MessageFeedback, { type MessageFeedbackItem, type MessageFeedbackListResult,
  type MessageFeedbackPutResult, type MessageFeedbackDeleteResult } from '@deepseek-ai/dsh-message-feedback'
import Telemetry, { SessionTelemetryMode } from '@deepseek-ai/dsh-session-telemetry-otel'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { HostFrame, RemoteContext } from '@dsh-mobile/protocol'
import { RemoteAdapter } from '../src/remote-adapter.js'
import { FeedbackNotifications } from '../src/feedback-notifications.js'
import { registerFeedbackEvents } from '../src/feedback-events.js'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { DesktopFeedbackSync, type FeedbackEvents } from '../src/client/feedback-sync.js'

const cleanup: Array<() => Promise<unknown> | void> = []
afterEach(async () => {
  try { for (const dispose of cleanup.splice(0).reverse()) await dispose() }
  finally { vi.unstubAllEnvs() }
})

interface Capture {
  resourceLogs: Array<{ scopeLogs: Array<{ logRecords: Array<{
    attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string | number } }>
  }> }> }>
}

async function fixture() {
  const parent = resolve('artifacts/feedback-host-tests')
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-'))
  cleanup.push(async () => {
    // 测试目录由 mkdtemp 创建，删除前确认仍位于本项目产物目录。
    if (!resolve(root).startsWith(parent + sep)) throw new Error('unexpected test directory')
    await rm(root, { recursive: true, force: true })
  })
  vi.stubEnv('DSH_HOME', root)
  const captures: Capture[] = [], paths: string[] = []
  const collector = createServer((request, response) => {
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(chunk))
    request.on('end', () => {
      const raw = Buffer.concat(chunks)
      paths.push(request.url ?? '')
      captures.push(JSON.parse((request.headers['content-encoding'] === 'gzip' ? gunzipSync(raw) : raw).toString()))
      response.writeHead(200, { 'content-type': 'application/json' }).end('{}')
    })
  })
  collector.listen(0, '127.0.0.1')
  await once(collector, 'listening')
  cleanup.push(() => new Promise<void>((done, reject) => {
    collector.close(error => error ? reject(error) : done()); collector.closeAllConnections()
  }))
  const address = collector.address()
  if (!address || typeof address === 'string') throw new Error('missing collector port')
  const endpoint = `http://127.0.0.1:${address.port}/v1/logs`
  const captured = () => captures.flatMap(capture => capture.resourceLogs.flatMap(resource => resource.scopeLogs.flatMap(scope =>
    scope.logRecords.map(record => {
      const attr = (key: string) => record.attributes.find(item => item.key === key)?.value
      return [attr('session.id')?.stringValue, Number(attr('event.seq')?.intValue), attr('event.type')?.stringValue]
    }))))

  async function boot() {
    const ctx = new Context()
    cleanup.push(() => ctx.fiber.dispose())
    await ctx.plugin(CredentialsLocal, { path: join(root, 'credentials.yaml'), watch: false })
    await ctx.plugin(connection)
    await ctx.plugin(TypertRegistry)
    await ctx.plugin(TypertGateway)
    await ctx.plugin(SessionStore)
    await ctx.plugin(JsonlPersistence, { root: join(root, 'sessions'), compression: 'none' })
    await ctx.plugin(MessageFeedback, { maxNoteBytes: 65_536 })
    await ctx.plugin(Telemetry, { mode: SessionTelemetryMode.FEEDBACK_ONLY,
      exporter: { url: endpoint, timeoutMillis: 1000 },
      processor: { scheduledDelayMillis: 10, maxQueueSize: 512, maxExportBatchSize: 512, exportTimeoutMillis: 1500 } })
    const context: RemoteContext = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
    const notifications = new FeedbackNotifications(ctx)
    registerFeedbackEvents(ctx, notifications)
    const adapter = new RemoteAdapter({ version: '0.1.6-alpha.2', connection: ctx.connection, gateway: ctx.typertGateway,
      feedbackNotifications: notifications,
      // 本测试只经过 RPC；没有替换反馈、持久化、Gateway 或遥测服务。
      modules: { graph: () => ({ rev: 'unused', entries: [], batches: [] }), onGraphChanged: () => () => {}, fetchBundle: async () => new Response(null, { status: 404 }) },
    }, context.hostId)
    cleanup.push(() => adapter.dispose())
    async function rpc<T>(method: 'list' | 'put' | 'delete', request: unknown, identity = context): Promise<T> {
      const frames: HostFrame[] = [], id = randomUUID()
      await adapter.receive({ type: 'request', id, context: identity,
        operation: { method: 'remote.rpc', endpoint: `messageFeedback/${method}`, payload: { args: { request } } } }, frame => frames.push(frame))
      expect(frames).toHaveLength(1)
      const frame = frames[0]
      expect(frame).toMatchObject({ type: 'result', id, value: { ok: true } })
      if (frame?.type !== 'result') throw new Error('feedback RPC failed')
      return (frame.value as { ok: true; value: T }).value
    }
    const otherDevice = { ...context, deviceId: randomUUID(), connectionId: randomUUID() }
    const watch = (sessionId: string) => {
      const id = randomUUID(), frames: HostFrame[] = []
      const running = adapter.receive({ type: 'request', id, context: otherDevice,
        operation: { method: 'remote.feedbackFollow', sessionId } }, frame => frames.push(frame))
      return { frames, cancel: async () => { await adapter.receive({ type: 'cancel', id }, () => {}); await running } }
    }
    const desktop = async (sessionId: string) => {
      const response = await ctx.connection.createSharedFetchHandler('/api').fetch(new Request(`http://localhost/api/dsh-mobile/feedback-events?sessionId=${encodeURIComponent(sessionId)}`))
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
      const reader = response.body!.getReader()
      cleanup.push(() => reader.cancel())
      return { next: async () => {
        const chunk = await reader.read()
        if (chunk.done) throw new Error('unexpected end of feedback events')
        return JSON.parse(new TextDecoder().decode(chunk.value).slice(6))
      }, cancel: () => reader.cancel() }
    }
    return { ctx, adapter, rpc, otherDevice, watch, desktop }
  }
  const readEvents = async (ctx: Context, id: ReturnType<typeof SessionId>) => {
    const handle = await ctx.sessionPersistence.open(id, 'read')
    try { return (await handle.read()).events }
    finally { await handle.close() }
  }
  return { root, boot, captured, paths, readEvents }
}

function transcript(session: Session) {
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Isolated feedback fixture' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  const message = createAssistantMessage({ content: [{ type: 'text', text: 'Deterministic fixture, not a model response' }], source: { provider: 'fixture', model: 'fixture' } })
  session.append('assistant/message', { stream: [], turn: 1, step: 1, message }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  return message.id
}

function item(result: MessageFeedbackPutResult): MessageFeedbackItem {
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

test('Remote feedback crosses the original Gateway, live JSONL durability, CAS and loopback log export', async () => {
  const f = await fixture(), host = await f.boot()
  const session = host.ctx.sessions.create(SessionId('remote-feedback-live'), { meta: { cwd: f.root } })
  const writer = await host.ctx.sessionPersistence.create(session.header)
  cleanup.push(() => writer.close())
  const messageId = transcript(session), target = { sessionId: session.id, messageId }
  await host.ctx.sessions.flush(session)
  expect(await host.rpc<MessageFeedbackListResult>('list', { sessionId: session.id })).toEqual({ ok: true, value: { items: [] } })
  expect(f.captured()).toEqual([])
  const desktop = await host.desktop(session.id)
  expect(await desktop.next()).toEqual({ type: 'ready', revision: 0 })
  // 编译只读上游的原 controller；测试不复制它的缓存、写队列或 CAS 实现。
  const controllerFile = resolve('artifacts/desktop-original-feedback-controller.mjs')
  await build({ entryPoints: [resolve('../deepseek-harness/packages/client/ui-message-feedback/src/client/controller.ts')],
    outfile: controllerFile, bundle: true, platform: 'node', format: 'esm' })
  const { MessageFeedbackController } = await import(pathToFileURL(controllerFile).href)
  const controller = new MessageFeedbackController({ list: async (request: unknown) =>
    ({ ok: true, value: await host.rpc('list', request, host.otherDevice) }) }, session.id)
  const source: FeedbackEvents = { onmessage: null, onerror: null, close: () => {} }
  const sync = new DesktopFeedbackSync(() => source)
  cleanup.push(() => { sync.dispose(); controller.dispose() })
  sync.subscribe(controller, session.id, () => {})
  const dispatch = (message: unknown) => source.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))
  dispatch({ type: 'ready', revision: 0 })
  await expect.poll(() => controller.getSnapshot().status).toBe('ready')
  const put = item(await host.rpc<MessageFeedbackPutResult>('put', { ...target, rating: 'negative', category: 'other', note: 'Remote integration test', ifVersion: null }))
  const added = await desktop.next()
  expect(added).toEqual({ type: 'changed', revision: 1 }); dispatch(added)
  await expect.poll(() => controller.getSnapshot().items.get(messageId)).toEqual(put)
  expect(await host.rpc<MessageFeedbackListResult>('list', { sessionId: session.id }, host.otherDevice)).toEqual({ ok: true, value: { items: [put] } })
  const persisted = await f.readEvents(host.ctx, session.id)
  await expect.poll(f.captured).toEqual(persisted.map(event => [session.id, event.seq, event.type]))
  // 另一设备的旧版本写入必须失败，不能覆盖已提交值，也不能多发日志。
  expect(await host.rpc<MessageFeedbackPutResult>('put', { ...target, rating: 'positive', ifVersion: null }, host.otherDevice))
    .toEqual({ ok: false, error: { code: 'version-conflict', current: put } })
  expect(await f.readEvents(host.ctx, session.id)).toEqual(persisted)
  expect(await host.rpc<MessageFeedbackDeleteResult>('delete', { ...target, ifVersion: put.version }, host.otherDevice))
    .toEqual({ ok: true, value: { absent: true } })
  expect(await host.rpc<MessageFeedbackListResult>('list', { sessionId: session.id })).toEqual({ ok: true, value: { items: [] } })
  const after = await f.readEvents(host.ctx, session.id)
  await expect.poll(f.captured).toEqual(after.map(event => [session.id, event.seq, event.type]))
  expect(after.slice(persisted.length).map(event => event.type)).toEqual(['feedback/message-delete'])
  const removed = await desktop.next()
  expect(removed).toEqual({ type: 'changed', revision: 2 }); dispatch(removed)
  await expect.poll(() => controller.getSnapshot().items.size).toBe(0)
  await desktop.cancel()
  expect(f.paths.every(path => path === '/v1/logs')).toBe(true)
})

test('cold feedback survives a Host restart and only publishes feedback/committed, not live session events', async () => {
  const f = await fixture(), first = await f.boot(), id = SessionId('remote-feedback-cold')
  const session = Session.create(id, [], { version: SESSION_FORMAT_VERSION, id, createdAt: Date.now(), cwd: f.root, isSeeded: false })
  const messageId = transcript(session), target = { sessionId: id, messageId }
  const writer = await first.ctx.sessionPersistence.create(session.header)
  await writer.append(session.snapshotEvents()); await writer.flush(); await writer.close()
  const live: unknown[] = [], committed: unknown[] = []
  first.ctx.on('session/event', (_session, event) => { live.push(event) })
  first.ctx.on('feedback/committed', inspection => { committed.push(inspection.events.at(-1)?.type) })
  const watching = first.watch(id), unrelated = first.watch('another-session')
  const desktop = await first.desktop(id)
  expect(await desktop.next()).toEqual({ type: 'ready', revision: 0 })
  await expect.poll(() => watching.frames).toMatchObject([{ type: 'event', value: { type: 'ready', revision: 0 } }])
  const put = item(await first.rpc<MessageFeedbackPutResult>('put', { ...target, rating: 'positive', ifVersion: null }))
  expect(first.ctx.sessions.get(id)).toBeUndefined()
  expect(live).toEqual([]); expect(committed).toEqual(['feedback/message-put'])
  expect(await desktop.next()).toEqual({ type: 'changed', revision: 1 })
  await desktop.cancel()
  await expect.poll(() => watching.frames).toMatchObject([
    { type: 'event', value: { type: 'ready', revision: 0 } },
    { type: 'event', value: { type: 'changed', revision: 1 } },
  ])
  expect(unrelated.frames).toHaveLength(1)
  await watching.cancel(); await unrelated.cancel()
  const beforeRestart = await f.readEvents(first.ctx, id)
  await expect.poll(f.captured).toEqual(beforeRestart.map(event => [id, event.seq, event.type]))
  first.adapter.dispose(); await first.ctx.fiber.dispose()
  const second = await f.boot()
  const reconnected = second.watch(id)
  await expect.poll(() => reconnected.frames).toHaveLength(1)
  expect(await second.rpc<MessageFeedbackListResult>('list', { sessionId: id })).toEqual({ ok: true, value: { items: [put] } })
  const deleted = await second.rpc<MessageFeedbackDeleteResult>('delete', { ...target, ifVersion: put.version })
  expect(deleted).toEqual({ ok: true, value: { absent: true } })
  expect(second.ctx.sessions.get(id)).toBeUndefined()
  const afterRestart = await f.readEvents(second.ctx, id)
  expect(afterRestart.slice(0, beforeRestart.length)).toEqual(beforeRestart)
  expect(afterRestart.at(-1)?.type).toBe('feedback/message-delete')
  await expect.poll(() => reconnected.frames).toMatchObject([
    { type: 'event', value: { type: 'ready', revision: 0 } },
    { type: 'event', value: { type: 'changed', revision: 1 } },
  ])
  await reconnected.cancel()
  // 遥测游标是进程内的：重启后下一次反馈会重新释放当前规范前缀。
  await expect.poll(f.captured).toEqual([...beforeRestart, ...afterRestart].map(event => [id, event.seq, event.type]))
}, 15_000)

test('desktop feedback stream retains browser authentication and rejects malformed session queries', async () => {
  const f = await fixture(), host = await f.boot()
  expect(host.ctx.connection.requestRejection(new Request('http://localhost/api/dsh-mobile/feedback-events', { headers: { host: 'localhost' } }))).toBe(401)
  expect(host.ctx.connection.requestRejection(new Request('http://localhost/api/dsh-mobile/feedback-events', { headers: { host: 'attacker.example' } }))).toBe(403)
  const handler = host.ctx.connection.createSharedFetchHandler('/api')
  for (const query of ['', '?sessionId=', '?sessionId=a&sessionId=b', '?sessionId=a&secret=x', '?sessionId=%00', `?sessionId=${'a'.repeat(201)}`]) {
    expect((await handler.fetch(new Request(`http://localhost/api/dsh-mobile/feedback-events${query}`))).status).toBe(400)
  }
  const stream = await host.desktop('cancel')
  expect(await stream.next()).toEqual({ type: 'ready', revision: 0 })
  await stream.cancel()
  const next = await host.desktop('unload')
  expect(await next.next()).toEqual({ type: 'ready', revision: 0 })
  await host.ctx.fiber.dispose()
  await expect(next.next()).rejects.toThrow('unexpected end')
})
