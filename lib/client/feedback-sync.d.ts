export interface FeedbackReader {
    resync(): Promise<{
        ok: boolean;
    }>;
}
export interface FeedbackEvents {
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    close(): void;
}
/** 同一原 controller 的多个视图共享通知，按原写队列重读，卸载后忽略迟到结果。 */
export declare class DesktopFeedbackSync {
    private readonly connect;
    private readonly active;
    constructor(connect: (sessionId: string) => FeedbackEvents);
    subscribe(controller: FeedbackReader, sessionId: string, listener: (failed: boolean) => void): () => void;
    dispose(): void;
}
