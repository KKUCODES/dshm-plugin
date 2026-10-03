import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { expect, test } from 'vitest'
import { Context } from '@deepseek-ai/cordis'

test('built desktop client registers with dsh ModuleLoader and bundle config slot', async () => {
  const source = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8')
  let registered: { id: string; factory: (require: NodeRequire) => { inject: string[]; apply: (ctx: unknown) => void } } | undefined
  runInNewContext(source, { window: { __ModuleLoader__: { load: (value: typeof registered) => { registered = value } } } })
  expect(registered?.id).toBe('@dsh-mobile/plugin')
  const module = registered!.factory(createRequire(import.meta.url))
  expect(module.inject).toEqual(['slots'])
  let slot: unknown, component: unknown
  const ctx = new Context()
  ctx.provide('slots', {
    inject: (_name: string, callback: () => void) => callback(),
    register: (options: unknown, view: unknown) => { slot = options; component = view },
  })
  const fiber = ctx.plugin(module)
  try {
    await fiber.await()
    expect(slot).toEqual({ name: 'plugins.bundle.config', key: '@dsh-mobile/plugin' })
    expect(typeof component).toBe('function')
  } finally { await fiber.dispose() }
})
