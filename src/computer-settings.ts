import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import { computerSettingValues, pluginSettingValues, computerSettingsWriteSchema, type ComputerSettingsWrite } from '@dsh-mobile/protocol'

type Namespace = 'llm-deepseek' | keyof typeof pluginSettingValues
type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>
type Snapshot = { owner: string; namespace: Namespace; providerIdentity: unknown; value: unknown; revision: number; expires: number }
// 仅比较原服务身份；实际调用仍通过绑定调用方上下文的 Cordis 代理。
const providerIdentity = (provider: Provider | undefined): unknown => provider && (Reflect.get(provider, symbols.original) ?? provider)
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

/** 原服务负责校验、持久化和广播；此边界仅缩小可编辑字段及返回值。 */
export class ComputerSettings {
  private snapshots = new Map<string, Snapshot>()
  constructor(private provider: () => Provider | undefined) {}

  read(owner: string, namespace: Namespace = 'llm-deepseek') {
    try {
      const provider = this.provider()
      if (!provider) throw new Error('remote_settings_unavailable')
      const view = provider.describe({ redactSecrets: true }).find(view => view.ns === namespace)
      if (!view) throw new Error('remote_settings_unavailable')
      if (!Number.isSafeInteger(view.revision) || view.revision < 0) throw new Error('remote_settings_invalid')
      const values = object(view.value), user = object(view.user), base = object(view.base)
      const projection = namespace === 'llm-deepseek' ? computerSettingValues : pluginSettingValues[namespace]
      if (!projection) throw new Error('remote_settings_invalid')
      const fields = Object.entries(projection).map(([key, schema]) => {
        const parsed = schema.safeParse(values[key])
        if (values[key] !== undefined && !parsed.success) throw new Error('remote_settings_invalid')
        const layers: { base?: unknown; user?: unknown } = {}
        if (namespace !== 'llm-deepseek') {
          for (const [name, layer] of [['base', base], ['user', user]] as const) {
            if (Object.hasOwn(layer, key)) {
              const result = schema.safeParse(layer[key])
              if (!result.success) throw new Error('remote_settings_invalid')
              layers[name] = result.data
            }
          }
        }
        return { key, ...(parsed.success ? { value: parsed.data } : {}), ...layers, overridden: Object.hasOwn(user, key) }
      })
      for (const [id, item] of this.snapshots) {
        if ((item.owner === owner && item.namespace === namespace) || item.expires <= Date.now()) this.snapshots.delete(id)
      }
      if (this.snapshots.size >= 128) throw new Error('remote_settings_busy')
      const snapshot = randomUUID()
      // 原 revision 在 namespace 重挂后会归零；额外保留 resolved 对象身份，拒绝旧表单写到新实例。
      this.snapshots.set(snapshot, { owner, namespace, providerIdentity: providerIdentity(provider), value: provider.get(namespace), revision: view.revision, expires: Date.now() + 300000 })
      return { snapshot, namespace, revision: view.revision, writable: provider.writable === true,
        ...(view.documentId === undefined ? {} : { documentId: view.documentId }),
        applies: view.applies === 'restart' ? 'restart' : 'live', fields }
    } catch (error) { throw this.safeReadError(error) }
  }

  async write(owner: string, raw: ComputerSettingsWrite, signal: AbortSignal) {
    const parsed = computerSettingsWriteSchema.safeParse(raw)
    if (!parsed.success) throw new Error('remote_settings_invalid')
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot)
    const namespace = operation.namespace ?? 'llm-deepseek'
    if (!snapshot || snapshot.owner !== owner || snapshot.namespace !== namespace) throw new Error('remote_settings_stale')
    this.snapshots.delete(operation.snapshot)
    let provider: Provider | undefined
    try { provider = this.provider() } catch { throw new Error('remote_settings_unavailable') }
    if (!provider || snapshot.expires <= Date.now() || providerIdentity(provider) !== snapshot.providerIdentity || operation.expectedRevision !== snapshot.revision)
      throw new Error('remote_settings_stale')
    try {
      signal.throwIfAborted()
      if (provider.get(namespace) !== snapshot.value) throw new Error('remote_settings_stale')
      if (!provider.writable) throw new Error('remote_settings_read_only')
      // 从未把隐藏字段重新发回；unset 只恢复该字段的电脑默认值。
      await provider.mutate(namespace, operation.edits.map(edit => edit.op === 'set'
        ? { op: 'set', path: [edit.key], value: edit.value } : { op: 'unset', path: [edit.key] }), operation.expectedRevision)
    } catch (error) {
      if (error instanceof Error && ['remote_settings_stale', 'remote_settings_read_only'].includes(error.message)) throw new Error(error.message)
      if (object(error).code === 'SETTINGS_CONFLICT') throw new Error('remote_settings_stale')
      // Provider 异常可以包含原配置/密钥；不转发其 message、details 或 cause。
      throw new Error('remote_settings_write_unconfirmed')
    }
    signal.throwIfAborted()
    try {
      if (providerIdentity(this.provider()) !== snapshot.providerIdentity) throw new Error('remote_settings_write_unconfirmed')
      return this.read(owner, namespace)
    }
    catch { throw new Error('remote_settings_write_unconfirmed') }
  }

  private safeReadError(error: unknown): Error {
    const code = error instanceof Error ? error.message : ''
    return new Error(['remote_settings_unavailable', 'remote_settings_invalid', 'remote_settings_busy'].includes(code) ? code : 'remote_settings_unavailable')
  }
  dispose() { this.snapshots.clear() }
}
