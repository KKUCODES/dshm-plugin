import { expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SubagentServiceState } from '../src/subagent-service-state.js'

test('原 Host 可选服务的加载、停用、重建及取消清理进入同一状态流', async () => {
  const ctx = new Context(), state = new SubagentServiceState(ctx), controller = new AbortController()
  const stream = state.follow(controller.signal)
  let first: Awaited<ReturnType<Context['plugin']>> | undefined, second: typeof first
  try {
    expect((await stream.next()).value).toEqual({ available: false })
    const loaded = stream.next()
    first = await ctx.plugin({ apply(scope: Context) { scope.provide('subagents', {}) } })
    expect((await loaded).value).toEqual({ available: true })
    const removed = stream.next(); await first.dispose()
    expect((await removed).value).toEqual({ available: false })
    const restored = stream.next()
    second = await ctx.plugin({ apply(scope: Context) { scope.provide('subagents', {}) } })
    expect((await restored).value).toEqual({ available: true })
    const pending = stream.next(); controller.abort()
    expect((await pending).done).toBe(true)
  } finally { controller.abort(); await stream.return(); await second?.dispose(); await first?.dispose(); await ctx.fiber.dispose() }
})
