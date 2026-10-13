import { randomUUID } from 'node:crypto'
import { afterEach, expect, test } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import * as connection from '@deepseek-ai/dsh-client-connection'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import TypertGatewayService from '@deepseek-ai/dsh-api-gateway'
import { bindTypertRemote, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { RESOURCE_CHUNK_BYTES, RESOURCE_WINDOW, type HostFrame, type Operation, type RemoteContext } from '@dsh-mobile/protocol'
import { RemoteAdapter, type RemoteServices } from '../src/remote-adapter.js'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { createLaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { computerKeyViewSchema, providerSettingsViewSchema, providerRemovalViewSchema, providerCreationViewSchema } from '@dsh-mobile/protocol'
import { computerEndpointViewSchema, providerModelsViewSchema } from '@dsh-mobile/protocol'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import Schema from '@deepseek-ai/schemastery'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { SubagentServiceState } from '../src/subagent-service-state.js'

const cleanup: Array<() => Promise<unknown> | void> = []
afterEach(async () => { for (const dispose of cleanup.splice(0).reverse()) await dispose() })

async function fixture(computerKey?: RemoteServices['computerKey']) {
  const ctx = new Context()
  ctx.provide('credentials', { readRecord: async () => undefined, modifyRecord: async (_: unknown, change: Function) => change(undefined) })
  const fiber = ctx.plugin(connection); await fiber.await(); cleanup.push(() => fiber.dispose())
  const calls: Array<{ endpoint: string; payload: unknown }> = []
  const stop = ctx.connection.rpc.intercept('/api', () => true, async (endpoint, payload) => {
    calls.push({ endpoint, payload }); return { ok: true, value: { accepted: true } }
  }); cleanup.push(stop)
  const context: RemoteContext = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
  const listeners = new Set<() => void>()
  let revision = 'initial', cancelled = false
  const services: RemoteServices = {
    computerKey,
    version: '0.1.6-alpha.2', connection: ctx.connection,
    modules: {
      graph: () => ({ rev: revision, entries: [], batches: [] }),
      onGraphChanged: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
      fetchBundle: async () => new Response(null, { status: 404 }),
    },
    gateway: { wireStream: {
      failure: () => ({ code: 'gateway/internal', message: 'failure', details: {} }),
      open: async (_endpoint, _payload, signal) => (async function* () {
        try {
          yield { type: 'ready', clientId: 'event-client', host: { home: '/fixture' } }
          await new Promise<void>(resolve => { if (signal.aborted) resolve(); else signal.addEventListener('abort', () => resolve(), { once: true }) })
        } finally { cancelled = true }
      })(),
    } },
  }
  const adapter = new RemoteAdapter(services, context.hostId); cleanup.push(() => adapter.dispose())
  const request = async (operation: Operation, override = context) => {
    const frames: HostFrame[] = [], id = randomUUID()
    await adapter.receive({ type: 'request', id, operation, context: override }, frame => frames.push(frame))
    return frames[0]
  }
  return { ctx, adapter, context, services, calls, request, listeners, cancelled: () => cancelled,
    changeGraph: () => { revision = 'changed'; for (const listener of listeners) listener() } }
}

test('聊天授权可订阅真实服务状态，取消后不保留订阅，错误身份不能订阅', async () => {
  const f = await fixture(), ctx = new Context()
  cleanup.push(() => ctx.fiber.dispose())
  f.services.subagentState = new SubagentServiceState(ctx)
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { subagentState: true } })
  expect(await f.request({ method: 'remote.subagentStateFollow' }, { ...f.context, hostId: randomUUID() }))
    .toMatchObject({ type: 'error', code: 'remote_identity_denied' })
  const frames: HostFrame[] = [], id = randomUUID()
  const done = f.adapter.receive({ type: 'request', id, operation: { method: 'remote.subagentStateFollow' }, context: f.context }, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(1)
  expect(frames[0]).toMatchObject({ type: 'event', value: { available: false } })
  const service = await ctx.plugin({ apply(scope: Context) { scope.provide('subagents', {}) } })
  await expect.poll(() => frames.length).toBe(2)
  expect(frames[1]).toMatchObject({ type: 'event', value: { available: true } })
  await service.dispose(); await expect.poll(() => frames.length).toBe(3)
  expect(frames[2]).toMatchObject({ type: 'event', value: { available: false } })
  await f.adapter.receive({ type: 'cancel', id }, frame => frames.push(frame)); await done
  expect(f.calls).toEqual([])
})

test('旧Host独立拒绝新版会话投影，协商仍提供旧子会话目录', async () => {
  const f = await fixture()
  const negotiation = await f.request({ method: 'remote.negotiate', version: 2 })
  expect(negotiation).toMatchObject({ type: 'result', value: { endpoints: { calls: expect.arrayContaining(['subagents/list']) } } })
  if (negotiation?.type !== 'result') throw Error('negotiation_failed')
  expect((negotiation.value as { endpoints: { calls: string[] } }).endpoints.calls).not.toContain('session/projections')
  expect(await f.request({ method: 'remote.rpc', endpoint: 'session/projections',
    payload: { args: { request: { sessionId: 'parent' } } } })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toEqual([])
})

test('旧Host拒绝持久定时目录，读取不能绕过版本协商或进入原RPC', async () => {
  const f = await fixture()
  const negotiation = await f.request({ method: 'remote.negotiate', version: 2 })
  expect(negotiation).toMatchObject({ type: 'result' })
  if (negotiation?.type !== 'result') throw Error('negotiation_failed')
  expect((negotiation.value as { endpoints: { calls: string[] } }).endpoints.calls).not.toContain('schedule/list')
  expect(await f.request({ method: 'remote.rpc', endpoint: 'schedule/list',
    payload: { args: { request: { sessionId: 'parent' } } } })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toEqual([])
})

test('旧Host独立拒绝新版安装回执查询，不公布该入口', async () => {
  const f = await fixture()
  const management = { ...f.context, management: true }
  const negotiated = await f.request({ method: 'remote.negotiate', version: 2 }, management)
  if (negotiated?.type !== 'result') throw Error('negotiation_failed')
  expect((negotiated.value as { endpoints: { calls: string[] } }).endpoints.calls).not.toContain('pluginManager/waitForInstall')
  expect(await f.request({ method: 'remote.rpc', endpoint: 'pluginManager/waitForInstall',
    payload: { args: { requestId: randomUUID() } } }, management)).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toEqual([])
})

test('旧Host保留原有界文件读取，独立拒绝新版观察和options参数', async () => {
  const f = await fixture(), args = { workspaceFileScopeId: 's', path: 'a.txt' }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'workspaceFiles/readBytes',
    payload: { args: { ...args, range: { offset: 0, length: 1 } } } })).toMatchObject({ type: 'result' })
  expect(f.calls).toEqual([{ endpoint: 'workspaceFiles/readBytes', payload: { args: { ...args, range: { offset: 0, length: 1 } } } }])
  expect(await f.request({ method: 'remote.stream', endpoint: 'workspaceFiles/changes', payload: { args } }))
    .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(await f.request({ method: 'remote.rpc', endpoint: 'workspaceFiles/readBytes',
    payload: { args: { ...args, options: { range: { offset: 0, length: 1 } } } } }))
    .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toHaveLength(1)
})

test('新版默认预设固定通道仍需管理权限，普通旧版包不开放候选能力', async () => {
  const f = await fixture()
  const operation = { method: 'remote.settingsRead' as const, namespace: 'agent-preset-registry' as const }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_settings_unavailable' })
  expect(f.calls).toEqual([])
})

test('普通旧版包不读取或修改候选代码视图偏好', async () => {
  const f = await fixture()
  expect(await f.request({ method: 'remote.codingToolsRead' })).toMatchObject({ type: 'error', code: 'remote_settings_unavailable' })
  expect(await f.request({ method: 'remote.settingsRead', namespace: 'ui-settings' }, { ...f.context, management: true }))
    .toMatchObject({ type: 'error', code: 'remote_settings_unavailable' })
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { codingToolsSettings: false } })
  expect(f.calls).toEqual([])
})

