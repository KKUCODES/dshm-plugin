import { createHash, randomUUID } from 'node:crypto'
import { MAX_FRAME_BYTES, MAX_RESPONSE_BYTES, MAX_RESPONSE_BUFFER_BYTES, MAX_RESPONSE_TRANSFERS,
  RESPONSE_CHUNK_BYTES, RESPONSE_CHUNK_WINDOW, RESPONSE_TOTAL_MS,
  type HostFrame, type ResponseAck } from '@dsh-mobile/protocol'
import { ResourceWindow } from './resource-window.js'

export type ResponseBudget = { bytes: number; transfers: number }

/** 每个请求保留原逻辑消息顺序；只有已协商的大结果占用分块窗口。 */
export class ResponseWriter {
  private tail: Promise<void> = Promise.resolve()
  private active?: { id: string; transferId: string; sent: number; acknowledged: number; window: ResourceWindow }
  constructor(private send: (frame: HostFrame) => void, private enabled: boolean,
    private controller: AbortController, private budget: ResponseBudget) {}
  write(frame: HostFrame): Promise<void> {
    this.controller.signal.throwIfAborted()
    const text = JSON.stringify(frame), length = Buffer.byteLength(text)
    if (length > MAX_FRAME_BYTES && !this.enabled) return Promise.reject(Error('response_too_large'))
    if (this.budget.bytes + length > MAX_RESPONSE_BUFFER_BYTES) return Promise.reject(Error('response_buffer_limit'))
    this.budget.bytes += length
    const current = this.tail.then(async () => {
      this.controller.signal.throwIfAborted()
      if (length <= MAX_FRAME_BYTES) { this.send(frame); return }
      if (frame.type !== 'result' && frame.type !== 'event') throw Error('response_too_large')
      const bytes = Buffer.from(JSON.stringify(frame.value))
      if (bytes.length > MAX_RESPONSE_BYTES) throw Error('response_too_large')
      if (this.budget.transfers >= MAX_RESPONSE_TRANSFERS) throw Error('response_buffer_limit')
      this.budget.transfers++
      const transfer = { id: frame.id, transferId: randomUUID(), sent: 0, acknowledged: 0, window: new ResourceWindow() }
      this.active = transfer
      const timer = setTimeout(() => this.controller.abort(Error('response_chunk_timeout')), RESPONSE_TOTAL_MS); timer.unref()
      try {
        this.send({ type: 'responseStart', id: frame.id, transferId: transfer.transferId, kind: frame.type,
          bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
        for (let offset = 0; offset < bytes.length; offset += RESPONSE_CHUNK_BYTES) {
          await transfer.window.take(this.controller.signal)
          const index = transfer.sent++
          this.send({ type: 'responseChunk', id: frame.id, transferId: transfer.transferId, index,
            data: bytes.subarray(offset, offset + RESPONSE_CHUNK_BYTES).toString('base64') })
        }
        // 等最后一块也确认后才发逻辑结束；复用窗口唤醒和取消机制，不轮询。
        for (let index = 0; index < RESPONSE_CHUNK_WINDOW; index++) await transfer.window.take(this.controller.signal)
        this.send({ type: 'responseEnd', id: frame.id, transferId: transfer.transferId })
      } catch (error) {
        if (error instanceof Error && error.message === 'resource_consumer_timeout') throw Error('response_chunk_timeout')
        throw error
      } finally { clearTimeout(timer); this.active = undefined; this.budget.transfers-- }
    }).finally(() => { this.budget.bytes -= length })
    this.tail = current.catch(() => {})
    return current
  }
  acknowledge(frame: ResponseAck) {
    const active = this.active
    if (!active || frame.id !== active.id || frame.transferId !== active.transferId
      || frame.index !== active.acknowledged || frame.index >= active.sent) throw Error('invalid_response_ack')
    active.acknowledged++; active.window.acknowledge(1)
  }
  drain() { return this.tail }
  cancel() { this.controller.abort(Error('response_chunk_cancelled')) }
}
