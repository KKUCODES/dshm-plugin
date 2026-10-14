import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
type Settings = Pick<SettingsProvider, 'get' | 'describe'>;
export interface ModelProbeServices {
    settings: () => Settings | undefined;
    runtime: () => Pick<LlmRuntime, 'discoverModels'> | undefined;
    credentialRevision: () => number;
    permitted: (owner: string) => boolean;
}
/** 一次性准备结果仅保存在Host；不保存临时Key，不返回底层错误正文。 */
export declare class ModelProbe {
    private services;
    private now;
    private snapshots;
    private active;
    private disposed;
    constructor(services: ModelProbeServices, now?: () => number);
    available(): Promise<boolean>;
    private current;
    prepare(owner: string, raw: unknown): {
        authentication: {
            mode: "none";
        } | {
            mode: "temporary";
        } | {
            mode: "stored";
            provider: string;
        };
        baseURL: string;
        api: "openai-completions" | "openai-responses" | "anthropic-messages";
        snapshot: string;
        expiresAt: number;
    };
    private validate;
    execute(owner: string, raw: unknown, signal: AbortSignal): Promise<{
        rows: {
            id: string;
            name?: string | undefined;
            contextWindow?: number | undefined;
            maxTokens?: number | undefined;
            inputModalities?: ("image" | "text")[] | undefined;
        }[];
    }>;
    invalidate(owner: string): void;
    dispose(): void;
}
export {};
