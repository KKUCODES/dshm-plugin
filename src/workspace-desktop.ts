import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { connectionFetch } from './connection-fetch.js'
import type { Operation } from '@dsh-mobile/protocol'

export interface WorkspaceDesktopServices {
  fs: Pick<Context['fs'], 'processPathFromHostPath' | 'processPath' | 'resolve'>
  sessions: Pick<Context['sessionController'], 'workspaceDesktop' | 'openWorkspacePath'>
}
type Prepare = Extract<Operation, { method: 'remote.prepareDesktopFile' }>
type Open = Extract<Operation, { method: 'remote.openDesktopFile' }>
type File = { absolutePath: string; version: string }
type Snapshot = File & { owner: string; sessionId: string; path: string; services: WorkspaceDesktopServices; expires: number }

/** 路径仅作选择器；原 Session lookup/文件服务授权，一次性快照绑定已鉴权的设备连接。 */
export class WorkspaceDesktop {
  private snapshots = new Map<string, Snapshot>()
  constructor(private connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>,
    private provider: () => WorkspaceDesktopServices | undefined) {}

  private async stat(sessionId: string, path: string, signal: AbortSignal): Promise<File> {
    signal.throwIfAborted()
    const rpcId = randomUUID(), endpoint = 'workspaceFiles/stat'
    const response = await connectionFetch(this.connection, new Request(`http://dsh.internal/api/${endpoint}`, {
      method: 'POST', signal, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args: { workspaceFileScopeId: sessionId, path } } }),
    }))
    if (!response.ok) { await response.body?.cancel(); throw new Error('remote_desktop_file_missing') }
    const envelope = await response.json()
    signal.throwIfAborted()
    if (envelope?.type !== 'server-response' || envelope.rpcId !== rpcId || envelope.result?.ok !== true) throw new Error('remote_desktop_file_missing')
    const file = envelope.result.value
    if (typeof file?.absolutePath !== 'string' || !file.absolutePath || file.absolutePath.length > 4096
      || typeof file.version !== 'string' || !file.version || file.version.length > 4096) throw new Error('remote_desktop_invalid')
    return { absolutePath: file.absolutePath, version: file.version }
  }

  private async verify(services: WorkspaceDesktopServices, file: File, signal: AbortSignal) {
    if (this.provider() !== services || !services.sessions.workspaceDesktop().available) throw new Error('remote_desktop_unavailable')
    // 与原 present.open 一致：执行世界中的路径必须能够反向映射到真实 Host 文件。
    const mapped = services.fs.processPathFromHostPath(file.absolutePath)
    if (mapped === undefined || services.fs.processPath(await services.fs.resolve(mapped, { signal })) !== file.absolutePath) throw new Error('remote_desktop_file_missing')
    signal.throwIfAborted()
    if (this.provider() !== services) throw new Error('remote_desktop_stale')
  }

  async prepare(owner: string, operation: Prepare, signal: AbortSignal) {
    signal.throwIfAborted()
    for (const [id, item] of this.snapshots) if (item.owner === owner || item.expires <= Date.now()) this.snapshots.delete(id)
    const services = this.provider()
    if (!services) throw new Error('remote_desktop_unavailable')
    const file = await this.stat(operation.sessionId, operation.path, signal)
    await this.verify(services, file, signal)
    if (this.snapshots.size >= 128) throw new Error('remote_desktop_busy')
    const snapshot = randomUUID()
    this.snapshots.set(snapshot, { ...file, owner, sessionId: operation.sessionId, path: operation.path, services, expires: Date.now() + 300000 })
    return { ...services.sessions.workspaceDesktop(), snapshot, fileName: file.absolutePath.split(/[\\/]/).at(-1)! }
  }

  async open(owner: string, operation: Open, signal: AbortSignal) {
    signal.throwIfAborted()
    const snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner || snapshot.sessionId !== operation.sessionId) throw new Error('remote_desktop_stale')
    // 在副作用前消费；超时或断线时不把未知结果自动重试为第二次打开。
    this.snapshots.delete(operation.snapshot)
    if (snapshot.expires <= Date.now() || this.provider() !== snapshot.services) throw new Error('remote_desktop_stale')
    const file = await this.stat(snapshot.sessionId, snapshot.path, signal)
    if (file.absolutePath !== snapshot.absolutePath || file.version !== snapshot.version) throw new Error('remote_desktop_file_changed')
    await this.verify(snapshot.services, file, signal)
    await snapshot.services.sessions.openWorkspacePath({ path: file.absolutePath }, signal)
    signal.throwIfAborted()
    return { opened: true }
  }

  dispose() { this.snapshots.clear() }
}
