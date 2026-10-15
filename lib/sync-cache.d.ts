/** 按设备、授权范围和原请求隔离，重连可复用；插件重启/淘汰后自然发送完整基线。 */
export declare class RemoteSyncCache {
    private readonly entries;
    private bytes;
    prepare(scope: string, endpoint: string, stream: boolean, payload: Record<string, unknown>): {
        payload: {
            [x: string]: unknown;
        };
        encode: (value: unknown) => Promise<unknown>;
    };
}
