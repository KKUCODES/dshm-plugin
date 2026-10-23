import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
type Connection = Pick<HostConnectionHandle, 'createSharedFetchHandler'>;
/** 读取官方进程内身份；不合成owner对象，也不接受手机提供身份。 */
export declare function connectionPeer(connection: object): unknown;
/** 新版Fetch显式接收Peer；旧版保持原调用。外层配对、管理权限和端点名单仍先行核验。 */
export declare function connectionFetch(connection: Connection, request: Request): Promise<Response>;
export {};
