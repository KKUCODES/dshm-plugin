import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
/** 保存同一电脑运行期间的有界结果；断线只停止读取，不重复提交已接受的包操作。 */
export declare class PluginOperations {
    private connection;
    private now;
    readonly generation: `${string}-${string}-${string}-${string}-${string}`;
    private entries;
    constructor(connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>, now?: () => number);
    private prune;
    private checkGeneration;
    private summary;
    list(owner: string): {
        generation: `${string}-${string}-${string}-${string}-${string}`;
        items: {
            id: string;
            endpoint: string;
            target: string;
            requestId: string | undefined;
            startedAt: number;
            finishedAt: number | undefined;
            state: string;
            ok: unknown;
            application: unknown;
        }[];
    };
    read(owner: string, generation: string, id: string): {
        result: Record<string, unknown> | undefined;
        error: string | undefined;
        id: string;
        endpoint: string;
        target: string;
        requestId: string | undefined;
        startedAt: number;
        finishedAt: number | undefined;
        state: string;
        ok: unknown;
        application: unknown;
    };
    start(owner: string, generation: string, id: string, endpoint: string, payload: Record<string, unknown>): {
        id: string;
        endpoint: string;
        target: string;
        requestId: string | undefined;
        startedAt: number;
        finishedAt: number | undefined;
        state: string;
        ok: unknown;
        application: unknown;
    };
    private execute;
}
