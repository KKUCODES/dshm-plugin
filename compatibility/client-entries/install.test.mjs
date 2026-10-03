import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install } from './install.mjs';
import { outputRoot } from './build.mjs';
import { runtimeBaselines, sourcePaths } from './build-runtime.mjs';
import { directory } from './changes.mjs';
import { sourceRoot, normalize } from '../background-output/prepare.mjs';

async function fixture(crlf = false) {
  const root = await mkdtemp(resolve(outputRoot, 'install-test-')), originals = new Map();
  for (const path of [`${directory}/package.json`, ...sourcePaths, ...Object.keys(runtimeBaselines)]) {
    let bytes = await readFile(resolve(path in runtimeBaselines ? resolve(outputRoot, 'runtime-original') : sourceRoot, path));
    if (sourcePaths.includes(path)) bytes = Buffer.from(crlf ? normalize(bytes.toString()).replaceAll('\n', '\r\n') : normalize(bytes.toString()));
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), bytes); originals.set(path, bytes);
  }
  return { root, originals };
}
for (const crlf of [false, true]) test(`安装/重复安装/恢复保留${crlf ? 'CRLF' : 'LF'}原字节`, async () => {
  const { root, originals } = await fixture(crlf);
  assert.equal((await install('plan', root)).patched, 0);
  assert.equal((await install('apply', root)).written, 3);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, 3);
  for (const [path, bytes] of originals) assert.deepEqual(await readFile(resolve(root, path)), bytes);
});
test('未知源码/编译文件/版本及恢复前编辑拒绝且不覆盖', async () => {
  for (const kind of ['source', 'runtime', 'package', 'restore']) {
    const { root, originals } = await fixture();
    if (kind === 'restore') await install('apply', root);
    const path = kind === 'package' ? `${directory}/package.json` : kind === 'runtime' ? `${directory}/lib/client.js` : `${directory}/src/client/entries.ts`;
    const before = new Map(await Promise.all([...originals.keys()].map(async key => [key, await readFile(resolve(root, key))])));
    const edit = kind === 'package' ? '{"name":"unknown","version":"next"}' : 'user-edit';
    await writeFile(resolve(root, path), edit);
    await assert.rejects(install(kind === 'restore' ? 'restore' : 'apply', root));
    for (const [key, bytes] of before) if (key !== path) assert.deepEqual(await readFile(resolve(root, key)), bytes);
    assert.equal(await readFile(resolve(root, path), 'utf8'), edit);
  }
});
test('只读参考与目录链接拒绝', async () => {
  await assert.rejects(install('apply', sourceRoot), /read-only/);
  const f = await fixture(), root = await mkdtemp(resolve(outputRoot, 'linked-')), target = resolve(root, directory);
  await mkdir(dirname(target), { recursive: true });
  await symlink(resolve(f.root, directory), target, process.platform === 'win32' ? 'junction' : 'dir');
  try { await assert.rejects(install('apply', root), /Linked/); }
  finally { await unlink(target); }
});
