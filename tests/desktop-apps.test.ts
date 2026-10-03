import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import { SessionId } from '@deepseek-ai/dsh-session'
import { afterEach, expect, test, vi } from 'vitest'
import { DesktopApps, type DesktopAppServices } from '../src/desktop-apps.js'

const cleanups: Array<() => Promise<unknown> | void> = []
afterEach(async () => { try { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() } finally { vi.restoreAllMocks() } })
async function fixture() {
  const parent = resolve('artifacts/desktop-apps-adapter-tests'); await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-')), other = join(root, 'other'); await mkdir(other)
  cleanups.push(async () => { if (!resolve(root).startsWith(parent + sep)) throw new Error('unexpected test directory'); await rm(root, { recursive: true, force: true }) })
  const ctx = new Context(); cleanups.push(() => ctx.fiber.dispose()); await ctx.plugin(LocalFileSystem, { cwd: root })
  // 路径使用真实 LocalFileSystem；可见会话查询和最终平台启动是明确隔离替身。
  let cwd = root, visible = true, available = true
  const list = vi.fn(async () => ({ items: visible ? [{ sessionId: SessionId('own'), cwd, updatedAt: 0, running: false, blank: false }] : [] }))
  const open = vi.fn(async () => ({ status: 200, payload: { ok: true as const } }))
  const apps = vi.fn(async (): Promise<readonly string[]> => ['vscode', 'explorer'])
  let services: DesktopAppServices = { fs: ctx.fs, sessions: { list,
    workspaceDesktop: () => ({ name: 'test-pc', available, fileManager: 'explorer' }) }, apps: { list: apps, open } }
  const subject = new DesktopApps(() => services); cleanups.push(() => subject.dispose())
  const signal = new AbortController().signal
  const prepare = (appId = 'vscode', caller = signal) => subject.prepare('device:connection', { method: 'remote.prepareDesktopApp', sessionId: 'own', appId }, caller)
  const confirm = (snapshot: string, owner = 'device:connection', sessionId = 'own', caller = signal) =>
    subject.open(owner, { method: 'remote.openDesktopApp', sessionId, snapshot, confirmed: true }, caller)
  return { root, other, subject, services, apps, open, list, signal, prepare, confirm,
    cwd: (value: string) => { cwd = value }, hide: () => { visible = false }, disable: () => { available = false },
    replace: () => { services = { ...services } } }
}

test('查询与准备不启动；同设备连接/会话的确认仅能打开一次', async () => {
  const f = await fixture()
  const view = await f.subject.list('own', f.signal), prepared = await f.prepare()
  expect(view).toMatchObject({ name: 'test-pc', apps: ['vscode', 'explorer'] })
  expect(prepared.workspacePath).toBe(view.workspacePath); expect(f.open).not.toHaveBeenCalled()
  for (const [owner, session] of [['other:connection', 'own'], ['device:new', 'own'], ['device:connection', 'other']])
    await expect(f.confirm(prepared.snapshot, owner, session)).rejects.toThrow('remote_desktop_stale')
  await expect(f.confirm(prepared.snapshot)).resolves.toEqual({ opened: true })
  expect(f.open).toHaveBeenCalledExactlyOnceWith('vscode', view.workspacePath, expect.any(AbortSignal))
  await expect(f.confirm(prepared.snapshot)).rejects.toThrow('remote_desktop_stale')
})

test('图标先核验会话和已探测应用，再返回有界图片', async () => {
  const f = await fixture()
  const icon = vi.fn(async () => ({ contentType: 'image/png' as const, bytes: Buffer.from('icon') }))
  f.services.apps.icon = icon
  expect(await f.subject.icon('own', 'vscode', f.signal)).toEqual({ appId: 'vscode', contentType: 'image/png', data: Buffer.from('icon').toString('base64') })
  await expect(f.subject.icon('own', 'unknown', f.signal)).rejects.toThrow('app_missing')
  f.hide(); await expect(f.subject.icon('own', 'vscode', f.signal)).rejects.toThrow('workspace_missing')
  expect(icon).toHaveBeenCalledTimes(1); expect(f.open).not.toHaveBeenCalled()
})

