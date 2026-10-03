import { create } from 'qrcode'

/** 转换电脑已生成的配对材料；不创建第二个 key，也不请求二维码服务。 */
export function appPairLink(link: string): string {
  const url = new URL(link)
  if (url.href !== link || !['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || url.pathname !== '/pair' || url.search || !/^#key=[A-Za-z0-9_-]{43}$/.test(url.hash)) {
    throw new Error('invalid_pair_link')
  }
  const result = `dshm://pair?server=${encodeURIComponent(url.origin)}${url.hash}`
  if (result.length > 4096) throw new Error('invalid_pair_link')
  return result
}

export function pairQr(link: string): { size: number; path: string } {
  const { modules } = create(link, { errorCorrectionLevel: 'M' })
  // 固定黑白与四模块静区，避免宿主暗色主题降低扫码对比度。
  const quiet = 4
  const segments: string[] = []
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (modules.get(y, x)) segments.push(`M${x + quiet},${y + quiet}h1v1h-1z`)
    }
  }
  return { size: modules.size + quiet * 2, path: segments.join('') }
}
