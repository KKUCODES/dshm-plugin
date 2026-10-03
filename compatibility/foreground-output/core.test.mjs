import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Context, Service } from '@deepseek-ai/cordis';
import { changes, applyForegroundChange } from './changes.mjs';
import { sourceRoot } from '../background-output/prepare.mjs';
import { outputRoot } from './build-test-runtime.mjs';
import { OutputCollector, LocalBashExecutor, PwshLocalExecutor, SandboxBashExecutor, SandboxPwshExecutor } from '../../artifacts/compatibility/foreground-output/test-runtime.mjs';

const executors = [['bash', LocalBashExecutor], ['pwsh', PwshLocalExecutor],
  ['bash-sandbox', SandboxBashExecutor, true], ['pwsh-sandbox', SandboxPwshExecutor, true]];

async function setup(Executor, sandboxed, options = {}) {
  const ctx = new Context(), scopes = [], done = Promise.withResolvers();
  const dir = await mkdtemp(resolve(outputRoot, 'collector-'));
  const stdout = new OutputCollector(1024, 4096, 'stdout', dir), stderr = new OutputCollector(1024, 4096, 'stderr', dir);
  const state = { starts: 0, confines: 0 };
  class Process extends Service {
    constructor(ctx) { super(ctx, 'subprocess'); }
    spawn(spec) {
      state.starts++; state.spec = spec;
      if (options.spawnError) throw Error('provider failed');
      if (sandboxed) assert.equal(spec.argv[0], 'fixture-confined');
      const abort = () => done.resolve({ exitCode: null, signal: 'SIGTERM' });
      if (spec.signal.aborted) abort(); else spec.signal.addEventListener('abort', abort, { once: true });
      void done.promise.then(() => spec.signal.removeEventListener('abort', abort), () => spec.signal.removeEventListener('abort', abort));
      const legacy = reader => ({ readFrom: reader.readFrom.bind(reader), snapshot: reader.snapshot.bind(reader) });
      return { collected: options.legacy ? { stdout: legacy(stdout), stderr: legacy(stderr) } : { stdout, stderr }, done: done.promise };
    }
  }
  scopes.push(ctx.plugin(Process)); await scopes.at(-1).await();
  if (sandboxed) {
    class Policy extends Service {
      constructor(ctx) { super(ctx, 'sandboxPolicy'); }
      defaultMode = 'read-only'; resolve() { return { mode: 'read-only', cwd: outputRoot }; }
    }
    class Sandbox extends Service {
      constructor(ctx) { super(ctx, 'sandbox'); }
      async confine(argv, policy) {
        state.confines++; assert.equal(policy.mode, 'read-only');
        if (options.preparation) return options.preparation;
        return { argv: ['fixture-confined', ...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] };
      }
    }
    scopes.push(ctx.plugin(Policy), ctx.plugin(Sandbox));
    await Promise.all(scopes.slice(-2).map(scope => scope.await()));
  }
  scopes.push(ctx.plugin(Executor, {})); await scopes.at(-1).await();
  return { ctx, stdout, stderr, done, state, async close() {
    done.resolve({ exitCode: 0, signal: null });
    for (const scope of scopes.toReversed()) await scope.dispose();
    stdout.seal(); stderr.seal();
  } };
}
const asText = value => Buffer.from(value.bytes).toString();

