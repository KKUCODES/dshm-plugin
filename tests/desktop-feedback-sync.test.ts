import { expect, test, vi } from 'vitest'
import { DesktopFeedbackSync, type FeedbackEvents } from '../src/client/feedback-sync.js'

const tick = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  const events: FeedbackEvents = { onmessage: null, onerror: null, close: vi.fn() }
  const connect = vi.fn(() => events)
  const sync = new DesktopFeedbackSync(connect)
  const send = (type: string, revision: number) => events.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ type, revision }) }))
  return { sync, connect, events, send }
}

test('desktop views share a subscription, coalesce pending changes and release the original reader', async () => {
  const f = fixture(), flags: boolean[] = [], flags2: boolean[] = []
  let release: () => void = () => {}
  const waiting = new Promise<void>(resolve => { release = resolve })
  const controller = { resync: vi.fn(async () => { await waiting; return { ok: true } }) }
  const off = f.sync.subscribe(controller, 'one', flag => flags.push(flag))
  const off2 = f.sync.subscribe(controller, 'one', flag => flags2.push(flag))
  expect(f.connect).toHaveBeenCalledTimes(1)
  f.send('ready', 0); f.send('changed', 1); f.send('changed', 3)
  release(); await tick()
  expect(controller.resync).toHaveBeenCalledTimes(2)
  expect(flags).toEqual([false, false]); expect(flags2).toEqual(flags)
  off(); expect(f.events.close).not.toHaveBeenCalled()
  const late = f.events.onmessage
  off2(); expect(f.events.close).toHaveBeenCalledTimes(1)
  late?.(new MessageEvent('message', { data: '{"type":"changed","revision":4}' }))
  await tick(); expect(controller.resync).toHaveBeenCalledTimes(2)
  const off3 = f.sync.subscribe(controller, 'one', () => {})
  off2(); expect(f.events.close).toHaveBeenCalledTimes(1)
  off3(); expect(f.events.close).toHaveBeenCalledTimes(2)
})

test('desktop disconnect stays visible through a pending read; reconnect re-reads and disposal ignores late results', async () => {
  const f = fixture(), flags: boolean[] = []
  let release: () => void = () => {}
  const controller = { resync: vi.fn(async () => { await new Promise<void>(resolve => { release = resolve }); return { ok: true } }) }
  f.sync.subscribe(controller, 'one', flag => flags.push(flag))
  f.send('ready', 0); f.events.onerror?.(new Event('error'))
  release(); await tick(); expect(flags).toEqual([true, true])
  f.send('ready', 0); release(); await tick(); expect(flags.at(-1)).toBe(false)
  f.send('changed', 1); f.sync.dispose(); release(); await tick()
  expect(flags).toEqual([true, true, false]); expect(f.events.close).toHaveBeenCalledTimes(1)
})

test('desktop malformed notification or read failure is visible without automatic mutation/retry', async () => {
  const f = fixture(), flags: boolean[] = []
  const controller = { resync: vi.fn(async () => { throw new Error('offline') }) }
  f.sync.subscribe(controller, 'one', flag => flags.push(flag))
  f.send('ready', 0); await tick(); expect(flags).toEqual([true])
  f.send('changed', -1); await tick()
  expect(f.events.close).toHaveBeenCalledTimes(1); expect(controller.resync).toHaveBeenCalledTimes(1)
  f.sync.dispose()
})
