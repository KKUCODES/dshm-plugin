import { MAX_UPLOAD_BYTES, RESOURCE_CHUNK_BYTES, RESOURCE_WINDOW } from '@dsh-mobile/protocol'

/** 有界上传窗口；只有原 DSH 消费字节后才归还额度，不在中继中聚合整个文件。 */
export class UploadBody {
  readonly body: ReadableStream<Uint8Array>
  private queue: Uint8Array[] = []
  private credits = RESOURCE_WINDOW
  private bytes = 0
  private ended = false
  private failure?: Error
  private wake?: () => void
  private detach: () => void
  constructor(signal: AbortSignal, private credit: (count: number) => void) {
    const abort = () => this.fail(new Error('remote_upload_cancelled'))
    signal.addEventListener('abort', abort, { once: true })
    this.detach = () => signal.removeEventListener('abort', abort)
    if (signal.aborted) abort()
    this.body = new ReadableStream({
      pull: async controller => {
        while (!this.queue.length && !this.ended && !this.failure) {
          await new Promise<void>(resolve => {
            const timer = setTimeout(() => this.fail(new Error('remote_upload_timeout')), 30000)
            this.wake = () => { clearTimeout(timer); this.wake = undefined; resolve() }
          })
        }
        if (this.failure) throw this.failure
        const chunk = this.queue.shift()
        if (!chunk) { controller.close(); this.detach(); return }
        controller.enqueue(chunk)
        if (!this.ended) { this.credits++; this.credit(1) }
      },
      cancel: () => this.fail(new Error('remote_upload_cancelled')),
    }, { highWaterMark: 0 })
  }
  push(data: string) {
    const bytes = Buffer.from(data, 'base64')
    if (this.failure || this.ended || this.credits === 0 || !bytes.length || bytes.length > RESOURCE_CHUNK_BYTES
      || bytes.toString('base64') !== data || this.bytes + bytes.length > MAX_UPLOAD_BYTES) throw new Error('invalid_upload_chunk')
    this.credits--; this.bytes += bytes.length; this.queue.push(bytes); this.wake?.()
  }
  end() {
    if (this.failure || this.ended) throw new Error('invalid_upload_end')
    this.ended = true; this.wake?.()
  }
  fail(error = new Error('remote_upload_closed')) {
    this.failure = error; this.queue = []; this.detach(); this.wake?.()
  }
}