test('组合补丁只接受原基线，兼容 CRLF，拒绝未知修改和重复输入', async () => {
  for (const change of changes) {
    const text = await readFile(resolve(sourceRoot, change.path), 'utf8');
    const result = applyForegroundChange(change, text);
    assert.deepEqual(result, applyForegroundChange(change, text.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n')));
    assert.throws(() => applyForegroundChange(change, text + '\n'), /Baseline mismatch/);
    assert.throws(() => applyForegroundChange(change, result.modified), /Baseline mismatch/);
  }
});

for (const [name, Executor, sandboxed] of executors) {
  test(`${name}: 结束前读取分段 stdout/stderr/ANSI，独立读取不改变原结果或执行参数`, async () => {
    const fixture = await setup(Executor, sandboxed), published = Promise.withResolvers();
    try {
      const controller = new AbortController(); let observations = 0;
      const spec = fixture.ctx.shell.resolve({ command: 'fixture', workdir: outputRoot, timeoutMs: 5000, signal: controller.signal,
        observeOutput: output => { observations++; published.resolve(output); } });
      const pending = fixture.ctx.shell.run(spec); let settled = false; void pending.then(() => { settled = true; });
      const output = await published.promise;
      assert.equal(observations, 1); assert.equal(settled, false); assert.equal(fixture.state.starts, 1);
      assert.equal(fixture.state.confines, sandboxed ? 1 : 0);
      assert.equal(fixture.state.spec.env.NO_COLOR, '1'); assert.equal(fixture.state.spec.cwd, outputRoot);
      assert.deepEqual(Object.keys(output).sort(), ['stderr', 'stdout']);
      assert.deepEqual(Object.keys(output.stdout), ['readBytesFrom']);
      assert.ok(Object.isFrozen(output)); assert.ok(Object.isFrozen(output.stdout));
      const text = '\u001b[31m开始中文🙂\u001b[0m\n', bytes = Buffer.from(text), decoder = new TextDecoder();
      let observed = '', offset = 0;
      for (const byte of bytes) {
        fixture.stdout.push(Buffer.from([byte])); const read = output.stdout.readBytesFrom(offset, 1);
        observed += decoder.decode(read.bytes, { stream: true }); offset = read.nextOffset;
      }
      assert.equal(observed + decoder.decode(), text);
      fixture.stderr.push(Buffer.from('错误中文'));
      assert.equal(asText(output.stderr.readBytesFrom(0, 65536)), '错误中文');
      const copy = output.stdout.readBytesFrom(0, 65536); copy.bytes.fill(0);
      assert.equal(asText(output.stdout.readBytesFrom(0, 65536)), text);
      assert.throws(() => output.stdout.readBytesFrom(0, 65537), /invalid independent/);
      fixture.stdout.push(Buffer.from('完成')); fixture.done.resolve({ exitCode: 7, signal: null });
      const result = await pending;
      assert.equal(result.exitCode, 7); assert.equal(result.stdout.text, text + '完成'); assert.equal(result.stderr.text, '错误中文');
      assert.equal(result.timedOut, false); assert.equal(result.aborted, false);
      assert.equal(asText(output.stdout.readBytesFrom(offset, 65536)), '完成');
    } finally { await fixture.close(); }
  });

  test(`${name}: 观察器抛错/拒绝/不结束都不遗弃命令，超时与调用方取消保持首因语义`, async () => {
    for (const [observeOutput, cancel] of [[() => { throw Error('observer'); }, false], [async () => { throw Error('async observer'); }, false], [() => new Promise(() => {}), true]]) {
      const fixture = await setup(Executor, sandboxed), controller = new AbortController();
      try {
        const pending = fixture.ctx.shell.run(fixture.ctx.shell.resolve({ command: 'fixture', workdir: outputRoot,
          timeoutMs: cancel ? 5000 : 20, signal: controller.signal, observeOutput }));
        // 保持测试循环活跃；deadline 的定时器按原实现 unref。
        const keepAlive = delay(35);
        if (cancel) { await delay(2); controller.abort(); }
        const result = await pending; await keepAlive;
        assert.equal(result.aborted, cancel); assert.equal(result.timedOut, !cancel);
        assert.equal(result.exitCode, null); assert.equal(fixture.state.starts, 1);
      } finally { await fixture.close(); }
    }
  });
}

for (const [name, Executor, sandboxed] of executors.filter(row => row[2])) {
  test(`${name}: 沙箱准备超时不发布输出且不启动进程`, async () => {
    const fixture = await setup(Executor, sandboxed, { preparation: new Promise(() => {}) });
    let observations = 0;
    try {
      const keepAlive = delay(40);
      const result = await fixture.ctx.shell.run(fixture.ctx.shell.resolve({ command: 'fixture', workdir: outputRoot, timeoutMs: 20,
        observeOutput: () => { observations++; } }));
      await keepAlive; assert.equal(result.timedOut, true); assert.equal(fixture.state.starts, 0); assert.equal(observations, 0);
    } finally { await fixture.close(); }
  });
}

test('旧 provider 缺少独立读取时不调用消费接口；后台 start 不触发前台观察器', async () => {
  const fixture = await setup(PwshLocalExecutor, false, { legacy: true });
  try {
    let output;
    const pending = fixture.ctx.shell.run(fixture.ctx.shell.resolve({ command: 'fixture', workdir: outputRoot, observeOutput: value => { output = value; } }));
    assert.equal(output.stdout.readBytesFrom, undefined); assert.equal(output.stderr.readBytesFrom, undefined);
    fixture.done.resolve({ exitCode: 0, signal: null }); await pending;
    let calls = 0;
    const process = await fixture.ctx.shell.start(fixture.ctx.shell.resolve({ command: 'fixture', workdir: outputRoot,
      signal: new AbortController().signal, observeOutput: () => { calls++; } }));
    await process.done; assert.equal(calls, 0);
  } finally { await fixture.close(); }
});

test('provider 启动失败保持原拒绝，不发布错误进程或重试', async () => {
  const fixture = await setup(PwshLocalExecutor, false, { spawnError: true }); let calls = 0;
  try {
    await assert.rejects(fixture.ctx.shell.run(fixture.ctx.shell.resolve({ command: 'fixture', workdir: outputRoot,
      observeOutput: () => { calls++; } })), /provider failed/);
    assert.equal(calls, 0); assert.equal(fixture.state.starts, 1);
  } finally { await fixture.close(); }
});

test('provider 在发布后拒绝仍沿原 run 拒绝，不受未完成观察器影响', async () => {
  const fixture = await setup(PwshLocalExecutor, false); let calls = 0;
  try {
    const pending = fixture.ctx.shell.run(fixture.ctx.shell.resolve({ command: 'fixture', workdir: outputRoot,
      observeOutput: () => { calls++; return new Promise(() => {}); } }));
    const rejected = assert.rejects(pending, /provider lost/);
    fixture.done.reject(Error('provider lost')); await rejected;
    assert.equal(calls, 1); assert.equal(fixture.state.starts, 1);
  } finally { await fixture.close(); }
});
