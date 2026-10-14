import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { ProviderDirectory } from './provider-creation.js';
import { type ProviderSettingsWrite, type ProviderKeySetup } from "./protocol/index.js";
type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>;
/** 只修改既有路由的已审阅字段，不能经此入口创建路由或覆盖整个配置树。 */
export declare class ProviderSettings {
    private settings;
    private keyAvailable;
    private directory;
    private snapshots;
    constructor(settings: () => Provider | undefined, keyAvailable?: () => boolean, directory?: () => ProviderDirectory | undefined);
    list(): {
        providers: {
            provider: string;
            name: string;
        }[];
    };
    read(owner: string, rawRoute: string): {
        provider: string;
        snapshot: string;
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        fields: {
            key: "defaultContextWindow" | "streamIdleTimeoutMs" | "timeoutMs" | "displayName" | "defaultMaxTokens" | "cacheRetention" | "transport";
            overridden: boolean;
            value?: string | number | undefined;
        }[];
        keySetupAvailable?: boolean | undefined;
        protocol?: {
            choices: string[];
            value?: string | undefined;
        } | undefined;
        compat?: {
            effective: {
                [x: string]: number | boolean | "max_completion_tokens" | "max_tokens" | "openai" | "deepseek" | "openrouter" | "together" | "baseten" | "zai" | "qwen" | "chat-template" | "qwen-chat-template" | "string-thinking" | "ant-ling" | "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens" | "anthropic" | Record<string, string | number | boolean | {
                    $var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
                    omitWhenOff?: boolean | undefined;
                } | null> | null | undefined;
            };
            overrides: {
                [x: string]: number | boolean | "max_completion_tokens" | "max_tokens" | "openai" | "deepseek" | "openrouter" | "together" | "baseten" | "zai" | "qwen" | "chat-template" | "qwen-chat-template" | "string-thinking" | "ant-ling" | "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens" | "anthropic" | Record<string, string | number | boolean | {
                    $var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
                    omitWhenOff?: boolean | undefined;
                } | null> | null | undefined;
            };
        } | undefined;
    };
    write(owner: string, raw: ProviderSettingsWrite | ProviderKeySetup, signal: AbortSignal): Promise<{
        provider: string;
        snapshot: string;
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        fields: {
            key: "defaultContextWindow" | "streamIdleTimeoutMs" | "timeoutMs" | "displayName" | "defaultMaxTokens" | "cacheRetention" | "transport";
            overridden: boolean;
            value?: string | number | undefined;
        }[];
        keySetupAvailable?: boolean | undefined;
        protocol?: {
            choices: string[];
            value?: string | undefined;
        } | undefined;
        compat?: {
            effective: {
                [x: string]: number | boolean | "max_completion_tokens" | "max_tokens" | "openai" | "deepseek" | "openrouter" | "together" | "baseten" | "zai" | "qwen" | "chat-template" | "qwen-chat-template" | "string-thinking" | "ant-ling" | "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens" | "anthropic" | Record<string, string | number | boolean | {
                    $var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
                    omitWhenOff?: boolean | undefined;
                } | null> | null | undefined;
            };
            overrides: {
                [x: string]: number | boolean | "max_completion_tokens" | "max_tokens" | "openai" | "deepseek" | "openrouter" | "together" | "baseten" | "zai" | "qwen" | "chat-template" | "qwen-chat-template" | "string-thinking" | "ant-ling" | "thinking_token_budget" | "thinking_budget" | "thinking_budget_tokens" | "anthropic" | Record<string, string | number | boolean | {
                    $var: "thinking.enabled" | "thinking.effort" | "thinking.budget";
                    omitWhenOff?: boolean | undefined;
                } | null> | null | undefined;
            };
        } | undefined;
    }>;
    dispose(): void;
}
export {};
