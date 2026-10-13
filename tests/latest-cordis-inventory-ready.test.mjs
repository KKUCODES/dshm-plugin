import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { prepareLatestCordisClientLifetime } from '../compatibility/latest-upstream/cordis-client-lifetime.mjs';

const prepared = await prepareLatestCordisClientLifetime({ write: false });
const ui = prepared.files.find(row => /dsh-client-ui-cordis[\\/]lib[\\/]client.js$/.test(row.path));
assert.ok(ui);
function binding(text, name, globals = {}) {
  const file = ts.createSourceFile('client.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), found = [];
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file); assert.equal(found.length, 1);
  return runInNewContext('(' + found[0].getText(file) + ')', { Promise, Set, Map, Error, ...globals });
}
function mount(text) {
  const errors = [], calls = [], effects = [], generationListeners = new Set(), events = new Map();
  let generation;
  let panel;
  const inventory = binding(text, 'createCordisInventory');
  const apply = binding(text, 'apply', {
    createCordisInventory: inventory, NS: 'fixture', en: {}, zh: {},
    console: { error: (...args) => errors.push(args) },
    CordisRunCardRegistry: class {}, CordisPanel() {}, CordisDefineRow() {}, CordisRunRow() {}, CordisActionRow() {},
  });
  const runner = { getSnapshot() {}, subscribe() {}, reconcileApprovals() {} };
  const ctx = {
    get: () => ({ generation: { getSnapshot: () => generation,
      subscribe: listener => { generationListeners.add(listener); return () => generationListeners.delete(listener); } } }),
    effect: callback => { effects.push(callback()); }, locale: { register() {} }, dynamicCordisRunner: runner,
    remote: { $on: (name, listener) => events.set(name, listener), dynamicCordisRunner: {
      inventory: () => { const pending = Promise.withResolvers(); calls.push(pending); return pending.promise; },
    } },
    on: (name, listener) => events.set(name, listener),
    slots: { inject: (name, callback) => { if (name === 'sidebar.footer.action') callback(); },
      register: definition => { panel = definition.inject(); } },
  };
  apply(ctx);
  return { calls, errors, panel, events,
    generation: value => { generation = value; for (const listener of generationListeners) listener(); },
    dispose: () => { for (const effect of effects.reverse()) if (typeof effect === 'function') effect(); },
  };
}
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };

test('固定新版实际 UI 入口：离线的初始/面板/事件刷新不发请求，就绪后读取真实清单', async () => {
  const original = await readFile(ui.path, 'utf8'), before = mount(original);
  before.panel.onRefresh(); assert.ok(before.calls.length > 0, '原入口必须实际重现离线读取');
  before.dispose(); for (const pending of before.calls) pending.resolve({ ok: true, value: [] }); await flush();
  const current = mount(ui.modified);
  try {
    current.panel.onRefresh();
    for (const event of ['cordis/inventory-changed', 'cordis/dynamic-package', 'cordis/dynamic-retract', 'cordis/request-run-resolved', 'connection/reset']) current.events.get(event)();
    assert.equal(current.calls.length, 0);
    current.generation({ id: 'actual-current-connection' }); current.events.get('connection/reset')();
    assert.equal(current.calls.length, 1);
    const row = { pluginId: 'current', packages: [] };
    current.calls[0].resolve({ ok: true, value: [row] }); await flush();
    assert.equal(current.panel.hooks.inventory.getSnapshot().rows[0], row);
    assert.equal(current.errors.length, 0);
  } finally { current.dispose(); }
});

test('固定新版实际 UI 入口：断线收尾不再读取，旧错误失效，重连后的真实错误保留', async () => {
  const current = mount(ui.modified);
  try {
    current.generation({ id: 'first' }); current.events.get('connection/reset')();
    current.generation(undefined); current.panel.onRefresh();
    current.calls[0].reject(Error('old disconnected request')); await flush();
    assert.equal(current.calls.length, 1); assert.equal(current.errors.length, 0);
    current.generation({ id: 'second' }); current.events.get('connection/reset')();
    current.calls[1].resolve({ ok: false, error: { code: 'real_failure', message: 'current' } }); await flush();
    assert.equal(current.errors.length, 1);
    assert.equal(current.panel.hooks.inventory.getSnapshot().error, 'real_failure: current');
  } finally { current.dispose(); }
});
