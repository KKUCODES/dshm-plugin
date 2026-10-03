import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import * as connection from '@deepseek-ai/dsh-client-connection'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import TypertGateway from '@deepseek-ai/dsh-api-gateway'
import ToolRegistry from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '../../artifacts/compatibility/cordis-inspect/src/types.js'
import type { HostFrame, Operation, RemoteContext } from '@dsh-mobile/protocol'
import { RemoteAdapter } from '../../src/remote-adapter.js'
import { cordisInspectService, type CordisInspectService } from '../../src/cordis-connections.js'

const runtime = pathToFileURL(resolve(process.env.DSHM_CORDIS_RUNNER_TEST ?? (process.env.DSHM_CORDIS_PACKAGE_TEST === '1'
  ? 'artifacts/compatibility/cordis-inspect/package/after/packages/extensions/cordis-host-runner/lib/index.js'
  : 'artifacts/compatibility/cordis-inspect/runtime/runner.mjs'))).href
const contribution = pathToFileURL(resolve(process.env.DSHM_CORDIS_GENERATED_TEST ?? 'artifacts/compatibility/cordis-inspect/runtime/typert.host.mjs')).href
const runner = await import(/* @vite-ignore */ runtime)
const generated = await import(/* @vite-ignore */ contribution)
type Inspect = CordisInspectService & { syncClientManifest(providers: unknown[]): void; list(): Array<{ id: string }> }
const cleanups: Array<() => Promise<unknown> | void> = []
afterEach(async () => { for (const close of cleanups.splice(0).reverse()) await close() })
const manifest = (id: string) => ({ id, description: 'Fixture provider', methods: [{ name: 'read', description: 'Fixture read',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: 'string' } }] })

async function fixture() {
  const ctx = new Context(); cleanups.push(() => ctx.fiber.dispose())
  // 凭据存储和设备身份为隔离夹具；Connection、Gateway、生成 codec、完整 runner 均为真实实现。
  ctx.provide('credentials', { readRecord: async () => undefined, modifyRecord: async (_: unknown, change: Function) => change(undefined) })
  await ctx.plugin(connection); await ctx.plugin(TypertRegistry); await ctx.plugin(TypertGateway)
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRegistry)
  await ctx.plugin(runner.default, { vmTimeoutMs: 100 })
  ctx.typert.register(generated.TYPERT)
  const agent = { id: SessionId('cordis-test'), steer: vi.fn(), inject: vi.fn() } as unknown as Agent
  const otherAgent = { id: SessionId('cordis-other'), steer: vi.fn(), inject: vi.fn() } as unknown as Agent
  ctx.provide('agents', { get: (id: string) => [agent, otherAgent].find(value => value.id === id) } as unknown as Context['agents'])
  let lookupGate: (() => Promise<void>) | undefined
  ctx.typert.lookups.register('agent', { parameter: 'agent', wire: 'agentId', hostTypeSymbol: '@deepseek-ai/dsh-agent#Agent',
    wireTypeSymbol: '@deepseek-ai/dsh-session/types#SessionId', async resolve(id: string) {
      const gate = lookupGate; lookupGate = undefined; await gate?.()
      return [agent, otherAgent].find(value => value.id === id)
    } })
  ctx.typertGateway.registerRemoteEvents(signal => (async function* () {
    await new Promise<void>(done => { if (signal.aborted) done(); else signal.addEventListener('abort', () => done(), { once: true }) })
  })(), { home: '/fixture' })
  const inspect = ctx.get('cordisInspect') as Inspect
  let available = true
  const context: RemoteContext = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
  const adapter = new RemoteAdapter({ version: '0.1.6-alpha.2', connection: ctx.connection, gateway: ctx.typertGateway,
    cordisInspect: () => available ? cordisInspectService(ctx.get('cordisInspect'), ctx.get('dynamicCordisRunner')) : undefined,
    modules: { graph: () => ({ rev: 'fixture', entries: [], batches: [] }), onGraphChanged: () => () => {}, fetchBundle: async () => new Response(null, { status: 404 }) },
  }, context.hostId)
  cleanups.push(() => adapter.dispose())
  const request = async (operation: Operation, owner = context) => {
    const frames: HostFrame[] = []
    await adapter.receive({ type: 'request', id: randomUUID(), context: owner, operation }, value => frames.push(value))
    return frames
  }
  const call = (method: string, args: Record<string, unknown>, owner = context) => request({ method: 'remote.rpc', endpoint: `dynamicCordisRunner/${method}`, payload: { args } }, owner)
  const open = async (owner = context) => {
    const id = randomUUID(); const frames: HostFrame[] = []
    const done = adapter.receive({ type: 'request', id, context: owner,
      operation: { method: 'remote.stream', endpoint: '$events', payload: { args: {} } } }, value => frames.push(value))
    await expect.poll(() => frames.some(frame => frame.type === 'event' && (frame.value as { type?: string })?.type === 'ready')).toBe(true)
    const close = async () => { await adapter.receive({ type: 'cancel', id }, () => {}); await done }
    cleanups.push(close)
    return { close }
  }
  const sync = (id: string, owner = context) => call('syncInspectManifest', { providers: [manifest(id)] }, owner)
  const api = ctx.get('dynamicCordisRunner') as InstanceType<typeof runner.DynamicCordisRunnerService>
  return { ctx, inspect, context, adapter, request, call, open, sync, api, agent, otherAgent,
    holdLookup() {
      let entered!: () => void, release!: () => void
      const reached = new Promise<void>(resolve => { entered = resolve }), wait = new Promise<void>(resolve => { release = resolve })
      lookupGate = async () => { entered(); await wait }
      return { reached, release }
    }, unavailable: () => { available = false } }
}

