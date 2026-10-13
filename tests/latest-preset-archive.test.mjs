import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { prepareLatestPresetArchive } from '../compatibility/latest-upstream/preset-archive.mjs';

const source = process.env.DSHM_LATEST_SOURCE_ROOT;
if (!source) await prepareLatestPresetArchive();
const { AgentPresetRegistry } = await import(pathToFileURL(resolve(import.meta.dirname,
  source ? resolve(source, 'packages/preset/agent-preset-registry/src/index.ts')
    : '../artifacts/latest-runtime-check/node_modules/@deepseek-ai/dsh-agent-preset-registry/lib/index.js')).href);
const prototype = AgentPresetRegistry.prototype;

// 使用实际候选函数，控制内部诊断/排队时序；不是完整会话、鉴权或真实模型验收。
test('原 retain 在诊断返回后核验归档状态，选择不获得新 lease，旧会话仍可恢复', async () => {
  let finish;
  const record = { config: { archived: false }, generation: { users: 0 } };
  const registry = { defaultId: 'example', definitions: new Map([['example', record]]),
    diagnostic: () => new Promise(resolve => { finish = resolve; }) };
  const selecting = prototype.retain.call(registry, 'example', true);
  record.config.archived = true; finish(undefined);
  await assert.rejects(selecting, error => error.code === 'agent-preset/not-found'
    && error.details.agentPreset === 'example' && JSON.stringify(error.details.available) === '["example"]');
  assert.equal(record.generation.users, 0);
  const resumed = prototype.retain.call(registry, 'example'); finish(undefined);
  assert.equal(await resumed, record.generation);
  assert.equal(record.generation.users, 1);
});

test('原选择队列等待期间被归档，不通过初始检查后再选择已删除模式', async () => {
  let release;
  const record = { config: { archived: false }, generation: { users: 0 } };
  const predecessor = new Promise(resolve => { release = resolve; });
  const registry = { definitions: new Map([['example', record]]), switches: new Map([['agent', predecessor]]),
    owner: { sessionProjections: { stateOf: () => ({ openTurnStartSeq: null, lastTurn: 0 }) } },
    diagnostic: async () => undefined, retain: prototype.retain, mount: prototype.mount, recompose: prototype.recompose };
  const queued = prototype.select.call(registry, { id: 'agent', ctx: {}, session: { append() { throw Error('must_not_append'); } } }, 'example');
  record.config.archived = true; release();
  await assert.rejects(queued, error => error.code === 'agent-preset/not-found'
    && error.details.agentPreset === 'example' && JSON.stringify(error.details.available) === '["example"]');
  assert.equal(record.generation.users, 0);
  assert.equal(registry.switches.size, 0);
});
