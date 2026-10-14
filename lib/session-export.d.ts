import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import { type HostFrame, type Operation } from "./protocol/index.js";
import type { ResourceWindow } from './resource-window.js';
/** ZIP 内容与快照语义全部来自原 DSH 导出路由；手机不能指定路径或 URL。 */
export declare function streamSessionExport(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>, id: string, operation: Extract<Operation, {
    method: 'remote.sessionExport';
}>, signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void): Promise<void>;
