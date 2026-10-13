// 独立文件写入探针结束后撤销原工作区沙箱能力；保留失败记录，不改任意用户目录。
import assert from 'node:assert/strict';
import { access, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import { relative, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.equal(process.argv.length, 2);
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const reportPath = resolve(runtime, 'latest-live-source-ptc-file-grant-cleanup.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const state = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json'), 'utf8'));
assert.equal(state.executionMode, 'source'); assert.equal(state.command, 'pnpm dsh web');
const { verifyInstalledSource } = await import('../compatibility/latest-upstream/source-host.mjs');
const installed = await verifyInstalledSource(); assert.equal(installed.sourceCommit, state.sourceCommit);
const home = relative(resolve(runtime, 'live-homes'), state.home); assert.match(home, /^[0-9a-f-]{36}$/);
assert.equal(await realpath(state.home), resolve(await realpath(resolve(runtime, 'live-homes')), home));
assert.equal(await realpath(state.workspacePath), resolve(await realpath(state.home), 'test-project'));
for (const scenario of ['read-only', 'workspace-write']) {
  const prefix = 'latest-live-source-ptc-file-' + scenario;
  const seed = JSON.parse(await readFile(resolve(runtime, prefix + '-seed.json'), 'utf8'));
  assert.equal(seed.home, state.home); assert.equal(dirname(seed.file), resolve(state.workspacePath));
  assert.equal(await readFile(seed.file, 'utf8'), seed.before);
  const phase = scenario === 'read-only' ? 'return' : 'return-failed';
  const restored = JSON.parse(await readFile(resolve(runtime, prefix + '-android-' + phase + '.json'), 'utf8'));
  assert.equal(restored.fileRestored, true); assert.equal(restored.permissionRestored, true); assert.equal(restored.returnedToPrimary, true);
  if (scenario === 'read-only') assert.equal(restored.passed, true);
  else assert.equal(restored.failedScenarioCleaned, true);
}
const probe = JSON.parse(await readFile(resolve(runtime, 'latest-live-source-ptc-file-native-probe-valid.json'), 'utf8'));
assert.equal(probe.workspace, state.workspacePath); assert.equal(probe.hostPid, state.hostPid);
assert.equal(dirname(probe.freshFile), resolve(state.workspacePath));
assert.match(relative(state.workspacePath, probe.freshFile), /^dshm-ptc-file-native-fresh-DSHM_PTC_FILE_[a-f0-9]{12}\.txt$/);
assert.equal(probe.results.length, 2); assert.equal(probe.results[0].exitCode, 1); assert.equal(probe.results[0].stderr, 'EPERM\n');
assert.equal(probe.results[1].exitCode, 0); assert.equal(probe.results[1].file, probe.freshFile);
assert.equal(await readFile(probe.freshFile, 'utf8'), 'NATIVE_WRITE\n');
// 仅删除本探针排他创建的副本，内容和原调用报告已经持久保存。
await unlink(probe.freshFile);
const entry = resolve(state.sourceRoot, 'packages/sandbox/sandbox-windows-acl/lib/index.js');
const { AclWriteGrant, workspaceWriteSid } = await import(pathToFileURL(entry).href);
const grant = AclWriteGrant.create(workspaceWriteSid(await realpath(state.workspacePath)));
try { grant.add(state.workspacePath, false); }
finally { grant.dispose(); }
const report = { at: new Date().toISOString(), workspace: state.workspacePath, hostPid: state.hostPid,
  originalWorkspaceGrantRevoked: true, nativeFreshFixtureRemoved: true,
  runtimeWorkspaceGrantCacheNeedsRestart: true, repairDaclStillNeedsOfficialRestore: true };
await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify(report));
setTimeout(() => process.exit(0), 200);
