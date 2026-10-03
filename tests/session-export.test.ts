import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { expect, test } from 'vitest'
import { MAX_SESSION_EXPORT_BYTES, RESOURCE_CHUNK_BYTES, type HostFrame } from '@dsh-mobile/protocol'
import { streamSessionExport } from '../src/session-export.js'
import { ResourceWindow } from '../src/resource-window.js'

const operation = { method: 'remote.sessionExport', sessionId: 'session&?/#', includeDescendants: true } as const
function connection(response: Response) {
  return { createSharedFetchHandler(prefix: string) {
    expect(prefix).toBe('/api')
    return { async fetch(request: Request) {
      const url = new URL(request.url)
      expect(url.pathname).toBe('/api/session.export')
      expect(url.searchParams.get('sessionId')).toBe(operation.sessionId)
      expect(url.searchParams.get('includeDescendants')).toBe('true')
      return response
    } }
  } } as Pick<HostConnectionHandle, 'createSharedFetchHandler'>
}

test('复用固定原导出路由，四块信用窗口保留 ZIP 完整字节', async () => {
  const bytes = Buffer.alloc(RESOURCE_CHUNK_BYTES * 6 + 13, 71), frames: HostFrame[] = [], window = new ResourceWindow()
  const work = streamSessionExport(connection(new Response(bytes, { headers: { 'content-type': 'application/zip' } })),
    'export', operation, new AbortController().signal, window, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(5)
  expect(frames[0]).toMatchObject({ type: 'event', value: { type: 'metadata', sessionId: operation.sessionId, includeDescendants: true } })
  expect(frames.some(frame => frame.type === 'end')).toBe(false)
  window.acknowledge(4); await work
  const chunks = frames.flatMap(frame => frame.type === 'event' && (frame.value as { type: string }).type === 'chunk' ? [frame.value as { data: string }] : [])
  expect(Buffer.concat(chunks.map(value => Buffer.from(value.data, 'base64')))).toEqual(bytes)
  expect(frames.at(-1)).toEqual({ type: 'end', id: 'export' })
})

test('原路由错误、非 ZIP、流中途失败和取消均不能发送成功结束', async () => {
  for (const response of [new Response(null, { status: 404 }), new Response('html'),
    new Response(new ReadableStream({ pull(controller) { controller.error(new Error('export_failed')) } }), { headers: { 'content-type': 'application/zip' } })]) {
    const frames: HostFrame[] = []
    await expect(streamSessionExport(connection(response), 'export', operation, new AbortController().signal, new ResourceWindow(), frame => frames.push(frame))).rejects.toThrow()
    expect(frames.some(frame => frame.type === 'end')).toBe(false)
  }
  let canceled = false
  const response = new Response(new ReadableStream({ cancel() { canceled = true } }), { headers: { 'content-type': 'application/zip' } })
  const controller = new AbortController(), frames: HostFrame[] = []
  const work = streamSessionExport(connection(response), 'export', operation, controller.signal, new ResourceWindow(), frame => frames.push(frame))
  const rejected = expect(work).rejects.toThrow()
  await expect.poll(() => frames.length).toBe(1); controller.abort(); await rejected
  expect(canceled).toBe(true); expect(frames.some(frame => frame.type === 'end')).toBe(false)
})

test('日志超过归档上限会取消生产者，信用窗口耗尽时取消也不发 end', async () => {
  let produced = 0, canceled = false, ended = false
  const block = new Uint8Array(1024 * 1024), window = new ResourceWindow()
  const response = new Response(new ReadableStream({
    pull(controller) { produced += block.length; controller.enqueue(block) },
    cancel() { canceled = true },
  }), { headers: { 'content-type': 'application/zip' } })
  await expect(streamSessionExport(connection(response), 'export', operation, new AbortController().signal, window, frame => {
    if (frame.type === 'end') ended = true
    if (frame.type === 'event' && (frame.value as { type: string }).type === 'chunk') window.acknowledge(1)
  })).rejects.toThrow('remote_export_too_large')
  expect(produced).toBeLessThanOrEqual(MAX_SESSION_EXPORT_BYTES + 2 * block.length)
  expect(canceled).toBe(true); expect(ended).toBe(false)
  const controller = new AbortController(), frames: HostFrame[] = []
  const work = streamSessionExport(connection(new Response(block, { headers: { 'content-type': 'application/zip' } })),
    'export', operation, controller.signal, new ResourceWindow(), frame => frames.push(frame))
  const rejected = expect(work).rejects.toThrow()
  await expect.poll(() => frames.length).toBe(5); controller.abort(); await rejected
  expect(frames.some(frame => frame.type === 'end')).toBe(false)
})
