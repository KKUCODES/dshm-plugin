import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install, output } from './package.mjs';
import { directory, sourceRoot, outputRoot as previous } from '../desktop-apps/package.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

const tests = resolve(output, '../install-tests'); await mkdir(tests, { recursive: true });
const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'));
async function fixture() {
  const root = await mkdtemp(resolve(tests, 'case-'));
  await cp(resolve(sourceRoot, directory), resolve(root, directory), { recursive: true });
  const files = JSON.parse(await readFile(resolve(previous, 'manifest.json'), 'utf8')).files;
  for (const file of files) {
    await mkdir(dirname(resolve(root, file.path)), { recursive: true });
    await cp(resolve(previous, 'after', file.path), resolve(root, file.path));
  }
  return root;
}
async function matches(root, stage) {
  for (const file of manifest.files) assert.deepEqual(await readFile(resolve(root, file.path)), await readFile(resolve(output, stage, file.path)));
}
test('四文件安装及重复安装，恢复保留desktop-apps-v1', async () => {
  const root = await fixture();
  assert.equal((await install('plan', root)).patched, 0);
  assert.equal((await install('apply', root)).written, 4); await matches(root, 'after');
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, 4); await matches(root, 'before');
  assert.equal((await install('restore', root)).written, 0);
});
test('未知目标或图标提取源依赖改动在写入前拒绝', async () => {
  for (const file of ['src/index.ts', 'src/icons.ts', 'lib/types/resolver.js']) {
    const root = await fixture(), path = resolve(root, directory, file);
    await writeFile(path, 'user change');
    await assert.rejects(install('apply', root), /Unknown installed|dependency changed/);
    assert.equal(await readFile(path, 'utf8'), 'user change');
    assert.deepEqual(await readFile(resolve(root, directory, 'lib/index.js')), await readFile(resolve(output, 'before', directory, 'lib/index.js')));
  }
  await assert.rejects(install('apply', sourceRoot), /read-only/);
});
test('部分写入失败仅回滚本次改动，原应用补丁保留', async () => {
  const root = await fixture(); let count = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++count === 2) throw Error('test write failure');
    await replaceFile(path, bytes);
  }), /test write failure/);
  assert.equal(count, 3); await matches(root, 'before');
});
test('回滚期间外部修改保持原样并报告失败', async () => {
  const root = await fixture(); let first;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (!first) { first = path; await replaceFile(path, bytes); }
    else { await writeFile(first, 'concurrent change'); throw Error('test failure'); }
  }), /rollback needs attention/);
  assert.equal(await readFile(first, 'utf8'), 'concurrent change');
});
