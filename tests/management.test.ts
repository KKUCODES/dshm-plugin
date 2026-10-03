import { randomBytes, randomUUID } from 'node:crypto'
import { afterEach, expect, test, vi } from 'vitest'
import { Management } from '../src/management.js'

afterEach(() => vi.restoreAllMocks())

function management(overrides: Partial<ConstructorParameters<typeof Management>[0]> = {}) {
  return new Management({
    resolve: async () => ({ value: randomBytes(32).toString('base64url'), source: 'test' }),
    readRecord: async () => undefined,
    modifyRecord: async (_key, change) => change(undefined),
    ...overrides,
  }, {
    list: async () => ({ items: [] }), page: async () => { throw new Error('unused') },
    prompt: async () => ({ accepted: true }), cancel: () => ({ accepted: true }),
    async *follow() {}, async *control() {},
  }, {})
}

test.each(['http://127.0.0.1:8787', 'http://192.168.1.20:8787', 'http://relay.example.com', 'https://relay.example.com'])('desktop registration accepts %s without a legacy flag', async origin => {
  // 仅替代网关响应，实际桌面管理入口负责地址校验、注册及凭据保存。
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ registrationMode: 'private' })).mockResolvedValueOnce(Response.json({ id: randomUUID(), token: randomBytes(32).toString('base64url') }))
  const host = management()
  try {
    const response = await host.handle(new Request('http://localhost/api/dsh-mobile', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'setup', origin, name: 'Test desktop' }) }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ configured: true })
    expect(request).toHaveBeenCalledWith(origin + '/v1/hosts', expect.objectContaining({ method: 'POST', redirect: 'error' }))
  } finally { host.dispose() }
})

test('setup uses the entered key without reading environment credentials and persists only the Host token', async () => {
  const enrollment = randomBytes(32).toString('base64url'), token = randomBytes(32).toString('base64url')
  const resolve = vi.fn(async () => { throw new Error('must not read environment credentials') })
  let saved: unknown
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ registrationMode: 'private' })).mockResolvedValueOnce(Response.json({ id: randomUUID(), token }))
  const host = management({ resolve, modifyRecord: async (_key, change) => { const record = await change(undefined); saved = record; return record } })
  try {
    const response = await host.handle(new Request('http://localhost/api/dsh-mobile', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'setup', origin: 'http://127.0.0.1:8787', name: 'Test desktop', enrollmentToken: ' ' + enrollment + ' ' }) }))
    expect(response.status).toBe(200)
    expect(request).toHaveBeenCalledWith('http://127.0.0.1:8787/v1/hosts', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer ' + enrollment }) }))
    expect(resolve).not.toHaveBeenCalled()
    expect(saved).toMatchObject({ kind: 'grant', payload: { token } })
    expect(JSON.stringify(saved)).not.toContain(enrollment)
    expect(await response.text()).not.toContain(enrollment)
  } finally { host.dispose() }
})

test.each([
  { key: undefined, expected: 'enrollment_credential_missing' },
  { key: 'wrong-format', expected: 'enrollment_credential_invalid' },
])('reports $expected without sending credentials', async ({ key, expected }) => {
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ registrationMode: 'private' }))
  const host = management({ resolve: async () => undefined })
  try {
    const response = await host.handle(new Request('http://localhost/api/dsh-mobile', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'setup', origin: 'http://127.0.0.1:8787', name: 'Test desktop', enrollmentToken: key }) }))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expected })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('http://127.0.0.1:8787/v1/server-info', expect.objectContaining({ headers: { 'content-type': 'application/json' } }))
  } finally { host.dispose() }
})

test.each(['ftp://relay.example.com', 'ws://relay.example.com', 'https://user:secret@relay.example.com',
  'http://relay.example.com/api', 'http://relay.example.com?key=value', 'http://relay.example.com#key=value'])('desktop rejects invalid service root before sending credentials: %s', async origin => {
  const request = vi.spyOn(globalThis, 'fetch')
  const host = management()
  try {
    const response = await host.handle(new Request('http://localhost/api/dsh-mobile', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'setup', origin, name: 'Test desktop' }) }))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'invalid_gateway_origin' })
    expect(request).not.toHaveBeenCalled()
  } finally { host.dispose() }
})

test.each(['unreachable', 'timeout', 'rejected'] as const)('returns a safe error code for %s registration without saving credentials', async failure => {
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ registrationMode: 'private' }))
  if (failure === 'rejected') request.mockResolvedValue(new Response(null, { status: 401 }))
  else request.mockRejectedValue(failure === 'timeout' ? new DOMException('private diagnostic', 'TimeoutError') : new TypeError('private diagnostic'))
  const save = vi.fn()
  const host = management({ modifyRecord: save })
  try {
    const response = await host.handle(new Request('http://localhost/api/dsh-mobile', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'setup', origin: 'http://127.0.0.1:8787', name: 'Test desktop' }) }))
    expect(await response.json()).toEqual({ error: failure === 'rejected' ? 'gateway_http_401' : 'gateway_' + failure })
    expect(save).not.toHaveBeenCalled()
  } finally { host.dispose() }
})

test('open enrollment ignores any entered key and never reads local credentials', async () => {
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ registrationMode: 'open' }))
    .mockResolvedValueOnce(Response.json({ id: randomUUID(), token: randomBytes(32).toString('base64url') }))
  const resolve = vi.fn(async () => { throw new Error('must not read local credentials') })
  const host = management({ resolve })
  try {
    const response = await host.handle(new Request('http://localhost/api/dsh-mobile', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'setup', origin: 'http://127.0.0.1:8787', name: 'Open computer', enrollmentToken: 'stale-invalid-secret' }) }))
    expect(response.status).toBe(200)
    expect(resolve).not.toHaveBeenCalled()
    expect(request).toHaveBeenLastCalledWith('http://127.0.0.1:8787/v1/hosts', expect.objectContaining({ headers: { 'content-type': 'application/json' } }))
    expect(JSON.stringify(request.mock.calls)).not.toContain('stale-invalid-secret')
  } finally { host.dispose() }
})

test('legacy gateway 404 falls back to private enrollment, not open access', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 404 }))
  const host = management({ resolve: async () => undefined })
  try {
    const response = await host.handle(new Request('http://localhost/api/dsh-mobile', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'setup', origin: 'http://127.0.0.1:8787', name: 'Legacy computer' }) }))
    expect(await response.json()).toEqual({ error: 'enrollment_credential_missing' })
  } finally { host.dispose() }
})
