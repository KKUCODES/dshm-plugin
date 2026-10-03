import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRegistry from '@deepseek-ai/dsh-tools';

const { default: Runner } = await import(pathToFileURL(resolve(process.env.DSHM_APPROVAL_RUNNER
  ?? 'artifacts/compatibility/cordis-inspect/runtime/runner.mjs')).href);
// 原Host服务、VM和注册表实际执行；只省去模型及页面，操作顺序与原Client orchestrator一致。
async function fixture(t, host = 'return { apply() {} }') {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRegistry); await ctx.plugin(Runner);
  const runner = ctx.dynamicCordisRunner, agent = { id: 'approval-race', steer() {} };
  const defined = runner.define({ sessionId: agent.id, plugin: { kind: 'new', idPrefix: 'race' },
    name: 'Approval race', purpose: 'Isolated concurrency regression',
    code: { host, client: 'return { apply() {} }' } });
  let request;
  ctx.on('cordis/request-run', value => { request = value; });
  const receipt = await runner.run(agent, defined.pluginId, defined.packageId, 'run');
  assert.equal(receipt.status, 'awaiting-approval'); assert.ok(request);
  const start = () => runner.runHostHalf(agent, defined.pluginId, defined.packageId, 'run', request.requestId, false);
  const answer = resolution => runner.resolveRequestRun(request.requestId, resolution);
  const latest = () => runner.inventory()[0].latestRun;
  return { ctx, runner, agent, defined, start, answer, latest };
}

for (const phase of ['starting-host', 'client-pending']) {
  test(`批准已进入${phase}时，另一端拒绝不能消费原审批`, async t => {
    const f = await fixture(t), starting = f.start();
    if (phase === 'client-pending') await starting;
    assert.equal(f.latest().status, phase);
    const declined = await f.answer({ ok: false, reason: 'rejected' });
    const started = await starting; assert.equal(started.ok, true);
    assert.deepEqual(declined, { accepted: false });
    assert.deepEqual(await f.answer({ ok: true, pluginRunId: started.pluginRunId }), { accepted: true });
    assert.equal(f.latest().status, 'running');
  });
}

for (const phase of ['starting-host', 'client-pending']) test(`${phase}时重复批准的失败回执不得抢先结算`, async t => {
  const f = await fixture(t), starting = f.start();
  if (phase === 'client-pending') await starting;
  assert.equal(f.latest().status, phase);
  const second = await f.start(); assert.equal(second.ok, false);
  // 原客户端在runHostHalf被拒绝后会继续提交host-half-failed。
  const failure = await f.answer({ ok: false, reason: 'host-half-failed', message: second.message });
  const started = await starting; assert.equal(started.ok, true);
  assert.deepEqual(failure, { accepted: false });
  assert.deepEqual(await f.answer({ ok: true, pluginRunId: started.pluginRunId }), { accepted: true });
  assert.equal(f.latest().status, 'running');
});

test('批准之前拒绝仍生效，之后的启动不可执行', async t => {
  const f = await fixture(t);
  assert.deepEqual(await f.answer({ ok: false, reason: 'rejected' }), { accepted: true });
  assert.equal((await f.start()).ok, false); assert.equal(f.latest().status, 'rejected');
  assert.equal(f.runner.inventory()[0].activeRun, undefined);
});

test('实际Host启动失败仍可结算并清除请求', async t => {
  const f = await fixture(t, 'throw new Error("EXPECTED_HOST_START_FAILURE")');
  const started = await f.start(); assert.equal(started.ok, false); assert.equal(f.latest().status, 'failed');
  assert.deepEqual(await f.answer({ ok: false, reason: 'host-half-failed', message: started.message }), { accepted: true });
  assert.equal(f.latest().status, 'failed');
});

test('实际Client加载失败仍可结算并回收本次Host', async t => {
  const f = await fixture(t), started = await f.start(); assert.equal(started.ok, true);
  assert.deepEqual(await f.answer({ ok: false, reason: 'client-half-failed', pluginRunId: started.pluginRunId,
    startedHere: true, message: 'EXPECTED_CLIENT_LOAD_FAILURE' }), { accepted: true });
  assert.equal(f.latest().status, 'failed'); assert.equal(f.runner.inventory()[0].activeRun, undefined);
});
