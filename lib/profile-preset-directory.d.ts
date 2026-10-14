import type { PresetDirectoryService } from './preset-directory.js';
export interface ProfilePresetEntry {
    readonly options: {
        readonly id: string;
        readonly name: string;
        readonly config?: unknown;
    };
    readonly fiber?: {
        readonly state: number;
    };
}
export interface ProfilePresetEditor {
    readonly documentPath: string;
    entries(): readonly ProfilePresetEntry[];
}
export interface ProfilePresetServices {
    presets: PresetDirectoryService;
    editor: ProfilePresetEditor;
}
/** 新版声明没有独立预设文件；返回原配置编辑器的保存位置，不冒充声明的来源文件。 */
export declare function profilePresetDirectory(services: () => ProfilePresetServices | undefined, id: string, signal: AbortSignal): Promise<{
    opened: false;
    path: string;
    documentPath: string;
}>;
