import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { setImmediate as tick } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { prepareLatestPendingObserver } from '../compatibility/latest-upstream/pending-observer.mjs';

const source = process.env.DSHM_LATEST_SOURCE_ROOT;
if (!source) await prepareLatestPendingObserver();
const runtime = resolve(source ?? 'artifacts/latest-runtime-check'), require = createRequire(resolve(runtime, 'package.json'));
// 源码根并未直接依赖每个包，不能让Node向上回退到插件的旧版node_modules。
const sourceEntries = {
  '@deepseek-ai/cordis': 'vendor/cordis/src/index.ts',
  '@deepseek-ai/dsh-client-connection': 'packages/client/connection/src/index.ts',
  '@deepseek-ai/dsh-typert-registry': 'packages/typert/registry/src/index.ts',
  '@deepseek-ai/dsh-api-gateway': 'packages/api/gateway/src/index.ts',
};
const load = async name => {
  if (source) {
    if (!Object.hasOwn(sourceEntries, name)) throw Error('unsupported_source_test_entry');
    return import(pathToFileURL(resolve(source, sourceEntries[name])).href);
  }
  const selected = await realpath(require.resolve(name));
  return import(pathToFileURL(selected).href);
};
const { Context } = await load('@deepseek-ai/cordis');
const connection = await load('@deepseek-ai/dsh-client-connection');
const { default: Registry } = await load('@deepseek-ai/dsh-typert-registry');
const { default: Gateway } = await load('@deepseek-ai/dsh-api-gateway');

async function fixture(t) {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  ctx.provide('credentials', { readRecord: async () => undefined, modifyRecord: async (_, change) => change(undefined) });
  await ctx.plugin(connection); await ctx.plugin(Registry); const fiber = ctx.plugin(Gateway); await fiber;
  const queue = []; let wake;
  const unregister = ctx.typertGateway.registerRemoteEvents(async function* (signal) {
    const notify = () => { wake?.(); wake = undefined; };
    signal.addEventListener('abort', notify);
    try { while (!signal.aborted) { if (queue.length) yield queue.shift(); else await new Promise(resolve => { wake = resolve; }); } }
    finally { signal.removeEventListener('abort', notify); }
  }, { home: '/fixture' });
  t.after(unregister);
  const add = async (event = 'approval/request') => {
    const subject = { ctx }, settled = Promise.withResolvers(); settled.promise.catch(() => {});
    queue.push({ event, context: { value: ctx, subject, agentId: 'latest-test-session' },
      request: { agent: subject, secret: 'PRIVATE_PAYLOAD' }, resolve: settled.resolve, reject: settled.reject });
    wake?.(); wake = undefined; await tick(); return settled;
  };
  const client = async () => {
    const lifetime = new AbortController();
    const stream = (await ctx.typertGateway.wireStream.open('$events', { args: {} }, (async function* () {})(), undefined, lifetime.signal))[Symbol.asyncIterator]();
    const ready = (await stream.next()).value;
    const close = async () => { lifetime.abort(); await stream.return(); }; t.after(close);
    const result = async (eventId, outcome) => {
      const rpcId = randomUUID(), handler = ctx.connection.createSharedFetchHandler('/api');
      const response = await handler.fetch(new Request('http://localhost/api/$events/result', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId,
          method: '$events/result', payload: { args: { clientId: ready.clientId, eventId, outcome } } }) }));
      assert.equal(response.status, 200); assert.equal((await response.json()).result.ok, true);
    };
    return { stream, result, close };
  };
  return { ctx, gateway: ctx.typertGateway, add, client, unregister, fiber };
}

test('新版原 Gateway 只读快照不参加审批，两个客户端保留原结果与结算清理', async t => {
  const f = await fixture(t), first = await f.add(), changes = [];
  const observation = f.gateway.pendingNotifications.observe(value => changes.push(value));
  const item = observation.snapshot[0];
  assert.deepEqual(item, { eventId: item.eventId, sessionId: 'latest-test-session', kind: 'approval' });
  assert(Object.isFrozen(item)); assert(Object.isFrozen(observation.snapshot));
  const a = await f.client(); assert.equal((await a.stream.next()).value.eventId, item.eventId); await a.close();
  const b = await f.client(); assert.equal((await b.stream.next()).value.eventId, item.eventId);
  await b.result(item.eventId, { kind: 'result', value: { decision: 'approved' } });
  assert.deepEqual(await first.promise, { kind: 'result', value: { decision: 'approved' } });
  assert.deepEqual(changes, [{ type: 'resolved', eventId: item.eventId }]);
  const question = await f.add('user-questions/request'), request = (await b.stream.next()).value;
  assert.equal(changes[1].item.kind, 'question');
  await b.result(request.eventId, { kind: 'next' }); assert.deepEqual(await question.promise, { kind: 'next' });
  assert(!JSON.stringify([observation.snapshot, changes]).includes('PRIVATE_PAYLOAD'));
  observation.dispose();
});

test('新版原请求取消与观察异常隔离，服务销毁后拒绝新增观察', async t => {
  const f = await fixture(t), changes = [];
  f.gateway.pendingNotifications.observe(() => { throw Error('observer_failed'); });
  f.gateway.pendingNotifications.observe(async () => { throw Error('observer_async_failed'); });
  const observation = f.gateway.pendingNotifications.observe(change => changes.push(change));
  const pending = await f.add(); assert.equal(changes[0].type, 'pending');
  f.unregister(); await assert.rejects(pending.promise);
  assert.deepEqual(changes[1], { type: 'resolved', eventId: changes[0].item.eventId });
  observation.dispose(); f.fiber.dispose(); await tick();
  assert.throws(() => f.gateway.pendingNotifications.observe(() => {}), /closed/);
});
