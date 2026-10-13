// 核对已归档并由原管理器安装的候选确实包含当前全部插件源码；不替代运行验收。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, lstat, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve } from 'node:path';

assert.ok(process.argv.length === 3 || process.argv.length === 4 && process.argv[3] === '--recheck');
const recheck = process.argv[3] === '--recheck';
const folder = process.argv[2]; assert.match(folder, /^candidate-package-check-[A-Za-z0-9]+$/);
const root = resolve(import.meta.dirname, '..'), runtime = resolve(root, 'artifacts/latest-runtime-check');
const output = resolve(runtime, folder); assert.equal(await realpath(output), output);
const target = resolve(output, recheck ? 'source-integrity-recheck.json' : 'source-integrity-report.json');
await assert.rejects(access(target), { code: 'ENOENT' });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { at: new Date().toISOString(), passed: false, fullAcceptancePassed: false };
async function tree(directory) {
  assert.equal((await lstat(directory)).isSymbolicLink(), false);
  const entries = [];
  for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    assert.equal(item.isSymbolicLink(), false);
    const path = resolve(directory, item.name);
    if (item.isDirectory()) entries.push(...(await tree(path)).map(row => ({ ...row, path: item.name + '/' + row.path })));
    else { assert.equal(item.isFile(), true); entries.push({ path: item.name, sha256: digest(await readFile(path)) }); }
  }
  return entries;
}
try {
  if (recheck) {
    const failed = JSON.parse(await readFile(resolve(output, 'source-integrity-report.json'), 'utf8'));
    assert.equal(failed.passed, false); assert.equal(failed.failure.name, 'AssertionError');
    assert.equal(failed.failure.message, 'Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- true\n');
    report.originalFailedReadRetained = true;
  }
  const pack = JSON.parse(await readFile(resolve(output, 'report.json'), 'utf8'));
  const install = JSON.parse(await readFile(resolve(output, 'install-report.json'), 'utf8'));
  const host = JSON.parse(await readFile(resolve(output, 'installed-host-report.json'), 'utf8'));
  assert.equal(pack.passed, true); assert.equal(install.passed, true); assert.equal(host.passed, true);
  assert.equal(pack.output, output); assert.equal(pack.targetVersion, '0.2.1-alpha.1');
  assert.equal(pack.installedPackage.payloadBytesIdentical, true); assert.equal(pack.installedPackage.hostAndClientTypes, true);
  const snapshot = await realpath(pack.sourceSnapshot), local = relative(runtime, snapshot);
  assert.ok(local && !local.startsWith('..') && !isAbsolute(local));
  assert.equal(snapshot, resolve(runtime, basename(snapshot))); assert.match(basename(snapshot), /^candidate-build-[A-Za-z0-9]+$/);
  const sources = await tree(resolve(root, 'src'));
  assert.deepEqual(await tree(resolve(snapshot, 'src')), sources, 'candidate_source_snapshot_not_current');
  const tarball = resolve(output, 'dsh-mobile-plugin-0.1.76-latest.0.tgz');
  assert.equal(pack.package.path, tarball); assert.equal(digest(await readFile(tarball)), pack.package.sha256);
  const home = resolve(output, 'installed-home'); assert.equal(install.home, home); assert.equal(host.home, home);
  assert.equal(typeof host.stopped.code, 'number'); assert.equal(host.stopped.signal, null);
  assert.throws(() => process.kill(host.launcherPid, 0), error => error.code === 'ESRCH');
  const consumed = await tree(resolve(output, 'consumer/node_modules/@dsh-mobile/plugin'));
  // 安装入口可能是 pnpm 链接；先确认实际目标在已安装 profile 内，再检查全部载荷。
  const installed = await realpath(resolve(home, 'profiles/web/node_modules/@dsh-mobile/plugin'));
  const insideHome = relative(await realpath(home), installed);
  assert.ok(insideHome && !insideHome.startsWith('..') && !isAbsolute(insideHome));
  assert.deepEqual(await tree(installed), consumed,
    'installed_archive_payload_changed');
  report.sourceFiles = sources; report.sourceFileCount = sources.length;
  report.package = pack.package; report.installedProfile = home;
  report.currentSourcesIdentical = true; report.installedArchiveIdentical = true; report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally { await writeFile(target, JSON.stringify(report, null, 2), { flag: 'wx' }); }
console.log(JSON.stringify({ output, passed: report.passed, sourceFileCount: report.sourceFileCount,
  fullAcceptancePassed: false, failure: report.failure }));
