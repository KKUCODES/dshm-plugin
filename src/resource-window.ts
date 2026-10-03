import { RESOURCE_WINDOW } from '@dsh-mobile/protocol'

/** 消费者确认后才继续读资源；慢手机不能让整份文件堆进 WebSocket。 */
export class ResourceWindow {
  private credits = RESOURCE_WINDOW
  private wake?: () => void
  acknowledge(count: number) {
    if (this.credits + count > RESOURCE_WINDOW) throw new Error('invalid_resource_ack')
    this.credits += count; this.wake?.()
  }
  async take(signal: AbortSignal) {
    signal.throwIfAborted()
    if (!this.credits) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { release(); reject(new Error('resource_consumer_timeout')) }, 30000)
        const aborted = () => { release(); reject(signal.reason) }
        const release = () => { clearTimeout(timer); this.wake = undefined; signal.removeEventListener('abort', aborted) }
        this.wake = () => { release(); resolve() }
        signal.addEventListener('abort', aborted, { once: true })
      })
    }
    signal.throwIfAborted(); this.credits--
  }
}
