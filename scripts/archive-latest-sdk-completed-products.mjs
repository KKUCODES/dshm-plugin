// 保留第十轮完整SDK及成功证据，为含新文件监听修正的第十一轮腾出生成路径。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, lstat, mkdir, readFile, readdir, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { readClientBuildRecord } from '../artifacts/latest-source-check/scripts/client-build-environment.ts';
import { readLatestLiveState } from '../../backend/scripts/latest-live-resume.mjs';

assert.equal(process.argv.length, 2);
const runtime = await realpath(resolve(import.meta.dirname, '../artifacts/latest-runtime-check'));
const archive = resolve(runtime, 'sdk-sea-attempt-10-completed-products');
const reportPath = resolve(runtime, 'latest-sdk-sea-attempt-10-completed-products-archive.json');
for (const path of [archive, reportPath, resolve(runtime, 'latest-live-source-lease.json')])
  await assert.rejects(access(path), { code: 'ENOENT' });
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const buildPath = resolve(runtime, 'latest-sdk-sea-build-attempt-10.json');
const build = await read(buildPath), entry = await read(resolve(runtime, 'latest-sdk-sea-product.json'));
assert.equal(entry.buildReport, buildPath); assert.equal(entry.sourceCommit, sourceCommit);
assert.equal(build.passed, true); assert.equal(build.exitCode, 0); assert.equal(build.files, 37);
assert.equal(build.sourceRoot, sourceRoot); assert.equal(build.sourceCommit, sourceCommit);
const productHash = '287ffb6eff947ebaf44add0076355ae5c4bec1b504c66dd3986e11b2a7d84ff8';
assert.equal(entry.productSha256, productHash); assert.equal(build.product.sha256, productHash);
assert.equal(build.product.bytes, 327077376);
assert.throws(() => process.kill(build.pid, 0), { code: 'ESRCH' });
const frozenManifest = resolve(runtime, 'latest-source-manifest-sdk-attempt-10.json');
assert.equal(await hash(frozenManifest), build.sourceManifestSha256);
assert.equal((await read(frozenManifest)).files.length, 37);
const successfulRuns = [];
for (const name of (await readdir(runtime)).filter(name => /^latest-final-sdk-android-[0-9a-f-]+-test\.json$/.test(name))) {
  const result = await read(resolve(runtime, name));
  if (!result.passed || result.sdkCarrier?.productSha256 !== productHash) continue;
  assert.equal(result.executionMode, 'sdk-sea');
  const cleanup = await read(resolve(runtime, name.replace('-test.json', '-cleanup.json')));
  assert.equal(cleanup.cleanupCompleted, true);
  for (const pid of cleanup.ownedHostPids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  successfulRuns.push(name);
}
assert.ok(successfulRuns.length > 0, '完整SDK真实Android组合成功并清理后才能封存');
// 只接受本轮新源码交付的完整恢复；旧37文件恢复记录不证明当前38文件原状态。
const restored = await read(resolve(runtime, 'latest-source-delivery-run-5dec3071-b95e-49cf-b089-dd9557876880.json'));
assert.equal(restored.passed, true); assert.equal(restored.files, 38); assert.equal(restored.restoredOriginalBytes, true);
assert.equal(restored.restoredOriginalClientArtifacts.fileCount, 355);
assert.deepEqual(readClientBuildRecord(sourceRoot).artifacts, restored.restoredOriginalClientArtifacts);
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' }).trim(), '');
for (const file of (await read(resolve(outputRoot, 'manifest.json'))).files)
  assert.equal(await hash(resolve(sourceRoot, file.path)), file.before);
const { state } = await readLatestLiveState(runtime);
assert.equal(state.executionMode, 'release'); assert.equal(state.reviewCandidate, undefined);
process.kill(state.hostPid, 0);
const carrierRoot = resolve(sourceRoot, 'python/sdk-runtime/src/deepseek_harness_runtime/runtime');
const product = resolve(sourceRoot, 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe');
assert.equal(build.product.path, product);
for (const path of [product, resolve(carrierRoot, 'deepseek-harness-sdk-runtime-win-x64.exe')])
  assert.equal(await hash(path), productHash);
const moves = [
  { source: dirname(product), target: resolve(archive, 'dist-exe'), owner: sourceRoot },
  { source: carrierRoot, target: resolve(archive, 'runtime'), owner: sourceRoot },
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
for (const name of ['__init__.py', '_resources.py', 'deepseek-harness-runtime.json'])
  await writeFile(resolve(archive, name), await readFile(resolve(dirname(carrierRoot), name)), { flag: 'wx' });
const report = { at: new Date().toISOString(), archived: false, sourceCommit, productSha256: productHash,
  completeOfficialBuildPassed: true, successfulRuns, oldReportsRetained: true, moves: [] };
await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
// 核对全部绝对路径与原进程退出后，同卷改名保留目录内容，不复制或删除旧载体。
for (const move of moves) {
  await rename(move.source, move.target);
  assert.equal(await realpath(move.target), move.target);
  await assert.rejects(access(move.source), { code: 'ENOENT' });
  report.moves.push(move); await writeFile(reportPath, JSON.stringify(report, null, 2));
}
for (const path of [resolve(archive, 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe'),
  resolve(archive, 'runtime/deepseek-harness-sdk-runtime-win-x64.exe')]) assert.equal(await hash(path), productHash);
assert.deepEqual(await readFile(resolve(archive, 'product.json')), productBytes);
const pythonRoot = resolve(archive, 'runtime');
const checked = execFileSync(resolve(pythonRoot, 'win-x64/primary-runtime/dependencies/python/python.exe'), ['-I', '-B', '-c',
  'import sys, importlib.util; from pathlib import Path; root=Path(sys.argv[1]); spec=importlib.util.spec_from_file_location("deepseek_harness_runtime", root / "__init__.py", submodule_search_locations=[str(root)]); module=importlib.util.module_from_spec(spec); sys.modules[spec.name]=module; spec.loader.exec_module(module); print(module.bundled_runtime_path())',
  archive], { cwd: pythonRoot, windowsHide: true, encoding: 'utf8' }).trim();
assert.equal(checked, resolve(pythonRoot, 'deepseek-harness-sdk-runtime-win-x64.exe'));
report.archived = true; report.pythonResourceCheckPassed = true;
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ archived: true, productSha256: productHash, oldReportsRetained: true }));
process.exit(0);
