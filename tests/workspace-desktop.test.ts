import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile, unlink, symlink } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import * as connection from '@deepseek-ai/dsh-client-connection'
import CredentialsLocal from '@deepseek-ai/dsh-credentials-local'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import TypertGateway from '@deepseek-ai/dsh-api-gateway'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import WorkspaceFiles from '@deepseek-ai/dsh-api-workspace-files'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import { afterEach, expect, test, vi } from 'vitest'
import { WorkspaceDesktop, type WorkspaceDesktopServices } from '../src/workspace-desktop.js'

const cleanups: Array<() => Promise<unknown> | void> = []
afterEach(async () => { try { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() } finally { vi.restoreAllMocks() } })

async function fixture() {
  const parent = resolve('artifacts/workspace-desktop-tests'); await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-'))
  cleanups.push(async () => { if (!resolve(root).startsWith(parent + sep)) throw new Error('unexpected test directory'); await rm(root, { recursive: true, force: true }) })
  const ctx = new Context(); cleanups.push(() => ctx.fiber.dispose())
  await ctx.plugin(CredentialsLocal, { path: join(root, 'credentials.yaml'), watch: false })
  await ctx.plugin(connection); await ctx.plugin(TypertRegistry); await ctx.plugin(TypertGateway); await ctx.plugin(SessionStore)
  await ctx.plugin(LocalFileSystem, { cwd: root })
  // 原文件权限、Session lookup、Gateway 均保留；只替换操作系统的最终窗口副作用。
  ctx.provide('sandboxPolicy', { workspaceRoot: root } as Context['sandboxPolicy'])
  await ctx.plugin(WorkspaceFiles, { maxBytes: 1024, maxFileBytes: 1024, maxLines: 100, maxEntries: 100 })
  ctx.sessions.create(SessionId('file-owner'), { meta: { cwd: root } })
  const path = join(root, 'report.txt'); await writeFile(path, 'original file')
  const open = vi.fn(async () => ({ opened: true as const }))
  let current: WorkspaceDesktopServices | undefined = { fs: ctx.fs, sessions: {
    workspaceDesktop: () => ({ name: 'pc', available: true, fileManager: 'explorer' as const }), openWorkspacePath: open,
  } }
  const files = new WorkspaceDesktop(ctx.connection, () => current)
  cleanups.push(() => files.dispose())
  const prepare = (file = 'report.txt', sessionId = 'file-owner', signal = new AbortController().signal) => files.prepare('device:connection', { method: 'remote.prepareDesktopFile', sessionId, path: file }, signal)
  const confirm = (snapshot: string, owner = 'device:connection', sessionId = 'file-owner', signal = new AbortController().signal) =>
    files.open(owner, { method: 'remote.openDesktopFile', sessionId, snapshot, confirmed: true }, signal)
  return { ctx, path, root, files, open, prepare, confirm, replace: () => { current = current && { ...current } } }
}

test('原 Session lookup 和原文件服务核验后，仅一次性快照可以请求桌面打开', async () => {
  const f = await fixture(), view = await f.prepare()
  expect(view).toMatchObject({ name: 'pc', available: true, fileName: 'report.txt' }); expect(f.open).not.toHaveBeenCalled()
  await expect(f.confirm(view.snapshot, 'other:connection')).rejects.toThrow('remote_desktop_stale')
  await expect(f.confirm(view.snapshot, 'device:other-connection')).rejects.toThrow('remote_desktop_stale')
  await expect(f.confirm(view.snapshot, 'device:connection', 'other')).rejects.toThrow('remote_desktop_stale')
  expect(await f.confirm(view.snapshot)).toEqual({ opened: true })
  expect(f.open).toHaveBeenCalledExactlyOnceWith({ path: await f.ctx.fs.processPath(await f.ctx.fs.resolve(f.path)) }, expect.any(AbortSignal))
  await expect(f.confirm(view.snapshot)).rejects.toThrow('remote_desktop_stale')
  await expect(f.confirm(randomUUID())).rejects.toThrow('remote_desktop_stale')
})

test('拒绝不存在的会话、文件、目录和最终符号链接；文件变更必须重新确认', async () => {
  const f = await fixture()
  for (const [path, session] of [['report.txt', 'absent'], ['absent.txt', 'file-owner'], ['.', 'file-owner']])
    await expect(f.prepare(path, session)).rejects.toThrow('remote_desktop_file_missing')
  const view = await f.prepare(); await writeFile(f.path, 'changed content with a different length')
  await expect(f.confirm(view.snapshot)).rejects.toThrow('remote_desktop_file_changed')
  const deleted = await f.prepare(); await unlink(f.path)
  await expect(f.confirm(deleted.snapshot)).rejects.toThrow('remote_desktop_file_missing')
  await mkdir(join(f.root, 'other')); await symlink(join(f.root, 'other'), f.path, process.platform === 'win32' ? 'junction' : 'dir')
  await expect(f.prepare()).rejects.toThrow('remote_desktop_file_missing')
  expect(f.open).not.toHaveBeenCalled()
})

test('取消、过期、服务替换和重建释放不打开；原生结果未知不重试', async () => {
  const f = await fixture(), aborted = new AbortController(); aborted.abort()
  await expect(f.prepare('report.txt', 'file-owner', aborted.signal)).rejects.toHaveProperty('name', 'AbortError')
  const expired = await f.prepare(), now = Date.now(); const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 300001)
  await expect(f.confirm(expired.snapshot)).rejects.toThrow('remote_desktop_stale'); clock.mockRestore()
  const replaced = await f.prepare(); f.replace(); await expect(f.confirm(replaced.snapshot)).rejects.toThrow('remote_desktop_stale')
  const disposed = await f.prepare(); f.files.dispose(); await expect(f.confirm(disposed.snapshot)).rejects.toThrow('remote_desktop_stale')
  const next = await f.prepare(); f.open.mockRejectedValueOnce(new Error('native result unknown'))
  await expect(f.confirm(next.snapshot)).rejects.toThrow('native result unknown')
  await expect(f.confirm(next.snapshot)).rejects.toThrow('remote_desktop_stale'); expect(f.open).toHaveBeenCalledTimes(1)
})
