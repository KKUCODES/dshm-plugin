import { isProfileDshVersion } from './profile-dsh-version.js'
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { connectionFetch } from './connection-fetch.js'
import { MAX_OFFICE_PDF_BYTES, RESOURCE_CHUNK_BYTES, officeMetadataSchema, type HostFrame } from '@dsh-mobile/protocol'
import type { ResourceWindow } from './resource-window.js'
import { officeFileResponse, workspaceFilePayload, workspaceFileResponse } from './workspace-file-contract.js'

/** 固定调用原转换服务，保留 Session lookup 和 Host 文件权限；完整 PDF 不进入网关 JSON 帧。 */
export async function streamOffice(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>,
  id: string, sessionId: string, path: string, signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void,
  priority: 'foreground' | 'background' = 'foreground', version = '0.1.6-alpha.2') {
  const fetch = (request: Request) => connectionFetch(connection, request)
  const rpc = async (endpoint: string, args: Record<string, unknown>) => {
    const response = await fetch(new Request(`http://dsh.internal/api/${endpoint}`, { method: 'POST', signal,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: id, method: endpoint,
        payload: workspaceFilePayload(version, endpoint, { args }) }) }))
    if (!response.ok) { await response.body?.cancel(); throw new Error(`remote_http_${response.status}`) }
    const envelope = await (!isProfileDshVersion(version) ? response.json()
      : endpoint === 'officeToPdf/render' ? officeFileResponse(response, id, signal)
      : endpoint === 'workspaceFiles/readBytes' ? workspaceFileResponse(response, id, signal) : response.json())
    signal.throwIfAborted()
    if (envelope?.type !== 'server-response' || envelope.rpcId !== id || typeof envelope.result?.ok !== 'boolean') throw new Error('invalid_remote_response')
    return envelope.result
  }
  const result = await rpc('officeToPdf/render', { workspaceFileScopeId: sessionId, path, priority })
  if (!result.ok) { emit({ type: 'result', id, value: result }); return }
  const value = result.value
  if (typeof value?.data !== 'string' || value.data.length > Math.ceil(MAX_OFFICE_PDF_BYTES / 3) * 4) throw new Error('remote_office_too_large')
  const metadata = officeMetadataSchema.parse({ absolutePath: value.absolutePath, version: value.version, bytes: value.bytes,
    generation: value.generation, missingFonts: value.missingFonts })
  if (value.offset !== 0 || value.eof !== true) throw new Error('invalid_remote_response')
  const pdf = Buffer.from(value.data, 'base64')
  if (pdf.length !== metadata.bytes || pdf.toString('base64') !== value.data || !pdf.subarray(0, 8).toString('ascii').match(/^%PDF-\d\.\d/u)) throw new Error('invalid_remote_response')
  emit({ type: 'event', id, value: { type: 'metadata', ...metadata } })
  for (let offset = 0; offset < pdf.length; offset += RESOURCE_CHUNK_BYTES) {
    await window.take(signal)
    emit({ type: 'event', id, value: { type: 'chunk', offset, data: pdf.subarray(offset, offset + RESOURCE_CHUNK_BYTES).toString('base64') } })
  }
  // 转换和慢速传输期间可能改动源文件或权限，发布完整结果前重新读权限并核对身份。
  const latest = await rpc('workspaceFiles/readBytes', { workspaceFileScopeId: sessionId, path, range: { offset: 0, length: 1 } })
  if (!latest.ok) { emit({ type: 'result', id, value: latest }); return }
  if (latest.value.absolutePath !== metadata.absolutePath || latest.value.version !== metadata.version) throw new Error('remote_file_changed')
  const generation = await rpc('officeToPdf/generation', {})
  if (!generation.ok) { emit({ type: 'result', id, value: generation }); return }
  if (generation.value !== metadata.generation) throw new Error('remote_file_changed')
  emit({ type: 'end', id })
}
