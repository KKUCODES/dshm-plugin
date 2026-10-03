import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { Context } from '@deepseek-ai/cordis';
import * as plugin from '../../artifacts/compatibility/desktop-apps/runtime/index.js';
import { internals } from '../../artifacts/compatibility/desktop-apps/runtime/internals.js';
import { launchResolved } from '../../artifacts/compatibility/desktop-apps/runtime/resolver.js';
import { transform, transformResolver } from './changes.mjs';

const root = resolve('artifacts/compatibility/desktop-apps/test-files');
await mkdir(root, { recursive: true });
await writeFile(resolve(root, 'file.txt'), 'not a directory');
await writeFile(resolve(root, 'cursor'), 'test executable is never executed');

// 使用真实插件、Cordis 及目录校验；仅替换系统探测和进程启动，绝不运行外部应用。
async function harness(options = {}) {
  const routes = new Map(), launches = []; let probes = 0;
  internals.catalog = { platform: 'linux', env: {}, home: root,
    run: async () => { throw new Error('test prohibits OS commands'); },
    resolveExecutable: async name => { probes++; await options.probe?.(); return name === 'cursor' ? resolve(root, 'cursor') : null; },
    launch: async (...args) => { launches.push(args); await options.launch?.(launches.length); } };
  const ctx = new Context();
  const trust = { status: undefined };
  ctx.provide('connection', { requestRejection: () => trust.status });
  ctx.provide('subprocess', { resolveExecutable: async () => null });
  ctx.provide('webServer', { register(route) { routes.set(route.path, route); return () => routes.delete(route.path); } });
  const fiber = ctx.plugin(plugin, { probeTimeoutMs: 100, iconTimeoutMs: 100, launchWatchMs: 1 });
  await fiber.await();
  const service = ctx.get('dshmDesktopApps'); assert.ok(service);
  const request = async (path, method = 'GET', body, headers = {}) => {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(body)]);
    Object.assign(req, { method, url: path, headers });
    let text = '';
    const res = { statusCode: 200, setHeader() {}, end(value) { text = value === undefined ? '' : String(value); } };
    await routes.get(path).handler(req, res);
    return { status: res.statusCode, body: text ? JSON.parse(text) : undefined };
  };
  return { service, request, trust, launches, get probes() { return probes; },
    async close() { await fiber.dispose(); await ctx.fiber.dispose(); internals.catalog = {}; } };
}

test('原网页与服务共用同一次探测及相同启动实现', async () => {
  const h = await harness();
  try {
    assert.ok((await h.service.list()).includes('cursor'));
    const probes = h.probes;
    assert.deepEqual((await h.request('/open-in-app/apps')).body.apps, await h.service.list());
    assert.equal(h.probes, probes);
    assert.deepEqual(await h.service.open('cursor', root), { status: 200, payload: { ok: true } });
    assert.deepEqual(await h.request('/open-in-app/open', 'POST', JSON.stringify({ app: 'cursor', path: root }), { 'content-type': 'application/json' }), { status: 200, body: { ok: true } });
    assert.equal(h.launches.length, 2); assert.deepEqual(h.launches[0], h.launches[1]);
    assert.ok(h.launches[0][1].includes(root));
  } finally { await h.close(); }
});

test('原网页401/403、方法、内容类型和请求体限制保留', async () => {
  const h = await harness();
  try {
    for (const status of [401, 403]) {
      h.trust.status = status;
      assert.equal((await h.request('/open-in-app/apps')).status, status);
      assert.equal((await h.request('/open-in-app/icon')).status, status);
      assert.equal((await h.request('/open-in-app/open', 'POST')).status, status);
    }
    assert.equal(h.probes, 0); h.trust.status = undefined;
    assert.equal((await h.request('/open-in-app/apps', 'POST')).status, 405);
    assert.equal((await h.request('/open-in-app/open', 'GET')).status, 405);
    assert.equal((await h.request('/open-in-app/open', 'POST', '{}')).status, 415);
    for (const body of ['broken', '{}', '{"app":2,"path":"/"}'])
      assert.equal((await h.request('/open-in-app/open', 'POST', body, { 'content-type': 'application/json' })).status, 400);
    assert.equal((await h.request('/open-in-app/open', 'POST', 'x'.repeat(65537), { 'content-type': 'application/json' })).status, 413);
    assert.equal(h.launches.length, 0);
  } finally { await h.close(); }
});

