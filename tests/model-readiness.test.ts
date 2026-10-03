import { expect, test } from 'vitest'
import { readModelReadiness } from '../src/model-readiness.js'

function fixture() {
  let config: unknown = { apiKeyEnv: 'TEST_KEY', private: 'SECRET' }, revision = 0
  const refs: string[] = []
  const credentials = { describe: async (ref: string) => { refs.push(ref); return { configured: false, writable: true } },
    set: async () => { throw Error('unexpected write') }, unset: async () => { throw Error('unexpected write') } }
  const settings = { writable: true, get: () => config, describe: () => [{ ns: 'llm-deepseek' }] }
  const directory = { listProviders: () => [{ id: 'deepseek-official', name: 'DeepSeek' }],
    listConfigurableProviders: () => [{ provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', settingsPath: [] as string[] }] }
  const services = { settings: () => settings, directory: () => directory,
    key: { credentials: () => credentials, settings: () => settings, revision: () => revision, enrollmentRef: 'ENROLL_ONLY' } }
  return { read: (signal = new AbortController().signal) => readModelReadiness(services as unknown as Parameters<typeof readModelReadiness>[0], signal),
    config: (value: unknown) => { config = value }, bump: () => { revision++ }, credentials, settings, directory, refs }
}

test('官方活跃且缺少可写凭据才引导；只读和未启用不能提示写Key', async () => {
  const f = fixture()
  expect(await f.read()).toEqual({ kind: 'credential-missing' })
  f.settings.writable = false; expect(await f.read()).toEqual({ kind: 'unavailable' })
  f.settings.writable = true
  f.credentials.describe = async () => ({ configured: false, writable: false })
  expect(await f.read()).toEqual({ kind: 'unavailable' })
  f.credentials.describe = async () => ({ configured: true, writable: false })
  expect(await f.read()).toEqual({ kind: 'provider-ready' })
  f.directory.listProviders = () => []; expect(await f.read()).toEqual({ kind: 'unavailable' })
  f.directory.listConfigurableProviders = () => []; expect(await f.read()).toEqual({ kind: 'adapter-absent' })
})

test('无命名Key或无设置坐标的活跃提供方保持可用，不被官方Key状态误导', async () => {
  const f = fixture(); f.config({})
  f.credentials.describe = async () => { throw Error('SECRET') }
  expect(await f.read()).toEqual({ kind: 'provider-ready' })
  f.config({ apiKeyEnv: 'TEST_KEY' })
  f.directory.listProviders = () => [{ id: 'adc-provider', name: 'ADC' }]
  expect(await f.read()).toEqual({ kind: 'provider-ready' })
})

test('其他已配置活跃提供方结束引导；停用提供方不算可用', async () => {
  const f = fixture()
  f.directory.listConfigurableProviders = () => [{ provider: 'custom', displayName: 'Other', settingsNs: 'llm-deepseek', settingsPath: [] }]
  f.directory.listProviders = () => [{ id: 'custom', name: 'Other' }]
  f.credentials.describe = async () => ({ configured: true, writable: true })
  expect(await f.read()).toEqual({ kind: 'provider-ready' })
  f.directory.listProviders = () => []
  expect(await f.read()).toEqual({ kind: 'adapter-absent' })
})

test('凭据失败和保留引用不泄露信息，也不查询注册凭据', async () => {
  for (const ref of ['DSH_MOBILE_SECRET', 'enroll_only']) {
    const f = fixture(); f.config({ apiKeyEnv: ref })
    expect(await f.read()).toEqual({ kind: 'unavailable' }); expect(f.refs).toEqual([])
  }
  const f = fixture(); f.credentials.describe = async () => { throw Error('SECRET') }
  expect(await f.read()).toEqual({ kind: 'unavailable' })
})

test('异步期间配置、目录、凭据版本变化或取消不会发布旧判断', async () => {
  const changes: Array<(f: ReturnType<typeof fixture>) => void> = [f => f.config({}), f => f.bump(), f => { f.directory.listProviders = () => [] }]
  for (const change of changes) {
    const f = fixture(); f.credentials.describe = async () => { change(f); return { configured: false, writable: true } }
    await expect(f.read()).rejects.toThrow('remote_settings_stale')
  }
  const f = fixture(), controller = new AbortController()
  f.credentials.describe = async () => { controller.abort(); return { configured: false, writable: true } }
  await expect(f.read(controller.signal)).rejects.toThrow()
})
