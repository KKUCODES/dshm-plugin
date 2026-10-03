import { expect, test } from 'vitest'
import { createRequire } from 'node:module'
import { appPairLink, pairQr } from '../src/client/pair-link.js'

const key = 'A'.repeat(43)
const jsQR: typeof import('jsqr').default = createRequire(import.meta.url)('jsqr')
test('desktop app link preserves the canonical origin and the same fragment-only key', () => {
  for (const origin of ['http://127.0.0.1:8787', 'https://relay.example.com', 'https://[::1]:8787']) {
    const link = appPairLink(`${origin}/pair#key=${key}`)
    const app = new URL(link)
    expect(app.protocol).toBe('dshm:')
    expect(app.host).toBe('pair')
    expect(app.pathname).toBe('')
    expect(app.searchParams.get('server')).toBe(origin)
    expect(app.searchParams.has('key')).toBe(false)
    expect(app.hash).toBe(`#key=${key}`)
  }
})

test('malformed pairing material does not become an app link', () => {
  for (const link of [
    `file:///pair#key=${key}`, `https://user@relay.example.com/pair#key=${key}`,
    `https://relay.example.com/pair?key=${key}`, `https://relay.example.com/other#key=${key}`,
    `https://relay.example.com/pair#key=${key}&extra=1`, `https://relay.example.com/pair#key=short`,
    `https://relay.example.com/../pair#key=${key}`, ` https://relay.example.com/pair#key=${key}`,
  ]) expect(() => appPairLink(link)).toThrow()
})

test('the rendered QR path decodes back to the exact Android app link', () => {
  for (const origin of ['http://127.0.0.1:8787', 'https://relay.example.com', 'https://[::1]:8787']) {
    const link = appPairLink(`${origin}/pair#key=${key}`)
    const qr = pairQr(link)
    const scale = 5, width = qr.size * scale
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255)
    // 解码实际 SVG 路径，而非重新调用编码器检查它自己。
    for (const match of qr.path.matchAll(/M(\d+),(\d+)h1v1h-1z/g)) {
      const x = Number(match[1]), y = Number(match[2])
      expect(x).toBeGreaterThanOrEqual(4); expect(y).toBeGreaterThanOrEqual(4)
      expect(x).toBeLessThan(qr.size - 4); expect(y).toBeLessThan(qr.size - 4)
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const offset = ((y * scale + dy) * width + x * scale + dx) * 4
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0
      }
    }
    expect(jsQR(pixels, width, width)?.data).toBe(link)
  }
})
