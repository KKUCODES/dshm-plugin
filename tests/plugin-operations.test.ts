import { randomUUID } from 'node:crypto'
import { expect, test } from 'vitest'
import { PluginOperations } from '../src/plugin-operations.js'

function fixture() {
  let now = 0
  const calls: Array<{ request: Request; resolve: (response: Response) => void }> = []
  const journal = new PluginOperations({ createSharedFetchHandler: () => ({ fetch: (request: Request) => new Promise<Response>(resolve => calls.push({ request, resolve })) }) } as any, () => now)
  const start = (owner = 'host:device', id: string = randomUUID()) => journal.start(owner, journal.generation, id, 'pluginManager/installBundle', { args: { spec: 'test-package', options: { requestId: id } } })
  const finish = async (index = 0, result: unknown = { ok: true, value: { application: 'cancelled' } }) => {
    const call = calls[index]
    if (!call) throw new Error('missing_test_request')
    const { rpcId } = await call.request.json()
    call.resolve(Response.json({ type: 'server-response', rpcId, result }))
    await new Promise(resolve => setImmediate(resolve))
  }
  return { journal, calls, start, finish, time: (value: number) => { now = value } }
}

test('结果由原 DSH 返回；重复编号不重写，换连接仍可读，不跨设备或电脑', async () => {
  const f = fixture(), item = f.start()
  expect(f.start('host:device', item.id)).toMatchObject({ id: item.id, state: 'pending' })
  expect(f.calls).toHaveLength(1)
  expect(f.calls[0]?.request.signal.aborted).toBe(false)
  for (const owner of ['host:other-device', 'other-host:device']) {
    expect(f.journal.list(owner).items).toEqual([])
    expect(() => f.journal.read(owner, f.journal.generation, item.id)).toThrow('plugin_operation_missing')
    expect(() => f.start(owner, item.id)).toThrow('plugin_operation_conflict')
  }
  expect(() => f.start()).toThrow('plugin_operation_busy')
  expect(() => f.journal.start('host:device', f.journal.generation, item.id, 'pluginManager/installBundle', { args: { spec: 'changed' } })).toThrow('plugin_operation_conflict')
  await f.finish()
  expect(f.journal.read('host:device', f.journal.generation, item.id)).toMatchObject({ state: 'complete', result: { ok: true, value: { application: 'cancelled' } } })
  expect(f.start('host:device', item.id).state).toBe('complete')
  expect(f.calls).toHaveLength(1)
  expect(() => fixture().journal.read('host:device', f.journal.generation, item.id)).toThrow('plugin_operation_generation_changed')
})

test('时间上限只清理完成记录；未完成不被清理，容量满时拒绝新增', async () => {
  const f = fixture(), completed = f.start('complete'), pending = f.start('pending')
  await f.finish()
  f.time(3600000)
  expect(() => f.journal.read('complete', f.journal.generation, completed.id)).toThrow('plugin_operation_missing')
  expect(f.journal.read('pending', f.journal.generation, pending.id).state).toBe('pending')
  for (let i = 0; i < 63; i++) f.start(`device:${i}`)
  expect(() => f.start('over-capacity')).toThrow('plugin_operation_capacity')
  expect(f.calls).toHaveLength(65)
})

test('协议拒绝任意入口和超大请求，异常响应只能记为未知结果', async () => {
  const f = fixture()
  expect(() => f.journal.start('owner', f.journal.generation, randomUUID(), 'settings/read', {})).toThrow('remote_operation_denied')
  expect(() => f.journal.start('owner', f.journal.generation, randomUUID(), 'pluginManager/installBundle', { args: { spec: 'a'.repeat(20000) } })).toThrow('plugin_operation_payload_too_large')
  expect(f.calls).toHaveLength(0)
  const item = f.start()
  await f.finish(0, { misleading: true })
  expect(f.journal.read('host:device', f.journal.generation, item.id)).toMatchObject({ state: 'unknown', error: 'plugin_operation_outcome_unknown' })
})

test('原业务失败保持原结构，不包装为成功或自动重试', async () => {
  const f = fixture(), item = f.start(), result = { ok: false, error: { code: 'fixture/failure', message: 'denied', details: {} } }
  await f.finish(0, result)
  expect(f.journal.read('host:device', f.journal.generation, item.id)).toMatchObject({ state: 'complete', result })
  expect(f.calls).toHaveLength(1)
})
