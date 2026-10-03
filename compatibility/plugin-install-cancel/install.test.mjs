import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install, sourcePaths } from './install.mjs';
import { outputRoot, runtimeBaselines } from './build.mjs';
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
for (const crlf of [false, true]) test(`安装与恢复保留${crlf ? 'CRLF' : 'LF'}原字节`, async () => {
  const { root, originals } = await fixture(crlf);
  assert.equal((await install('plan', root)).patched, 0);
  assert.equal((await install('apply', root)).written, 3);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, 3);
  for (const [path, bytes] of originals) assert.deepEqual(await readFile(resolve(root, path)), bytes);
});
test('拒绝未知用户修改和非预期版本，恢复也不覆盖修改', async () => {
  for (const kind of ['source', 'runtime', 'package', 'restore']) {
    const { root, originals } = await fixture();
    if (kind === 'restore') await install('apply', root);
    const path = kind === 'package' ? `${directory}/package.json` : kind === 'runtime' ? `${directory}/lib/index.js` : `${directory}/src/operations.ts`;
    const before = new Map(await Promise.all([...originals.keys()].map(async key => [key, await readFile(resolve(root, key))])));
    await writeFile(resolve(root, path), kind === 'package' ? '{"name":"unknown","version":"next"}' : 'user-edit');
    await assert.rejects(install(kind === 'restore' ? 'restore' : 'apply', root));
    for (const [key, bytes] of before) if (key !== path) assert.deepEqual(await readFile(resolve(root, key)), bytes);
  }
});
test('拒绝参考仓库和目录链接', async () => {
  await assert.rejects(install('apply', sourceRoot), /read-only/);
  const f = await fixture(), root = await mkdtemp(resolve(outputRoot, 'linked-')), target = resolve(root, directory);
  await mkdir(dirname(target), { recursive: true });
  await symlink(resolve(f.root, directory), target, process.platform === 'win32' ? 'junction' : 'dir');
  try { await assert.rejects(install('apply', root), /Linked/); }
  finally { await unlink(target); }
});
