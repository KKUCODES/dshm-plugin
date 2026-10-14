import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment';
import { type ComputerEndpointWrite } from "./protocol/index.js";
type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>;
/** 用原 DeepSeek 解析器处理环境回退；原设置服务负责版本校验及逐字段持久化。 */
export declare class ComputerEndpoint {
    private provider;
    private environment;
    private target?;
    private snapshots;
    constructor(provider: () => Provider | undefined, environment: () => LaunchEnvironmentSnapshot, target?: "web-search-deepseek" | undefined);
    private get namespace();
    private options;
    read(owner: string): {
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        protocol: unknown;
        origin: string;
        inheritedOrigin: string;
        customPath: boolean;
        overridden: boolean;
        target?: "web-search-deepseek" | undefined;
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
    };
    write(owner: string, raw: ComputerEndpointWrite, signal: AbortSignal): Promise<{
        revision: number;
        writable: boolean;
        applies: "live" | "restart";
        protocol: unknown;
        origin: string;
        inheritedOrigin: string;
        customPath: boolean;
        overridden: boolean;
        target?: "web-search-deepseek" | undefined;
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    dispose(): void;
}
export {};
