import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import AgentRegistry from '@deepseek-ai/dsh-agent';
import { Session, SessionId } from '@deepseek-ai/dsh-session';
import { OutputCollector, LocalJobRegistry } from '../../artifacts/compatibility/background-output/test-runtime.mjs';

const root = resolve('artifacts/compatibility/background-output');
await build({ entryPoints: ['src/job-control.ts'], bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: resolve(root, 'test-host.mjs') });
const { JobControl } = await import('../../artifacts/compatibility/background-output/test-host.mjs');

async function fixture() {
  const ctx = new Context(), agents = ctx.plugin(AgentRegistry), jobs = ctx.plugin(LocalJobRegistry, {});
  await agents.await(); await jobs.await();
  const own = { id: SessionId('host-test'), session: Session.create(SessionId('host-test')), ctx, options: {}, status: 'idle' };
  const off = await ctx.agents.register(own), offController = ctx.jobs.attachController('host-test');
  const control = new JobControl(ctx), done = Promise.withResolvers();
  const collector = new OutputCollector(4, 128, 'host', await mkdtemp(resolve(root, 'host-spill-')));
  let reads = 0;
  const id = ctx.jobs.start({ kind: 'pwsh', label: 'host bytes', owner: own, run: () => ({
    done: done.promise, cancel() {}, readOutput() { reads++; return 'model output'; },
    readOutputBytes(request) { return { state: 'available', ...collector.readBytesFrom(request.fromByte, request.maxBytes) }; },
  }) });
  const request = { method: 'remote.jobOutput', sessionId: own.id, jobId: id, generation: control.generation,
    startedAt: ctx.jobs.get(id, own).startedAt, stream: 'stdout', fromByte: 0, maxBytes: 2 };
  return { ctx, own, collector, control, request, reads: () => reads, done,
    async close() { collector.seal(); done.resolve({ status: 'completed', output: '' }); await Promise.resolve(); offController(); await off(); await jobs.dispose(); await agents.dispose(); } };
}

test('Host 经真实补丁注册表补读 spill 和中文，不改变模型游标或 reported，不返回路径', async () => {
  const f = await fixture();
  try {
    const original = '开始🙂中文完成'; f.collector.push(Buffer.from(original));
    const decoder = new TextDecoder(); let offset = 0, text = '';
    do {
      const value = await f.control.output({ ...f.request, fromByte: offset }, new AbortController().signal);
      assert.equal(value.lossy, false); assert.equal(value.spillPath, undefined); assert.equal(value.startOffset, offset);
      text += decoder.decode(Buffer.from(value.data, 'base64'), { stream: true }); offset = value.nextOffset;
    } while (offset < Buffer.byteLength(original));
    text += decoder.decode(); assert.equal(text, original); assert.equal(f.reads(), 0);
    assert.equal(f.ctx.jobs.get(f.request.jobId, f.own).reported, false);
  } finally { await f.close(); }
});

test('spill 删除或超过 cap 均明确报告缺口', async () => {
  const f = await fixture();
  try {
    f.collector.push(Buffer.from('123456789'));
    await unlink(f.collector.readBytesFrom(0, 2).spillPath);
    const missing = await f.control.output(f.request, new AbortController().signal);
    assert.equal(missing.lossy, true); assert.equal(missing.startOffset, 5); assert.equal(missing.data, Buffer.from('67').toString('base64'));
    f.collector.push(Buffer.alloc(130, 97));
    const overflow = await f.control.output(f.request, new AbortController().signal);
    assert.equal(overflow.lossy, true); assert.equal(overflow.totalBytes, 139);
  } finally { await f.close(); }
});

test('旧代次、旧任务、关闭会话、取消和读取中卸载均拒绝', async () => {
  const f = await fixture();
  try {
    f.collector.push(Buffer.from('123456789'));
    await assert.rejects(f.control.output({ ...f.request, generation: crypto.randomUUID() }, new AbortController().signal), /stale/);
    await assert.rejects(f.control.output({ ...f.request, startedAt: 0 }, new AbortController().signal), /stale/);
    await assert.rejects(f.control.output({ ...f.request, sessionId: 'closed' }, new AbortController().signal), /session_closed/);
    await assert.rejects(f.control.output(f.request, AbortSignal.abort()), /abort/i);
    const pending = f.control.output(f.request, new AbortController().signal);
    f.control.dispose(); await assert.rejects(pending, /stale/); assert.equal(f.reads(), 0);
  } finally { await f.close(); }
});
