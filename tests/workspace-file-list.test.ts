import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile, symlink } from 'node:fs/promises'
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
import type { HostFrame, RemoteContext } from '@dsh-mobile/protocol'
import { RemoteAdapter } from '../src/remote-adapter.js'

const cleanups: Array<() => Promise<unknown> | void> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

test('真实 Gateway 目录按层读取、截断提示、工作区边界与目录链接拒绝', async () => {
  const parent = resolve('artifacts/workspace-file-list'); await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-'))
  cleanups.push(async () => { if (!resolve(root).startsWith(parent + sep)) throw Error('unexpected test directory'); await rm(root, { recursive: true, force: true }) })
  const ctx = new Context(); cleanups.push(() => ctx.fiber.dispose())
  await ctx.plugin(CredentialsLocal, { path: join(root, 'credentials.yaml'), watch: false })
  await ctx.plugin(connection); await ctx.plugin(TypertRegistry); await ctx.plugin(TypertGateway); await ctx.plugin(SessionStore)
  await ctx.plugin(LocalFileSystem, { cwd: root })
  ctx.provide('sandboxPolicy', { workspaceRoot: root } as Context['sandboxPolicy'])
  await ctx.plugin(WorkspaceFiles, { maxBytes: 1024, maxFileBytes: 1024, maxLines: 100, maxEntries: 2 })
  const workspace = join(root, 'workspace'), outside = join(root, 'outside')
  await mkdir(join(workspace, 'nested'), { recursive: true }); await mkdir(outside)
  await writeFile(join(workspace, 'readme.txt'), 'inside')
  await writeFile(join(workspace, 'nested/child.txt'), 'nested content')
  await writeFile(join(outside, 'outside-secret.txt'), 'outside')
  ctx.sessions.create(SessionId('file-owner'), { meta: { cwd: workspace } })
  const context: RemoteContext = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
  const adapter = new RemoteAdapter({ version: '0.1.6-alpha.2', connection: ctx.connection, gateway: ctx.typertGateway,
    modules: { graph: () => ({ rev: 'fixture', entries: [], batches: [] }), onGraphChanged: () => () => {}, fetchBundle: async () => new Response(null, { status: 404 }) },
  }, context.hostId)
  cleanups.push(() => adapter.dispose())
  const call = async (path: string, extra: Record<string, unknown> = {}) => {
    const frames: HostFrame[] = []
    await adapter.receive({ type: 'request', id: randomUUID(), context, operation: { method: 'remote.rpc', endpoint: 'workspaceFiles/list',
      payload: { args: { workspaceFileScopeId: 'file-owner', path, ...extra } } } }, frame => frames.push(frame))
    return frames
  }
  const listing = await call('.')
  expect(listing).toMatchObject([{ type: 'result', value: { ok: true, value: { path: '', truncated: false,
    entries: [{ name: 'nested', type: 'directory' }, { name: 'readme.txt', type: 'file' }] } } }])
  expect(JSON.stringify(listing)).not.toContain('child.txt')
  expect(await call('nested')).toMatchObject([{ type: 'result', value: { ok: true, value: { entries: [{ name: 'child.txt' }] } } }])
  for (const path of ['..', '../outside', outside]) {
    const denied = await call(path)
    expect(JSON.stringify(denied)).toContain('workspace-file/outside-workspace')
    expect(JSON.stringify(denied)).not.toContain('outside-secret.txt')
  }
  await symlink(outside, join(workspace, 'linked'), 'junction')
  // 最终链接拒绝，经过中间链接的子目录也由规范路径边界拒绝。
  expect(JSON.stringify(await call('linked'))).toContain('workspace-file/not-directory')
  await mkdir(join(outside, 'inner'))
  expect(JSON.stringify(await call('linked/inner'))).toContain('workspace-file/outside-workspace')
  const truncated = await call('.')
  expect(truncated).toMatchObject([{ type: 'result', value: { ok: true, value: { truncated: true, entries: [{}, {}] } } }])
  expect(JSON.stringify(await call('readme.txt'))).toContain('workspace-file/not-directory')
  expect(JSON.stringify(await call('missing'))).toContain('workspace-file/not-found')
  const missing = await call('.', { workspaceFileScopeId: 'unknown' })
  expect(missing).toMatchObject([{ type: 'result', value: { ok: false } }])
  expect(JSON.stringify(missing)).not.toContain('readme.txt')
  expect(await call('.', { recursive: true })).toMatchObject([{ type: 'error', code: 'remote_operation_denied' }])
}, 15000)
