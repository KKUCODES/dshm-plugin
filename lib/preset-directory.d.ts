/** 旧版 resolve 有用户文件坐标，新版仅有身份/故障信息；缺少坐标时不能猜路径。 */
export interface PresetDirectoryService {
    resolve(id: string): Promise<{
        id: string;
        trust?: string;
        path?: string;
    }>;
}
/** 手机只展示原Host解析的用户预设位置，不能因复制后的自动调用启动电脑文件管理器。 */
export declare function presetDirectory(service: () => PresetDirectoryService | undefined, id: string, signal: AbortSignal): Promise<{
    opened: false;
    path: string;
}>;