test('普通旧版包不会开放新版预设复制或删除，即使提供了同名服务', async () => {
  const f = await fixture()
  f.services.presetManagement = { read: async () => { throw Error('unexpected_read') }, write: async () => { throw Error('unexpected_write') } }
  for (const operation of [{ method: 'remote.presetManagementRead' as const, preset: 'standard' },
    { method: 'remote.presetCopy' as const, snapshot: randomUUID(), id: 'copy', name: 'Copy' },
    { method: 'remote.presetDelete' as const, snapshot: randomUUID(), confirmed: true as const }]) {
    expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
    expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { presetProfileManagement: false } })
  expect(f.calls).toEqual([])
})

test('草稿探测Host入口独立拒绝无管理权限，缺少服务不执行探测', async () => {
  const f = await fixture()
  const prepare = { method: 'remote.modelProbePrepare' as const, baseURL: 'http://127.0.0.1:12345/v1', api: 'openai-completions' as const, authentication: { mode: 'none' as const } }
  const execute = { method: 'remote.modelProbeExecute' as const, snapshot: randomUUID(), confirmed: true as const, mode: 'temporary' as const, apiKey: 'synthetic-host-test' }
  for (const operation of [prepare, execute]) expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(prepare, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_settings_unavailable' })
  expect(await f.request(execute, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
})

test('草稿探测经Adapter准备执行，连接隔离、一次消费及dispose清理', async () => {
  class ProbeSettings extends SettingsProvider {
    get writable() { return true }
    protected async load() { return {} }
    protected async persist() { throw Error('probe_must_not_persist') }
  }
  const f = await fixture()
  const fiber = f.ctx.plugin(ProbeSettings); await fiber; cleanup.push(() => fiber.dispose())
  f.ctx.settings.register('llm-pi-ai', Schema.object({ providers: Schema.dict(Schema.object({})) }))
  f.services.settings = () => f.ctx.settings
  f.services.computerKey = { settings: () => f.ctx.settings, credentials: () => undefined, revision: () => 0, enrollmentRef: 'DSH_MOBILE_ENROLLMENT_TOKEN' }
  const calls: unknown[] = []
  const runtime = { discoverModels: async (ns: string, request: unknown) => { calls.push({ ns, request }); return [{ id: 'candidate' }] } }
  f.services.modelDiscovery = () => runtime
  const admin = { ...f.context, management: true }
  const prepare = { method: 'remote.modelProbePrepare' as const, baseURL: 'http://127.0.0.1:12345/v1', api: 'openai-completions' as const, authentication: { mode: 'none' as const } }
  const response = await f.request(prepare, admin)
  if (response?.type !== 'result') throw Error('prepare failed')
  const snapshot = (response.value as { snapshot: string }).snapshot
  const execution = { method: 'remote.modelProbeExecute' as const, snapshot, confirmed: true as const, mode: 'none' as const }
  expect(await f.request(execution, { ...admin, connectionId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  expect(await f.request(execution, admin)).toMatchObject({ type: 'result', value: { rows: [{ id: 'candidate' }] } })
  expect(await f.request(execution, admin)).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  expect(calls).toEqual([{ ns: 'dshm.pi-ai-endpoint-v2', request: { baseURL: prepare.baseURL, api: prepare.api } }])
  f.adapter.dispose()
  expect(await f.request(prepare, admin)).toMatchObject({ type: 'error', code: 'remote_management_required' })
})

test('协商只在专用模型发现注册存在时开放草稿能力', async () => {
  class ProbeSettings extends SettingsProvider {
    get writable() { return true }
    protected async load() { return {} }
    protected async persist() { throw Error('probe_must_not_persist') }
  }
  const f = await fixture(), fiber = f.ctx.plugin(ProbeSettings), llm = f.ctx.plugin(LlmRuntime)
  await fiber; await llm; cleanup.push(() => fiber.dispose(), () => llm.dispose())
  f.services.settings = () => f.ctx.settings
  f.services.computerKey = { settings: () => f.ctx.settings, credentials: () => undefined, revision: () => 0, enrollmentRef: 'DSH_MOBILE_ENROLLMENT_TOKEN' }
  f.services.modelDiscovery = () => f.ctx.llm
  const negotiate = { method: 'remote.negotiate' as const, version: 2 as const }
  expect(await f.request(negotiate)).toMatchObject({ type: 'result', value: { providerModelProbe: false } })
  let calls = 0
  const unregister = f.ctx.llm.registerModelDiscovery('dshm.pi-ai-endpoint-v2', async () => { calls++; return [] })
  expect(await f.request(negotiate)).toMatchObject({ type: 'result', value: { providerModelProbe: true } })
  unregister()
  expect(await f.request(negotiate)).toMatchObject({ type: 'result', value: { providerModelProbe: false } })
  expect(calls).toBe(0)
})

test('卡片元数据Host入口独立检查管理权限和真实服务可用性', async () => {
  const f = await fixture()
  expect(await f.request({ method: 'remote.providerCardRead', provider: 'deepseek-official' })).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request({ method: 'remote.modelReadiness' })).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request({ method: 'remote.providerCardRead', provider: 'deepseek-official' }, { ...f.context, management: true }))
    .toMatchObject({ type: 'error', code: 'remote_settings_unavailable' })
})

test('官方模型经真实Host入口检查管理和连接身份，不写pi-ai同名路由', async () => {
  class ModelSettings extends SettingsProvider {
    doc: Record<string, unknown> = { 'llm-deepseek': { models: [{ id: 'official' }] }, 'llm-pi-ai': { providers: { deepseek: { models: [{ id: 'other' }] } } } }
    get writable() { return true }
    protected async load() { return structuredClone(this.doc) }
    protected async persist(ns: SettingsNamespace, value: Record<string, unknown>) { this.doc[ns] = value }
  }
  const f = await fixture(), fiber = f.ctx.plugin(ModelSettings); await fiber; cleanup.push(() => fiber.dispose())
  f.ctx.settings.register('llm-deepseek', Schema.object({ models: Schema.array(Schema.object({ id: Schema.string() })) }))
  f.services.settings = () => f.ctx.get('settings')
  expect(await f.request({ method: 'remote.deepSeekModelsRead' })).toMatchObject({ type: 'error', code: 'management_required' })
  const admin = { ...f.context, management: true }, read = await f.request({ method: 'remote.deepSeekModelsRead' }, admin)
  if (read?.type !== 'result') throw Error('Missing official model view')
  const view = providerModelsViewSchema.parse(read.value)
  const operation: Operation = { method: 'remote.deepSeekModelsWrite', snapshot: view.snapshot, expectedRevision: view.revision,
    change: { op: 'set', rows: [{ id: 'updated' }] } }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(operation, { ...admin, connectionId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  expect(await f.request(operation, admin)).toMatchObject({ type: 'result', value: { rows: [{ id: 'updated' }] } })
  expect((f.ctx.settings as ModelSettings).doc['llm-pi-ai']).toEqual({ providers: { deepseek: { models: [{ id: 'other' }] } } })
})

test('删除提供方经真实Host入口要求管理和同连接确认，并保持其他路由', async () => {
  class RemovalSettings extends SettingsProvider {
    doc: Record<string, unknown> = { 'llm-pi-ai': { providers: { alpha: { displayName: 'Alpha' }, beta: { displayName: 'Beta' } } } }
    get writable() { return true }
    protected async load() { return structuredClone(this.doc) }
    protected async persist(ns: SettingsNamespace, value: Record<string, unknown>) { this.doc[ns] = value }
  }
  const f = await fixture(), fiber = f.ctx.plugin(RemovalSettings); await fiber; cleanup.push(() => fiber.dispose())
  f.ctx.settings.register('llm-pi-ai', Schema.object({ providers: Schema.dict(Schema.object({ displayName: Schema.string(), api: Schema.union(['openai-completions']) })) }))
  f.services.settings = () => f.ctx.get('settings')
  const admin = { ...f.context, management: true }
  const read = await f.request({ method: 'remote.providerRemovalRead', provider: 'alpha' }, admin)
  if (read?.type !== 'result') throw Error('Expected removal preview')
  const view = providerRemovalViewSchema.parse(read.value), operation: Operation = {
    method: 'remote.providerRemovalWrite', provider: 'alpha', snapshot: view.snapshot, expectedRevision: view.revision }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(operation, { ...admin, connectionId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  expect(await f.request(operation, admin)).toMatchObject({ type: 'result', value: { removed: true } })
  expect(f.ctx.settings.get('llm-pi-ai')).toMatchObject({ providers: { beta: { displayName: 'Beta' } } })
  expect(await f.request(operation, admin)).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  const directory = { listProviders: () => [], listConfigurableProviders: () => [] }
  f.services.providerDirectory = () => directory
  const creation = await f.request({ method: 'remote.providerCreationRead' }, admin)
  if (creation?.type !== 'result') throw Error('Expected creation form')
  const form = providerCreationViewSchema.parse(creation.value)
  const create: Operation = { method: 'remote.providerCreationWrite', kind: 'custom', provider: 'created-route', name: 'Created',
    useKey: false, confirmed: true, snapshot: form.snapshot, expectedRevision: form.revision,
    api: 'openai-completions', baseURL: 'https://example.invalid', models: ['one'] }
  expect(await f.request(create)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(create, { ...admin, connectionId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  expect(await f.request(create, admin)).toMatchObject({ type: 'result', value: { created: { provider: 'created-route', useKey: false } } })
  expect(f.ctx.settings.get('llm-pi-ai')).toMatchObject({ providers: { 'created-route': { models: [{ id: 'one' }] }, beta: { displayName: 'Beta' } } })
  f.services.computerKey = { credentials: () => f.ctx.get('credentials'), settings: () => f.ctx.get('settings'), revision: () => 0, enrollmentRef: 'DSH_MOBILE_ENROLLMENT_TOKEN' }
  const setupRead = await f.request({ method: 'remote.providerSettingsRead', provider: 'created-route' }, admin)
  if (setupRead?.type !== 'result') throw Error('Expected settings for Key setup')
  const setupView = providerSettingsViewSchema.parse(setupRead.value)
  expect(setupView.keySetupAvailable).toBe(true)
  const setup: Operation = { method: 'remote.providerKeySetup', provider: 'created-route', confirmed: true,
    snapshot: setupView.snapshot, expectedRevision: setupView.revision }
  expect(await f.request(setup)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(setup, { ...admin, connectionId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  expect(await f.request(setup, admin)).toMatchObject({ type: 'result', value: { keySetupAvailable: false } })
  expect(f.ctx.settings.get('llm-pi-ai')).toMatchObject({ providers: { 'created-route': { apiKeyEnv: expect.stringMatching(/^DSHM_PROVIDER_/) }, beta: { displayName: 'Beta' } } })
})

test('真实Host路由的自定义模型Key仍要求管理权限和同设备连接快照', async () => {
  await mkdir('artifacts/tests', { recursive: true })
  const directory = await mkdtemp(resolve('artifacts/tests/custom-key-route-'))
  const ctx = new Context()
  ctx.provide('launchEnvironment', createLaunchEnvironmentSnapshot([{ source: 'process', values: {} }]))
  const fiber = ctx.plugin(LocalCredentialProvider, { path: join(directory, '.credentials.yaml'), watch: false })
  await fiber; cleanup.push(() => fiber.dispose())
  let revision = 0
  ctx.on('credentials/reference-updated', () => { revision++ })
  const config = { apiKeyEnv: 'MY_DEEPSEEK_KEY' }
  const f = await fixture({ credentials: () => ctx.get('credentials'), settings: () => ({ get: () => config }),
    revision: () => revision, enrollmentRef: 'DSH_MOBILE_ENROLLMENT_TOKEN' })
  expect(await f.request({ method: 'remote.keyRead' })).toMatchObject({ type: 'error', code: 'management_required' })
  const admin = { ...f.context, management: true }
  const read = await f.request({ method: 'remote.keyRead' }, admin)
  if (read?.type !== 'result') throw Error('Expected key state')
  const view = computerKeyViewSchema.parse(read.value)
  const operation = { method: 'remote.keyWrite' as const, snapshot: view.snapshot, change: { op: 'set' as const, value: 'TEST_ROUTE_CUSTOM_KEY' } }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(operation, { ...admin, connectionId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_key_stale' })
  expect(await f.request(operation, { ...admin, deviceId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_key_stale' })
  const written = await f.request(operation, admin)
  expect(written).toMatchObject({ type: 'result', value: { configured: true, writable: true } })
  expect(JSON.stringify(written)).not.toMatch(/MY_DEEPSEEK_KEY|TEST_ROUTE_CUSTOM_KEY/)
  expect((await ctx.credentials.describe(credentialRef('MY_DEEPSEEK_KEY'))).configured).toBe(true)
  expect((await ctx.credentials.describe(credentialRef('DEEPSEEK_API_KEY'))).configured).toBe(false)
  expect(await f.request(operation, admin)).toMatchObject({ type: 'error', code: 'remote_key_stale' })
  Object.assign(config, { providers: { alpha: { apiKeyEnv: 'MY_PROVIDER_KEY' } } })
  const target = { provider: 'alpha' }
  expect(await f.request({ method: 'remote.keyRead', target })).toMatchObject({ type: 'error', code: 'management_required' })
  const providerRead = await f.request({ method: 'remote.keyRead', target }, admin)
  if (providerRead?.type !== 'result') throw Error('Expected provider key state')
  const providerView = computerKeyViewSchema.parse(providerRead.value)
  const providerWrite: Operation = { method: 'remote.keyWrite', target, snapshot: providerView.snapshot, change: { op: 'set', value: 'TEST_PROVIDER_ONLY' } }
  expect(await f.request(providerWrite)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request({ ...providerWrite, target: { provider: 'beta' } }, admin)).toMatchObject({ type: 'error', code: 'remote_key_invalid' })
  expect(await f.request(providerWrite, admin)).toMatchObject({ type: 'result', value: { target, provider: 'alpha', configured: true } })
  expect((await ctx.credentials.describe(credentialRef('MY_PROVIDER_KEY'))).configured).toBe(true)
})

test('提供方地址经真实Host路由保存，另一提供方快照拒绝，旧配置秘密不返回', async () => {
  class EndpointSettings extends SettingsProvider {
    doc: Record<string, unknown> = {}
    get writable() { return true }
    protected async load() { return this.doc }
    protected async persist(ns: SettingsNamespace, value: Record<string, unknown>) { this.doc[ns] = value }
  }
  const f = await fixture(), fiber = f.ctx.plugin(EndpointSettings); await fiber; cleanup.push(() => fiber.dispose())
  f.ctx.settings.register('llm-pi-ai', Schema.object({ providers: Schema.dict(Schema.object({ baseURL: Schema.string() })) }),
    { base: { providers: { alpha: { baseURL: 'https://example.invalid/PRIVATE' }, beta: { baseURL: 'https://other.invalid' } } } })
  f.services.settings = () => f.ctx.get('settings')
  const discoveries: unknown[] = []
  const modelDiscovery: NonNullable<ReturnType<NonNullable<RemoteServices['modelDiscovery']>>> = { discoverModels: async (namespace, request) => {
    discoveries.push({ namespace, request }); return [{ id: 'fixture-model' }]
  } }
  f.services.modelDiscovery = () => modelDiscovery
  const discoveryAdmin = { ...f.context, management: true }
  expect(await f.request({ method: 'remote.providerModelsDiscover', provider: 'alpha' }, discoveryAdmin))
    .toMatchObject({ type: 'result', value: { provider: 'alpha', rows: [{ id: 'fixture-model' }] } })
  expect(discoveries).toEqual([{ namespace: 'llm-pi-ai', request: { provider: 'alpha', baseURL: 'https://example.invalid/PRIVATE' } }])
  const context = { ...f.context, management: true }, read = await f.request({ method: 'remote.endpointRead', target: { provider: 'alpha' } }, context)
  expect(read).toMatchObject({ type: 'result', value: { target: { provider: 'alpha' }, origin: 'https://example.invalid' } })
  expect(JSON.stringify(read)).not.toContain('PRIVATE')
  if (!read || read.type !== 'result') throw Error('Expected endpoint result')
  const view = computerEndpointViewSchema.parse(read.value)
  const operation: Operation = { method: 'remote.endpointWrite', target: { provider: 'alpha' }, snapshot: view.snapshot,
    expectedRevision: view.revision, confirmed: true, change: { op: 'set', value: 'http://127.0.0.1:12345/v1' } }
  expect(await f.request({ ...operation, target: { provider: 'beta' } }, context)).toMatchObject({ type: 'error', code: 'remote_endpoint_stale' })
  expect(await f.request(operation, context)).toMatchObject({ type: 'result', value: { origin: 'http://127.0.0.1:12345', overridden: true } })
  expect(f.ctx.settings.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { baseURL: 'http://127.0.0.1:12345/v1' }, beta: { baseURL: 'https://other.invalid' } } })
  const modelsRead = await f.request({ method: 'remote.providerModelsRead', provider: 'alpha' }, context)
  if (modelsRead?.type !== 'result') throw Error('Expected models result')
  const modelView = providerModelsViewSchema.parse(modelsRead.value)
  const modelWrite: Operation = { method: 'remote.providerModelsWrite', provider: 'alpha', snapshot: modelView.snapshot,
    expectedRevision: modelView.revision, change: { op: 'set', rows: [{ id: 'new-model', name: 'New' }] } }
  expect(await f.request(modelWrite, context)).toMatchObject({ type: 'result', value: { rows: [{ id: 'new-model', name: 'New' }] } })
  expect(f.ctx.settings.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { baseURL: 'http://127.0.0.1:12345/v1', models: [{ id: 'new-model' }] } } })
  const settingsRead = await f.request({ method: 'remote.providerSettingsRead', provider: 'alpha' }, context)
  if (settingsRead?.type !== 'result') throw Error('Expected provider settings result')
  const settingsView = providerSettingsViewSchema.parse(settingsRead.value)
  const compatWrite: Operation = { method: 'remote.providerSettingsWrite', provider: 'alpha', snapshot: settingsView.snapshot,
    expectedRevision: settingsView.revision, edits: [], compat: { supportsStore: false } }
  expect(await f.request(compatWrite)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(compatWrite, context)).toMatchObject({ type: 'result', value: { compat: { overrides: { supportsStore: false } } } })
  expect(f.ctx.settings.get('llm-pi-ai')).toMatchObject({ providers: { alpha: { compat: { supportsStore: false }, models: [{ id: 'new-model' }] }, beta: { baseURL: 'https://other.invalid' } } })
  const overridesRead = await f.request({ method: 'remote.providerModelsRead', provider: 'beta', scope: 'overrides' }, context)
  if (overridesRead?.type !== 'result') throw Error('Expected overrides result')
  const overridesView = providerModelsViewSchema.parse(overridesRead.value)
  expect(overridesView).toMatchObject({ scope: 'overrides', blockedByModels: false })
  const overridesWrite: Operation = { method: 'remote.providerModelsWrite', provider: 'beta', scope: 'overrides',
    snapshot: overridesView.snapshot, expectedRevision: overridesView.revision, change: { op: 'set', rows: [{ id: 'catalog-model', name: 'Changed' }] } }
  expect(await f.request(overridesWrite, context)).toMatchObject({ type: 'result', value: { scope: 'overrides', rows: [{ id: 'catalog-model', name: 'Changed' }] } })
  expect(f.ctx.settings.get('llm-pi-ai')).toMatchObject({ providers: { beta: { modelOverrides: { 'catalog-model': { name: 'Changed' } } } } })
})

test('提供方管理操作在真实Host路由独立拒绝未授权设备', async () => {
  const f = await fixture()
  for (const operation of [{ method: 'remote.providerModelsRead', provider: 'alpha' },
    { method: 'remote.providerModelsDiscover', provider: 'alpha' },
    { method: 'remote.providerKeySetup', provider: 'alpha', confirmed: true, snapshot: randomUUID(), expectedRevision: 0 },
    { method: 'remote.providerRemovalRead', provider: 'alpha' },
    { method: 'remote.providerCreationRead' },
    { method: 'remote.providerCreationWrite', kind: 'catalog', provider: 'openai', name: '', useKey: false,
      confirmed: true, snapshot: randomUUID(), expectedRevision: 0 },
    { method: 'remote.providerRemovalWrite', provider: 'alpha', snapshot: randomUUID(), expectedRevision: 0 },
    { method: 'remote.providerModelsRead', provider: 'alpha', scope: 'overrides' },
    { method: 'remote.providerModelsWrite', provider: 'alpha', scope: 'overrides', snapshot: randomUUID(), expectedRevision: 0, change: { op: 'unset' } },
    { method: 'remote.providerModelsWrite', provider: 'alpha', snapshot: randomUUID(), expectedRevision: 0, change: { op: 'set', rows: [{ id: 'test-model' }] } },
    { method: 'remote.providerSettingsList' }, { method: 'remote.providerSettingsRead', provider: 'alpha' },
    { method: 'remote.providerSettingsWrite', provider: 'alpha', snapshot: randomUUID(), expectedRevision: 0, edits: [], compat: { supportsStore: false } },
    { method: 'remote.providerSettingsWrite', provider: 'alpha', snapshot: randomUUID(), expectedRevision: 0,
      edits: [{ op: 'set', key: 'timeoutMs', value: 1000 }] }] as Operation[]) {
    expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  }
  expect(await f.request({ method: 'remote.providerSettingsList' }, { ...f.context, management: true }))
    .toMatchObject({ type: 'error', code: 'remote_settings_unavailable' })
})

test('Office 后台保留一个前台通道，取消后容量可再次使用', async () => {
  const f = await fixture(), started: string[] = [], frames: HostFrame[] = []
  const shared = f.services.connection.createSharedFetchHandler('/api')
  f.services.connection = { createSharedFetchHandler: () => ({ ...shared, fetch: async request => {
    started.push((await request.json()).payload.args.priority)
    await new Promise<void>((resolve, reject) => {
      if (request.signal.aborted) { reject(request.signal.reason); return }
      request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true })
    })
    return new Response()
  } }) }
  const begin = (priority: 'foreground' | 'background') => {
    const id = randomUUID()
    return { id, done: f.adapter.receive({ type: 'request', id, context: f.context,
      operation: { method: 'remote.office', sessionId: 's', path: 'a.docx', priority } }, frame => frames.push(frame)) }
  }
  const first = begin('background'); await expect.poll(() => started.length).toBe(1)
  const rejected = begin('background'); await rejected.done
  expect(frames).toContainEqual({ type: 'error', id: rejected.id, code: 'remote_office_busy' })
  const second = begin('foreground'); await expect.poll(() => started).toEqual(['background', 'foreground'])
  for (const task of [first, second]) { await f.adapter.receive({ type: 'cancel', id: task.id }, () => {}); await task.done }
  const last = begin('background'); await expect.poll(() => started.length).toBe(3)
  await f.adapter.receive({ type: 'cancel', id: last.id }, () => {}); await last.done
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { officePriority: true } })
})

test('电脑打开固定原 HTTP 入口，保留当前设备与 Host 归属边界', async () => {
  const f = await fixture(), paths: string[] = []
  for (const path of ['/api/present.host', '/api/present.open', '/api/changes.open']) {
    f.ctx.connection.fetch.register({ path, methods: path.endsWith('host') ? ['GET'] : ['POST'], requestBody: 'buffered',
      fetch: async request => { paths.push(new URL(request.url).pathname); return path.endsWith('host')
        ? Response.json({ name: 'test-desktop', available: true, fileManager: 'explorer' }) : new Response(null, { status: 204 }) } })
  }
  expect(await f.request({ method: 'remote.desktop' })).toMatchObject({ type: 'result', value: { name: 'test-desktop' } })
  for (const source of ['presented', 'changes'] as const) expect(await f.request({ method: 'remote.openFile', source, sessionId: 'own', seq: 1, index: 0, confirmed: true }))
    .toMatchObject({ type: 'result', value: { opened: true } })
  expect(paths).toEqual(['/api/present.host', '/api/present.open', '/api/changes.open'])
  expect(await f.request({ method: 'remote.desktop' }, { ...f.context, hostId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_identity_denied' })
  expect(paths).toHaveLength(3)
  expect(await f.request({ method: 'remote.rpc', endpoint: 'session/openWorkspacePath', payload: { args: { request: { path: 'anything' } } } }))
    .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
})

test('电脑设置在 Host 独立检查管理权限，不开放通用配置 RPC', async () => {
  const f = await fixture()
  for (const operation of [{ method: 'remote.pluginOperations' },
    { method: 'remote.pluginOperationRead', generation: randomUUID(), operationId: randomUUID() },
    { method: 'remote.pluginOperationStart', generation: randomUUID(), operationId: randomUUID(), endpoint: 'pluginManager/installBundle', payload: { args: { spec: 'fixture' } } },
    { method: 'remote.settingsRead', namespace: 'shell' },
    { method: 'remote.settingsWrite', namespace: 'agent-loop', snapshot: randomUUID(), expectedRevision: 0, edits: [{ op: 'set', key: 'maxParallelToolCalls', value: 2 }] },
    { method: 'remote.settingsRead' }, { method: 'remote.settingsWrite', snapshot: randomUUID(), expectedRevision: 0,
    edits: [{ op: 'set', key: 'maxTokens', value: 100 }] }, { method: 'remote.keyRead' },
    { method: 'remote.keyWrite', snapshot: randomUUID(), change: { op: 'set', value: 'TEST_KEY_ONLY' } },
    { method: 'remote.settingsRead', namespace: 'web-search-deepseek' },
    { method: 'remote.settingsWrite', namespace: 'web-search-deepseek', snapshot: randomUUID(), expectedRevision: 0, edits: [{ op: 'set', key: 'maxUses', value: 6 }] },
    { method: 'remote.keyRead', target: 'web-search-deepseek' },
    { method: 'remote.keyWrite', target: 'web-search-deepseek', snapshot: randomUUID(), change: { op: 'set', value: 'TEST_SEARCH_ONLY' } },
    { method: 'remote.endpointRead', target: 'web-search-deepseek' },
    { method: 'remote.endpointRead', target: { provider: 'openai' } },
    { method: 'remote.endpointWrite', target: { provider: 'openai' }, snapshot: randomUUID(), expectedRevision: 0, confirmed: true, change: { op: 'set', value: 'https://example.invalid' } },
    { method: 'remote.endpointWrite', target: 'web-search-deepseek', snapshot: randomUUID(), expectedRevision: 0, confirmed: true, change: { op: 'set', value: 'https://example.invalid' } },
    { method: 'remote.endpointRead' }, { method: 'remote.endpointWrite', snapshot: randomUUID(), expectedRevision: 0, confirmed: true, change: { op: 'set', value: 'https://example.invalid' } }] as const)
    expect(await f.request(operation as Operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request({ method: 'remote.settingsRead' }, { ...f.context, management: true }))
    .toMatchObject({ type: 'error', code: 'remote_settings_unavailable' })
  expect(await f.request({ method: 'remote.rpc', endpoint: 'settings/describe', payload: { args: {} } }, { ...f.context, management: true }))
    .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toEqual([])
  expect(await f.request({ method: 'remote.keyRead' }, { ...f.context, management: true }))
    .toMatchObject({ type: 'error', code: 'remote_key_unavailable' })
})

test('后台停止协商真实控制能力并转发固定操作，不支持时明确拒绝', async () => {
  const unsupported = await fixture()
  expect(await unsupported.request({ method: 'remote.jobStop', sessionId: 'own', jobId: 'pwsh-1', startedAt: 1, generation: randomUUID() }))
    .toMatchObject({ type: 'error', code: 'remote_job_control_unavailable' })
  const generation = randomUUID(), calls: unknown[] = []
  unsupported.services.jobControl = () => ({ generation, stop(operation) { calls.push(operation); return { status: 'requested' } } })
  expect(await unsupported.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { jobControlGeneration: generation } })
  const operation = { method: 'remote.jobStop' as const, sessionId: 'own', jobId: 'pwsh-1', startedAt: 1, generation }
  expect(await unsupported.request(operation)).toMatchObject({ type: 'result', value: { status: 'requested' } })
  expect(calls).toEqual([operation])
})

test('独立输出协商、容量和取消不返回迟到数据，也不接受另一 Host', async () => {
  const f = await fixture(), generation = randomUUID()
  const operation = { method: 'remote.jobOutput' as const, sessionId: 'own', jobId: 'pwsh-1', startedAt: 1,
    generation, stream: 'stdout' as const, fromByte: 0, maxBytes: 65536 }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'remote_job_output_unavailable' })
  const pending: Array<{ signal: AbortSignal; resolve: (value: { state: 'pending'; status: 'running' }) => void }> = []
  f.services.jobControl = () => ({ generation, outputAvailable: true, stop: () => ({ status: 'requested' }),
    output: (_operation, signal) => new Promise(resolve => pending.push({ signal, resolve })) })
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { jobOutput: true, jobControlGeneration: generation } })
  expect(await f.request(operation, { ...f.context, hostId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_identity_denied' })
  const ids = Array.from({ length: 4 }, () => randomUUID()), frames: HostFrame[] = []
  const reads = ids.map(id => f.adapter.receive({ type: 'request', id, operation, context: f.context }, frame => frames.push(frame)))
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'remote_job_output_busy' })
  await f.adapter.receive({ type: 'cancel', id: ids[0] }, frame => frames.push(frame))
  expect(pending[0]?.signal.aborted).toBe(true)
  for (const item of pending) item.resolve({ state: 'pending', status: 'running' })
  await Promise.all(reads)
  expect(frames).toHaveLength(3); expect(frames.some(frame => frame.id === ids[0])).toBe(false)
})

test('前台输出只协商已安装能力，固定身份请求支持取消且与后台共用读取限额', async () => {
  const f = await fixture(), generation = randomUUID(), outputId = randomUUID()
  const operation = { method: 'remote.commandOutput' as const, sessionId: 'own', rootCallId: 'root', callId: 'call', rootCallTime: 1,
    generation, stream: 'stdout' as const, fromByte: 0, maxBytes: 65536 }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'remote_command_unavailable' })
  const pending: Array<{ signal: AbortSignal; resolve: (value: any) => void }> = []
  f.services.commandOutput = () => ({ generation, available: true, read: (_operation, signal) => new Promise(resolve => pending.push({ signal, resolve })) })
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { commandOutputGeneration: generation } })
  expect(await f.request(operation, { ...f.context, hostId: randomUUID() })).toMatchObject({ type: 'error', code: 'remote_identity_denied' })
  const ids = Array.from({ length: 4 }, () => randomUUID()), frames: HostFrame[] = []
  const reads = ids.map(id => f.adapter.receive({ type: 'request', id, operation, context: f.context }, frame => frames.push(frame)))
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'remote_command_busy' })
  await f.adapter.receive({ type: 'cancel', id: ids[0] }, frame => frames.push(frame))
  expect(pending[0]?.signal.aborted).toBe(true)
  for (const item of pending) item.resolve({ state: 'pending', status: 'running', outputId })
  await Promise.all(reads); expect(frames).toHaveLength(3); expect(frames.some(frame => frame.id === ids[0])).toBe(false)
})

test('反馈按原 request 转发，Host 独立拒绝额外目的地和缺失版本', async () => {
  const f = await fixture()
  const request = { sessionId: 'test', messageId: 'assistant-message', rating: 'positive', ifVersion: null }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'messageFeedback/put', payload: { args: { request } } })).toMatchObject({ type: 'result' })
  expect(f.calls[0]).toEqual({ endpoint: 'messageFeedback/put', payload: { args: { request } } })
  for (const invalid of [{ ...request, destination: 'https://other.example' }, { ...request, ifVersion: undefined }])
    expect(await f.request({ method: 'remote.rpc', endpoint: 'messageFeedback/put', payload: { args: { request: invalid } } })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toHaveLength(1)
})

test('目标操作按原生成参数转发，Host 独立拒绝错误版本和额外配置', async () => {
  const f = await fixture(), args = { agentId: 'test', ref: { id: 'goal', revision: 2 } }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'goals/pause', payload: { args } })).toMatchObject({ type: 'result' })
  expect(f.calls[0]).toEqual({ endpoint: 'goals/pause', payload: { args } })
  for (const invalid of [{ ...args, ref: { id: 'goal', revision: 0 } }, { ...args, tools: [] }])
    expect(await f.request({ method: 'remote.rpc', endpoint: 'goals/pause', payload: { args: invalid } })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toHaveLength(1)
})

test('Agent 普通授权仅转发目录及当前会话选择，独立拒绝额外参数和预设管理', async () => {
  const f = await fixture()
  const args = { agentId: 'session', agentPreset: 'minimal' }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'agentPresets/list', payload: { args: {} } })).toMatchObject({ type: 'result' })
  expect(await f.request({ method: 'remote.rpc', endpoint: 'agentPresets/select', payload: { args } })).toMatchObject({ type: 'result' })
  expect(f.calls).toHaveLength(2)
  expect(f.calls[1]).toEqual({ endpoint: 'agentPresets/select', payload: { args } })
  for (const operation of [
    { method: 'remote.rpc', endpoint: 'agentPresets/select', payload: { args: { ...args, cwd: '/any' } } },
  ] as const) expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toHaveLength(2)
})

