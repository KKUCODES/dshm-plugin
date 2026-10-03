import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Context } from '@deepseek-ai/cordis';
import { transform } from './changes.mjs';
import { CordisInspectRegistryService } from '../../artifacts/compatibility/cordis-inspect/runtime/inspect-registry.mjs';
import { ClientCordisInspectRegistry } from '../../artifacts/cordis-inspect-audit/client.mjs';

const manifest = (id, type = 'string') => ({ id, description: 'A fixture provider', methods: [{
  name: 'read', description: 'Read fixture', inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  outputSchema: { type },
}] });
const tick = () => new Promise(resolve => setImmediate(resolve));
const ids = registry => registry.list().filter(item => item.platform === 'client').map(item => item.id);
async function fixture(t) {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose()); await ctx.plugin(CordisInspectRegistryService);
  return { ctx, registry: ctx.cordisInspect };
}

test('电脑原目录与两个连接独立更新、清空、释放，原 Host 目录保持', async t => {
  const { registry } = await fixture(t);
  registry.register({ manifest: manifest('host'), query: async () => 'host' });
  registry.syncClientManifest([manifest('desktop'), manifest('shared')]);
  const first = registry.createClientManifestScope(), second = registry.createClientManifestScope();
  first.sync([manifest('phone'), manifest('shared')]); second.sync([manifest('other')]);
  assert.deepEqual(ids(registry), ['desktop', 'shared', 'phone', 'other']);
  first.sync([]); assert.deepEqual(ids(registry), ['desktop', 'shared', 'other']);
  first.sync([manifest('phone')]); second.dispose(); second.dispose();
  assert.deepEqual(ids(registry), ['desktop', 'shared', 'phone']);
  registry.syncClientManifest([]); assert.deepEqual(ids(registry), ['phone']);
  first.dispose(); assert.deepEqual(ids(registry), []);
  assert.deepEqual(registry.list().map(item => [item.platform, item.id]), [['host', 'host']]);
  assert.throws(() => first.sync([manifest('stale')]), /closed/);
});

test('真实原客户端释放自己的提供者不会清空电脑目录', async t => {
  const { registry } = await fixture(t);
  registry.syncClientManifest([manifest('desktop')]);
  const scope = registry.createClientManifestScope();
  const phone = new ClientCordisInspectRegistry({ async sync(providers) { scope.sync(providers); },
    async resolve() { throw new Error('No query expected'); } });
  const remove = phone.register({ manifest: manifest('phone'), query: async () => 'phone' });
  await tick(); assert.deepEqual(ids(registry), ['desktop', 'phone']);
  remove(); await tick(); assert.deepEqual(ids(registry), ['desktop']);
  scope.dispose();
});

test('同名契约冲突与无效快照被原校验拒绝，所有旧目录原子保留', async t => {
  const { registry } = await fixture(t);
  registry.syncClientManifest([manifest('shared')]);
  const scope = registry.createClientManifestScope(); scope.sync([manifest('phone')]);
  assert.throws(() => scope.sync([manifest('shared', 'number')]), /conflicting page contracts/);
  assert.throws(() => scope.sync([manifest('x'), manifest('x')]), /repeats/);
  assert.throws(() => scope.sync([manifest('')]), /must not be empty/);
  assert.deepEqual(ids(registry), ['shared', 'phone']);
  assert.throws(() => registry.syncClientManifest([manifest('phone', 'number')]), /conflicting page contracts/);
  assert.deepEqual(ids(registry), ['shared', 'phone']);
  scope.dispose(); registry.syncClientManifest([manifest('phone', 'number')]);
  assert.deepEqual(ids(registry), ['phone']);
});

