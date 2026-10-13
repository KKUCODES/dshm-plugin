import type { JobId, JobStatus } from '@deepseek-ai/dsh-jobs'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { OutputRequest } from './job-output.js'

/** DSH 0.2.1 的公开 JobView / readAt 契约；旧版没有这个服务面。 */
export interface RingJobRegistry {
  get(id: JobId, caller: SessionId): { startedAt: number; status: JobStatus; output: { total: number; earliest: number } }
  kill(id: JobId, caller: SessionId, reason?: string): 'requested' | 'already-finished'
  readAt(id: JobId, from: number, caller: SessionId): {
    next: number; lossy: boolean
    chunks: readonly { at: number; text: string; channel?: string; gapBefore?: true }[]
  }
}

/** 新版所有 channel 共用字节坐标，不能冒充旧版每个 stdout/stderr 的独立字节坐标。 */
export function ringOutput(registry: RingJobRegistry, id: JobId, caller: SessionId, request: OutputRequest) {
  const job = registry.get(id, caller)
  const result = registry.readAt(id, request.fromByte, caller)
  const startOffset = Math.max(request.fromByte, job.output.earliest)
  const nextOffset = Math.min(startOffset + request.maxBytes, result.next)
  if (startOffset > result.next) throw Error('remote_job_output_failed')
  const buffers: Buffer[] = []
  let producerGap = false
  for (const chunk of result.chunks) {
    if (chunk.at >= nextOffset) break
    const bytes = Buffer.from(chunk.text)
    const begin = Math.max(startOffset, chunk.at), end = Math.min(nextOffset, chunk.at + bytes.length)
    // log 是仅观察者可见的进度叙述；与未标注通道一起放在标准输出页。
    const channel = chunk.channel === 'stderr' ? 'stderr' : 'stdout'
    if (begin >= end || channel !== request.stream) continue
    buffers.push(bytes.subarray(begin - chunk.at, end - chunk.at))
    if (chunk.gapBefore && begin === chunk.at) producerGap = true
  }
  const bytes = Buffer.concat(buffers)
  return { state: 'available' as const, status: job.status, coordinate: 'ring' as const, data: bytes.toString('base64'),
    startOffset, nextOffset, totalBytes: result.next, lossy: startOffset > request.fromByte,
    skippedBytes: nextOffset - startOffset - bytes.length, producerGap }
}
