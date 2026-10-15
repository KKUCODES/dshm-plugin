import { createHash } from 'node:crypto'

/** HEAD 同样经过原模块注册表；只返回当前资源的内容指纹，不将缓存当作访问许可。 */
export class ResourceValidator {
  private readonly hashes = new Map<string, string>()
  async fetch(request: Request, revision: string, fetchBundle: (request: Request) => Promise<Response>): Promise<Response> {
    const key = JSON.stringify([revision, request.url])
    const response = await fetchBundle(request)
    if (!response.ok) return response
    const cached = this.hashes.get(key)
    if (cached && request.method === 'HEAD') return new Response(null, { status: response.status,
      headers: { ...Object.fromEntries(response.headers), etag: cached } })
    const original = request.method === 'HEAD'
      ? await fetchBundle(new Request(request.url, { signal: request.signal })) : response
    if (!original.ok) return original
    const reader = original.body?.getReader(), chunks: Uint8Array[] = []
    let length = 0
    try {
      while (reader) {
        request.signal.throwIfAborted()
        const item = await reader.read(); if (item.done) break
        length += item.value.byteLength
        if (length > 64 * 1024 * 1024) throw Error('remote_resource_too_large')
        chunks.push(item.value)
      }
    } finally { await reader?.cancel(); reader?.releaseLock() }
    const bytes = Buffer.concat(chunks, length)
    const etag = `"sha256-${createHash('sha256').update(bytes).digest('hex')}"`
    this.hashes.set(key, etag)
    while (this.hashes.size > 256) this.hashes.delete(this.hashes.keys().next().value!)
    return new Response(request.method === 'HEAD' ? null : bytes, { status: original.status,
      headers: { ...Object.fromEntries(original.headers), 'content-length': String(length), etag } })
  }
}
