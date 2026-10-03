import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install } from './install.mjs';
import { outputRoot, directory } from './package.mjs';
import { sourceRoot } from '../cordis-inspect/package.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

async function fixture() {
  const root = await mkdtemp(resolve(outputRoot, 'install-test-'));
  await cp(resolve(sourceRoot, directory, 'src'), resolve(root, directory, 'src'), { recursive: true });
  await writeFile(resolve(root, directory, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-cordis-host-runner', version: '0.1.6-alpha.2' }));
  const previous = resolve(outputRoot, '../cordis-inspect/package/after', directory);
  await cp(resolve(previous, 'src/inspect-registry.ts'), resolve(root, directory, 'src/inspect-registry.ts'));
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
  for (const file of manifest.files) {
    await mkdir(dirname(resolve(root, file.path)), { recursive: true });
    await cp(resolve(outputRoot, 'before', file.path), resolve(root, file.path));
  }
  for (const file of manifest.inputs.filter(value => value.path.includes('/lib/'))) {
    await mkdir(dirname(resolve(root, file.path)), { recursive: true });
    await cp(resolve('F:/Program Files/deepseek-harness', file.path), resolve(root, file.path));
  }
  return { root, manifest };
}

test('增量安装可重复并恢复原inspect基线，参考检出拒绝写入', async () => {
  const { root, manifest } = await fixture();
  const changed = manifest.files.filter(file => file.before !== file.after).length;
  assert.equal((await install('apply', root)).written, changed);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, changed);
  for (const file of manifest.files) assert.deepEqual(await readFile(resolve(root, file.path)), await readFile(resolve(outputRoot, 'before', file.path)));
  await assert.rejects(install('apply', sourceRoot), /read-only/);
});

test('未知运行文件不部分安装，失败写入恢复已改文件', async () => {
  const { root, manifest } = await fixture();
  const changed = manifest.files.find(file => file.path.endsWith('/lib/index.js'));
  await writeFile(resolve(root, changed.path), 'external change');
  await assert.rejects(install('apply', root), /Unknown installed changes/);
  const first = manifest.files[0];
  assert.deepEqual(await readFile(resolve(root, first.path)), await readFile(resolve(outputRoot, 'before', first.path)));
  await cp(resolve(outputRoot, 'before', changed.path), resolve(root, changed.path));
  let writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++writes === 2) throw Error('injected write failure');
    await replaceFile(path, bytes);
  }), /injected write failure/);
  for (const file of manifest.files) assert.deepEqual(await readFile(resolve(root, file.path)), await readFile(resolve(outputRoot, 'before', file.path)));
});
