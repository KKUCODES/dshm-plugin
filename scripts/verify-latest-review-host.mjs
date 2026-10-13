// 用解包后的候选实际启动独立原发布Host；不触碰持久联调home或读取日常凭据。
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.ok(process.argv.length === 3 || process.argv.length === 4 && process.argv[3] === '--installed');
const installedMode = process.argv[3] === '--installed';
assert.match(process.argv[2], /^candidate-package-check-[A-Za-z0-9]+$/);
const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const output = resolve(runtime, process.argv[2]); assert.equal(await realpath(output), output);
const packageReport = JSON.parse(await readFile(resolve(output, 'report.json')));
assert.equal(packageReport.passed, true); assert.equal(packageReport.targetVersion, '0.2.1-alpha.1');
assert.equal(packageReport.productionManifestPreserved, true); assert.equal(packageReport.runningCandidatePreserved, true);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(packageReport.package.path, resolve(output, 'dsh-mobile-plugin-0.1.76-latest.0.tgz'));
assert.equal(digest(await readFile(packageReport.package.path)), packageReport.package.sha256);
const installed = resolve(output, 'consumer/node_modules/@dsh-mobile/plugin');
const metadata = JSON.parse(await readFile(resolve(installed, 'package.json')));
assert.equal(metadata.version, '0.1.76-latest.0');
const home = resolve(output, installedMode ? 'installed-home' : 'host-home');
if (installedMode) {
  const installation = JSON.parse(await readFile(resolve(output, 'install-report.json')));
  assert.equal(installation.passed, true); assert.equal(installation.home, home);
} else { await assert.rejects(access(home), { code: 'ENOENT' }); await mkdir(home); }
const resultPath = resolve(output, installedMode ? 'installed-host-report.json' : 'host-report.json');
await assert.rejects(access(resultPath), { code: 'ENOENT' }); assert.equal(await realpath(home), home);
const patch = resolve(home, 'review.patch.json');
if (!installedMode)
  await writeFile(patch, JSON.stringify([{ insert: [{ id: 'dsh-mobile', name: pathToFileURL(resolve(installed, 'dist/index.js')).href }] }]), { flag: 'wx' });
const env = { DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1' };
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
const child = spawn(process.execPath, [resolve(runtime, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
  'web', ...installedMode ? [] : ['--patch', patch], '--host', '127.0.0.1', '--port', '0', '--no-open'], {
  cwd: runtime, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let stdout = '', stderr = '', spawnError;
child.stdout.setEncoding('utf8'); child.stdout.on('data', value => { stdout += value; });
child.stderr.setEncoding('utf8'); child.stderr.on('data', value => { stderr += value; });
child.on('error', error => { spawnError = error; });
const stopped = new Promise(done => child.once('close', (code, signal) => done({ code, signal })));
const report = { at: new Date().toISOString(), passed: false, home, launcherPid: child.pid,
  command: 'dsh web ' + (installedMode ? '' : '--patch <owned-package-overlay> ') + '--host 127.0.0.1 --port 0 --no-open' };
try {
  const deadline = Date.now() + 45000; let entry;
  while (!entry) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw Error('review_host_exited');
    if (Date.now() > deadline) throw Error('review_host_startup_timeout');
    entry = stdout.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
    if (!entry) await new Promise(done => setTimeout(done, 100));
  }
  const login = await fetch(entry, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  assert.equal(login.status, 303); const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
  const page = await fetch(new URL('/', entry), { headers: { cookie }, signal: AbortSignal.timeout(10000) });
  assert.equal(page.status, 200); assert.match(await page.text(), /<html/);
  const settings = await fetch(new URL('/api/dsh-mobile', entry), { headers: { cookie }, signal: AbortSignal.timeout(10000) });
  assert.equal(settings.status, 200); const view = await settings.json(); assert.equal(view.configured, false);
  const rpcId = randomUUID();
  const sessions = await fetch(new URL('/api/session/list', entry), { method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: 'session/list', payload: { args: { _request: {} } } }),
  });
  assert.equal(sessions.status, 200); const frame = await sessions.json();
  assert.equal(frame.rpcId, rpcId); assert.equal(frame.result.ok, true); assert.deepEqual(frame.result.value.items, []);
  assert.ok(!stderr.includes('disabling profile plugin row "dsh-mobile"'));
  report.actualPublishedHost = true; report.pluginSettings = true; report.emptyOwnedHistory = true;
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, message: error.message }; process.exitCode = 1;
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { cwd: output, windowsHide: true, stdio: 'ignore' });
  }
  report.stopped = await stopped;
  assert.throws(() => process.kill(child.pid, 0), error => error.code === 'ESRCH');
  await writeFile(resolve(output, installedMode ? 'installed-host-log.txt' : 'host-log.txt'),
    (stdout + stderr).replace(/https?:\/\/\S+/g, '[URL]'), { flag: 'wx' });
  await writeFile(resultPath, JSON.stringify(report, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify({ passed: report.passed, launcherStopped: true, output, failure: report.failure?.message }));
process.exit(process.exitCode ?? 0);
