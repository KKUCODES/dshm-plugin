/** 消费者确认后才继续读资源；慢手机不能让整份文件堆进 WebSocket。 */
export declare class ResourceWindow {
    private credits;
    private wake?;
    acknowledge(count: number): void;
    take(signal: AbortSignal): Promise<void>;
}
