import { expect, test, vi } from 'vitest'
import type { SettingsDescriptor } from '@deepseek-ai/dsh-settings'
import { ProfileSettings } from '../src/profile-settings.js'
import { profileProviders } from '../src/profile-providers.js'

function fixture() {
  let revision = 0
  let entries = [{ options: { id: 'custom-model-entry', name: '@deepseek-ai/dsh-llm-deepseek-api-key' } }]
  const forms = {
    writable: true,
    describe: (options?: { redactSecrets?: boolean }): SettingsDescriptor[] => [{
      ns: 'custom-model-entry' as SettingsDescriptor['ns'], schema: {}, revision, applies: 'live',
      value: { maxTokens: 1024, ...(options?.redactSecrets ? {} : { private: 'fixture-secret' }) },
    }],
    mutate: vi.fn(async () => { revision++ }),
  }
  const settings = new ProfileSettings(forms, () => entries)
  return { forms, settings, remount() { entries = entries.map(row => ({ ...row })) },
    duplicate() { entries = [...entries, { options: { id: 'second-entry', name: entries[0]!.options.name } }];
      const describe = forms.describe; forms.describe = options => [...describe(options), { ...describe(options)[0]!, ns: 'second-entry' as SettingsDescriptor['ns'] }] } }
}

test('新版表单按模块身份选取唯一实例，固定 namespace 转换为真实 entry id', async () => {
  const { forms, settings } = fixture()
  expect(settings.describe({ redactSecrets: true })[0]?.ns).toBe('llm-deepseek')
  expect(settings.describe({ redactSecrets: true })[0]?.documentId).toBe('custom-model-entry')
  expect(JSON.stringify(settings.describe({ redactSecrets: true }))).not.toContain('fixture-secret')
  const first = settings.get('llm-deepseek')
  expect(settings.get('llm-deepseek')).toBe(first)
  const edits = [{ op: 'set' as const, path: ['maxTokens'], value: 2048 }]
  await settings.mutate('llm-deepseek', edits, 0)
  expect(forms.mutate).toHaveBeenCalledWith('custom-model-entry', edits, 0)
  expect(settings.get('llm-deepseek')).not.toBe(first)
  await expect(settings.mutate('custom-model-entry', edits, 1)).rejects.toThrow('remote_settings_unavailable')
})

test('实例替换使旧配置快照失效；同模块双实例不按顺序误写', async () => {
  const { settings, forms, remount, duplicate } = fixture()
  const first = settings.get('llm-deepseek')
  remount()
  expect(settings.get('llm-deepseek')).not.toBe(first)
  duplicate()
  expect(settings.describe({ redactSecrets: true })).toEqual([])
  expect(settings.get('llm-deepseek')).toBeUndefined()
  await expect(settings.mutate('llm-deepseek', [], 0)).rejects.toThrow('remote_settings_unavailable')
  expect(forms.mutate).not.toHaveBeenCalled()
})

test('提供方公开目录转换固定 namespace，模型发现仅使用对应的真实实例 ID', async () => {
  const { settings, duplicate } = fixture()
  const discoverModels = vi.fn(async () => [])
  const runtime = profileProviders({ listProviders: () => [], discoverModels,
    listConfigurableProviders: () => [{ provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'custom-model-entry', settingsPath: [] }],
  }, settings)
  expect(runtime.listConfigurableProviders()[0]?.settingsNs).toBe('llm-deepseek')
  const signal = new AbortController().signal, request = { provider: 'deepseek-official' }
  await runtime.discoverModels('llm-deepseek', request, signal)
  expect(discoverModels).toHaveBeenCalledWith('custom-model-entry', request, signal)
  expect(() => runtime.discoverModels('custom-model-entry', request, signal)).toThrow('remote_model_discovery_unavailable')
  duplicate()
  expect(() => runtime.discoverModels('llm-deepseek', request, signal)).toThrow('remote_model_discovery_unavailable')
  expect(discoverModels).toHaveBeenCalledTimes(1)
})
