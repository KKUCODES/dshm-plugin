import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import test from 'node:test';
import { aclRepairSourceHash, prepareLatestAclRepair } from '../compatibility/latest-upstream/acl-repair.mjs';

const root = resolve(import.meta.dirname, '..');
const artifacts = resolve(root, 'artifacts');
const sourcePackage = resolve(artifacts, 'latest-source-check/packages/sandbox/sandbox-windows-acl');
const publishedPackage = resolve(artifacts, 'latest-runtime-check/node_modules/@deepseek-ai/dsh-sandbox-windows-acl');
const asset = 'assets/diagnose-windows-sandbox-acl/scripts/diagnose-windows-sandbox-acl.ps1';
const outputName = 'diagnose-windows-sandbox-acl.ps1';
const candidateHash = 'e6389ffbdcbc6e3a50206c198ab8a348c9957681de231d1fb920aa50d6239ce0';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const parent = resolve(artifacts, 'latest-runtime-check/acl-preparation-tests');
  await mkdir(parent, { recursive: true });
  const home = await mkdtemp(resolve(parent, 'case-'));
  const links = [];
  t.after(async () => {
    for (const link of links) await unlink(link);
    const actual = await realpath(home);
    const local = relative(await realpath(parent), actual);
    assert.ok(local && !local.startsWith('..') && !isAbsolute(local));
    assert.equal((await lstat(home)).isSymbolicLink(), false);
    await rm(actual, { recursive: true });
  });
  const packageRoot = resolve(home, 'package');
  await mkdir(dirname(resolve(packageRoot, asset)), { recursive: true });
  await cp(resolve(sourcePackage, 'package.json'), resolve(packageRoot, 'package.json'));
  await cp(resolve(sourcePackage, asset), resolve(packageRoot, asset));
  return { home, packageRoot, links, outputDirectory: resolve(home, 'output') };
}

