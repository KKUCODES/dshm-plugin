import { mkdir, mkdtemp, rm, readFile, writeFile, readdir, utimes, symlink, chmod } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import LocalAttachmentStore from '@deepseek-ai/dsh-attachment-local'
import { afterEach, expect, test, vi } from 'vitest'
import { AttachmentCopies, AttachmentDesktop } from '../src/attachment-desktop.js'
import type { AttachmentServices } from '../src/attachment-preview.js'
import type { WorkspaceDesktopServices } from '../src/workspace-desktop.js'

const cleanups: Array<() => Promise<unknown> | void> = []
afterEach(async () => { try { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() } finally { vi.restoreAllMocks() } })

async function fixture() {
  const parent = resolve('artifacts/attachment-desktop-tests'); await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-'))
  cleanups.push(async () => { if (!resolve(root).startsWith(parent + sep)) throw new Error('unexpected test directory'); await rm(root, { recursive: true, force: true }) })
  const ctx = new Context(), store = new LocalAttachmentStore(ctx, { dshHome: join(root, 'home') })
  cleanups.push(() => ctx.fiber.dispose())
  const data = Buffer.from('原始聊天附件\n'.repeat(18000)), ref = await store.saveFile({ name: 'report.txt', data })
  let referenced = true, failAtEnd = false, afterChunk = () => {}
  // 原本地 provider 负责真实磁盘、字节与摘要；会话接口为可撤销引用的边界替身。
  const attachments = { sessions: { inspect: async (sessionId: string) => {
    if (sessionId !== 'chat') throw new Error('session_missing')
    return { events: referenced ? [{ data: { content: [{ type: 'file', attachment: ref }] } }] : [] }
  }, attachment: async () => { throw new Error('unused') } }, store: { async *readFileStream(found: typeof ref, signal?: AbortSignal) {
    for await (const bytes of store.readFileStream(found, signal)) { yield bytes; afterChunk() }
    if (failAtEnd) throw new Error('late_integrity_failure')
  } } } as unknown as AttachmentServices
  const open = vi.fn(async (_request: { path: string }, _signal: AbortSignal) => ({ opened: true as const }))
  let current: Pick<WorkspaceDesktopServices, 'sessions'> = { sessions: { workspaceDesktop: () => ({ name: 'pc', available: true, fileManager: 'explorer' as const }), openWorkspacePath: open } }
  const copiesRoot = join(root, 'copies'), copies = new AttachmentCopies(copiesRoot)
  const desktop = new AttachmentDesktop(attachments, () => current, copies); cleanups.push(() => desktop.dispose())
  const request = { method: 'remote.prepareDesktopAttachment', sessionId: 'chat', kind: 'file', attachmentId: ref.attachmentId, name: ref.name } as const
  const signal = new AbortController().signal
  const prepare = () => desktop.prepare('device:connection', request, signal)
  const confirm = (snapshot: string, owner = 'device:connection', sessionId = 'chat', abort = signal) =>
    desktop.open(owner, { method: 'remote.openDesktopAttachment', sessionId, snapshot, confirmed: true }, abort)
  return { root, copiesRoot, copies, desktop, request, signal, attachments, data, ref, store, open, prepare, confirm,
    revoke: () => { referenced = false }, corrupt: () => { failAtEnd = true }, afterChunk: (fn: () => void) => { afterChunk = fn },
    replace: () => { current = { ...current } } }
}

test('历史原件经真实 provider 复制，取消准备不落盘、绑定身份且仅打开一次', async () => {
  const f = await fixture(), view = await f.prepare()
  expect(view).toMatchObject({ attachmentCopy: true, fileName: 'report.txt', available: true })
  await expect(readdir(f.copiesRoot)).rejects.toHaveProperty('code', 'ENOENT')
  for (const [owner, session] of [['other:connection', 'chat'], ['device:other', 'chat'], ['device:connection', 'other']])
    await expect(f.confirm(view.snapshot, owner, session)).rejects.toThrow('remote_desktop_stale')
  expect(await f.confirm(view.snapshot)).toEqual({ opened: true })
  const path = f.open.mock.calls[0]![0].path
  expect(path.startsWith(f.copiesRoot + sep)).toBe(true); expect(await readFile(path)).toEqual(f.data)
  await writeFile(path, 'edit only the disposable copy')
  const original: Uint8Array[] = []; for await (const part of f.store.readFileStream(f.ref)) original.push(part)
  expect(Buffer.concat(original)).toEqual(f.data)
  await expect(f.confirm(view.snapshot)).rejects.toThrow('remote_desktop_stale'); expect(f.open).toHaveBeenCalledTimes(1)
})

