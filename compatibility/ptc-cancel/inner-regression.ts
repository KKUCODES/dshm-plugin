
describe('inner tool cancellation reason regression', () => {
  it.each(['reason', 'independent'] as const)('preserves the correct result when a stopped tool throws %s', async kind => {
    const { ctx, runtime } = await setup({ mode: 'ptc' })
    const { agent, events } = fakeAgent()
    const controller = new AbortController()
    let entered!: () => void
    const started = new Promise<void>(resolve => { entered = resolve })
    const independent = new Error('independent tool failure')
    ctx.tools.register(defineContentToolFixture({
      name: 'wait_cancel', description: 'Wait for cancellation', parameters: {},
      async execute(_args, exec) {
        entered()
        await new Promise<void>((_resolve, reject) => {
          const abort = () => reject(kind === 'reason' ? exec.signal.reason : independent)
          if (exec.signal.aborted) abort()
          else exec.signal.addEventListener('abort', abort, { once: true })
        })
        return []
      },
    }))
    runtime.behavior = async request => {
      const pending = request.bindings[0]!.functions.wait_cancel!({}).catch(() => undefined)
      await started
      controller.abort({ type: 'user-stop' })
      await pending
      return { logs: [], error: { kind: 'abort', message: 'user-stop' } }
    }
    try {
      await runCode(ctx, 'program', { agent, signal: controller.signal })
      const settled = events.filter(event => event.type === 'tool/ptc-dispatch')
      expect(settled).toHaveLength(1)
      const data = settled[0]!.data as { isError: boolean; error?: { code?: string }; content: unknown[] }
      expect(data.isError).toBe(true)
      if (kind === 'reason') expect(data.error?.code).toBe('ABORTED')
      else {
        expect(data.error?.code).not.toBe('ABORTED')
        expect(data.content).toEqual([{ type: 'text', text: 'Error: independent tool failure' }])
      }
    } finally { await ctx.fiber.dispose() }
  })
})