test('实际固定源码和 npm 包经正式 CLI 生成同一已验收脚本，原资产字节保持', async () => {
  const before = await Promise.all([sourcePackage, publishedPackage].map(pkg => readFile(resolve(pkg, asset))));
  for (const [index, pkg] of [sourcePackage, publishedPackage].entries()) {
    assert.equal(digest(before[index]), aclRepairSourceHash);
    const result = spawnSync(process.execPath, [resolve(root, 'scripts/prepare-latest-acl-repair.mjs'), pkg],
      { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.permissionsChanged, false);
    assert.equal(report.manualExecutionRequired, true);
    assert.equal(report.version, '0.2.1-alpha.1');
    assert.equal(report.candidateHash, candidateHash);
    assert.equal(digest(await readFile(report.path)), candidateHash);
    assert.deepEqual(await readFile(resolve(pkg, asset)), before[index]);
  }
  assert.equal((await prepareLatestAclRepair()).candidateHash, candidateHash);
});

test('新克隆布局无 artifacts 时从实际 npm 包生成，不依赖隔离源码产物', async t => {
  const f = await fixture(t);
  const clone = resolve(f.home, 'clone');
  await mkdir(resolve(clone, 'scripts'), { recursive: true });
  await cp(resolve(root, 'compatibility'), resolve(clone, 'compatibility'), { recursive: true });
  await cp(resolve(root, 'scripts/prepare-latest-acl-repair.mjs'), resolve(clone, 'scripts/prepare-latest-acl-repair.mjs'));
  await assert.rejects(lstat(resolve(clone, 'artifacts')), { code: 'ENOENT' });
  const before = await readFile(resolve(publishedPackage, asset));
  const result = spawnSync(process.execPath, [resolve(clone, 'scripts/prepare-latest-acl-repair.mjs'), publishedPackage],
    { cwd: clone, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.path, resolve(clone, 'artifacts/latest-runtime-check/acl-repair-candidate', outputName));
  assert.equal(digest(await readFile(report.path)), candidateHash);
  assert.deepEqual(await readFile(resolve(publishedPackage, asset)), before);
});

test('未知包名、版本和原资产均在创建输出前拒绝', async t => {
  for (const scenario of ['name', 'version', 'asset']) await t.test(scenario, async t => {
    const f = await fixture(t);
    if (scenario === 'asset') await writeFile(resolve(f.packageRoot, asset), 'unknown script');
    else {
      const path = resolve(f.packageRoot, 'package.json');
      const metadata = JSON.parse(await readFile(path, 'utf8'));
      metadata[scenario] = 'unknown';
      await writeFile(path, JSON.stringify(metadata));
    }
    await assert.rejects(prepareLatestAclRepair(f), /latest_acl_repair_unknown_/);
    await assert.rejects(lstat(f.outputDirectory), { code: 'ENOENT' });
  });
});

test('输出复用必须字节一致，不覆盖冲突文件、目录或越界路径', async t => {
  const f = await fixture(t);
  const first = await prepareLatestAclRepair(f);
  assert.deepEqual(await prepareLatestAclRepair(f), first);
  await writeFile(first.path, 'keep this existing file');
  await assert.rejects(prepareLatestAclRepair(f), /latest_acl_repair_candidate_changed/);
  assert.equal(await readFile(first.path, 'utf8'), 'keep this existing file');
  const directoryOutput = resolve(f.home, 'directory-output');
  await mkdir(resolve(directoryOutput, outputName), { recursive: true });
  await assert.rejects(prepareLatestAclRepair({ ...f, outputDirectory: directoryOutput }), /latest_acl_repair_linked_script/);
  await assert.rejects(prepareLatestAclRepair({ ...f, outputDirectory: root }), /latest_acl_repair_output_outside_artifacts/);
});

test('输出不能回写实际输入包或隔离参考源码', async t => {
  const f = await fixture(t);
  await assert.rejects(prepareLatestAclRepair({ ...f, outputDirectory: f.packageRoot }), /latest_acl_repair_output_in_source/);
  await assert.rejects(lstat(resolve(f.packageRoot, outputName)), { code: 'ENOENT' });
  await assert.rejects(prepareLatestAclRepair({ packageRoot: publishedPackage, outputDirectory: sourcePackage }), /latest_acl_repair_output_in_source/);
  assert.equal(digest(await readFile(resolve(sourcePackage, asset))), aclRepairSourceHash);
});

test('实际 Windows junction 输出目录不被写入', async t => {
  const f = await fixture(t);
  const destination = resolve(f.home, 'destination');
  await mkdir(destination);
  const link = resolve(f.home, 'output-link');
  await symlink(destination, link, 'junction'); f.links.push(link);
  await assert.rejects(prepareLatestAclRepair({ ...f, outputDirectory: resolve(link, 'child') }), /latest_acl_repair_linked_output/);
  await assert.rejects(lstat(resolve(destination, 'child')), { code: 'ENOENT' });
});

test('文件符号链接不被复用', async t => {
  const f = await fixture(t);
  const destination = resolve(f.home, 'destination');
  await mkdir(destination);
  const normal = await prepareLatestAclRepair(f);
  const knownTarget = resolve(destination, outputName);
  await writeFile(knownTarget, await readFile(normal.path));
  const scriptOutput = resolve(f.home, 'file-link-output');
  await mkdir(scriptOutput);
  const scriptLink = resolve(scriptOutput, outputName);
  try { await symlink(knownTarget, scriptLink, 'file'); }
  catch (error) {
    if (process.platform !== 'win32' || error.code !== 'EPERM') throw error;
    t.skip('当前 Windows 令牌不能创建文件符号链接；实际文件符号链接分支尚未验证。');
    return;
  }
  f.links.push(scriptLink);
  await assert.rejects(prepareLatestAclRepair({ ...f, outputDirectory: scriptOutput }), /latest_acl_repair_linked_script/);
  assert.equal(digest(await readFile(knownTarget)), candidateHash);
});

test('原资产目录链接越出实际包边界时拒绝，输出尚未创建', async t => {
  const f = await fixture(t);
  const emptyPackage = resolve(f.home, 'linked-package');
  await mkdir(emptyPackage);
  await cp(resolve(sourcePackage, 'package.json'), resolve(emptyPackage, 'package.json'));
  const link = resolve(emptyPackage, 'assets');
  await symlink(resolve(f.packageRoot, 'assets'), link, 'junction'); f.links.push(link);
  await assert.rejects(prepareLatestAclRepair({ ...f, packageRoot: emptyPackage }), /Linked target is not supported/);
  await assert.rejects(lstat(f.outputDirectory), { code: 'ENOENT' });
});
