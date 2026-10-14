import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import type { Operation } from "./protocol/index.js";
import { type IndependentOutput } from './job-output.js';
/** 固定兼容补丁的电脑内部能力；不向手机发布读者、spill 路径或进程控制对象。 */
type ForegroundOutput = {
    readonly stdout: OutputReader;
    readonly stderr: OutputReader;
};
type OutputReader = {
    readonly readBytesFrom?: (fromByte: number, maxBytes: number) => Omit<Extract<IndependentOutput, {
        state: 'available';
    }>, 'state'>;
};
declare module '@deepseek-ai/cordis' {
    interface Events {
        'tools/shell-output'(exec: Readonly<ToolExecution>, output: ForegroundOutput): void;
    }
}
/** 真实工具身份注册表：围绕原工具观察，不改执行、审批、取消或持久会话记录。 */
export declare class CommandOutput {
    private ctx;
    readonly generation: `${string}-${string}-${string}-${string}-${string}`;
    private active;
    private reader?;
    private readonly entries;
    private readonly roots;
    private readonly timer;
    constructor(ctx: Context);
    get available(): boolean;
    dispose(): void;
    private prune;
    private removeOwner;
    private sessionReader;
    private retire;
    private begin;
    private forExecution;
    private finish;
    read(operation: Extract<Operation, {
        method: 'remote.commandOutput';
    }>, signal: AbortSignal): Promise<{
        outputId: string;
        state: "pending" | "unsupported" | "available";
        status: import("@deepseek-ai/dsh-jobs").JobStatus;
    } | {
        outputId: string;
        data: string;
        startOffset: number;
        nextOffset: number;
        totalBytes: number;
        lossy: boolean;
        state: "pending" | "unsupported" | "available";
        status: import("@deepseek-ai/dsh-jobs").JobStatus;
    }>;
}
export {};
