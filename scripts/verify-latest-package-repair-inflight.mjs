// 原 operations + 真实 pnpm 的修复在途探针；不修改日常环境或模拟安装器结果。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createLatestRepairFixture } from '../tests/support/latest-repair-fixture.mjs';
import { sourcePackageProcessChanges } from '../compatibility/latest-upstream/source-package-process.mjs';
import { applySourceChange } from '../compatibility/latest-upstream/source-runtime.mjs';

const flags = process.argv.slice(2);
assert.ok(flags.length <= 3 && new Set(flags).size === flags.length);
assert.ok(flags.every(flag => ['--source-installed', '--candidate', '--timeout', '--attempt-2'].includes(flag)));
const source = flags.includes('--source-installed'), candidate = flags.includes('--candidate'), timeout = flags.includes('--timeout');
assert.ok(!source || !candidate);
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const output = resolve(runtime, 'package-repair-inflight'); await mkdir(output, { recursive: true });
const mode = source ? 'source-installed' : candidate ? 'candidate' : 'published';
const reportPath = resolve(output, mode + (timeout ? '-timeout' : '-cancel')
  + (flags.includes('--attempt-2') ? '-attempt-2' : '') + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const home = await mkdtemp(resolve(output, 'owned-'));
const profile = resolve(home, 'profile'); await mkdir(profile);
const require = createRequire(resolve(runtime, 'package.json'));
if (source) await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
const sourceRoot = resolve(import.meta.dirname, '../artifacts/latest-source-check');
let entry = source ? resolve(sourceRoot, 'packages/boot/plugin-manager/lib/types/operations.js')
  : require.resolve('@deepseek-ai/dsh-plugin-manager/operations');
const metadata = JSON.parse(await readFile(source ? resolve(sourceRoot, 'packages/boot/plugin-manager/package.json')
  : require.resolve('@deepseek-ai/dsh-plugin-manager/package.json'), 'utf8'));
assert.equal(metadata.version, '0.2.1-alpha.1');
if (candidate) {
  const change = sourcePackageProcessChanges[0];
  const original = await readFile(resolve(import.meta.dirname, '../artifacts/latest-source-patches/original', change.path), 'utf8');
  const patched = applySourceChange(change, original);
  const bundled = await build({ stdin: { contents: patched, loader: 'ts', resolveDir: resolve(sourceRoot, change.path, '..') },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2024',
    plugins: [{ name: 'fixed-latest-runtime', setup(builder) {
      builder.onResolve({ filter: /^(?:@deepseek-ai\/|execa$)/ }, args => ({
        path: pathToFileURL(require.resolve(args.path)).href, external: true,
      }));
    } }] });
  entry = resolve(home, 'candidate-operations.mjs');
  await writeFile(entry, bundled.outputFiles[0].contents, { flag: 'wx' });
}
const { runProfilePnpm } = await import(pathToFileURL(entry));
const { initProfile } = await import(pathToFileURL(source ? resolve(sourceRoot, 'packages/boot/app-boot/lib/index.js')
  : require.resolve('@deepseek-ai/dsh-app-boot')));
initProfile(profile, []);
const requests = [], responses = [], report = { at: new Date().toISOString(), home, mode,
  scenario: timeout ? 'repair-timeout' : 'cancel-during-repair', actualPnpm: true, passed: false, requests };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };
