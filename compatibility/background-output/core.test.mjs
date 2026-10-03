import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Context, Service } from '@deepseek-ai/cordis';
import AgentRegistry from '@deepseek-ai/dsh-agent';
import { Session, SessionId } from '@deepseek-ai/dsh-session';
import { changes } from './changes.mjs';
import { applyChange, sourceRoot, outputRoot } from './prepare.mjs';
import { OutputCollector, LocalJobRegistry, bashProcessJob, pwshProcessJob, LocalBashExecutor, PwshLocalExecutor, SandboxBashExecutor, SandboxPwshExecutor } from '../../artifacts/compatibility/background-output/test-runtime.mjs';

const request = (fromByte = 0, maxBytes = 65536, stream = 'stdout') => ({ fromByte, maxBytes, stream });
const makeCollector = async (max = 1024, spill = 4096) => new OutputCollector(max, spill, 'test', await mkdtemp(resolve(outputRoot, 'spill-')));

test('十个基线文件必须匹配；拒绝修改后及重复应用，兼容 CRLF', async () => {
  for (const change of changes) {
    const original = await readFile(resolve(sourceRoot, change.path), 'utf8');
    const result = applyChange(change, original);
    assert.notEqual(result, original.replaceAll('\r\n', '\n'));
    assert.equal(result, applyChange(change, original.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n')));
    assert.throws(() => applyChange(change, original + '\n'), /Baseline mismatch/);
    assert.throws(() => applyChange(change, result), /Baseline mismatch/);
  }
});

test('原始字节连续解码跨分片中文；独立读者不改变模型输出，返回数据不可污染缓存', async () => {
  const collector = await makeCollector();
  const original = Buffer.from('开始🙂中文\n结束');
  const decoder = new TextDecoder(); let text = '', offset = 0;
  for (const byte of original) {
    collector.push(Buffer.from([byte]));
    const read = collector.readBytesFrom(offset, 1);
    text += decoder.decode(read.bytes, { stream: true }); offset = read.nextOffset;
    assert.equal(read.lossy, false);
  }
  text += decoder.decode(); assert.equal(text, original.toString());
  const model = collector.readFrom(0);
  assert.equal(model.text, original.toString());
  const another = collector.readBytesFrom(0, 65536); another.bytes.fill(0);
  assert.equal(collector.readFrom(0).text, model.text);
  assert.equal(collector.readBytesFrom(offset, 1).bytes.length, 0);
  for (const [from, limit] of [[-1, 1], [offset + 1, 1], [0, 0], [0, 65537], [NaN, 1], [0, 1.5]]) {
    assert.throws(() => collector.readBytesFrom(from, limit), /invalid independent/);
  }
  collector.seal();
});

test('内存尾部丢失明确标记，原 spill 保留完整字节；超过 cap 不伪造完整内容', async () => {
  const collector = await makeCollector(4, 12);
  collector.push(Buffer.from('012')); collector.push(Buffer.from('345678'));
  const read = collector.readBytesFrom(0, 2);
  assert.deepEqual([...read.bytes], [...Buffer.from('56')]);
  assert.equal(read.startOffset, 5); assert.equal(read.nextOffset, 7); assert.equal(read.totalBytes, 9);
  assert.equal(read.lossy, true); assert.ok(read.spillPath);
  assert.equal(await readFile(read.spillPath, 'utf8'), '012345678');
  collector.push(Buffer.from('9abc'));
  const lost = collector.readBytesFrom(0, 4);
  assert.equal(lost.lossy, true); assert.equal(lost.spillPath, undefined);
  assert.equal(Buffer.from(lost.bytes).toString(), '9abc'); collector.seal();
});

for (const [name, processJob] of [['bash', bashProcessJob], ['pwsh', pwshProcessJob]]) {
  test(`${name} 生产者从准备到运行和结束独立读取；原消费接口只在模型调用时使用`, async () => {
    const prepared = Promise.withResolvers(), completed = Promise.withResolvers();
    const stdout = await makeCollector(), stderr = await makeCollector();
    let modelReads = 0;
    const process = { status: 'running', exitCode: null, signal: null,
      done: completed.promise, collected: { stdout, stderr }, kill() {}, readOutput() { modelReads++; return 'model'; } };
    const hooks = processJob(() => prepared.promise, process => process.readOutput());
    assert.equal(hooks.readOutputBytes(request()).state, 'pending');
    prepared.resolve(process); await Promise.resolve();
    stdout.push(Buffer.from('中文')); stderr.push(Buffer.from('err'));
    assert.equal(Buffer.from(hooks.readOutputBytes(request()).bytes).toString(), '中文');
    assert.equal(Buffer.from(hooks.readOutputBytes(request(0, 2, 'stderr')).bytes).toString(), 'er');
    assert.equal(modelReads, 0); assert.equal(hooks.readOutput(), 'model'); assert.equal(modelReads, 1);
    process.status = 'completed'; process.exitCode = 0; completed.resolve(); await hooks.done;
    assert.equal(Buffer.from(hooks.readOutputBytes(request()).bytes).toString(), '中文');
    stdout.seal(); stderr.seal();
    const failure = processJob(async () => { throw Error('preparation failed'); }, () => { throw Error('must not consume'); });
    assert.equal((await failure.done).status, 'failed'); assert.equal(failure.readOutputBytes(request()).state, 'unsupported');
    const unsupported = processJob(async () => ({ ...process, collected: undefined }), () => 'model');
    await unsupported.done; assert.equal(unsupported.readOutputBytes(request()).state, 'unsupported');
  });
}

test('原注册表保持会话隔离、生命周期与完成通知；独立读取不修改 reported', async () => {
  const ctx = new Context(); const agents = ctx.plugin(AgentRegistry), jobs = ctx.plugin(LocalJobRegistry, {});
  await agents.await(); await jobs.await();
  const ownScope = ctx.plugin(() => {}), otherScope = ctx.plugin(() => {});
  await ownScope.await(); await otherScope.await();
  const makeAgent = (id, ctx) => ({ id: SessionId(id), session: Session.create(SessionId(id)), ctx, options: {}, status: 'idle' });
  const own = makeAgent('bytes-own', ownScope.ctx), other = makeAgent('bytes-other', otherScope.ctx);
  const offOwn = await ctx.agents.register(own), offOther = await ctx.agents.register(other);
  const offController = ctx.jobs.attachController('bytes-test');
  const done = Promise.withResolvers(); const collector = await makeCollector();
  collector.push(Buffer.from('模型和手机同时读取')); let consumed = 0, notices = 0;
  const offNotice = ctx.jobs.onJobDone(snapshot => { notices++; assert.equal(snapshot.reported, false); });
  const id = ctx.jobs.start({ kind: 'bash', label: 'independent', owner: own, run: () => ({
    done: done.promise, cancel: () => done.resolve({ status: 'killed' }),
    readOutput: () => { consumed++; return collector.readFrom(0).text; },
    readOutputBytes: req => ({ state: 'available', ...collector.readBytesFrom(req.fromByte, req.maxBytes) }),
  }) });
  try {
    assert.throws(() => ctx.jobs.readOutputBytes(id, request(), other), /another session/);
    assert.throws(() => ctx.jobs.readOutputBytes(id, request()), /another session/);
    assert.throws(() => ctx.jobs.readOutputBytes(id, request(0, 999999), own), /invalid independent/);
    for (let i = 0; i < 2; i++) assert.equal(Buffer.from(ctx.jobs.readOutputBytes(id, request(), own).output.bytes).toString(), '模型和手机同时读取');
    assert.equal(consumed, 0); assert.equal(ctx.jobs.get(id, own).reported, false);
    done.resolve({ status: 'completed' }); await Promise.resolve();
    assert.equal(notices, 1); assert.equal(ctx.jobs.readOutputBytes(id, request(), own).snapshot.reported, false);
    assert.equal(ctx.jobs.read(id, own).text, '模型和手机同时读取'); assert.equal(consumed, 1);
    assert.equal(ctx.jobs.get(id, own).reported, true);
    offNotice();
    const final = ctx.jobs.start({ kind: 'subagent', label: 'final-only', owner: own, run: () => ({ cancel() {}, done: Promise.resolve({ status: 'completed', output: '最终回复' }) }) });
    assert.equal(ctx.jobs.readOutputBytes(final, request(), own).output.state, 'pending'); await Promise.resolve();
    assert.equal(Buffer.from(ctx.jobs.readOutputBytes(final, request(), own).output.bytes).toString(), '最终回复');
    assert.equal(ctx.jobs.get(final, own).reported, false);
    const old = ctx.jobs.start({ kind: 'bash', label: 'legacy', owner: own, run: () => ({ cancel() {}, done: Promise.resolve({ status: 'completed' }), readOutput() { throw Error('must not consume'); } }) });
    assert.equal(ctx.jobs.readOutputBytes(old, request(), own).output.state, 'unsupported'); await Promise.resolve();
    await ownScope.dispose(); assert.throws(() => ctx.jobs.readOutputBytes(id, request(), own), /unknown job/);
  } finally {
    done.resolve({ status: 'killed' }); await Promise.resolve(); offNotice();
    await otherScope.dispose(); await ownScope.dispose(); await offOther(); await offOwn(); offController(); await jobs.dispose(); await agents.dispose(); collector.seal();
  }
});

for (const [name, Executor, sandboxed] of [['bash', LocalBashExecutor], ['pwsh', PwshLocalExecutor], ['bash-sandbox', SandboxBashExecutor, true], ['pwsh-sandbox', SandboxPwshExecutor, true]]) {
  test(`${name} executor 传递自己的 collector，不新增消费或替换进程`, async () => {
    const ctx = new Context(); const stdout = await makeCollector(), stderr = await makeCollector();
    const done = Promise.withResolvers(); let starts = 0, confined = 0;
    // 执行器单元边界，不称为真实原生进程验收。
    class TestSubprocess extends Service {
      constructor(ctx) { super(ctx, 'subprocess'); }
      spawn(spec) {
        starts++; if (sandboxed) assert.equal(spec.argv[0], 'test-confined-runner');
        return { collected: { stdout, stderr }, done: done.promise, terminate() { done.resolve({ exitCode: null, signal: 'SIGTERM' }); } };
      }
    }
    const subprocess = ctx.plugin(TestSubprocess); await subprocess.await();
    const services = [];
    if (sandboxed) {
      class TestPolicy extends Service {
        constructor(ctx) { super(ctx, 'sandboxPolicy'); }
        defaultMode = 'read-only'; resolve() { return { mode: 'read-only', cwd: outputRoot }; }
      }
      class TestSandbox extends Service {
        constructor(ctx) { super(ctx, 'sandbox'); }
        async confine(argv, policy) {
          confined++; assert.equal(policy.mode, 'read-only');
          return { argv: ['test-confined-runner', ...argv], enforcement: 'full', denialSignatures: [], runnerFailureRules: [] };
        }
      }
      services.push(ctx.plugin(TestPolicy), ctx.plugin(TestSandbox));
      for (const service of services) await service.await();
    }
    const fiber = ctx.plugin(Executor, {}); await fiber.await();
    try {
      const process = await ctx.shell.start(ctx.shell.resolve({ command: 'fixture', workdir: outputRoot }));
      stdout.push(Buffer.from('原始输出'));
      assert.equal(process.collected.stdout, stdout); assert.equal(starts, 1); assert.equal(confined, sandboxed ? 1 : 0);
      assert.equal(Buffer.from(process.collected.stdout.readBytesFrom(0, 65536).bytes).toString(), '原始输出');
      assert.equal(process.readOutput().delta, '原始输出'); assert.equal(process.readOutput().delta, '');
      done.resolve({ exitCode: 0, signal: null }); await process.done;
      assert.equal(process.status, 'completed'); assert.equal(process.collected.stdout.readBytesFrom(0, 65536).lossy, false);
      if (sandboxed) assert.equal(process.sandbox.mode, 'read-only');
    } finally {
      done.resolve({ exitCode: 0, signal: null }); await fiber.dispose();
      for (const service of services) await service.dispose();
      await subprocess.dispose(); stdout.seal(); stderr.seal();
    }
  });
}

test('准备取消不启动替代任务；结束后独立输出仍保留，停止不重复', async () => {
  for (const processJob of [bashProcessJob, pwshProcessJob]) {
    let calls = 0;
    const cancelled = processJob(signal => {
      calls++; return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('cancelled')), { once: true }));
    }, () => { throw Error('must not consume'); });
    cancelled.cancel(); cancelled.cancel();
    assert.equal((await cancelled.done).status, 'killed'); assert.equal(calls, 1);
    assert.equal(cancelled.readOutputBytes(request()).state, 'unsupported');
    const stdout = await makeCollector(); stdout.push(Buffer.from('before stop'));
    const done = Promise.withResolvers(); let kills = 0;
    const process = { status: 'running', signal: null, exitCode: null, done: done.promise, collected: { stdout },
      kill() { kills++; this.status = 'killed'; this.signal = 'SIGTERM'; done.resolve(); } };
    const hooks = processJob(async () => process, () => { throw Error('must not consume'); });
    await Promise.resolve(); hooks.cancel(); hooks.cancel();
    assert.equal((await hooks.done).status, 'killed'); assert.equal(kills, 1);
    assert.equal(Buffer.from(hooks.readOutputBytes(request()).bytes).toString(), 'before stop'); stdout.seal();
  }
});