test('预设读取复制删除在Host独立要求管理权限并保留原参数', async () => {
  const f = await fixture()
  for (const [endpoint, args] of [
    ['agentPresets/read', { agentPreset: 'standard' }],
    ['agentPresets/copy', { from: 'standard', id: 'test-copy', name: '测试副本' }],
    ['agentPresets/deletePreset', { id: 'test-copy' }],
  ] as const) {
    const operation: Operation = { method: 'remote.rpc', endpoint, payload: { args } }
    const count = f.calls.length
    expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
    expect(f.calls).toHaveLength(count)
    expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'result' })
    expect(f.calls.at(-1)).toEqual({ endpoint, payload: { args } })
    expect(await f.request({ ...operation, payload: { args: { ...args, path: '/arbitrary' } } }, { ...f.context, management: true }))
      .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
})

test('预设默认值和模式开关写入由Host再次核对权限与固定字段', async () => {
  const f = await fixture()
  const payload = { args: { ns: 'agent-presets', patch: { default: 'standard', modeSelectionEnabled: true }, expectedRevision: 3 } }
  const operation: Operation = { method: 'remote.rpc', endpoint: 'settings/update', payload }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(f.calls).toHaveLength(0)
  expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'result' })
  expect(f.calls[0]).toEqual({ endpoint: 'settings/update', payload })
  for (const args of [{ ...payload.args, ns: 'llm-deepseek' }, { ...payload.args, patch: { roots: [] } }]) {
    expect(await f.request({ ...operation, payload: { args } }, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
  expect(f.calls).toHaveLength(1)
})

test('手机预设目录只返回Host解析的位置，拒绝越权、内置及服务替换，不调用桌面打开接口', async () => {
  const f = await fixture()
  const operation: Operation = { method: 'remote.rpc', endpoint: 'settings/openAgentPresetDirectory', payload: { args: { agentPreset: 'test-copy' } } }
  const path = resolve('artifacts', 'test-copy', 'agent.cordis.yml')
  const preset = { id: 'test-copy', trust: 'user' as 'user' | 'system', path }
  const service = { resolve: async () => preset }
  f.services.agentPresets = () => service
  f.services.profilePresets = () => ({ presets: service, editor: { documentPath: path, entries: () => [] } })
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { presetProfileDirectory: false } })
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'result', value: { ok: true, value: { opened: false, path: resolve('artifacts', 'test-copy') } } })
  preset.trust = 'system'
  expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  preset.trust = 'user'
  service.resolve = async () => { f.services.agentPresets = () => ({ resolve: async () => preset }); return preset }
  expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_settings_stale' })
  expect(f.calls).toHaveLength(0)
})

