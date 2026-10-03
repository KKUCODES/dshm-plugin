import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { Context } from '@deepseek-ai/cordis';
import * as plugin from '../../artifacts/compatibility/desktop-app-icons/runtime/index.js';
import { internals } from '../../artifacts/compatibility/desktop-app-icons/runtime/internals.js';

const root = resolve('artifacts/compatibility/desktop-app-icons/test-files');
await mkdir(root, { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hGAAAAAASUVORK5CYII=', 'base64');

// 原Linux图标/目录读取真实临时文件，平台选择与启动器为显式替身；绝不启动应用。
async function fixture(bytes = png, probe) {
  const directory = await mkdtemp(resolve(root, 'case-'));
  await mkdir(resolve(directory, 'applications'));
  await writeFile(resolve(directory, 'code'), 'not executable');
  await writeFile(resolve(directory, 'icon.png'), bytes);
  await writeFile(resolve(directory, 'applications/code.desktop'), `[Desktop Entry]\nType=Application\nName=VS Code\nExec=${resolve(directory, 'code')}\nIcon=${resolve(directory, 'icon.png')}\n`);
  let launched = 0;
  internals.catalog = { platform: 'linux', env: { XDG_DATA_HOME: directory, XDG_DATA_DIRS: directory }, home: directory,
    run: async () => { throw new Error('no OS commands in icon test'); },
    resolveExecutable: async name => { await probe?.(); return name === 'code' ? resolve(directory, 'code') : null; },
    launch: async () => { launched++; } };
  const routes = new Map(), trust = { status: undefined }, ctx = new Context();
  ctx.provide('connection', { requestRejection: () => trust.status });
  ctx.provide('subprocess', { resolveExecutable: async () => null });
  ctx.provide('webServer', { register(route) { routes.set(route.path, route); return () => routes.delete(route.path); } });
  const fiber = ctx.plugin(plugin, { probeTimeoutMs: 100, iconTimeoutMs: 100, launchWatchMs: 1 });
  await fiber.await();
  const service = ctx.get('dshmDesktopApps');
  const request = async () => {
    const req = Readable.from([]); Object.assign(req, { method: 'GET', url: '/open-in-app/icon/vscode', headers: {} });
    let bytes; const headers = {};
    const res = { statusCode: 200, setHeader(key, value) { headers[key] = value; }, end(value) { bytes = value; } };
    await routes.get('/open-in-app/icon').handler(req, res);
    return { status: res.statusCode, bytes, headers };
  };
  return { directory, service, request, trust, get launched() { return launched; },
    async close() { await fiber.dispose(); await ctx.fiber.dispose(); internals.catalog = {}; } };
}

test('内部图标与原网页共用真实文件读取及缓存，调用者不能改写缓存', async () => {
  const f = await fixture();
  try {
    const icon = await f.service.icon('vscode');
    assert.equal(icon.contentType, 'image/png'); assert.deepEqual(icon.bytes, png);
    icon.bytes.fill(0);
    await writeFile(resolve(f.directory, 'icon.png'), 'changed after first extraction');
    assert.deepEqual((await f.service.icon('vscode')).bytes, png);
    const web = await f.request(); assert.equal(web.status, 200); assert.deepEqual(web.bytes, png);
    assert.equal(web.headers['content-type'], 'image/png'); assert.equal(f.launched, 0);
  } finally { await f.close(); }
});

test('未知/不可用应用与超限图标不返回，任意路径不是应用ID', async () => {
  const f = await fixture(Buffer.alloc(256 * 1024 + 1));
  try {
    for (const id of ['unknown', '../icon.png', f.directory, 'vscode', 'cursor']) assert.equal(await f.service.icon(id), null);
    assert.equal(f.launched, 0);
  } finally { await f.close(); }
});

test('原图标网页仍先拒绝401/403，内部服务不新增网页通道', async () => {
  const f = await fixture();
  try {
    for (const status of [401, 403]) { f.trust.status = status; assert.equal((await f.request()).status, status); }
    assert.deepEqual((await f.service.icon('vscode')).bytes, png);
    assert.equal(f.launched, 0);
  } finally { await f.close(); }
});

test('预先取消及卸载后拒绝交付图标', async () => {
  const f = await fixture(), controller = new AbortController(); controller.abort();
  await assert.rejects(f.service.icon('vscode', controller.signal), { name: 'AbortError' });
  await f.close();
  await assert.rejects(f.service.icon('vscode'), { name: 'AbortError' });
});

test('探测在途取消后不交付，其他调用仍可取得原缓存', async () => {
  let release; const held = new Promise(resolve => { release = resolve; });
  const f = await fixture(png, () => held), controller = new AbortController();
  try {
    const pending = f.service.icon('vscode', controller.signal); controller.abort(); release();
    await assert.rejects(pending, { name: 'AbortError' });
    assert.deepEqual((await f.service.icon('vscode')).bytes, png); assert.equal(f.launched, 0);
  } finally { await f.close(); }
});