function result(frames: HostFrame[]) {
  expect(frames).toMatchObject([{ type: 'result', value: { ok: true } }])
  if (frames[0]?.type !== 'result') throw Error('Expected RPC result')
  return (frames[0].value as { ok: true; value: any }).value
}

test('原 $events 的可信连接归属隔离目录，另一设备不能借用活跃连接', async () => {
  const f = await fixture(); f.inspect.syncClientManifest([manifest('desktop')])
  expect(await f.sync('before-stream')).toMatchObject([{ type: 'error', code: 'remote_cordis_connection_required' }])
  const first = await f.open()
  expect(await f.sync('phone')).toMatchObject([{ type: 'result', value: { ok: true, value: null } }])
  const other = { ...f.context, deviceId: randomUUID(), connectionId: randomUUID() }
  expect(await f.sync('borrowed', other)).toMatchObject([{ type: 'error', code: 'remote_cordis_connection_required' }])
  const second = await f.open(other)
  expect(await f.sync('other', other)).toMatchObject([{ type: 'result', value: { ok: true } }])
  expect(f.inspect.list().map(item => item.id)).toEqual(['desktop', 'phone', 'other'])
  await first.close(); expect(f.inspect.list().map(item => item.id)).toEqual(['desktop', 'other'])
  expect(await f.sync('late')).toMatchObject([{ type: 'error', code: 'remote_cordis_connection_required' }])
  await second.close(); expect(f.inspect.list().map(item => item.id)).toEqual(['desktop'])
})

test('原生成 codec 拒绝坏定义，原服务保留错误且不覆盖已接受目录', async () => {
  const f = await fixture(); await f.open(); await f.sync('phone')
  const invalid = await f.call('syncInspectManifest', { providers: [{ id: 'broken' }] })
  expect(invalid).toMatchObject([{ type: 'result', value: { ok: false, error: { code: 'gateway/input-invalid' } } }])
  const extra = await f.call('syncInspectManifest', { providers: [], connectionId: f.context.connectionId })
  expect(extra).toMatchObject([{ type: 'error', code: 'remote_operation_denied' }])
  expect(f.inspect.list().map(item => item.id)).toEqual(['phone'])
})

test('同连接新订阅取代旧目录，旧订阅清理不删除新代', async () => {
  const f = await fixture(); f.inspect.syncClientManifest([manifest('desktop')])
  const old = await f.open(); await f.sync('old')
  const current = await f.open(); expect(f.inspect.list().map(item => item.id)).toEqual(['desktop'])
  await f.sync('current'); await old.close()
  expect(f.inspect.list().map(item => item.id)).toEqual(['desktop', 'current'])
  await current.close(); expect(f.inspect.list().map(item => item.id)).toEqual(['desktop'])
})

test('协商仅在兼容服务存在时宣告全部原调用，失效后拒绝调用', async () => {
  const f = await fixture(); await f.open()
  expect(cordisInspectService(f.inspect, {})).toBeUndefined()
  expect(cordisInspectService({}, f.api)).toBeUndefined()
  const frames = await f.request({ method: 'remote.negotiate', version: 2 })
  expect(frames).toMatchObject([{ type: 'result', value: { endpoints: { calls: expect.arrayContaining(['dynamicCordisRunner/inventory', 'dynamicCordisRunner/invoke']) } } }])
  expect(await f.call('inventory', {})).toMatchObject([{ type: 'result', value: { ok: true, value: [] } }])
  expect(await f.call('invoke', { pluginId: 'absent', pluginRunId: 'r', method: 'read', args: null })).toMatchObject([
    { type: 'result', value: { ok: true, value: { ok: false, code: 'plugin-not-running' } } },
  ])
  f.unavailable()
  expect(await f.call('inventory', {})).toMatchObject([{ type: 'error', code: 'remote_cordis_unavailable' }])
  const unavailable = await f.request({ method: 'remote.negotiate', version: 2 })
  expect(unavailable).toMatchObject([{ type: 'result', value: { endpoints: { calls: expect.not.arrayContaining(['dynamicCordisRunner/inventory']) } } }])
})