test('差异固定 GET 原 Connection 路由，编码坐标、窗口确认与取消保留', async () => {
  const f = await fixture(), body = JSON.stringify({ text: '中文'.repeat(120000) })
  f.ctx.connection.fetch.register({ path: '/api/changes.diff', methods: ['GET'], requestBody: 'buffered', fetch: request => {
    const query = new URL(request.url).searchParams
    expect(query.get('sessionId')).toBe('original&index=99')
    expect(query.get('seq')).toBe('5'); expect(query.get('index')).toBe('0')
    return Promise.resolve(new Response(body, { headers: { 'content-type': 'application/json' } }))
  } })
  const frames: HostFrame[] = [], id = randomUUID()
  const pending = f.adapter.receive({ type: 'request', id, context: f.context,
    operation: { method: 'remote.changes', sessionId: 'original&index=99', seq: 5, index: 0 } }, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(5)
  expect(frames[0]).toMatchObject({ type: 'event', value: { type: 'metadata', sessionId: 'original&index=99', seq: 5, index: 0 } })
  expect(frames.filter(frame => frame.type === 'event' && (frame.value as any).type === 'chunk')).toHaveLength(4)
  await f.adapter.receive({ type: 'ack', id, count: 1 }, () => {})
  await expect.poll(() => frames.length).toBe(6)
  await f.adapter.receive({ type: 'cancel', id }, () => {}); await pending
  expect(frames.some(frame => frame.type === 'end')).toBe(false)
  expect(f.calls).toEqual([])
})

test('差异缺失、非 JSON 与超限不会伪装成完整结果', async () => {
  const f = await fixture()
  let response = new Response('missing', { status: 404 })
  f.ctx.connection.fetch.register({ path: '/api/changes.summary', methods: ['GET'], requestBody: 'buffered', fetch: () => Promise.resolve(response) })
  const operation: Operation = { method: 'remote.changes', sessionId: 's', seq: 1 }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'remote_changes_missing' })
  response = new Response('<html>error</html>')
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'remote_changes_invalid' })
  response = new Response(new Uint8Array(32 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } })
  const frames: HostFrame[] = []
  await f.adapter.receive({ type: 'request', id: randomUUID(), context: f.context, operation }, frame => frames.push(frame))
  expect(frames.at(-1)).toMatchObject({ type: 'error', code: 'remote_changes_too_large' })
  expect(frames.some(frame => frame.type === 'end')).toBe(false)
})

