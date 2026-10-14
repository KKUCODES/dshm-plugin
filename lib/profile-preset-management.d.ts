import { type PresetCopy, type PresetDelete } from "./protocol/index.js";
import type { ProfilePresetServices } from './profile-preset-directory.js';
type Profile = {
    dir: string;
    patchPath: string;
    installAnchor: string;
};
interface NativeContext {
    root: unknown;
    get(name: 'profileContext'): Profile | undefined;
    get(name: 'hmr'): {
        runExclusive<T>(run: () => Promise<T>): Promise<T>;
    } | undefined;
    get(name: 'loader'): {
        internal?: {
            import(name: string, parentURL: string, attributes: Record<string, string>): Promise<any>;
        };
    } | undefined;
}
/** 固定新版原 profile 的预设声明操作；手机不提供 YAML、模块名、插件配置或磁盘路径。 */
export declare class ProfilePresetManagement {
    private ctx;
    private services;
    private readonly boot;
    private readonly atomic;
    private readonly yaml;
    private readonly parse;
    private snapshots;
    private closed;
    private constructor();
    static create(ctx: NativeContext, services: () => ProfilePresetServices | undefined): Promise<ProfilePresetManagement>;
    private state;
    read(owner: string, raw: string, signal: AbortSignal): Promise<{
        defaultAfterDelete?: string | undefined;
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        preset: string;
        canCopy: boolean;
        canDelete: boolean;
    }>;
    write(owner: string, raw: PresetCopy | PresetDelete, signal: AbortSignal): Promise<{
        preset: string;
        copied: boolean;
        deleted: boolean;
    }>;
    dispose(): void;
}
export {};
