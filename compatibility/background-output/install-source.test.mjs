import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, symlink, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { installSource } from './install-source.mjs';
import { changes } from './changes.mjs';
import { sourceRoot, outputRoot, normalize } from './prepare.mjs';

async function fixture(crlf = false) {
  const root = await mkdtemp(resolve(outputRoot, 'source-install-test-')), originals = new Map();
  for (const change of changes) {
    const path = resolve(root, change.path);
    await mkdir(dirname(path), { recursive: true });
    const normalized = normalize(await readFile(resolve(sourceRoot, change.path), 'utf8'));
    const bytes = Buffer.from(crlf ? normalized.replaceAll('\n', '\r\n') : normalized);
    originals.set(change.path, bytes); await writeFile(path, bytes);
    const pkg = change.path.split('/src/')[0] + '/package.json';
    await writeFile(resolve(root, pkg), await readFile(resolve(sourceRoot, pkg)));
  }
  return { root, originals };
}

for (const crlf of [false, true]) test(`源码安装与恢复逐字节一致（${crlf ? 'CRLF' : 'LF'}），重复操作零写入`, async () => {
  const { root, originals } = await fixture(crlf);
  assert.equal((await installSource('plan', root)).original, changes.length);
  assert.equal((await installSource('apply', root)).written, changes.length);
  assert.equal((await installSource('plan', root)).patched, changes.length);
  assert.equal((await installSource('apply', root)).written, 0);
  assert.equal((await installSource('restore', root)).written, changes.length);
  assert.equal((await installSource('restore', root)).written, 0);
  for (const [path, bytes] of originals) assert.deepEqual(await readFile(resolve(root, path)), bytes);
});

test('未知源码、版本、编码拒绝且不改变其他文件，恢复也不覆盖用户修改', async () => {
  const { root, originals } = await fixture();
  const last = changes.at(-1).path;
  await writeFile(resolve(root, last), 'user change');
  await assert.rejects(installSource('apply', root), /Source mismatch/);
  for (const [path, bytes] of originals) if (path !== last) assert.deepEqual(await readFile(resolve(root, path)), bytes);
  await writeFile(resolve(root, last), originals.get(last));
  const packagePath = resolve(root, last.split('/src/')[0], 'package.json');
  const manifest = JSON.parse(await readFile(packagePath));
  await writeFile(packagePath, JSON.stringify({ ...manifest, version: 'different' }));
  await assert.rejects(installSource('apply', root), /Package mismatch/);
  await writeFile(packagePath, JSON.stringify(manifest));
  await writeFile(resolve(root, last), originals.get(last).toString().replace('\n', '\r\n'));
  await assert.rejects(installSource('apply', root), /line endings/);
  await writeFile(resolve(root, last), originals.get(last));
  await installSource('apply', root);
  await writeFile(resolve(root, last), 'new user change');
  await assert.rejects(installSource('restore', root), /Source mismatch/);
  assert.equal(await readFile(resolve(root, last), 'utf8'), 'new user change');
});

test('参考检出与越界目录链接拒绝写入', async () => {
  await assert.rejects(installSource('plan', sourceRoot), /read-only/);
  const { root } = await fixture(), directory = await mkdtemp(resolve(outputRoot, 'source-link-test-'));
  const alias = resolve(directory, 'target');
  await symlink(sourceRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');
  try { await assert.rejects(installSource('apply', alias), /read-only/); }
  finally { await unlink(alias); }
  // 替换含源码的目录为外部真实副本的链接，不能经它写到 targetRoot 之外。
  const outside = await fixture();
  const linked = resolve(root, 'linked');
  await symlink(outside.root, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const { existingInside } = await import('./install-runtime.mjs');
  try { await assert.rejects(existingInside(root, `linked/${changes[0].path}`), /Linked target/); }
  finally { await unlink(linked); }
});
