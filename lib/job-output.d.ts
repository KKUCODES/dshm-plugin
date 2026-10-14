import type { Agent } from '@deepseek-ai/dsh-agent';
import type { JobId, JobStatus } from '@deepseek-ai/dsh-jobs';
/** 对应已核验的 background-output v1 补丁；旧版 registry 不实现此方法。 */
export type IndependentOutput = {
    state: 'pending' | 'unsupported';
} | {
    state: 'available';
    bytes: Uint8Array;
    startOffset: number;
    nextOffset: number;
    totalBytes: number;
    lossy: boolean;
    spillPath?: string;
};
export type OutputRequest = {
    stream: 'stdout' | 'stderr';
    fromByte: number;
    maxBytes: number;
};
export type IndependentRegistry = {
    readOutputBytes?: (id: JobId, request: OutputRequest, caller: Agent) => {
        output: IndependentOutput;
        snapshot: OutputSnapshot;
    };
};
type OutputSnapshot = {
    status: JobStatus;
};
/** 只补读原收集器提供的完整 spill；路径不会来自手机或返回手机。每次最多 64 KiB。 */
export declare function recoverOutput(request: OutputRequest, read: () => {
    output: IndependentOutput;
    snapshot: OutputSnapshot;
}, signal: AbortSignal): Promise<{
    state: "pending" | "unsupported" | "available";
    status: JobStatus;
} | {
    data: string;
    startOffset: number;
    nextOffset: number;
    totalBytes: number;
    lossy: boolean;
    state: "pending" | "unsupported" | "available";
    status: JobStatus;
}>;
export {};
