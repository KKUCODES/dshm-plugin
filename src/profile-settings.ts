import type { SettingsDescribeOptions, SettingsDescriptor, SettingsPathOp } from '@deepseek-ai/dsh-settings'
import type { SettingsAccess, SettingsView } from './settings-access.js'

export interface ProfileSettingsForms {
  readonly writable: boolean
  describe(options?: SettingsDescribeOptions): SettingsDescriptor[]
  mutate(entryId: string, edits: readonly SettingsPathOp[], expectedRevision?: number): Promise<void>
}
export interface ProfileSettingsEntry {
  readonly options: { readonly id: string; readonly name: string }
}

const modules: Readonly<Record<string, readonly string[]>> = {
  'llm-deepseek': ['@deepseek-ai/dsh-llm-deepseek-api-key'],
  'llm-pi-ai': ['@deepseek-ai/dsh-llm-pi-ai'],
  'agent-loop': ['@deepseek-ai/dsh-agent-loop'],
  'agent-preset-registry': ['@deepseek-ai/dsh-agent-preset-registry'],
  'ui-settings': ['@deepseek-ai/dsh-client-ui-settings'],
  subagent: ['@deepseek-ai/dsh-subagent'],
  'subagent-model-selection': ['@deepseek-ai/dsh-subagent-model-selection'],
  'web-search-deepseek': ['@deepseek-ai/dsh-web-search-deepseek'],
  shell: [process.platform === 'win32' ? '@deepseek-ai/dsh-pwsh-sandbox' : '@deepseek-ai/dsh-bash-sandbox'],
}

/** 将已核验的新版插件实例映射到 Remote 固定 namespace，写入仍交给原表单服务。 */
export class ProfileSettings implements SettingsAccess {
  private readonly values = new Map<string, { entry: ProfileSettingsEntry; revision: number; value: unknown }>()
  constructor(private readonly forms: ProfileSettingsForms, private readonly entries: () => readonly ProfileSettingsEntry[]) {}
  get writable() { return this.forms.writable }

  entryId(namespace: string) { return this.bindings().get(namespace)?.options.id }
  namespaceOf(entryId: string) {
    return [...this.bindings()].find(([, entry]) => entry.options.id === entryId)?.[0]
  }

  private bindings() {
    const result = new Map<string, ProfileSettingsEntry>()
    const configurable = new Set<string>(this.forms.describe({ redactSecrets: true }).map(view => view.ns))
    const entries = this.entries().filter(entry => configurable.has(entry.options.id))
    for (const [namespace, names] of Object.entries(modules)) {
      const matches = entries.filter(entry => names.includes(entry.options.name))
      // 同一模块有多个实例时没有唯一远程目标；不能靠排列顺序选择一个。
      if (matches.length === 1 && entries.filter(entry => entry.options.id === matches[0]!.options.id).length === 1)
        result.set(namespace, matches[0]!)
    }
    return result
  }

  describe(options?: SettingsDescribeOptions): SettingsView[] {
    const descriptors = this.forms.describe(options)
    return [...this.bindings()].flatMap(([namespace, entry]) => {
      const matches = descriptors.filter(view => view.ns === entry.options.id)
      return matches.length === 1 ? [{ ...matches[0]!, ns: namespace as SettingsDescriptor['ns'], documentId: entry.options.id }] : []
    })
  }

  get(namespace: string): unknown {
    const entry = this.bindings().get(namespace)
    const descriptors = this.forms.describe()
    const matches = entry ? descriptors.filter(view => view.ns === entry.options.id) : []
    if (!entry || matches.length !== 1) { this.values.delete(namespace); return undefined }
    const view = matches[0]!, previous = this.values.get(namespace)
    if (!previous || previous.entry !== entry || previous.revision !== view.revision)
      this.values.set(namespace, { entry, revision: view.revision, value: view.value })
    // 仅供同进程快照/凭据引用核验。线上读值仍由调用方投影，describe 必须要求 redactSecrets。
    return this.values.get(namespace)!.value
  }

  async mutate(namespace: string, edits: readonly SettingsPathOp[], expectedRevision?: number) {
    const entry = this.bindings().get(namespace)
    if (!entry) throw new Error('remote_settings_unavailable')
    await this.forms.mutate(entry.options.id, edits, expectedRevision)
  }
}
