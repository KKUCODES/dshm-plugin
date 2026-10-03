import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const endpoint = process.env.DSHM_ENDPOINT_TEST === '1';
const { install, output } = endpoint ? await import('./endpoint.mjs').then(module => ({ ...module, install: module.patch })) : await import('./install.mjs');
const { files } = await import(endpoint ? './endpoint.mjs' : './prepare.mjs');
import { replaceFile } from '../background-output/install-runtime.mjs';

async function fixture() {
  const root = await mkdtemp(resolve(output, 'installation-'));
  for (const [file] of files) {
    const target = resolve(root, 'packages/llm/llm-pi-ai', file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(output, 'before', file), target);
  }
  return root;
}
test('三文件安装幂等和精确恢复', async () => {
  const root = await fixture();
  assert.equal((await install('apply', root)).written, 3);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, 3);
  assert.equal((await install('plan', root)).patched, 0);
});
test('未知编译入口拒绝且其他源码不变', async () => {
  const root = await fixture(), source = resolve(root, 'packages/llm/llm-pi-ai/src/index.ts');
  const before = await readFile(source);
  await writeFile(resolve(root, 'packages/llm/llm-pi-ai/lib/index.js'), 'unknown');
  await assert.rejects(install('apply', root), /Unknown installed change/);
  assert.deepEqual(await readFile(source), before);
});
test('中途写入失败回滚所有已写文件', async () => {
  const root = await fixture(); let count = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++count === 3) throw Error('controlled failure');
    await replaceFile(path, bytes);
  }), /controlled failure/);
  assert.equal((await install('plan', root)).patched, 0);
});
test('参考检出禁止安装', async () => {
  await assert.rejects(install('apply', resolve('../deepseek-harness')), /read-only/);
});
