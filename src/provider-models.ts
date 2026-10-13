import { randomUUID } from 'node:crypto'
import { symbols } from '@deepseek-ai/cordis'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import { providerRouteSchema, providerModelsViewSchema, providerModelsWriteSchema, deepSeekModelsWriteSchema, modelCompatKeys, type ProviderModelsWrite } from '@dsh-mobile/protocol'

type Provider = Pick<SettingsProvider, 'get' | 'describe' | 'mutate' | 'writable'>
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const identity = (value: Provider) => Reflect.get(value, symbols.original) ?? value
const fields = ['id', 'name', 'contextWindow', 'maxTokens'] as const
const advancedFields = ['input', 'reasoningEfforts'] as const
type Snapshot = { owner: string; route: string; scope?: 'overrides'; provider: unknown; config: unknown; revision: number; expires: number; rows: Map<string, Record<string, unknown>> }

/** 原数组替换语义不变；只把已审阅字段发给手机，隐藏字段按同一快照行合并回去。 */
export class ProviderModels {
  private snapshots = new Map<string, Snapshot>()
  constructor(private settings: () => Provider | undefined, private namespace: 'llm-pi-ai' | 'llm-deepseek' = 'llm-pi-ai') {}
  read(owner: string, rawRoute: string, scope?: 'overrides') {
    try {
      const namespace = this.namespace, official = namespace === 'llm-deepseek'
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings()
      if (official && (route !== 'deepseek' || scope !== undefined)) throw Error('remote_settings_unavailable')
      if (!provider) throw Error('remote_settings_unavailable')
      const config = provider.get(namespace), profiles = official ? { deepseek: config } : object(object(config).providers)
      const view = provider.describe({ redactSecrets: true }).find(view => view.ns === namespace)
      if (!view || !Object.hasOwn(profiles, route)) throw Error('remote_settings_unavailable')
      const profile = object(profiles[route]), user = official ? object(view.user) : object(object(object(view.user).providers)[route])
      // 覆盖编辑只读用户层；删除后恢复电脑基础配置，不能把基础层物化成新的用户覆盖。
      const models = scope === 'overrides' ? Object.entries(object(user.modelOverrides)).map(([id, value]) => ({ ...object(value), id })) : profile.models ?? []
      if (!Array.isArray(models)) throw Error('remote_settings_unavailable')
      const originals = new Map<string, Record<string, unknown>>()
      const rows = models.map(value => {
        const source = randomUUID(), row = object(value)
        originals.set(source, structuredClone(row))
        return { source, ...Object.fromEntries(fields.flatMap(key => row[key] === undefined ? [] : [[key, row[key]]])),
          advanced: official ? (row.inputModalities === undefined ? {} : { input: row.inputModalities })
            : Object.fromEntries(advancedFields.flatMap(key => row[key] === undefined ? [] : [[key, row[key]]])),
          ...(official ? {} : { compat: Object.fromEntries(modelCompatKeys.flatMap(key => object(row.compat)[key] === undefined ? [] : [[key, object(row.compat)[key]]])) }) }
      })
      const snapshot = randomUUID()
      const result = providerModelsViewSchema.parse({ provider: route, snapshot, revision: view.revision,
        ...(scope ? { scope, blockedByModels: Array.isArray(profile.models) && profile.models.length > 0 } : {}),
        writable: provider.writable, applies: view.applies === 'restart' ? 'restart' : 'live', overridden: Object.hasOwn(user, scope ? 'modelOverrides' : 'models'), advancedEditable: true, compatEditable: !official, rows })
      for (const [id, item] of this.snapshots) if ((item.owner === owner && item.route === route && item.scope === scope) || item.expires <= Date.now()) this.snapshots.delete(id)
      if (this.snapshots.size >= 128) throw Error('remote_settings_busy')
      this.snapshots.set(snapshot, { owner, route, scope, provider: identity(provider), config, revision: view.revision, expires: Date.now() + 300000, rows: originals })
      return result
    } catch (error) { throw Error(error instanceof Error && error.message === 'remote_settings_busy' ? error.message : 'remote_settings_unavailable') }
  }
  async write(owner: string, raw: ProviderModelsWrite, signal: AbortSignal) {
    const namespace = this.namespace, official = namespace === 'llm-deepseek'
    if (official && (raw.provider !== 'deepseek' || raw.scope !== undefined || !deepSeekModelsWriteSchema.safeParse({
      method: 'remote.deepSeekModelsWrite', snapshot: raw.snapshot, expectedRevision: raw.expectedRevision, change: raw.change,
    }).success)) throw Error('remote_settings_invalid')
    const parsed = providerModelsWriteSchema.safeParse(raw)
    if (!parsed.success) throw Error('remote_settings_invalid')
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner || snapshot.route !== operation.provider || snapshot.scope !== operation.scope) throw Error('remote_settings_stale')
    const rows = operation.change.op === 'set' ? operation.change.rows.map(row => {
      if (row.source && !snapshot.rows.has(row.source)) throw Error('remote_settings_stale')
      const value = { ...(row.source ? snapshot.rows.get(row.source) : {}) }
      for (const field of fields) { delete value[field]; if (row[field] !== undefined) value[field] = row[field] }
      if (official && row.advanced !== undefined) {
        delete value.inputModalities
        if (row.advanced.input !== undefined) value.inputModalities = row.advanced.input
      } else if (row.advanced !== undefined) for (const field of advancedFields) {
        delete value[field]; if (row.advanced[field] !== undefined) value[field] = row.advanced[field]
      }
      if (row.compat !== undefined) {
        const compat = { ...object(value.compat) }, updates = object(row.compat)
        for (const field of modelCompatKeys) { delete compat[field]; if (updates[field] !== undefined) compat[field] = updates[field] }
        if (Object.keys(compat).length) value.compat = compat; else delete value.compat
      }
      return value
    }) : undefined
    this.snapshots.delete(operation.snapshot)
    let provider: Provider | undefined, config: unknown
    try { provider = this.settings(); config = provider?.get(namespace) } catch { throw Error('remote_settings_unavailable') }
    if (!provider || identity(provider) !== snapshot.provider || config !== snapshot.config || operation.expectedRevision !== snapshot.revision
      || snapshot.expires <= Date.now()) throw Error('remote_settings_stale')
    if (!provider.writable) throw Error('remote_settings_read_only')
    signal.throwIfAborted()
    try {
      const path = official ? ['models'] : ['providers', snapshot.route, snapshot.scope ? 'modelOverrides' : 'models']
      if (snapshot.scope) {
        // 字典按原设置服务合并；先移除旧用户层，防止删除的行/字段残留。两步由同次版本写入校验和持久化。
        const changes: Array<Parameters<Provider['mutate']>[1][number]> = [{ op: 'unset', path }]
        if (rows?.length) changes.push({ op: 'set', path, value: Object.fromEntries(rows.map(({ id, ...value }) => [String(id), value])) })
        await provider.mutate(namespace, changes, snapshot.revision)
      } else await provider.mutate(namespace, rows === undefined ? [{ op: 'unset', path }] : [{ op: 'set', path, value: rows }], snapshot.revision)
    } catch (error) {
      if (object(error).code === 'SETTINGS_CONFLICT') throw Error('remote_settings_stale')
      throw Error('remote_settings_write_unconfirmed')
    }
    signal.throwIfAborted()
    try {
      const next = this.settings()
      if (!next || identity(next) !== snapshot.provider) throw Error('changed')
      return this.read(owner, snapshot.route, snapshot.scope)
    } catch { throw Error('remote_settings_write_unconfirmed') }
  }
  dispose() { this.snapshots.clear() }
}