test('权限选择通过原 Connection，Host 自己也拒绝通用命令和附件', async () => {
  const f = await fixture()
  const args = { agentId: 'current-session', line: '/permission read-only', submittedAttachments: [] }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'commands/execute', payload: { args } }))
    .toMatchObject({ type: 'result', value: { ok: true } })
  for (const invalid of [{ ...args, line: '/clear' }, { ...args, line: '/permission read-only\n/clear' },
    { ...args, submittedAttachments: [{ type: 'file', receiptId: 'private' }] }]) {
    expect(await f.request({ method: 'remote.rpc', endpoint: 'commands/execute', payload: { args: invalid } }))
      .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
  expect(f.calls).toEqual([{ endpoint: 'commands/execute', payload: { args } }])
})

test('计划开关只允许两个固定原命令，不向模型发送额外文字或附件', async () => {
  const f = await fixture()
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { planModeControl: true } })
  for (const line of ['/plan', '/plan off']) {
    expect(await f.request({ method: 'remote.rpc', endpoint: 'commands/execute', payload: { args: { agentId: 'current', line, submittedAttachments: [] } } }))
      .toMatchObject({ type: 'result', value: { ok: true } })
  }
  for (const line of ['/plan on', '/plan anything', '/plan off\n/clear', '/plan ', '/plan\n', '/plan\toff']) {
    expect(await f.request({ method: 'remote.rpc', endpoint: 'commands/execute', payload: { args: { agentId: 'current', line, submittedAttachments: [] } } }))
      .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
  for (const extra of [{ submittedAttachments: [{ type: 'text', text: 'hi' }] }, { unsafe: true }, { agentId: '' }]) {
    expect(await f.request({ method: 'remote.rpc', endpoint: 'commands/execute', payload: { args: { agentId: 'current', line: '/plan', submittedAttachments: [], ...extra } } }))
      .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
  expect(f.calls).toEqual(['/plan', '/plan off'].map(line => ({ endpoint: 'commands/execute', payload: { args: { agentId: 'current', line, submittedAttachments: [] } } })))
})