test('图标不支持、超限或旧服务迟到时不交付', async () => {
  const f = await fixture()
  await expect(f.subject.icon('own', 'vscode', f.signal)).rejects.toThrow('unavailable')
  f.services.apps.icon = async () => ({ contentType: 'image/png', bytes: Buffer.alloc(256 * 1024 + 1) })
  await expect(f.subject.icon('own', 'vscode', f.signal)).rejects.toThrow('icon_invalid')
  let release!: (value: null) => void
  const started = new Promise<void>(ready => {
    f.services.apps.icon = async () => { ready(); return new Promise(resolve => { release = resolve }) }
  })
  const pending = f.subject.icon('own', 'vscode', f.signal); await started
  f.replace(); release(null); await expect(pending).rejects.toThrow('stale')
  expect(f.open).not.toHaveBeenCalled()
})

test('不可见会话、未知应用、非目录和工作区改变不启动', async () => {
  const f = await fixture()
  await expect(f.subject.list('absent', f.signal)).rejects.toThrow('remote_desktop_workspace_missing')
  await expect(f.prepare('unknown')).rejects.toThrow('remote_desktop_app_missing')
  const prepared = await f.prepare(); f.cwd(f.other)
  await expect(f.confirm(prepared.snapshot)).rejects.toThrow('remote_desktop_workspace_changed')
  const file = join(f.root, 'file'); await writeFile(file, 'text'); f.cwd(file)
  await expect(f.prepare()).rejects.toThrow('remote_desktop_workspace_missing')
  f.cwd(f.root); const hidden = await f.prepare(); f.hide()
  await expect(f.confirm(hidden.snapshot)).rejects.toThrow('remote_desktop_workspace_missing')
  expect(f.open).not.toHaveBeenCalled()
})

test('应用消失、桌面关闭、服务替换、超时及未知结果不重放', async () => {
  const f = await fixture(), expired = await f.prepare(), now = Date.now()
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 300001)
  await expect(f.confirm(expired.snapshot)).rejects.toThrow('remote_desktop_stale'); clock.mockRestore()
  const replaced = await f.prepare(); f.replace()
  await expect(f.confirm(replaced.snapshot)).rejects.toThrow('remote_desktop_stale')
  const missing = await f.prepare(); f.apps.mockResolvedValueOnce([])
  await expect(f.confirm(missing.snapshot)).rejects.toThrow('remote_desktop_app_missing')
  const unknown = await f.prepare(); f.open.mockRejectedValueOnce(new Error('unknown'))
  await expect(f.confirm(unknown.snapshot)).rejects.toThrow('unknown')
  await expect(f.confirm(unknown.snapshot)).rejects.toThrow('remote_desktop_stale')
  const disabled = await f.prepare(); f.disable()
  await expect(f.confirm(disabled.snapshot)).rejects.toThrow('remote_desktop_unavailable')
  expect(f.open).toHaveBeenCalledTimes(1)
})

test('取消、卸载和迟到准备不能发布可用快照或启动', async () => {
  const f = await fixture(), cancelled = new AbortController(); cancelled.abort()
  await expect(f.prepare('vscode', cancelled.signal)).rejects.toHaveProperty('name', 'AbortError')
  let release!: (value: readonly string[]) => void
  f.apps.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  const old = f.prepare(); const latest = await f.prepare('explorer')
  release(['vscode']); await expect(old).rejects.toThrow('remote_desktop_stale')
  await expect(f.confirm(latest.snapshot)).resolves.toEqual({ opened: true })
  const controller = new AbortController(), prepared = await f.prepare()
  f.apps.mockImplementationOnce(async () => { controller.abort(); return ['vscode'] })
  await expect(f.confirm(prepared.snapshot, 'device:connection', 'own', controller.signal)).rejects.toHaveProperty('name', 'AbortError')
  f.apps.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  const pending = f.prepare(); f.subject.dispose(); release(['vscode'])
  await expect(pending).rejects.toHaveProperty('name', 'AbortError')
  expect(f.open).toHaveBeenCalledTimes(1)
})
