import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { MAX_SESSION_EXPORT_BYTES, RESOURCE_CHUNK_BYTES, type HostFrame, type Operation } from '@dsh-mobile/protocol'
import type { ResourceWindow } from './resource-window.js'

/** ZIP 内容与快照语义全部来自原 DSH 导出路由；手机不能指定路径或 URL。 */
export async function streamSessionExport(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>,
  id: string, operation: Extract<Operation, { method: 'remote.sessionExport' }>, signal: AbortSignal,
  window: ResourceWindow, emit: (frame: HostFrame) => void): Promise<void> {
  const url = new URL('/api/session.export', 'http://dsh.internal')
  url.searchParams.set('sessionId', operation.sessionId)
  url.searchParams.set('includeDescendants', String(operation.includeDescendants))
  const response = await connection.createSharedFetchHandler('/api').fetch(new Request(url, { signal }))
  if (!response.ok || !response.body || response.headers.get('content-type')?.split(';')[0] !== 'application/zip') {
    await response.body?.cancel()
    throw new Error(response.status === 404 ? 'remote_export_missing' : 'remote_export_failed')
  }
  emit({ type: 'event', id, value: { type: 'metadata', sessionId: operation.sessionId, includeDescendants: operation.includeDescendants } })
  const reader = response.body.getReader()
  const abort = () => { void reader.cancel(signal.reason).catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  let offset = 0
  try {
    for (;;) {
      signal.throwIfAborted()
      const next = await reader.read()
      if (next.done) break
      if (offset + next.value.byteLength > MAX_SESSION_EXPORT_BYTES) throw new Error('remote_export_too_large')
      for (let at = 0; at < next.value.byteLength; at += RESOURCE_CHUNK_BYTES) {
        await window.take(signal)
        const bytes = next.value.subarray(at, at + RESOURCE_CHUNK_BYTES)
        emit({ type: 'event', id, value: { type: 'chunk', offset, data: Buffer.from(bytes).toString('base64') } })
        offset += bytes.length
      }
    }
    signal.throwIfAborted()
    emit({ type: 'end', id })
  } finally {
    signal.removeEventListener('abort', abort)
    await reader.cancel().catch(() => {}); reader.releaseLock()
  }
}
