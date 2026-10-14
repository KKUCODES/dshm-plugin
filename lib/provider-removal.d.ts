import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import { type ProviderRemovalWrite } from "./protocol/index.js";
type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>;
/** 删除用户层的整个路由；基础层路由和独立凭据不属于此操作。 */
export declare class ProviderRemoval {
    private settings;
    private snapshots;
    constructor(settings: () => Provider | undefined);
    read(owner: string, rawRoute: string): {
        provider: string;
        name: string;
        snapshot: string;
        revision: number;
        writable: boolean;
        removable: boolean;
        removed: boolean;
        keepsCredential: boolean;
        applies: "live" | "restart";
    };
    remove(owner: string, raw: ProviderRemovalWrite, signal: AbortSignal): Promise<{
        removed: boolean;
        removable: boolean;
        writable: boolean;
        provider: string;
        name: string;
        snapshot: string;
        revision: number;
        keepsCredential: boolean;
        applies: "live" | "restart";
    }>;
    dispose(): void;
}
export {};
