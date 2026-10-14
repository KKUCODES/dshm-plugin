import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import { type ProviderModelsWrite } from "./protocol/index.js";
type Provider = Pick<SettingsProvider, 'get' | 'describe' | 'mutate' | 'writable'>;
/** 原数组替换语义不变；只把已审阅字段发给手机，隐藏字段按同一快照行合并回去。 */
export declare class ProviderModels {
    private settings;
    private namespace;
    private snapshots;
    constructor(settings: () => Provider | undefined, namespace?: 'llm-pi-ai' | 'llm-deepseek');
    read(owner: string, rawRoute: string, scope?: 'overrides'): {
        provider: string;
        snapshot: string;
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        overridden: boolean;
        rows: {
            source: string;
            id: string;
            name?: string | undefined;
            contextWindow?: number | undefined;
            maxTokens?: number | undefined;
            advanced?: {
                input?: ("image" | "text")[] | undefined;
                reasoningEfforts?: false | Partial<Record<"off" | "low" | "high" | "max" | "minimal" | "medium" | "xhigh", string | null>> | null | undefined;
            } | undefined;
            compat?: {
                [x: string]: number | boolean | "max_completion_tokens" | "max_tokens" | "openai" | "deepseek" | "openrouter" | "together" | "baseten" | "zai" | "qwen" | "chat-template" | "qwen-chat-template" | "string-thinking" | "ant-ling" | "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens" | "anthropic" | Record<string, string | number | boolean | {
                    $var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
                    omitWhenOff?: boolean | undefined;
                } | null> | null | undefined;
            } | undefined;
        }[];
        scope?: "overrides" | undefined;
        blockedByModels?: boolean | undefined;
        advancedEditable?: boolean | undefined;
        compatEditable?: boolean | undefined;
    };
    write(owner: string, raw: ProviderModelsWrite, signal: AbortSignal): Promise<{
        provider: string;
        snapshot: string;
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        overridden: boolean;
        rows: {
            source: string;
            id: string;
            name?: string | undefined;
            contextWindow?: number | undefined;
            maxTokens?: number | undefined;
            advanced?: {
                input?: ("image" | "text")[] | undefined;
                reasoningEfforts?: false | Partial<Record<"off" | "low" | "high" | "max" | "minimal" | "medium" | "xhigh", string | null>> | null | undefined;
            } | undefined;
            compat?: {
                [x: string]: number | boolean | "max_completion_tokens" | "max_tokens" | "openai" | "deepseek" | "openrouter" | "together" | "baseten" | "zai" | "qwen" | "chat-template" | "qwen-chat-template" | "string-thinking" | "ant-ling" | "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens" | "anthropic" | Record<string, string | number | boolean | {
                    $var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
                    omitWhenOff?: boolean | undefined;
                } | null> | null | undefined;
            } | undefined;
        }[];
        scope?: "overrides" | undefined;
        blockedByModels?: boolean | undefined;
        advancedEditable?: boolean | undefined;
        compatEditable?: boolean | undefined;
    }>;
    dispose(): void;
}
export {};
