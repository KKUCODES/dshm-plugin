import { afterEach, expect, test, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { createLaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { ComputerKey, type ComputerKeyServices } from '../src/computer-key.js'

const cleanups: Array<() => void> = []
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); vi.restoreAllMocks() })
async function fixture(inherited = false) {
  await mkdir('artifacts/tests', { recursive: true })
  const directory = await mkdtemp(resolve('artifacts/tests/computer-key-'))
  const ctx = new Context()
  ctx.provide('launchEnvironment', createLaunchEnvironmentSnapshot([{ source: 'process', values: inherited ? { DEEPSEEK_API_KEY: 'TEST_INHERITED_ONLY' } : {} }]))
  const fiber = ctx.plugin(LocalCredentialProvider, { path: join(directory, '.credentials.yaml'), watch: false }); await fiber
  cleanups.push(() => fiber.dispose())
  let config: object = { apiKeyEnv: 'DEEPSEEK_API_KEY' }, revision = 0
  ctx.on('credentials/reference-updated', () => { revision++ })
  const services: ComputerKeyServices = { credentials: () => ctx.get('credentials'), settings: () => ({ get: () => config }), revision: () => revision, enrollmentRef: 'DSH_MOBILE_ENROLLMENT_TOKEN' }
  const adapter = new ComputerKey(services); cleanups.push(() => adapter.dispose())
  return { ctx, adapter, services, directory, config: (value: object) => { config = value } }
}
const write = (adapter: ComputerKey, snapshot: string, value = 'TEST_WRITTEN_ONLY', owner = 'device:connection') => adapter.write(owner,
  { method: 'remote.keyWrite', snapshot, change: { op: 'set', value } }, new AbortController().signal)

test('其他提供方只管理已配置引用，跨路由/设备快照拒绝，不触及其他凭据', async () => {
  const f = await fixture(), target = { provider: 'alpha' }
  f.config({ providers: { alpha: { apiKeyEnv: 'ALPHA_TEST_KEY' }, beta: { apiKeyEnv: 'BETA_TEST_KEY' } } })
  await f.ctx.credentials.set(credentialRef('BETA_TEST_KEY'), 'TEST_BETA_KEEP')
  const view = await f.adapter.read('one', target)
  expect(view).toMatchObject({ provider: 'alpha', target, configured: false })
  expect(JSON.stringify(view)).not.toContain('ALPHA_TEST_KEY')
  const operation = { method: 'remote.keyWrite' as const, snapshot: view.snapshot, target, change: { op: 'set' as const, value: 'TEST_ALPHA_ONLY' } }
  await expect(f.adapter.write('two', operation, new AbortController().signal)).rejects.toThrow('remote_key_stale')
  await expect(f.adapter.write('one', { ...operation, target: { provider: 'beta' } }, new AbortController().signal)).rejects.toThrow('remote_key_invalid')
  const next = await f.adapter.write('one', operation, new AbortController().signal)
  expect(next).toMatchObject({ provider: 'alpha', target, configured: true })
  await expect(f.adapter.write('one', operation, new AbortController().signal)).rejects.toThrow('remote_key_stale')
  const contents = await readFile(join(f.directory, '.credentials.yaml'), 'utf8')
  expect(contents).toContain('TEST_ALPHA_ONLY'); expect(contents).toContain('TEST_BETA_KEEP')
  await f.adapter.write('one', { ...operation, snapshot: next.snapshot, change: { op: 'unset' } }, new AbortController().signal)
  expect(await readFile(join(f.directory, '.credentials.yaml'), 'utf8')).not.toContain('TEST_ALPHA_ONLY')
})

test('提供方原生认证不猜默认Key；非法/保留引用及配置更换拒绝', async () => {
  const f = await fixture(), target = { provider: 'alpha' }
  for (const apiKeyEnv of [undefined, 'DSH_MOBILE_FUTURE', 'dsh-mobile/host', '']) {
    f.config({ providers: { alpha: { apiKeyEnv } } })
    await expect(f.adapter.read('one', target)).rejects.toThrow('remote_key_reference_unsupported')
  }
  await expect(f.adapter.read('one', { provider: 'missing' })).rejects.toThrow('remote_key_unavailable')
  const alpha = { apiKeyEnv: 'ALPHA_TEST_KEY' }
  f.config({ providers: { alpha } })
  const view = await f.adapter.read('one', target)
  alpha.apiKeyEnv = 'BETA_TEST_KEY'
  await expect(f.adapter.write('one', { method: 'remote.keyWrite', target, snapshot: view.snapshot,
    change: { op: 'set', value: 'TEST_WRONG' } }, new AbortController().signal)).rejects.toThrow('remote_key_stale')
  expect((await f.ctx.credentials.describe(credentialRef('BETA_TEST_KEY'))).configured).toBe(false)
})

