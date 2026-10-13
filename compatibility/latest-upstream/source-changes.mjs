// 固定新版源码补丁；必须先核对原源码，不从编译产物猜测TypeScript声明。
import { transform as clientLifetime } from '../cordis-client-lifetime/changes.mjs';
import { transform as inventorySync } from '../cordis-inventory-sync/changes.mjs';
import { transformInventoryReady } from './cordis-inventory-ready.mjs';
import { panelErrorSourceHash, transformPanelError } from './cordis-panel-error.mjs';
import { transformSourceCordisScopes } from './source-cordis-scopes.mjs';
import { sourceForegroundChanges } from './source-foreground.mjs';
import { sourceToolCancellationChanges, transformInnerCancellation } from './source-tool-cancellation.mjs';
import { sourcePluginRestartChanges } from './source-plugin-restart.mjs';
import { sourcePackageProcessChanges } from './source-package-process.mjs';
import { sourcePackageRangeChanges } from './source-package-range.mjs';
import { sourceDesktopChanges } from './source-desktop-apps.mjs';
import { sourceEncodingChanges, transformEncodingPreamble } from './pwsh-encoding-changes.mjs';
import { sourceAutoReviewCancellationChanges } from './source-auto-review-cancel.mjs';
import { sourceFileWatchChanges } from './file-watch-changes.mjs';
export const sourceCommit = '5badb15009ae1756c3afe0ae0cef1faafc290ccc';
const notificationTypes = `
interface DshmPendingItem {
  readonly eventId: string
  readonly sessionId: string
  readonly kind: 'approval' | 'question'
}
type DshmPendingChange =
  | { readonly type: 'pending'; readonly item: DshmPendingItem }
  | { readonly type: 'resolved'; readonly eventId: string }

`;
const notificationMembers = `  private readonly notificationListeners = new Set<(change: DshmPendingChange) => unknown>()
  private notificationsClosed = false
  /** 只读观察原待办，不增加审批参与者或读取请求内容。 */
  readonly pendingNotifications = Object.freeze({
    observe: (listener: (change: DshmPendingChange) => unknown) => {
      if (this.notificationsClosed) throw new Error('pending_notifications_closed')
      if (this.notificationListeners.size >= 64) throw new Error('pending_notifications_busy')
      const snapshot: DshmPendingItem[] = []
      for (const pending of this.pendingRemoteEvents.values()) {
        const item = this.notificationItem(pending)
        if (item !== undefined) snapshot.push(item)
        if (snapshot.length > 256) throw new Error('pending_notifications_overflow')
      }
      this.notificationListeners.add(listener)
      return Object.freeze({ snapshot: Object.freeze(snapshot), dispose: () => this.notificationListeners.delete(listener) })
    },
  })

  private notificationItem(pending: PendingRemoteEvent): DshmPendingItem | undefined {
    const event = pending.frame.event
    if (event !== 'approval/request' && event !== 'user-questions/request') return undefined
    return Object.freeze({ eventId: pending.id, sessionId: pending.frame.agentId,
      kind: event === 'approval/request' ? 'approval' : 'question' })
  }

  private publishNotification(change: DshmPendingChange): void {
    const value = Object.freeze(change)
    for (const listener of [...this.notificationListeners]) {
      try { void Promise.resolve(listener(value)).catch(() => {}) }
      catch { /* 观察失败不能改变原审批结算。 */ }
    }
  }

`;

