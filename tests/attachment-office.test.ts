import { Context, Service } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { OfficeToPdfRequest, OfficeToPdfResult } from '@deepseek-ai/dsh-office-to-pdf/types'
import { expect, test } from 'vitest'
import { RESOURCE_CHUNK_BYTES, type HostFrame } from '@dsh-mobile/protocol'
import { streamAttachmentOffice, type AttachmentOfficeProvider } from '../src/attachment-office.js'
import type { AttachmentServices } from '../src/attachment-preview.js'
import { ResourceWindow } from '../src/resource-window.js'

const ref = { attachmentId: brandString<FileAttachmentRef['attachmentId']>('original-office'), name: '附件.docx', bytes: 13 }
const request = { method: 'remote.attachmentOffice', sessionId: 'own-session', attachmentId: ref.attachmentId, name: ref.name } as const
function fixture({ corrupt = false, cache = false, limit = 100, invalidPdf = false, failure = false, priority = 'foreground' } = {}) {
  let referenced = true, reads = 0, conversions = 0, admit!: () => void
  const admitted = new Promise<void>(resolve => { admit = resolve })
  const bytes = Buffer.alloc(ref.bytes, 23), pdf = Buffer.alloc(7 * RESOURCE_CHUNK_BYTES + 13, 32)
  pdf.write(invalidPdf ? 'invalid!' : '%PDF-1.7\n')
  // 使用真实 Cordis 服务包装验证每次 ctx.get 的代理变化；转换器和附件存储是明确的边界夹具。
  class Converter extends Service implements AttachmentOfficeProvider {
    generation = brandString<OfficeToPdfResult['generation']>('generation-1')
    constructor(ctx: Context) { super(ctx, 'officeToPdf') }
    async convert(input: OfficeToPdfRequest, signal?: AbortSignal): Promise<OfficeToPdfResult> {
      conversions++; expect(reads).toBe(0)
      expect(input.extension).toBe('docx'); expect(input.priority).toBe(priority)
      expect(input.source.bytes).toBe(ref.bytes)
      await admitted; signal?.throwIfAborted()
      if (failure) throw Object.assign(new Error('private engine path'), { code: 'invalid-document' })
      if (!cache) {
        const read = await input.source.read(signal ?? new AbortController().signal, limit)
        expect(Buffer.from(read.bytes).equals(bytes)).toBe(true); expect(read.version).toBe(input.source.version)
      }
      return { pdf, missingFonts: ['Missing font'], cacheKey: brandString<OfficeToPdfResult['cacheKey']>('cache'), generation: this.generation }
    }
  }
  const ctx = new Context(), converter = new Converter(ctx)
  const services = { sessions: { inspect: async () => ({ events: referenced ? [{ type: 'user/message', data: { content: [{ type: 'file', attachment: ref }] } }] : [] }) },
    store: { async *readFileStream(received: unknown) { reads++; expect(received).toEqual(ref); yield bytes; if (corrupt) throw new Error('integrity_failure') } } } as unknown as AttachmentServices
  const get = (): AttachmentOfficeProvider | undefined => ctx.get('officeToPdf')
  return { services, get, converter, pdf, admit, remove: () => { referenced = false }, reads: () => reads, conversions: () => conversions }
}

test('后台附件预览保留原引用核验并传递队列优先级', async () => {
  const f = fixture({ priority: 'background' }), window = new ResourceWindow()
  f.admit()
  await streamAttachmentOffice(f.services, f.get, 'background', { ...request, priority: 'background' }, new AbortController().signal, window, frame => {
    if (frame.type === 'event' && (frame.value as { type: string }).type === 'chunk') window.acknowledge(1)
  })
  expect(f.reads()).toBe(1)
})

