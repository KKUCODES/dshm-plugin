import { expect, test } from 'vitest'
import { readProviderCard } from '../src/provider-card.js'

function fixture() {
  let config: unknown = { providers: { alpha: { apiKeyEnv: 'TEST_ONLY_KEY', headers: { Authorization: 'SECRET' } } } }
  const refs: string[] = []
  const credentials = { describe: async (ref: string) => { refs.push(ref); return { configured: true, writable: true } },
    set: async () => { throw Error('unexpected write') }, unset: async () => { throw Error('unexpected write') } }
  const settings = { get: () => config, describe: () => [{ ns: 'llm-pi-ai' }] }
  const directory = { listProviders: () => [{ id: 'alpha', name: 'Alpha' }], listConfigurableProviders: () => [{ provider: 'alpha',
    displayName: 'Alpha', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'alpha'], declared: true, error: 'SECRET' }] }
  const services = { settings: () => settings, directory: () => directory,
    key: { credentials: () => credentials, settings: () => settings, revision: () => 0, enrollmentRef: 'ENROLL_ONLY' } }
  // 最小只读服务替身；不替代真实 SettingsProvider/凭据或手机验收。
  return { services: services as unknown as Parameters<typeof readProviderCard>[0], credentials, refs, directory,
    config: (next: unknown) => { config = next } }
}
const signal = () => new AbortController().signal

test('目录决定坐标，配置/凭据仅投影布尔值并脱敏错误', async () => {
  const f = fixture(), value = await readProviderCard(f.services, 'alpha', signal())
  expect(value).toEqual({ provider: { provider: 'alpha', displayName: 'Alpha', settingsNs: 'llm-pi-ai',
    settingsPath: ['providers', 'alpha'], active: true, declared: true, error: '提供方暂不可用' }, configured: true, keyConfigured: true })
  expect(f.refs).toEqual(['TEST_ONLY_KEY'])
  expect(JSON.stringify(value)).not.toMatch(/SECRET|TEST_ONLY_KEY|Authorization/)
  await expect(readProviderCard(f.services, 'unknown', signal())).rejects.toThrow('remote_settings_unavailable')
})
test('无配置目录行保持未配置，按原路由约定查状态；禁止远程注册凭据引用', async () => {
  const f = fixture(); f.config({ providers: {} })
  expect(await readProviderCard(f.services, 'alpha', signal())).toMatchObject({ configured: false, keyConfigured: true })
  expect(f.refs).toEqual(['ALPHA_API_KEY'])
  for (const apiKeyEnv of ['DSH_MOBILE_TOKEN', 'enroll_only']) {
    f.config({ providers: { alpha: { apiKeyEnv } } })
    await expect(readProviderCard(f.services, 'alpha', signal())).rejects.toThrow('remote_settings_unavailable')
  }
  expect(f.refs).toEqual(['ALPHA_API_KEY'])
})
test('凭据读取期间配置变化或取消，不发布混合快照；错误不带原内容', async () => {
  const f = fixture()
  f.credentials.describe = async () => { f.config({ providers: {} }); return { configured: true, writable: true } }
  await expect(readProviderCard(f.services, 'alpha', signal())).rejects.toThrow('remote_settings_stale')
  const controller = new AbortController()
  f.credentials.describe = async () => { controller.abort(); return { configured: true, writable: true } }
  await expect(readProviderCard(f.services, 'alpha', controller.signal)).rejects.toThrow()
  f.credentials.describe = async () => { throw Error('SECRET') }
  await expect(readProviderCard(f.services, 'alpha', signal())).rejects.toThrow('remote_settings_unavailable')
})
