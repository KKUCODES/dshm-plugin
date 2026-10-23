import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'

type Connection = Pick<HostConnectionHandle, 'createSharedFetchHandler'>

/** 读取官方进程内身份；不合成owner对象，也不接受手机提供身份。 */
export function connectionPeer(connection: object): unknown {
  return 'browserPeer' in connection ? Reflect.get(connection, 'browserPeer')
    : 'operator' in connection ? Reflect.get(connection, 'operator') : undefined
}

/** 新版Fetch显式接收Peer；旧版保持原调用。外层配对、管理权限和端点名单仍先行核验。 */
export function connectionFetch(connection: Connection, request: Request): Promise<Response> {
  const handler = connection.createSharedFetchHandler('/api'), peer = connectionPeer(connection)
  if (handler.fetch.length >= 2 && !peer) throw Error('unsupported_dsh_capabilities')
  return Reflect.apply(handler.fetch, handler, peer === undefined ? [request] : [request, peer])
}