test('uses the real Connection envelope, denies unreviewed routes and never lets cwd bypass workspace creation', async () => {
  const f = await fixture()
  const payload = { args: { request: { workspaceId: 'existing', agentPreset: 'default' } } }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'session/create', payload })).toMatchObject({ type: 'result', value: { ok: true } })
  expect(f.calls).toEqual([{ endpoint: 'session/create', payload }])
  for (const [endpoint, args] of [
    ['session/create', { request: { cwd: 'C:/private' } }],
    ['session/create', { request: { workspaceId: 'existing', cwd: 'C:/private' } }],
    ['workspace/create', { request: { path: 'C:/private' } }],
    ['terminal/write', { data: 'command' }], ['credentials/resolve', {}], ['dsh-mobile', {}],
    ['session/../credentials/resolve', {}], ['unreviewedPlugin/run', {}],
  ] as const) {
    expect(await f.request({ method: 'remote.rpc', endpoint, payload: { args } })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
  expect(f.calls).toHaveLength(1)
  expect(await f.request({ method: 'remote.rpc', endpoint: 'session/list', payload: { args: {} } }, { ...f.context, hostId: randomUUID() }))
    .toMatchObject({ type: 'error', code: 'remote_identity_denied' })
})

test('bounded file reads preserve the original scope and reject oversized windows before Host dispatch', async () => {
  const f = await fixture()
  const args = { workspaceFileScopeId: 'existing-session', path: 'C:/project/readme.md', range: { offset: 65536, length: 65536 } }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'workspaceFiles/readBytes', payload: { args } })).toMatchObject({ type: 'result', value: { ok: true } })
  expect(f.calls).toEqual([{ endpoint: 'workspaceFiles/readBytes', payload: { args } }])
  expect(await f.request({ method: 'remote.rpc', endpoint: 'workspaceFiles/readBytes', payload: { args: { ...args, range: { offset: 0, length: 65537 } } } })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls).toHaveLength(1)
})

