import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { ProviderDirectory } from './provider-creation.js';
import type { ComputerKeyServices } from './computer-key.js';
type Services = {
    settings: () => Pick<SettingsProvider, 'get' | 'describe'> | undefined;
    directory: () => ProviderDirectory | undefined;
    key: ComputerKeyServices | undefined;
};
/** 目录决定配置坐标；手机只能选择路由，不能提供 namespace/path/凭据引用。 */
export declare function readProviderCard(services: Services, route: string, signal: AbortSignal): Promise<{
    provider: {
        provider: string;
        displayName: string;
        settingsNs: string;
        settingsPath: string[];
        active: boolean;
        declared?: boolean | undefined;
        error?: "提供方暂不可用" | undefined;
    };
    configured: boolean;
    keyConfigured: boolean;
}>;
export {};