test('缺失引用、名称伪造、服务替换、过期、释放和源摘要损坏均不打开', async () => {
  for (const mode of ['reference', 'provider', 'expiry', 'dispose', 'digest']) {
    const f = await fixture(), view = await f.prepare()
    if (mode === 'reference') f.revoke()
    if (mode === 'provider') f.replace()
    if (mode === 'dispose') f.desktop.dispose()
    if (mode === 'expiry') vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001)
    if (mode === 'digest') {
      const hash = String(f.ref.attachmentId).slice(7)
      const source = join(f.root, 'home', 'attachments', 'v1', 'files', hash.slice(0, 2), hash, f.ref.name)
      await chmod(source, 0o600); await writeFile(source, Buffer.alloc(f.data.length, 65))
    }
    await expect(f.confirm(view.snapshot)).rejects.toThrow(); expect(f.open).not.toHaveBeenCalled(); vi.restoreAllMocks()
  }
  const f = await fixture()
  for (const patch of [{ name: '../report.txt' }, { attachmentId: 'other' }, { sessionId: 'other' }])
    await expect(f.desktop.prepare('device:connection', { ...f.request, ...patch }, f.signal)).rejects.toThrow()
})

test('最后分片后失败、在途取消与引用消失清除半成品；结果未知不重试', async () => {
  for (const mode of ['late', 'cancel', 'reference']) {
    const f = await fixture(), controller = new AbortController(), view = await f.prepare()
    if (mode === 'late') f.corrupt()
    if (mode === 'cancel') f.afterChunk(() => controller.abort())
    if (mode === 'reference') f.afterChunk(f.revoke)
    await expect(f.confirm(view.snapshot, 'device:connection', 'chat', controller.signal)).rejects.toThrow()
    expect(f.open).not.toHaveBeenCalled(); expect(await readdir(f.copiesRoot)).toEqual([])
  }
  const f = await fixture(), view = await f.prepare()
  f.open.mockRejectedValueOnce(new Error('native outcome unknown'))
  await expect(f.confirm(view.snapshot)).rejects.toThrow('native outcome unknown')
  await expect(f.confirm(view.snapshot)).rejects.toThrow('remote_desktop_stale'); expect(f.open).toHaveBeenCalledTimes(1)
  expect(await readFile(f.open.mock.calls[0]![0].path)).toEqual(f.data)
})

test('图片沿原会话附件服务，最终引用消失时拒绝且不读取文件 provider', async () => {
  const f = await fixture(), bytes = Buffer.from('provider-verified-image'), image = { attachmentId: f.ref.attachmentId, mediaType: 'image/png', bytes: bytes.length, width: 1, height: 1 } as const
  let reads = 0
  f.attachments.sessions.attachment = async () => { reads++; if (reads > 2) throw new Error('reference_removed'); return { attachment: image, data: bytes.toString('base64') } }
  const view = await f.desktop.prepare('device:connection', { ...f.request, kind: 'image' }, f.signal)
  expect(view.fileName).toBe('image.png')
  await expect(f.confirm(view.snapshot)).rejects.toThrow('reference_removed'); expect(f.open).not.toHaveBeenCalled()
  expect(await readdir(f.copiesRoot)).toEqual([])
})

test('临时副本容量固定，过期重用槽位，删除拒绝越界和链接目录', async () => {
  const f = await fixture(), directories = await Promise.all(Array.from({ length: 8 }, () => f.copies.reserve()))
  expect(new Set(directories).size).toBe(8)
  await expect(f.copies.reserve()).rejects.toThrow('remote_desktop_copy_capacity')
  await expect(f.copies.remove(f.root)).rejects.toThrow('remote_desktop_invalid')
  const past = new Date(Date.now() - 3600001); await utimes(directories[0]!, past, past)
  expect(await f.copies.reserve()).toBe(directories[0])
  await f.copies.remove(directories[0]!)
  const target = join(f.root, 'keep'); await mkdir(target); await writeFile(join(target, 'keep.txt'), 'keep')
  await symlink(target, directories[0]!, process.platform === 'win32' ? 'junction' : 'dir')
  await expect(f.copies.remove(directories[0]!)).rejects.toThrow('remote_desktop_invalid')
  await expect(f.copies.reserve()).rejects.toThrow('remote_desktop_copy_capacity')
  expect(await readFile(join(target, 'keep.txt'), 'utf8')).toBe('keep')
})