test('read-only composer catalogs do not grant command execution', async () => {
  const f = await fixture()
  for (const endpoint of ['commands/list', 'permissionPresets/catalog']) {
    expect(await f.request({ method: 'remote.rpc', endpoint, payload: { args: {} } }))
      .toMatchObject({ type: 'result', value: { ok: true } })
  }
  expect(await f.request({ method: 'remote.rpc', endpoint: 'commands/execute', payload: { args: { line: '/permission full' } } }))
    .toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  expect(f.calls.map(call => call.endpoint)).toEqual(['commands/list', 'permissionPresets/catalog'])
})

test('upload streams ordered bytes through the real fixed Connection route and preserves the original receipt', async () => {
  const f = await fixture(), frames: HostFrame[] = [], id = randomUUID(), pieces: Buffer[] = []
  const off = f.ctx.connection.fetch.register({ path: '/api/session/uploadFileBinary', methods: ['POST'], requestBody: 'streaming',
    fetch: async request => {
      expect(request.headers.get('content-type')).toBe('application/octet-stream')
      expect(new URL(request.url).searchParams.get('sessionId')).toBe('existing-session')
      expect(new URL(request.url).searchParams.get('name')).toBe('notes & 中文.pdf')
      for await (const chunk of request.body!) pieces.push(Buffer.from(chunk))
      return Response.json({ ok: true, value: { receiptId: 'host-receipt', file: { attachmentId: 'host-file', name: 'notes.pdf', bytes: pieces.reduce((n, b) => n + b.length, 0) } } })
    } }); cleanup.push(off)
  const running = f.adapter.receive({ type: 'request', id, context: f.context,
    operation: { method: 'remote.upload', sessionId: 'existing-session', name: 'notes & 中文.pdf' } }, frame => frames.push(frame))
  const bytes = Buffer.alloc(RESOURCE_CHUNK_BYTES, 73)
  expect(frames[0]).toMatchObject({ type: 'event', value: { type: 'credit', count: 4 } })
  for (let i = 0; i < 9; i++) {
    await f.adapter.receive({ type: 'uploadChunk', id, data: bytes.toString('base64') }, frame => frames.push(frame))
    await expect.poll(() => pieces.length).toBe(i + 1)
  }
  await f.adapter.receive({ type: 'uploadEnd', id }, frame => frames.push(frame)); await running
  expect(Buffer.concat(pieces)).toEqual(Buffer.alloc(RESOURCE_CHUNK_BYTES * 9, 73))
  expect(frames.at(-1)).toMatchObject({ type: 'result', value: { ok: true, value: { receiptId: 'host-receipt' } } })
})

test('revoking a live upload cancels the original request body without emitting a success receipt', async () => {
  const f = await fixture(), frames: HostFrame[] = [], id = randomUUID()
  let stopped = false
  const off = f.ctx.connection.fetch.register({ path: '/api/session/uploadFileBinary', methods: ['POST'], requestBody: 'streaming',
    fetch: async request => {
      try { for await (const _ of request.body!) { /* 等待下一块时撤销连接。 */ } }
      catch { stopped = request.signal.aborted }
      return Response.json({ ok: true, value: { receiptId: 'must-not-arrive' } })
    } }); cleanup.push(off)
  const running = f.adapter.receive({ type: 'request', id, context: f.context,
    operation: { method: 'remote.upload', sessionId: 'fixture-session' } }, frame => frames.push(frame))
  await f.adapter.receive({ type: 'uploadChunk', id, data: 'eA==' }, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(2)
  await f.adapter.receive({ type: 'cancel', id }, () => {}); await running
  expect(stopped).toBe(true)
  expect(frames.every(frame => frame.type === 'event')).toBe(true)
})

test('management is explicit and old or mismatched Host versions cannot advertise compatibility', async () => {
  const f = await fixture()
  const operation: Operation = { method: 'remote.rpc', endpoint: 'pluginManager/installBundle', payload: { args: { spec: 'test' } } }
  expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(f.calls).toHaveLength(0)
  expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'result' })
  const negotiation = await f.request({ method: 'remote.negotiate', version: 2 })
  expect(negotiation).toMatchObject({ type: 'result', value: { transport: 2, management: false, graphRevision: 'initial' } })
  expect(JSON.stringify(negotiation)).not.toContain('installBundle')
  const inventory: Operation = { method: 'remote.rpc', endpoint: 'pluginInventory/list', payload: { args: {} } }
  const count = f.calls.length
  expect(await f.request(inventory)).toMatchObject({ type: 'error', code: 'management_required' })
  expect(f.calls).toHaveLength(count)
  expect(await f.request(inventory, { ...f.context, management: true })).toMatchObject({ type: 'result' })
  expect(await f.request({ ...inventory, payload: { args: { config: true } } }, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  f.services.version = 'different'
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'error', code: 'unsupported_dsh_version' })
})

test('工作区管理在 Host 独立拒绝普通设备，授权后只转发精确请求', async () => {
  const f = await fixture()
  for (const [endpoint, request] of [
    ['workspace/rename', { workspaceId: 'w', title: '新名称' }],
    ['workspace/delete', { workspaceId: 'w' }],
    ['workspace/insertBefore', { workspaceId: 'w', beforeWorkspaceId: 'b' }],
  ] as const) {
    const operation: Operation = { method: 'remote.rpc', endpoint, payload: { args: { request } } }
    expect(await f.request(operation)).toMatchObject({ type: 'error', code: 'management_required' })
    expect(await f.request(operation, { ...f.context, management: true })).toMatchObject({ type: 'result' })
    expect(await f.request({ ...operation, payload: { args: { request: { ...request, deleteFiles: true } } } }, { ...f.context, management: true })).toMatchObject({ type: 'error', code: 'remote_operation_denied' })
  }
  expect(f.calls).toHaveLength(3)
  expect(await f.request({ method: 'remote.negotiate', version: 2 })).toMatchObject({ type: 'result', value: { workspaceManagement: true, management: false } })
})

test.each(['session/prompt', 'subagents/prompt'] as const)('图片消息分片仅进入原 %s 路由，原始大请求完整且取消不提交', async endpoint => {
  const f = await fixture(), id = randomUUID(), frames: HostFrame[] = []
  const payload = { args: { request: { sessionId: 's1', requestId: randomUUID(), mode: 'queue', content: [
    { type: 'image', mediaType: 'image/png', data: Buffer.alloc(2400000, 45).toString('base64') },
  ] } } }
  let credits = 0
  const running = f.adapter.receive({ type: 'request', id, context: f.context, operation: { method: 'remote.prompt', rpcId: id, endpoint } }, frame => {
    frames.push(frame)
    if (frame.type === 'event') credits += (frame.value as { count: number }).count
  })
  const bytes = Buffer.from(JSON.stringify({ type: 'client-request', rpcId: id, method: endpoint, payload }))
  for (let offset = 0; offset < bytes.length; offset += RESOURCE_CHUNK_BYTES) {
    await expect.poll(() => credits).toBeGreaterThan(0); credits--
    await f.adapter.receive({ type: 'uploadChunk', id, data: bytes.subarray(offset, offset + RESOURCE_CHUNK_BYTES).toString('base64') }, () => {})
  }
  await f.adapter.receive({ type: 'uploadEnd', id }, () => {}); await running
  expect(frames.at(-1), JSON.stringify(frames.at(-1))).toMatchObject({ type: 'result', value: { ok: true } })
  expect(f.calls).toHaveLength(1)
  expect(f.calls[0]?.endpoint).toBe(endpoint)
  expect(JSON.stringify(f.calls[0]?.payload) === JSON.stringify(payload)).toBe(true)
  const stoppedId = randomUUID()
  const stopped = f.adapter.receive({ type: 'request', id: stoppedId, context: f.context, operation: { method: 'remote.prompt', rpcId: stoppedId } }, () => {})
  await f.adapter.receive({ type: 'uploadChunk', id: stoppedId, data: Buffer.from('{"args":').toString('base64') }, () => {})
  await f.adapter.receive({ type: 'cancel', id: stoppedId }, () => {}); await stopped
  expect(f.calls).toHaveLength(1)
})

