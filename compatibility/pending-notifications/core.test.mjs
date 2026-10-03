import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as tick } from 'node:timers/promises';
import { Context } from '@deepseek-ai/cordis';
import * as connection from '@deepseek-ai/dsh-client-connection';
import TypertRegistry from '@deepseek-ai/dsh-typert-registry';
import { buildRuntime, outputRoot } from './build-test-runtime.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

await buildRuntime();
const isolated = await import(pathToFileURL(resolve(outputRoot, 'test-runtime.mjs')));
const TaskNotifications = isolated.TaskNotifications;
// 同一原Gateway行为矩阵也用于正式编译交付文件，避免只验证测试bundle。
const Gateway = process.env.DSHM_TEST_PRODUCTION_GATEWAY === '1'
  ? (await import(pathToFileURL(resolve(outputRoot, 'runtime/packages/api/gateway/lib/index.js')))).default
  : isolated.default;

async function fixture(t) {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  ctx.provide('credentials', { readRecord: async () => undefined, modifyRecord: async (_, change) => change(undefined) });
  await ctx.plugin(connection);
  await ctx.plugin(TypertRegistry);
  const fiber = ctx.plugin(Gateway); await fiber;
  const queue = []; let wake;
  const source = async function* (signal) {
    const notify = () => { wake?.(); wake = undefined; };
    signal.addEventListener('abort', notify);
    try {
      while (!signal.aborted) {
        if (queue.length) yield queue.shift();
        else await new Promise(resolve => { wake = resolve; });
      }
    } finally { signal.removeEventListener('abort', notify); }
  };
  const gateway = ctx.typertGateway;
  const unregister = gateway.registerRemoteEvents(source, { home: '/fixture' });
  t.after(unregister);
  const add = async (event = 'approval/request', signal) => {
    const subject = { ctx }, settled = Promise.withResolvers();
    // 拒绝也先安装处理器，允许在卸载测试中核对其原始错误。
    settled.promise.catch(() => {});
    queue.push({ event, context: { value: ctx, subject, agentId: 'session-test' },
      request: { agent: subject, secret: 'PRIVATE_PAYLOAD', ...(signal ? { signal } : {}) },
      resolve: settled.resolve, reject: settled.reject });
    wake?.(); wake = undefined;
    await tick();
    return { outcome: settled.promise };
  };
  const client = async () => {
    const lifetime = new AbortController();
    const stream = (await gateway.wireStream.open('$events', { args: {} }, lifetime.signal))[Symbol.asyncIterator]();
    const ready = (await stream.next()).value;
    t.after(async () => { lifetime.abort(); await stream.return(); });
    const result = async (eventId, outcome) => {
      const handler = ctx.connection.createSharedFetchHandler('/api');
      const rpcId = randomUUID();
      const response = await handler.fetch(new Request('http://localhost/api/$events/result', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId,
          method: '$events/result', payload: { args: { clientId: ready.clientId, eventId, outcome } } }) }));
      assert.equal(response.status, 200); assert.deepEqual(await response.json(), { type: 'server-response', rpcId, result: { ok: true } });
    };
    return { stream, result, close: async () => { lifetime.abort(); await stream.return(); } };
  };
  return { ctx, fiber, gateway, add, client, unregister };
}

test('snapshot and live events use original IDs, omit payload and do not participate in last-client delegation', async t => {
  const f = await fixture(t), first = await f.add('approval/request');
  const changes = [], watch = f.gateway.pendingNotifications.observe(value => changes.push(value));
  assert.equal(watch.snapshot.length, 1);
  const item = watch.snapshot[0];
  assert.deepEqual(Object.keys(item).sort(), ['eventId', 'kind', 'sessionId']);
  assert.equal(item.kind, 'approval'); assert(Object.isFrozen(item)); assert(Object.isFrozen(watch.snapshot));
  assert.equal(changes.length, 0);
  const a = await f.client();
  assert.equal((await a.stream.next()).value.eventId, item.eventId);
  await a.close();
  const b = await f.client();
  assert.equal((await b.stream.next()).value.eventId, item.eventId);
  await b.result(item.eventId, { kind: 'next' });
  assert.deepEqual(await first.outcome, { kind: 'next' });
  assert.deepEqual(changes, [{ type: 'resolved', eventId: item.eventId }]);
  const second = await f.add('user-questions/request');
  const fresh = changes[1]; assert.equal(fresh.type, 'pending'); assert.equal(fresh.item.kind, 'question');
  const question = (await b.stream.next()).value;
  assert.equal(question.type, 'waterfall');
  assert.equal(question.eventId, fresh.item.eventId);
  await b.result(question.eventId, { kind: 'result', value: 'original-answer' });
  assert.deepEqual(await second.outcome, { kind: 'result', value: 'original-answer' });
  assert(!JSON.stringify([watch.snapshot, changes]).includes('PRIVATE_PAYLOAD'));
  watch.dispose();
});

