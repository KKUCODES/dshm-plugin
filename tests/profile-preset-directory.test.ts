import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import { profilePresetDirectory, type ProfilePresetServices, type ProfilePresetEntry } from '../src/profile-preset-directory.js'

function fixture() {
  const entry = { options: { id: 'deployment-selected-id', name: '@deepseek-ai/dsh-agent-preset', config: { id: 'standard', plugins: [] } }, fiber: { state: 2 } }
  let entries: ProfilePresetEntry[] = [entry]
  let services: ProfilePresetServices | undefined = {
    presets: { resolve: async id => ({ id }) },
    editor: { documentPath: resolve('artifacts', 'isolated-profile', 'cordis.patch.yml'), entries: () => entries },
  }
  const controller = new AbortController()
  return { entry, controller, services: () => services, replace: (value: ProfilePresetServices | undefined) => { services = value },
    entries: (value: ProfilePresetEntry[]) => { entries = value }, read: () => profilePresetDirectory(() => services, 'standard', controller.signal) }
}

test('新版原目录没有 trust/path，位置来自唯一活动声明的实际配置编辑器', async () => {
  const f = fixture()
  expect(await f.read()).toEqual({ opened: false, path: resolve('artifacts', 'isolated-profile'), documentPath: f.services()!.editor.documentPath })
  expect(f.entry.options.id).not.toBe('standard')
})

test('拒绝无法定位到唯一原 profile 声明的预设，不把任意模块 config.id 当作预设', async () => {
  const f = fixture()
  f.entries([f.entry, { ...f.entry, options: { ...f.entry.options, id: 'duplicate' } }])
  await expect(f.read()).rejects.toThrow('remote_operation_denied')
  f.entries([{ ...f.entry, options: { ...f.entry.options, name: 'other-plugin' } }])
  await expect(f.read()).rejects.toThrow('remote_operation_denied')
  f.entries([f.entry]); f.entry.fiber.state = 3
  await expect(f.read()).rejects.toThrow('remote_operation_denied')
  f.entry.fiber.state = 2
  f.replace({ ...f.services()!, editor: { ...f.services()!.editor, documentPath: './relative.yml' } })
  await expect(f.read()).rejects.toThrow('remote_operation_denied')
})

test('读取期间声明、fiber、配置服务或目录发生变化时，旧结果不能泄露新实例路径', async () => {
  for (const kind of ['config', 'fiber', 'service', 'path', 'duplicate', 'removed'] as const) {
    const f = fixture(), before = f.services()!
    before.presets.resolve = async id => {
      if (kind === 'config') f.entry.options.config = { id, plugins: [] }
      if (kind === 'fiber') f.entry.fiber = { state: 2 }
      if (kind === 'service') f.replace({ ...before, presets: { resolve: async id => ({ id }) } })
      if (kind === 'path') f.replace({ ...before, editor: { ...before.editor, documentPath: resolve('artifacts', 'another-profile', 'cordis.patch.yml') } })
      if (kind === 'duplicate') f.entries([f.entry, { ...f.entry }])
      if (kind === 'removed') f.entries([])
      return { id }
    }
    await expect(f.read(), kind).rejects.toThrow('remote_settings_stale')
  }
})

test('缺少服务、取消及原目录身份不匹配时拒绝展示', async () => {
  const missing = fixture(); missing.replace(undefined)
  await expect(missing.read()).rejects.toThrow('remote_presets_unavailable')
  const cancelled = fixture()
  cancelled.services()!.presets.resolve = async id => { cancelled.controller.abort(); return { id } }
  await expect(cancelled.read()).rejects.toThrow()
  const mismatched = fixture(); mismatched.services()!.presets.resolve = async () => ({ id: 'other' })
  await expect(mismatched.read()).rejects.toThrow('remote_operation_denied')
})
