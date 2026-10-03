import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRegistry from '@deepseek-ai/dsh-tools';

const { default: Runner } = await import(pathToFileURL(resolve(process.env.DSHM_INVENTORY_RUNNER
  ?? 'F:/Program Files/deepseek-harness/packages/extensions/cordis-host-runner/lib/index.js')).href);

async function fixture(t) {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRegistry); await ctx.plugin(Runner);
  const runner = ctx.dynamicCordisRunner, snapshots = [], retractions = [];
  ctx.on('cordis/inventory-changed', () => snapshots.push(runner.inventory()));
  ctx.on('cordis/dynamic-retract', value => retractions.push(value));
  const agent = { id: 'inventory-test', steer() {} };
  const define = plugin => runner.define({ sessionId: agent.id, plugin: plugin ?? { kind: 'new', idPrefix: 'list' },
    name: 'Inventory test', purpose: 'No model or user files', code: { host: 'return { apply() {} }' } });
  return { runner, agent, snapshots, retractions, define };
}

test('新定义及追加版本通知其他客户端，通知时完整清单已更新', async t => {
  const f = await fixture(t), defined = f.define();
  f.define({ kind: 'existing', pluginId: defined.pluginId });
  assert.equal(f.snapshots.length, 2);
  assert.equal(f.snapshots[0][0].packages.length, 1);
  assert.equal(f.snapshots[1][0].packages.length, 2);
});

for (const phase of ['never-run', 'stopped', 'running']) test(`${phase}定义移除后通知，其他端读到空清单`, async t => {
  const f = await fixture(t), defined = f.define();
  if (phase !== 'never-run') {
    await f.runner.run(f.agent, defined.pluginId, defined.packageId, 'run');
    if (phase === 'stopped') await f.runner.stop(f.agent, defined.pluginId);
  }
  f.snapshots.length = 0;
  assert.equal((await f.runner.undefine(f.agent, defined.pluginId)).ok, true);
  assert.deepEqual(f.snapshots, [[]]);
  assert.equal(f.retractions.length, phase === 'never-run' ? 0 : 1, 'Do not invent a run identity to announce removal');
});

test('越权或已不存在的定义不发变更通知', async t => {
  const f = await fixture(t), defined = f.define(); f.snapshots.length = 0;
  assert.equal((await f.runner.undefine({ id: 'other' }, defined.pluginId)).ok, false);
  assert.deepEqual(f.snapshots, []);
  await f.runner.undefine(f.agent, defined.pluginId); f.snapshots.length = 0;
  assert.equal((await f.runner.undefine(f.agent, defined.pluginId)).ok, false);
  assert.deepEqual(f.snapshots, []);
});
