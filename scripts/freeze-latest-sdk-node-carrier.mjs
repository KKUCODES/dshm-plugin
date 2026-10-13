// pnpm deploy 使用硬链接；封存载体必须脱离源码构建的可写 inode。
import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { copyFile, lstat, readFile, readdir, realpath, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';

const [flag, ...extra] = process.argv.slice(2);
assert.ok(['--archive-10', '--attempt-11'].includes(flag) && !extra.length);
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const lease = JSON.parse(await readFile(resolve(runtime, 'latest-live-source-lease.json'), 'utf8'));
assert.equal(lease.scope, 'sdk-attempt-11'); assert.equal(lease.state, 'ready');
assert.equal(lease.sourceRoot, sourceRoot); assert.equal(lease.sourceCommit, sourceCommit);
assert.equal(lease.files, 38); assert.ok(lease.stages.every(stage => stage.code === 0));
let carrier;
if (flag === '--archive-10') {
  const archived = JSON.parse(await readFile(resolve(runtime, 'latest-sdk-sea-attempt-10-completed-products-archive.json'), 'utf8'));
  assert.equal(archived.archived, true); assert.equal(archived.sourceCommit, sourceCommit);
  carrier = resolve(runtime, 'sdk-sea-attempt-10-completed-products/runtime');
} else {
  const build = JSON.parse(await readFile(resolve(runtime, 'latest-sdk-sea-build-attempt-11.json'), 'utf8'));
  assert.equal(build.passed, true); assert.equal(build.exitCode, 0); assert.equal(build.files, 38);
  assert.throws(() => process.kill(build.pid, 0), { code: 'ESRCH' });
  carrier = resolve(sourceRoot, 'python/sdk-runtime/src/deepseek_harness_runtime/runtime');
}
const root = resolve(carrier, 'node');
assert.equal(await realpath(root), root);
const rel = relative(resolve(import.meta.dirname, '..'), root);
assert.ok(rel && !rel.startsWith('..') && !isAbsolute(rel));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportPath = resolve(runtime, `latest-sdk-node-freeze-${flag.slice(2)}.json`);
const report = { at: new Date().toISOString(), passed: false, root, sourceCommit, files: [], detached: 0 };
await writeFile(reportPath, JSON.stringify(report), { flag: 'wx' });
const walk = async directory => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name), info = await lstat(path);
    assert.equal(info.isSymbolicLink(), false, 'No linked path may enter the frozen carrier');
    if (info.isDirectory()) { await walk(path); continue; }
    assert.equal(info.isFile(), true);
    const before = await readFile(path), sha256 = hash(before);
    if (info.nlink > 1) {
      const temporary = path + '.dshm-freeze-' + randomUUID();
      await copyFile(path, temporary, constants.COPYFILE_EXCL);
      assert.equal(hash(await readFile(temporary)), sha256);
      // 变动时拒绝；不以较新的源码字节悄悄覆盖已记录的载体。
      assert.equal(hash(await readFile(path)), sha256);
      await rename(temporary, path); report.detached++;
    }
    assert.equal((await lstat(path)).nlink, 1);
    assert.equal(hash(await readFile(path)), sha256);
    report.files.push({ path: relative(root, path), bytes: before.length, sha256 });
  }
};
try {
  await walk(root);
  // 整轮结束后再次核对所有文件，不把单次复制成功当作稳定封存。
  for (const file of report.files) {
    const path = resolve(root, file.path);
    assert.equal((await lstat(path)).nlink, 1);
    assert.equal(hash(await readFile(path)), file.sha256);
  }
  report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; throw error; }
finally { await writeFile(reportPath, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify({ passed: true, files: report.files.length, detached: report.detached }));
