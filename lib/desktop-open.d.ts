import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { Operation } from "./protocol/index.js";
type DesktopOperation = Extract<Operation, {
    method: 'remote.desktop' | 'remote.openFile';
}>;
/** 复用原交付物路由的记录归属、文件权限及真实 Host 路径验证，不开放任意路径或 URL。 */
export declare function desktopOpen(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>, operation: DesktopOperation, signal: AbortSignal): Promise<{
    opened: boolean;
    name?: undefined;
    available?: undefined;
    fileManager?: undefined;
} | {
    name: any;
    available: any;
    fileManager: any;
    opened?: undefined;
}>;
export {};
