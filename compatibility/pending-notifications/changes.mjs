export const baseline = 'ddefc45fbc7f8e46dd73185e68295696d1297887';
export const patchVersion = 'pending-notifications-v1';

const contract = `/** 电脑内部只读待办观察；不注册 Remote 客户端，不取得审批响应能力。 */
export interface PendingNotificationItem {
  readonly eventId: string
  readonly sessionId: string
  readonly kind: 'approval' | 'question'
}
export type PendingNotificationChange =
  | { readonly type: 'pending'; readonly item: PendingNotificationItem }
  | { readonly type: 'resolved'; readonly eventId: string }
export interface PendingNotificationObserver {
  /** 同步取得初始集合并订阅后续变化；调用者负责释放，不回放旧事件。 */
  observe(listener: (change: PendingNotificationChange) => void | Promise<void>): {
    readonly snapshot: readonly PendingNotificationItem[]
    readonly dispose: () => void
  }
}

`;
const observer = `  private readonly notificationListeners = new Set<(change: PendingNotificationChange) => void | Promise<void>>()
  private notificationsClosed = false
  readonly pendingNotifications: PendingNotificationObserver = Object.freeze({
    observe: (listener: (change: PendingNotificationChange) => void | Promise<void>) => {
      if (this.notificationsClosed) throw new Error('pending_notifications_closed')
      if (this.notificationListeners.size >= 64) throw new Error('pending_notifications_busy')
      const snapshot: PendingNotificationItem[] = []
      for (const pending of this.pendingRemoteEvents.values()) {
        const item = this.notificationItem(pending)
        if (item) snapshot.push(item)
        if (snapshot.length > 256) throw new Error('pending_notifications_overflow')
      }
      this.notificationListeners.add(listener)
      return Object.freeze({ snapshot: Object.freeze(snapshot), dispose: () => { this.notificationListeners.delete(listener) } })
    },
  })

  private notificationItem(pending: PendingRemoteEvent): PendingNotificationItem | undefined {
    const event = pending.frame.event
    if (event !== 'approval/request' && event !== 'user-questions/request') return
    return Object.freeze({ eventId: pending.id, sessionId: pending.frame.agentId,
      kind: event === 'approval/request' ? 'approval' : 'question' })
  }

  private publishNotification(change: PendingNotificationChange): void {
    const item = Object.freeze(change)
    for (const listener of [...this.notificationListeners]) {
      // 观察失败必须与原审批隔离；不 await，也不把异常或返回值送入 waterfall。
      try { void Promise.resolve(listener(item)).catch(() => {}) } catch { /* 原请求继续。 */ }
    }
  }

`;

export const changes = [
  { path: 'packages/api/gateway/src/types.ts', sha256: 'a6ae63512ba98c3b12b39aac415f9192bd61cd6908df74432de28db676115146', edits: [
    { before: '/** Host dispatcher consumed by Connection adapters. */', after: contract + '/** Host dispatcher consumed by Connection adapters. */' },
    { before: 'export interface TypertGateway {\n', after: 'export interface TypertGateway {\n  readonly pendingNotifications?: PendingNotificationObserver\n' },
  ] },
  { path: 'packages/api/gateway/src/index.ts', sha256: '8dd9c7895d8059419ca416d344e308a07d55e436ae3b9930393047dee1b9f5f5', edits: [
    { before: 'import type {\n  InvokeRemoteRequest,', after: 'import type {\n  PendingNotificationItem,\n  PendingNotificationChange,\n  PendingNotificationObserver,\n  InvokeRemoteRequest,' },
    { before: '  private srcClaims: ReadonlySet<string> | undefined', after: observer + '  private srcClaims: ReadonlySet<string> | undefined' },
    { before: "    super(ctx, 'typertGateway')\n", after: "    super(ctx, 'typertGateway')\n    ctx.effect(() => () => { this.notificationsClosed = true; this.notificationListeners.clear() }, 'api-gateway: pending notification observers')\n" },
    { before: '      else for (const client of this.remoteEventClients.values()) this.deliverRemoteEvent(pending, client)', after: `      else {
        const item = this.notificationItem(pending)
        if (item) this.publishNotification({ type: 'pending', item })
        for (const client of this.remoteEventClients.values()) this.deliverRemoteEvent(pending, client)
      }` },
    { before: '    this.pendingRemoteEvents.delete(pending.id)\n', after: `    this.pendingRemoteEvents.delete(pending.id)
    if (this.notificationItem(pending)) this.publishNotification({ type: 'resolved', eventId: pending.id })
` },
  ] },
];
