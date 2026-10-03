import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install } from './install.mjs';
import { hashes, directory } from './changes.mjs';
import { outputRoot } from './build.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

async function fixture() {
  const root = await mkdtemp(resolve(outputRoot, 'test-install-'));
  for (const [path, name] of [[`${directory}/package.json`, '@deepseek-ai/dsh-client-ui-plugin-manager'],
    ['packages/extensions/cordis-host-runner/package.json', '@deepseek-ai/dsh-cordis-host-runner']]) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), JSON.stringify({ name, version: '0.1.6-alpha.2' }));
  }
  for (const path of Object.keys(hashes)) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), await readFile(resolve(outputRoot, 'before', path)));
  }
  return root;
}
test('副本安装、重复应用和字节恢复', async () => {
  const root = await fixture();
  assert.equal((await install('apply', root)).written, 3);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, 3);
  assert.equal((await install('plan', root)).patched, 0);
});
test('未知编辑拒绝、写入中失败回滚', async () => {
  const root = await fixture(); let count = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++count === 2) throw Error('simulated write failure');
    await replaceFile(path, bytes);
  }), /simulated write failure/);
  assert.equal((await install('plan', root)).patched, 0);
  await writeFile(resolve(root, Object.keys(hashes)[0]), 'user change');
  await assert.rejects(install('apply', root), /Unknown installed change/);
});
