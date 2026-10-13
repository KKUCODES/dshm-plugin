import { expect, test } from 'vitest'
import { openGatewayStream } from '../src/gateway-stream.js'
import { workspaceFilePayload } from '../src/workspace-file-contract.js'

test.each(['0.2.1-alpha.1', '0.2.1-alpha.2'])('%s 使用公开五参数流和options字节契约', async version => {
  const signal = new AbortController().signal
  let received: unknown[] = []
  const gateway = { wireStream: { open: async (...args: unknown[]) => {
    received = args
    return (async function* () { yield 'original-event' })()
  } } }
  const payload = { args: { request: { sessionId: 'original-session' } } }
  const stream = await openGatewayStream(gateway as never, version, 'session/follow', payload, signal)
  expect(received[0]).toBe('session/follow')
  expect(received[1]).toBe(payload)
  expect(received[3]).toBeUndefined()
  expect(received[4]).toBe(signal)
  expect(received).toHaveLength(5)
  const uplink = received[2] as AsyncIterable<unknown>
  expect(await uplink[Symbol.asyncIterator]().next()).toMatchObject({ done: true })
  expect(await stream[Symbol.asyncIterator]().next()).toMatchObject({ value: 'original-event' })
  const file = { args: { workspaceFileScopeId: 'original-session', path: 'a.txt', range: { offset: 1, length: 2 } } }
  expect(workspaceFilePayload(version, 'workspaceFiles/readBytes', file)).toEqual({
    args: { workspaceFileScopeId: 'original-session', path: 'a.txt', options: { range: { offset: 1, length: 2 } } },
  })
  expect(file.args.range).toEqual({ offset: 1, length: 2 })
})

test.each(['0.2.1-alpha.3', '0.2.2', '0.2.1', 'unknown'])('未审阅版本%s不能进入新版流', version => {
  expect(() => openGatewayStream({} as never, version, 'session/follow', {}, new AbortController().signal))
    .toThrow('unsupported_dsh_version')
})