test('对象键和方法目录顺序差异不制造冲突，快照不受调用方后续写入影响', async t => {
  const { registry } = await fixture(t);
  const original = manifest('shared'); original.methods.push({ ...original.methods[0], name: 'other' });
  registry.syncClientManifest([original]);
  const same = JSON.parse(JSON.stringify(original)); same.methods.reverse();
  same.methods[0].inputSchema = { additionalProperties: false, properties: {}, type: 'object' };
  const scope = registry.createClientManifestScope(); scope.sync([same]);
  original.methods[0].outputSchema.type = 'number'; same.methods[0].outputSchema.type = 'boolean';
  assert.equal(registry.list()[0].methods[0].outputSchema.type, 'string');
  assert.throws(() => { registry.list()[0].methods[0].outputSchema.type = 'number'; }, TypeError);
  assert.deepEqual(ids(registry), ['shared']); scope.dispose();
});

test('未知上游版本不能静默生成补丁', async () => {
  const source = await readFile('../deepseek-harness/packages/extensions/cordis-host-runner/src/inspect-registry.ts', 'utf8');
  assert.throws(() => transform(source + '\n'), /Unsupported/);
  assert.throws(() => transform(transform(source)), /Unsupported/);
});

test('异步请求上下文穿过await仍属于原连接，传统调用与并发连接不串线', async t => {
  const { registry } = await fixture(t);
  registry.syncClientManifest([manifest('desktop')]);
  const first = registry.createClientManifestScope(), second = registry.createClientManifestScope();
  let release;
  const delayed = first.run(async () => {
    await new Promise(resolve => { release = resolve; });
    registry.syncClientManifest([manifest('first')]);
  });
  await second.run(async () => { await tick(); registry.syncClientManifest([manifest('second')]); });
  registry.syncClientManifest([manifest('desktop-updated')]); release(); await delayed;
  assert.deepEqual(new Set(ids(registry)), new Set(['desktop-updated', 'first', 'second']));
  first.dispose(); assert.deepEqual(ids(registry), ['desktop-updated', 'second']);
});

test('连接或服务释放后，尚在await的原方法不能退回传统目录写入', async t => {
  for (const disposeService of [false, true]) {
    const { registry, ctx } = await fixture(t);
    registry.syncClientManifest([manifest('desktop')]);
    const scope = registry.createClientManifestScope(); let release;
    const pending = scope.run(async () => {
      await new Promise(resolve => { release = resolve; }); registry.syncClientManifest([manifest('late')]);
    });
    const rejected = assert.rejects(pending, /connection is closed/);
    if (disposeService) await ctx.fiber.dispose(); else scope.dispose();
    release(); await rejected;
    assert.deepEqual(ids(registry), disposeService ? [] : ['desktop']);
  }
});

test('手机独有目录可被原查询发现，仍拒绝错会话、无效结果和迟到结果', async t => {
  const { registry, ctx } = await fixture(t);
  const scope = registry.createClientManifestScope(); scope.sync([manifest('phone')]);
  const agent = { id: 'audit-agent' }, controller = new AbortController(); t.after(() => controller.abort());
  let request; ctx.on('cordis/inspect-query', value => { request = value; });
  const result = registry.query('client', 'phone', 'read', {}, agent, controller.signal);
  assert.ok(request);
  assert.deepEqual(registry.resolveClientQuery({ id: 'other' }, request.requestId, { ok: true, data: 'wrong' }), { accepted: false });
  assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 42 }), { accepted: false });
  assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'phone' }), { accepted: true });
  assert.equal(await result, 'phone');
  assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'late' }), { accepted: false });
});

test('连接释放后新查询不再发现旧目录，原在途查询仍由工具取消结算', async t => {
  const { registry, ctx } = await fixture(t);
  const scope = registry.createClientManifestScope(); scope.sync([manifest('phone')]);
  const agent = { id: 'audit-agent' }, controller = new AbortController(); t.after(() => controller.abort());
  let request; ctx.on('cordis/inspect-query', value => { request = value; });
  const result = registry.query('client', 'phone', 'read', {}, agent, controller.signal);
  scope.dispose();
  await assert.rejects(registry.query('client', 'phone', 'read', {}, agent, controller.signal), /not registered/);
  const rejection = assert.rejects(result, /cancelled/); controller.abort(); await rejection;
  assert.deepEqual(registry.resolveClientQuery(agent, request.requestId, { ok: true, data: 'late' }), { accepted: false });
});
