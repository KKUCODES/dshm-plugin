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
import type { HostFrame, RemoteContext } from '@dsh-mobile/protocol'
import { RemoteAdapter } from '../src/remote-adapter.js'

const cleanups: Array<() => Promise<unknown> | void> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

async function fixture(maxBytes = 64) {
  const parent = resolve('artifacts/workspace-file-pages'); await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'run-'))
  cleanups.push(async () => { if (!resolve(root).startsWith(parent + sep)) throw Error('unexpected test directory'); await rm(root, { recursive: true, force: true }) })
  const ctx = new Context(); cleanups.push(() => ctx.fiber.dispose())
  await ctx.plugin(CredentialsLocal, { path: join(root, 'credentials.yaml'), watch: false })
  await ctx.plugin(connection); await ctx.plugin(TypertRegistry); await ctx.plugin(TypertGateway); await ctx.plugin(SessionStore)
  await ctx.plugin(LocalFileSystem, { cwd: root })
  ctx.provide('sandboxPolicy', { workspaceRoot: root } as Context['sandboxPolicy'])
  await ctx.plugin(WorkspaceFiles, { maxBytes, maxFileBytes: maxBytes, maxLines: 2, maxEntries: 10 })
  const workspace = join(root, 'workspace'); await mkdir(workspace)
  ctx.sessions.create(SessionId('page-owner'), { meta: { cwd: workspace } })
  const context: RemoteContext = { hostId: randomUUID(), deviceId: randomUUID(), connectionId: randomUUID(), management: false }
  const adapter = new RemoteAdapter({ version: '0.1.6-alpha.2', connection: ctx.connection, gateway: ctx.typertGateway,
    modules: { graph: () => ({ rev: 'fixture', entries: [], batches: [] }), onGraphChanged: () => () => {}, fetchBundle: async () => new Response(null, { status: 404 }) },
  }, context.hostId)
  cleanups.push(() => adapter.dispose())
  const call = async (path: string, range: Record<string, unknown> = { offset: 1 }, extra: Record<string, unknown> = {}) => {
    const frames: HostFrame[] = []
    await adapter.receive({ type: 'request', id: randomUUID(), context, operation: { method: 'remote.rpc', endpoint: 'workspaceFiles/read',
      payload: { args: { workspaceFileScopeId: 'page-owner', path, range, ...extra } } } }, frame => frames.push(frame))
    return frames
  }
  return { root, workspace, call }
}

test('原 Host 按行分页保留 UTF-8、空行、版本与 EOF，默认窗口取电脑配置', async () => {
  const { workspace, call } = await fixture()
  const path = join(workspace, '正文.txt'), text = '第一行🙂\n\n第三行\n最后一行\n'
  await writeFile(path, text)
  const first = await call('正文.txt')
  expect(first).toMatchObject([{ type: 'result', value: { ok: true, value: {
    absolutePath: path, version: expect.any(String), bytes: Buffer.byteLength(text), offset: 1,
    text: '第一行🙂\n', lines: 2, eof: false,
  } } }])
  const last = await call('正文.txt', { offset: 3 })
  expect(last).toMatchObject([{ type: 'result', value: { ok: true, value: {
    offset: 3, text: '第三行\n最后一行', lines: 2, eof: true,
  } } }])
  for (const offset of [5, 100]) expect(await call('正文.txt', { offset })).toMatchObject([
    { type: 'result', value: { ok: true, value: { offset, text: '', lines: 0, eof: true } } },
  ])
  await writeFile(join(workspace, 'empty.txt'), '')
  expect(await call('empty.txt')).toMatchObject([{ type: 'result', value: { ok: true, value: { text: '', lines: 0, eof: true } } }])
  await writeFile(path, '更新')
  const changed = await call('正文.txt')
  expect(changed).toMatchObject([{ type: 'result', value: { ok: true, value: { text: '更新', lines: 1, eof: true } } }])
  expect(JSON.stringify(changed)).not.toEqual(JSON.stringify(first))
}, 15000)

test('原 Host 拒绝二进制、超长行、无效会话和目录；不能覆盖文件服务上限', async () => {
  const { workspace, call } = await fixture()
  for (const [name, content] of Object.entries({
    'nul.txt': Buffer.from('a\0b'), 'bad-utf8.txt': Buffer.from([0xff, 0xfe]), 'huge.txt': Buffer.from('界'.repeat(30)),
  })) await writeFile(join(workspace, name), content)
  for (const name of ['nul.txt', 'bad-utf8.txt']) expect(JSON.stringify(await call(name))).toContain('workspace-file/not-text')
  expect(JSON.stringify(await call('huge.txt'))).toContain('workspace-file/too-large')
  expect(JSON.stringify(await call('.'))).toContain('workspace-file/not-regular-file')
  expect(JSON.stringify(await call('missing.txt'))).toContain('workspace-file/not-found')
  expect(JSON.stringify(await call('huge.txt', { offset: 1, limit: 3 }))).toContain('gateway/bad-request')
  expect(await call('huge.txt', { offset: 1 }, { workspaceFileScopeId: 'unknown' }))
    .toMatchObject([{ type: 'result', value: { ok: false } }])
  for (const extra of [{ workspaceRoot: workspace }, { maxBytes: 10000 }, { workspaceFileScope: { workspaceRoot: workspace } }]) {
    expect(await call('huge.txt', { offset: 1 }, extra)).toMatchObject([{ type: 'error', code: 'remote_operation_denied' }])
  }
}, 15000)

test('分页不聚合整文件，读取边界沿用原文件系统而非新增目录沙箱', async () => {
  const { root, workspace, call } = await fixture()
  await writeFile(join(workspace, 'many.txt'), Array.from({ length: 100 }, (_, i) => `第${i + 1}行`).join('\n'))
  expect(await call('many.txt', { offset: 99, limit: 2 })).toMatchObject([
    { type: 'result', value: { ok: true, value: { text: '第99行\n第100行', lines: 2, eof: true } } },
  ])
  // LocalFS 在此夹具允许工作区外读取；不能把目录 list 的 containment 宣称为 read 的行为。
  await writeFile(join(root, 'outside.txt'), 'outside')
  expect(await call('../outside.txt')).toMatchObject([
    { type: 'result', value: { ok: true, value: { text: 'outside', lines: 1, eof: true } } },
  ])
}, 15000)

test('JSON 转义后的超大文件页返回原文件错误，不交给通用中继降级成内部错误', async () => {
  const { workspace, call } = await fixture(2 * 1024 * 1024)
  await writeFile(join(workspace, 'escaped.txt'), '"'.repeat(1100000))
  const result = await call('escaped.txt')
  expect(result).toMatchObject([{ type: 'result', value: { ok: false, error: {
    code: 'workspace-file/too-large', details: { path: 'escaped.txt', limit: 2 * 1024 * 1024 },
  } } }])
  expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(1024)
  await writeFile(join(workspace, 'small.txt'), '仍然可读')
  expect(await call('small.txt')).toMatchObject([{ type: 'result', value: { ok: true, value: { text: '仍然可读' } } }])
}, 15000)
