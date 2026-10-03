import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import ToolRegistry from '@deepseek-ai/dsh-tools';

const { default: Runner } = await import(pathToFileURL(resolve('artifacts/compatibility/cordis-inventory-sync/runtime/runner.mjs')).href);
const remotes = await import(pathToFileURL(resolve('artifacts/compatibility/cordis-inventory-sync/runtime/remotes.mjs')).href);

test('原Remote事件组装向两个独立订阅转发定义与移除，结束订阅清理监听', async t => {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  let source;
  // 捕获原组装交给Gateway的真实source；本项只验证事件边界，不声称网络/认证验收。
  ctx.provide('typertGateway', { registerRemoteEvents(value) { source = value; return () => {}; } });
  await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRegistry); await ctx.plugin(Runner); await ctx.plugin(remotes);
  const controllers = [new AbortController(), new AbortController()];
  t.after(() => controllers.forEach(controller => controller.abort()));
  const streams = controllers.map(controller => source(controller.signal)[Symbol.asyncIterator]());
  const reads = streams.map(stream => stream.next());
  const runner = ctx.dynamicCordisRunner;
  const defined = runner.define({ sessionId: 'event-test', plugin: { kind: 'new', idPrefix: 'event' },
    name: 'Event test', purpose: 'Original Remote assembly', code: { host: 'return { apply() {} }' } });
  for (const frame of await Promise.all(reads)) assert.deepEqual(frame.value, { event: 'cordis/inventory-changed', args: [] });
  const removed = streams.map(stream => stream.next());
  await runner.undefine({ id: 'event-test' }, defined.pluginId);
  for (const frame of await Promise.all(removed)) assert.deepEqual(frame.value, { event: 'cordis/inventory-changed', args: [] });
  assert.deepEqual(runner.inventory(), []);
  const finished = streams.map(stream => stream.next()); controllers.forEach(controller => controller.abort());
  for (const frame of await Promise.all(finished)) assert.equal(frame.done, true);
});