test('电脑已配置的自定义模型引用可写入和移除，不触及默认Key或注册凭据', async () => {
  const f = await fixture()
  f.config({ apiKeyEnv: 'MY_DEEPSEEK_KEY' })
  await f.ctx.credentials.set(credentialRef('DEEPSEEK_API_KEY'), 'TEST_DEFAULT_KEEP')
  await f.ctx.credentials.set(credentialRef('DSH_MOBILE_ENROLLMENT_TOKEN'), 'TEST_ENROLL_KEEP')
  const view = await f.adapter.read('device:connection')
  expect(view.configured).toBe(false)
  const next = await write(f.adapter, view.snapshot, 'TEST_CUSTOM_ONLY')
  expect(next.configured).toBe(true)
  expect(JSON.stringify(next)).not.toMatch(/MY_DEEPSEEK_KEY|TEST_/)
  const contents = await readFile(join(f.directory, '.credentials.yaml'), 'utf8')
  expect(contents).toContain('TEST_CUSTOM_ONLY')
  expect(contents).toContain('TEST_DEFAULT_KEEP')
  expect(contents).toContain('TEST_ENROLL_KEEP')
  const removed = await f.adapter.write('device:connection', { method: 'remote.keyWrite', snapshot: next.snapshot,
    change: { op: 'unset' } }, new AbortController().signal)
  expect(removed.configured).toBe(false)
  expect(await readFile(join(f.directory, '.credentials.yaml'), 'utf8')).not.toContain('TEST_CUSTOM_ONLY')
})

test('自定义引用改变或其凭据更新后旧快照失效，包括原配置对象原地变化', async () => {
  const f = await fixture(), config = { apiKeyEnv: 'MY_DEEPSEEK_KEY' }
  f.config(config)
  let view = await f.adapter.read('device:connection')
  await f.ctx.credentials.set(credentialRef('MY_DEEPSEEK_KEY'), 'TEST_PC_CUSTOM')
  await expect(write(f.adapter, view.snapshot)).rejects.toThrow('remote_key_stale')
  view = await f.adapter.read('device:connection')
  config.apiKeyEnv = 'MY_OTHER_KEY'
  await expect(write(f.adapter, view.snapshot)).rejects.toThrow('remote_key_stale')
  expect((await f.ctx.credentials.describe(credentialRef('MY_OTHER_KEY'))).configured).toBe(false)
})

test('自定义引用沿用原语法，保留注册名和整个DSH Mobile命名空间', async () => {
  const f = await fixture()
  f.services.enrollmentRef = 'MY_BOOTSTRAP_KEY'
  for (const ref of ['MY_BOOTSTRAP_KEY', 'my_bootstrap_key', 'DSH_MOBILE_ENROLLMENT_TOKEN', 'dsh_mobile_future_secret', 'dsh-mobile/host', 'BAD KEY', '', 42]) {
    f.config({ apiKeyEnv: ref })
    await expect(f.adapter.read('device:connection')).rejects.toThrow('remote_key_reference_unsupported')
  }
})

test('搜索使用自己的自定义引用，内联Key仍只读且不返回原值', async () => {
  const f = await fixture(), search = new ComputerKey(f.services, 'web-search-deepseek')
  cleanups.push(() => search.dispose())
  f.config({ apiKeyEnv: 'MY_SEARCH_KEY' })
  let view = await search.read('device:connection')
  const operation = { method: 'remote.keyWrite' as const, target: 'web-search-deepseek' as const,
    snapshot: view.snapshot, change: { op: 'set' as const, value: 'TEST_CUSTOM_SEARCH' } }
  view = await search.write('device:connection', operation, new AbortController().signal)
  expect(view.configured).toBe(true)
  expect((await f.ctx.credentials.describe(credentialRef('DEEPSEEK_API_KEY'))).configured).toBe(false)
  f.config({ apiKeyEnv: 'MY_SEARCH_KEY', apiKey: 'TEST_INLINE_SEARCH' })
  view = await search.read('device:connection')
  expect(view.writable).toBe(false)
  expect(JSON.stringify(view)).not.toMatch(/MY_SEARCH_KEY|TEST_/)
  await expect(search.write('device:connection', { ...operation, snapshot: view.snapshot }, new AbortController().signal)).rejects.toThrow('remote_key_read_only')
})

test('原文件凭据服务的保存/重新读取/移除；仅返回配置状态，保留其他凭据', async () => {
  const { ctx, adapter, directory } = await fixture()
  await ctx.credentials.set(credentialRef('DSH_MOBILE_ENROLLMENT_TOKEN'), 'TEST_KEEP_ONLY')
  const initial = await adapter.read('device:connection')
  expect(initial).toMatchObject({ configured: false, writable: true })
  const updated = await write(adapter, initial.snapshot)
  expect(updated).toMatchObject({ configured: true, writable: true })
  expect(JSON.stringify(updated)).not.toContain('TEST_')
  expect(await readFile(join(directory, '.credentials.yaml'), 'utf8')).toContain('TEST_WRITTEN_ONLY')
  const removed = await adapter.write('device:connection', { method: 'remote.keyWrite', snapshot: updated.snapshot, change: { op: 'unset' } }, new AbortController().signal)
  expect(removed.configured).toBe(false)
  const contents = await readFile(join(directory, '.credentials.yaml'), 'utf8')
  expect(contents).not.toContain('TEST_WRITTEN_ONLY'); expect(contents).toContain('TEST_KEEP_ONLY')
})

