// 同一原沙箱执行器的诊断对照；不能替代最终桌面/手机实际验收。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..'), runtime = resolve(root, 'artifacts/latest-runtime-check');
assert.equal(process.argv[2], '--attempt-2'); assert.equal(process.argv.length, 3);
const directory = resolve(runtime, 'electron-owned-console-probe-2');
await assert.rejects(access(directory), { code: 'ENOENT' }); await mkdir(directory);
const executable = JSON.parse(await readFile(resolve(runtime, 'electron-attempt-1/preparation.json'))).executable;
const env = { DSH_TELEMETRY_DISABLED: '1', DSHM_RUN_LIVE: '1', DSHM_ENCODING_VARIANT: 'installed',
  DSHM_ENCODING_NO_CONSOLE: '1', ELECTRON_RUN_AS_NODE: '1', DSHM_OWNED_CONSOLE_ATTEMPT: '2',
  NODE_OPTIONS: '--import ' + JSON.stringify(pathToFileURL(resolve(root, 'tests/support/latest-electron-owned-console-probe.mjs')).href) };
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
const child = spawn(executable, [resolve(root, 'scripts/verify-latest-pwsh-encoding.mjs'), '--run=electron-owned-console-probe-2'],
  { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '', stderr = '';
child.stdout.on('data', bytes => { stdout += bytes; }); child.stderr.on('data', bytes => { stderr += bytes; });
console.log(JSON.stringify({ pid: child.pid, running: true, diagnosticOnly: true }));
const report = { at: new Date().toISOString(), pid: child.pid, diagnosticOnly: true, passed: false };
try {
  report.code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
  await writeFile(resolve(directory, 'stdout.log'), stdout, { flag: 'wx' });
  await writeFile(resolve(directory, 'stderr.log'), stderr, { flag: 'wx' });
  report.originalExecution = JSON.parse(await readFile(resolve(runtime, 'encoding-check/no-console-electron-owned-console-probe-2-electron-installed.json')));
  report.runners = await Promise.all((await readdir(directory)).filter(name => /^runner-\d+\.json$/.test(name))
    .map(async name => JSON.parse(await readFile(resolve(directory, name)))));
  assert.equal(report.code, 0); assert.equal(report.originalExecution.passed, true);
  assert.equal(report.runners.length, 6);
  assert.ok(report.runners.every(row => row.originalStdioPipesPreserved && row.outputCodePage === 65001 && row.attachedPids.length === 1));
  report.passed = true;
} finally {
  await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, code: report.code, runnerCount: report.runners?.length, diagnosticOnly: true }));
}
process.exit(0);
