import type { SettingsDescriptor, SettingsDescribeOptions, SettingsPathOp } from '@deepseek-ai/dsh-settings';
export type SettingsView = Omit<SettingsDescriptor, 'applies'> & {
    applies: 'live' | 'restart';
    documentId?: string;
};
/** Remote 所需的最小设置契约；旧 namespace 服务和新版 profile 表单各自适配。 */
export interface SettingsAccess {
    readonly writable: boolean;
    describe(options?: SettingsDescribeOptions): SettingsView[];
    get(namespace: string): unknown;
    mutate(namespace: string, edits: readonly SettingsPathOp[], expectedRevision?: number): Promise<void>;
}
