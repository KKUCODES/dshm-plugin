import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareLatestToolCancellation } from '../compatibility/latest-upstream/tool-cancellation.mjs';

const sourceRoot = process.env.DSHM_LATEST_SOURCE_ROOT;
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const require = createRequire(resolve(runtime, 'package.json'));
if (sourceRoot === undefined) await prepareLatestToolCancellation();
const entries = {
  '@deepseek-ai/cordis': 'vendor/cordis/src/index.ts',
  '@deepseek-ai/dsh-tools': 'packages/core/tools/src/index.ts',
  '@deepseek-ai/dsh-system-prompt': 'packages/core/system-prompt/src/index.ts',
  '@deepseek-ai/dsh-ptc-runtime': 'packages/ptc-runtime/ptc-runtime/src/index.ts',
};
const load = name => import(pathToFileURL(sourceRoot === undefined
  ? require.resolve(name) : resolve(sourceRoot, entries[name])).href);
const [{ Context }, { default: Tools, defineContentToolFixture }, { default: SystemPrompt }, { PtcRuntime }] = await Promise.all([
  load('@deepseek-ai/cordis'), load('@deepseek-ai/dsh-tools'), load('@deepseek-ai/dsh-system-prompt'), load('@deepseek-ai/dsh-ptc-runtime'),
]);

// 原工具调度器接入可控PTC provider，仅驱动取消时序；不冒充真实模型或沙箱执行。
class ControlledRuntime extends PtcRuntime {
  language = 'typescript';
  isolation = 'controlled';
  resolve(request) { return { ...request, cwd: request.cwd ?? process.cwd(), timeoutMs: request.timeoutMs ?? 120000 }; }
  run(request) { return this.behavior(request); }
}
async function fixture(t) {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  await ctx.plugin(SystemPrompt, {}); await ctx.plugin(Tools, { mode: 'ptc' }); await ctx.plugin(ControlledRuntime, {});
  const events = [], agent = { session: { header: {}, append: (type, data) => events.push({ type, data }) } };
  const run = signal => ctx.tools.execute({ name: 'run_code', callId: 'cancellation-test',
    arguments: { code: 'controlled-provider', description: 'Cancellation regression' },
    agent, signal: signal ?? new AbortController().signal });
  return { ctx, runtime: ctx.ptcRuntime, events, run };
}

for (const kind of ['abort', 'timeout', 'exception']) test(`新版PTC ${kind}：结构化分类与已有输出保留`, async t => {
  const f = await fixture(t);
  f.runtime.behavior = async () => ({ logs: ['before-stop🙂'], error: { kind, message: 'controlled outcome' } });
  const result = await f.run();
  assert.equal(result.isError, true);
  assert.deepEqual(result.error.info, { name: kind === 'abort' ? 'AbortError' : 'CodeRunFailedError',
    code: kind === 'abort' ? 'ABORTED' : 'CODE_RUN_FAILED' });
  assert.match(result.content[0].text, /before-stop🙂/);
});

for (const kind of ['reason', 'independent']) test(`新版PTC内部抛出${kind}：取消原因身份与独立故障`, async t => {
  const f = await fixture(t), controller = new AbortController(), started = Promise.withResolvers();
  const failure = Error('independent tool failure');
  f.ctx.tools.register(defineContentToolFixture({ name: 'wait_cancel', description: 'Wait for stop', parameters: {},
    async execute(_args, exec) {
      started.resolve();
      await new Promise((_resolve, reject) => {
        const abort = () => reject(kind === 'reason' ? exec.signal.reason : failure);
        if (exec.signal.aborted) abort(); else exec.signal.addEventListener('abort', abort, { once: true });
      });
      return [];
    },
  }));
  f.runtime.behavior = async request => {
    const pending = request.bindings[0].functions.wait_cancel({}).catch(() => undefined);
    await started.promise; controller.abort({ type: 'user-stop' }); await pending;
    return { logs: [], error: { kind: 'abort', message: 'user-stop' } };
  };
  await f.run(controller.signal);
  const settled = f.events.filter(event => event.type === 'tool/ptc-dispatch');
  assert.equal(settled.length, 1); assert.equal(settled[0].data.isError, true);
  if (kind === 'reason') assert.equal(settled[0].data.error.code, 'ABORTED');
  else {
    assert.notEqual(settled[0].data.error?.code, 'ABORTED');
    assert.deepEqual(settled[0].data.content, [{ type: 'text', text: 'Error: independent tool failure' }]);
  }
});
