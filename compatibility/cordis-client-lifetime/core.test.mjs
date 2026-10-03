import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform as compile } from 'esbuild';
import { Context } from '@deepseek-ai/cordis';
import { hashes, transform } from './changes.mjs';

const source = path => readFile(`../deepseek-harness/packages/extensions/${path}`, 'utf8');
async function module(path) {
  const { code } = await compile(transform(path, await source(path)), { loader: 'ts', format: 'esm', target: 'es2024' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { ClientCordisInspectRegistry: Registry, provideClientCordisInspect: provide } = await module('cordis-client-runner/src/client/inspect-registry.ts');
const { createCordisInventory } = await module('ui-cordis/src/client/inventory.ts');
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const provider = id => ({ manifest: { id, methods: [] }, query: async () => null });

test('all four exact source boundaries transform; unknown baselines rejected', async () => {
  for (const path of Object.keys(hashes)) {
    const original = await source(path);
    assert.notEqual(transform(path, original), original);
    assert.throws(() => transform(path, original + '\n'), /Unsupported source/);
  }
});
test('actual Cordis context disposal does not publish an offline empty directory', async () => {
  const ctx = new Context(), calls = [];
  const registry = new Registry({ sync: async rows => { calls.push(rows.map(row => row.id)); }, resolve: async () => {} });
  provide(ctx, registry);
  ctx.effect(() => registry.register(provider('one')));
  await flush(); assert.deepEqual(calls, [['one']]);
  await ctx.fiber.dispose(); await flush();
  assert.deepEqual(calls, [['one']]);
  assert.throws(() => registry.register(provider('late')), /disposed/);
});
test('reset drops stale queued manifests and publishes latest registrations after reconnect', async () => {
  const calls = [], pending = Promise.withResolvers();
  const registry = new Registry({ sync: async rows => { calls.push(rows.map(row => row.id)); if (calls.length === 1) await pending.promise; }, resolve: async () => {} });
  const remove = registry.register(provider('one')); await flush();
  registry.register(provider('two')); await flush();
  registry.reset(); remove(); registry.publish();
  pending.resolve(); await flush();
  assert.deepEqual(calls, [['one'], ['two']]);
  registry.dispose();
});
test('current publish failures remain reported; disposed late failures do not', async () => {
  const pending = Promise.withResolvers(), errors = [], original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const registry = new Registry({ sync: () => pending.promise, resolve: async () => {} });
    registry.register(provider('one')); await flush(); registry.dispose(); pending.reject(Error('old wire')); await flush();
    assert.equal(errors.length, 0);
    const current = new Registry({ sync: async () => { throw Error('current wire'); }, resolve: async () => {} });
    current.register(provider('two')); await flush();
    assert.equal(errors.length, 1); assert.match(errors[0][1].message, /current wire/); current.dispose();
  } finally { console.error = original; }
});
test('disposed inventory ignores late success/failure and cannot restart reads', async () => {
  for (const fail of [false, true]) {
    const pending = Promise.withResolvers(), errors = []; let calls = 0, changes = 0;
    const inventory = createCordisInventory({ inventory: () => { calls++; return pending.promise; } }, error => errors.push(error));
    inventory.subscribe(() => changes++); inventory.refresh(); inventory.dispose();
    fail ? pending.reject(Error('old inventory')) : pending.resolve([{ pluginId: 'old' }]);
    await flush(); inventory.refresh(); inventory.reset(); inventory.retire('old');
    assert.equal(calls, 1); assert.equal(changes, 0); assert.deepEqual(errors, []);
  }
});
test('old query completion cannot remove a reused request id from the new connection', async () => {
  const old = Promise.withResolvers(), fresh = Promise.withResolvers(), signals = [], results = [];
  const registry = new Registry({ sync: async () => {}, resolve: async (...args) => results.push(args) });
  registry.register({ manifest: { id: 'probe', methods: [{ name: 'read' }] }, query: async (_method, _input, context) => {
    signals.push(context.signal); return signals.length === 1 ? old.promise : fresh.promise;
  } });
  const request = { requestId: 'reused', agentId: 'test-session', provider: 'probe', method: 'read' };
  const first = registry.query(request); registry.reset();
  const second = registry.query(request); old.resolve(null); await first;
  registry.close('reused'); assert.equal(signals[1].aborted, true);
  fresh.resolve(null); await second; assert.deepEqual(results, []); registry.dispose();
});
test('live inventory still publishes real failures and can recover', async () => {
  const errors = []; let fail = true;
  const inventory = createCordisInventory({ inventory: async () => { if (fail) throw Error('current read'); return []; } }, error => errors.push(error));
  inventory.refresh(); await flush(); assert.equal(errors.length, 1);
  fail = false; inventory.refresh(); await flush(); assert.equal(inventory.getSnapshot().read, true);
  assert.equal(inventory.getSnapshot().error, undefined); inventory.dispose();
});
