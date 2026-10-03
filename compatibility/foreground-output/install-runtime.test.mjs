import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { installSource } from './install-source.mjs';
import { installRuntime } from './install-runtime.mjs';
import { changes } from './changes.mjs';
import { changes as backgroundChanges } from '../background-output/changes.mjs';
import { sourceRoot, outputRoot as backgroundRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { outputRoot } from './build-test-runtime.mjs';

async function fixture() {
  const root = await mkdtemp(resolve(outputRoot, 'runtime-install-')), originals = new Map();
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'runtime-manifest.json'), 'utf8'));
  const background = JSON.parse(await readFile(resolve(backgroundRoot, 'runtime-manifest.json'), 'utf8'));
  const sourcePaths = new Set([...changes, ...backgroundChanges, ...manifest.sourceInputs].map(item => item.path));
  for (const path of [...sourcePaths]) if (path.includes('/src/')) sourcePaths.add(path.split('/src/')[0] + '/package.json');
  for (const path of ['package.json', 'src/index.ts', 'src/store.ts']) sourcePaths.add(`packages/core/scope/${path}`);
  const put = async (path, bytes) => {
    await mkdir(dirname(resolve(root, path)), { recursive: true }); await writeFile(resolve(root, path), bytes);
    originals.set(path, Buffer.from(bytes));
  };
  for (const path of sourcePaths) {
    const original = normalize(await readFile(resolve(sourceRoot, path), 'utf8'));
    const backgroundChange = backgroundChanges.find(change => change.path === path);
    await put(path, backgroundChange ? applyChange(backgroundChange, original) : original);
  }
  for (const file of background.files) await put(file.path, await readFile(resolve(backgroundRoot, 'runtime', file.path)));
  for (const file of manifest.files) await put(file.path, await readFile(resolve(outputRoot, 'runtime-original', file.path)));
  await put('packages/core/scope/lib/index.js', 'export const fixture = true;');
  return { root, originals, manifest };
}

test('源码和编译增量配套安装，恢复回后台版本；重复安装/恢复零写入', async () => {
  const { root, originals } = await fixture();
  assert.equal((await installRuntime('plan', root)).patched, 0);
  await assert.rejects(installRuntime('apply', root), /Apply foreground source/);
  await installSource('apply', root);
  assert.equal((await installRuntime('apply', root)).written, 11);
  assert.equal((await installRuntime('plan', root)).patched, 11);
  assert.equal((await installRuntime('apply', root)).written, 0);
  assert.equal((await installRuntime('restore', root)).written, 11);
  assert.equal((await installRuntime('restore', root)).written, 0);
  await installSource('restore', root);
  for (const [path, bytes] of originals) assert.deepEqual(await readFile(resolve(root, path)), bytes);
});

test('修改过的编译产物拒绝安装或恢复，不覆盖同目录其他文件', async () => {
  const { root, manifest } = await fixture();
  await installSource('apply', root); await installRuntime('apply', root);
  const path = manifest.files.at(-1).path, other = manifest.files[0].path;
  const otherBytes = await readFile(resolve(root, other));
  await writeFile(resolve(root, path), 'user runtime edit');
  for (const action of ['plan', 'apply', 'restore']) await assert.rejects(installRuntime(action, root), /Installed runtime changed/);
  assert.deepEqual(await readFile(resolve(root, other)), otherBytes);
  assert.equal(await readFile(resolve(root, path), 'utf8'), 'user runtime edit');
});
