import type { Context } from '@deepseek-ai/cordis';
/** 原 Host 服务的实际生命周期；客户端生成的 namespace 不代表服务仍在运行。 */
export declare class SubagentServiceState {
    private available;
    private readonly listeners;
    private readonly lifetime;
    constructor(ctx: Context);
    follow(caller: AbortSignal): AsyncGenerator<{
        available: boolean;
    }, void, unknown>;
}
