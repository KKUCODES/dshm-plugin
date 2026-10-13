// 第九轮完整载体只归档不删除；新官方打包不得覆盖配置重载故障的原证据。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { readClientBuildRecord } from '../artifacts/latest-source-check/scripts/client-build-environment.ts';
import { readLatestSdkCarrier } from '../../backend/scripts/latest-sdk-carrier.mjs';
import { readLatestLiveState } from '../../backend/scripts/latest-live-resume.mjs';

assert.equal(process.argv.length, 2);
const runtime = await realpath(resolve(import.meta.dirname, '../artifacts/latest-runtime-check'));
const archive = resolve(runtime, 'sdk-sea-attempt-9-profile-failed-products');
const reportPath = resolve(runtime, 'latest-sdk-sea-attempt-9-profile-products-archive.json');
for (const path of [archive, reportPath, resolve(runtime, 'latest-live-source-lease.json')])
  await assert.rejects(access(path), { code: 'ENOENT' });
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const carrier = await readLatestSdkCarrier(runtime);
assert.equal(carrier.buildReport, resolve(runtime, 'latest-sdk-sea-build-attempt-9.json'));
assert.equal(carrier.productSha256, '989222642e2e05a287e15fbe52a232a5b2ae810b2b82785858d88a6c80992803');
const failureName = 'latest-final-sdk-android-56bf6697-b732-4f96-9a64-16c6a1777f44';
const failure = await read(resolve(runtime, failureName + '-test.json'));
const cleanup = await read(resolve(runtime, failureName + '-cleanup.json'));
assert.equal(failure.executionMode, 'sdk-sea'); assert.equal(failure.passed, false);
assert.equal(failure.sdkCarrier.productSha256, carrier.productSha256);
assert.deepEqual(failure.officialModelWriteOutcome, { type: 'error', code: 'remote_settings_write_unconfirmed' });
assert.equal(failure.sdkOfficialModelWriteProbe.applied, false);
assert.ok(failure.sdkOfficialModelWriteProbe.originalServiceWrite.includes('profile reload requires the root Include entry'));
assert.equal(cleanup.cleanupCompleted, true); assert.equal(cleanup.executionMode, 'sdk-sea');
assert.ok(cleanup.ownedHostPids.includes(failure.pid));
const build = await read(carrier.buildReport);
for (const pid of [...cleanup.ownedHostPids, build.pid])
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
const observer = await read(resolve(failure.home, 'sdk-profile-observer.json'));
assert.equal(observer.sameReconciler, false);
assert.ok(observer.firstPath.startsWith('C:\\snapshot\\') && observer.secondPath.startsWith('Q:\\snapshot\\'));
const diagnostic = await read(resolve(runtime, 'sdk-module-identity-diagnostic--attempt-2/report.json'));
assert.equal(diagnostic.passed, true); assert.equal(diagnostic.build.status, 0);
assert.equal(diagnostic.baseline.status, 2); assert.equal(diagnostic.candidate.status, 0);
assert.deepEqual(JSON.parse(diagnostic.baseline.stdout), {
  original: 'file:///C:/snapshot/fixture/registry.mjs', alias: 'file:///Q:/snapshot/fixture/registry.mjs', sameRegistry: false, rootVisible: false,
});
assert.equal(JSON.parse(diagnostic.candidate.stdout).rootVisible, true);
const { state } = await readLatestLiveState(runtime);
assert.equal(state.executionMode, 'release'); assert.equal(state.reviewCandidate, undefined);
process.kill(state.hostPid, 0);
const restored = await read(resolve(runtime, 'latest-live-source-lease-sdk-attempt-9-final.json'));
assert.equal(restored.state, 'restored'); assert.equal(restored.sourceCommit, sourceCommit);
assert.equal(restored.restoredOriginalBytes, true); assert.equal(restored.restoredOriginalClientArtifacts, true);
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' }).trim(), '');
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
for (const file of restored.originals)
  assert.equal(await hash(resolve(sourceRoot, file.path)), file.sha256);
assert.equal(await hash(resolve(sourceRoot, 'package.json')), restored.originalPackage);
assert.deepEqual(readClientBuildRecord(sourceRoot).artifacts, restored.originalClientArtifacts);
const moves = [
  { source: resolve(sourceRoot, 'dist-exe'), target: resolve(archive, 'dist-exe'), owner: sourceRoot },
  { source: carrier.root, target: resolve(archive, 'runtime'), owner: sourceRoot },
  { source: resolve(runtime, 'latest-sdk-sea-product.json'), target: resolve(archive, 'product.json'), owner: runtime },
];
for (const move of moves) {
  const rel = relative(move.owner, move.source), dest = relative(runtime, move.target);
  assert.ok(rel && !rel.startsWith('..') && !isAbsolute(rel));
  assert.ok(dest && !dest.startsWith('..') && !isAbsolute(dest));
  assert.equal(await realpath(move.source), move.source);
  for (let path = move.source; ; path = dirname(path)) {
    assert.equal((await lstat(path)).isSymbolicLink(), false);
    if (path === move.owner) break;
    assert.ok(path.length > move.owner.length);
  }
}
const productBytes = await readFile(moves[2].source);
await mkdir(archive); assert.equal(await realpath(archive), archive);
// 封存原校验模块和元数据，让归档后仍按原实现定位 runtime/，无需替换校验函数。
const packageFiles = ['__init__.py', '_resources.py', 'deepseek-harness-runtime.json'];
for (const name of packageFiles)
  await writeFile(resolve(archive, name), await readFile(resolve(dirname(carrier.root), name)), { flag: 'wx' });
const report = { at: new Date().toISOString(), archived: false, sourceCommit, productSha256: carrier.productSha256,
  completeOfficialBuildPassed: true, pythonResourceCheckPassed: true, modelWritePassed: false,
  oldReportsRetained: true, moves: [] };
await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
// 绝对路径、原归属、实际进程退出及整个父目录均已核验，同卷改名不复制或删除。
for (const move of moves) {
  await rename(move.source, move.target);
  assert.equal(await realpath(move.target), move.target);
  await assert.rejects(access(move.source), { code: 'ENOENT' });
  report.moves.push(move); await writeFile(reportPath, JSON.stringify(report, null, 2));
}
for (const path of [resolve(archive, 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe'),
  resolve(archive, 'runtime/deepseek-harness-sdk-runtime-win-x64.exe')])
  assert.equal(await hash(path), carrier.productSha256);
assert.deepEqual(await readFile(resolve(archive, 'product.json')), productBytes);
// 在新位置再次使用原 Python 校验全部资源，不把 EXE 哈希当作整个载体证明。
const pythonRoot = resolve(archive, 'runtime');
const checked = execFileSync(resolve(pythonRoot, 'win-x64/primary-runtime/dependencies/python/python.exe'), ['-I', '-B', '-c',
  'import sys, importlib.util; from pathlib import Path; root=Path(sys.argv[1]); spec=importlib.util.spec_from_file_location("deepseek_harness_runtime", root / "__init__.py", submodule_search_locations=[str(root)]); module=importlib.util.module_from_spec(spec); sys.modules[spec.name]=module; spec.loader.exec_module(module); print(module.bundled_runtime_path())',
  archive], { cwd: pythonRoot, windowsHide: true, encoding: 'utf8' }).trim();
assert.equal(checked, resolve(pythonRoot, 'deepseek-harness-sdk-runtime-win-x64.exe'));
report.archived = true; await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ archived: true, modelWritePassed: false, productSha256: carrier.productSha256 }));
process.exit(0);
