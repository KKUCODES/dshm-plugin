import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { install } from './install.mjs';
import { outputRoot } from './build.mjs';
import { packageNames } from './baselines.mjs';

// 隔离安装副本留在项目artifacts，不触碰运行中的DSH或上游参考检出。
test('完整安装、重复安装和恢复；未知目标先拒绝且不部分写入', async () => {
  const root = await mkdtemp(resolve(outputRoot, 'install-test-'));
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
  for (const [name, pkg] of Object.entries(packageNames)) {
    const path = resolve(root, 'packages/extensions', name, 'package.json');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ name: pkg, version: '0.1.6-alpha.2' }));
  }
  for (const file of manifest.files) {
    const path = resolve(root, 'packages/extensions', file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, await readFile(resolve(outputRoot, 'before', file.path)));
  }
  assert.equal((await install('plan', root)).patched, 0);
  assert.equal((await install('apply', root)).written, manifest.files.length);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('plan', root)).patched, manifest.files.length);
  assert.equal((await install('restore', root)).written, manifest.files.length);
  assert.equal((await install('restore', root)).written, 0);
  const changed = manifest.files.at(-1);
  await writeFile(resolve(root, 'packages/extensions', changed.path), 'external change');
  await assert.rejects(install('apply', root), /Installed file changed/);
  for (const file of manifest.files.slice(0, -1)) {
    assert.deepEqual(await readFile(resolve(root, 'packages/extensions', file.path)),
      await readFile(resolve(outputRoot, 'before', file.path)));
  }
  assert.equal(await readFile(resolve(root, 'packages/extensions', changed.path), 'utf8'), 'external change');
  await assert.rejects(install('apply', fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url))), /read-only/);
});
