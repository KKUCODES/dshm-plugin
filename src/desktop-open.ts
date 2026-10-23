import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { connectionFetch } from './connection-fetch.js'
import type { Operation } from '@dsh-mobile/protocol'

type DesktopOperation = Extract<Operation, { method: 'remote.desktop' | 'remote.openFile' }>

/** 复用原交付物路由的记录归属、文件权限及真实 Host 路径验证，不开放任意路径或 URL。 */
export async function desktopOpen(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>,
  operation: DesktopOperation, signal: AbortSignal) {
  signal.throwIfAborted()
  const metadata = operation.method === 'remote.desktop'
  const path = metadata ? '/api/present.host'
    : `${operation.source === 'presented' ? '/api/present.open' : '/api/changes.open'}?${new URLSearchParams({
      sessionId: operation.sessionId, seq: String(operation.seq), index: String(operation.index),
      ...(operation.action === 'reveal' ? { action: 'reveal' } : {}),
    })}`
  const response = await connectionFetch(connection, new Request(`http://dsh.internal${path}`, {
    method: metadata ? 'GET' : 'POST', signal,
  }))
  signal.throwIfAborted()
  if (!response.ok) {
    await response.body?.cancel()
    // 不转发 Host 的原始错误正文，也不把未知结果自动重试成第二次打开。
    throw new Error(response.status === 404 ? 'remote_desktop_file_missing'
      : response.status === 409 ? 'remote_desktop_unavailable' : 'remote_desktop_open_failed')
  }
  if (!metadata) {
    await response.body?.cancel()
    if (response.status !== 204) throw new Error('remote_desktop_invalid')
    return { opened: true }
  }
  const value = await response.json()
  signal.throwIfAborted()
  if (typeof value?.name !== 'string' || value.name.length > 255 || typeof value.available !== 'boolean'
    || ![null, 'finder', 'explorer', 'directory'].includes(value.fileManager)) throw new Error('remote_desktop_invalid')
  return { name: value.name, available: value.available, fileManager: value.fileManager }
}
