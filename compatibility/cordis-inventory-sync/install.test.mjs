import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { install } from './install.mjs';
import { outputRoot } from './build.mjs';
import { sourceRoot } from '../cordis-inspect/package.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

async function fixture() {
  const root = await mkdtemp(resolve(outputRoot, 'install-test-'));
  for (const [path, name] of [['extensions/ui-cordis', '@deepseek-ai/dsh-client-ui-cordis'], ['extensions/cordis-host-runner', '@deepseek-ai/dsh-cordis-host-runner'], ['api/remotes', '@deepseek-ai/dsh-api-remotes']]) {
    await mkdir(resolve(root, 'packages', path), { recursive: true });
    await writeFile(resolve(root, 'packages', path, 'package.json'), JSON.stringify({ name, version: '0.1.6-alpha.2' }));
  }
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
  for (const file of manifest.files) {
    await mkdir(dirname(resolve(root, 'packages', file.path)), { recursive: true });
    await cp(resolve(outputRoot, 'before', file.path), resolve(root, 'packages', file.path));
  }
  return { root, manifest };
}

test('23文件安装可重复并完整恢复两个既有补丁基线，参考检出拒绝写入', async () => {
  const { root, manifest } = await fixture();
  const changed = manifest.files.filter(file => file.before !== file.after).length;
  assert.equal((await install('apply', root)).written, changed);
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('restore', root)).written, changed);
  for (const file of manifest.files) assert.deepEqual(await readFile(resolve(root, 'packages', file.path)), await readFile(resolve(outputRoot, 'before', file.path)));
  await assert.rejects(install('apply', sourceRoot), /read-only/);
});

test('未知修改预检拒绝，写入中断回滚所有已修改文件', async () => {
  const { root, manifest } = await fixture();
  const changed = manifest.files.find(file => file.path === 'api/remotes/lib/index.js');
  await writeFile(resolve(root, 'packages', changed.path), 'external change');
  await assert.rejects(install('apply', root), /Unknown installed changes/);
  const first = manifest.files[0];
  assert.deepEqual(await readFile(resolve(root, 'packages', first.path)), await readFile(resolve(outputRoot, 'before', first.path)));
  await cp(resolve(outputRoot, 'before', changed.path), resolve(root, 'packages', changed.path));
  let writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++writes === 3) throw Error('injected failure'); await replaceFile(path, bytes);
  }), /injected failure/);
  for (const file of manifest.files) assert.deepEqual(await readFile(resolve(root, 'packages', file.path)), await readFile(resolve(outputRoot, 'before', file.path)));
});

test('反射仅增加原生成器产生的通知，完整现有模型与RPC描述保持', async () => {
  const previous = (await import(pathToFileURL(resolve(outputRoot, 'before/extensions/cordis-host-runner/lib/typert.host.js')).href)).TYPERT;
  const next = (await import(pathToFileURL(resolve(outputRoot, 'after/extensions/cordis-host-runner/lib/typert.host.js')).href)).TYPERT;
  const event = next.model.events.filter(value => value.name === 'cordis/inventory-changed');
  assert.equal(event.length, 1); assert.equal(event[0].mode, 'emit');
  assert.deepEqual(JSON.parse(JSON.stringify({ ...next, model: { ...next.model, events: next.model.events.filter(value => value !== event[0]) } })), JSON.parse(JSON.stringify(previous)));
});
