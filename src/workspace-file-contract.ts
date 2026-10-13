import { isProfileDshVersion } from './profile-dsh-version.js'
import { MAX_OFFICE_PDF_BYTES } from '@dsh-mobile/protocol'

/** 新版字节读取把 range 收进 options；自有读取器仍使用已有的有界 range 契约。 */
export function workspaceFilePayload(version: string, endpoint: string, payload: Record<string, unknown>) {
  if (!isProfileDshVersion(version) || endpoint !== 'workspaceFiles/readBytes') return payload
  const args = payload.args as Record<string, unknown> | undefined
  if (!args || !Object.hasOwn(args, 'range') || Object.hasOwn(args, 'options')) return payload
  const { range, ...rest } = args
  return { ...payload, args: { ...rest, options: { range } } }
}

/** 原文件读取只允许固定64KiB字节窗，不做通用附件解包。 */
export function workspaceFileResponse(response: Response, rpcId: string, signal: AbortSignal) {
  return fileBytesResponse(response, rpcId, signal, 65536)
}

/** 仅供固定Office转换流；保留现行PDF上限，不放宽普通文件读取。 */
export function officeFileResponse(response: Response, rpcId: string, signal: AbortSignal) {
  return fileBytesResponse(response, rpcId, signal, MAX_OFFICE_PDF_BYTES)
}

/** 两个已审核端点共用原HTTP字节附件契约，上限只由上方固定入口选择。 */
async function fileBytesResponse(response: Response, rpcId: string, signal: AbortSignal, maxBytes: number) {
  if (!response.headers.get('content-type')?.startsWith('multipart/form-data')) return response.json()
  const body = await response.formData()
  signal.throwIfAborted()
  const fields = new Map<string, FormDataEntryValue>()
  for (const [name, value] of body) {
    if (fields.has(name)) throw new Error('invalid_remote_response')
    fields.set(name, value)
  }
  const metadata = fields.get('metadata')
  if (typeof metadata !== 'string' || fields.size !== 2) throw new Error('invalid_remote_response')
  const envelope = JSON.parse(metadata)
  const attachment = envelope?.attachments?.[0]
  if (envelope?.type !== 'server-response' || envelope.rpcId !== rpcId || envelope.result?.ok !== true
    || envelope.result.value?.data !== null || !Array.isArray(envelope.attachments)
    || envelope.attachments.length !== 1 || attachment?.codec !== 'bytes'
    || attachment.part !== 'bytes-0' || JSON.stringify(attachment.path) !== '["data"]') throw new Error('invalid_remote_response')
  const bytes = fields.get('bytes-0')
  if (!(bytes instanceof Blob) || bytes.size > maxBytes) throw new Error('invalid_remote_response')
  const data = Buffer.from(await bytes.arrayBuffer()).toString('base64')
  signal.throwIfAborted()
  return { type: envelope.type, rpcId, result: { ok: true, value: { ...envelope.result.value, data } } }
}
