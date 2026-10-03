import { randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type { Operation } from '@dsh-mobile/protocol'

/** 与 desktop-apps-v1 兼容补丁一致；只在电脑内部注入，不开放通用启动 RPC。 */
export interface DesktopApplications {
  list(signal?: AbortSignal): Promise<readonly string[]>
  icon?(appId: string, signal?: AbortSignal): Promise<{ contentType: 'image/png' | 'image/svg+xml'; bytes: Buffer } | null>
  open(appId: string, path: string, signal?: AbortSignal): Promise<{
    status: number; payload: { ok: true } | { code: string; message: string }
  }>
}
declare module '@deepseek-ai/cordis' { interface Context { dshmDesktopApps: DesktopApplications } }
export interface DesktopAppServices {
  apps: DesktopApplications
  sessions: Pick<Context['sessionController'], 'list' | 'workspaceDesktop'>
  fs: Pick<Context['fs'], 'resolve' | 'stat' | 'processPath' | 'processPathFromHostPath'>
}
type Prepare = Extract<Operation, { method: 'remote.prepareDesktopApp' }>
type Open = Extract<Operation, { method: 'remote.openDesktopApp' }>
type Workspace = { cwd: string; path: string }
type Snapshot = Workspace & { owner: string; sessionId: string; appId: string; services: DesktopAppServices; expires: number }

export class DesktopApps {
  private snapshots = new Map<string, Snapshot>()
  private preparing = new Map<string, symbol>()
  private lifetime = new AbortController()
  constructor(private provider: () => DesktopAppServices | undefined) {}

  private check(services: DesktopAppServices, signal: AbortSignal) {
    signal.throwIfAborted()
    if (this.provider() !== services) throw new Error('remote_desktop_stale')
    if (!services.sessions.workspaceDesktop().available) throw new Error('remote_desktop_unavailable')
  }

  private services(signal: AbortSignal) {
    signal.throwIfAborted()
    const services = this.provider()
    if (!services) throw new Error('remote_desktop_unavailable')
    this.check(services, signal)
    return services
  }

  private async workspace(services: DesktopAppServices, sessionId: string, signal: AbortSignal): Promise<Workspace> {
    // 原可见列表覆盖运行中和冷历史，不激活 Agent，也不接受手机提供的 cwd。
    const rows = await services.sessions.list({}, signal)
    this.check(services, signal)
    const cwd = rows.items.find(item => item.sessionId === sessionId)?.cwd
    if (!cwd || cwd.length > 4096 || /[\x00-\x1f\x7f]/.test(cwd)) throw new Error('remote_desktop_workspace_missing')
    const target = await services.fs.resolve(cwd, { signal })
    const path = services.fs.processPath(target)
    const mapped = services.fs.processPathFromHostPath(path)
    if (!isAbsolute(path) || mapped === undefined
      || services.fs.processPath(await services.fs.resolve(mapped, { signal })) !== path
      || (await services.fs.stat(target, signal))?.type !== 'directory') throw new Error('remote_desktop_workspace_missing')
    this.check(services, signal)
    return { cwd, path }
  }

  async list(sessionId: string, caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]), services = this.services(signal)
    const apps = await services.apps.list(signal)
    const workspace = await this.workspace(services, sessionId, signal)
    return { ...services.sessions.workspaceDesktop(), apps, workspacePath: workspace.path }
  }

  async prepare(owner: string, operation: Prepare, caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]), services = this.services(signal)
    for (const [id, item] of this.snapshots) if (item.owner === owner || item.expires <= Date.now()) this.snapshots.delete(id)
    if (this.snapshots.size + this.preparing.size >= 128) throw new Error('remote_desktop_busy')
    const token = Symbol(); this.preparing.set(owner, token)
    try {
      if (!(await services.apps.list(signal)).includes(operation.appId)) throw new Error('remote_desktop_app_missing')
      const workspace = await this.workspace(services, operation.sessionId, signal)
      if (this.preparing.get(owner) !== token) throw new Error('remote_desktop_stale')
      const snapshot = randomUUID()
      this.snapshots.set(snapshot, { ...workspace, owner, sessionId: operation.sessionId, appId: operation.appId,
        services, expires: Date.now() + 300000 })
      return { ...services.sessions.workspaceDesktop(), snapshot, appId: operation.appId, workspacePath: workspace.path }
    } finally { if (this.preparing.get(owner) === token) this.preparing.delete(owner) }
  }

  async icon(sessionId: string, appId: string, caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]), services = this.services(signal)
    if (!services.apps.icon) throw new Error('remote_desktop_unavailable')
    await this.workspace(services, sessionId, signal)
    if (!(await services.apps.list(signal)).includes(appId)) throw new Error('remote_desktop_app_missing')
    this.check(services, signal)
    const icon = await services.apps.icon(appId, signal)
    this.check(services, signal)
    if (icon === null) return { appId, contentType: null, data: null }
    if (!['image/png', 'image/svg+xml'].includes(icon.contentType) || !Buffer.isBuffer(icon.bytes)
      || icon.bytes.length === 0 || icon.bytes.length > 256 * 1024) throw new Error('remote_desktop_icon_invalid')
    // 图标上限远小于单帧2MiB；保持短请求，避免占用聊天长期订阅。
    return { appId, contentType: icon.contentType, data: icon.bytes.toString('base64') }
  }

  async open(owner: string, operation: Open, caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]); signal.throwIfAborted()
    const snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner || snapshot.sessionId !== operation.sessionId) throw new Error('remote_desktop_stale')
    // 消费后才进入副作用；超时、取消及失败都不允许重放同一确认。
    this.snapshots.delete(operation.snapshot)
    if (snapshot.expires <= Date.now()) throw new Error('remote_desktop_stale')
    const services = snapshot.services; this.check(services, signal)
    if (!(await services.apps.list(signal)).includes(snapshot.appId)) throw new Error('remote_desktop_app_missing')
    const workspace = await this.workspace(services, operation.sessionId, signal)
    if (workspace.cwd !== snapshot.cwd || workspace.path !== snapshot.path) throw new Error('remote_desktop_workspace_changed')
    const result = await services.apps.open(snapshot.appId, workspace.path, signal)
    signal.throwIfAborted()
    if (result.status !== 200 || !('ok' in result.payload) || result.payload.ok !== true) throw new Error('remote_desktop_launch_failed')
    return { opened: true }
  }

  dispose() { this.lifetime.abort(); this.snapshots.clear(); this.preparing.clear() }
}
