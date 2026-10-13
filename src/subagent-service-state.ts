import type { Context } from '@deepseek-ai/cordis'

/** 原 Host 服务的实际生命周期；客户端生成的 namespace 不代表服务仍在运行。 */
export class SubagentServiceState {
  private available = false
  private readonly listeners = new Set<() => void>()
  private readonly lifetime = new AbortController()

  constructor(ctx: Context) {
    const change = (available: boolean) => {
      if (this.available === available) return
      this.available = available
      for (const listener of this.listeners) listener()
    }
    ctx.inject(['subagents'], scope => {
      change(true)
      scope.effect(() => () => change(false), 'dsh-mobile: subagent service state')
    })
    ctx.effect(() => () => { this.lifetime.abort(); this.listeners.clear() }, 'dsh-mobile: subagent state lifetime')
  }

  async *follow(caller: AbortSignal) {
    const signal = AbortSignal.any([caller, this.lifetime.signal])
    signal.throwIfAborted()
    if (this.listeners.size >= 64) throw new Error('remote_subagent_state_busy')
    let changed = true, wake: (() => void) | undefined
    // 状态可合并为最新值；不缓存历史、请求或任何用户内容。
    const notify = () => { changed = true; const resolve = wake; wake = undefined; resolve?.() }
    this.listeners.add(notify)
    signal.addEventListener('abort', notify, { once: true })
    try {
      while (!signal.aborted) {
        if (changed) { changed = false; yield { available: this.available } }
        else await new Promise<void>(resolve => { wake = resolve })
      }
    } finally {
      signal.removeEventListener('abort', notify)
      this.listeners.delete(notify)
    }
  }
}
