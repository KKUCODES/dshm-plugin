import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { credentialKey, credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { labelSchema, tokenSchema } from '@dsh-mobile/protocol'
import { Relay } from './relay.js'
import type { SessionService } from './session-adapter.js'
import type { PluginConfig } from './config.js'
import type { RemoteServices } from './remote-adapter.js'

type Credentials = Pick<CredentialProvider, 'readRecord' | 'modifyRecord' | 'resolve'>
const recordKey = credentialKey('dsh-mobile', 'host')
const savedSchema = z.object({ origin: z.string(), name: labelSchema, hostId: z.uuid(), token: tokenSchema, enabled: z.boolean() }).strict()
const actions = z.discriminatedUnion('action', [
  z.object({ action: z.literal('server-info'), origin: z.string().max(2048) }).strict(),
  z.object({ action: z.literal('setup'), origin: z.string().max(2048), name: labelSchema, enrollmentToken: z.string().max(4096).optional() }).strict(),
  z.object({ action: z.enum(['enable', 'disable', 'pair']) }).strict(),
  z.object({ action: z.enum(['approve', 'revoke']), deviceId: z.uuid() }).strict(),
  z.object({ action: z.literal('management'), deviceId: z.uuid(), enabled: z.boolean() }).strict(),
])
const devicesSchema = z.object({ devices: z.array(z.object({ id: z.uuid(), name: labelSchema, key_thumbprint: z.string(),
  status: z.enum(['pending', 'active', 'revoked']), management: z.boolean().default(false), created_at: z.coerce.date(), expires_at: z.coerce.date() })) })

export class Management {
  private saved?: z.infer<typeof savedSchema>
  private relay: Relay
  private operation: Promise<unknown> = Promise.resolve()
  private disposed = false
  private lifetime = new AbortController()
  constructor(private credentials: Credentials, service: SessionService, private config: PluginConfig, services?: RemoteServices) { this.relay = new Relay(service, services) }
  async initialize() {
    const record = await this.credentials.readRecord(recordKey)
    if (this.disposed) return
    if (record) {
      if (record.kind !== 'grant') throw new Error('invalid_stored_credential')
      this.saved = savedSchema.parse(record.payload)
      this.origin(this.saved.origin)
      if (this.saved.enabled) this.relay.start(this.saved.origin, this.saved.token, this.saved.hostId)
    }
  }
  private origin(raw: string) {
    const url = new URL(raw)
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid_gateway_origin')
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid_gateway_origin')
    return url.origin
  }
  private async api(path: string, token?: string, method = 'GET', body?: unknown, origin = this.saved?.origin): Promise<unknown> {
    if (!origin) throw new Error('not_configured')
    const response = await fetch(origin + path, { method, redirect: 'error',
      signal: AbortSignal.any([this.lifetime.signal, AbortSignal.timeout(15000)]),
      headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .catch((error: unknown) => { throw new Error(error instanceof Error && error.name === 'TimeoutError' ? 'gateway_timeout' : 'gateway_unreachable') })
    if (!response.ok) throw new Error(`gateway_http_${response.status}`)
    // 网关受操作者信任；仍限制管理接口响应，避免异常服务耗尽 Host 内存。
    const reader = response.body?.getReader()
    if (!reader) throw new Error('empty_gateway_response')
    let length = 0; const chunks: Uint8Array[] = []
    for (;;) {
      const item = await reader.read(); if (item.done) break
      length += item.value.byteLength
      if (length > 1024 * 1024) { await reader.cancel(); throw new Error('gateway_response_too_large') }
      chunks.push(item.value)
    }
    return JSON.parse(Buffer.concat(chunks).toString())
  }
  private async save(saved: z.infer<typeof savedSchema>) {
    await this.credentials.modifyRecord(recordKey, async () => ({ kind: 'grant', payload: saved }))
    this.saved = saved
  }
  private async serverInfo(origin: string) {
    try {
      return z.object({ registrationMode: z.enum(['open', 'private']) }).parse(await this.api('/v1/server-info', undefined, 'GET', undefined, origin))
    } catch (error) {
      // 旧版网关只有个人注册；仅明确的 404 才使用兼容模式，网络错误不可当作开放。
      if (error instanceof Error && error.message === 'gateway_http_404') return { registrationMode: 'private' as const }
      throw error
    }
  }
  async status() {
    const saved = this.saved
    if (!saved) return { configured: false, connection: this.relay.state, devices: [] }
    const base = { configured: true, connection: this.relay.state, origin: saved.origin, name: saved.name, hostId: saved.hostId, enabled: saved.enabled }
    try {
      const result = devicesSchema.parse(await this.api('/v1/host/devices', saved.token))
      return { ...base, devices: result.devices.map(device => ({ id: device.id, name: device.name, fingerprint: device.key_thumbprint,
        status: device.status, management: device.management, expiresAt: device.expires_at.toISOString() })) }
    } catch { return { ...base, devices: [], deviceError: '无法读取设备列表，请检查公网服务和电脑凭据。' } }
  }
  private async action(raw: unknown) {
    if (this.disposed) throw new Error('plugin_stopped')
    const input = actions.parse(raw)
    if (input.action === 'server-info') return this.serverInfo(this.origin(input.origin))
    if (input.action === 'setup') {
      if (this.saved) throw new Error('already_configured')
      const origin = this.origin(input.origin)
      // 提交时重新读取后端模式，客户端不能自行选择免密；开放模式不读取或发送注册密钥。
      const { registrationMode } = await this.serverInfo(origin)
      let bootstrap: string | undefined
      if (registrationMode === 'private') {
        bootstrap = input.enrollmentToken?.trim()
        if (!bootstrap) {
          try { bootstrap = (await this.credentials.resolve(credentialRef(this.config.enrollmentRef ?? 'DSH_MOBILE_ENROLLMENT_TOKEN')))?.value }
          catch { throw new Error('enrollment_credential_unavailable') }
        }
        if (!bootstrap) throw new Error('enrollment_credential_missing')
        const checked = tokenSchema.safeParse(bootstrap)
        if (!checked.success) throw new Error('enrollment_credential_invalid')
        bootstrap = checked.data
      }
      const result = z.object({ id: z.uuid(), token: tokenSchema }).parse(await this.api('/v1/hosts', bootstrap, 'POST', { name: input.name }, origin))
      await this.save({ origin, name: input.name, hostId: result.id, token: result.token, enabled: false })
      return { configured: true }
    }
    const saved = this.saved
    if (!saved) throw new Error('not_configured')
    if (input.action === 'enable' || input.action === 'disable') {
      const enabled = input.action === 'enable'
      // 关闭立即生效，即使随后持久化失败，也不能保持外网连接。
      if (!enabled) this.relay.stop()
      await this.save({ ...saved, enabled })
      if (enabled && !this.disposed) this.relay.start(saved.origin, saved.token, saved.hostId)
      return { enabled }
    }
    if (input.action === 'pair') {
      const key = randomBytes(32).toString('base64url')
      await this.api('/v1/host/pairings', saved.token, 'POST', { key })
      // fragment 不进入 HTTP 请求、代理访问日志或 Referer；未来手机端消费后必须清除。
      return { link: saved.origin + '/pair#key=' + key, expiresAt: new Date(Date.now() + 300000).toISOString() }
    }
    if (!('deviceId' in input)) throw new Error('invalid_action')
    await this.api(`/v1/host/devices/${input.deviceId}/${input.action}`, saved.token, 'POST', input.action === 'management' ? { enabled: input.enabled } : {})
    return { updated: true }
  }
  async handle(request: Request): Promise<Response> {
    const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' }
    try {
      if (request.method === 'GET') return Response.json(await this.status(), { headers })
      if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'json_required' }, { status: 415, headers })
      const raw: unknown = await request.json()
      // 桌面多窗口提交按序执行，防止重复注册和启停竞态。
      const next = this.operation.then(() => this.action(raw)); this.operation = next.catch(() => {})
      return Response.json(await next, { headers })
    } catch (error) {
      const message = error instanceof Error && /^[a-z][a-z0-9_]{0,80}$/.test(error.message) ? error.message : 'operation_failed'
      return Response.json({ error: message }, { status: 400, headers })
    }
  }
  dispose() { this.disposed = true; this.lifetime.abort(); this.relay.stop() }
}
