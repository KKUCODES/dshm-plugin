import type { SessionController } from '@deepseek-ai/dsh-api-session-controller'
import type { AttachmentStore, FileAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { brandString } from '@deepseek-ai/dsh-brand'
import { attachmentRefSchema, RESOURCE_CHUNK_BYTES, type HostFrame, type Operation } from '@dsh-mobile/protocol'
import type { ResourceWindow } from './resource-window.js'

export interface AttachmentServices {
  sessions: Pick<SessionController, 'inspect' | 'attachment'>
  store: Pick<AttachmentStore, 'readFileStream'>
}
export type AttachmentRequest = Omit<Extract<Operation, { method: 'remote.attachment' }>, 'method'>
type Request = Extract<Operation, { method: 'remote.attachment' }>
const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined

/** 只检查上游定义的消息内容位置；不把任意 JSON 中碰巧出现的 ID 当成授权。 */
export function findFile(events: readonly unknown[], request: Pick<Request, 'attachmentId' | 'name'>): FileAttachmentRef {
  const content = (value: unknown): FileAttachmentRef | undefined => {
    if (!Array.isArray(value)) return
    for (const part of value) {
      const block = object(part), ref = object(block?.attachment)
      if (block?.type === 'file' && ref?.attachmentId === request.attachmentId && ref.name === request.name) {
        const parsed = attachmentRefSchema.parse(ref)
        if (typeof parsed.name !== 'string' || parsed.mediaType !== undefined) throw new Error('remote_attachment_invalid')
        return { attachmentId: brandString<FileAttachmentRef['attachmentId']>(parsed.attachmentId), name: parsed.name, bytes: parsed.bytes }
      }
      if (block?.type === 'tool-result') { const nested = content(block.content); if (nested) return nested }
    }
  }
  for (const event of events) {
    const data = object(object(event)?.data)
    const ref = content(data?.content) ?? content(object(data?.message)?.content)
    if (ref) return ref
    if (Array.isArray(data?.inserted)) for (const item of data.inserted) { const inserted = content(object(item)?.content); if (inserted) return inserted }
  }
  throw new Error('remote_attachment_not_referenced')
}

/** 预览与电脑副本共用原会话归属和 provider；调用方必须读到 EOF 并完成 check。 */
export async function attachmentSource(services: AttachmentServices, request: AttachmentRequest, signal: AbortSignal) {
  const sessionId = brandString<Parameters<SessionController['inspect']>[0]>(request.sessionId)
  let ref: ReturnType<typeof attachmentRefSchema.parse>, chunks: AsyncIterable<Uint8Array>, check: () => Promise<void>
  signal.throwIfAborted()
  if (request.kind === 'image') {
    // 原接口负责 assistant 流、嵌套工具结果、上下文和历史日志中的图片引用判断。
    const result = await services.sessions.attachment({ sessionId, attachmentId: brandString<FileAttachmentRef['attachmentId']>(request.attachmentId) })
    signal.throwIfAborted()
    ref = attachmentRefSchema.parse(result.attachment)
    if (ref.attachmentId !== request.attachmentId || !ref.mediaType || ref.bytes > 16 * 1024 * 1024
      || result.data.length > Math.ceil(ref.bytes / 3) * 4) throw new Error('remote_attachment_invalid')
    const bytes = Buffer.from(result.data, 'base64')
    if (bytes.length !== ref.bytes || bytes.toString('base64') !== result.data) throw new Error('remote_attachment_invalid')
    chunks = (async function* () { yield bytes })()
    check = async () => {
      const latest = await services.sessions.attachment({ sessionId, attachmentId: brandString<FileAttachmentRef['attachmentId']>(request.attachmentId) })
      if (latest.attachment.attachmentId !== ref.attachmentId || latest.attachment.bytes !== ref.bytes
        || latest.attachment.mediaType !== ref.mediaType) throw new Error('remote_attachment_invalid')
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
