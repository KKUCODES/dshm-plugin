import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, cp, symlink, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install } from './install.mjs';
import { directory, hashes, generatedHashes, outputRoot, sourceRoot, preparePackage } from './package.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

const testsRoot = resolve(outputRoot, '../install-tests');
const installed = resolve(process.env.DSHM_CORDIS_BASELINE ?? 'F:/Program Files/deepseek-harness');
await mkdir(testsRoot, { recursive: true });
async function fixture() {
  const root = await mkdtemp(resolve(testsRoot, 'case-'));
  await cp(resolve(sourceRoot, directory), resolve(root, directory), { recursive: true });
  for (const path of Object.keys(hashes)) {
    await mkdir(dirname(resolve(root, directory, path)), { recursive: true });
    await cp(resolve(outputRoot, 'before', directory, path), resolve(root, directory, path));
  }
  for (const path of Object.keys(generatedHashes)) {
    await cp(resolve(installed, directory, path), resolve(root, directory, path));
  }
  return root;
}
async function matches(root, kind) {
  for (const path of Object.keys(hashes)) assert.deepEqual(await readFile(resolve(root, directory, path)), await readFile(resolve(outputRoot, kind, directory, path)));
}

test('七文件安装、重复安装与还原逐字节一致，生成接口不变', async () => {
  const root = await fixture();
  assert.equal((await install('plan', root)).patched, 0);
  assert.equal((await install('apply', root)).written, 7); await matches(root, 'after');
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('plan', root)).patched, 7);
  assert.equal((await install('restore', root)).written, 7); await matches(root, 'before');
  assert.equal((await install('restore', root)).written, 0);
  for (const path of Object.keys(generatedHashes)) assert.deepEqual(await readFile(resolve(root, directory, path)), await readFile(resolve(installed, directory, path)));
});

test('参考检出、未知文件/版本、源码依赖及生成接口拒绝且不写入', async () => {
  await assert.rejects(install('apply', sourceRoot), /read-only/);
  for (const file of ['lib/index.js', 'src/sandbox.ts', 'lib/typert.host.js', 'package.json']) {
    const root = await fixture(), path = resolve(root, directory, file);
    await writeFile(path, file === 'package.json' ? JSON.stringify({ name: '@deepseek-ai/dsh-cordis-host-runner', version: 'unknown' }) : 'user change');
    await assert.rejects(install('apply', root), /Unknown installed|Source input changed|Package mismatch|Generated interface changed/);
    assert.deepEqual(await readFile(resolve(root, directory, 'src/index.ts')), await readFile(resolve(outputRoot, 'before', directory, 'src/index.ts')));
    assert.match(await readFile(path, 'utf8'), /user change|unknown/);
  }
});

test('中途写入失败恢复本轮写入', async () => {
  const root = await fixture(); let writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++writes === 2) throw Error('injected write failure');
    await replaceFile(path, bytes);
  }), /injected write failure/);
  assert.equal(writes, 3); await matches(root, 'before');
});

test('中途源码依赖变化阻止成功并恢复补丁，保留外部变化', async () => {
  const root = await fixture(); let writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    await replaceFile(path, bytes);
    if (++writes === 1) await writeFile(resolve(root, directory, 'src/sandbox.ts'), 'external dependency edit');
  }), /Source input changed/);
  await matches(root, 'before');
  assert.equal(await readFile(resolve(root, directory, 'src/sandbox.ts'), 'utf8'), 'external dependency edit');
});

test('回滚遇到外部修改时保留内容并明确失败', async () => {
  const root = await fixture(); let first, writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++writes === 1) { first = path; await replaceFile(path, bytes); }
    else { await writeFile(first, 'concurrent edit'); throw Error('injected failure'); }
  }), /Rollback needs attention/);
  assert.equal(await readFile(first, 'utf8'), 'concurrent edit');
});

test('经目录链接写出安装根被拒绝', async () => {
  const root = await fixture(), linked = await mkdtemp(resolve(testsRoot, 'linked-'));
  await mkdir(resolve(linked, directory), { recursive: true });
  await cp(resolve(root, directory, 'package.json'), resolve(linked, directory, 'package.json'));
  await cp(resolve(root, directory, 'src'), resolve(linked, directory, 'src'), { recursive: true });
  const link = resolve(linked, directory, 'lib');
  await symlink(resolve(root, directory, 'lib'), link, 'junction');
  try { await assert.rejects(install('apply', linked), /Linked target|Linked or non-file/); }
  finally { await unlink(link); }
});

test('固定基线严格重编译得到相同七文件包', async () => {
  assert.equal((await preparePackage(await fixture())).files, 7);
});
