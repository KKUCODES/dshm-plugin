/** 仅压缩已由原 Host 读取的只读结果；缓存引用不是授权，也不能生成业务事件。 */
export declare const SYNC_CACHE_FIELD = "_dshmSync";
export declare const SYNC_CACHE_LIMIT: number;
export declare const syncCacheEndpoint: (endpoint: string, stream: boolean) => boolean;
export interface SyncHint {
    version: 1;
    hash?: string;
}
type Path = Array<string | number>;
type Delta = [0, unknown] | [1, Path] | [2, Array<[string, Delta]>] | [3, Delta[]];
export interface SyncEnvelope {
    _dshmSync: 1;
    hash: string;
    base?: string;
    value?: unknown;
    delta?: Delta;
}
export declare function syncHash(text: string): Promise<string>;
/** 结构引用可复用移动后的历史记录，避免固定字节分块因新增消息整体错位。 */
export declare function syncDelta(value: unknown, base: unknown): Delta;
export declare function applySyncDelta(delta: Delta, base: unknown): unknown;
export {};
