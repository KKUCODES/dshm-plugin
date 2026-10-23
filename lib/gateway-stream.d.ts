import type { TypertGateway } from '@deepseek-ai/dsh-api-gateway/types';
/** 双侧授权后使用官方进程内Peer；不接受手机提交或自行合成身份。 */
export declare function openGatewayStream(gateway: Pick<TypertGateway, 'wireStream'>, version: string, endpoint: string, payload: unknown, signal: AbortSignal, connection?: object): Promise<AsyncIterable<unknown>>;
