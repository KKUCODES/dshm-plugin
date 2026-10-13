import { randomUUID } from 'node:crypto'
import { readFile, unlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { pathToFileURL } from 'node:url'
import { symbols } from '@deepseek-ai/cordis'
import { presetCopySchema, presetDeleteSchema, remotePresetIdSchema, type PresetCopy, type PresetDelete } from '@dsh-mobile/protocol'
import type { ProfilePresetServices, ProfilePresetEntry } from './profile-preset-directory.js'

type Row = { id?: string; name?: string; config?: unknown; insert?: Row[]; group?: boolean; [key: string]: unknown }
type Profile = { dir: string; patchPath: string; installAnchor: string }
interface NativeContext { root: unknown; get(name: 'profileContext'): Profile | undefined; get(name: 'hmr'): { runExclusive<T>(run: () => Promise<T>): Promise<T> } | undefined
  get(name: 'loader'): { internal?: { import(name: string, parentURL: string, attributes: Record<string, string>): Promise<any> } } | undefined }
type NativeBoot = {
  loadProfileDirectory(bin: string, dir: string, anchor: string): { layers: { patches: Row[] }[]; patches: Row[] }
  readProfilePatches(bin: string, profile: Profile, initial?: unknown): Row[]
  composeEntries(layers: Row[][]): Row[]
  reconcileProfilePatches(root: unknown, patches: Row[], bin: string, required?: string[]): Promise<void>
}
type NativeAtomic = { withFileLock<T>(path: string, run: () => Promise<T>): Promise<T>; writeFileAtomic(path: string, content: string, options: { mode: number }): Promise<void> }
const identity = (value: object) => Reflect.get(value, symbols.original) ?? value
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const flatten = (rows: Row[]): Row[] => rows.flatMap(row => [row, ...(row.group && Array.isArray(row.config) ? flatten(row.config) : [])])
const presetModule = '@deepseek-ai/dsh-agent-preset', registryModule = '@deepseek-ai/dsh-agent-preset-registry'
type State = { services: ProfilePresetServices; profile: Profile; profilePath: string; profileDir: string; anchor: string;
  entry: ProfilePresetEntry; options: unknown; config: unknown; fiber: unknown; before?: string; patches: Row[]; deletable: boolean; fallback?: string }
type Snapshot = State & { owner: string; expires: number; preset: string }

/** 固定新版原 profile 的预设声明操作；手机不提供 YAML、模块名、插件配置或磁盘路径。 */
export class ProfilePresetManagement {
  private snapshots = new Map<string, Snapshot>()
  private closed = false
  private constructor(private ctx: NativeContext, private services: () => ProfilePresetServices | undefined,
    private readonly boot: NativeBoot, private readonly atomic: NativeAtomic,
    private readonly yaml: typeof import('yaml'), private readonly parse: (content: string) => Row[]) {}
  static async create(ctx: NativeContext, services: () => ProfilePresetServices | undefined) {
    const profile = ctx.get('profileContext')
    if (!profile || !isAbsolute(profile.dir) || !isAbsolute(profile.installAnchor)) throw Error('remote_presets_unavailable')
    // 以当前Host的profile解析表选包；插件相邻依赖或CLI未声明的包都不能替代这份Loader。
    const host = createRequire(join(profile.dir, 'package.json')), native = createRequire(host.resolve('@deepseek-ai/dsh-config-editor'))
    const loader = ctx.get('loader')
    if (!loader?.internal) throw Error('remote_presets_unavailable')
    // 与原EntryTree相同的ESM入口保留profile选包及源码归一化；不将require.resolve的lib绝对路径另行导入。
    const parentURL = pathToFileURL(join(profile.dir, 'package.json')).href
    const registry = await loader.internal.import('@deepseek-ai/dsh-agent-preset-registry', parentURL, {})
    if (registry.DSHM_PRESET_ARCHIVE_VERSION !== 2) throw Error('remote_presets_unavailable')
    const boot: NativeBoot = await loader.internal.import('@deepseek-ai/dsh-app-boot', parentURL, {})
    const atomic: NativeAtomic = await loader.internal.import('@deepseek-ai/dsh-atomic-write', parentURL, {})
    const include = await loader.internal.import('@deepseek-ai/cordis-plugin-include', parentURL, {})
    const yaml = native('yaml'), source = native('js-yaml')
    return new ProfilePresetManagement(ctx, services, boot, atomic, yaml, content => source.load(content, { schema: include.entryListSchema }))
  }
  private async state(preset: string): Promise<State> {
    if (this.closed) throw Error('remote_presets_unavailable')
    const services = this.services(), profile = this.ctx.get('profileContext')
    if (!services || !profile || !isAbsolute(profile.dir) || !isAbsolute(profile.patchPath)
      || resolve(dirname(profile.patchPath)) !== resolve(profile.dir)
      || services.editor.documentPath !== profile.patchPath) throw Error('remote_presets_unavailable')
    const entries = services.editor.entries().filter(row => row.options.name === presetModule && object(row.options.config).id === preset)
    if (entries.length !== 1 || entries[0]!.fiber?.state !== 2) throw Error('remote_operation_denied')
    const entry = entries[0]!, config = entry.options.config, fiber = entry.fiber
    if (object(config).archived === true) throw Error('remote_operation_denied')
    const profilePath = profile.patchPath, profileDir = profile.dir, anchor = profile.installAnchor
    let before: string | undefined
    try { before = await readFile(profile.patchPath, 'utf8') } catch (error) { if (object(error).code !== 'ENOENT') throw error }
    const patches = this.boot.readProfilePatches('dsh', profile)
    const loaded = this.boot.loadProfileDirectory('dsh', profile.dir, profile.installAnchor)
    // 只允许删除用户层直接插入的根声明；不删除 bundle、嵌套 Include 或命令行声明。
    const own = loaded.patches.flatMap(row => row.id === undefined ? row.insert ?? [] : []).filter(row => row.id === entry.options.id && row.name === presetModule)
    const inherited = flatten(this.boot.composeEntries(loaded.layers.map(layer => layer.patches)))
    let deletable = own.length === 1 && !inherited.some(row => row.id === entry.options.id)
    let fallback: string | undefined
    const registry = services.editor.entries().filter(row => row.options.name === registryModule && row.fiber?.state === 2)
    if (registry.length !== 1) deletable = false
    else {
      const options = object(registry[0]!.options.config)
      if ((options.selectedDefault ?? options.default) === preset) {
        // 默认模式的用户选择随删除恢复继承；原 default 本身不能在此被猜测或替换。
        if (typeof options.default !== 'string' || options.default === preset) deletable = false
        else fallback = options.default
      }
    }
    const resolved = await services.presets.resolve(preset)
    const current = this.services()
    if (!current || identity(current.editor) !== identity(services.editor) || identity(current.presets) !== identity(services.presets)
      || current.editor.documentPath !== profilePath || profile.patchPath !== profilePath || profile.dir !== profileDir || profile.installAnchor !== anchor
      || entry.options.config !== config || entry.fiber !== fiber
      || fiber?.state !== 2 || !current.editor.entries().includes(entry) || resolved.id !== preset) throw Error('remote_settings_stale')
    return { services, profile, profilePath, profileDir, anchor, entry, options: structuredClone(entry.options), config, fiber,
      before, patches: structuredClone(patches), deletable, fallback }
  }
  async read(owner: string, raw: string, signal: AbortSignal) {
    const preset = remotePresetIdSchema.parse(raw)
    signal.throwIfAborted()
    const state = await this.state(preset)
    signal.throwIfAborted()
    for (const [id, snapshot] of this.snapshots) if (snapshot.expires <= Date.now() || snapshot.owner === owner) this.snapshots.delete(id)
    if (this.snapshots.size >= 128) throw Error('remote_settings_busy')
    const snapshot = randomUUID()
    this.snapshots.set(snapshot, { ...state, owner, preset, expires: Date.now() + 300000 })
    return { snapshot, preset, canCopy: true, canDelete: state.deletable, ...(state.fallback && state.deletable ? { defaultAfterDelete: state.fallback } : {}) }
  }
  async write(owner: string, raw: PresetCopy | PresetDelete, signal: AbortSignal) {
    const operation = raw.method === 'remote.presetCopy' ? presetCopySchema.parse(raw) : presetDeleteSchema.parse(raw)
    const snapshot = this.snapshots.get(operation.snapshot)
    if (!snapshot || snapshot.owner !== owner) throw Error('remote_settings_stale')
    this.snapshots.delete(operation.snapshot)
    const run = () => this.atomic.withFileLock(join(snapshot.profileDir, 'package.json'), async () => {
      signal.throwIfAborted()
      if (snapshot.expires <= Date.now() || this.closed) throw Error('remote_settings_stale')
      const current = await this.state(snapshot.preset)
      if (identity(current.services.editor) !== identity(snapshot.services.editor) || identity(current.services.presets) !== identity(snapshot.services.presets)
        || identity(current.profile) !== identity(snapshot.profile) || current.entry !== snapshot.entry || current.config !== snapshot.config || current.fiber !== snapshot.fiber
        || current.profilePath !== snapshot.profilePath || current.profileDir !== snapshot.profileDir || current.anchor !== snapshot.anchor
        || !isDeepStrictEqual(current.options, snapshot.options)
        || current.before !== snapshot.before || !isDeepStrictEqual(current.patches, snapshot.patches)) throw Error('remote_settings_stale')
      await this.boot.reconcileProfilePatches(this.ctx.root, current.patches, 'dsh')
      if (current.entry.options.config !== current.config || current.entry.fiber !== current.fiber || current.entry.fiber?.state !== 2) throw Error('remote_settings_stale')
      const { parseDocument, isSeq, isMap, Scalar, visit } = this.yaml
      const document = parseDocument(current.before ?? '[]\n', { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value }] })
      if (document.errors.length || !isSeq(document.contents)) throw Error('remote_presets_unavailable')
      let required: string[] = [], added: Row | undefined, archived: unknown
      if (operation.method === 'remote.presetCopy') {
        const existing = flatten(this.boot.composeEntries([current.patches]))
        if (existing.some(row => row.name === presetModule && object(row.config).id === operation.id)) throw Error('remote_preset_exists')
        const config = structuredClone(object(current.config))
        config.id = operation.id; config.name = operation.name
        config.archived = false
        const entryId = 'dshm-preset-' + randomUUID()
        // 复制原声明的完整 raw 参数，保留原子插件表达式和组合规则；ID由电脑生成。
        added = { ...structuredClone(current.entry.options), id: entryId, config }
        document.add(document.createNode({ insert: [added] })); required = [entryId]
      } else {
        if (!current.deletable) throw Error('remote_preset_inherited')
        // 原注册表只持有内存中的旧 revision；保留归档声明，使重启后的原会话仍能恢复。
        archived = { ...structuredClone(object(current.config)), archived: true }
        document.add(document.createNode({ id: current.entry.options.id, name: presetModule, config: archived }))
        required = [current.entry.options.id]
        if (current.fallback) {
          const registry = current.services.editor.entries().find(row => row.options.name === registryModule)!
          for (const [index, row] of document.contents.items.entries()) if (isMap(row) && document.getIn([index, 'id']) === registry.options.id && !row.has('insert')) {
            const config = row.get('config', true)
            if (isMap(config)) config.delete('selectedDefault')
          }
        }
      }
      visit(document, { Map(_key, node) {
        if (node.items.length !== 1 || typeof node.get('__jsExpr') !== 'string') return
        const expression = new Scalar(node.get('__jsExpr')); expression.tag = 'tag:yaml.org,2002:js'; return expression
      } })
      const loaded = this.boot.loadProfileDirectory('dsh', current.profile.dir, current.profile.installAnchor)
      const text = String(document), patches = this.boot.readProfilePatches('dsh', current.profile, { ...loaded, patches: this.parse(text) })
      const composed = flatten(this.boot.composeEntries([patches]))
      const before = flatten(this.boot.composeEntries([current.patches]))
      if (added) {
        if (!isDeepStrictEqual(composed.find(row => row.id === added!.id), added)
          || !isDeepStrictEqual(composed.filter(row => row.id !== added!.id), before)) throw Error('remote_operation_denied')
      } else {
        const registry = before.find(row => row.name === registryModule), nextRegistry = composed.find(row => row.id === registry?.id)
        if (!isDeepStrictEqual(composed.find(row => row.id === current.entry.options.id)?.config, archived)) throw Error('remote_operation_denied')
        if (current.fallback && (object(nextRegistry?.config).selectedDefault ?? object(nextRegistry?.config).default) !== current.fallback) throw Error('remote_operation_denied')
        if (current.fallback) {
          const withoutSelection = (row: Row | undefined) => {
            const copy = structuredClone(row), config = { ...object(copy?.config) }
            delete config.selectedDefault
            return { ...copy, config }
          }
          if (!isDeepStrictEqual(withoutSelection(registry), withoutSelection(nextRegistry))) throw Error('remote_operation_denied')
        }
        const unchanged = (rows: Row[]) => rows.filter(row => row.id !== current.entry.options.id && !(current.fallback && row.id === registry?.id))
        if (!isDeepStrictEqual(unchanged(composed), unchanged(before))) throw Error('remote_operation_denied')
      }
      signal.throwIfAborted()
      if (current.profile.patchPath !== current.profilePath || current.profile.dir !== current.profileDir
        || this.closed || this.services()?.editor.documentPath !== current.profilePath) throw Error('remote_settings_stale')
      await this.atomic.writeFileAtomic(current.profilePath, text, { mode: 384 })
      // 提交以后即使连接取消，也必须完成原 Loader 调和或精确回滚；不因手机断线留下半份配置。
      try {
        await this.boot.reconcileProfilePatches(this.ctx.root, patches, 'dsh', required)
        if (operation.method === 'remote.presetCopy') {
          const resolved = await current.services.presets.resolve(operation.id)
          if (resolved.id !== operation.id || object(resolved).broken !== undefined) throw Error('remote_presets_unavailable')
        } else if (current.fallback) {
          const resolved = await current.services.presets.resolve(current.fallback)
          if (resolved.id !== current.fallback || object(resolved).broken !== undefined) throw Error('remote_presets_unavailable')
        }
      } catch (error) {
        if (current.before === undefined) await unlink(current.profilePath)
        else await this.atomic.writeFileAtomic(current.profilePath, current.before, { mode: 384 })
        await this.boot.reconcileProfilePatches(this.ctx.root, current.patches, 'dsh')
        throw error
      }
      this.snapshots.clear()
      return { preset: operation.method === 'remote.presetCopy' ? operation.id : snapshot.preset,
        copied: operation.method === 'remote.presetCopy', deleted: operation.method === 'remote.presetDelete' }
    })
    const hmr = this.ctx.get('hmr')
    return hmr ? hmr.runExclusive(run) : run()
  }
  dispose() { this.closed = true; this.snapshots.clear() }
}
