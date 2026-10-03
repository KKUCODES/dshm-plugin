import { afterEach, expect, test } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import Agents, { type Agent } from '@deepseek-ai/dsh-agent'
import Sessions, { SessionId } from '@deepseek-ai/dsh-session'
import Tools from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { createScope } from '@deepseek-ai/dsh-scope'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CommandOutput } from '../src/command-output.js'

// 真实原工具/执行器/收集器的已核验补丁构建；只有进程 provider 为替身。
const runtimePath = resolve('artifacts/compatibility/foreground-output/test-runtime.mjs')
const builder = await import(pathToFileURL(resolve('compatibility/foreground-output/build-test-runtime.mjs')).href)
await builder.buildRuntime()
const runtime = await import(pathToFileURL(runtimePath).href)
const cleanups: Array<() => unknown | Promise<unknown>> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

async function fixture(name = 'pwsh') {
  const ctx = new Context(), handles: any[] = []
  const dir = resolve('artifacts/tests/command-output'); await mkdir(dir, { recursive: true })
  const scratch = await mkdtemp(resolve(dir, 'case-'))
  class Processes extends Service {
    constructor(ctx: Context) { super(ctx, 'subprocess') }
    spawn(spec: any) {
      const stdout = new runtime.OutputCollector(12, 4096, 'stdout', scratch), stderr = new runtime.OutputCollector(12, 4096, 'stderr', scratch)
      let finish!: (value: any) => void
      const done = { promise: new Promise<any>(resolve => { finish = resolve }), resolve: (value: any) => finish(value) }
      const handle = { stdout, stderr, done, spec }
      handles.push(handle)
      const abort = () => done.resolve({ exitCode: null, signal: 'SIGTERM' })
      spec.signal.addEventListener('abort', abort, { once: true })
      void done.promise.then(() => spec.signal.removeEventListener('abort', abort))
      return { collected: { stdout, stderr }, done: done.promise }
    }
  }
  for (const plugin of [Agents, Sessions, Tools, SystemPrompt, runtime.ShellEnvRegistry, Processes,
    name === 'pwsh' ? runtime.PwshLocalExecutor : runtime.LocalBashExecutor]) {
    const fiber = ctx.plugin(plugin, {}); await fiber.await(); cleanups.push(() => fiber.dispose())
  }
  let control!: CommandOutput
  const observer = ctx.plugin({ inject: ['tools', 'shell', 'agents'], apply(scope: Context) {
    control = new CommandOutput(scope); scope.effect(() => () => control.dispose())
  } })
  await observer.await(); cleanups.push(() => observer.dispose())
  const tool = ctx.plugin(name === 'pwsh' ? runtime.PwshTool : runtime.BashTool, {})
  await tool.await(); cleanups.push(() => tool.dispose())
  const makeAgent = async (id: string) => {
    const session = ctx.sessions.create(SessionId(id))
    const agent = { id: session.id, session, ctx, options: {}, status: 'idle' } as Agent
    const unregister = await ctx.agents.register(agent); cleanups.push(unregister)
    return { agent, unregister }
  }
  const own = await makeAgent('own'), other = await makeAgent('other')
  const launch = (callId: string, agent = own.agent, rootCallId = callId) => {
    const args = { command: `fixture-${callId}`, description: 'readonly test', workdir: scratch }
    const root = agent.session.append('tool/call', { turn: 1, step: 1, name: rootCallId === callId ? name : 'run_code', callId: ToolCallId(rootCallId), arguments: JSON.stringify(args) })
    const result = ctx.tools.execute({ callId: ToolCallId(callId), rootCallId: ToolCallId(rootCallId), agent, name, arguments: args, signal: new AbortController().signal })
    const operation = { method: 'remote.commandOutput' as const, sessionId: agent.id, callId, rootCallId,
      rootCallTime: root.time, generation: control.generation, stream: 'stdout' as const, fromByte: 0, maxBytes: 65536 }
    return { result, operation }
  }
  cleanups.push(() => { for (const handle of handles) { handle.done.resolve({ exitCode: 0, signal: null }); handle.stdout.seal(); handle.stderr.seal() } })
  return { ctx, control, handles, own, other, launch }
}

