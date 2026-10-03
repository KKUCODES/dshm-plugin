import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install } from './install.mjs';
import { outputRoot } from './build-test-runtime.mjs';
import { directory, runtimeBaselines } from './build-runtime.mjs';
import { sourceRoot, normalize } from '../background-output/prepare.mjs';

async function fixture(crlf = false) {
  const root = await mkdtemp(resolve(outputRoot, 'install-test-')), originals = new Map();
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'runtime-manifest.json'), 'utf8'));
  for (const path of [`${directory}/package.json`, ...manifest.sourceInputs.map(input => input.path), ...Object.keys(runtimeBaselines)]) {
    let bytes = await readFile(resolve(path in runtimeBaselines ? resolve(outputRoot, 'runtime-original') : sourceRoot, path));
    if (path.endsWith('.ts') && !path.includes('/lib/')) bytes = Buffer.from(crlf ? normalize(bytes.toString()).replaceAll('\n', '\r\n') : normalize(bytes.toString()));
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), bytes); originals.set(path, bytes);
  }
  // 与既有后台/前台补丁、浏览器客户端无关，安装器不得写出五个入口。
  for (const path of [`${directory}/lib/client.js`, 'packages/shell/shell/lib/index.js']) {
    const bytes = Buffer.from('existing-other-patch');
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), bytes); originals.set(path, bytes);
  }
  return { root, originals };
}

for (const crlf of [false, true]) test(`源码与编译一起安装、幂等及恢复${crlf ? 'CRLF' : 'LF'}原字节`, async () => {
  const { root, originals } = await fixture(crlf);
  assert.equal((await install('plan', root)).patched, 0);
  assert.equal((await install('apply', root)).written, 5);
  assert.equal((await install('plan', root)).patched, 5);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, 5);
  assert.equal((await install('restore', root)).written, 0);
  for (const [path, before] of originals) assert.deepEqual(await readFile(resolve(root, path)), before);
});

test('未知源码、运行文件、包版本及恢复前的用户编辑全部拒绝且不覆盖其他文件', async () => {
  for (const kind of ['source', 'runtime', 'package', 'restore']) {
    const { root, originals } = await fixture();
    if (kind === 'restore') await install('apply', root);
    const path = kind === 'package' ? `${directory}/package.json`
      : kind === 'runtime' ? `${directory}/lib/index.js` : `${directory}/src/types.ts`;
    const before = new Map(await Promise.all([...originals.keys()].map(async key => [key, await readFile(resolve(root, key))])));
    await writeFile(resolve(root, path), kind === 'package' ? '{"name":"@deepseek-ai/dsh-api-gateway","version":"next"}' : 'user-edit');
    await assert.rejects(install(kind === 'restore' ? 'restore' : 'apply', root));
    for (const [key, bytes] of before) if (key !== path) assert.deepEqual(await readFile(resolve(root, key)), bytes);
    assert.match(await readFile(resolve(root, path), 'utf8'), /user-edit|next/);
  }
});

test('只读上游与跨安装目录链接拒绝，无写入', async () => {
  await assert.rejects(install('apply', sourceRoot), /read-only/);
  const other = await fixture(), root = await mkdtemp(resolve(outputRoot, 'linked-install-'));
  // Windows 的目录 junction 不要求开发者模式；不移动或删除已有目录。
  const target = resolve(root, directory);
  await mkdir(dirname(target), { recursive: true });
  await symlink(resolve(other.root, directory), target, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    await assert.rejects(install('apply', root), /Linked/);
    for (const [key, bytes] of other.originals) assert.deepEqual(await readFile(resolve(other.root, key)), bytes);
  } finally { await unlink(target); }
});

test('混合换行拒绝；已知部分安装可收敛或恢复', async () => {
  const { root, originals } = await fixture();
  const path = `${directory}/src/types.ts`, target = resolve(root, path);
  await writeFile(target, originals.get(path).toString().replace('\n', '\r\n'));
  await assert.rejects(install('apply', root), /Source mismatch/);
  await writeFile(target, originals.get(path));
  await install('apply', root);
  await writeFile(target, originals.get(path));
  assert.equal((await install('plan', root)).patched, 4);
  assert.equal((await install('apply', root)).written, 1);
  await writeFile(target, originals.get(path));
  assert.equal((await install('restore', root)).written, 4);
  for (const [key, bytes] of originals) assert.deepEqual(await readFile(resolve(root, key)), bytes);
});
