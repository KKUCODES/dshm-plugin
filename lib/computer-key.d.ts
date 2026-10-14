import { type CredentialProvider } from '@deepseek-ai/dsh-credentials';
import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import { type ComputerKeyWrite } from "./protocol/index.js";
type Provider = Pick<CredentialProvider, 'describe' | 'set' | 'unset'>;
export interface ComputerKeyServices {
    credentials: () => Provider | undefined;
    settings: () => Pick<SettingsProvider, 'get'> | undefined;
    revision: () => number;
    enrollmentRef: string;
}
type Target = ComputerKeyWrite['target'];
/** 只写凭据服务；不调用 resolve，不返回来源或 provider 的错误文本。 */
export declare class ComputerKey {
    private services;
    private target?;
    private snapshots;
    private busy;
    constructor(services: ComputerKeyServices, target?: "web-search-deepseek" | undefined);
    private current;
    read(owner: string, rawTarget?: Target): Promise<{
        configured: boolean;
        writable: boolean;
        target?: {
            provider: string;
        } | undefined;
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        provider: string;
    }>;
    write(owner: string, raw: ComputerKeyWrite, signal: AbortSignal): Promise<{
        configured: boolean;
        writable: boolean;
        target?: {
            provider: string;
        } | undefined;
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        provider: string;
    }>;
    dispose(): void;
}
export {};
