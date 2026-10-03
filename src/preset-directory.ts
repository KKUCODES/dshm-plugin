import { dirname, isAbsolute } from 'node:path'
import { symbols } from '@deepseek-ai/cordis'
import type { AgentPresets } from '@deepseek-ai/dsh-agent-presets'

export type PresetDirectoryService = Pick<AgentPresets, 'resolve'>
const identity = (value: object) => Reflect.get(value, symbols.original) ?? value

/** 手机只展示原Host解析的用户预设位置，不能因复制后的自动调用启动电脑文件管理器。 */
export async function presetDirectory(service: () => PresetDirectoryService | undefined, id: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const before = service()
  if (!before) throw Error('remote_presets_unavailable')
  const preset = await before.resolve(id)
  signal.throwIfAborted()
  const after = service()
  if (!after || identity(before) !== identity(after)) throw Error('remote_settings_stale')
  if (preset.id !== id || preset.trust !== 'user' || !isAbsolute(preset.path)) throw Error('remote_operation_denied')
  return { opened: false as const, path: dirname(preset.path) }
}
