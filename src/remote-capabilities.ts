import type { RemoteServices } from './remote-adapter.js'

/** 版本范围并不保证服务已启用；协商前核验真实服务方法和模块图。 */
export function assertRemoteServices(services: RemoteServices): void {
  if (typeof services.connection?.createSharedFetchHandler !== 'function'
    || typeof services.gateway?.wireStream?.open !== 'function'
    || typeof services.modules?.graph !== 'function'
    || typeof services.modules?.fetchBundle !== 'function'
    || typeof services.modules?.onGraphChanged !== 'function') throw Error('unsupported_dsh_capabilities')
  const graph = services.modules.graph()
  if (!graph || !Array.isArray(graph.entries) || !Array.isArray(graph.batches)
    || !graph.batches.some(batch => batch?.phase === 'bootstrap' && Array.isArray(batch.entries) && batch.entries.includes('@deepseek-ai/dsh-client-modules'))
    || !graph.entries.some(row => row?.id === '@deepseek-ai/dsh-api-remotes')) throw Error('unsupported_dsh_capabilities')
}
