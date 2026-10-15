import { SYNC_CACHE_FIELD, SYNC_CACHE_LIMIT, syncCacheEndpoint, syncHash, syncDelta,
  type SyncEnvelope, type SyncHint } from '@dsh-mobile/protocol'

/** 按设备、授权范围和原请求隔离，重连可复用；插件重启/淘汰后自然发送完整基线。 */
export class RemoteSyncCache {
  private readonly entries = new Map<string, { text: string; hash: string; at: number }>()
  private bytes = 0
  prepare(scope: string, endpoint: string, stream: boolean, payload: Record<string, unknown>) {
    const { [SYNC_CACHE_FIELD]: raw, ...original } = payload
    if (raw === undefined) return { payload: original, encode: async (value: unknown) => value }
    const hint = raw as SyncHint
    if (!syncCacheEndpoint(endpoint, stream) || !hint || typeof hint !== 'object' || Array.isArray(hint)
      || hint.version !== 1 || Object.keys(hint).some(key => !['version', 'hash'].includes(key))
      || (hint.hash !== undefined && !/^[a-f0-9]{64}$/.test(hint.hash))) throw Error('invalid_sync_cache_hint')
    const key = JSON.stringify([scope, endpoint, original])
    const previous = this.entries.get(key)
    const base = previous && previous.hash === hint.hash && Date.now() - previous.at < 7 * 86400000 ? previous : undefined
    return { payload: original, encode: async (value: unknown) => {
      const text = JSON.stringify(value)
      if (Buffer.byteLength(text) > SYNC_CACHE_LIMIT) return value
      const hash = await syncHash(text)
      let result: SyncEnvelope = { _dshmSync: 1, hash, value }
      if (base) {
        try {
          const compact: SyncEnvelope = { _dshmSync: 1, hash, base: base.hash, delta: syncDelta(JSON.parse(text), JSON.parse(base.text)) }
          if (JSON.stringify(compact).length < JSON.stringify(result).length) result = compact
        } catch { /* 超复杂结构保留原完整结果，不改变业务读取。 */ }
      }
      const old = this.entries.get(key)
      if (old) this.bytes -= Buffer.byteLength(old.text)
      this.entries.delete(key)
      this.entries.set(key, { text, hash, at: Date.now() }); this.bytes += Buffer.byteLength(text)
      while (this.entries.size > 128 || this.bytes > 32 * 1024 * 1024) {
        const first = this.entries.keys().next().value!
        this.bytes -= Buffer.byteLength(this.entries.get(first)!.text); this.entries.delete(first)
      }
      return result
    } }
  }
}
