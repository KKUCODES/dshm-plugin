// 仅修复原失败验收文件；先停拥有的 Host、保存完整工作区快照，再沿官方备份恢复。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, lstat, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareLatestAclRepair } from '../compatibility/latest-upstream/acl-repair.mjs';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

const phase = process.argv[2];
assert.ok(['prepare', 'repair', 'restore', 'audit'].includes(phase));
const auditAttempt = process.argv[3];
if (auditAttempt !== undefined) {
  assert.equal(phase, 'audit');
  assert.equal(process.argv.length, 4);
  assert.match(auditAttempt, /^[a-z0-9-]{1,64}$/);
} else assert.equal(process.argv.length, 3);
assert.equal(process.platform, 'win32');
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const state = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json'), 'utf8'));
assert.equal(state.target, '0.2.1-alpha.1');
const homeName = relative(resolve(runtime, 'live-homes'), state.home);
assert.match(homeName, /^[0-9a-f-]{36}$/);
assert.equal(await realpath(state.home), resolve(await realpath(resolve(runtime, 'live-homes')), homeName));
assert.equal(await realpath(state.workspacePath), resolve(await realpath(state.home), 'test-project'));
const { verifyInstalledSource } = await import('../compatibility/latest-upstream/source-host.mjs');
const installed = await verifyInstalledSource();
assert.equal(installed.sourceCommit, '5badb15009ae1756c3afe0ae0cef1faafc290ccc');
const paths = [state.workspacePath];
for (const entry of await readdir(state.workspacePath, { withFileTypes: true })) {
  // 当前原测试工作区只有七个文件；结构变化需要重新核对，不能自动扩大修复范围。
  assert.equal(entry.isFile(), true); assert.equal(entry.isSymbolicLink(), false);
  assert.match(entry.name, /^(README\.md|dshm-(latest-write|ptc-file)-[0-9a-f-]{36}\.txt)$/);
  paths.push(resolve(state.workspacePath, entry.name));
}
assert.equal(paths.length, 8); paths.sort();
const seeds = await Promise.all(['read-only', 'workspace-write'].map(async scenario => {
  const seed = JSON.parse(await readFile(resolve(runtime, 'latest-live-source-ptc-file-' + scenario + '-seed.json'), 'utf8'));
  assert.equal(seed.home, state.home); assert.equal(seed.sessionId, 'session-bb112eb2-a766-4da5-95ec-0749b173863d');
  assert.equal(dirname(seed.file), resolve(state.workspacePath)); assert.ok(paths.includes(seed.file));
  assert.equal(await readFile(seed.file, 'utf8'), seed.before);
  return seed;
}));
const failed = JSON.parse(await readFile(resolve(runtime, 'latest-live-source-ptc-file-workspace-write-android-observe.json'), 'utf8'));
assert.equal(failed.passed, false); assert.equal(failed.originalResult.error.code, 'CODE_RUN_FAILED');
assert.ok(failed.originalResult.message.content.some(part => part.text?.includes('EPERM')));
const libraryRoot = resolve(sourceRoot, 'packages/sandbox/sandbox-windows-acl');
const ffi = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/ffi.js')));
const abi = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/win32-abi.js')));
const api = ffi.win32Sync();
function acl(path, information) {
  const slots = Array.from({ length: 5 }, () => ffi.allocPtrSlot());
  assert.equal(api.getNamedSecurityInfoW(path, abi.SE_FILE_OBJECT, information, ...slots), 0);
  const descriptor = ffi.decodePtr(slots[4]);
  try {
    const value = ffi.decodePtr(slots[information === abi.DACL_SECURITY_INFORMATION ? 2 : 3]);
    if (value === null) return [];
    const size = ffi.decodeUint16At(value, 2); const count = ffi.decodeUint16At(value, 4);
    assert.ok(size >= 8 && size <= 1048576); let offset = 8; const entries = [];
    for (let i = 0; i < count; i++) {
      const length = ffi.decodeUint16At(value, offset + 2);
      assert.ok(length >= 16 && offset + length <= size);
      const sidOffset = offset + 8; const subs = ffi.decodeUint8At(value, sidOffset + 1);
      assert.ok(subs <= 15 && 16 + 4 * subs <= length); let authority = 0n;
      for (let j = 0; j < 6; j++) authority = authority * 256n + BigInt(ffi.decodeUint8At(value, sidOffset + 2 + j));
      const tail = Array.from({ length: subs }, (_, j) => ffi.decodeUint32At(value, sidOffset + 8 + 4 * j));
      entries.push({ type: ffi.decodeUint8At(value, offset), flags: ffi.decodeUint8At(value, offset + 1),
        mask: ffi.decodeUint32At(value, offset + 4),
        sid: `S-${ffi.decodeUint8At(value, sidOffset)}-${authority}${tail.length ? '-' + tail.join('-') : ''}` });
      offset += length;
    }
    return entries;
  } finally { if (descriptor !== null) api.localFree(descriptor); }
}
const pwsh = 'C:/Program Files/PowerShell/7/pwsh.exe';
const snapshotScript = resolve(import.meta.dirname, 'snapshot-latest-live-original-files.ps1');
async function snapshot() {
  const objects = JSON.parse(execFileSync(pwsh, ['-NoProfile', '-File', snapshotScript, '-Workspace', state.workspacePath],
    { cwd: runtime, windowsHide: true, encoding: 'utf8' }).replace(/^\uFEFF/, ''));
  assert.deepEqual(objects.map(item => item.path).sort(), paths);
  return Promise.all(objects.map(async item => ({ ...item,
    dacl: acl(item.path, abi.DACL_SECURITY_INFORMATION), label: acl(item.path, abi.LABEL_SECURITY_INFORMATION),
    bytes: (await lstat(item.path)).isFile() ? (await readFile(item.path)).toString('base64') : null })));
}
const beforePath = resolve(runtime, 'latest-live-original-files-repair-before.json');
const recovery = resolve(runtime, 'latest-live-original-files-repair-recovery');
// 只读复核用独立记录，不能覆盖上次恢复/审计或重复运行修复。
const reportPath = resolve(runtime, 'latest-live-original-files-' + phase + (auditAttempt ? '-' + auditAttempt : '') + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const report = { at: new Date().toISOString(), phase, home: state.home, workspace: state.workspacePath,
  hostPid: state.hostPid, originalFailurePreserved: true, passed: false };
try {
  if (phase === 'audit') {
    process.kill(state.hostPid, 0); process.kill(state.supervisorPid, 0);
    const restored = JSON.parse(await readFile(resolve(runtime, 'latest-live-original-files-restore.json'), 'utf8'));
    assert.equal(restored.passed, true); assert.equal(restored.entireOriginalTreePermissionsAndBytesRestored, true);
    assert.equal(restored.home, state.home);
    const before = JSON.parse(await readFile(beforePath, 'utf8'));
    assert.equal(before.home, state.home); assert.equal(before.workspace, state.workspacePath);
    assert.deepEqual(await snapshot(), before.objects);
    report.normalHostAlive = true; report.entireOriginalTreePermissionsAndBytesRestored = true;
  } else if (phase === 'prepare') {
    const before = { home: state.home, workspace: state.workspacePath, sourceCommit: installed.sourceCommit,
      files: seeds.map(seed => seed.file), objects: await snapshot() };
    await writeFile(beforePath, JSON.stringify(before, null, 2), { flag: 'wx' });
    report.fullSnapshotSaved = true; report.objects = before.objects.length;
  } else {
    // 活控制器/陈旧cleanup.json不足以证明进程已停；必须实际ESRCH且原控制器记录已清理。
    assert.throws(() => process.kill(state.hostPid, 0), { code: 'ESRCH' });
    assert.throws(() => process.kill(state.supervisorPid, 0), { code: 'ESRCH' });
    const stopped = JSON.parse(await readFile(resolve(state.home, 'cleanup.json'), 'utf8'));
    assert.equal(stopped.hostPid, state.hostPid); assert.equal(stopped.stopped, true);
    const before = JSON.parse(await readFile(beforePath, 'utf8'));
    assert.equal(before.home, state.home); assert.equal(before.workspace, state.workspacePath);
    assert.deepEqual(before.files, seeds.map(seed => seed.file));
    const candidate = await prepareLatestAclRepair(); report.candidate = candidate;
    if (phase === 'repair') {
      assert.deepEqual(await snapshot(), before.objects);
      await assert.rejects(access(recovery), { code: 'ENOENT' });
      for (const file of before.files) execFileSync(pwsh, ['-NoProfile', '-File', candidate.path,
        '-Path', file, '-AllowRoot', state.workspacePath, '-Out', recovery], { cwd: runtime, windowsHide: true, stdio: 'pipe' });
      const names = (await readdir(recovery)).filter(name => /^acl-backup-[a-f0-9]+\.json$/.test(name));
      const backups = await Promise.all(names.map(async name => JSON.parse(await readFile(resolve(recovery, name), 'utf8'))));
      assert.deepEqual(backups.map(item => item.Path).sort(), [state.workspacePath, ...before.files].sort());
      const after = await snapshot();
      for (let i = 0; i < after.length; i++) {
        assert.equal(after[i].bytes, before.objects[i].bytes); assert.equal(after[i].owner, before.objects[i].owner);
        assert.equal(after[i].protected, before.objects[i].protected); assert.deepEqual(after[i].label, before.objects[i].label);
        if (![state.workspacePath, ...before.files].includes(after[i].path)) assert.deepEqual(after[i], before.objects[i]);
      }
      report.after = after; report.explicitOriginalFilesRepaired = true;
    } else {
      const library = await import(pathToFileURL(resolve(libraryRoot, 'lib/index.js')));
      const grant = library.AclWriteGrant.create(library.workspaceWriteSid(await realpath(state.workspacePath)));
      try { grant.add(state.workspacePath, false); } finally { grant.dispose(); }
      const records = await Promise.all((await readdir(recovery)).filter(name => /^acl-backup-[a-f0-9]+\.json$/.test(name))
        .map(async name => ({ path: resolve(recovery, name), saved: JSON.parse(await readFile(resolve(recovery, name), 'utf8')) })));
      assert.deepEqual(records.map(item => item.saved.Path).sort(), [state.workspacePath, ...before.files].sort());
      records.sort((a, b) => b.saved.Path.length - a.saved.Path.length);
      for (const record of records) execFileSync(pwsh, ['-NoProfile', '-File', record.path + '.ps1', '-Path', record.saved.Path,
        '-AllowRoot', state.workspacePath, '-Restore', record.path], { cwd: runtime, windowsHide: true, stdio: 'pipe' });
      assert.deepEqual(await snapshot(), before.objects); report.entireOriginalTreePermissionsAndBytesRestored = true;
    }
  }
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, code: error.code, message: error.message, status: error.status };
  process.exitCode = 1;
} finally {
  await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ phase, passed: report.passed, failure: report.failure,
    fullSnapshotSaved: report.fullSnapshotSaved, explicitOriginalFilesRepaired: report.explicitOriginalFilesRepaired,
    entireOriginalTreePermissionsAndBytesRestored: report.entireOriginalTreePermissionsAndBytesRestored }));
}
setTimeout(() => process.exit(process.exitCode ?? 0), 200);
