import type { JobId, JobStatus } from '@deepseek-ai/dsh-jobs';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { OutputRequest } from './job-output.js';
/** DSH 0.2.1 的公开 JobView / readAt 契约；旧版没有这个服务面。 */
export interface RingJobRegistry {
    get(id: JobId, caller: SessionId): {
        startedAt: number;
        status: JobStatus;
        output: {
            total: number;
            earliest: number;
        };
    };
    kill(id: JobId, caller: SessionId, reason?: string): 'requested' | 'already-finished';
    readAt(id: JobId, from: number, caller: SessionId): {
        next: number;
        lossy: boolean;
        chunks: readonly {
            at: number;
            text: string;
            channel?: string;
            gapBefore?: true;
        }[];
    };
}
/** 新版所有 channel 共用字节坐标，不能冒充旧版每个 stdout/stderr 的独立字节坐标。 */
export declare function ringOutput(registry: RingJobRegistry, id: JobId, caller: SessionId, request: OutputRequest): {
    state: "available";
    status: JobStatus;
    coordinate: "ring";
    data: string;
    startOffset: number;
    nextOffset: number;
    totalBytes: number;
    lossy: boolean;
    skippedBytes: number;
    producerGap: boolean;
};
