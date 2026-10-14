/** 兼容服务只供 Host 使用，页面不能取得句柄或指定所属连接。 */
export interface CordisInspectService {
    readonly dshmClientManifestScopesVersion: 1;
    createClientManifestScope(): {
        run<T>(callback: () => T): T;
        dispose(): void;
    };
}
export declare function cordisInspectService(value: unknown, runner: unknown): CordisInspectService | undefined;
/** 生命周期来自已鉴权连接的原 $events；重新订阅取代旧代，旧清理不影响新代。 */
export declare class CordisConnections {
    private readonly current;
    private readonly bindings;
    constructor(current: () => CordisInspectService | undefined);
    get available(): boolean;
    attach(owner: string): () => void;
    run<T>(owner: string, signal: AbortSignal, callback: () => Promise<T>): Promise<T>;
    private close;
    dispose(): void;
}
