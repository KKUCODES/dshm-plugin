/** 与固定基线 Gateway 兼容补丁的电脑内部观察契约一致，不是新的审批参与者。 */
export interface PendingNotificationItem {
  readonly eventId: string
  readonly sessionId: string
  readonly kind: 'approval' | 'question'
}
export type PendingNotificationChange =
  | { readonly type: 'pending'; readonly item: PendingNotificationItem }
  | { readonly type: 'resolved'; readonly eventId: string }
export interface PendingNotificationObserver {
  observe(listener: (change: PendingNotificationChange) => void | Promise<void>): {
    readonly snapshot: readonly PendingNotificationItem[]
    readonly dispose: () => void
  }
}

export function pendingNotificationsOf(gateway: unknown): PendingNotificationObserver | undefined {
  const value = (gateway as { pendingNotifications?: PendingNotificationObserver } | undefined)?.pendingNotifications
  return value && typeof value.observe === 'function' ? value : undefined
}
