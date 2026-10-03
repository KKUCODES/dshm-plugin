import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { JobId, JobSnapshot } from '@deepseek-ai/dsh-jobs'

/** 对应已核验的 background-output v1 补丁；旧版 registry 不实现此方法。 */
export type IndependentOutput = { state: 'pending' | 'unsupported' } | {
  state: 'available'; bytes: Uint8Array; startOffset: number; nextOffset: number; totalBytes: number; lossy: boolean; spillPath?: string
}
export type OutputRequest = { stream: 'stdout' | 'stderr'; fromByte: number; maxBytes: number }
export type IndependentRegistry = {
  readOutputBytes?: (id: JobId, request: OutputRequest, caller: Agent) => { output: IndependentOutput; snapshot: JobSnapshot }
}
type OutputSnapshot = { status: JobSnapshot['status'] }

/** 只补读原收集器提供的完整 spill；路径不会来自手机或返回手机。每次最多 64 KiB。 */
export async function recoverOutput(request: OutputRequest, read: () => { output: IndependentOutput; snapshot: OutputSnapshot }, signal: AbortSignal) {
  signal.throwIfAborted()
  const first = read(), output = first.output
  if (output.state !== 'available' || !output.lossy || !output.spillPath) return wire(first)
  let handle, recovered: Uint8Array | undefined
  try {
    const before = await lstat(output.spillPath)
    if (!before.isFile() || before.isSymbolicLink()) throw new Error('invalid spill')
    signal.throwIfAborted()
    handle = await open(output.spillPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    const opened = await handle.stat()
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error('changed spill')
    const size = Math.min(request.maxBytes, output.totalBytes - request.fromByte)
    if (opened.size < output.totalBytes) throw new Error('incomplete spill')
    const buffer = Buffer.alloc(size)
    let length = 0
    while (length < size) {
      signal.throwIfAborted()
      const { bytesRead } = await handle.read(buffer, length, size - length, request.fromByte + length)
      if (!bytesRead) throw new Error('incomplete spill')
      length += bytesRead
    }
    const after = await lstat(output.spillPath)
    if (!after.isFile() || after.dev !== opened.dev || after.ino !== opened.ino || after.size < output.totalBytes) throw new Error('changed spill')
    recovered = buffer
  } catch {
    // 清理、文件失效或超出原收集器容量时，明确返回缺口，不伪造完整历史。
  } finally { await handle?.close() }
  signal.throwIfAborted()
  // 磁盘读取期间会话可能被关闭、任务被清理或服务被卸载，必须重新核验原归属。
  const latest = read()
  if (recovered && latest.output.state === 'available' && latest.output.spillPath === output.spillPath
    && latest.output.totalBytes >= request.fromByte + recovered.byteLength) {
    return wire({ snapshot: latest.snapshot, output: { state: 'available', bytes: recovered, startOffset: request.fromByte,
      nextOffset: request.fromByte + recovered.byteLength, totalBytes: latest.output.totalBytes, lossy: false } })
  }
  return wire(latest)
}

function wire({ output, snapshot }: { output: IndependentOutput; snapshot: OutputSnapshot }) {
  const base = { state: output.state, status: snapshot.status }
  if (output.state !== 'available') return base
  return { ...base, data: Buffer.from(output.bytes).toString('base64'), startOffset: output.startOffset,
    nextOffset: output.nextOffset, totalBytes: output.totalBytes, lossy: output.lossy }
}
