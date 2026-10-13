import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const mode = process.env.DSHM_LATEST_DESKTOP_MODE ?? 'copy';
assert.ok(['copy', 'compiled', 'source'].includes(mode));
const source = resolve(import.meta.dirname, '../artifacts/latest-source-check');
const require = createRequire(resolve(mode === 'source' ? source : runtime, 'package.json'));
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
const directory = resolve(runtime, 'desktop-apps/validation');
const modules = mode === 'source' ? resolve(source, 'packages/host/open-in-app/src')
  : mode === 'compiled' ? resolve(runtime, 'node_modules/@deepseek-ai/dsh-host-open-in-app/lib/types') : directory;
const extension = mode === 'source' ? 'ts' : mode === 'compiled' ? 'js' : 'mjs';
const plugin = await import(pathToFileURL(resolve(modules, 'index.' + extension)).href);
const { internals } = await import(pathToFileURL(resolve(modules, 'internals.' + extension)).href);
const { launchResolved } = await import(pathToFileURL(resolve(modules, 'resolver.' + extension)).href);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hGAAAAAASUVORK5CYII=', 'base64');

// 新版原 Cordis/插件/目录与图标读取；明确替换系统探测和启动，不执行用户应用。
async function fixture(t, options = {}) {
  const home = await mkdtemp(resolve(directory, 'case-'));
  await mkdir(resolve(home, 'applications'));
  await writeFile(resolve(home, 'code'), 'controlled executable; never started');
  await writeFile(resolve(home, 'icon.png'), options.icon ?? png);
  await writeFile(resolve(home, 'file.txt'), 'not a directory');
  await writeFile(resolve(home, 'applications/code.desktop'), `[Desktop Entry]\nType=Application\nName=VS Code\nExec=${resolve(home, 'code')}\nIcon=${resolve(home, 'icon.png')}\n`);
  const launches = [], routes = new Map(), trust = { status: undefined };
  let probes = 0;
  internals.catalog = { platform: 'linux', env: { XDG_DATA_HOME: home, XDG_DATA_DIRS: home }, home,
    run: async () => { throw Error('controlled test forbids OS commands'); },
    resolveExecutable: async name => { probes++; await options.probe?.(); return name === 'code' ? resolve(home, 'code') : null; },
    launch: async (...args) => { launches.push(args); await options.launch?.(launches.length); } };
  const ctx = new Context();
  ctx.provide('connection', { requestRejection: () => trust.status });
  ctx.provide('subprocess', { resolveExecutable: async () => null });
  ctx.provide('webServer', { register(route) { routes.set(route.path, route); return () => routes.delete(route.path); } });
  const fiber = ctx.plugin(plugin, { probeTimeoutMs: 100, iconTimeoutMs: 100, launchWatchMs: 1 });
  await fiber.await();
  let disposed = false;
  const close = async () => { if (!disposed) { disposed = true; await fiber.dispose(); await ctx.fiber.dispose(); internals.catalog = {}; } };
  t.after(close);
  const service = ctx.get('dshmDesktopApps'); assert.ok(service);
  const request = async (path, method = 'GET', body, headers = {}) => {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(body)]);
    Object.assign(req, { url: path, method, headers });
    const responseHeaders = {}; let value;
    const res = { statusCode: 200, setHeader(key, content) { responseHeaders[key] = content; }, end(content) { value = content; } };
    const route = [...routes.values()].find(item => item.kind === 'prefix' ? path.startsWith(item.path) : item.path === path);
    assert.ok(route); await route.handler(req, res);
    return { status: res.statusCode, headers: responseHeaders, value };
  };
  return { home, service, request, launches, trust, close, get probes() { return probes; } };
}

test('新版内部服务与原网页共享探测、图标缓存及启动器', async t => {
  const f = await fixture(t);
  assert.ok((await f.service.list()).includes('vscode'));
  const probes = f.probes;
  const web = await f.request('/open-in-app/apps');
  assert.deepEqual(JSON.parse(web.value).apps, await f.service.list()); assert.equal(f.probes, probes);
  const icon = await f.service.icon('vscode'); assert.deepEqual(icon.bytes, png); icon.bytes.fill(0);
  await writeFile(resolve(f.home, 'icon.png'), 'changed after extraction');
  assert.deepEqual((await f.service.icon('vscode')).bytes, png);
  const image = await f.request('/open-in-app/icon/vscode');
  assert.equal(image.status, 200); assert.equal(image.headers['content-type'], 'image/png'); assert.deepEqual(image.value, png);
  assert.deepEqual(await f.service.open('vscode', f.home), { status: 200, payload: { ok: true } });
  const opened = await f.request('/open-in-app/open', 'POST', JSON.stringify({ app: 'vscode', path: f.home }), { 'content-type': 'application/json' });
  assert.equal(opened.status, 200); assert.deepEqual(JSON.parse(opened.value), { ok: true });
  assert.equal(f.launches.length, 2); assert.deepEqual(f.launches[0], f.launches[1]);
});

