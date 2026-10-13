import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { installLatestDesktopApps } from '../compatibility/latest-upstream/desktop-apps.mjs';

const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const packagePath = 'node_modules/@deepseek-ai/dsh-host-open-in-app';
const manifest = JSON.parse(await readFile(resolve(runtime, 'desktop-apps/manifest.json'), 'utf8'));

test('从backend准备时编译载荷保持同一哈希，已安装状态仍可识别', async () => {
  const result = spawnSync(process.execPath, [resolve(import.meta.dirname, '../compatibility/latest-upstream/desktop-apps.mjs'), 'prepare'],
    { cwd: resolve(import.meta.dirname, '../../backend'), windowsHide: true, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(await readFile(resolve(runtime, 'desktop-apps/manifest.json'), 'utf8')).files, manifest.files);
  assert.equal((await installLatestDesktopApps('plan')).files, 5);
});
async function fixture() {
  const parent = resolve(runtime, 'desktop-apps/installer-cases');
  await mkdir(parent, { recursive: true });
  const home = await mkdtemp(resolve(parent, 'case-'));
  await mkdir(dirname(resolve(home, packagePath)), { recursive: true });
  await cp(resolve(runtime, packagePath), resolve(home, packagePath), { recursive: true });
  // 候选可以已安装；测试副本始终从受固定哈希核验的原件开始。
  for (const file of manifest.files) {
    const target = resolve(runtime, packagePath, file.path);
    const backup = resolve(runtime, 'desktop-app-originals', file.path.replaceAll('/', '--'));
    const original = await readFile(backup).catch(error => { if (error.code !== 'ENOENT') throw error; return readFile(target); });
    await writeFile(resolve(home, packagePath, file.path), original);
  }
  return home;
}

test('五个编译入口完整安装、幂等与逐字节恢复', async () => {
  const home = await fixture();
  const originals = await Promise.all(manifest.files.map(file => readFile(resolve(home, packagePath, file.path))));
  assert.equal((await installLatestDesktopApps('plan', home)).files, 5);
  assert.equal((await installLatestDesktopApps('apply', home)).written, 5);
  assert.equal((await installLatestDesktopApps('apply', home)).written, 0);
  assert.equal((await installLatestDesktopApps('restore', home)).written, 5);
  assert.equal((await installLatestDesktopApps('restore', home)).written, 0);
  for (const [index, file] of manifest.files.entries()) assert.deepEqual(await readFile(resolve(home, packagePath, file.path)), originals[index]);
});

test('最后一个声明被修改时完整拒绝，前面入口不被提前改写', async () => {
  const home = await fixture();
  const last = manifest.files.at(-1);
  await writeFile(resolve(home, packagePath, last.path), 'unknown declaration');
  const before = await Promise.all(manifest.files.map(file => readFile(resolve(home, packagePath, file.path))));
  await assert.rejects(installLatestDesktopApps('apply', home));
  for (const [index, file] of manifest.files.entries()) assert.deepEqual(await readFile(resolve(home, packagePath, file.path)), before[index]);
});

test('包版本变化拒绝，日常安装目录不在写入范围', async () => {
  const home = await fixture();
  const path = resolve(home, packagePath, 'package.json');
  const metadata = JSON.parse(await readFile(path, 'utf8'));
  await writeFile(path, JSON.stringify({ ...metadata, version: '0.2.1-alpha.2' }));
  await assert.rejects(installLatestDesktopApps('apply', home));
  await assert.rejects(installLatestDesktopApps('apply', resolve(runtime, '../..')), /latest_desktop_outside_candidate/);
});
