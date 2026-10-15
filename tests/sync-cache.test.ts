import { expect, test } from 'vitest'
import { RemoteSyncCache } from '../src/sync-cache.js'
import { ResourceValidator } from '../src/resource-validator.js'
import { applySyncDelta, operationSchema, remoteRequestAllowed } from '@dsh-mobile/protocol'

const payload = { args: {} }
const request = (hash?: string) => ({ ...payload, _dshmSync: { version: 1, ...(hash ? { hash } : {}) } })
const rows = Array.from({ length: 100 }, (_, id) => ({ id, title: `chat ${id}`, body: `${id}:` + '历史记录'.repeat(80) }))

test('新中转字段不需要新增网关操作，且元数据不会转发给DSH', () => {
  const value = request()
  expect(operationSchema.parse({ method: 'remote.rpc', endpoint: 'session/list', payload: value }).method).toBe('remote.rpc')
  expect(remoteRequestAllowed('session/list', value, 'target')).toBe(true)
  expect(new RemoteSyncCache().prepare('device', 'session/list', false, value).payload).toEqual(payload)
  expect(() => new RemoteSyncCache().prepare('device', 'session/prompt', false, value)).toThrow('invalid_sync_cache_hint')
})

test('完整/未变化/移动窗口及更新删除精确还原，冷启动范围不跨设备或请求', async () => {
  const cache = new RemoteSyncCache()
  const initial = await cache.prepare('one', 'session/list', false, request()).encode({ ok: true, value: rows }) as any
  expect(initial.value.value).toEqual(rows)
  const unchanged = await cache.prepare('one', 'session/list', false, request(initial.hash)).encode(initial.value) as any
  expect(applySyncDelta(unchanged.delta, initial.value)).toEqual(initial.value)
  expect(JSON.stringify(unchanged).length).toBeLessThan(JSON.stringify(initial).length / 20)
  const changed = { ok: true, value: [...rows.slice(3), { id: 100, title: 'new', body: 'computer update' }] }
  const next = await cache.prepare('one', 'session/list', false, request(initial.hash)).encode(changed) as any
  expect(applySyncDelta(next.delta, initial.value)).toEqual(changed)
  expect(JSON.stringify(next).length).toBeLessThan(JSON.stringify(changed).length / 5)
  const other = await cache.prepare('two', 'session/list', false, request(next.hash)).encode(changed) as any
  expect(other.delta).toBeUndefined()
  const restarted = await new RemoteSyncCache().prepare('one', 'session/list', false, request(next.hash)).encode(changed) as any
  expect(restarted.value).toEqual(changed)
})

test('HEAD确认原模块存在，内容相同不返回正文，更新后指纹变化，删除不返回旧指纹', async () => {
  const cache = new ResourceValidator(), calls: string[] = []
  let text = 'first', revision = 'one', exists = true
  const fetch = async (request: Request) => {
    calls.push(request.method)
    return exists ? new Response(request.method === 'HEAD' ? null : text, { headers: { 'content-type': 'application/javascript' } })
      : new Response(null, { status: 404 })
  }
  const url = 'http://dsh.internal/plugins/test.js'
  const first = await cache.fetch(new Request(url), revision, fetch)
  const etag = first.headers.get('etag')
  expect(await first.text()).toBe('first')
  const head = await cache.fetch(new Request(url, { method: 'HEAD' }), revision, fetch)
  expect(await head.text()).toBe(''); expect(head.headers.get('etag')).toBe(etag)
  expect(calls).toEqual(['GET', 'HEAD'])
  text = 'second'; revision = 'two'
  expect((await cache.fetch(new Request(url, { method: 'HEAD' }), revision, fetch)).headers.get('etag')).not.toBe(etag)
  expect(calls.slice(-2)).toEqual(['HEAD', 'GET'])
  exists = false
  expect((await cache.fetch(new Request(url, { method: 'HEAD' }), revision, fetch)).status).toBe(404)
})

test('错误hint、授权范围变化、淘汰和超限结果不产生可用旧引用', async () => {
  const cache = new RemoteSyncCache(), value = { ok: true, value: rows }
  const first = await cache.prepare('device:basic', 'session/list', false, request()).encode(value) as any
  expect(() => cache.prepare('device:basic', 'session/list', false, { ...payload, _dshmSync: { version: 1, hash: 'broken' } }))
    .toThrow('invalid_sync_cache_hint')
  expect((await cache.prepare('device:management', 'session/list', false, request(first.hash)).encode(value) as any).delta).toBeUndefined()
  for (let i = 0; i < 129; i++) await cache.prepare(`device-${i}`, 'session/list', false, request()).encode(value)
  expect((await cache.prepare('device:basic', 'session/list', false, request(first.hash)).encode(value) as any).delta).toBeUndefined()
  const huge = { ok: true, value: 'x'.repeat(2 * 1024 * 1024) }
  expect(await cache.prepare('device', 'session/list', false, request()).encode(huge)).toBe(huge)
  const complex = { ok: true, value: Array.from({ length: 13000 }, (_, id) => id) }
  const baseline = await cache.prepare('complex', 'session/list', false, request()).encode(complex) as any
  const repeated = await cache.prepare('complex', 'session/list', false, request(baseline.hash)).encode(complex) as any
  expect(repeated.delta).toEqual([1, []])
})
