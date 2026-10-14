import type { Context } from '@deepseek-ai/cordis';
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { Operation } from "./protocol/index.js";
export interface WorkspaceDesktopServices {
    fs: Pick<Context['fs'], 'processPathFromHostPath' | 'processPath' | 'resolve'>;
    sessions: Pick<Context['sessionController'], 'workspaceDesktop' | 'openWorkspacePath'>;
}
type Prepare = Extract<Operation, {
    method: 'remote.prepareDesktopFile';
}>;
type Open = Extract<Operation, {
    method: 'remote.openDesktopFile';
}>;
/** 路径仅作选择器；原 Session lookup/文件服务授权，一次性快照绑定已鉴权的设备连接。 */
export declare class WorkspaceDesktop {
    private connection;
    private provider;
    private snapshots;
    constructor(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>, provider: () => WorkspaceDesktopServices | undefined);
    private stat;
    private verify;
    prepare(owner: string, operation: Prepare, signal: AbortSignal): Promise<{
        snapshot: `${string}-${string}-${string}-${string}-${string}`;
        fileName: string;
        name: string;
        available: boolean;
        fileManager: "finder" | "explorer" | "directory" | null;
    }>;
    open(owner: string, operation: Open, signal: AbortSignal): Promise<{
        opened: boolean;
    }>;
    dispose(): void;
}
export {};
