import type { Context } from '@deepseek-ai/cordis';
import type { PendingNotificationObserver } from './pending-notifications.js';
export interface TaskOutcome {
    type: 'outcome';
    sessionId: string;
    seq: number;
    time: number;
    turn: number;
    reason: 'completed' | 'error' | 'blocked' | 'max-tokens';
}
export interface TaskNotificationPreview {
    title: string;
    text: string;
}
/** 只取有限正文；代码块、推理、工具参数和错误详情不进入通知。 */
export declare function notificationText(value: string, limit: number): string;
/** 只转发订阅期间的原会话结算；摘要由客户端显式协商，不回放历史。 */
export declare class TaskNotifications {
    private readonly ctx;
    private readonly pending;
    readonly generation: `${string}-${string}-${string}-${string}-${string}`;
    private readonly listeners;
    private readonly lifetime;
    private readonly replies;
    constructor(ctx: Context, pending?: () => PendingNotificationObserver | undefined);
    get pendingAvailable(): boolean;
    private preview;
    follow(caller: AbortSignal, previewVersion?: 1): AsyncGenerator<{
        readonly type: "pending";
        readonly item: import("./pending-notifications.js").PendingNotificationItem;
    } | {
        readonly type: "resolved";
        readonly eventId: string;
    } | {
        type: "outcome";
        sessionId: string;
        seq: number;
        time: number;
        turn: number;
        reason: "completed" | "error" | "blocked" | "max-tokens";
    } | {
        type: "ready";
        generation: `${string}-${string}-${string}-${string}-${string}`;
        pendingAvailable: boolean;
        pending: readonly import("./pending-notifications.js").PendingNotificationItem[];
    } | {
        preview: TaskNotificationPreview;
        type: "pending";
        item: import("./pending-notifications.js").PendingNotificationItem;
        generation?: undefined;
        pendingAvailable?: undefined;
        pending?: undefined;
    }, void, unknown>;
}
