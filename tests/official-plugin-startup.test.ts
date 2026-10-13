import type { Context } from '@deepseek-ai/cordis'
import { afterEach, expect, test, vi } from 'vitest'

const state = vi.hoisted(() => ({ options: undefined as Record<string, unknown> | undefined,
  initialize: vi.fn(async () => {}), dispose: vi.fn() }))

vi.mock('node:module', () => ({ createRequire: () => () => ({ version: '0.2.1-alpha.1' }) }))
vi.mock('../src/management.js', () => ({ Management: class {
  constructor(_credentials: unknown, _sessions: unknown, _config: unknown, options: Record<string, unknown>) { state.options = options }
  initialize = state.initialize
  dispose = state.dispose
  handle = vi.fn()
} }))

import { apply } from '../src/index.js'
import { TaskNotifications } from '../src/task-notifications.js'

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  state.options = undefined
  vi.clearAllMocks()
  state.initialize.mockReset().mockResolvedValue(undefined)
})

function fixture(gateway: object = {}) {
  const register = vi.fn()
  const get = vi.fn(() => undefined), inject = vi.fn(), on = vi.fn()
  // 只隔离初始化边界；没有预设、本体补丁服务或凭据，不能据此宣称真实配对通过。
  const ctx = { get, inject, on,
    effect: (setup: () => () => void) => { cleanups.push(setup()) },
    credentials: {}, sessionController: {}, typertGateway: gateway, clientModules: {}, attachments: {},
    connection: { fetch: { register } } }
  return { ctx: ctx as unknown as Context, register, get, inject, on }
}

test('official DSH without preset archive patches still initializes the communication plugin', async () => {
  const { ctx, register } = fixture()
  await apply(ctx, {})
  expect(state.initialize).toHaveBeenCalledOnce()
  expect(state.options?.presetManagement).toBeUndefined()
  expect(register.mock.calls.some(([route]) => route.path === '/api/dsh-mobile')).toBe(true)
})

test('communication initialization failures remain failures and do not register the main route', async () => {
  const { ctx, register } = fixture()
  const error = new Error('communication initialization failed')
  state.initialize.mockRejectedValueOnce(error)
  await expect(apply(ctx, {})).rejects.toBe(error)
  expect(register.mock.calls.some(([route]) => route.path === '/api/dsh-mobile')).toBe(false)
})

test('product startup does not attach patch-only services or observe the old pending side channel', async () => {
  const pending = vi.fn(() => { throw new Error('patch-only getter must not run') })
  const gateway = Object.defineProperty({}, 'pendingNotifications', { get: pending })
  const { ctx, register, get, inject, on } = fixture(gateway)
  await apply(ctx, {})
  expect(state.initialize).toHaveBeenCalledOnce()
  expect(register.mock.calls.some(([route]) => route.path === '/api/dsh-mobile')).toBe(true)
  for (const service of ['commandOutput', 'desktopApps', 'cordisInspect', 'presetManagement'])
    expect(state.options?.[service]).toBeUndefined()
  expect(inject.mock.calls).not.toContainEqual([['fs', 'dshmDesktopApps'], expect.any(Function)])
  expect(inject.mock.calls).not.toContainEqual([['tools', 'shell', 'agents'], expect.any(Function)])
  for (const service of ['dshmDesktopApps', 'cordisInspect', 'dynamicCordisRunner'])
    expect(get.mock.calls).not.toContainEqual([service])
  expect(on.mock.calls).not.toContainEqual(['tools/shell-output', expect.any(Function)])
  const notifications = state.options?.taskNotifications
  expect(notifications).toBeInstanceOf(TaskNotifications)
  if (!(notifications instanceof TaskNotifications)) throw Error('missing official task notifications')
  expect(notifications.pendingAvailable).toBe(false)
  const stream = notifications.follow(new AbortController().signal)
  const ready = await stream.next()
  expect(ready.value).toMatchObject({ type: 'ready', pendingAvailable: false, pending: [] })
  await stream.return(undefined)
  expect(pending).not.toHaveBeenCalled()
})
