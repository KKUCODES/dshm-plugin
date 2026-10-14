import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import type { ProviderDirectory } from './provider-creation.js';
import type { ComputerKeyServices } from './computer-key.js';
type Services = {
    settings: () => Pick<SettingsProvider, 'get' | 'describe' | 'writable'> | undefined;
    directory: () => ProviderDirectory | undefined;
    key: ComputerKeyServices | undefined;
    accountAvailable?: (signal: AbortSignal) => Promise<boolean>;
};
type Result = {
    kind: 'provider-ready' | 'adapter-absent' | 'credential-missing' | 'unavailable';
};
/** 对齐原ModelsSettingsStore/providerUsable：任何活跃且满足其认证方式的路由都可结束引导。 */
export declare function readModelReadiness(services: Services, signal: AbortSignal): Promise<Result>;
export {};
