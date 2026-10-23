import { type HostFrame, type ResponseAck } from "./protocol/index.js";
export type ResponseBudget = {
    bytes: number;
    transfers: number;
};
/** 每个请求保留原逻辑消息顺序；只有已协商的大结果占用分块窗口。 */
export declare class ResponseWriter {
    private send;
    private enabled;
    private controller;
    private budget;
    private tail;
    private active?;
    constructor(send: (frame: HostFrame) => void, enabled: boolean, controller: AbortController, budget: ResponseBudget);
    write(frame: HostFrame): Promise<void>;
    acknowledge(frame: ResponseAck): void;
    drain(): Promise<void>;
    cancel(): void;
}
