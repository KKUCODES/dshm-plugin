
describe('DSHM typed reviewer cancellation', () => {
  it.each([
    { kind: 'aborted' as const, cancel: true, cancelled: true },
    { kind: 'aborted' as const, cancel: false, cancelled: false },
    { kind: 'error' as const, cancel: true, cancelled: false },
  ])('preserves $kind with caller cancellation $cancel', async ({ kind, cancel, cancelled }) => {
    const entered = Promise.withResolvers<undefined>(), release = Promise.withResolvers<undefined>()
    const controlled = async function* (): AsyncIterable<StreamChunk> {
      entered.resolve(undefined); await release.promise
      yield { type: 'finish', reason: { kind, failure: { code: 'ABORTED', message: 'controlled typed completion' } } }
    }
    const { ctx } = await harness([controlled])
    const probe = registerProbe(ctx)
    const { session, agent } = autoSession(ctx, `dshm-typed-${kind}-${cancel}`)
    appendHeader(session, [{ name: 'probe', description: 'probe', parameters: { type: 'object' } }])
    const callId = ToolCallId(`dshm-typed-${kind}-${cancel}-call`)
    appendAssistant(session, [{ type: 'tool-call', id: callId, name: 'probe', arguments: '{}' }])
    appendNativeCall(session, callId, 'probe', '{}')
    const controller = new AbortController()
    const pending = ctx.tools.execute({ signal: controller.signal, callId, name: 'probe', arguments: {}, agent })
    await entered.promise; if (cancel) controller.abort(new Error('caller stopped'))
    release.resolve(undefined); const result = await pending
    expect(probe.runs()).toBe(0)
    if (cancelled) expect(result).toMatchObject({ isError: true, error: { info: { code: TOOL_ABORTED_BEFORE_DISPATCH } } })
    else {
      expect(result).toMatchObject({ isError: true, error: { message: `Auto review of tool "probe" failed; its body was not executed: auto-review: reviewer ended with ${kind} ABORTED: controlled typed completion` } })
      expect(result.error.info).toBeUndefined()
    }
  })
})
