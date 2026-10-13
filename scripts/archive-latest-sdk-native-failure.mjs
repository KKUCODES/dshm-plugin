// 完整打包但实际运行未通过的载体需要独立保存，不能当作打包失败产物清理。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { readLatestSdkCarrier } from '../../backend/scripts/latest-sdk-carrier.mjs';
import { readLatestLiveState } from '../../backend/scripts/latest-live-resume.mjs';

assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--attempt-8');
const eighth = process.argv[2] === '--attempt-8', attemptNumber = eighth ? 8 : 7;
const runtime = await realpath(resolve(import.meta.dirname, '../artifacts/latest-runtime-check'));
const archive = resolve(runtime, `sdk-sea-attempt-${attemptNumber}-${eighth ? 'runner' : 'native'}-failed-products`);
const reportPath = resolve(runtime, `latest-sdk-sea-attempt-${attemptNumber}-${eighth ? 'runner' : 'native'}-products-archive.json`);
for (const path of [archive, reportPath, resolve(runtime, 'latest-live-source-lease.json')])
  await assert.rejects(access(path), { code: 'ENOENT' });
const read = async name => JSON.parse(await readFile(resolve(runtime, name), 'utf8'));
const build = await read(`latest-sdk-sea-build-attempt-${attemptNumber}.json`);
assert.equal(build.passed, true); assert.equal(build.exitCode, 0);
assert.equal(build.sourceRoot, sourceRoot); assert.equal(build.sourceCommit, sourceCommit);
const carrier = await readLatestSdkCarrier(runtime);
assert.equal(carrier.buildReport, resolve(runtime, `latest-sdk-sea-build-attempt-${attemptNumber}.json`));
const failure = await read(eighth ? 'latest-sdk-sea-encoding-inspection-attempt-8.json' : 'latest-sdk-sea-native-failure-attempt-7.json');
const attempt = await read(`latest-sdk-sea-message-attempt-${attemptNumber}.json`);
assert.equal(failure.hostPid, attempt.hostPid);
if (eighth) {
  const chat = await read('latest-sdk-sea-android-attempt-8.json');
  assert.equal(chat.passed, true); assert.equal(chat.inferenceVerified, true);
  assert.equal(chat.hostPid, failure.hostPid); assert.equal(chat.productSha256, carrier.productSha256);
  assert.equal(carrier.productSha256, '1ba71341f0ae3c9ceed8c8b9da7c739fd361ec7fcaa8ef3ee31269fab7e6a57c');
  const tool = await read('latest-live-sdk-attempt-8-encoding-android-live-start.json');
  assert.equal(tool.passed, false); assert.equal(tool.hostPid, failure.hostPid);
  assert.equal(failure.calls.length, 1); assert.equal(failure.calls[0].name, 'pwsh');
  const error = JSON.stringify(failure.toolResults);
  assert.ok(error.includes('invalid profile name') && error.includes('dsh-sandbox-windows-acl'));
  const diagnostic = await read('sdk-runner-dispatch-diagnostic-attempt-8/report.json');
  assert.equal(diagnostic.passed, true); assert.equal(diagnostic.cases.length, 4);
  assert.equal(diagnostic.productSha256, carrier.productSha256);
} else {
  assert.equal(failure.sdkChatAccepted, false);
  assert.equal(failure.addedEvents, 0); assert.equal(failure.afterSeq, failure.throughSeq);
  assert.ok(failure.originalError.includes('The specified module could not be found')
    && failure.originalError.includes('Q:\\snapshot\\') && failure.originalError.includes('koffi.node'));
}
for (const pid of [failure.hostPid, build.pid])
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
const { state } = await readLatestLiveState(runtime);
assert.equal(state.executionMode, 'release'); assert.equal(state.reviewCandidate, undefined);
assert.equal(state.home, attempt.home); process.kill(state.hostPid, 0);
const restored = await read(`latest-live-source-lease-sdk-attempt-${attemptNumber}-final.json`);
assert.equal(restored.state, 'restored'); assert.equal(restored.restoredOriginalBytes, true);
assert.equal(restored.restoredOriginalClientArtifacts, true);
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim(), '');
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
for (const original of restored.originals)
  assert.equal(await hash(resolve(sourceRoot, original.path)), original.sha256);
assert.equal(await hash(resolve(sourceRoot, 'package.json')), restored.originalPackage);
const moves = [
  { source: resolve(sourceRoot, 'dist-exe'), target: resolve(archive, 'dist-exe'), directory: true },
  // 连同同步EXE和原Python/Office资源保留整个runtime，避免下一轮同步覆盖旧载体。
  { source: carrier.root, target: resolve(archive, 'runtime'), directory: true },
  { source: resolve(runtime, 'latest-sdk-sea-product.json'), target: resolve(archive, 'product.json'), directory: false },
];
for (const move of moves) {
  const owner = move.directory ? await realpath(sourceRoot) : runtime;
  const within = relative(owner, move.source);
  assert.ok(within && !within.startsWith('..') && !isAbsolute(within));
  assert.equal(await realpath(move.source), move.source);
  for (let path = move.source; ; path = dirname(path)) {
    assert.equal((await lstat(path)).isSymbolicLink(), false);
    if (path === owner) break;
    assert.ok(path.length > owner.length);
  }
  const destination = relative(runtime, move.target);
  assert.ok(destination && !destination.startsWith('..') && !isAbsolute(destination));
}
const productBytes = await readFile(moves[2].source);
await mkdir(archive); assert.equal(await realpath(archive), archive);
const report = { at: new Date().toISOString(), archived: false, sourceCommit,
  completeOfficialBuildPassed: true, sdkChatAccepted: eighth, sdkToolExecutionPassed: false, pythonResourceCheckPassed: true,
  originalFailureReportsRetained: true, productSha256: carrier.productSha256, moves: [] };
await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
// 所有绝对源/目标及父目录已核验；同卷改名保持原完整载体，不删旧文件。
for (const move of moves) {
  await rename(move.source, move.target);
  await assert.rejects(access(move.source), { code: 'ENOENT' });
  assert.equal(await realpath(move.target), move.target);
  report.moves.push(move); await writeFile(reportPath, JSON.stringify(report, null, 2));
}
for (const path of [resolve(archive, 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe'),
  resolve(archive, 'runtime/deepseek-harness-sdk-runtime-win-x64.exe')])
  assert.equal(await hash(path), carrier.productSha256);
assert.deepEqual(await readFile(resolve(archive, 'product.json')), productBytes);
report.archived = true; await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ archived: true, completeOfficialBuildPassed: true,
  sdkChatAccepted: eighth, sdkToolExecutionPassed: false, productSha256: carrier.productSha256 }));
