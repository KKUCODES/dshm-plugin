import { isProfileDshVersion } from './profile-dsh-version.js'
import type { TypertGateway } from '@deepseek-ai/dsh-api-gateway/types'

type LegacyWireStream = {
  open(endpoint: string, payload: unknown, signal: AbortSignal): Promise<AsyncIterable<unknown>>
}
type ProfileWireStream = {
  open(endpoint: string, payload: unknown, uplink: AsyncIterable<unknown>, peer: undefined, signal: AbortSignal): Promise<AsyncIterable<unknown>>
}

/** 本受限中继通过已有双侧授权后进入进程内 carrier；新版 undefined peer 保持官方 operator 语义。 */
export function openGatewayStream(gateway: Pick<TypertGateway, 'wireStream'>, version: string,
  endpoint: string, payload: unknown, signal: AbortSignal) {
  signal.throwIfAborted()
  if (isProfileDshVersion(version)) {
    // 当前协议只有 Host→Client 流；显式结束 uplink，不能把 signal 错传为输入流。
    const uplink = (async function* () {})()
    return (gateway.wireStream as unknown as ProfileWireStream).open(endpoint, payload, uplink, undefined, signal)
  }
  if (version === '0.1.6-alpha.2') return (gateway.wireStream as unknown as LegacyWireStream).open(endpoint, payload, signal)
  throw new Error('unsupported_dsh_version')
}