const delay = ms => new Promise(done => setTimeout(done, ms));
async function waitFor(probe, name, ms = 20000) {
  const deadline = Date.now() + ms;
  for (;;) { const value = await probe(); if (value) return value; assert.ok(Date.now() < deadline, name); await delay(50); }
}
const server = createServer((incoming, response) => {
  const url = new URL(incoming.url, 'http://127.0.0.1');
  if (url.pathname !== '/build') { response.writeHead(404).end(); return; }
  const item = { pid: Number(url.searchParams.get('pid')), child: Number(url.searchParams.get('child')),
    remotePort: incoming.socket.remotePort, closed: false };
  requests.push(item); response.once('close', () => { item.closed = true; });
  if (requests.length === 1) response.writeHead(200).end(); else responses.push(response);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const fixture = await createLatestRepairFixture(home, profile, 'http://127.0.0.1:' + server.address().port);
const { parseDocument } = require('yaml');
const policy = parseDocument(await readFile(resolve(profile, 'pnpm-workspace.yaml'), 'utf8'));
policy.setIn(['allowBuilds', fixture.selector], true); policy.set('sideEffectsCache', false);
await writeFile(resolve(profile, 'pnpm-workspace.yaml'), String(policy));
const context = { profile: 'repair-inflight', dir: profile, home, cwd: home,
  installAnchor: source ? resolve(sourceRoot, 'apps/cli/package.json') : require.resolve('@deepseek-ai/dsh/package.json') };
const options = { command: 'F:/Program Files/nodejs/node_global/pnpm.cmd', execution: 'service', outputBytes: 65536, idleTimeoutMs: timeout ? 3000 : 15000 };
const tracked = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
const bytes = () => Promise.all(tracked.map(name => readFile(resolve(profile, name))));
let baseline, running, result, operationError, settled = false, recorded;
const abort = new AbortController();
try {
  const installed = await runProfilePnpm(context, ['add', fixture.tarballs[0]], { ...options, idleTimeoutMs: 15000 });
  report.initialExit = installed.exitCode;
  assert.equal(installed.exitCode, 0, 'original baseline pnpm install failed');
  assert.equal(requests.length, 1); assert.ok(!alive(requests[0].pid) && !alive(requests[0].child));
  assert.equal(JSON.parse(await readFile(resolve(profile, 'node_modules', fixture.name, 'package.json'), 'utf8')).version, '0.0.1');
  baseline = await bytes();
  report.before = Object.fromEntries(tracked.map((name, i) => [name, createHash('sha256').update(baseline[i]).digest('hex')]));
  running = runProfilePnpm(context, ['add', fixture.tarballs[1]], { ...options, signal: abort.signal })
    .then(value => { result = value; settled = true; }, error => { operationError = { name: error.name,
      message: error.shortMessage ?? error.message, timedOut: error.timedOut === true, isCanceled: error.isCanceled === true }; settled = true; });
  await waitFor(() => requests.length === 2 || settled, 'actual repair lifecycle script did not start');
  assert.equal(requests.length, 2, 'repair must execute original old-version lifecycle script');
  const request = requests[1]; assert.ok(alive(request.pid) && alive(request.child));
  recorded = JSON.parse(await readFile(resolve(profile, '.plugin-manager/run.json'), 'utf8'));
  assert.ok(alive(recorded.pid));
  report.repairRun = recorded; report.actualRepairObserved = true;
  const rows = execFileSync('netstat.exe', ['-ano', '-p', 'TCP'], { cwd: home, windowsHide: true, encoding: 'utf8' })
    .split(/\r?\n/).map(row => row.trim().split(/\s+/));
  const owner = rows.find(row => row[0] === 'TCP' && row[1] === `127.0.0.1:${request.remotePort}`
    && row[2] === `127.0.0.1:${server.address().port}`);
  assert.equal(Number(owner?.[4]), request.pid, 'HTTP peer must be the original installed lifecycle script');
  const writesPath = resolve(profile, 'node_modules', fixture.name, 'owned-build-writes.json');
  report.writerAtStart = await waitFor(async () => {
    try { const value = JSON.parse(await readFile(writesPath, 'utf8')); return value.pid === request.child ? value : null; }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }, 'actual owned writer did not start');
  report.repairStartedAt = new Date().toISOString();
  console.log(JSON.stringify({ actualRepairObserved: true, mode: report.mode, scenario: report.scenario,
    repairRun: recorded.pid, script: request.pid, writer: request.child }));
  const originalFiles = await bytes(); assert.deepEqual(originalFiles, baseline, 'original installer restores config before repair starts');
  report.configRestoredBeforeRepair = true;
  if (!timeout) {
    abort.abort(); await delay(1500);
    report.waitsForRepairAfterCancel = !settled; assert.equal(settled, false, 'must not settle while repair script is still writing');
    assert.ok(alive(request.pid) && alive(request.child));
    responses.forEach(response => response.writeHead(200).end());
  }
  await waitFor(() => settled, 'repair did not settle', 20000);
  report.settledBeforeCleanup = true; report.error = operationError;
  report.result = result ? { exitCode: result.exitCode, timedOut: result.timedOut, incompatible: result.incompatible, logPath: result.logPath, output: result.output } : undefined;
  report.processesGoneBeforeCleanup = [recorded.pid, request.pid, request.child].every(pid => !alive(pid));
  assert.equal(report.processesGoneBeforeCleanup, true, 'repair descendants remain alive after operation settled');
  assert.equal(request.closed, true);
  const stoppedWrites = await readFile(writesPath);
  await delay(300);
  assert.deepEqual(await readFile(writesPath), stoppedWrites, 'owned writes must stop before profile lock release');
  report.writesStoppedBeforeCleanup = true;
  await assert.rejects(access(resolve(profile, '.plugin-manager/run.json')), { code: 'ENOENT' });
  assert.deepEqual(await bytes(), baseline); report.configStillRestored = true;
  if (!timeout) {
    assert.equal(operationError, undefined); assert.equal(result.exitCode, 1);
    assert.ok(result.incompatible.some(row => row.name === fixture.component));
    assert.match(result.output, /restored package\.json, pnpm-lock\.yaml, and node_modules/);
    assert.equal(JSON.parse(await readFile(resolve(profile, 'node_modules', fixture.name, 'package.json'), 'utf8')).version, '0.0.1');
    report.oldInstalledVersionRestored = true;
  } else {
    assert.equal(operationError, undefined);
    assert.equal(result.timedOut, true, 'repair timeout must preserve PackageResult timeout classification');
    assert.equal(result.exitCode, 1);
    assert.match(result.output, /node_modules could not be reinstalled/);
  }
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, message: error.message, code: error.code }; process.exitCode = 1;
  report.atFailure = { at: new Date().toISOString(), settled, recordedRunAlive: recorded ? alive(recorded.pid) : undefined,
    processes: requests.map(item => ({ pid: item.pid, alive: alive(item.pid), child: item.child, childAlive: alive(item.child) })) };
  try { report.writerAtFailure = JSON.parse(await readFile(resolve(profile, 'node_modules', fixture.name, 'owned-build-writes.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
finally {
  // 失败后的收尾只结束本探针原run或脚本明确公布的进程；不把事后清理算作通过。
  for (const pid of [...new Set([recorded?.pid, ...requests.flatMap(item => [item.pid, item.child])])])
    if (Number.isSafeInteger(pid) && pid > 0 && alive(pid))
      execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { cwd: home, windowsHide: true, stdio: 'ignore' });
  if (running) await waitFor(() => settled, 'owned probe failed to settle after cleanup');
  server.closeAllConnections(); await new Promise(done => server.close(done));
  report.cleanupProcessesGone = requests.every(item => !alive(item.pid) && !alive(item.child));
  report.originalErrorAfterCleanup = operationError;
  await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ mode: report.mode, scenario: report.scenario, passed: report.passed, failure: report.failure,
    actualRepairObserved: report.actualRepairObserved, processesGoneBeforeCleanup: report.processesGoneBeforeCleanup,
    waitsForRepairAfterCancel: report.waitsForRepairAfterCancel, cleanupProcessesGone: report.cleanupProcessesGone }));
}