test('适配器释放所有设备目录，传统电脑页面目录保留', async () => {
  const f = await fixture(); f.inspect.syncClientManifest([manifest('desktop')])
  await f.open(); await f.sync('phone'); f.adapter.dispose()
  expect(f.inspect.list().map(item => item.id)).toEqual(['desktop'])
})

test('原动态包运行、代码读取、Host handler、诊断、停止与移除经过相同通道', async () => {
  const f = await fixture(); await f.open()
  const code = 'return { apply() { harness.handle("echo", value => ({ echoed: value })); } }'
  const definition = f.api.define({ sessionId: f.agent.id, plugin: { kind: 'new', idPrefix: 'audit' }, name: 'Fixture',
    purpose: 'Isolated transport verification', code: { host: code, client: 'return { apply() {} }' } })
  const target = { agentId: f.agent.id, pluginId: definition.pluginId }
  expect(result(await f.call('runHostHalf', { ...target, agentId: f.otherAgent.id, packageId: definition.packageId,
    mode: 'run', requestId: null, approveFutureVersions: false }))).toMatchObject({ ok: false, message: expect.stringContaining(definition.pluginId) })
  expect(f.api.inventory()[0].activeRun).toBeUndefined()
  const started = result(await f.call('runHostHalf', { ...target, packageId: definition.packageId,
    mode: 'run', requestId: null, approveFutureVersions: false }))
  expect(started).toMatchObject({ ok: true, pluginId: definition.pluginId })
  const run = { ...target, pluginRunId: started.pluginRunId }
  expect(result(await f.call('getClientCode', run))).toMatchObject({ pluginRunId: started.pluginRunId, code: 'return { apply() {} }' })
  expect(result(await f.call('settleUserRun', { ...target, resolution: { ok: true, pluginRunId: started.pluginRunId } }))).toMatchObject({ ok: true, status: 'running' })
  expect(result(await f.call('invoke', { pluginId: target.pluginId, pluginRunId: started.pluginRunId, method: 'echo', args: 'fixture' }))).toEqual({ ok: true, value: { echoed: 'fixture' } })
  expect(result(await f.call('invoke', { pluginId: target.pluginId, pluginRunId: 'old', method: 'echo', args: null }))).toMatchObject({ ok: false, code: 'stale-run' })
  expect(result(await f.call('invoke', { pluginId: target.pluginId, pluginRunId: started.pluginRunId, method: 'absent', args: null }))).toMatchObject({ ok: false, code: 'method-not-found' })
  expect(result(await f.call('reportClientGuardFailure', { ...run, failure: { message: 'Fixture guard report' } }))).toBe(null)
  expect(result(await f.call('reportRenderFailure', { ...run, failure: { slot: 'tool.view.cordis', message: 'Fixture render report', abdicated: false } }))).toBe(null)
  expect(result(await f.call('stopFromPanel', { ...target, agentId: f.otherAgent.id }))).toMatchObject({ ok: false, reason: 'plugin-missing' })
  expect(result(await f.call('stopFromPanel', target))).toEqual({ ok: true })
  expect(result(await f.call('invoke', { pluginId: target.pluginId, pluginRunId: started.pluginRunId, method: 'echo', args: null }))).toMatchObject({ ok: false, code: 'plugin-not-running' })
  expect(result(await f.call('undefineFromPanel', target))).toMatchObject({ ok: true })
  expect(result(await f.call('inventory', {}))).toEqual([])
})

