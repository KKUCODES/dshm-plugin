import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, cp, symlink, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { install } from './install.mjs';
import { directory, hashes, outputRoot, sourceRoot, preparePackage } from './package.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

const testsRoot = resolve(outputRoot, '../install-tests');
await mkdir(testsRoot, { recursive: true });
async function fixture() {
  const root = await mkdtemp(resolve(testsRoot, 'case-'));
  await cp(resolve(sourceRoot, directory), resolve(root, directory), { recursive: true });
  for (const path of Object.keys(hashes)) {
    await mkdir(dirname(resolve(root, directory, path)), { recursive: true });
    await cp(resolve(outputRoot, 'before', directory, path), resolve(root, directory, path));
  }
  return root;
}
async function matches(root, kind) {
  for (const path of Object.keys(hashes)) assert.deepEqual(await readFile(resolve(root, directory, path)), await readFile(resolve(outputRoot, kind, directory, path)));
}

test('七文件安装、重复安装、还原逐字节一致', async () => {
  const root = await fixture();
  assert.equal((await install('plan', root)).patched, 0);
  assert.equal((await install('apply', root)).written, 7); await matches(root, 'after');
  assert.equal((await install('apply', root)).written, 0);
  assert.equal((await install('plan', root)).patched, 7);
  assert.equal((await install('restore', root)).written, 7); await matches(root, 'before');
  assert.equal((await install('restore', root)).written, 0);
});

test('未知目标改动、版本、源依赖以及参考检出拒绝', async () => {
  await assert.rejects(install('apply', sourceRoot), /read-only/);
  for (const file of ['lib/index.js', 'src/catalog.ts', 'package.json']) {
    const root = await fixture(), path = resolve(root, directory, file);
    await writeFile(path, file === 'package.json' ? JSON.stringify({ name: '@deepseek-ai/dsh-host-open-in-app', version: 'unknown' }) : 'user change');
    await assert.rejects(install('apply', root), /Unknown installed|Source input changed|Package mismatch/);
    assert.deepEqual(await readFile(resolve(root, directory, 'src/index.ts')), await readFile(resolve(outputRoot, 'before', directory, 'src/index.ts')));
    assert.match(await readFile(path, 'utf8'), /user change|unknown/);
  }
});

test('第二次写入失败还原第一次写入，原始字节全部保留', async () => {
  const root = await fixture(); let writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++writes === 2) throw Error('injected write failure');
    await replaceFile(path, bytes);
  }), /injected write failure/);
  assert.equal(writes, 3); await matches(root, 'before');
  assert.equal((await install('plan', root)).patched, 0);
});

test('回滚遇到外部修改时保留外部内容并明确失败', async () => {
  const root = await fixture(); let first, writes = 0;
  await assert.rejects(install('apply', root, async (path, bytes) => {
    if (++writes === 1) { first = path; await replaceFile(path, bytes); }
    else { await writeFile(first, 'concurrent edit'); throw Error('injected failure'); }
  }), /Rollback needs attention/);
  assert.equal(await readFile(first, 'utf8'), 'concurrent edit');
});

test('经目录链接写到其他位置被拒绝', async () => {
  const root = await fixture(), target = resolve(root, directory, 'lib');
  const outside = await mkdtemp(resolve(testsRoot, 'outside-'));
  // 使用另一个全新安装根中的链接，不移动或删除已有目录。
  const linked = await mkdtemp(resolve(testsRoot, 'linked-'));
  await mkdir(resolve(linked, directory), { recursive: true });
  await cp(resolve(root, directory, 'package.json'), resolve(linked, directory, 'package.json'));
  await cp(resolve(root, directory, 'src'), resolve(linked, directory, 'src'), { recursive: true });
  await cp(target, outside, { recursive: true });
  const link = resolve(linked, directory, 'lib');
  await symlink(outside, link, 'junction');
  try { await assert.rejects(install('apply', linked), /Linked target|Linked or non-file/); }
  finally { await unlink(link); }
});

test('相同基线重新严格编译后生成相同安装包', async () => {
  const root = await fixture();
  // 与本机安装构建一致，只复制编译所需的已安装声明，不复制配置或凭据。
  await cp('F:/Program Files/deepseek-harness/packages/host/webserver/lib/types', resolve(root, 'packages/host/webserver/lib/types'), { recursive: true });
  assert.equal((await preparePackage(root)).files, 7);
});
