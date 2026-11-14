import type { SessionId } from '@deepseek-ai/dsh-session'
import type { AttachmentStore, FileAttachmentRef, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { brandString } from '@deepseek-ai/dsh-brand'
import { attachmentRefSchema, RESOURCE_CHUNK_BYTES, type HostFrame, type Operation } from '@dsh-mobile/protocol'
import type { ResourceWindow } from './resource-window.js'

export interface AttachmentServices {
  sessions: {
    inspect(sessionId: SessionId, signal: AbortSignal): Promise<{ events: readonly unknown[] }>
    attachment(request: { sessionId: SessionId; attachmentId: FileAttachmentRef['attachmentId'] }, signal: AbortSignal): Promise<{ attachment: unknown; data: string }>
  }
  store: Pick<AttachmentStore, 'readFileStream'>
}
export type AttachmentRequest = Omit<Extract<Operation, { method: 'remote.attachment' }>, 'method'>
type Request = Extract<Operation, { method: 'remote.attachment' }>
const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined

/** 只检查上游定义的消息内容位置；不把任意 JSON 中碰巧出现的 ID 当成授权。 */
export function findFile(events: readonly unknown[], request: Pick<Request, 'attachmentId' | 'name'>): FileAttachmentRef {
  const parsed = findReference(events, request.attachmentId, 'file', request.name)
  if (typeof parsed.name !== 'string' || parsed.mediaType !== undefined) throw new Error('remote_attachment_invalid')
  return { attachmentId: brandString<FileAttachmentRef['attachmentId']>(parsed.attachmentId), name: parsed.name, bytes: parsed.bytes }
}

export function findImage(events: readonly unknown[], attachmentId: string): ImageAttachmentRef {
  const parsed = findReference(events, attachmentId, 'image')
  const { mediaType, width, height, ...fields } = parsed
  if (!mediaType || width === undefined || height === undefined || parsed.bytes > 16 * 1024 * 1024) throw new Error('remote_attachment_invalid')
  return { ...fields, attachmentId: brandString<ImageAttachmentRef['attachmentId']>(attachmentId), mediaType, width, height }
}

function findReference(events: readonly unknown[], attachmentId: string, kind: 'file' | 'image', name?: string): ReturnType<typeof attachmentRefSchema.parse> {
  const content = (value: unknown): ReturnType<typeof attachmentRefSchema.parse> | undefined => {
    if (!Array.isArray(value)) return
    for (const part of value) {
      const block = object(part), ref = object(block?.attachment)
      if (block?.type === kind && ref?.attachmentId === attachmentId && (name === undefined || ref.name === name)) return attachmentRefSchema.parse(ref)
      if (block?.type === 'tool-result') { const nested = content(block.content); if (nested) return nested }
    }
  }
  for (const event of events) {
    const entry = object(event), data = object(entry?.data)
    if (kind === 'image') {
      // 沿用旧版 session/attachment 的第一方事件边界。
      let ref: ReturnType<typeof attachmentRefSchema.parse> | undefined
      switch (entry?.type) {
        case 'user/message': case 'tool/ptc-dispatch': ref = content(data?.content); break
        case 'system/message': case 'developer/message': case 'tool/result': case 'team/message/queued':
          ref = content(object(data?.message)?.content); break
        case 'agent/inbox/spliced':
          if (Array.isArray(data?.inserted)) for (const item of data.inserted) { ref = content(object(item)?.content); if (ref) break }
          break
        case 'compaction/summary': ref = content(data?.summary) ?? content(data?.rawOutput); break
        case 'assistant/message': case 'assistant/attempt':
          if (entry.type === 'assistant/message') ref = content(object(data?.message)?.content)
          if (!ref && Array.isArray(data?.stream)) for (const item of data.stream) {
            const record = object(item), chunk = object(record?.chunk)
            if (record?.type !== 'chunk' || chunk?.type !== 'block-end') continue
            ref = content([chunk.block]); if (ref) break
          }
          break
      }
      if (ref) return ref
      continue
    }
    const ref = content(data?.content) ?? content(object(data?.message)?.content)
    if (ref) return ref
    if (Array.isArray(data?.inserted)) for (const item of data.inserted) { const inserted = content(object(item)?.content); if (inserted) return inserted }
  }
  throw new Error('remote_attachment_not_referenced')
}

/** 预览与电脑副本共用原会话归属和 provider；调用方必须读到 EOF 并完成 check。 */
export async function attachmentSource(services: AttachmentServices, request: AttachmentRequest, signal: AbortSignal) {
  const sessionId = brandString<SessionId>(request.sessionId)
  let ref: ReturnType<typeof attachmentRefSchema.parse>, chunks: AsyncIterable<Uint8Array>, check: () => Promise<void>
  signal.throwIfAborted()
  if (request.kind === 'image') {
    // 原接口负责 assistant 流、嵌套工具结果、上下文和历史日志中的图片引用判断。
    const imageRequest = { sessionId, attachmentId: brandString<FileAttachmentRef['attachmentId']>(request.attachmentId) }
    const result = await services.sessions.attachment(imageRequest, signal)
    signal.throwIfAborted()
    ref = attachmentRefSchema.parse(result.attachment)
    if (ref.attachmentId !== request.attachmentId || !ref.mediaType || ref.bytes > 16 * 1024 * 1024
      || result.data.length > Math.ceil(ref.bytes / 3) * 4) throw new Error('remote_attachment_invalid')
    const bytes = Buffer.from(result.data, 'base64')
    if (bytes.length !== ref.bytes || bytes.toString('base64') !== result.data) throw new Error('remote_attachment_invalid')
    chunks = (async function* () { yield bytes })()
    check = async () => {
      const latest = attachmentRefSchema.parse((await services.sessions.attachment(imageRequest, signal)).attachment)
      if (latest.attachmentId !== ref.attachmentId || latest.bytes !== ref.bytes
        || latest.mediaType !== ref.mediaType) throw new Error('remote_attachment_invalid')
      signal.throwIfAborted()
    }
  } else {
    const found = findFile((await services.sessions.inspect(sessionId, signal)).events, request)
    ref = attachmentRefSchema.parse(found)
    chunks = services.store.readFileStream(found, signal)
    check = async () => {
      const latest = findFile((await services.sessions.inspect(sessionId, signal)).events, request)
      if (latest.bytes !== found.bytes) throw new Error('remote_attachment_invalid')
    }
  }
  return { ref, chunks, check }
}

/** 附件内容由原 provider 校验；完整性失败即使发生在最后一块后，也不能发成功结束。 */
export async function streamAttachment(services: AttachmentServices, id: string, request: Request,
  signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void) {
  const { ref, chunks, check } = await attachmentSource(services, request, signal)
  emit({ type: 'event', id, value: { type: 'metadata', attachment: ref } })
  let offset = 0
  for await (const part of chunks) {
    signal.throwIfAborted()
    if (offset + part.byteLength > ref.bytes) throw new Error('remote_attachment_invalid')
    for (let start = 0; start < part.byteLength; start += RESOURCE_CHUNK_BYTES) {
      await window.take(signal)
      const bytes = part.subarray(start, start + RESOURCE_CHUNK_BYTES)
      emit({ type: 'event', id, value: { type: 'chunk', offset, data: Buffer.from(bytes).toString('base64') } })
      offset += bytes.byteLength
    }
  }
  if (offset !== ref.bytes) throw new Error('remote_attachment_invalid')
  await check(); signal.throwIfAborted()
  emit({ type: 'end', id })
}
