/** 新版字节读取把 range 收进 options；自有读取器仍使用已有的有界 range 契约。 */
export declare function workspaceFilePayload(version: string, endpoint: string, payload: Record<string, unknown>): Record<string, unknown>;
/** 原文件读取只允许固定64KiB字节窗，不做通用附件解包。 */
export declare function workspaceFileResponse(response: Response, rpcId: string, signal: AbortSignal): Promise<any>;
/** 仅供固定Office转换流；保留现行PDF上限，不放宽普通文件读取。 */
export declare function officeFileResponse(response: Response, rpcId: string, signal: AbortSignal): Promise<any>;
