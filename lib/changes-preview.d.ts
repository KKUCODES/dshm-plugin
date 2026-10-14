import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import { type HostFrame, type Operation } from "./protocol/index.js";
import type { ResourceWindow } from './resource-window.js';
/** 仅路由到原只读差异接口，路径/快照 ID 由电脑服务解析，不接受手机指定。 */
export declare function streamChanges(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>, id: string, operation: Extract<Operation, {
    method: 'remote.changes';
}>, signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void): Promise<void>;