for (const name of ['pwsh', 'bash']) test(`${name} 原工具→作用域输出事件→Host独立读取；最终结果、spill和并发身份不变`, async () => {
  const f = await fixture(name), signal = new AbortController().signal
  let wrongScope = 0
  const scoped = createScope(f.ctx, f.other.agent)
  const off = scoped.ctx.on('tools/shell-output', () => { wrongScope++ }); cleanups.push(off)
  const first = f.launch('first'), second = f.launch('nested', f.own.agent, 'ptc-root')
  await expect.poll(() => f.handles.length).toBe(2)
  const a = f.handles[0], b = f.handles[1], text = '\u001b[31m完整中文和emoji🙂\u001b[0m'
  a.stdout.push(Buffer.from(text)); a.stderr.push(Buffer.from('错误')); b.stdout.push(Buffer.from('other command'))
  const read: any = await f.control.read(first.operation, signal)
  expect(Buffer.from(read.data, 'base64').toString()).toBe(text)
  expect(read.lossy).toBe(false); expect(read.status).toBe('running'); expect(wrongScope).toBe(0)
  const nested: any = await f.control.read(second.operation, signal)
  expect(Buffer.from(nested.data, 'base64').toString()).toBe('other command'); expect(nested.outputId).not.toBe(read.outputId)
  await expect(f.control.read({ ...first.operation, sessionId: f.other.agent.id }, signal)).rejects.toThrow('remote_command_missing')
  await expect(f.control.read({ ...first.operation, rootCallTime: first.operation.rootCallTime + 1 }, signal)).rejects.toThrow('remote_command_stale')
  await expect(f.control.read({ ...first.operation, outputId: nested.outputId }, signal)).rejects.toThrow('remote_command_stale')
  a.done.resolve({ exitCode: 7, signal: null }); b.done.resolve({ exitCode: 0, signal: null })
  const finished: any = await first.result; await second.result
  expect(finished.isError).toBe(false); expect(finished.value.exitCode).toBe(7)
  // 原结果仍遵守原 12 字节尾部裁剪；手机独立 spill 补读不改变该结果或原文件。
  expect(finished.value.stdout.truncated).toBe(true); expect(finished.value.stderr.text).toBe('错误')
  const history: any = await f.control.read({ ...first.operation, outputId: read.outputId }, signal)
  expect(history.status).toBe('failed'); expect(Buffer.from(history.data, 'base64').toString()).toBe(text)
  expect(history).not.toHaveProperty('spillPath')
})

test('原审批拒绝不启动进程/不发布输出；会话释放和服务失效拒绝旧读取', async () => {
  const f = await fixture(), signal = new AbortController().signal
  const offDeny = f.ctx.on('tools/pre-execute', async () => ({ kind: 'deny' as const, reason: 'fixture denied' }))
  const denied = f.launch('denied'); expect((await denied.result).isError).toBe(true); offDeny()
  expect(f.handles.length).toBe(0)
  await expect(f.control.read(denied.operation, signal)).rejects.toThrow('remote_command_missing')
  const live = f.launch('live'); await expect.poll(() => f.handles.length).toBe(1)
  f.handles[0].stdout.push(Buffer.from('data'))
  await expect(f.control.read(live.operation, signal)).resolves.toMatchObject({ state: 'available' })
  await f.own.unregister()
  await expect(f.control.read(live.operation, signal)).rejects.toThrow('remote_command_missing')
  f.handles[0].done.resolve({ exitCode: 0, signal: null }); await live.result
  f.control.dispose()
  await expect(f.control.read(live.operation, signal)).rejects.toThrow('remote_command_stale')
})

test('缺少根调用记录或未知代次拒绝关联；中断读取不返回字节', async () => {
  const f = await fixture(), live = f.launch('live'), signal = new AbortController().signal
  await expect.poll(() => f.handles.length).toBe(1)
  const cancelled = new AbortController(); cancelled.abort()
  await expect(f.control.read(live.operation, cancelled.signal)).rejects.toThrow()
  await expect(f.control.read({ ...live.operation, generation: 'old' }, signal)).rejects.toThrow('remote_command_stale')
  await expect(f.control.read({ ...live.operation, fromByte: 1 }, signal)).rejects.toThrow('remote_command_stale')
  await expect(f.control.read({ ...live.operation, maxBytes: 65537 }, signal)).rejects.toThrow('remote_command_range')
  f.handles[0].done.resolve({ exitCode: 0, signal: null }); await live.result
  const unknown = f.ctx.tools.execute({ callId: ToolCallId('no-log'), agent: f.own.agent, name: 'pwsh', arguments: { command: 'fixture', description: 'fixture' }, signal })
  await expect.poll(() => f.handles.length).toBe(2)
  await expect(f.control.read({ ...live.operation, callId: 'no-log', rootCallId: 'no-log' }, signal)).rejects.toThrow('remote_command_missing')
  f.handles[1].done.resolve({ exitCode: 0, signal: null }); await unknown
})
