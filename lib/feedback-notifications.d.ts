import type { Context } from '@deepseek-ai/cordis';
/** 仅发失效通知；不发布假的 Session，不在持久化写锁内读取反馈。 */
export declare class FeedbackNotifications {
    private readonly listeners;
    private readonly lifetime;
    constructor(ctx: Context);
    private changed;
    follow(sessionId: string, caller: AbortSignal): AsyncGenerator<{
        type: "ready";
        revision: number;
    } | {
        type: "changed";
        revision: number;
    }, void, unknown>;
}
