// 为持久手机实测准备固定源码；完整恢复由同一归属记录核验，不接触日常安装或Key。
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, access, statfs } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installSourceRuntime, prepareSourceRuntime, sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';
import { installStartup } from '../compatibility/source-start/install.mjs';
import { readLatestLiveResume } from '../../backend/scripts/latest-live-resume.mjs';
import { readClientBuildRecord } from '../artifacts/latest-source-check/scripts/client-build-environment.ts';

const action = process.argv[2]; assert.ok(['prepare', 'restore', 'retry', 'retry-restore'].includes(action));
const restoreBytesOnly = process.argv.at(-1) === '--restore-bytes-only';
if (restoreBytesOnly) {
  assert.equal(action, 'restore'); assert.equal(process.argv[3], '--scope=sdk-attempt-11');
  assert.equal(process.argv.length, 5);
  const failed = JSON.parse(await readFile(resolve(import.meta.dirname, '../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-11.json')));
  assert.equal(failed.passed, false); assert.equal(failed.exitCode, 1); assert.equal(failed.files, 38);
  const failedLog = await readFile(resolve(import.meta.dirname, '../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-11.log'), 'utf8');
  assert.ok(failedLog.includes('ENOSPC: no space left on device, copyfile'));
  const disk = await statfs(sourceRoot);
  assert.ok(disk.bavail * disk.bsize < 1024 ** 3, 'Only defer restoration build after confirmed disk exhaustion');
  process.argv.pop();
}
assert.ok(process.argv.length === 3 || process.argv.length === 4 && ['--scope=sdk-attempt-11', '--scope=sdk-attempt-10', '--scope=electron-encoding-3', '--scope=electron-encoding-2', '--scope=electron', '--scope=applying-cold', '--scope=sdk-write', '--scope=sdk-attempt-7', '--scope=sdk-attempt-8', '--scope=sdk-attempt-9', '--scope=tty-cli', '--scope=cordis-race', '--scope=cordis-late-code', '--scope=cordis-two-android', '--scope=cordis-failures', '--scope=cordis-render', '--scope=cordis-factory', '--scope=desktop-unload', '--scope=desktop-launch', '--scope=child-descriptor', '--scope=child-unload', '--scope=child-retention', '--scope=child-notice', '--scope=child-one-shot', '--scope=child-control', '--scope=child-nested', '--scope=nested-resume'].includes(process.argv[3]));
const scope = process.argv[3]?.slice('--scope='.length);
assert.ok(!['retry', 'retry-restore'].includes(action) || ['applying-cold', 'sdk-write'].includes(scope)
  || action === 'retry-restore' && ['sdk-attempt-7', 'sdk-attempt-10', 'cordis-race', 'cordis-late-code', 'cordis-two-android'].includes(scope));
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const file = resolve(runtime, 'latest-live-source-lease.json');
const git = (...args) => execFileSync('git', args, { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const env = { DSH_TELEMETRY_DISABLED: '1' };
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
assert.equal(git('rev-parse', 'HEAD'), sourceCommit);
let lease;
if (action === 'prepare') {
  assert.equal(git('status', '--porcelain'), '');
  const manifest = await prepareSourceRuntime();
  lease = { at: new Date().toISOString(), sourceRoot, sourceCommit, state: 'preparing', stages: [], ...(scope ? { scope } : {}),
    originals: manifest.files.map(file => ({ path: file.path, sha256: file.before })),
    originalPackage: hash(await readFile(resolve(sourceRoot, 'package.json'))),
    originalClientArtifacts: readClientBuildRecord(sourceRoot).artifacts };
  // 排他创建，保留中断后的恢复依据；不能用新一轮准备覆盖尚未恢复的载荷。
  await writeFile(file, JSON.stringify(lease, null, 2), { flag: 'wx' });
} else {
  lease = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(lease.sourceRoot, sourceRoot); assert.equal(lease.sourceCommit, sourceCommit);
  assert.equal(lease.scope, scope, 'restore must retain the original build evidence scope');
  assert.ok(['preparing', 'ready', 'failed', 'restoring'].includes(lease.state));
  if (action === 'retry') {
    assert.equal(lease.state, 'failed'); assert.equal(lease.failure.action, 'prepare');
    assert.equal(lease.stages.length, 1); assert.equal(lease.stages[0].code, 1);
    assert.equal(lease.stages[0].timedOut, false);
    const log = await readFile(resolve(runtime, lease.stages[0].log), 'utf8');
    assert.ok(log.includes('EPERM: operation not permitted, rename') && log.includes('devtools.build-'));
    await writeFile(resolve(runtime, `latest-live-source-${scope}-failed-lease.json`), JSON.stringify(lease, null, 2), { flag: 'wx' });
  }
  if (action === 'retry-restore') {
    assert.equal(lease.state, 'failed'); assert.equal(lease.failure.action, 'restore');
    const stage = lease.stages.at(-1);
    assert.equal(stage.name, 'restored-build'); assert.equal(stage.code, 1); assert.equal(stage.timedOut, false);
    assert.equal(lease.restoredOriginalBytes, true);
    const log = await readFile(resolve(runtime, stage.log), 'utf8');
    if (['cordis-race', 'cordis-late-code', 'cordis-two-android'].includes(scope)) {
      // 本轮原构建在 DevTools 发布目录 rename 失败；只重试已恢复原字节的同一归属记录。
      assert.ok(log.includes('EPERM: operation not permitted, rename') && log.includes('devtools.build-')
        && log.includes('packages\\experimental\\inspector\\lib\\devtools'));
    } else assert.ok(log.includes('ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY'));
    await writeFile(resolve(runtime, `latest-live-source-${scope}-restore-failed-lease.json`), JSON.stringify(lease, null, 2), { flag: 'wx' });
  }
  const live = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json'), 'utf8'));
  if (live.executionMode === 'source') await readLatestLiveResume(runtime);
}
const save = () => writeFile(file, JSON.stringify(lease, null, 2));
const build = async name => {
  const started = Date.now();
  const child = spawn(process.execPath, [resolve(sourceRoot, 'node_modules/pnpm/bin/pnpm.cjs'), 'run', 'build'],
    { cwd: sourceRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', timedOut = false;
  child.stdout.on('data', bytes => { output += bytes; }); child.stderr.on('data', bytes => { output += bytes; });
  const timer = setTimeout(() => {
    timedOut = true;
    if (child.exitCode === null && child.signalCode === null) {
      if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { cwd: sourceRoot, windowsHide: true, stdio: 'ignore' });
      else child.kill();
    }
  }, 900000);
  console.log(JSON.stringify({ stage: name, pid: child.pid, running: true }));
  try {
    const code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
    const log = `latest-live-source-${scope ? scope + '-' : ''}${name}.log`;
    await writeFile(resolve(runtime, log), output.replace(/https?:\/\/\S+/g, '[URL]'), scope ? { flag: 'wx' } : undefined);
    lease.stages.push({ name, ...(scope ? { log } : {}), code, timedOut, elapsedMs: Date.now() - started }); await save();
    assert.equal(code, 0, 'latest_live_source_build_failed'); assert.equal(timedOut, false);
    console.log(JSON.stringify(lease.stages.at(-1)));
  } finally { clearTimeout(timer); }
};
try {
  if (action === 'prepare' || action === 'retry') {
    lease.runtimeApply = await installSourceRuntime('apply', sourceRoot); await save();
    lease.startupApply = await installStartup('apply', sourceRoot); await save();
    await build(action === 'retry' ? 'patched-build-retry-2' : 'patched-build');
    const installed = await verifyInstalledSource();
    lease.patchedClientArtifacts = installed.clientArtifacts; lease.patches = installed.patches; lease.files = installed.files;
    if (action === 'retry') { lease.previousFailure = lease.failure; delete lease.failure; }
    lease.state = 'ready';
  } else {
    lease.state = 'restoring'; await save();
    lease.runtimeRestore = await installSourceRuntime('restore', sourceRoot);
    lease.startupRestore = await installStartup('restore', sourceRoot);
    for (const original of lease.originals) assert.equal(hash(await readFile(resolve(sourceRoot, original.path))), original.sha256);
    assert.equal(hash(await readFile(resolve(sourceRoot, 'package.json'))), lease.originalPackage);
    for (const name of ['register.mjs', 'bootstrap.mjs']) await assert.rejects(access(resolve(sourceRoot, '.dshm-source', name)), { code: 'ENOENT' });
    assert.equal(git('status', '--porcelain'), ''); lease.restoredOriginalBytes = true; await save();
    if (restoreBytesOnly) {
      // 字节恢复与完整原构建是两项证据；等待空间时保持restoring，不伪造完成。
      lease.originalBuildDeferredForSdk11DiskExhaustion = true;
    } else {
      await build(action === 'retry-restore' ? 'restored-build-retry-2' : 'restored-build');
      assert.deepEqual(readClientBuildRecord(sourceRoot).artifacts, lease.originalClientArtifacts);
      if (action === 'retry-restore') { lease.previousRestoreFailure = lease.failure; delete lease.failure; }
      lease.restoredOriginalClientArtifacts = true; lease.state = 'restored';
      delete lease.originalBuildDeferredForSdk11DiskExhaustion;
    }
  }
} catch (error) { lease.state = 'failed'; lease.failure = { action, name: error.name, message: error.message }; throw error; }
finally { await save(); }
console.log(JSON.stringify({ state: lease.state, sourceCommit, files: lease.files,
  restoredOriginalBytes: lease.restoredOriginalBytes, restoredOriginalClientArtifacts: lease.restoredOriginalClientArtifacts }));
// 完整构建和校验结束后，tsx/esbuild保有的句柄不延长本次工具进程。
process.exit(0);