test('原只读进程来源不允许覆盖；不暴露来源和已有值', async () => {
  const { adapter } = await fixture(true), view = await adapter.read('device:connection')
  expect(view).toMatchObject({ configured: true, writable: false }); expect(view).not.toHaveProperty('source')
  await expect(write(adapter, view.snapshot)).rejects.toThrow('remote_key_read_only')
})

test('旧表单、不同连接、过期与目标引用改变均拒绝，不能写信任凭据', async () => {
  const f = await fixture(); let view = await f.adapter.read('device:connection')
  await expect(write(f.adapter, view.snapshot, 'TEST_ONLY', 'other:connection')).rejects.toThrow('remote_key_stale')
  await f.ctx.credentials.set(credentialRef('DEEPSEEK_API_KEY'), 'TEST_PC_ONLY')
  await expect(write(f.adapter, view.snapshot)).rejects.toThrow('remote_key_stale')
  view = await f.adapter.read('device:connection')
  f.config({ apiKeyEnv: 'DSH_MOBILE_ENROLLMENT_TOKEN' })
  await expect(write(f.adapter, view.snapshot)).rejects.toThrow('remote_key_stale')
  await expect(f.adapter.read('device:connection')).rejects.toThrow('remote_key_reference_unsupported')
  f.config({ apiKeyEnv: 'DEEPSEEK_API_KEY' }); f.services.enrollmentRef = 'deepseek_api_key'
  await expect(f.adapter.read('device:connection')).rejects.toThrow('remote_key_reference_unsupported')
  f.services.enrollmentRef = 'DSH_MOBILE_ENROLLMENT_TOKEN'; view = await f.adapter.read('device:connection')
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001)
  await expect(write(f.adapter, view.snapshot)).rejects.toThrow('remote_key_stale'); clock.mockRestore()
})

test('错误和附加字段不泄露凭据；在途取消/重复提交不会误报成功', async () => {
  const f = await fixture(), provider = f.ctx.credentials
  f.services.credentials = () => ({ describe: async () => ({ configured: true, writable: true, source: 'TEST_SOURCE_ONLY', extra: 'TEST_EXTRA_ONLY' }),
    set: async () => { throw new Error('TEST_SECRET_ONLY') }, unset: provider.unset.bind(provider) })
  // 该夹具保持同一个实际 provider，对生产 Cordis 代理身份另由原服务用例覆盖。
  const projected = f.services.credentials(); f.services.credentials = () => projected
  const view = await f.adapter.read('device:connection')
  expect(JSON.stringify(view)).not.toContain('TEST_')
  await expect(write(f.adapter, view.snapshot)).rejects.toThrow('remote_key_write_unconfirmed')
  await expect(write(f.adapter, view.snapshot)).rejects.toThrow('remote_key_stale')
  const fresh = await f.adapter.read('device:connection'), controller = new AbortController(); controller.abort()
  await expect(f.adapter.write('device:connection', { method: 'remote.keyWrite', snapshot: fresh.snapshot, change: { op: 'unset' } }, controller.signal)).rejects.toThrow()
})

test('搜索 Key 使用原凭据状态，限制目标、遮蔽内联 Key，不允许搜索快照写模型入口', async () => {
  const f = await fixture(), namespaces: string[] = []
  const original = f.services.settings
  f.services.settings = () => ({ get: ns => { namespaces.push(ns); return original()!.get(ns) } })
  const search = new ComputerKey(f.services, 'web-search-deepseek')
  const view = await search.read('device:connection')
  expect(view).toMatchObject({ provider: 'deepseek-search', configured: false, writable: true })
  const request = { method: 'remote.keyWrite' as const, target: 'web-search-deepseek' as const, snapshot: view.snapshot, change: { op: 'set' as const, value: 'TEST_SEARCH_ONLY' } }
  await expect(f.adapter.write('device:connection', request, new AbortController().signal)).rejects.toThrow('remote_key_invalid')
  const next = await search.write('device:connection', request, new AbortController().signal)
  expect(next).toMatchObject({ configured: true, writable: true })
  expect(namespaces.every(ns => ns === 'web-search-deepseek')).toBe(true)
  expect(JSON.stringify(next)).not.toContain('TEST_SEARCH_ONLY')
  f.config({ apiKeyEnv: 'DEEPSEEK_API_KEY', apiKey: 'TEST_LITERAL_PRIVATE' })
  const literal = await search.read('device:connection')
  expect(literal).toMatchObject({ configured: true, writable: false })
  expect(JSON.stringify(literal)).not.toContain('TEST_LITERAL_PRIVATE')
  await expect(search.write('device:connection', { ...request, snapshot: literal.snapshot }, new AbortController().signal)).rejects.toThrow('remote_key_read_only')
  f.config({ apiKeyEnv: 'DSH_MOBILE_ENROLLMENT_TOKEN' })
  await expect(search.read('device:connection')).rejects.toThrow('remote_key_reference_unsupported')
})
