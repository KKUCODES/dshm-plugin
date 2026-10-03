import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, symlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install } from './install.mjs';
import { baseline, outputRoot } from './package.mjs';
import { replaceFile, digest } from '../background-output/install-runtime.mjs';

const source = 'F:/Program Files/deepseek-harness';
async function fixture() {
  const root = await mkdtemp(resolve(outputRoot, 'install-fixture-'));
  for (const path of Object.keys(baseline.hashes)) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    // 安装后仍从打包时保存的原件构造基线，避免测试依赖当前电脑是否已修复。
    const bytes = await readFile(baseline.outputs.includes(path) ? resolve(outputRoot, 'before', path) : resolve(source, path));
    assert.equal(digest(bytes), baseline.hashes[path]);
    await writeFile(resolve(root, path), bytes);
  }
  return root;
}
async function assertOriginal(root) {
  for (const [path, hash] of Object.entries(baseline.hashes)) assert.equal(digest(await readFile(resolve(root, path))), hash, path);
}
test('源码和编译成套安装、重复零写入、恢复逐字节一致', async () => {
  const root = await fixture();
  assert.equal((await install('plan', root)).files, 12);
  assert.ok((await install('apply', root)).written > 0);
  assert.equal((await install('apply', root)).written, 0);
  assert.ok((await install('restore', root)).written > 0);
  await assertOriginal(root); assert.equal((await install('restore', root)).written, 0);
});
test('第四个文件写入失败时恢复本次此前写入', async () => {
  const root = await fixture(); let writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++writes === 4) throw Error('injected-write-failure'); await replaceFile(path, bytes);
  }), /injected-write-failure/);
  await assertOriginal(root);
});
test('未知源码或包版本在写入前拒绝，保留用户修改', async () => {
  for (const path of ['packages/sandbox/sandbox-windows-acl/src/spawn.ts', 'packages/shell/pwsh-local/package.json']) {
    const root = await fixture(), value = Buffer.concat([await readFile(resolve(root, path)), Buffer.from('\nunknown')]);
    await writeFile(resolve(root, path), value);
    let writes = 0; await assert.rejects(install('apply', root, async () => { writes++; }), /Changed encoding input/);
    assert.equal(writes, 0); assert.ok((await readFile(resolve(root, path))).equals(value));
  }
});
test('目录链接拒绝，不通过链接改另一份安装副本', async () => {
  const original = await fixture(), linked = await mkdtemp(resolve(outputRoot, 'install-linked-'));
  await symlink(resolve(original, 'packages'), resolve(linked, 'packages'), 'junction');
  await assert.rejects(install('apply', linked), /Linked/); await assertOriginal(original);
});
test('上游参考检出始终只读', async () => {
  await assert.rejects(install('apply', '../deepseek-harness'), /Reference checkout is read-only/);
});