test('observer failures and immutable payload cannot alter original result, cancellation or source removal', async t => {
  const f = await fixture(t), changes = [];
  f.gateway.pendingNotifications.observe(() => { throw Error('listener failed'); });
  f.gateway.pendingNotifications.observe(async () => { throw Error('async listener failed'); });
  f.gateway.pendingNotifications.observe(() => new Promise(() => {}));
  f.gateway.pendingNotifications.observe(change => { change.type = 'tampered'; });
  const watch = f.gateway.pendingNotifications.observe(change => changes.push(change));
  const abort = new AbortController(), pending = await f.add('approval/request', abort.signal);
  assert.equal(changes[0].type, 'pending');
  abort.abort(new Error('original-cancel'));
  await assert.rejects(pending.outcome, /original-cancel/);
  assert.equal(changes[1].type, 'resolved');
  const other = await f.add('user-questions/request');
  await f.unregister();
  await assert.rejects(other.outcome, /source was removed/);
  assert.equal(changes.at(-1).type, 'resolved');
  assert.equal(f.gateway.pendingNotifications.observe(() => {}).snapshot.length, 0);
  watch.dispose();
});

test('limits are explicit, irrelevant events are excluded and disposed service rejects new watches', async t => {
  const f = await fixture(t), observer = f.gateway.pendingNotifications;
  const watches = Array.from({ length: 64 }, () => observer.observe(() => {}));
  assert.throws(() => observer.observe(() => {}), /busy/);
  watches.forEach(watch => watch.dispose());
  const changes = [], watch = observer.observe(event => changes.push(event));
  const unknown = await f.add('fixture/other');
  assert.equal(changes.length, 0);
  assert.equal(observer.observe(() => {}).snapshot.length, 0);
  const aborted = new AbortController(); aborted.abort(new Error('before-publication'));
  const cancelled = await f.add('approval/request', aborted.signal);
  await assert.rejects(cancelled.outcome, /before-publication/);
  assert(!changes.some(change => change.type === 'pending'));
  watch.dispose();
  const all = [];
  for (let i = 0; i < 257; i++) all.push(await f.add('approval/request'));
  assert.throws(() => observer.observe(() => {}), /overflow/);
  await f.unregister();
  await Promise.all([unknown, ...all].map(item => assert.rejects(item.outcome, /source was removed/)));
  await f.fiber.dispose();
  assert.throws(() => observer.observe(() => {}), /closed/);
});

test('Host task stream atomically baselines pending requests and forwards only later additions/removals', async t => {
  const f = await fixture(t), first = await f.add('approval/request');
  const tasks = new TaskNotifications(f.ctx, () => f.gateway.pendingNotifications);
  const life = new AbortController(), stream = tasks.follow(life.signal);
  t.after(async () => { life.abort(); await stream.return(); });
  const ready = (await stream.next()).value;
  assert.equal(ready.type, 'ready'); assert.equal(ready.pendingAvailable, true);
  assert.equal(ready.pending.length, 1);
  const client = await f.client(), delivered = (await client.stream.next()).value;
  assert.equal(ready.pending[0].eventId, delivered.eventId);
  await client.result(delivered.eventId, { kind: 'next' });
  assert.deepEqual(await first.outcome, { kind: 'next' });
  assert.deepEqual((await stream.next()).value, { type: 'resolved', eventId: delivered.eventId });
  const next = await f.add('user-questions/request'), changed = (await stream.next()).value;
  assert.equal(changed.type, 'pending'); assert.equal(changed.item.kind, 'question');
  life.abort(); await stream.next();
  const reconnectLife = new AbortController(), reconnected = tasks.follow(reconnectLife.signal);
  const fresh = (await reconnected.next()).value;
  assert.deepEqual(fresh.pending, [changed.item]);
  await f.unregister();
  await assert.rejects(next.outcome, /source was removed/);
  assert.deepEqual((await reconnected.next()).value, { type: 'resolved', eventId: changed.item.eventId });
  reconnectLife.abort(); await reconnected.next();
});
