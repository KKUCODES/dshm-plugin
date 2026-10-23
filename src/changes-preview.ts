import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { connectionFetch } from './connection-fetch.js'
import { MAX_CHANGES_BYTES, RESOURCE_CHUNK_BYTES, type HostFrame, type Operation } from '@dsh-mobile/protocol'
import type { ResourceWindow } from './resource-window.js'

/** 仅路由到原只读差异接口，路径/快照 ID 由电脑服务解析，不接受手机指定。 */
export async function streamChanges(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>,
  id: string, operation: Extract<Operation, { method: 'remote.changes' }>, signal: AbortSignal,
  window: ResourceWindow, emit: (frame: HostFrame) => void): Promise<void> {
  const url = new URL(operation.index === undefined ? '/api/changes.summary' : '/api/changes.diff', 'http://dsh.internal')
  url.searchParams.set('sessionId', operation.sessionId)
  url.searchParams.set('seq', String(operation.seq))
  if (operation.index !== undefined) url.searchParams.set('index', String(operation.index))
  const response = await connectionFetch(connection, new Request(url, { signal }))
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(response.status === 404 ? 'remote_changes_missing' : 'remote_changes_failed')
  }
  if (!response.headers.get('content-type')?.startsWith('application/json') || !response.body) {
    await response.body?.cancel(); throw new Error('remote_changes_invalid')
  }
  emit({ type: 'event', id, value: { type: 'metadata', sessionId: operation.sessionId, seq: operation.seq, ...(operation.index === undefined ? {} : { index: operation.index }) } })
  const reader = response.body.getReader()
  const abort = () => { void reader.cancel(signal.reason).catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  let offset = 0
  try {
    for (;;) {
      signal.throwIfAborted()
      const next = await reader.read()
      if (next.done) break
      if (offset + next.value.byteLength > MAX_CHANGES_BYTES) throw new Error('remote_changes_too_large')
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