test('图片正文不能把固定路由改成其他 RPC，损坏正文不会调用 Host', async () => {
  const f = await fixture()
  for (const body of ['{', JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: 'terminal/write', payload: { args: { data: 'not-executed' } } })]) {
    const id = randomUUID(), frames: HostFrame[] = []
    const running = f.adapter.receive({ type: 'request', id, context: f.context, operation: { method: 'remote.prompt', rpcId: id } }, frame => frames.push(frame))
    await f.adapter.receive({ type: 'uploadChunk', id, data: Buffer.from(body).toString('base64') }, () => {})
    await f.adapter.receive({ type: 'uploadEnd', id }, () => {}); await running
    expect(frames.at(-1)?.type).toBe('error')
    expect(f.calls).toHaveLength(0)
  }
})

test('event replies belong to the device AND connection that opened the original DSH stream', async () => {
  const f = await fixture(), id = randomUUID(), frames: HostFrame[] = []
  const running = f.adapter.receive({ type: 'request', id, context: f.context,
    operation: { method: 'remote.stream', endpoint: '$events', payload: { args: {} } } }, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(1)
  const reply: Operation = { method: 'remote.rpc', endpoint: '$events/result', payload: { args: { clientId: 'event-client', eventId: 'event', outcome: { kind: 'next' } } } }
  for (const changed of [{ ...f.context, deviceId: randomUUID() }, { ...f.context, connectionId: randomUUID() }]) {
    expect(await f.request(reply, changed)).toMatchObject({ type: 'error', code: 'remote_event_owner_denied' })
  }
  expect(await f.request(reply)).toMatchObject({ type: 'result' })
  await f.adapter.receive({ type: 'cancel', id }, () => {}); await running
  expect(f.cancelled()).toBe(true)
  expect(await f.request(reply)).toMatchObject({ type: 'error', code: 'remote_event_owner_denied' })
})

test('graph subscription returns current snapshots and releases listeners when the channel is revoked', async () => {
  const f = await fixture(), id = randomUUID(), frames: HostFrame[] = []
  const running = f.adapter.receive({ type: 'request', id, context: f.context, operation: { method: 'remote.graphFollow' } }, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(1)
  f.changeGraph(); await expect.poll(() => frames.length).toBe(2)
  expect(frames[1]).toMatchObject({ type: 'event', value: { rev: 'changed' } })
  f.adapter.dispose(); await running
  expect(f.listeners.size).toBe(0)
  expect(frames).toHaveLength(2)
})

test('bundle bytes are chunked with consumer backpressure and cancellation; no URL proxy exists', async () => {
  const f = await fixture(), id = randomUUID(), frames: HostFrame[] = []
  const bytes = Buffer.alloc(RESOURCE_CHUNK_BYTES * (RESOURCE_WINDOW + 2), 37)
  let requests = 0
  f.services.modules.fetchBundle = async request => {
    requests++; expect(new URL(request.url).pathname).toBe('/plugins/known/client.js')
    return new Response(bytes, { headers: { 'content-type': 'text/javascript', 'set-cookie': 'must-not-forward' } })
  }
  for (const path of ['/api/dsh-mobile', 'http://localhost/private', '//evil.invalid/plugins/a', '/plugins/../secret', '/plugins/a#key=x', '/plugins/\\private']) {
    expect(await f.request({ method: 'remote.resource', path, verb: 'GET' })).toMatchObject({ type: 'error', code: 'remote_resource_denied' })
  }
  expect(requests).toBe(0)
  const running = f.adapter.receive({ type: 'request', id, context: f.context,
    operation: { method: 'remote.resource', path: '/plugins/known/client.js?rev=one', verb: 'GET' } }, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(RESOURCE_WINDOW + 1)
  expect(frames[0]).toMatchObject({ type: 'event', value: { type: 'headers', headers: { 'content-type': 'text/javascript' } } })
  expect(JSON.stringify(frames[0])).not.toContain('cookie')
  await new Promise(resolve => setImmediate(resolve)); expect(frames).toHaveLength(RESOURCE_WINDOW + 1)
  await f.adapter.receive({ type: 'ack', id, count: RESOURCE_WINDOW }, () => {}); await running
  const chunks = frames.filter(frame => frame.type === 'event' && (frame.value as { type: string }).type === 'chunk')
  expect(Buffer.concat(chunks.map(frame => Buffer.from((frame as { value: { data: string } }).value.data, 'base64')))).toEqual(bytes)
  expect(frames.at(-1)).toMatchObject({ type: 'end' })
  const stopped: HostFrame[] = [], stopId = randomUUID()
  const waiting = f.adapter.receive({ type: 'request', id: stopId, context: f.context,
    operation: { method: 'remote.resource', path: '/plugins/known/client.js?rev=one', verb: 'GET' } }, frame => stopped.push(frame))
  await expect.poll(() => stopped.length).toBe(RESOURCE_WINDOW + 1)
  await f.adapter.receive({ type: 'cancel', id: stopId }, () => {}); await waiting
  expect(stopped).toHaveLength(RESOURCE_WINDOW + 1)
})

class SessionFixture extends Service {
  readonly typertRemote = bindTypertRemote(this, 'sessionFixture', { namespace: 'session' })
  constructor(ctx: Context) { super(ctx, 'sessionFixture') }
  @Remote
  create(request: { workspaceId: string }) { return { sessionId: 'fixture-session', workspaceId: request.workspaceId } }
  @Remote({ mode: 'stream' })
  async *follow(request: { sessionId: string }, signal: AbortSignal) {
    yield { type: 'snapshot', sessionId: request.sessionId }
    await new Promise<void>(resolve => { if (signal.aborted) resolve(); else signal.addEventListener('abort', () => resolve(), { once: true }) })
  }
}

test('actual DSH Gateway resolves original named arguments and original stream payload through the adapter', async () => {
  const ctx = new Context()
  ctx.provide('credentials', { modifyRecord: async (_: unknown, change: Function) => change(undefined) })
  for (const plugin of [connection, TypertRegistry, TypertGatewayService, SessionFixture]) {
    const fiber = ctx.plugin(plugin); await fiber.await(); cleanup.push(() => fiber.dispose())
  }
  const context = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
  const adapter = new RemoteAdapter({ connection: ctx.connection, gateway: ctx.typertGateway, version: '0.1.6-alpha.2',
    modules: { graph: () => ({ rev: 'fixture', entries: [], batches: [] }), onGraphChanged: () => () => {}, fetchBundle: async () => new Response() },
  }, context.hostId)
  cleanup.push(() => adapter.dispose())
  const frames: HostFrame[] = [], id = randomUUID()
  await adapter.receive({ type: 'request', id, context, operation: { method: 'remote.rpc', endpoint: 'session/create', payload: { args: { request: { workspaceId: 'existing' } } } } }, frame => frames.push(frame))
  expect(frames[0]).toEqual({ type: 'result', id, value: { ok: true, value: { sessionId: 'fixture-session', workspaceId: 'existing' } } })
  const streamId = randomUUID()
  const running = adapter.receive({ type: 'request', id: streamId, context, operation: { method: 'remote.stream', endpoint: 'session/follow', payload: { args: { request: { sessionId: 'fixture-session' } } } } }, frame => frames.push(frame))
  await expect.poll(() => frames.length).toBe(2)
  expect(frames[1]).toMatchObject({ type: 'event', value: { type: 'snapshot', sessionId: 'fixture-session' } })
  await adapter.receive({ type: 'cancel', id: streamId }, () => {}); await running
})
