import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { useCallback, useEffect, useId, useState } from 'react'
import { panelStyles } from './styles.js'
import { PairCard } from './pair-card.js'
import { registerDesktopFeedbackSync } from './feedback-sync-slot.js'

interface Device { id: string; name: string; fingerprint: string; status: 'pending' | 'active' | 'revoked'; management: boolean; expiresAt: string }
interface Status { configured: boolean; connection: string; enabled?: boolean; origin?: string; name?: string; devices: Device[]; deviceError?: string }
interface ServerInfo { registrationMode: 'open' | 'private' }
const stateLabels: Record<string, string> = { disabled: '已关闭', connecting: '正在连接', online: '已连接', reconnecting: '正在重连', credential_rejected: '凭据被拒绝或电脑连接重复' }
const errors: Record<string, string> = {
  enrollment_credential_missing: '请填写注册密钥，使用后端 ENROLLMENT_TOKEN 的值。',
  enrollment_credential_invalid: '注册密钥格式不正确，请粘贴后端 ENROLLMENT_TOKEN 的完整值（43 位字母、数字、下划线或连字符）。',
  enrollment_credential_unavailable: '无法读取本机注册凭据，请在下方直接填写注册密钥。',
  gateway_unreachable: '无法连接后端，请检查服务地址及后端是否正在运行。',
  gateway_timeout: '连接后端超时，请检查网络后重试。',
  invalid_gateway_origin: '请输入 HTTP 或 HTTPS 服务根地址，不含路径、账号、查询参数或片段。',
  already_configured: '这台电脑已经完成注册。', gateway_http_401: '服务拒绝了凭据；首次注册时，请确认注册密钥与后端 ENROLLMENT_TOKEN 一致。',
  gateway_http_404: '设备状态已变化，请刷新后重试。',
}
async function api<T>(body?: unknown): Promise<T> {
  const response = await fetch('/api/dsh-mobile', { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) })
  const data = await response.json()
  if (!response.ok) throw new Error(errors[data.error] ?? '操作失败，请检查电脑连接和公网服务后重试。')
  return data as T
}
function ManagementPanel() {
  const fieldId = useId()
  const [status, setStatus] = useState<Status>(), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [pollError, setPollError] = useState('')
  const [enrollmentToken, setEnrollmentToken] = useState('')
  const [origin, setOrigin] = useState(''), [name, setName] = useState('我的电脑'), [confirmed, setConfirmed] = useState<string>()
  const [server, setServer] = useState<{ origin: string; info?: ServerInfo; error?: string }>()
  const [modeAttempt, setModeAttempt] = useState(0)
  const mode = server?.origin === origin.trim() ? server.info?.registrationMode : undefined
  const [pair, setPair] = useState<{ link: string; expiresAt: string }>()
  const [grantDevice, setGrantDevice] = useState<string>()
  const refresh = useCallback(async () => {
    try { setStatus(await api<Status>()); setPollError('') }
    catch (e) { setPollError(e instanceof Error ? e.message : '无法读取状态') }
  }, [])
  useEffect(() => { if (status?.configured) setEnrollmentToken('') }, [status?.configured])
  useEffect(() => {
    if (status?.configured || !origin.trim()) return
    let active = true
    setServer(undefined)
    const address = origin.trim()
    const timer = setTimeout(() => {
      void api<ServerInfo>({ action: 'server-info', origin: address }).then(info => {
        if (active) { setServer({ origin: address, info }); if (info.registrationMode === 'open') setEnrollmentToken('') }
      }).catch(e => { if (active) setServer({ origin: address, error: e instanceof Error ? e.message : '无法读取服务模式' }) })
    }, 400)
    return () => { active = false; clearTimeout(timer) }
  }, [origin, status?.configured, modeAttempt])
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try { const value = await api<Status>(); if (active) { setStatus(value); setPollError('') } }
      catch (e) { if (active) setPollError(e instanceof Error ? e.message : '无法读取状态') }
      if (active) timer = setTimeout(() => { void poll() }, 5000)
    }
    void poll(); return () => { active = false; clearTimeout(timer) }
  }, [])
  useEffect(() => {
    if (!pair) return
    const timer = setTimeout(() => setPair(undefined), Math.max(0, Date.parse(pair.expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [pair])
  async function act(body: { action: string; [key: string]: unknown }) {
    setBusy(true); setError('')
    try {
      const result = await api<{ link: string; expiresAt: string }>(body)
      if (body.action === 'setup') setEnrollmentToken('')
      if (body.action === 'pair') setPair(result)
      if (body.action === 'approve' || body.action === 'revoke') { setConfirmed(undefined); setPair(undefined) }
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); if (body.action === 'setup') setModeAttempt(value => value + 1) }
    finally { setBusy(false) }
  }
  const insecure = /^http:/i.test((status?.configured ? status.origin ?? '' : origin).trim())
  return <section className="dshm" aria-label="DSH Mobile 电脑连接" aria-busy={busy}>
    <style>{panelStyles}</style>
    <header className="dm-head">
      <div><h2>远程连接</h2><p className="dm-intro">让已批准的设备查看任务、阅读聊天并继续会话。使用时请保持电脑和 dsh 运行。</p></div>
      <span className="dm-status" data-state={pollError ? 'credential_rejected' : status?.connection} role="status">
        {pollError ? '状态读取失败' : status ? stateLabels[status.connection] ?? '未知状态' : '读取状态中'}
      </span>
    </header>
    {(error || pollError) && <p className="dm-notice dm-notice-error" role="alert">{error || pollError}</p>}
    {insecure && <aside className="dm-notice" role="status">
      <strong>HTTP 连接不安全</strong>连接未加密，凭据和聊天内容可能被窃听或篡改。你仍可继续连接，建议使用 HTTPS。
    </aside>}
    {!status ? <div className="dm-loading" aria-label="正在读取连接状态"><div className="dm-skeleton" /><div className="dm-skeleton" /></div> : <>
      {!status.configured ? <form className="dm-form" onSubmit={event => { event.preventDefault(); if (mode) void act({ action: 'setup', origin: origin.trim(), name, ...(mode === 'private' && enrollmentToken.trim() ? { enrollmentToken: enrollmentToken.trim() } : {}) }) }}>
        <div className="dm-fields">
          <div className="dm-field">
            <label className="dm-label" htmlFor={fieldId + '-origin'}>服务地址</label>
            <input className="dm-input" id={fieldId + '-origin'} aria-describedby={fieldId + '-origin-help'} required disabled={busy} type="url" placeholder="https://relay.example.com" value={origin} onChange={e => { setOrigin(e.target.value); setServer(undefined); setEnrollmentToken('') }} />
            <p className="dm-help" id={fieldId + '-origin-help'}>支持 HTTP / HTTPS，填写根地址即可。</p>
          </div>
          <div className="dm-field">
            <label className="dm-label" htmlFor={fieldId + '-name'}>电脑名称</label>
            <input className="dm-input" id={fieldId + '-name'} required disabled={busy} maxLength={80} value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>
        <div className="dm-note" role="status">
          {mode === 'open' ? '开放使用 · 无需注册密钥，可直接注册这台电脑。' : mode === 'private' ? '个人使用 · 需要注册密钥，或使用本机已配置的注册凭据。' : server?.error ? <>{server.error} <button className="dm-button" type="button" onClick={() => setModeAttempt(value => value + 1)}>重新检测</button></> : origin.trim() ? '正在检测服务模式…' : '填写服务地址后，将自动检测注册方式。'}
        </div>
        {mode === 'private' && <div className="dm-field">
          <label className="dm-label" htmlFor={fieldId + '-enrollment'}>注册密钥</label>
          <input className="dm-input" id={fieldId + '-enrollment'} aria-describedby={fieldId + '-enrollment-help'} type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" disabled={busy} maxLength={256} placeholder="粘贴后端 ENROLLMENT_TOKEN" value={enrollmentToken} onChange={e => setEnrollmentToken(e.target.value)} />
          <p className="dm-help" id={fieldId + '-enrollment-help'}>仅首次注册使用，成功后清空。留空时尝试读取本机已配置的注册凭据。</p>
        </div>}
        <p className="dm-note">注册成功后，插件会保存这台电脑的独立凭据。之后正常启动 dsh 即可，无需再次填写注册密钥。</p>
        <div className="dm-actions"><button className="dm-button dm-primary" disabled={busy || !mode} type="submit">{busy ? '正在注册…' : '注册这台电脑'}</button></div>
      </form> : <>
        <div className="dm-connection">
          <div><h3>{status.name}</h3><p className="dm-address">{status.origin}</p></div>
          <div className="dm-actions">
            <button className={'dm-button' + (status.enabled ? '' : ' dm-primary')} disabled={busy} onClick={() => void act({ action: status.enabled ? 'disable' : 'enable' })}>{status.enabled ? '关闭远程连接' : '开启远程连接'}</button>
            {status.enabled && status.connection !== 'online' && <button className="dm-button" disabled={busy} onClick={() => void act({ action: 'enable' })}>重新连接</button>}
            <button className="dm-button" disabled={busy} onClick={() => void act({ action: 'pair' })}>生成一次性配对链接</button>
            {busy && <span className="dm-help" role="status">正在处理…</span>}
          </div>
        </div>
        {pair && <PairCard key={pair.link} link={pair.link} onHide={() => setPair(undefined)} />}
        <div className="dm-section">
        <div className="dm-section-head"><h3>绑定设备</h3><span className="dm-count">{status.devices.length} 台设备</span></div>
        {status.deviceError ? <p className="dm-notice dm-notice-error" role="alert">{status.deviceError}</p> : status.devices.length === 0 ? <div className="dm-empty"><strong>暂无绑定设备</strong><p>设备领取配对链接后，会出现在这里等待你的批准。</p></div> : <div>{status.devices.map(device => <article className="dm-device" key={device.id}>
          <div className="dm-device-head"><strong className="dm-device-name">{device.name}</strong><span className="dm-tag" data-state={device.status}>{{ pending: '等待批准', active: '已批准', revoked: '已撤销' }[device.status]}</span></div>
          <div className="dm-fingerprint"><p className="dm-help">设备公钥指纹</p><code>{device.fingerprint}</code></div>
          <p className="dm-help">凭据到期：{new Date(device.expiresAt).toLocaleString()}</p>
          {device.status === 'active' && <p className="dm-help">权限：{device.management ? '聊天与电脑管理' : '聊天与任务操作'}</p>}
          {device.status === 'pending' && <>
            <label className="dm-check"><input type="checkbox" disabled={busy} checked={confirmed === device.id} onChange={e => setConfirmed(e.target.checked ? device.id : undefined)} />我已核对设备公钥指纹</label>
          </>}
          <div className="dm-actions">
            {device.status === 'pending' && <button className="dm-button dm-primary" disabled={busy || confirmed !== device.id} onClick={() => void act({ action: 'approve', deviceId: device.id })}>批准设备</button>}
            {device.status !== 'revoked' && <button className="dm-button dm-danger" disabled={busy} onClick={() => void act({ action: 'revoke', deviceId: device.id })}>{device.status === 'pending' ? '拒绝' : '撤销访问'}</button>}
            {device.status === 'active' && <button className="dm-button" disabled={busy} onClick={() => device.management ? void act({ action: 'management', deviceId: device.id, enabled: false }) : setGrantDevice(device.id)}>{device.management ? '收回管理权限' : '授予管理权限'}</button>}
          </div>
          {device.status === 'active' && !device.management && grantDevice === device.id && <aside className="dm-notice" role="alert">
            <strong>允许这台设备管理电脑？</strong>设备将可安装、卸载和配置电脑插件，管理已有工作区，以及更改电脑设置。聊天授权不包含这些操作。
            <div className="dm-actions"><button className="dm-button dm-primary" disabled={busy} onClick={() => { setGrantDevice(undefined); void act({ action: 'management', deviceId: device.id, enabled: true }) }}>确认授予</button><button className="dm-button" onClick={() => setGrantDevice(undefined)}>取消</button></div>
          </aside>}
        </article>)}</div>}
        </div>
      </>}
    </>}
  </section>
}

export const inject = ['slots']
export function apply(ctx: Context) {
  registerDesktopFeedbackSync(ctx)
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({ name: 'plugins.bundle.config', key: '@dsh-mobile/plugin' }, ManagementPanel))
}
