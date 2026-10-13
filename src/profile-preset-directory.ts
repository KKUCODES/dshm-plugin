import { dirname, isAbsolute } from 'node:path'
import { symbols } from '@deepseek-ai/cordis'
import type { PresetDirectoryService } from './preset-directory.js'

export interface ProfilePresetEntry {
  readonly options: { readonly id: string; readonly name: string; readonly config?: unknown }
  readonly fiber?: { readonly state: number }
}
export interface ProfilePresetEditor {
  readonly documentPath: string
  entries(): readonly ProfilePresetEntry[]
}
export interface ProfilePresetServices {
  presets: PresetDirectoryService
  editor: ProfilePresetEditor
}
const identity = (value: object) => Reflect.get(value, symbols.original) ?? value
const declaredId = (entry: ProfilePresetEntry) => {
  if (entry.options.name !== '@deepseek-ai/dsh-agent-preset' || entry.fiber?.state !== 2) return undefined
  const config = entry.options.config
  return config !== null && typeof config === 'object' && !Array.isArray(config) ? Reflect.get(config, 'id') : undefined
}

/** 新版声明没有独立预设文件；返回原配置编辑器的保存位置，不冒充声明的来源文件。 */
export async function profilePresetDirectory(services: () => ProfilePresetServices | undefined, id: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const before = services()
  if (!before) throw Error('remote_presets_unavailable')
  const entries = before.editor.entries().filter(entry => declaredId(entry) === id)
  const entry = entries.length === 1 ? entries[0] : undefined
  const documentPath = before.editor.documentPath
  if (!entry || !isAbsolute(documentPath)) throw Error('remote_operation_denied')
  const config = entry.options.config, fiber = entry.fiber
  const preset = await before.presets.resolve(id)
  signal.throwIfAborted()
  const after = services()
  const current = after?.editor.entries().filter(row => declaredId(row) === id)
  if (!after || identity(before.presets) !== identity(after.presets) || identity(before.editor) !== identity(after.editor)
    || after.editor.documentPath !== documentPath || entry.options.config !== config || entry.fiber !== fiber
    || fiber?.state !== 2 || current?.length !== 1 || current[0] !== entry) throw Error('remote_settings_stale')
  if (preset.id !== id) throw Error('remote_operation_denied')
  return { opened: false as const, path: dirname(documentPath), documentPath }
}
