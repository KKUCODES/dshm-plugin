import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import * as connection from '@deepseek-ai/dsh-client-connection'
import CredentialsLocal from '@deepseek-ai/dsh-credentials-local'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import TypertGateway from '@deepseek-ai/dsh-api-gateway'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import WorkspaceFiles from '@deepseek-ai/dsh-api-workspace-files'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import { afterEach, expect, test } from 'vitest'
import type { HostFrame, Operation, RemoteContext } from '@dsh-mobile/protocol'
import { RemoteAdapter } from '../src/remote-adapter.js'

const cleanups: Array<() => Promise<unknown> | void> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

test('原文件观察经过 Session lookup、Gateway 和 Remote，按工作区过滤且取消后停止', async () => {
  const parent = resolve('artifacts/workspace-file-feed'); await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-'))
  cleanups.push(async () => { if (!resolve(root).startsWith(parent + sep)) throw new Error('unexpected test directory'); await rm(root, { recursive: true, force: true }) })
  const ctx = new Context(); cleanups.push(() => ctx.fiber.dispose())
  await ctx.plugin(CredentialsLocal, { path: join(root, 'credentials.yaml'), watch: false })
  await ctx.plugin(connection); await ctx.plugin(TypertRegistry); await ctx.plugin(TypertGateway); await ctx.plugin(SessionStore)
  await ctx.plugin(LocalFileSystem, { cwd: root })
  ctx.provide('sandboxPolicy', { workspaceRoot: root } as Context['sandboxPolicy'])
  await ctx.plugin(WorkspaceFiles, { maxBytes: 1024, maxFileBytes: 1024, maxLines: 100, maxEntries: 100 })
  const workspace = join(root, 'workspace'); await mkdir(workspace)
  ctx.sessions.create(SessionId('file-owner'), { meta: { cwd: workspace } })
  const context: RemoteContext = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
  const adapter = new RemoteAdapter({ version: '0.1.6-alpha.2', connection: ctx.connection, gateway: ctx.typertGateway,
    modules: { graph: () => ({ rev: 'fixture', entries: [], batches: [] }), onGraphChanged: () => () => {}, fetchBundle: async () => new Response(null, { status: 404 }) },
  }, context.hostId)
  cleanups.push(() => adapter.dispose())
  const operation: Operation = { method: 'remote.stream', endpoint: 'workspaceFiles/changes', payload: { args: { workspaceFileScopeId: 'file-owner' } } }
  const denied: HostFrame[] = []
  await adapter.receive({ type: 'request', id: randomUUID(), context, operation: { ...operation, payload: { args: { workspaceFileScopeId: 'file-owner', workspaceRoot: root } } } }, frame => denied.push(frame))
  expect(denied).toMatchObject([{ type: 'error', code: 'remote_operation_denied' }])
  const missing: HostFrame[] = []
  await adapter.receive({ type: 'request', id: randomUUID(), context, operation: { ...operation, payload: { args: { workspaceFileScopeId: 'absent' } } } }, frame => missing.push(frame))
  expect(JSON.stringify(missing)).not.toContain('"kind":"ready"')
  expect(missing.some(frame => frame.type === 'error' || frame.type === 'event' && JSON.stringify(frame.value).includes('error'))).toBe(true)
  const id = randomUUID(), frames: HostFrame[] = []
  const running = adapter.receive({ type: 'request', id, context, operation }, frame => frames.push(frame))
  await expect.poll(() => JSON.stringify(frames)).toContain('"kind":"ready"')
  const outside = join(root, 'outside.txt'), inside = join(workspace, 'inside.txt')
  // 原工具在完成观察后显式发事件；裸文件系统操作不是 OS watch。
  const observe = async (path: string) => {
    const target = await ctx.fs.resolve(path), info = await ctx.fs.stat(target)
    if (!info) throw new Error('missing fixture')
    ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, undefined)
  }
  await writeFile(outside, 'outside'); await observe(outside)
  await writeFile(inside, 'inside'); await observe(inside)
  await expect.poll(() => JSON.stringify(frames)).toContain('inside.txt')
  expect(JSON.stringify(frames)).not.toContain('outside.txt')
  expect(JSON.stringify(frames)).toContain('"version"')
  await adapter.receive({ type: 'cancel', id }, () => {}); await running
  const count = frames.length
  await writeFile(inside, 'changed after cancellation'); await observe(inside)
  expect(frames).toHaveLength(count)
  const nextId = randomUUID(), nextFrames: HostFrame[] = []
  const disconnected = adapter.receive({ type: 'request', id: nextId, context, operation }, frame => nextFrames.push(frame))
  await expect.poll(() => JSON.stringify(nextFrames)).toContain('"kind":"ready"')
  adapter.dispose(); await disconnected
  const disconnectedCount = nextFrames.length
  await observe(inside)
  expect(nextFrames).toHaveLength(disconnectedCount)
}, 15000)
