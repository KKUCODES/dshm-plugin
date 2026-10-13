// 本轮真实 PTC 完成后撤销该隔离工作区的原沙箱能力；不处理任意用户目录。
import assert from 'node:assert/strict';
import { access, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const sourceMode = process.argv[2] === 'source';
assert.ok(process.argv[2] === undefined || sourceMode); assert.ok(process.argv.length <= 3);
const prefix = sourceMode ? 'latest-live-source' : 'latest-live';
const state = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json'), 'utf8'));
if (sourceMode) {
  assert.equal(state.executionMode, 'source'); assert.equal(state.command, 'pnpm dsh web');
  const { verifyInstalledSource } = await import('../compatibility/latest-upstream/source-host.mjs');
  const installed = await verifyInstalledSource(); assert.equal(installed.sourceCommit, state.sourceCommit);
}
const home = relative(resolve(runtime, 'live-homes'), state.home);
assert.match(home, /^[0-9a-f-]{36}$/);
assert.equal(await realpath(state.home), resolve(await realpath(resolve(runtime, 'live-homes')), home));
assert.equal(await realpath(state.workspacePath), resolve(await realpath(state.home), 'test-project'));
await assert.rejects(access(resolve(runtime, prefix + '-workspace-grant-cleanup.json')), { code: 'ENOENT' });
for (const phase of ['observe', 'replay', 'resume-observe', 'return']) {
  const report = JSON.parse(await readFile(resolve(runtime, prefix + '-ptc-writable-android-' + phase + '.json'), 'utf8'));
  assert.equal(report.scenario, 'workspace-write');
  if (phase === 'return') { assert.equal(report.permissionRestored, true); assert.equal(report.returnedToPrimary, true); }
  else assert.equal(report.passed, true);
}
const require = createRequire(resolve(runtime, 'package.json'));
const entry = sourceMode ? resolve(state.sourceRoot, 'packages/sandbox/sandbox-windows-acl/lib/index.js')
  : require.resolve('@deepseek-ai/dsh-sandbox-windows-acl');
const { AclWriteGrant, workspaceWriteSid } = await import(pathToFileURL(entry).href);
// 原非 standing 句柄接管同一能力，dispose 撤销能力并清除 Low 标签；deny 随官方 DACL 恢复。
const grant = AclWriteGrant.create(workspaceWriteSid(await realpath(state.workspacePath)));
try { grant.add(state.workspacePath, false); }
finally { grant.dispose(); }
const report = { at: new Date().toISOString(), workspace: state.workspacePath, executionMode: state.executionMode ?? 'release', originalWorkspaceGrantRevoked: true,
  runtimeWorkspaceGrantCacheNeedsRestart: true, repairDaclStillNeedsOfficialRestore: true };
await writeFile(resolve(runtime, prefix + '-workspace-grant-cleanup.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
setTimeout(() => process.exit(0), 200);
