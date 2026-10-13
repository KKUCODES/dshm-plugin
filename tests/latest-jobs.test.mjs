import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const require = createRequire(pathToFileURL(resolve(runtime, 'package.json')));
const load = name => import(pathToFileURL(require.resolve(name)).href);

test('新版真实任务注册表：独立双通道分页不消费模型输出，跨会话和陈旧停止拒绝', async () => {
  assert.equal(require('@deepseek-ai/dsh-jobs/package.json').version, '0.2.1-alpha.1');
  const [{ Context }, { default: AgentRegistry }, { Session, SessionId }, { default: LocalJobRegistry }] = await Promise.all([
    load('@deepseek-ai/cordis'), load('@deepseek-ai/dsh-agent'), load('@deepseek-ai/dsh-session'), load('@deepseek-ai/dsh-jobs-local'),
  ]);
  const bundle = resolve(runtime, 'latest-job-control.mjs');
  await build({ entryPoints: [resolve(root, 'src/job-control.ts')], outfile: bundle,
    bundle: true, format: 'esm', platform: 'node', external: ['@deepseek-ai/*'], logLevel: 'silent' });
  const { JobControl } = await import(pathToFileURL(bundle).href);
  const ctx = new Context();
  const agents = ctx.plugin(AgentRegistry), jobs = ctx.plugin(LocalJobRegistry, { retainBytes: 48, settledRetainBytes: 16 });
  await agents; await jobs;
  const agent = id => ({ id: SessionId(id), session: Session.create(SessionId(id)), ctx, options: {}, status: 'idle' });
  const own = agent('latest-own'), other = agent('latest-other');
  const offOwn = await ctx.agents.register(own), offOther = await ctx.agents.register(other);
  const offController = ctx.jobs.attachController('latest-test');
  const control = new JobControl(ctx, '0.2.1-alpha.1');
  let finish, producer, cancels = 0;
  const id = ctx.jobs.start({ kind: 'bash', label: 'isolated-output-fixture', owner: own.id,
    run(job) { producer = job; return { done: new Promise(res => { finish = res; }), cancel() { cancels++; finish({ status: 'killed' }); } }; } });
  const target = { sessionId: own.id, jobId: id, startedAt: ctx.jobs.get(id, own.id).startedAt, generation: control.generation };
  const request = stream => ({ method: 'remote.jobOutput', ...target, stream, fromByte: 0, maxBytes: 2 });
  try {
    producer.append('开始🙂', { channel: 'stdout' }); producer.append('错误', { channel: 'stderr' }); producer.append('结束', { channel: 'stdout' });
    producer.append('进度', { channel: 'log', gapBefore: true });
    const total = ctx.jobs.get(id, own.id).output.total;
    assert.equal(control.outputAvailable, true); assert.equal(control.outputCoordinates, 'ring');
    for (const [stream, expected] of [['stdout', '开始🙂结束进度'], ['stderr', '错误']]) {
      const bytes = []; let cursor = 0, gaps = 0;
      while (cursor < total) {
        const result = await control.output({ ...request(stream), fromByte: cursor }, new AbortController().signal);
        assert.equal(result.coordinate, 'ring'); assert.equal(result.lossy, false);
        const chunk = Buffer.from(result.data, 'base64'); bytes.push(chunk);
        assert.equal(chunk.length + result.skippedBytes, result.nextOffset - result.startOffset);
        assert.ok(result.nextOffset > cursor && result.nextOffset - cursor <= 2);
        if (result.producerGap) gaps++;
        cursor = result.nextOffset;
      }
      assert.equal(Buffer.concat(bytes).toString(), expected);
      assert.equal(gaps, stream === 'stdout' ? 1 : 0, 'producer gap applies once, not once per byte page');
    }
    const model = ctx.jobs.read(id, own.id);
    assert.equal(model.chunks.map(chunk => chunk.text).join(''), '开始🙂错误结束进度');
    assert.equal(ctx.jobs.read(id, own.id).chunks.length, 0);
    const observer = await control.output({ ...request('stdout'), maxBytes: 65536 }, new AbortController().signal);
    assert.equal(Buffer.from(observer.data, 'base64').toString(), '开始🙂结束进度');
    await assert.rejects(control.output({ ...request('stdout'), sessionId: other.id }, new AbortController().signal), /remote_job_missing/);
    assert.throws(() => control.stop({ method: 'remote.jobStop', ...target, startedAt: target.startedAt + 1 }), /remote_job_stale/);
    assert.equal(cancels, 0);
    assert.deepEqual(control.stop({ method: 'remote.jobStop', ...target }), { status: 'requested' });
    await ctx.jobs.wait(id, 1000, own.id);
    assert.equal(cancels, 1);
    assert.deepEqual(control.stop({ method: 'remote.jobStop', ...target }), { status: 'already-finished' });
    const retained = await control.output({ ...request('stdout'), maxBytes: 65536 }, new AbortController().signal);
    assert.equal(retained.status, 'killed');
    assert.equal(retained.lossy, true);
    assert.ok(retained.startOffset > 0);
    assert.equal(retained.nextOffset, retained.totalBytes);
    assert.equal(Buffer.from(retained.data, 'base64').length + retained.skippedBytes, retained.nextOffset - retained.startOffset);
    // 模型已消费的前段可按官方终态上限裁剪；手机必须显示缺口，不能伪称完整历史。
    const tail = ctx.jobs.readAt(id, 0, own.id);
    assert.equal(tail.lossy, true);
    assert.equal(retained.startOffset, ctx.jobs.get(id, own.id).output.earliest);
    control.dispose();
    await assert.rejects(control.output(request('stdout'), new AbortController().signal), /remote_job_stale/);
  } finally {
    finish({ status: 'killed' }); await Promise.resolve();
    await offOther(); await offOwn(); offController(); await ctx.fiber.dispose();
  }
});
