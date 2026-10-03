import { expect, test } from 'vitest'
import { desktopOpen } from '../src/desktop-open.js'

const request = { method: 'remote.openFile' as const, source: 'presented' as const, sessionId: 'own & other', seq: 42, index: 1, confirmed: true as const }
test('固定原路由与记录坐标，读取桌面元信息没有打开副作用', async () => {
  const calls: Request[] = []
  const connection = { createSharedFetchHandler: (path: string) => {
    expect(path).toBe('/api')
    return { requestBodyMode: () => 'buffered' as const, fetch: async (input: Request) => {
      calls.push(input)
      return input.method === 'GET' ? Response.json({ name: 'desktop', available: true, fileManager: 'explorer', secret: 'not-returned' })
        : new Response(null, { status: 204 })
    } }
  } }
  const signal = new AbortController().signal
  expect(await desktopOpen(connection, { method: 'remote.desktop' }, signal)).toEqual({ name: 'desktop', available: true, fileManager: 'explorer' })
  expect(calls[0]?.url).toBe('http://dsh.internal/api/present.host')
  expect(await desktopOpen(connection, request, signal)).toEqual({ opened: true })
  expect(await desktopOpen(connection, { ...request, source: 'changes' }, signal)).toEqual({ opened: true })
  expect(calls.slice(1).map(call => new URL(call.url).pathname)).toEqual(['/api/present.open', '/api/changes.open'])
  for (const call of calls.slice(1)) {
    expect(call.method).toBe('POST'); expect(call.body).toBe(null)
    expect(Object.fromEntries(new URL(call.url).searchParams)).toEqual({ sessionId: 'own & other', seq: '42', index: '1' })
  }
})

test('定位交付文件沿原认证路由，只传记录坐标及固定reveal动作', async () => {
  let called: Request | undefined
  const connection = { createSharedFetchHandler: () => ({ requestBodyMode: () => 'buffered' as const, fetch: async (input: Request) => {
    called = input; return new Response(null, { status: 204 })
  } }) }
  expect(await desktopOpen(connection, { ...request, action: 'reveal' }, new AbortController().signal)).toEqual({ opened: true })
  expect(called?.method).toBe('POST')
  expect(new URL(called!.url).pathname).toBe('/api/present.open')
  expect(Object.fromEntries(new URL(called!.url).searchParams)).toEqual({ sessionId: request.sessionId, seq: '42', index: '1', action: 'reveal' })
})

test('电脑关闭、记录丢失、未知失败或取消不自动重试，不泄露原始错误', async () => {
  for (const [status, code] of [[404, 'remote_desktop_file_missing'], [409, 'remote_desktop_unavailable'], [500, 'remote_desktop_open_failed']] as const) {
    let calls = 0
    const connection = { createSharedFetchHandler: () => ({ requestBodyMode: () => 'buffered' as const, fetch: async () => { calls++; return new Response('private internal data', { status }) } }) }
    await expect(desktopOpen(connection, request, new AbortController().signal)).rejects.toThrow(code)
    expect(calls).toBe(1)
  }
  const stopped = new AbortController(); stopped.abort()
  await expect(desktopOpen({ createSharedFetchHandler: () => { throw new Error('must not call') } }, request, stopped.signal)).rejects.toHaveProperty('name', 'AbortError')
  const invalid = { createSharedFetchHandler: () => ({ requestBodyMode: () => 'buffered' as const, fetch: async () => Response.json({ available: true }) }) }
  await expect(desktopOpen(invalid, { method: 'remote.desktop' }, new AbortController().signal)).rejects.toThrow('remote_desktop_invalid')
})