test('服务拒绝未知应用、相对路径、文件和缺失目录', async () => {
  const h = await harness();
  try {
    for (const [app, path, expected] of [['not-an-app', root, 400], ['cursor', 'relative', 400], ['cursor', '', 400], ['cursor', resolve(root, 'file.txt'), 404], ['cursor', resolve(root, 'missing'), 404], [null, root, 400]])
      assert.equal((await h.service.open(app, path)).status, expected);
    assert.equal(h.launches.length, 0);
  } finally { await h.close(); }
});

test('已取消或服务卸载后不再探测/启动', async () => {
  const h = await harness();
  const abort = new AbortController(); abort.abort();
  try {
    await assert.rejects(h.service.list(abort.signal), { name: 'AbortError' });
    await assert.rejects(h.service.open('cursor', root, abort.signal), { name: 'AbortError' });
    assert.equal(h.probes, 0);
  } finally { await h.close(); }
  await assert.rejects(h.service.list(), { name: 'AbortError' });
  await assert.rejects(h.service.open('cursor', root), { name: 'AbortError' });
  assert.equal(h.launches.length, 0);
});

test('探测期间取消，迟到结果不启动应用', async () => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  const h = await harness({ probe: async () => { entered(); await held; } });
  const abort = new AbortController();
  try {
    const opening = h.service.open('cursor', root, abort.signal);
    const check = assert.rejects(opening, { name: 'AbortError' });
    await started; abort.abort(); release(); await check;
    assert.equal(h.launches.length, 0);
  } finally { release(); await h.close(); }
});

test('保留丢失可执行文件的单次重探测，普通启动失败不重试', async () => {
  for (const missing of [true, false]) {
    const h = await harness({ launch: async count => { if (count === 1) throw Object.assign(new Error('failed'), { code: missing ? 'ENOENT' : 'EACCES' }); } });
    try {
      assert.equal((await h.service.open('cursor', root)).status, missing ? 200 : 502);
      assert.equal(h.launches.length, missing ? 2 : 1);
    } finally { await h.close(); }
  }
});

test('启动途中取消不再执行丢失应用重试', async () => {
  const abort = new AbortController();
  const h = await harness({ launch: async () => { abort.abort(); throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
  try {
    await assert.rejects(h.service.open('cursor', root, abort.signal), { name: 'AbortError' });
    assert.equal(h.launches.length, 1);
  } finally { await h.close(); }
});

test('拒绝重复补丁或不匹配源码', async () => {
  const source = await readFile('../deepseek-harness/packages/host/open-in-app/src/index.ts', 'utf8');
  assert.throws(() => transform(transform(source)), /baseline mismatch/);
  assert.throws(() => transform('unknown'), /baseline mismatch/);
  const resolver = await readFile('../deepseek-harness/packages/host/open-in-app/src/resolver.ts', 'utf8');
  assert.throws(() => transformResolver(transformResolver(resolver)), /baseline mismatch/);
});

test('首选启动失败期间取消，原备用启动器不得继续执行', async () => {
  for (const cancelled of [false, true]) {
    const abort = new AbortController(), calls = [];
    const resolved = { launch: { kind: 'argv', command: 'primary', args: [] }, fallbackLaunch: { kind: 'argv', command: 'fallback', args: [] } };
    const operation = launchResolved(resolved, root, 1, { platform: 'linux', env: {}, resolveExecutable: async () => null,
      launch: async command => { calls.push(command); if (command === 'primary') { if (cancelled) abort.abort(); throw new Error('primary failed'); } } }, abort.signal);
    if (cancelled) { await assert.rejects(operation, { name: 'AbortError' }); assert.deepEqual(calls, ['primary']); }
    else { assert.equal(await operation, 'launched'); assert.deepEqual(calls, ['primary', 'fallback']); }
  }
});
