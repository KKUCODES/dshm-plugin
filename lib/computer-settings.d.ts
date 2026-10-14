import type { SettingsAccess as SettingsProvider } from './settings-access.js';
import { pluginSettingValues, type ComputerSettingsWrite } from "./protocol/index.js";
type Namespace = 'llm-deepseek' | keyof typeof pluginSettingValues;
type Provider = Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'>;
/** 原服务负责校验、持久化和广播；此边界仅缩小可编辑字段及返回值。 */
export declare class ComputerSettings {
    private provider;
    private snapshots;
    constructor(provider: () => Provider | undefined);
    read(owner: string, namespace?: Namespace): {
        applies: string;
        fields: {
            overridden: boolean;
            base?: unknown;
            user?: unknown;
            value?: any;
            key: string;
        }[];
        documentId?: string | undefined;
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        namespace: Namespace;
        revision: number;
        writable: boolean;
    };
    write(owner: string, raw: ComputerSettingsWrite, signal: AbortSignal): Promise<{
        applies: string;
        fields: {
            overridden: boolean;
            base?: unknown;
            user?: unknown;
            value?: any;
            key: string;
        }[];
        documentId?: string | undefined;
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        namespace: Namespace;
        revision: number;
        writable: boolean;
    }>;
    private safeReadError;
    dispose(): void;
}
export {};
