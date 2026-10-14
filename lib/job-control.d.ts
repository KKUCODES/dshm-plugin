import type { Context } from '@deepseek-ai/cordis';
import type { Operation } from "./protocol/index.js";
import type { JobStatus } from '@deepseek-ai/dsh-jobs';
/** 每次 jobs 服务注入生成新身份，旧手机页面不能停止重启后复用 id 的进程。 */
export declare class JobControl {
    private ctx;
    private version;
    readonly generation: `${string}-${string}-${string}-${string}-${string}`;
    private active;
    constructor(ctx: Context, version?: string);
    dispose(): void;
    get outputCoordinates(): "ring" | "channel";
    get outputAvailable(): boolean;
    private job;
    output(operation: Extract<Operation, {
        method: 'remote.jobOutput';
    }>, signal: AbortSignal): Promise<{
        state: "pending" | "unsupported" | "available";
        status: JobStatus;
    }>;
    stop(operation: Extract<Operation, {
        method: 'remote.jobStop';
    }>): {
        status: string;
    };
}
