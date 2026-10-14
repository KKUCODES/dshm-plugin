import type { TypertGateway } from '@deepseek-ai/dsh-api-gateway/types';
/** 本受限中继通过已有双侧授权后进入进程内 carrier；新版 undefined peer 保持官方 operator 语义。 */
export declare function openGatewayStream(gateway: Pick<TypertGateway, 'wireStream'>, version: string, endpoint: string, payload: unknown, signal: AbortSignal): Promise<AsyncIterable<unknown>>;