test('原审批请求拒绝错误关联、首次有效结算后拒绝重复，查询结果保留原会话校验', async () => {
  const f = await fixture(); await f.open()
  const definition = f.api.define({ sessionId: f.agent.id, plugin: { kind: 'new', idPrefix: 'audit' }, name: 'Approval fixture',
    purpose: 'Isolated approval transport', code: { client: 'return { apply() {} }' } })
  const pending = await f.api.run(f.agent, definition.pluginId, definition.packageId, 'run')
  expect(pending).toMatchObject({ ok: true, status: 'awaiting-approval' })
  const inventory = result(await f.call('inventory', {})), requestId = inventory[0].latestRun.approvalRequestId
  expect(typeof requestId).toBe('string')
  expect(result(await f.call('resolveRequestRun', { requestId, resolution: { ok: true, pluginRunId: 'unrelated' } }))).toEqual({ accepted: false })
  const decline = { requestId, resolution: { ok: false, reason: 'rejected', message: 'Fixture refusal' } }
  expect(result(await f.call('resolveRequestRun', decline))).toEqual({ accepted: true })
  expect(result(await f.call('resolveRequestRun', decline))).toEqual({ accepted: false })
  await f.api.run(f.agent, definition.pluginId, definition.packageId, 'run')
  const nextId = result(await f.call('inventory', {}))[0].latestRun.approvalRequestId
  const target = { agentId: f.agent.id, pluginId: definition.pluginId, packageId: definition.packageId,
    mode: 'run', requestId: 'wrong-request', approveFutureVersions: false }
  expect(result(await f.call('runHostHalf', target))).toMatchObject({ ok: false })
  expect(f.api.inventory()[0].activeRun).toBeUndefined()
  const started = result(await f.call('runHostHalf', { ...target, requestId: nextId }))
  expect(started.ok).toBe(true)
  const accept = { requestId: nextId, resolution: { ok: true, pluginRunId: started.pluginRunId } }
  expect(result(await f.call('resolveRequestRun', accept))).toEqual({ accepted: true })
  expect(result(await f.call('resolveRequestRun', accept))).toEqual({ accepted: false })
  expect(f.api.inventory()[0].latestRun.status).toBe('running')
  await f.sync('phone')
  let query: { requestId: string } | undefined
  f.ctx.on('cordis/inspect-query', value => { query = value })
  const cancellation = new AbortController(); cleanups.push(() => cancellation.abort())
  const registry = f.inspect as Inspect & { query(...args: unknown[]): Promise<unknown> }
  const answer = registry.query('client', 'phone', 'read', {}, f.agent, cancellation.signal)
  expect(query).toBeDefined()
  const resolution = { requestId: query!.requestId, resolution: { ok: true, data: 'result' } }
  expect(result(await f.call('resolveInspectQuery', { ...resolution, agentId: f.otherAgent.id }))).toEqual({ accepted: false })
  expect(result(await f.call('resolveInspectQuery', { ...resolution, agentId: f.agent.id }))).toEqual({ accepted: true })
  expect(await answer).toBe('result')
})

test('原参数查找在途时关闭事件连接，迟到 runHostHalf 不得开始运行', async () => {
  const f = await fixture(), events = await f.open()
  const definition = f.api.define({ sessionId: f.agent.id, plugin: { kind: 'new', idPrefix: 'audit' }, name: 'Late fixture',
    purpose: 'Isolated late dispatch', code: { client: 'return { apply() {} }' } })
  const held = f.holdLookup()
  const late = f.call('runHostHalf', { agentId: f.agent.id, pluginId: definition.pluginId, packageId: definition.packageId,
    mode: 'run', requestId: null, approveFutureVersions: false })
  await held.reached; await events.close(); held.release()
  expect(await late).toMatchObject([{ type: 'error', code: 'remote_cordis_connection_expired' }])
  expect(f.api.inventory()[0].activeRun).toBeUndefined()
  expect(f.api.inventory()[0].latestRun).toBeUndefined()
})

test('原业务已经接收的电脑后续工作不继承手机连接失效状态', async () => {
  const f = await fixture(), events = await f.open()
  const definition = f.api.define({ sessionId: f.agent.id, plugin: { kind: 'new', idPrefix: 'audit' }, name: 'Continuation fixture',
    purpose: 'Host continuation remains independent', code: { client: 'return { apply() {} }' } })
  const target = { agentId: f.agent.id, pluginId: definition.pluginId }
  const started = result(await f.call('runHostHalf', { ...target, packageId: definition.packageId,
    mode: 'run', requestId: null, approveFutureVersions: false }))
  let release!: () => void, continued: Promise<boolean> | undefined
  const wait = new Promise<void>(resolve => { release = resolve })
  f.agent.inject = vi.fn(() => {
    continued = (async () => {
      await wait
      // 真实原方法注入后续上下文时创建的异步工作，只检查内部归属，不调用模型。
      const service = f.inspect as Inspect & { assertClientManifestScope(): void }
      service.assertClientManifestScope()
      return true
    })()
  })
  result(await f.call('settleUserRun', { ...target, resolution: { ok: true, pluginRunId: started.pluginRunId } }))
  expect(continued).toBeDefined(); await events.close(); release()
  await expect(continued).resolves.toBe(true)
  expect(f.api.inventory()[0].activeRun.pluginRunId).toBe(started.pluginRunId)
})
