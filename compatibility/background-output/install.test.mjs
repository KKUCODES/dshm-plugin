import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { installRuntime, digest } from './install-runtime.mjs';
import { outputRoot, sourceRoot } from './prepare.mjs';
import { installSource } from './install-source.mjs';
import { changes } from './changes.mjs';

test('真实文件副本安装与恢复、重复应用零写、未知文件拒绝、参考检出只读', async () => {
  const target = await mkdtemp(resolve(outputRoot, 'install-test-'));
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'runtime-manifest.json'), 'utf8'));
  const seed = async (path, bytes) => { const dest = resolve(target, path); await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, bytes); };
  for (const file of manifest.files) await seed(file.path, await readFile(resolve(outputRoot, 'runtime-original', file.path)));
  for (const source of manifest.sourceInputs) await seed(source.path, await readFile(resolve(sourceRoot, source.path)));
  for (const pkg of manifest.packages) await seed(`${pkg.directory}/package.json`, await readFile(resolve(sourceRoot, pkg.directory, 'package.json')));
  for (const source of changes) {
    await seed(source.path, await readFile(resolve(sourceRoot, source.path)));
    const pkg = source.path.split('/src/')[0] + '/package.json';
    await seed(pkg, await readFile(resolve(sourceRoot, pkg)));
  }
  assert.equal((await installRuntime('plan', target)).original, manifest.files.length);
  assert.equal((await installRuntime('apply', target)).written, manifest.files.length);
  assert.equal((await installRuntime('apply', target)).written, 0);
  assert.equal((await installSource('apply', target)).written, changes.length);
  assert.equal((await installRuntime('plan', target)).patched, manifest.files.length);
  for (const file of manifest.files) assert.equal(digest(await readFile(resolve(target, file.path))), file.after);
  assert.equal((await installRuntime('restore', target)).written, manifest.files.length);
  for (const file of manifest.files) assert.equal(digest(await readFile(resolve(target, file.path))), file.before);
  assert.equal((await installSource('plan', target)).patched, changes.length);
  assert.equal((await installSource('restore', target)).written, changes.length);
  const changed = manifest.files.at(-1); await seed(changed.path, Buffer.from('unrelated user edit'));
  await assert.rejects(installRuntime('apply', target), /Installed file changed/);
  for (const file of manifest.files.slice(0, -1)) assert.equal(digest(await readFile(resolve(target, file.path))), file.before);
  await assert.rejects(installRuntime('plan', sourceRoot), /read-only/);
});