test('原网页信任、方法、正文限制不因内部服务新增而放宽', async t => {
  const f = await fixture(t);
  for (const status of [401, 403]) {
    f.trust.status = status;
    for (const path of ['/open-in-app/apps', '/open-in-app/icon/vscode', '/open-in-app/open']) assert.equal((await f.request(path)).status, status);
  }
  assert.equal(f.probes, 0); f.trust.status = undefined;
  assert.equal((await f.request('/open-in-app/apps', 'POST')).status, 405);
  assert.equal((await f.request('/open-in-app/open', 'GET')).status, 405);
  assert.equal((await f.request('/open-in-app/open', 'POST', '{}')).status, 415);
  for (const body of ['broken', '{}', '{"app":2,"path":"/"}']) assert.equal((await f.request('/open-in-app/open', 'POST', body, { 'content-type': 'application/json' })).status, 400);
  assert.equal((await f.request('/open-in-app/open', 'POST', 'x'.repeat(65537), { 'content-type': 'application/json' })).status, 413);
  assert.equal(f.launches.length, 0);
});

test('内部服务拒绝任意路径应用ID、相对目录、文件及超限图标', async t => {
  const f = await fixture(t, { icon: Buffer.alloc(256 * 1024 + 1) });
  for (const id of ['unknown', '../icon.png', f.home, 'vscode']) assert.equal(await f.service.icon(id), null);
  for (const [app, path, status] of [['unknown', f.home, 400], ['vscode', 'relative', 400], ['vscode', resolve(f.home, 'file.txt'), 404], ['vscode', resolve(f.home, 'missing'), 404]]) assert.equal((await f.service.open(app, path)).status, status);
  assert.equal(f.launches.length, 0);
});

test('取消与卸载后不再交付缓存或启动应用', async t => {
  const f = await fixture(t); const controller = new AbortController(); controller.abort();
  for (const task of [() => f.service.list(controller.signal), () => f.service.icon('vscode', controller.signal), () => f.service.open('vscode', f.home, controller.signal)]) await assert.rejects(task, { name: 'AbortError' });
  assert.equal(f.probes, 0); await f.close();
  for (const task of [() => f.service.list(), () => f.service.icon('vscode'), () => f.service.open('vscode', f.home)]) await assert.rejects(task, { name: 'AbortError' });
  assert.equal(f.launches.length, 0);
});

test('探测中取消拒绝迟到启动；其他调用继续使用原缓存', async t => {
  const started = Promise.withResolvers(), held = Promise.withResolvers();
  const f = await fixture(t, { probe: async () => { started.resolve(); await held.promise; } });
  const controller = new AbortController();
  const opening = f.service.open('vscode', f.home, controller.signal);
  const rejected = assert.rejects(opening, { name: 'AbortError' });
  await started.promise; controller.abort(); held.resolve(); await rejected;
  assert.equal(f.launches.length, 0); assert.deepEqual((await f.service.icon('vscode')).bytes, png);
});

test('原备用启动器在首选启动后取消时不再运行', async () => {
  const controller = new AbortController(); let launches = 0;
  await assert.rejects(launchResolved({ launch: { kind: 'argv', command: 'primary', args: [] }, fallbackLaunch: { kind: 'argv', command: 'fallback', args: [] } },
    directory, 1, { platform: 'linux', env: {}, resolveExecutable: async () => null,
      launch: async () => { launches++; controller.abort(); throw Error('controlled failure'); } }, controller.signal), { name: 'AbortError' });
  assert.equal(launches, 1);
});

test('丢失应用只重新探测一次；普通启动故障不重试', async t => {
  for (const missing of [true, false]) {
    const f = await fixture(t, { launch: async number => { if (number === 1) throw Object.assign(Error('controlled launch failure'), missing ? { code: 'ENOENT' } : {}); } });
    await f.service.list(); const probes = f.probes;
    const outcome = await f.service.open('vscode', f.home);
    assert.equal(outcome.status, missing ? 200 : 502);
    assert.equal(f.launches.length, missing ? 2 : 1);
    assert.equal(f.probes > probes, missing);
    await f.close();
  }
});

test('首选启动后取消不进入缺失应用的重新探测', async t => {
  const controller = new AbortController();
  const f = await fixture(t, { launch: async () => { controller.abort(); throw Object.assign(Error('controlled missing'), { code: 'ENOENT' }); } });
  await f.service.list(); const probes = f.probes;
  await assert.rejects(f.service.open('vscode', f.home, controller.signal), { name: 'AbortError' });
  assert.equal(f.probes, probes); assert.equal(f.launches.length, 1);
});
