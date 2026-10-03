import { useMemo, useState } from 'react'
import { appPairLink, pairQr } from './pair-link.js'

export function PairCard({ link, onHide }: { link: string; onHide: () => void }) {
  const [copyStatus, setCopyStatus] = useState('')
  const appLink = useMemo(() => { try { return appPairLink(link) } catch { return undefined } }, [link])
  const qr = useMemo(() => { try { return appLink ? pairQr(appLink) : undefined } catch { return undefined } }, [appLink])
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopyStatus('链接已复制') }
    catch { setCopyStatus('无法自动复制，请选中下方链接手动复制。') }
  }
  return <div className="dm-pair">
    <h3>连接手机</h3>
    <p className="dm-help">5 分钟内有效，领取后立即失效。请使用支持打开 App 链接的扫码工具，扫描后在 DSHM 中确认连接，再在电脑上核对指纹并批准。</p>
    {qr ? <svg className="dm-pair-qr" role="img" aria-label="在 DSHM 中打开配对的二维码" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges">
      <rect width={qr.size} height={qr.size} fill="#fff" />
      <path d={qr.path} fill="#000" />
    </svg> : <p className="dm-help" role="status">二维码暂不可用，请复制配对链接。</p>}
    {appLink && <>
      <label className="dm-field"><span className="dm-label">App 配对链接</span><input className="dm-input" aria-label="App 配对链接" readOnly value={appLink} onFocus={e => e.target.select()} /></label>
      <div className="dm-actions"><button className="dm-button" onClick={() => void copy(appLink)}>复制 App 链接</button></div>
    </>}
    <label className="dm-field"><span className="dm-label">粘贴到 DSHM</span><input className="dm-input" aria-label="一次性配对链接" readOnly value={link} onFocus={e => e.target.select()} /></label>
    <div className="dm-actions"><button className="dm-button" onClick={() => void copy(link)}>复制配对链接</button><button className="dm-button" onClick={onHide}>隐藏链接和二维码</button></div>
    {copyStatus && <p className="dm-help" role="status">{copyStatus}</p>}
  </div>
}
