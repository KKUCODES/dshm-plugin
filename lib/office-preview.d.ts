import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import { type HostFrame } from "./protocol/index.js";
import type { ResourceWindow } from './resource-window.js';
/** 固定调用原转换服务，保留 Session lookup 和 Host 文件权限；完整 PDF 不进入网关 JSON 帧。 */
export declare function streamOffice(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>, id: string, sessionId: string, path: string, signal: AbortSignal, window: ResourceWindow, emit: (frame: HostFrame) => void, priority?: 'foreground' | 'background', version?: string): Promise<void>;
