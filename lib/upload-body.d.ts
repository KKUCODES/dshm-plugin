/** 有界上传窗口；只有原 DSH 消费字节后才归还额度，不在中继中聚合整个文件。 */
export declare class UploadBody {
    private credit;
    readonly body: ReadableStream<Uint8Array>;
    private queue;
    private credits;
    private bytes;
    private ended;
    private failure?;
    private wake?;
    private detach;
    constructor(signal: AbortSignal, credit: (count: number) => void);
    push(data: string): void;
    end(): void;
    fail(error?: Error): void;
}
