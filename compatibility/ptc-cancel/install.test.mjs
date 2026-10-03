import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const { output, files } = await import(process.env.DSHM_PTC_INNER_TEST === '1' ? './prepare-inner.mjs' : './prepare.mjs');
const { patch } = await import(process.env.DSHM_PTC_INNER_TEST === '1' ? './patch-inner.mjs' : './patch.mjs');
import { replaceFile } from '../background-output/install-runtime.mjs';
async function fixture(t) {
  const root = await mkdtemp(resolve(output, 'installation-'));
  t.after(async () => {
    assert.ok(root.startsWith(resolve(output) + '\\installation-'));
    await rm(root, { recursive: true, force: true });
  });
  for (const file of Object.keys(files)) {
    const target = resolve(root, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(output, file.endsWith('.ts') ? 'original.ts' : 'original.mjs'), target);
  }
  return root;
}
test('安装幂等及精确恢复', async t => {
  const root = await fixture(t);
  assert.equal((await patch('apply', root)).written, 2);
  assert.equal((await patch('apply', root)).written, 0);
  assert.equal((await patch('restore', root)).written, 2);
});
test('未知修改拒绝且不写其他入口', async t => {
  const root = await fixture(t), [source, compiled] = Object.keys(files);
  const original = await readFile(resolve(root, source));
  await writeFile(resolve(root, compiled), 'unknown change');
  await assert.rejects(patch('apply', root), /Unknown installed change/);
  assert.deepEqual(await readFile(resolve(root, source)), original);
});
test('第二次写入失败回滚', async t => {
  const root = await fixture(t); let count = 0;
  await assert.rejects(patch('apply', root, async (path, bytes) => {
    if (++count === 2) throw Error('controlled failure');
    await replaceFile(path, bytes);
  }), /controlled failure/);
  assert.equal((await patch('plan', root)).patched, 0);
});
