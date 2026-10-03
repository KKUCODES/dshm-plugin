import { randomUUID } from 'node:crypto'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { expect, test } from 'vitest'
import { type HostFrame, RESOURCE_CHUNK_BYTES } from '@dsh-mobile/protocol'
import { streamAttachment, type AttachmentServices } from '../src/attachment-preview.js'
import { ResourceWindow } from '../src/resource-window.js'

const ref = { attachmentId: brandString<FileAttachmentRef['attachmentId']>('opaque-file-id'), name: 'original.txt', bytes: 7 * RESOURCE_CHUNK_BYTES + 13 }
const request = { method: 'remote.attachment', sessionId: 'own-session', kind: 'file', attachmentId: ref.attachmentId, name: ref.name } as const
function fixture({ missing = false, corrupt = false, gone = false } = {}) {
  let reads = 0, inspections = 0
  const bytes = Buffer.alloc(ref.bytes, 75)
  const sessions = { inspect: async () => {
    inspections++
    return { events: missing || (gone && inspections > 1) ? [] : [{ type: 'user/message', data: { content: [{ type: 'file', attachment: ref }] } }] }
  }, attachment: async () => { throw new Error('unused') } }
  // 明确的会话/provider 边界替身；生产入口仍使用真实服务，在 Android 单独验收。
  const services = { sessions, store: { async *readFileStream(received: unknown, signal?: AbortSignal) {
    expect(received).toEqual(ref); reads++
    for (let offset = 0; offset < bytes.length; offset += 100000) { signal?.throwIfAborted(); yield bytes.subarray(offset, offset + 100000) }
    if (corrupt) throw new Error('provider_integrity_failure')
  } } } as unknown as AttachmentServices
  return { services, bytes, reads: () => reads }
}

test('附件 ID 必须属于会话，显示名不能绕过原引用；provider 字节受信用窗口约束', async () => {
  const f = fixture(), frames: HostFrame[] = [], window = new ResourceWindow(), id = randomUUID()
  const work = streamAttachment(f.services, id, request, new AbortController().signal, window, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(5)
  expect(frames[0]).toMatchObject({ type: 'event', value: { type: 'metadata', attachment: ref } })
  window.acknowledge(4)
  await expect.poll(() => frames.length).toBe(9)
  window.acknowledge(4); await work
  const chunks = frames.flatMap(frame => frame.type === 'event' && (frame.value as { type: string }).type === 'chunk' ? [frame.value as { data: string; offset: number }] : [])
  expect(Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data, 'base64')))).toEqual(f.bytes)
  let offset = 0
  for (const chunk of chunks) { expect(chunk.offset).toBe(offset); const size = Buffer.from(chunk.data, 'base64').length; expect(size).toBeLessThanOrEqual(RESOURCE_CHUNK_BYTES); offset += size }
  expect(frames.at(-1)).toEqual({ type: 'end', id })
  for (const altered of [{ ...request, name: '../original.txt' }, { ...request, attachmentId: 'another-id' }]) {
    const denied = fixture()
    await expect(streamAttachment(denied.services, id, altered, new AbortController().signal, new ResourceWindow(), () => {})).rejects.toThrow('remote_attachment_not_referenced')
    expect(denied.reads()).toBe(0)
  }
})

test('最后一块后完整性失败、引用消失、取消都不能形成成功结束', async () => {
  for (const mode of ['corrupt', 'gone'] as const) {
    const f = fixture({ [mode]: true }), output: HostFrame[] = [], window = new ResourceWindow()
    await expect(streamAttachment(f.services, randomUUID(), request, new AbortController().signal, window, frame => {
      output.push(frame); if (frame.type === 'event' && (frame.value as { type: string }).type === 'chunk') window.acknowledge(1)
    })).rejects.toThrow()
    expect(output.some(frame => frame.type === 'end')).toBe(false)
  }
  const f = fixture(), output: HostFrame[] = [], controller = new AbortController()
  const work = streamAttachment(f.services, randomUUID(), request, controller.signal, new ResourceWindow(), frame => output.push(frame))
  const rejected = expect(work).rejects.toThrow()
  await expect.poll(() => output.length).toBe(5); controller.abort(); await rejected
  expect(output.some(frame => frame.type === 'end')).toBe(false)
})

test('图片使用原 Session attachment 授权，不按客户端文件名或存储路径直接读取', async () => {
  const f = fixture(), output: HostFrame[] = [], bytes = Buffer.alloc(RESOURCE_CHUNK_BYTES * 5, 13)
  let asked: unknown
  f.services.sessions.attachment = async input => {
    asked = input
    return { attachment: { attachmentId: ref.attachmentId, name: 'picture.png', bytes: bytes.length,
      mediaType: 'image/png', width: 100, height: 100 }, data: bytes.toString('base64') }
  }
  const window = new ResourceWindow()
  await streamAttachment(f.services, randomUUID(), { ...request, kind: 'image' }, new AbortController().signal, window, frame => {
    output.push(frame); if (frame.type === 'event' && (frame.value as { type: string }).type === 'chunk') window.acknowledge(1)
  })
  expect(asked).toEqual({ sessionId: request.sessionId, attachmentId: ref.attachmentId })
  expect(f.reads()).toBe(0)
  expect(output.at(-1)?.type).toBe('end')
  f.services.sessions.attachment = async () => { throw new Error('not_referenced') }
  const denied: HostFrame[] = []
  await expect(streamAttachment(f.services, randomUUID(), { ...request, kind: 'image' }, new AbortController().signal, new ResourceWindow(), frame => denied.push(frame))).rejects.toThrow('not_referenced')
  expect(denied).toEqual([])
})
