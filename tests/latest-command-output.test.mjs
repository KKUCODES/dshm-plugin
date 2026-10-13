import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { access, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { prepareLatestForegroundObserver } from '../compatibility/latest-upstream/foreground-observer.mjs';

const sourceRoot = process.env.DSHM_LATEST_SOURCE_ROOT;
if (sourceRoot === undefined) await prepareLatestForegroundObserver();
const root = resolve(import.meta.dirname, '..'), runtime = resolve(root, 'artifacts/latest-runtime-check');
const require = createRequire(resolve(runtime, 'package.json'));
const sourceEntries = {
  '@deepseek-ai/cordis': 'vendor/cordis/src/index.ts',
  '@deepseek-ai/dsh-agent': 'packages/core/agent/src/index.ts',
  '@deepseek-ai/dsh-session': 'packages/core/session/src/index.ts',
  '@deepseek-ai/dsh-tools': 'packages/core/tools/src/index.ts',
  '@deepseek-ai/dsh-system-prompt': 'packages/core/system-prompt/src/index.ts',
  '@deepseek-ai/dsh-shell-env': 'packages/shell/shell-env/src/index.ts',
  '@deepseek-ai/dsh-subprocess-local': 'packages/subprocess/subprocess-local/src/index.ts',
  '@deepseek-ai/dsh-jobs-local': 'packages/jobs/jobs-local/src/index.ts',
  '@deepseek-ai/dsh-pwsh-local': 'packages/shell/pwsh-local/src/index.ts',
  '@deepseek-ai/dsh-bash-local': 'packages/shell/bash-local/src/index.ts',
  '@deepseek-ai/dsh-tool-pwsh': 'packages/shell/tool-pwsh/src/index.ts',
  '@deepseek-ai/dsh-tool-bash': 'packages/shell/tool-bash/src/index.ts',
  '@deepseek-ai/dsh-subprocess-local/output': 'packages/subprocess/subprocess-local/src/output.ts',
  '@deepseek-ai/dsh-scope': 'packages/core/scope/src/index.ts',
  '@deepseek-ai/dsh-session-projection': 'packages/session/session-projection/src/index.ts',
  '@deepseek-ai/dsh-sandbox-policy': 'packages/sandbox/sandbox-policy/src/index.ts',
  '@deepseek-ai/dsh-sandbox-local': 'packages/sandbox/sandbox-local/src/index.ts',
  '@deepseek-ai/dsh-pwsh-sandbox': 'packages/shell/pwsh-sandbox/src/index.ts',
  '@deepseek-ai/dsh-session-query': 'packages/session-query/session-query/src/index.ts',
  '@deepseek-ai/dsh-session-persistence-jsonl': 'packages/session/session-persistence-jsonl/src/index.ts',
  '@deepseek-ai/dsh-llm': 'packages/llm/llm/src/index.ts',
};
const load = name => {
  if (sourceRoot === undefined) return import(pathToFileURL(require.resolve(name)).href);
  if (!Object.hasOwn(sourceEntries, name)) throw Error('unsupported_source_test_entry');
  return import(pathToFileURL(resolve(sourceRoot, sourceEntries[name])).href);
};
const [{ Context, Service }, { default: Agents }, { default: Sessions, SessionId }, { default: Tools },
  { default: SystemPrompt }, { ShellEnvRegistry }, { default: Processes }, { default: Jobs },
  { default: Pwsh }, { default: Bash }, PwshTool, BashTool, { OutputCollector }, { createScope },
  { default: Projections }, { default: SandboxPolicy }, { default: Sandbox }, { default: SandboxPwsh }] = await Promise.all([
  load('@deepseek-ai/cordis'), load('@deepseek-ai/dsh-agent'), load('@deepseek-ai/dsh-session'), load('@deepseek-ai/dsh-tools'),
  load('@deepseek-ai/dsh-system-prompt'), load('@deepseek-ai/dsh-shell-env'), load('@deepseek-ai/dsh-subprocess-local'),
  load('@deepseek-ai/dsh-jobs-local'), load('@deepseek-ai/dsh-pwsh-local'), load('@deepseek-ai/dsh-bash-local'),
  load('@deepseek-ai/dsh-tool-pwsh'), load('@deepseek-ai/dsh-tool-bash'), load('@deepseek-ai/dsh-subprocess-local/output'),
  load('@deepseek-ai/dsh-scope'),
  load('@deepseek-ai/dsh-session-projection'), load('@deepseek-ai/dsh-sandbox-policy'),
  load('@deepseek-ai/dsh-sandbox-local'), load('@deepseek-ai/dsh-pwsh-sandbox'),
]);
const bundle = resolve(runtime, 'latest-command-output.mjs');
await build({ entryPoints: [resolve(root, 'src/command-output.ts')], outfile: bundle,
  bundle: true, format: 'esm', platform: 'node', external: ['@deepseek-ai/*'], logLevel: 'silent' });
const { CommandOutput } = await import(pathToFileURL(bundle).href);
const [{ default: Query }, { default: Jsonl }, { createToolResultMessage, createAssistantMessage }] = await Promise.all([
  load('@deepseek-ai/dsh-session-query'), load('@deepseek-ai/dsh-session-persistence-jsonl'),
  load('@deepseek-ai/dsh-llm'),
]);
class OutputQuery extends Query {
  searchSessions() { throw Error('not used by command output'); }
  searchEvents() { throw Error('not used by command output'); }
}

async function until(read, accept, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { const value = await read(); if (accept(value)) return value; await sleep(20); }
  throw Error('latest output condition timed out');
}
async function waitForOutput(run) {
  return until(async () => {
    try { return await run.read(); }
    catch (error) { if (error.message === 'remote_command_missing') return undefined; throw error; }
  }, value => value?.state === 'available' && Buffer.from(value.data, 'base64').length > 0);
}
async function fixture(t, { jobs = false, name = 'pwsh', controlled = false, legacyReader = false, sandbox = false, durable = false } = {}) {
  const ctx = new Context(), handles = [];
  await mkdir(resolve(runtime, 'command-tests'), { recursive: true });
  const scratch = await mkdtemp(resolve(runtime, 'command-tests/case-'));
  // 故障及 Bash 分支使用受控进程 provider；真实 PowerShell 测试使用原 native runtime。
  class ControlledProcesses extends Service {
    constructor(ctx) { super(ctx, 'subprocess'); }
    spawn(spec) {
      const stdout = new OutputCollector(12, 'stdout', { dir: scratch, maxBytes: 4096, onFailure: assert.fail });
      const stderr = new OutputCollector(12, 'stderr', { dir: scratch, maxBytes: 4096, onFailure: assert.fail });
      const settled = Promise.withResolvers();
      const abort = () => settled.resolve({ exitCode: null, signal: 'SIGTERM' });
      spec.signal?.addEventListener('abort', abort, { once: true });
      const done = settled.promise.finally(() => {
        spec.signal?.removeEventListener('abort', abort); stdout.seal(); stderr.seal();
      });
      handles.push({ stdout, stderr, settled });
      const reader = source => legacyReader ? { readFrom: source.readFrom.bind(source) } : source;
      return { collected: { stdout: reader(stdout), stderr: reader(stderr) }, done, terminate: abort };
    }
  }
  t.after(async () => {
    for (const handle of handles) handle.settled.resolve({ exitCode: 0, signal: null });
    await ctx.fiber.dispose(); await rm(scratch, { recursive: true, force: true });
  });
  for (const plugin of [Agents, Sessions, Tools, SystemPrompt, ShellEnvRegistry, controlled ? ControlledProcesses : Processes]) await ctx.plugin(plugin, {});
  if (sandbox) {
    await ctx.plugin(Projections); await ctx.plugin(SandboxPolicy, { mode: 'read-only', workspaceRoot: scratch });
    await ctx.plugin(Sandbox, {});
  }
  await ctx.plugin(sandbox ? SandboxPwsh : name === 'pwsh' ? Pwsh : Bash, {});
  if (jobs) await ctx.plugin(Jobs, {});
  let output;
  await ctx.plugin({ inject: ['tools', 'shell', 'agents'], apply(scope) {
    output = new CommandOutput(scope); scope.effect(() => () => output.dispose());
  } });
  await ctx.plugin(name === 'pwsh' ? PwshTool : BashTool, {});
  const ownSession = ctx.sessions.prepare(SessionId('owned'), { meta: { cwd: scratch } });
  const detachSession = ctx.sessions.enter(ownSession); ctx.sessions.announce(ownSession);
  const own = { id: ownSession.id, session: ownSession, ctx, options: {}, status: 'idle' };
  const other = { id: SessionId('other'), session: ctx.sessions.create(SessionId('other')), ctx, options: {}, status: 'idle' };
  const unregister = await ctx.agents.register(own); await ctx.agents.register(other);
  let query;
  if (durable) {
    await ctx.plugin(Jsonl, { root: resolve(scratch, 'sessions'), compression: 'none' });
    query = ctx.plugin(OutputQuery); await query;
  }
  if (jobs) ctx.jobs.attachController('latest-output-test');
  let count = 0;
  const launch = (command, args = {}, rootId) => {
    const callId = 'output-' + ++count, rootCallId = rootId ?? callId;
    const signal = new AbortController(), parameters = { command, description: 'isolated readonly output', workdir: scratch, ...args };
    if (durable) {
      assert.equal(count, 1); assert.equal(rootId, undefined);
      own.session.append('turn/start', { turn: 1 }); own.session.append('step/start', { turn: 1, step: 1 });
      // 只为原格式验证器构造完整工具生命周期，不声称这里进行了模型推理。
      own.session.append('assistant/message', { turn: 1, step: 1, stream: [], message: createAssistantMessage({
        source: { provider: 'output-lifetime-fixture', model: 'no-model' },
        content: [{ type: 'tool-call', id: callId, name, arguments: JSON.stringify(parameters) }],
      }) }, { surfaceOp: 'append' });
    }
    const event = own.session.append('tool/call', { turn: 1, step: 1, name: rootId ? 'run_code' : name,
      callId: rootCallId, arguments: JSON.stringify(parameters) });
    const execution = ctx.tools.execute({ callId, rootCallId, agent: own, name, arguments: parameters, signal: signal.signal });
    const result = !durable ? execution : execution.then(value => {
      own.session.append('tool/result', { turn: 1, step: 1, message: createToolResultMessage({ callId,
        content: value.content, isError: value.isError }) }, { surfaceOp: 'append', sourceEventSeqs: [event.seq] });
      own.session.append('step/end', { turn: 1, step: 1 });
      own.session.append('turn/end', { turn: 1, reason: signal.signal.aborted
        ? { kind: 'aborted', reason: { kind: 'user' } } : { kind: 'completed' } });
      return value;
    });
    const operation = { method: 'remote.commandOutput', sessionId: own.id, callId, rootCallId, rootCallTime: event.time,
      generation: output.generation, stream: 'stdout', fromByte: 0, maxBytes: 65536 };
    return { result, signal, operation, read: more => output.read({ ...operation, ...more }, new AbortController().signal) };
  };
  const retire = async () => {
    assert.equal(durable, true);
    const handle = await ctx.sessionPersistence.create(own.session.header);
    try { await handle.append(own.session.snapshotEvents()); await handle.flush(); }
    finally { await handle.close(); }
    await unregister(); detachSession();
    assert.equal(ctx.agents.get(own.id), undefined); assert.equal(ctx.sessions.get(own.id), undefined);
  };
  return { ctx, output, own, other, handles, launch, scratch, retire, query, unregister, detachSession };
}

test('新版 raw collector：独立复制、UTF-8 分段、真实 spill 与原读取不变', async t => {
  const scratch = await mkdtemp(resolve(runtime, 'collector-'));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  const collector = new OutputCollector(12, 'stdout', { dir: scratch, maxBytes: 4096, onFailure: assert.fail });
  t.after(() => collector.seal());
  collector.push(Buffer.from('前🙂后'));
  const bytes = [];
  for (let from = 0; from < collector.total; from += 2) bytes.push(collector.readBytesFrom(from, 2).bytes);
  assert.equal(Buffer.concat(bytes).toString(), '前🙂后');
  const copy = collector.readBytesFrom(0, 65536); copy.bytes.fill(0);
  assert.equal(collector.readFrom(0).text, '前🙂后');
  const before = collector.snapshot(); collector.readBytesFrom(2, 1); assert.deepEqual(collector.snapshot(), before);
  collector.push(Buffer.from('0123456789abcdef'));
  const cropped = collector.readBytesFrom(0, 3); assert.equal(cropped.lossy, true);
  assert.equal(cropped.startOffset, collector.total - 12); assert.equal(cropped.bytes.length, 3);
  assert.equal(typeof cropped.spillPath, 'string');
  for (const [from, max] of [[-1, 1], [collector.total + 1, 1], [0, 0], [0, 65537]])
    assert.throws(() => collector.readBytesFrom(from, max), /range/);
});

for (const jobs of [false, true]) test(`新版真实 PowerShell ${jobs ? '任务前台' : '直接前台'}：过程读取、双通道、最终结果与身份`, async t => {
  const f = await fixture(t, { jobs }), wrong = createScope(f.ctx, f.other);
  let wrongEvents = 0;
  wrong.ctx.on('tools/shell-output', () => wrongEvents++);
  const run = f.launch('[Console]::Write("前🙂"); Start-Sleep -Milliseconds 800; [Console]::Error.Write("错误"); [Console]::Write("后")');
  const active = await waitForOutput(run);
  assert.equal(active.status, 'running'); assert.equal(Buffer.from(active.data, 'base64').toString(), '前🙂');
  const result = await run.result;
  assert.equal(result.isError, false); assert.equal(result.value.kind, 'foreground');
  assert.equal(result.value.stdout.text, '前🙂后'); assert.equal(result.value.stderr.text, '错误');
  assert.equal(result.value.exitCode, 0); assert.equal(result.value.aborted, false);
  const retained = await run.read({ outputId: active.outputId });
  assert.equal(retained.status, 'completed'); assert.equal(Buffer.from(retained.data, 'base64').toString(), '前🙂后');
  const err = await run.read({ stream: 'stderr' }); assert.equal(Buffer.from(err.data, 'base64').toString(), '错误');
  await assert.rejects(run.read({ sessionId: f.other.id }), /missing/);
  await assert.rejects(run.read({ rootCallTime: run.operation.rootCallTime + 1 }), /stale/);
  assert.equal(wrongEvents, 0);
  if (jobs) assert.equal(f.ctx.jobs.list(f.own.id).length, 0, '原前台完成后移除任务，但聊天输出仍可读取');
});

for (const name of ['bash', 'pwsh']) test(`新版 ${name} 原工具与执行器：受控 provider 的 spill、嵌套调用、拒绝及观察故障`, async t => {
  const f = await fixture(t, { name, controlled: true });
  f.ctx.on('tools/shell-output', () => { throw Error('observer_failed'); });
  f.ctx.on('tools/shell-output', async () => { throw Error('observer_async_failed'); });
  const a = f.launch('fixture', {}, 'ptc-root'), b = f.launch('fixture-two');
  await until(() => f.handles.length, length => length === 2);
  f.handles[0].stdout.push(Buffer.from('完整中文与emoji🙂')); f.handles[1].stdout.push(Buffer.from('second'));
  const read = await a.read(); assert.equal(Buffer.from(read.data, 'base64').toString(), '完整中文与emoji🙂');
  assert.equal(read.lossy, false); assert.equal('spillPath' in read, false);
  const other = await b.read(); assert.notEqual(read.outputId, other.outputId);
  await assert.rejects(a.read({ outputId: other.outputId }), /stale/);
  f.handles[0].settled.resolve({ exitCode: 7, signal: null }); f.handles[1].settled.resolve({ exitCode: 0, signal: null });
  assert.equal((await a.result).value.stdout.truncated, true); await b.result;
  assert.equal((await a.read()).status, 'failed');
  const deny = f.ctx.on('tools/pre-execute', () => ({ kind: 'deny', reason: 'isolated rejection' }));
  const rejected = f.launch('rejected'); assert.equal((await rejected.result).isError, true); deny();
  assert.equal(f.handles.length, 2); await assert.rejects(rejected.read(), /missing/);
  f.output.dispose(); await assert.rejects(a.read(), /stale/);
});

test('新版真实 PowerShell 取消：保留停止前输出，原受管进程结算；无前台背景发布', async t => {
  const f = await fixture(t, { jobs: true });
  const running = f.launch('[Console]::Write("before-stop"); Start-Sleep -Seconds 20');
  await waitForOutput(running);
  running.signal.abort(Error('isolated user stop'));
  assert.equal((await running.result).isError, true);
  assert.equal((await running.read()).status, 'killed');
  assert.equal(Buffer.from((await running.read()).data, 'base64').toString(), 'before-stop');
  const bg = f.launch('[Console]::Write("background-complete")', { run_in_background: true });
  const result = await bg.result; assert.equal(result.value.kind, 'background');
  await f.ctx.jobs.wait(result.value.jobId, 12000, f.own.id);
  assert.equal(f.ctx.jobs.read(result.value.jobId, f.own.id).chunks.map(chunk => chunk.text).join(''), 'background-complete');
  await assert.rejects(bg.read(), /missing/);
});

test('新版 provider 拒绝与旧读者：诊断有界可读，不用消费接口伪造支持', async t => {
  const f = await fixture(t, { controlled: true });
  const failed = f.launch('provider-rejection');
  await until(() => f.handles.length, length => length === 1);
  f.handles[0].settled.reject(Error('isolated provider failure'));
  assert.equal((await failed.result).isError, true);
  const note = await failed.read({ stream: 'stderr' });
  assert.equal(note.status, 'failed'); assert.equal(note.lossy, false);
  assert.match(Buffer.from(note.data, 'base64').toString(), /subprocess failed before reporting an outcome: Error: isolated provider failure/);
  const legacy = await fixture(t, { controlled: true, legacyReader: true });
  const run = legacy.launch('legacy-reader'); await until(() => legacy.handles.length, length => length === 1);
  legacy.handles[0].stdout.push(Buffer.from('original-model-output'));
  assert.equal((await run.read()).state, 'unsupported');
  legacy.handles[0].settled.resolve({ exitCode: 0, signal: null });
  assert.equal((await run.result).value.stdout.text, 'model-output');
});

test('新版原 Windows 只读沙箱：UTF-8 双通道观察，写入仍被原策略拒绝', async t => {
  const f = await fixture(t, { sandbox: true });
  const run = f.launch('Write-Output "只读中文🙂"; Write-Error "只读错误" -ErrorAction Continue; Set-Content -LiteralPath "denied.txt" -Value "unexpected"');
  const result = await run.result;
  assert.equal(result.isError, false, JSON.stringify(result.content));
  assert.equal(result.value.sandbox.mode, 'read-only'); assert.equal(result.value.sandbox.denied, true);
  assert.match(result.value.stdout.text, /只读中文🙂/); assert.match(result.value.stderr.text, /只读错误/);
  assert.match(Buffer.from((await run.read()).data, 'base64').toString(), /只读中文🙂/);
  assert.match(Buffer.from((await run.read({ stream: 'stderr' })).data, 'base64').toString(), /只读错误/);
  await assert.rejects(access(resolve(f.scratch, 'denied.txt')), { code: 'ENOENT' });
});

test('新版真实命令停止后释放 Agent/Session：原 JSONL 冷身份核验与独立输出重读', async t => {
  const f = await fixture(t, { durable: true });
  const run = f.launch('Write-Output "retired中文🍀"; Start-Sleep -Seconds 20');
  const active = await waitForOutput(run);
  run.signal.abort(Error('readonly child stop'));
  assert.equal((await run.result).isError, true);
  await f.retire();
  const original = await f.ctx.sessionQuery.observeSession(f.own.id, { projectionMode: 'none' });
  try { assert.equal(original.source, 'prepared');
    assert.deepEqual(original.header, { ...f.own.session.header, delegationDepth: 0 }); }
  finally { original[Symbol.dispose](); }
  const retained = await run.read({ outputId: active.outputId });
  assert.equal(retained.status, 'killed');
  assert.match(Buffer.from(retained.data, 'base64').toString(), /retired中文🍀/);
  assert.equal(f.ctx.agents.get(f.own.id), undefined, '冷读取不重建原 Agent');
  await assert.rejects(run.read({ rootCallTime: run.operation.rootCallTime + 1 }), /stale/);
  await assert.rejects(run.read({ outputId: 'wrong-output' }), /stale/);
  await assert.rejects(run.read({ sessionId: f.other.id }), /missing/);
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(f.output.read(run.operation, cancelled.signal));
});

test('新版已结算输出：同编号原会话的 header 或根调用变化均拒绝旧字节', async t => {
  for (const changed of ['header', 'root']) {
    const f = await fixture(t, { durable: true, controlled: true });
    const run = f.launch('readonly identity probe');
    await until(() => f.handles.length, length => length === 1);
    f.handles[0].stdout.push(Buffer.from('retained output'));
    f.handles[0].settled.resolve({ exitCode: 0, signal: null }); await run.result;
    const events = structuredClone(f.own.session.snapshotEvents());
    await f.retire();
    assert.equal((await run.read()).status, 'completed');
    const meta = { ...f.own.session.header };
    if (changed === 'header') meta.createdAt++;
    else events.find(event => event.type === 'tool/call').data.arguments = '{"command":"different"}';
    f.ctx.sessions.create(f.own.id, { meta, seed: events });
    await assert.rejects(run.read(), /stale/);
    assert.equal(f.ctx.agents.get(f.own.id), undefined);
  }
});

test('新版输出身份服务卸载：已结算字节失效，重新注册不会复活旧输出', async t => {
  const f = await fixture(t, { durable: true, controlled: true });
  const run = f.launch('readonly lifetime probe');
  await until(() => f.handles.length, length => length === 1);
  f.handles[0].stdout.push(Buffer.from('retained output'));
  f.handles[0].settled.resolve({ exitCode: 0, signal: null }); await run.result; await f.retire();
  assert.equal((await run.read()).status, 'completed');
  await f.query.dispose(); await assert.rejects(run.read(), /missing|stale/);
  await f.ctx.plugin(OutputQuery); await assert.rejects(run.read(), /missing/);
});

test('新版未结束命令仍按原生命周期失效；不把被释放的运行项当作历史输出', async t => {
  const f = await fixture(t, { durable: true, controlled: true });
  const run = f.launch('readonly running probe');
  await until(() => f.handles.length, length => length === 1);
  f.handles[0].stdout.push(Buffer.from('running output')); await run.read();
  await f.unregister(); f.detachSession();
  await assert.rejects(run.read(), /missing/);
  run.signal.abort(Error('test cleanup')); await run.result;
});

test('新版已结算输出保持30分钟上限；到期后原历史仍可读而输出失效', async t => {
  const f = await fixture(t, { durable: true, controlled: true });
  const run = f.launch('readonly expiry probe');
  await until(() => f.handles.length, length => length === 1);
  f.handles[0].stdout.push(Buffer.from('retained output'));
  f.handles[0].settled.resolve({ exitCode: 0, signal: null }); await run.result; await f.retire();
  assert.equal((await run.read()).status, 'completed');
  const later = Date.now() + 30 * 60 * 1000 + 1; t.mock.method(Date, 'now', () => later);
  await assert.rejects(run.read(), /missing/);
  const original = await f.ctx.sessionQuery.observeSession(f.own.id, { projectionMode: 'none' });
  try { assert.equal(original.source, 'prepared'); } finally { original[Symbol.dispose](); }
});