test('Office 附件先授权、队列准入后才读取，Cordis 代理变化不误报，输出遵守信用窗', async () => {
  const f = fixture(), frames: HostFrame[] = [], window = new ResourceWindow()
  expect(f.get()).not.toBe(f.get())
  const work = streamAttachmentOffice(f.services, f.get, 'stream', request, new AbortController().signal, window, frame => frames.push(frame))
  await expect.poll(f.conversions).toBe(1); expect(f.reads()).toBe(0)
  f.admit(); await expect.poll(() => frames.length).toBe(5)
  expect(frames[0]).toMatchObject({ type: 'event', value: { type: 'metadata', attachmentId: ref.attachmentId, name: ref.name, missingFonts: ['Missing font'] } })
  window.acknowledge(4); await work
  const chunks = frames.flatMap(frame => frame.type === 'event' && (frame.value as { type: string }).type === 'chunk' ? [frame.value as { data: string; offset: number }] : [])
  expect(Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data, 'base64'))).equals(f.pdf)).toBe(true)
  chunks.forEach((chunk, index) => { expect(chunk.offset).toBe(index * RESOURCE_CHUNK_BYTES); expect(Buffer.from(chunk.data, 'base64').length).toBeLessThanOrEqual(RESOURCE_CHUNK_BYTES) })
  expect(frames.at(-1)).toEqual({ type: 'end', id: 'stream' })
})

test('未引用或名称不符不能调用转换器；缓存命中仍须检查引用', async () => {
  for (const altered of [{ ...request, name: 'other.docx' }, { ...request, attachmentId: 'another' }]) {
    const f = fixture({ cache: true })
    await expect(streamAttachmentOffice(f.services, f.get, 's', altered, new AbortController().signal, new ResourceWindow(), () => {})).rejects.toThrow('remote_attachment_not_referenced')
    expect(f.conversions()).toBe(0)
  }
  const f = fixture({ cache: true }), frames: HostFrame[] = []
  const work = streamAttachmentOffice(f.services, f.get, 's', request, new AbortController().signal, new ResourceWindow(), frame => frames.push(frame))
  const rejected = expect(work).rejects.toThrow('remote_attachment_not_referenced')
  await expect.poll(f.conversions).toBe(1); f.remove(); f.admit(); await rejected
  expect(f.reads()).toBe(0); expect(frames).toEqual([])
})

test('附件读取容量、完整性、损坏 PDF 和原引擎失败不返回成功', async () => {
  for (const options of [{ limit: 1 }, { corrupt: true }, { invalidPdf: true }, { failure: true }]) {
    const f = fixture(options), frames: HostFrame[] = []
    f.admit()
    const work = streamAttachmentOffice(f.services, f.get, 's', request, new AbortController().signal, new ResourceWindow(), frame => frames.push(frame))
    if ('failure' in options) {
      await work; expect(frames).toEqual([{ type: 'result', id: 's', value: { ok: false, error: { code: 'document-render/failed', message: 'Office conversion failed.', details: { reason: 'invalid-document' } } } }])
    } else { await expect(work).rejects.toThrow(); expect(frames).toEqual([]) }
    if ('limit' in options) expect(f.reads()).toBe(0)
  }
})

test('最后一块后引用失效、转换器替换和背压等待取消都不能成功结束', async () => {
  for (const mode of ['reference', 'generation', 'cancel']) {
    const f = fixture(), frames: HostFrame[] = [], controller = new AbortController(), window = new ResourceWindow()
    f.admit()
    const work = streamAttachmentOffice(f.services, f.get, 's', request, controller.signal, window, frame => frames.push(frame))
    const rejected = expect(work).rejects.toThrow()
    await expect.poll(() => frames.length).toBe(5)
    if (mode === 'reference') f.remove()
    else if (mode === 'generation') f.converter.generation = brandString<OfficeToPdfResult['generation']>('generation-2')
    else controller.abort()
    if (mode !== 'cancel') window.acknowledge(4)
    await rejected; expect(frames.some(frame => frame.type === 'end')).toBe(false)
  }
})
