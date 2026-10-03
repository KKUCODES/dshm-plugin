import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { output, patch } from './patch.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';
const files = ['src/index.ts', 'lib/index.js'];
async function fixture(t) {
  const root = await mkdtemp(resolve(output, 'installation-'));
  t.after(async () => {
    assert.ok(root.startsWith(resolve(output) + '\\installation-'));
    await rm(root, { recursive: true, force: true });
  });
  for (const file of files) {
    const target = resolve(root, 'packages/experimental/auto-review', file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(output, file.endsWith('.ts') ? 'original.ts' : 'original.mjs'), target);
  }
  return root;
}
test('安装幂等并精确恢复两个入口', async t => {
  const root = await fixture(t);
  assert.equal((await patch('apply', root)).written, 2);
  assert.equal((await patch('apply', root)).written, 0);
  assert.equal((await patch('restore', root)).written, 2);
  assert.equal((await patch('plan', root)).patched, 0);
});
test('未知修改在写入任何入口之前拒绝', async t => {
  const root = await fixture(t), source = resolve(root, 'packages/experimental/auto-review/src/index.ts');
  const original = await readFile(source);
  await writeFile(resolve(root, 'packages/experimental/auto-review/lib/index.js'), 'external change');
  await assert.rejects(patch('apply', root), /Unknown installed change/);
  assert.deepEqual(await readFile(source), original);
});
test('第二个入口写入失败时恢复第一个', async t => {
  const root = await fixture(t); let count = 0;
  await assert.rejects(patch('apply', root, async (path, bytes) => {
    if (++count === 2) throw Error('controlled write failure');
    await replaceFile(path, bytes);
  }), /controlled write failure/);
  assert.equal((await patch('plan', root)).patched, 0);
});
