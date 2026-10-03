import { randomUUID } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import * as connection from '@deepseek-ai/dsh-client-connection'
import { afterEach, expect, test } from 'vitest'
import { type HostFrame, RESOURCE_CHUNK_BYTES } from '@dsh-mobile/protocol'
import { ResourceWindow } from '../src/resource-window.js'
import { streamOffice } from '../src/office-preview.js'

const disposers: Array<() => unknown> = []
afterEach(async () => { for (const close of disposers.splice(0).reverse()) await close() })
async function fixture({ changed = false, denied = false, invalid = false } = {}) {
  const ctx = new Context()
  ctx.provide('credentials', { readRecord: async () => undefined, modifyRecord: async (_: unknown, change: Function) => change(undefined) })
  const fiber = ctx.plugin(connection)
  await fiber.await(); disposers.push(() => fiber.dispose())
  const calls: Array<{ endpoint: string; args: unknown }> = []
  const pdf = Buffer.alloc(RESOURCE_CHUNK_BYTES * 7 + 13, 32); pdf.write('%PDF-1.7\n')
  const stop = ctx.connection.rpc.intercept('/api', () => true, async (endpoint, payload) => {
    if (!payload || typeof payload !== 'object' || !('args' in payload)) throw new Error('Invalid fixture RPC')
    calls.push({ endpoint, args: payload.args })
    if (endpoint === 'officeToPdf/render') return { ok: true, value: { absolutePath: '/work/a.docx', version: 'v1',
      generation: 'engine-1', missingFonts: ['Missing font'], offset: 0, eof: true, bytes: pdf.length, data: invalid ? 'bad' : pdf.toString('base64') } }
    if (endpoint === 'workspaceFiles/readBytes') return denied ? { ok: false, error: { code: 'workspace-file/not-found', message: 'missing', details: {} } }
      : { ok: true, value: { absolutePath: '/work/a.docx', version: changed ? 'v2' : 'v1' } }
    if (endpoint === 'officeToPdf/generation') return { ok: true, value: 'engine-1' }
    throw new Error('Unexpected endpoint')
  }); disposers.push(stop)
  return { connection: ctx.connection, calls, pdf }
}

test('Office results use original authorized RPC and bounded credited chunks, then recheck source and engine', async () => {
  const f = await fixture(), frames: HostFrame[] = [], window = new ResourceWindow(), id = randomUUID()
  const work = streamOffice(f.connection, id, 'original-session', 'a.docx', new AbortController().signal, window, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(5)
  expect(frames[0]).toMatchObject({ type: 'event', value: { type: 'metadata', missingFonts: ['Missing font'] } })
  expect(f.calls).toEqual([{ endpoint: 'officeToPdf/render', args: { workspaceFileScopeId: 'original-session', path: 'a.docx', priority: 'foreground' } }])
  window.acknowledge(4); await work
  const chunks = frames.filter((frame): frame is Extract<HostFrame, { type: 'event' }> => frame.type === 'event').slice(1)
  expect(Buffer.concat(chunks.map(frame => Buffer.from((frame.value as { data: string }).data, 'base64')))).toEqual(f.pdf)
  expect(frames.at(-1)).toEqual({ type: 'end', id })
  expect(f.calls.slice(1)).toEqual([
    { endpoint: 'workspaceFiles/readBytes', args: { workspaceFileScopeId: 'original-session', path: 'a.docx', range: { offset: 0, length: 1 } } },
    { endpoint: 'officeToPdf/generation', args: {} },
  ])
})

test('cancel while awaiting credit releases conversion result; late source/permission failure cannot end successfully', async () => {
  const f = await fixture(), frames: HostFrame[] = [], controller = new AbortController(), window = new ResourceWindow()
  const work = streamOffice(f.connection, randomUUID(), 's', 'a.docx', controller.signal, window, frame => frames.push(frame))
  const rejected = expect(work).rejects.toThrow()
  await expect.poll(() => frames.length).toBe(5); controller.abort(); await rejected
  expect(frames.some(frame => frame.type === 'end')).toBe(false)
  for (const mode of ['changed', 'denied', 'invalid'] as const) {
    const sample = await fixture({ [mode]: true }), output: HostFrame[] = [], credits = new ResourceWindow()
    const task = streamOffice(sample.connection, randomUUID(), 's', 'a.docx', new AbortController().signal, credits, frame => {
      output.push(frame)
      if (frame.type === 'event' && (frame.value as { type: string }).type === 'chunk') credits.acknowledge(1)
    })
    if (mode === 'denied') { await task; expect(output.at(-1)).toMatchObject({ type: 'result', value: { ok: false } }) }
    else await expect(task).rejects.toThrow(mode === 'changed' ? 'remote_file_changed' : 'invalid_remote_response')
    expect(output.some(frame => frame.type === 'end')).toBe(false)
  }
})

test('后台预览优先级传入原转换队列，仍执行结束前权限核验', async () => {
  const f = await fixture(), window = new ResourceWindow(), frames: HostFrame[] = []
  await streamOffice(f.connection, randomUUID(), 's', 'a.docx', new AbortController().signal, window, frame => {
    frames.push(frame)
    if (frame.type === 'event' && (frame.value as { type: string }).type === 'chunk') window.acknowledge(1)
  }, 'background')
  expect(f.calls[0]).toMatchObject({ args: { priority: 'background' } })
  expect(f.calls.at(-1)?.endpoint).toBe('officeToPdf/generation')
  expect(frames.at(-1)?.type).toBe('end')
})