export const sourceChanges = [
  ...sourceFileWatchChanges,
  ...sourceAutoReviewCancellationChanges,
  ...sourceDesktopChanges,
  ...sourcePluginRestartChanges,
  ...sourcePackageProcessChanges,
  ...sourcePackageRangeChanges,
  ...sourceEncodingChanges,
  // tools/index同时包含前台观察类型与内部取消边界，合成一个载荷，避免安装时相互覆盖。
  ...sourceForegroundChanges.map(change => change.path === 'packages/core/tools/src/index.ts'
    ? { ...change, patch: 'ptc-cancel', transform: transformInnerCancellation }
    : change.path === 'packages/shell/pwsh-local/src/index.ts'
      ? { ...change, patch: 'pwsh-output-encoding', transform: transformEncodingPreamble } : change),
  ...sourceToolCancellationChanges,
  ...[
    ['index.ts', '512f97b15f015d3615e11b3059bebd116edefaa400044f5e70585bd893870369'],
    ['inspect-registry.ts', '3ece5db5adb24e13680097caf841ca988aedcc8a0a546dbbdb042a2f6e0f423a'],
  ].map(([file, hash]) => ({ patch: 'cordis-scopes', name: '@deepseek-ai/dsh-cordis-host-runner',
    package: 'packages/extensions/cordis-host-runner', path: `packages/extensions/cordis-host-runner/src/${file}`,
    hash, transform: source => transformSourceCordisScopes(file, source) })),
  ...[
    ['ui-cordis', '@deepseek-ai/dsh-client-ui-cordis', 'inventory.ts', '065d3e967f041459cbcdb56f354700a7d40e779beed84ec09abd65be87b92bbf'],
    ['ui-cordis', '@deepseek-ai/dsh-client-ui-cordis', 'index.ts', '086cc61d2b6f8c4e3806daaee34622e9e5db86473a866768185876fe9539573a'],
    ['cordis-client-runner', '@deepseek-ai/dsh-cordis-client-runner', 'inspect-registry.ts', 'b8d31dfa1628f77b175ba825c7744531a9888e95260ca149843c1d3b2bcd26bb'],
    ['cordis-client-runner', '@deepseek-ai/dsh-cordis-client-runner', 'index.ts', '6202f71ca5a99823d1372f29d6d9d42786ad87c6bc3ebcebe5bc1c912115149a'],
  ].map(([directory, name, file, hash]) => {
    const legacyPath = `${directory}/src/client/${file}`;
    return { patch: 'cordis-client-lifetime', name, package: `packages/extensions/${directory}`,
      path: `packages/extensions/${legacyPath}`, hash,
      // 四个原文件与已核验变换的输入逐字节相同；不放宽旧变换自身哈希。
      transform: source => {
        const next = clientLifetime(legacyPath, source);
        const synced = directory === 'ui-cordis' ? inventorySync(`extensions/${legacyPath}`, next) : next;
        return directory === 'ui-cordis' && file === 'index.ts' ? transformInventoryReady(synced) : synced;
      },
    };
  }),
  { patch: 'cordis-client-lifetime', name: '@deepseek-ai/dsh-api-remotes', package: 'packages/api/remotes', path: 'packages/api/remotes/src/remote-events.ts',
    hash: 'a2c4a4eb4d6e4c259649e8c9364e539d71eaea295ca6f738fb9fec68cb283009', edits: [
      ["  { event: 'user-questions/request', mode: 'waterfall' },", "  { event: 'user-questions/request', mode: 'waterfall' },\n  { event: 'cordis/inventory-changed', mode: 'emit' },"],
    ] },
  { patch: 'cordis-client-lifetime', name: '@deepseek-ai/dsh-client-ui-cordis', package: 'packages/extensions/ui-cordis',
    path: 'packages/extensions/ui-cordis/src/client/CordisPanel.tsx', hash: panelErrorSourceHash, transform: transformPanelError },
  { patch: 'cordis-client-lifetime', name: '@deepseek-ai/dsh-cordis-host-runner', package: 'packages/extensions/cordis-host-runner', path: 'packages/extensions/cordis-host-runner/src/types.ts',
    hash: '465d5fd4f0bfa29bae33a92b9c23ef9d141f829087c489f8c71cdf42ab038630', edits: [
      ["    'cordis/dynamic-retract'(retracted: DynamicCordisRetracted): void",
        "    'cordis/dynamic-retract'(retracted: DynamicCordisRetracted): void\n    /**\n     * 插件声明或版本变化，客户端重新读取目录。\n     * @mode emit\n     */\n    'cordis/inventory-changed'(): void"],
    ] },
  { patch: 'pending-observer', name: '@deepseek-ai/dsh-api-gateway', package: 'packages/api/gateway', path: 'packages/api/gateway/src/index.ts',
    hash: '4df5b38b5e73f7ae5fe5bcab5c633c1aa589e99d36b5f9c975708df01e28b839', edits: [
      ['interface PendingRemoteEvent {', notificationTypes + 'interface PendingRemoteEvent {'],
      ['  private srcClaims: ReadonlySet<string> | undefined', notificationMembers + '  private srcClaims: ReadonlySet<string> | undefined'],
      ["    super(ctx, 'typertGateway')", "    super(ctx, 'typertGateway')\n    ctx.effect(() => () => { this.notificationsClosed = true; this.notificationListeners.clear() }, 'dshm: readonly pending observers')"],
      ['      else for (const client of this.remoteEventClients.values()) this.deliverRemoteEvent(pending, client)',
        "      else {\n        const item = this.notificationItem(pending)\n        if (item !== undefined) this.publishNotification({ type: 'pending', item })\n        for (const client of this.remoteEventClients.values()) this.deliverRemoteEvent(pending, client)\n      }"],
      ['    this.pendingRemoteEvents.delete(pending.id)', "    this.pendingRemoteEvents.delete(pending.id)\n    if (this.notificationItem(pending) !== undefined) this.publishNotification({ type: 'resolved', eventId: pending.id })"],
    ] },
  { patch: 'preset-archive', name: '@deepseek-ai/dsh-agent-preset', package: 'packages/preset/agent-preset', path: 'packages/preset/agent-preset/src/index.ts',
    hash: '5bb8843f1a8d856ad439637b43ce2105aea5cb60a68786f8280e8bfdedef8279', edits: [
      ['    id: z.string().required(),', '    id: z.string().required(),\n    archived: z.boolean().default(false),'],
    ] },
  { patch: 'preset-archive', name: '@deepseek-ai/dsh-agent-preset-registry', package: 'packages/preset/agent-preset-registry', path: 'packages/preset/agent-preset-registry/src/definition.ts',
    hash: 'd952da79acd930954b8d1667ffe692b1e5223f853127b5cbda6de7cf9cd76903', edits: [
      ['  readonly id: string', '  readonly id: string\n  /** 从选择目录隐藏，保留已有会话所需声明。 */\n  readonly archived?: boolean'],
    ] },
  { patch: 'preset-archive', name: '@deepseek-ai/dsh-agent-preset-registry', package: 'packages/preset/agent-preset-registry', path: 'packages/preset/agent-preset-registry/src/index.ts',
    hash: '07a587dfe3b9d3cbe7d960919567bdc754459c0b55f6a1b13502da194767188d', edits: [
      ["export { agentPresetProjectionDefinition } from './session.ts'", "export const DSHM_PRESET_ARCHIVE_VERSION = 2\nexport { agentPresetProjectionDefinition } from './session.ts'"],
      ['    const rows = await Promise.all([...this.definitions.values()].map(async (record) => {', '    const rows = await Promise.all([...this.definitions.values()].filter(record => record.config.archived !== true).map(async (record) => {'],
      ['  private async retain(id?: string): Promise<Generation> {', '  private async retain(id?: string, selectable: boolean = false): Promise<Generation> {'],
      ['      if (this.definitions.get(wanted) !== record) continue', '      if (this.definitions.get(wanted) !== record) continue\n      if (selectable && record.config.archived === true) throw new RemoteError(\'agent-preset/not-found\', \'This preset is no longer selectable\', { agentPreset: wanted, available: [...this.definitions.keys()] })'],
      ['  async mount(ctx: Context, id?: string): Promise<AgentPreset> {\n    const generation = await this.retain(id)', '  async mount(ctx: Context, id?: string, selectable: boolean = false): Promise<AgentPreset> {\n    const generation = await this.retain(id, selectable)'],
      ['    const preset = await this.mount(ctx, id)', '    const preset = await this.mount(ctx, id, true)'],
      ['  async select(agent: Agent, agentPreset: string): Promise<string> {', "  async select(agent: Agent, agentPreset: string): Promise<string> {\n    if (this.definitions.get(agentPreset)?.config.archived === true) throw new RemoteError('agent-preset/not-found', 'This preset is no longer selectable', { agentPreset, available: [...this.definitions.keys()] })"],
    ] },
  { patch: 'model-discovery', name: '@deepseek-ai/dsh-llm-pi-ai', package: 'packages/llm/llm-pi-ai', path: 'packages/llm/llm-pi-ai/src/discovery.ts',
    hash: '6f6a249dce322bebb48e72c35c5113225de187aa2b09cde91d15ecba371aa966', edits: [
      ['  storedProfile?: () => StoredModelDiscoveryProfile | undefined,\n): Promise<readonly LlmDiscoveredModel[]> {',
        "  storedProfile?: () => StoredModelDiscoveryProfile | undefined,\n  options?: { readonly catalog?: boolean; readonly redirect?: 'error' },\n): Promise<readonly LlmDiscoveredModel[]> {"],
      ['  if (request.provider !== undefined) {\n    const installed = catalogModels(request.provider)',
        '  if (options?.catalog !== false && request.provider !== undefined) {\n    const installed = catalogModels(request.provider)'],
      ["    response = await fetch(url, {\n      method: 'GET',",
        "    response = await fetch(url, {\n      ...options?.redirect === 'error' ? { redirect: 'error' as const } : {},\n      method: 'GET',"],
    ] },
  { patch: 'model-discovery', name: '@deepseek-ai/dsh-llm-pi-ai', package: 'packages/llm/llm-pi-ai', path: 'packages/llm/llm-pi-ai/src/index.ts',
    hash: '1aa1823262d01d9e2bdc33177b82bfb1082b4559cbde288bb3606db19d575f2d', edits: [
      ['    () => storedDiscoveryProfile(request.provider),\n  ))\n  // Route effects bind',
        "    () => storedDiscoveryProfile(request.provider),\n  ))\n  // 手机草稿必须查询实际地址，拒绝跳转；认证与销毁沿用当前实例。\n  ctx.llm.registerModelDiscovery(`${settingsNs}:dshm-endpoint-v2`, (request, signal) => discoverModels(\n    { ...request, ...signal === undefined ? {} : { signal } },\n    () => storedDiscoveryProfile(request.provider),\n    { redirect: 'error', catalog: false },\n  ))\n  // Route effects bind"],
    ] },
  { patch: 'client-entries', name: '@deepseek-ai/dsh-client-modules', package: 'packages/client/modules', path: 'packages/client/modules/src/client/entries.ts',
    hash: '52b438c9541a470b63e41b8880fd608909117168bfcd76cbe65be6dbff651edc', edits: [
      ['  return JSON.stringify(manifest.modules.map(row => [row.id, row.rev, row.inject, row.external]))',
        '  return JSON.stringify([manifest.modules.map(row => [row.id, row.rev, row.inject, row.external]), manifest.plugins.map(row => row.id)])'],
      ['  sync(graph: unknown): Promise<void> {\n    const manifest = parseBootManifest(graph)',
        `  sync(graph: unknown): Promise<void> {
    return this.syncManifest(parseBootManifest(graph))
  }

  /** 保留完整依赖图，只激活手机选择的插件；原电脑sync仍全量。 */
  syncSelected(graph: unknown, pluginIds: readonly string[]): Promise<void> {
    const manifest = parseBootManifest(graph)
    const known = new Set(manifest.plugins.map(row => row.id))
    if (!Array.isArray(pluginIds) || pluginIds.some(id => typeof id !== 'string' || !known.has(id))
      || new Set(pluginIds).size !== pluginIds.length) throw new Error('client-modules: invalid activation selection')
    const selected = new Set(pluginIds)
    return this.syncManifest({ ...manifest, plugins: manifest.plugins.filter(row => selected.has(row.id)) })
  }

  private syncManifest(manifest: BootManifest): Promise<void> {`],
      ['      if (this.stopped || desired === undefined) return',
        '      if (this.stopped || desired === undefined || !this.desired.plugins.some(row => row.id === id)) return'],
      ['    for (const row of manifest.modules) {\n      if (!this.current(generation)) break',
        '    for (const row of manifest.modules) {\n      if (!wanted.has(row.id)) continue\n      if (!this.current(generation)) break'],
    ] },
];
