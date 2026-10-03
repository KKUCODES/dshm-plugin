import WebSocket from 'ws'
import { MAX_FRAME_BYTES } from '@dsh-mobile/protocol'
import { SessionAdapter, type SessionService } from './session-adapter.js'
import { RemoteAdapter, type RemoteServices } from './remote-adapter.js'
import { PluginOperations } from './plugin-operations.js'

export type ConnectionState = 'disabled' | 'connecting' | 'online' | 'reconnecting' | 'credential_rejected'
/** 每次重连重建订阅上下文；绝不自动重发用户的 prompt。 */
export class Relay {
  private socket?: WebSocket
  private retry?: NodeJS.Timeout
  private heartbeat?: NodeJS.Timeout
  private adapter?: SessionAdapter
  private remote?: RemoteAdapter
  private stopped = true
  private attempts = 0
  state: ConnectionState = 'disabled'
  private pluginOperations?: PluginOperations
  constructor(private service: SessionService, private services?: RemoteServices) {
    if (services) this.pluginOperations = new PluginOperations(services.connection)
  }
  start(origin: string, token: string, hostId?: string) {
    this.stop(); this.stopped = false; this.attempts = 0
    const connect = () => {
      if (this.stopped) return
      this.state = this.attempts ? 'reconnecting' : 'connecting'
      const url = new URL('/v1/host/socket', origin); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      if (this.services && hostId) url.searchParams.set('transport', '2')
      const socket = new WebSocket(url, { headers: { authorization: `Bearer ${token}` }, maxPayload: MAX_FRAME_BYTES,
        perMessageDeflate: false, followRedirects: false, handshakeTimeout: 10000 })
      this.socket = socket
      const adapter = new SessionAdapter(this.service); this.adapter = adapter
      const remote = this.services && hostId ? new RemoteAdapter(this.services, hostId, this.pluginOperations) : undefined
      this.remote = remote
      let alive = true, rejected = false
      socket.on('open', () => {
        this.state = 'online'; this.attempts = 0
        this.heartbeat = setInterval(() => {
          if (!alive) { socket.terminate(); return }
          alive = false; socket.ping()
        }, 20000); this.heartbeat.unref()
      })
      socket.on('pong', () => { alive = true })
      socket.on('message', (raw, binary) => {
        if (binary) { socket.close(1008, 'invalid_frame'); return }
        try {
          const message = JSON.parse(raw.toString())
          if (message.type === 'cancel') void remote?.receive(message, () => {})
          const handler = ['ack', 'uploadChunk', 'uploadEnd'].includes(message.type) || message.operation?.method?.startsWith('remote.') ? remote : adapter
          if (!handler) { socket.send(JSON.stringify({ type: 'error', id: message.id, code: 'remote_transport_unavailable' })); return }
          void handler.receive(message, frame => {
            if (socket.readyState !== WebSocket.OPEN) return
            let payload = JSON.stringify(frame)
            if (Buffer.byteLength(payload) > MAX_FRAME_BYTES) payload = JSON.stringify({ type: 'error', id: frame.id, code: 'response_too_large' })
            if (socket.bufferedAmount > MAX_FRAME_BYTES * 2) { socket.close(1009, 'slow_gateway'); return }
            socket.send(payload)
          }).catch(() => socket.close(1008, 'invalid_request'))
        } catch { socket.close(1008, 'invalid_frame') }
      })
      socket.on('unexpected-response', (_request, response) => {
        rejected = response.statusCode === 401 || response.statusCode === 403
        response.resume(); socket.terminate()
      })
      socket.on('error', () => {})
      socket.on('close', (code) => {
        adapter.dispose()
        remote?.dispose()
        if (this.socket !== socket) return
        clearInterval(this.heartbeat)
        if (this.stopped) return
        // 重复 Host 实例不得无限互踢；需要桌面显式重连。
        if (rejected || code === 4001) { this.state = 'credential_rejected'; return }
        this.state = 'reconnecting'
        const delay = Math.min(30000, 500 * 2 ** Math.min(this.attempts++, 6)) + Math.random() * 500
        this.retry = setTimeout(connect, delay); this.retry.unref()
      })
    }
    connect()
  }
  stop() {
    this.stopped = true; clearTimeout(this.retry); clearInterval(this.heartbeat)
    this.adapter?.dispose(); this.socket?.terminate(); this.socket = undefined; this.state = 'disabled'
    this.remote?.dispose()
  }
}
