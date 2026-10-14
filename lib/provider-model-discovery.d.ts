import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
type Settings = Pick<SettingsProvider, 'get'>;
export type ModelDiscovery = Pick<LlmRuntime, 'discoverModels'>;
/** 仅读取电脑已保存路由；不接受手机传入地址或凭据，不改设置。 */
export declare function discoverProviderModels(rawRoute: string, settings: () => Settings | undefined, runtime: () => ModelDiscovery | undefined, signal: AbortSignal): Promise<{
    provider: string;
    rows: {
        id: string;
        name?: string | undefined;
        contextWindow?: number | undefined;
        maxTokens?: number | undefined;
        inputModalities?: ("image" | "text")[] | undefined;
    }[];
}>;
export {};
