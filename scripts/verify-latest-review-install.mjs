// 原dsh plugin安装真实tgz，随后用同一profile正常启动web，不使用入口覆盖。
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readInstalledLatestPackageRange } from '../compatibility/latest-upstream/package-range-runtime.mjs';

assert.equal(process.argv.length, 3); assert.match(process.argv[2], /^candidate-package-check-[A-Za-z0-9]+$/);
const root = resolve(import.meta.dirname, '..'), runtime = resolve(root, 'artifacts/latest-runtime-check');
const output = resolve(runtime, process.argv[2]); assert.equal(await realpath(output), output);
const pack = JSON.parse(await readFile(resolve(output, 'report.json')));
assert.equal(pack.passed, true); assert.equal(pack.targetVersion, '0.2.1-alpha.1');
const tarball = resolve(output, 'dsh-mobile-plugin-0.1.76-latest.0.tgz');
assert.equal(pack.package.path, tarball);
assert.equal(createHash('sha256').update(await readFile(tarball)).digest('hex'), pack.package.sha256);
const range = await readInstalledLatestPackageRange(); assert.equal(range.nativeRange, true); assert.equal(range.patched, 5);
const home = resolve(output, 'installed-home'); await assert.rejects(access(home), { code: 'ENOENT' });
await mkdir(home); assert.equal(await realpath(home), home);
const env = { DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', npm_config_store_dir: resolve(output, 'pnpm-store'),
  npm_config_cache: resolve(output, 'npm-cache') };
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
const child = spawn(process.execPath, [resolve(runtime, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
  'plugin', '--profile', 'web', 'add', tarball, '--ignore-scripts'], {
  cwd: output, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
const report = { at: new Date().toISOString(), passed: false, home, launcherPid: child.pid,
  command: 'dsh plugin --profile web add <owned-tgz> --ignore-scripts', automaticPeers: 'pnpm default' };
let stdout = '', stderr = '', timedOut = false;
child.stdout.setEncoding('utf8'); child.stdout.on('data', value => { stdout += value; });
child.stderr.setEncoding('utf8'); child.stderr.on('data', value => { stderr += value; });
const timer = setTimeout(() => {
  timedOut = true;
  if (child.exitCode === null && child.signalCode === null)
    execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { cwd: output, windowsHide: true, stdio: 'ignore' });
}, 180000);
console.log(JSON.stringify({ stage: 'original-plugin-install', pid: child.pid, running: true }));
try {
  report.exitCode = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
  assert.equal(timedOut, false); assert.equal(report.exitCode, 0);
  const installed = resolve(home, 'profiles/web/node_modules/@dsh-mobile/plugin');
  const expected = resolve(output, 'consumer/node_modules/@dsh-mobile/plugin');
  const sourceManifest = JSON.parse(await readFile(resolve(expected, 'package.json')));
  assert.deepEqual(JSON.parse(await readFile(resolve(installed, 'package.json'))), sourceManifest);
  const required = ['README.md', 'cordis.patch.yml', 'dist/index.js', 'dist/client.js', 'dist/index.d.ts', 'dist/config.d.ts', 'dist/client/index.d.ts'];
  for (const path of required) assert.deepEqual(await readFile(resolve(installed, path)), await readFile(resolve(expected, path)));
  const profile = JSON.parse(await readFile(resolve(home, 'profiles/web/package.json')));
  assert.ok(profile.dependencies['@dsh-mobile/plugin']);
  await assert.rejects(access(resolve(home, 'profiles/web/.plugin-manager/run.json')), { code: 'ENOENT' });
  report.installedFiles = required; report.originalManager = true; report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally {
  clearTimeout(timer); report.timedOut = timedOut;
  assert.throws(() => process.kill(child.pid, 0), error => error.code === 'ESRCH');
  await writeFile(resolve(output, 'install-log.txt'), (stdout + stderr).replace(/https?:\/\/\S+/g, '[URL]'), { flag: 'wx' });
  await writeFile(resolve(output, 'install-report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify({ stage: 'original-plugin-install', passed: report.passed, stopped: true, output, failure: report.failure?.message }));
if (report.passed) {
  const host = spawn(process.execPath, [resolve(root, 'scripts/verify-latest-review-host.mjs'), process.argv[2], '--installed'], {
    cwd: root, windowsHide: true, stdio: 'inherit',
  });
  const code = await new Promise((done, fail) => { host.once('close', done); host.once('error', fail); });
  assert.equal(code, 0);
}
process.exit(process.exitCode ?? 0);
