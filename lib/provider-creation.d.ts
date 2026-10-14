import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
import { type ProviderCreationWrite } from "./protocol/index.js";
type Settings = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>;
export type ProviderDirectory = Pick<LlmRuntime, 'listProviders' | 'listConfigurableProviders'>;
/** 原目录决定内置路由，原schema决定协议；创建不接受任意配置或凭据引用。 */
export declare class ProviderCreation {
    private settings;
    private runtime;
    private keyAvailable;
    private snapshots;
    constructor(settings: () => Settings | undefined, runtime: () => ProviderDirectory | undefined, keyAvailable: () => boolean);
    private current;
    read(owner: string): {
        snapshot: string;
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        keyAvailable: boolean;
        protocols: string[];
        taken: string[];
        available: {
            provider: string;
            name: string;
        }[];
        created?: {
            provider: string;
            useKey: boolean;
        } | undefined;
    };
    create(owner: string, raw: ProviderCreationWrite, signal: AbortSignal): Promise<{
        writable: boolean;
        created: {
            provider: string;
            useKey: boolean;
        };
        snapshot: string;
        revision: number;
        applies: "live" | "restart";
        keyAvailable: boolean;
        protocols: string[];
        taken: string[];
        available: {
            provider: string;
            name: string;
        }[];
    }>;
    dispose(): void;
}
export {};
