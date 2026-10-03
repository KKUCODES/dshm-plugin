import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform as compile } from 'esbuild';

const input = process.env.DSHM_INVENTORY_SOURCE ?? 'F:/Program Files/deepseek-harness/packages/extensions/ui-cordis/src/client/inventory.ts';
const { code } = await compile(await readFile(input, 'utf8'), { loader: 'ts', format: 'esm', target: 'es2024' });
const { createCordisInventory } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const row = { pluginId: 'dshm-1', agentId: 'fixture', packages: [] };
function fixture() {
  const calls = [], errors = [], publications = [];
  const inventory = createCordisInventory({ inventory() { const p = Promise.withResolvers(); calls.push(p); return p.promise; } }, e => errors.push(e));
  inventory.subscribe(() => publications.push(inventory.getSnapshot()));
  return { inventory, calls, errors, publications };
}

test('读取期间的新变化合并为一次后续读取，不丢失移除结果', async () => {
  const f = fixture(); f.inventory.refresh();
  f.inventory.refresh(); f.inventory.refresh();
  assert.equal(f.calls.length, 1);
  f.calls[0].resolve([row]); await flush();
  assert.equal(f.calls.length, 2);
  f.calls[1].resolve([]); await flush();
  assert.deepEqual(f.inventory.getSnapshot().rows, []); assert.deepEqual(f.errors, []);
});

test('本页明确移除后，旧读取不能把已经删除的行放回来', async () => {
  const f = fixture(); f.inventory.refresh(); f.calls[0].resolve([row]); await flush();
  f.inventory.refresh(); f.inventory.retire(row.pluginId); f.inventory.refresh();
  f.calls[1].resolve([row]); await flush();
  assert.ok(f.publications.slice(1).every(snapshot => !snapshot.rows.some(value => value.pluginId === row.pluginId)));
  assert.equal(f.calls.length, 3); f.calls[2].resolve([]); await flush();
  assert.deepEqual(f.inventory.getSnapshot().rows, []);
});

test('重连或销毁后旧排队刷新不得重新发起，当前连接失败仍显示', async () => {
  for (const kind of ['reset', 'dispose']) {
    const f = fixture(); f.inventory.refresh(); f.inventory.refresh(); f.inventory[kind]();
    f.calls[0].reject(Error('old')); await flush();
    assert.equal(f.calls.length, 1); assert.deepEqual(f.errors, []);
    if (kind === 'reset') {
      f.inventory.refresh(); f.calls[1].reject(Error('current')); await flush();
      assert.equal(f.errors.length, 1); assert.equal(f.inventory.getSnapshot().error, 'current');
    }
  }
});

test('旧连接完成不能清空新连接的在途读取或新排队刷新', async () => {
  const f = fixture(); f.inventory.refresh(); f.inventory.refresh(); f.inventory.reset();
  f.inventory.refresh(); f.inventory.refresh();
  f.calls[0].resolve([row]); await flush();
  assert.equal(f.calls.length, 2); assert.equal(f.inventory.getSnapshot().read, false);
  f.calls[1].resolve([]); await flush(); assert.equal(f.calls.length, 3);
  f.calls[2].resolve([]); await flush(); assert.equal(f.calls.length, 3);
});

test('读取失败仍处理期间排队的变化，成功读取清除错误', async () => {
  const f = fixture(); f.inventory.refresh(); f.inventory.refresh();
  f.calls[0].reject(Error('temporary')); await flush();
  assert.equal(f.calls.length, 2); assert.equal(f.errors.length, 1);
  f.calls[1].resolve([]); await flush();
  assert.equal(f.inventory.getSnapshot().error, undefined);
});

test('重连后电脑重新使用同一标识，不能按旧移除记录永久过滤', async () => {
  const f = fixture(); f.inventory.retire(row.pluginId); f.inventory.reset(); f.inventory.refresh();
  f.calls[0].resolve([row]); await flush(); assert.deepEqual(f.inventory.getSnapshot().rows, [row]);
});
