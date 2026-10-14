import type { SettingsDescribeOptions, SettingsDescriptor, SettingsPathOp } from '@deepseek-ai/dsh-settings';
import type { SettingsAccess, SettingsView } from './settings-access.js';
export interface ProfileSettingsForms {
    readonly writable: boolean;
    describe(options?: SettingsDescribeOptions): SettingsDescriptor[];
    mutate(entryId: string, edits: readonly SettingsPathOp[], expectedRevision?: number): Promise<void>;
}
export interface ProfileSettingsEntry {
    readonly options: {
        readonly id: string;
        readonly name: string;
    };
}
/** 将已核验的新版插件实例映射到 Remote 固定 namespace，写入仍交给原表单服务。 */
export declare class ProfileSettings implements SettingsAccess {
    private readonly forms;
    private readonly entries;
    private readonly values;
    constructor(forms: ProfileSettingsForms, entries: () => readonly ProfileSettingsEntry[]);
    get writable(): boolean;
    entryId(namespace: string): string | undefined;
    namespaceOf(entryId: string): string | undefined;
    private bindings;
    describe(options?: SettingsDescribeOptions): SettingsView[];
    get(namespace: string): unknown;
    mutate(namespace: string, edits: readonly SettingsPathOp[], expectedRevision?: number): Promise<void>;
}
