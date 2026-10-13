import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareLatestToolCancellation } from '../compatibility/latest-upstream/tool-cancellation.mjs';

const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const require = createRequire(resolve(runtime, 'package.json'));
const sourceRoot = process.env.DSHM_LATEST_SOURCE_ROOT;
if (sourceRoot === undefined) await prepareLatestToolCancellation();
const entries = {
  cordis: 'vendor/cordis/src/index.ts',
  'dsh-agent': 'packages/core/agent/src/index.ts',
  'dsh-session': 'packages/core/session/src/index.ts',
  'dsh-tools': 'packages/core/tools/src/index.ts',
  'dsh-system-prompt': 'packages/core/system-prompt/src/index.ts',
  'dsh-fs-local': 'packages/fs/fs-local/src/index.ts',
  'dsh-subprocess-local': 'packages/subprocess/subprocess-local/src/index.ts',
  'dsh-sandbox-local': 'packages/sandbox/sandbox-local/src/index.ts',
  'dsh-session-projection': 'packages/session/session-projection/src/index.ts',
  'dsh-sandbox-policy': 'packages/sandbox/sandbox-policy/src/index.ts',
  'dsh-ptc-runtime-node': 'packages/ptc-runtime/ptc-runtime-node/src/index.ts',
};
const load = name => import(pathToFileURL(sourceRoot === undefined
  ? require.resolve('@deepseek-ai/' + name) : resolve(sourceRoot, entries[name])).href);
const [{ Context }, { default: Agents }, { default: Sessions, SessionId }, { default: Tools, defineContentToolFixture },
  { default: SystemPrompt }, { default: Fs }, { default: Subprocess }, { default: Sandbox },
  { default: Projections }, { default: Policy }, { default: NodeRuntime }] = await Promise.all([
  'cordis', 'dsh-agent', 'dsh-session', 'dsh-tools', 'dsh-system-prompt', 'dsh-fs-local',
  'dsh-subprocess-local', 'dsh-sandbox-local', 'dsh-session-projection', 'dsh-sandbox-policy', 'dsh-ptc-runtime-node',
].map(load));
const report = { at: new Date().toISOString(), version: '0.2.1-alpha.1',
  scope: sourceRoot === undefined ? 'published-tool-dispatch-and-real-node-process' : 'source-tool-dispatch-and-real-node-process',
  inferenceVerified: false, cases: [], passed: false };
test.after(async () => {
  report.passed = report.cases.length === 3;
  await writeFile(resolve(runtime, 'tool-cancellation/' + (sourceRoot === undefined ? 'process-report.json' : 'source-process-report.json')),
    JSON.stringify(report, null, 2) + '\n');
});

for (const kind of ['stop', 'timeout', 'exception']) test(`新版真实Node PTC进程 ${kind}：分类、输出与进程退出`, { timeout: 20000 }, async t => {
  const parent = resolve(runtime, 'tool-cancellation');
  await mkdir(parent, { recursive: true });
  const scratch = await mkdtemp(resolve(parent, 'process-'));
  const ctx = new Context(), controller = new AbortController();
  let pending, completed;
  t.after(async () => {
    controller.abort('test cleanup');
    if (pending) await pending;
    await ctx.fiber.dispose();
    assert.equal(scratch.startsWith(parent + '\\') || scratch.startsWith(parent + '/'), true);
    await rm(scratch, { recursive: true, force: true });
    if (completed) report.cases.push(completed);
  });
  for (const plugin of [Agents, Sessions, SystemPrompt, Fs, Subprocess, Sandbox, Projections]) await ctx.plugin(plugin, {});
  await ctx.plugin(Policy, { mode: 'read-only', workspaceRoot: scratch });
  await ctx.plugin(Tools, { mode: 'ptc' });
  await ctx.plugin(NodeRuntime, { timeoutMs: kind === 'timeout' ? 1500 : 10000, maxOutputBytes: 65536, graceMs: 2000 });
  const id = SessionId('real-ptc-' + kind), agent = { id,
    session: ctx.sessions.create(id, { meta: { cwd: scratch } }), ctx, options: {}, status: 'idle' };
  await ctx.agents.register(agent);
  const started = Promise.withResolvers();
  ctx.tools.register(defineContentToolFixture({ name: 'ready', description: 'Confirm controlled process startup', parameters: {},
    async execute() { started.resolve(); return []; } }));
  const program = 'console.log("PTC_PID:" + process.pid); console.log("before-result🙂"); '
    + (kind === 'exception' ? 'throw new Error("real-program-failure");'
      : 'await tools.ready({}); await new Promise(resolve => setTimeout(resolve, 20000)); return "unexpected";');
  pending = ctx.tools.execute({ name: 'run_code', callId: id, agent, signal: controller.signal,
    arguments: { code: program, description: 'Isolated native cancellation validation' } });
  if (kind === 'stop') {
    const timer = setTimeout(() => started.reject(Error('native process did not reach binding')), 8000);
    try { await started.promise; } finally { clearTimeout(timer); }
    controller.abort(Error('isolated user stop'));
  }
  const result = await pending;
  assert.equal(result.isError, true);
  assert.deepEqual(result.error.info, { name: kind === 'stop' ? 'AbortError' : 'CodeRunFailedError',
    code: kind === 'stop' ? 'ABORTED' : 'CODE_RUN_FAILED' });
  const text = result.content[0].text;
  assert.match(text, /before-result🙂/);
  assert.match(text, /File sandbox: read-only/);
  if (kind === 'timeout') assert.match(text, /code run failed \(timeout\)/);
  if (kind === 'exception') assert.match(text, /real-program-failure/);
  const pid = Number(text.match(/PTC_PID:(\d+)/)?.[1]);
  assert.ok(Number.isSafeInteger(pid) && pid > 0 && pid !== process.pid);
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  completed = { kind, pid, processExited: true, error: result.error.info, outputPreserved: true,
    sandbox: 'read-only', passed: true };
});
