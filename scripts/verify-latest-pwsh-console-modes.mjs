// 原编译执行器的三种实际进程环境；每个结果独立保存，不覆盖历史候选。
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';
import { sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

assert.equal(process.argv.length, 2);
const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const label = 'electron-encoding-3';
const file = resolve(runtime, `latest-${label}-console-modes.json`);
await assert.rejects(access(file), { code: 'ENOENT' });
const lease = JSON.parse(await readFile(resolve(runtime, 'latest-live-source-lease.json')));
assert.equal(lease.scope, label); assert.equal(lease.state, 'ready');
const installed = await verifyInstalledSource();
assert.equal(installed.files, 38);
assert.deepEqual(installed.clientArtifacts, lease.patchedClientArtifacts);
const manifestBytes = await readFile(resolve(outputRoot, 'manifest.json'));
const electron = JSON.parse(await readFile(resolve(runtime, 'electron-attempt-1/preparation.json'))).executable;
const report = { at: new Date().toISOString(), passed: false, sourceCommit: installed.sourceCommit,
  sourceFiles: installed.files, manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'), cases: [] };
const env = { DSH_TELEMETRY_DISABLED: '1', DSHM_RUN_LIVE: '1', DSHM_ENCODING_SOURCE: '1', DSHM_ENCODING_VARIANT: 'installed' };
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
async function launch(name, executable, { detached = false, noConsole = false } = {}) {
  const caseEnv = { ...env, ...(noConsole ? { DSHM_ENCODING_NO_CONSOLE: '1' } : { DSHM_PRIVATE_CONSOLE: '1' }),
    ...(name === 'electron' ? { ELECTRON_RUN_AS_NODE: '1' } : {}) };
  const child = spawn(executable, [resolve(root, 'scripts/verify-latest-pwsh-encoding.mjs'), '--run=' + label],
    { cwd: root, env: caseEnv, detached, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '', timedOut = false;
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  console.log(JSON.stringify({ name, pid: child.pid, running: true }));
  const timer = setTimeout(() => {
    timedOut = true;
    if (child.exitCode === null && child.signalCode === null)
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { cwd: root, windowsHide: true, stdio: 'ignore' });
  }, 180000);
  try {
    const code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
    const resultFile = resolve(runtime, 'encoding-check', 'source-' + (noConsole ? 'no-console-' : 'private-console-')
      + label + '-' + (name === 'electron' ? 'electron-' : 'node-') + 'installed.json');
    const result = JSON.parse(await readFile(resultFile));
    const item = { name, pid: child.pid, code, timedOut, resultFile, passed: result.passed,
      consoleEvidence: result.consoleEvidence, cases: result.cases };
    report.cases.push(item);
    await writeFile(resolve(runtime, `latest-${label}-${name}-stdout.log`), stdout, { flag: 'wx' });
    await writeFile(resolve(runtime, `latest-${label}-${name}-stderr.log`), stderr, { flag: 'wx' });
    console.log(JSON.stringify({ name, code, timedOut, passed: result.passed,
      cases: result.cases.map(({ version, sandbox, passed, outputCorrect, failure }) => ({ version, sandbox, passed, outputCorrect, failure })) }));
    assert.equal(timedOut, false); assert.equal(code, 0); assert.equal(result.passed, true);
    assert.equal(result.cases.length, 4);
    assert.ok(result.cases.every(row => row.passed && row.originalAndObservedAgree && row.originalReadOnlyModeRetained));
    if (noConsole) {
      assert.equal(result.consoleEvidence.noConsole, true);
      assert.equal(result.consoleEvidence.error, 6);
      assert.equal(result.consoleEvidence.electron, name === 'electron' ? '44.0.0' : null);
    } else assert.equal(result.consoleEvidence.initialOutputCodePage, 936);
  } finally { clearTimeout(timer); }
}
try {
  await launch('node', process.execPath);
  await launch('detached-node', process.execPath, { detached: true, noConsole: true });
  await launch('electron', electron, { noConsole: true });
  assert.deepEqual(await readFile(resolve(outputRoot, 'manifest.json')), manifestBytes);
  report.passed = true;
} finally {
  await writeFile(file, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, file }));
}
// 官方模块留存的异步句柄不延长这次独立验证。
process.exit(0);
