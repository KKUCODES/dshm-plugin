import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { ProviderDirectory } from './provider-creation.js';
import { type ComputerEndpointWrite } from "./protocol/index.js";
type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>;
/** 未配置baseURL时由原提供方模型目录解析；不假定所有模型共用默认站点。 */
export declare class ProviderEndpoint {
    private settings;
    private directory?;
    private snapshots;
    constructor(settings: () => Provider | undefined, directory?: (() => Pick<ProviderDirectory, "listConfigurableProviders"> | undefined) | undefined);
    private resettable;
    read(owner: string, rawRoute: string, resetPolicy?: boolean): {
        snapshot: string;
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        protocol: "provider" | "messages" | "chat-completions";
        origin: string | null;
        inheritedOrigin: string | null;
        customPath: boolean;
        overridden: boolean;
        target?: "web-search-deepseek" | {
            provider: string;
        } | undefined;
        resettable?: boolean | undefined;
    };
    write(owner: string, raw: ComputerEndpointWrite, signal: AbortSignal): Promise<{
        snapshot: string;
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        protocol: "provider" | "messages" | "chat-completions";
        origin: string | null;
        inheritedOrigin: string | null;
        customPath: boolean;
        overridden: boolean;
        target?: "web-search-deepseek" | {
            provider: string;
        } | undefined;
        resettable?: boolean | undefined;
    }>;
    dispose(): void;
}
export {};
