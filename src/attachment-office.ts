import type { OfficeToPdf } from '@deepseek-ai/dsh-office-to-pdf'
import type { OfficeExtension, OfficeSourceKey } from '@deepseek-ai/dsh-office-to-pdf/types'
import { brandString } from '@deepseek-ai/dsh-brand'
import { attachmentOfficeMetadataSchema, MAX_OFFICE_PDF_BYTES, RESOURCE_CHUNK_BYTES, type HostFrame, type Operation } from '@dsh-mobile/protocol'
import { findFile, type AttachmentServices } from './attachment-preview.js'
import type { ResourceWindow } from './resource-window.js'

export type AttachmentOfficeProvider = Pick<OfficeToPdf, 'convert' | 'generation'>
type Request = Extract<Operation, { method: 'remote.attachmentOffice' }>

/** 先验证会话引用；只向原转换队列提供授权附件字节，不把显示名解释为电脑文件路径。 */
export async function streamAttachmentOffice(services: AttachmentServices, getProvider: () => AttachmentOfficeProvider | undefined,
  id: string, request: Request, signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void) {
  signal.throwIfAborted()
  const provider = getProvider()
  if (!provider) throw new Error('remote_office_unavailable')
  const generation = provider.generation
  const sessionId = brandString<Parameters<AttachmentServices['sessions']['inspect']>[0]>(request.sessionId)
  const ref = findFile((await services.sessions.inspect(sessionId, signal)).events, request)
  const extension = request.name.split('.').at(-1)?.toLowerCase()
  if (!['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension ?? '')) throw new Error('remote_operation_denied')
  const version = JSON.stringify([ref.attachmentId, ref.name, ref.bytes])
  const check = async (upstream: AbortSignal) => {
    const current = findFile((await services.sessions.inspect(sessionId, upstream)).events, request)
    // Cordis 每次读取服务可能创建新代理；原服务代次才代表转换器生命周期。
    if (current.bytes !== ref.bytes || getProvider()?.generation !== generation) throw new Error('remote_file_changed')
    upstream.throwIfAborted()
  }
  const result = await provider.convert({ extension: extension as OfficeExtension, priority: request.priority ?? 'foreground', source: {
    key: brandString<OfficeSourceKey>(JSON.stringify(['dsh-mobile:attachment', request.sessionId, ref.attachmentId, ref.name])),
    version, bytes: ref.bytes,
    // 原队列先预留容量再读源，不能在排队前缓存完整附件。
    read: async (upstream, maxBytes) => {
      await check(upstream)
      if (ref.bytes > maxBytes) throw new Error('remote_office_too_large')
      const chunks: Uint8Array[] = []; let length = 0
      for await (const chunk of services.store.readFileStream(ref, upstream)) {
        upstream.throwIfAborted(); length += chunk.byteLength
        if (length > maxBytes || length > ref.bytes) throw new Error('remote_office_too_large')
        chunks.push(chunk)
      }
      if (length !== ref.bytes) throw new Error('remote_attachment_invalid')
      await check(upstream)
      return { bytes: Buffer.concat(chunks, length), version }
    },
  } }, signal).catch((error: unknown) => {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
    // 原转换器的稳定失败原因，不向手机泄露引擎诊断和临时路径。
    if (typeof code === 'string' && ['input-too-large', 'output-too-large', 'invalid-document', 'unsupported-format', 'invalid-output', 'timeout', 'unavailable', 'failed', 'busy', 'source-changed'].includes(code)) {
      emit({ type: 'result', id, value: { ok: false, error: { code: 'document-render/failed', message: 'Office conversion failed.', details: { reason: code } } } })
      return undefined
    }
    throw error
  })
  if (!result) return
  signal.throwIfAborted()
  if (result.pdf.byteLength > MAX_OFFICE_PDF_BYTES) throw new Error('remote_office_too_large')
  if (!Buffer.from(result.pdf.subarray(0, 8)).toString('ascii').match(/^%PDF-\d\.\d/u)) throw new Error('invalid_remote_response')
  const metadata = attachmentOfficeMetadataSchema.parse({ attachmentId: ref.attachmentId, name: ref.name,
    bytes: result.pdf.byteLength, generation: result.generation, missingFonts: result.missingFonts })
  await check(signal)
  if (result.generation !== generation) throw new Error('remote_file_changed')
  emit({ type: 'event', id, value: { type: 'metadata', ...metadata } })
  for (let offset = 0; offset < result.pdf.byteLength; offset += RESOURCE_CHUNK_BYTES) {
    await window.take(signal)
    emit({ type: 'event', id, value: { type: 'chunk', offset, data: Buffer.from(result.pdf.subarray(offset, offset + RESOURCE_CHUNK_BYTES)).toString('base64') } })
  }
  await check(signal)
  if (result.generation !== generation) throw new Error('remote_file_changed')
  emit({ type: 'end', id })
}
