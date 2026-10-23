import { expect, test, vi } from 'vitest'
import { connectionFetch, connectionPeer } from '../src/connection-fetch.js'
import { assertRemoteServices } from '../src/remote-capabilities.js'
import type { RemoteServices } from '../src/remote-adapter.js'

test('新版请求传入真实Peer，旧版operator保留；缺少所需身份明确拒绝', async () => {
  const request = new Request('http://localhost/api/session/list'), peer = { fixturePeer: true }
  const fetch = vi.fn(async (_request: Request, _peer: unknown) => new Response('ok'))
  const connection = { browserPeer: peer, createSharedFetchHandler: vi.fn(() => ({ fetch })) }
  expect(await (await connectionFetch(connection as never, request)).text()).toBe('ok')
  expect(fetch).toHaveBeenCalledWith(request, peer)
  expect(connectionPeer({ operator: peer })).toBe(peer)
  expect(() => connectionFetch({ createSharedFetchHandler: () => ({ fetch }) } as never, request))
    .toThrow('unsupported_dsh_capabilities')
  expect(fetch).toHaveBeenCalledTimes(1)
  const legacy = vi.fn(async (_request: Request) => new Response('legacy'))
  await connectionFetch({ createSharedFetchHandler: () => ({ fetch: legacy }) } as never, request)
  expect(legacy).toHaveBeenCalledWith(request)
})

test('版本在范围内仍需实际服务和完整启动图，坏图不能进入资源加载', () => {
  const graph = { entries: [{ id: '@deepseek-ai/dsh-api-remotes' }], batches: [
    { phase: 'bootstrap', entries: ['@deepseek-ai/dsh-client-modules'] },
  ] }
  const services = { connection: { createSharedFetchHandler() {} }, gateway: { wireStream: { open() {} } },
    modules: { graph: () => graph, fetchBundle() {}, onGraphChanged() {} } }
  expect(() => assertRemoteServices(services as unknown as RemoteServices)).not.toThrow()
  for (const invalid of [{ ...services, connection: {} }, { ...services, gateway: {} },
    { ...services, modules: { ...services.modules, graph: () => ({ entries: [], batches: [] }) } },
    { ...services, modules: { ...services.modules, graph: () => ({ entries: [], batches: [null] }) } }])
    expect(() => assertRemoteServices(invalid as unknown as RemoteServices)).toThrow('unsupported_dsh_capabilities')
})
