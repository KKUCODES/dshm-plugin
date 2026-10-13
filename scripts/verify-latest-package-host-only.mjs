// 官方安装器的Windows残留保护探针；独立profile，不替代手机验收。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { access, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLatestRepairFixture } from '../tests/support/latest-repair-fixture.mjs';
import { build } from 'esbuild';

assert.equal(process.platform, 'win32');
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const output = resolve(runtime, 'package-host-only');
const require = createRequire(resolve(runtime, 'package.json'));
const sourceRoot = resolve(runtime, '../latest-source-check');
const sourceEntry = resolve(sourceRoot, 'packages/boot/plugin-manager/lib/types/operations.js');
const releaseEntry = require.resolve('@deepseek-ai/dsh-plugin-manager/operations');
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };
const delay = ms => new Promise(done => setTimeout(done, ms));
async function waitFor(probe, message, ms = 30000) {
  const deadline = Date.now() + ms;
  for (;;) { const value = await probe(); if (value) return value; assert.ok(Date.now() < deadline, message); await delay(50); }
}

if (process.argv[2] === '--worker') {
  assert.equal(process.argv.length, 4);
  const configPath = await realpath(process.argv[3]);
  assert.match(relative(await realpath(output), configPath).replaceAll('\\', '/'), /^owned-[^/]+\/worker.json$/);
  const config = JSON.parse(await readFile(configPath));
  assert.ok([sourceEntry, releaseEntry, resolve(configPath, '../candidate-operations.mjs')].includes(config.entry));
  assert.equal(config.context.home, resolve(configPath, '..'));
  assert.equal(config.context.dir, resolve(config.context.home, 'profile'));
  assert.deepEqual(config.args, [resolve(config.context.home, 'repair-0.0.2.tgz').replaceAll('\\', '/')]);
  const { runPluginCommand } = await import(pathToFileURL(config.entry));
  const abort = new AbortController();
  if (config.cancelTest) process.once('message', message => {
    assert.equal(message, 'cancel-owned-install'); abort.abort();
  });
  const result = await runPluginCommand(config.context, ['add', ...config.args],
    { ...config.options, signal: abort.signal });
  const pids = JSON.parse(await readFile(resolve(config.context.home, 'worker-pids.json')));
  const processStatesAtSettlement = pids.map(pid => ({ pid, alive: alive(pid) }));
  await writeFile(resolve(config.context.home, 'worker-result.json'), JSON.stringify({ exitCode: result.exitCode,
    timedOut: result.timedOut === true, incompatible: result.incompatible, output: result.output,
    processStatesAtSettlement }), { flag: 'wx' });
  console.log(JSON.stringify({ workerFinished: true, exitCode: result.exitCode }));
  process.exit(0);
}

const flags = process.argv.slice(2);
assert.ok(flags.length <= 4 && new Set(flags).size === flags.length);
assert.ok(flags.every(flag => ['--source-installed', '--candidate', '--native-installed', '--cancel', '--timeout'].includes(flag) || /^--attempt-[2-9]$/.test(flag)));
const source = flags.includes('--source-installed'), candidate = flags.includes('--candidate');
const nativeInstalled = flags.includes('--native-installed');
const cancelling = flags.includes('--cancel'), timingOut = flags.includes('--timeout');
assert.ok(!source || !candidate);
assert.ok(!nativeInstalled || !candidate);
assert.ok(!cancelling || !timingOut); assert.ok(!(cancelling || timingOut) || candidate || nativeInstalled);
const mode = source ? 'source-installed' : candidate ? 'candidate' : 'published';
const attempt = flags.find(flag => flag.startsWith('--attempt-'))?.replace('--', '-') ?? '';
await mkdir(output, { recursive: true });
const reportPath = resolve(output, mode + (nativeInstalled ? '-native-installed' : '') + (cancelling ? '-cancel' : timingOut ? '-timeout' : '') + attempt + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
if (source) await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
let entry = source ? sourceEntry : releaseEntry;
const metadataPath = source ? resolve(sourceRoot, 'packages/boot/plugin-manager/package.json')
  : require.resolve('@deepseek-ai/dsh-plugin-manager/package.json');
assert.equal(JSON.parse(await readFile(metadataPath)).version, '0.2.1-alpha.1');
const entryHash = createHash('sha256').update(await readFile(entry)).digest('hex');
const { initProfile } = await import(pathToFileURL(source ? resolve(sourceRoot, 'packages/boot/app-boot/lib/index.js')
  : require.resolve('@deepseek-ai/dsh-app-boot')));
const home = await mkdtemp(resolve(output, 'owned-'));
if (candidate) {
  const originalSource = await readFile(resolve(sourceRoot, 'packages/boot/plugin-manager/src/operations.ts'), 'utf8');
  let patched = originalSource;
  for (const anchor of ['const child = execa(', 'const repairing = execa(']) {
    assert.equal(patched.split(anchor).length, 2);
    patched = patched.replace(anchor, anchor.replace('execa(', 'packageExeca('));
  }
  const prototype = pathToFileURL(resolve(import.meta.dirname, '../compatibility/latest-upstream/package-runner-prototype.mjs')).href;
  patched = `import { packageExeca } from ${JSON.stringify(prototype)};\n` + patched;
  const bundled = await build({ stdin: { contents: patched, loader: 'ts', resolveDir: resolve(sourceRoot, 'packages/boot/plugin-manager/src') },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2024',
    plugins: [{ name: 'fixed-native-candidate', setup(builder) {
      builder.onResolve({ filter: /^(?:@deepseek-ai\/|execa$|file:)/ }, args => ({
        path: args.path.startsWith('file:') ? args.path : pathToFileURL(require.resolve(args.path)).href, external: true,
      }));
    } }] });
  entry = resolve(home, 'candidate-operations.mjs');
  await writeFile(entry, bundled.outputFiles[0].contents, { flag: 'wx' });
}
const { runPluginCommand } = await import(pathToFileURL(entry));
const actualEntryHash = createHash('sha256').update(await readFile(entry)).digest('hex');
const profile = resolve(home, 'profile');
await mkdir(profile); initProfile(profile, []);
const requests = [], responses = [];
const server = createServer((incoming, response) => {
  const url = new URL(incoming.url, 'http://127.0.0.1');
  if (url.pathname !== '/build') { response.writeHead(404).end(); return; }
  const item = { pid: Number(url.searchParams.get('pid')), child: Number(url.searchParams.get('child')), closed: false };
  requests.push(item); response.once('close', () => { item.closed = true; });
  if (requests.length === 1) response.writeHead(200).end(); else responses.push(response);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const fixture = await createLatestRepairFixture(home, profile, 'http://127.0.0.1:' + server.address().port);
const { parseDocument } = require('yaml');
const policy = parseDocument(await readFile(resolve(profile, 'pnpm-workspace.yaml'), 'utf8'));
policy.setIn(['allowBuilds', fixture.selector], true); policy.set('sideEffectsCache', false);
await writeFile(resolve(profile, 'pnpm-workspace.yaml'), String(policy));
const context = { profile: 'host-only', dir: profile, home, cwd: home,
  installAnchor: source ? resolve(sourceRoot, 'apps/cli/package.json') : require.resolve('@deepseek-ai/dsh/package.json') };
const options = { command: 'F:/Program Files/nodejs/node_global/pnpm.cmd', execution: 'service', outputBytes: 65536,
  idleTimeoutMs: 150000, lockWaitMs: 10000 };
const report = { at: new Date().toISOString(), mode, nativeInstalled, home, entryHash, actualEntryHash, actualPnpm: true,
  scenario: cancelling ? 'native-range-original-repair-cancel' : timingOut ? 'native-range-original-repair-timeout'
    : 'owner-only-exit-pre-write-guard', guardRefused: false, passed: false, requests };
const runPath = resolve(profile, '.plugin-manager/run.json');
const tracked = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
const bytes = () => Promise.all(tracked.map(name => readFile(resolve(profile, name))));
let worker, recorded, original;
try {
  const installed = await runPluginCommand(context, ['add', fixture.tarballs[0]], options);
  assert.equal(installed.exitCode, 0); assert.equal(requests.length, 1);
  assert.ok(!alive(requests[0].pid) && !alive(requests[0].child));
  original = await bytes();
  await writeFile(resolve(home, 'worker.json'), JSON.stringify({ entry, context,
    options: { ...options, idleTimeoutMs: timingOut ? 3000 : options.idleTimeoutMs }, cancelTest: cancelling,
    args: [fixture.tarballs[1]] }), { flag: 'wx' });
  worker = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', resolve(home, 'worker.json')],
    { cwd: home, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  worker.on('error', error => { report.workerSpawnError = error.message; });
  await waitFor(() => requests.length === 2, 'original repair script did not start');
  const repairing = requests[1];
  recorded = JSON.parse(await readFile(runPath));
  assert.ok([worker.pid, recorded.pid, repairing.pid, repairing.child].every(alive));
  await writeFile(resolve(home, 'worker-pids.json'), JSON.stringify([recorded.pid, repairing.pid, repairing.child]), { flag: 'wx' });
  assert.deepEqual(await bytes(), original);
  report.ownerPid = worker.pid; report.run = recorded;
  const writesPath = resolve(profile, 'node_modules', fixture.name, 'owned-build-writes.json');
  const readWriter = () => waitFor(async () => {
    try { const value = JSON.parse(await readFile(writesPath)); return value.pid === repairing.child ? value : null; }
    catch (error) { if (error.code === 'ENOENT' || error.name === 'SyntaxError') return null; throw error; }
  }, 'actual writer state unavailable', 5000);
  await readWriter();
  if (cancelling) {
    worker.send('cancel-owned-install'); await delay(1500);
    assert.ok([worker.pid, recorded.pid, repairing.pid, repairing.child].every(alive));
    await assert.rejects(access(resolve(home, 'worker-result.json')), { code: 'ENOENT' });
    report.originalCancelWaitsForRepair = true;
    responses.forEach(response => response.writeHead(200).end());
  } else if (!timingOut) {
    // 只结束本脚本明确创建的安装调用者，不结束pnpm或任何安装子进程。
    worker.kill('SIGKILL');
  }
  await waitFor(() => !alive(worker.pid), 'owned operation caller still alive');
  if (cancelling || timingOut) {
    report.originalResult = JSON.parse(await readFile(resolve(home, 'worker-result.json')));
    assert.equal(report.originalResult.exitCode, 1);
    assert.equal(report.originalResult.timedOut, timingOut);
    assert.ok(report.originalResult.processStatesAtSettlement.every(row => row.alive === false),
      'original operation settled while native package members remain alive');
    assert.ok(report.originalResult.incompatible.some(row => row.name === fixture.component));
    assert.ok(report.originalResult.output.includes(timingOut ? 'node_modules could not be reinstalled'
      : 'restored package.json, pnpm-lock.yaml, and node_modules'));
  }
  await delay(300);
  report.afterOwnerExit = [worker.pid, recorded.pid, repairing.pid, repairing.child].map(pid => ({ pid, alive: alive(pid) }));
  if (candidate || nativeInstalled) {
    await waitFor(() => [recorded.pid, repairing.pid, repairing.child].every(pid => !alive(pid)),
      'native owned range survived caller-only exit', 10000);
    const stopped = await readFile(writesPath); await delay(300); assert.deepEqual(await readFile(writesPath), stopped);
    report.nativeRangeGoneBeforeNextOperation = true;
  } else assert.ok(alive(repairing.pid) && alive(repairing.child), 'actual repair workers did not survive owner-only exit');
  const before = await readWriter(); await delay(300); const after = await readWriter();
  if (candidate || nativeInstalled) assert.equal(after.writes, before.writes);
  else assert.ok(after.writes > before.writes);
  report.writesContinued = { before, after };
  if (cancelling || timingOut) await assert.rejects(access(runPath), { code: 'ENOENT' });
  else assert.deepEqual(JSON.parse(await readFile(runPath)), recorded);
  // 走原写锁及同一个写入前保护，但只运行pnpm --version，不并发修改旧脚本正写的包。
  const guard = await runPluginCommand(context, ['--version'], { ...options, idleTimeoutMs: 10000 });
  report.guard = { exitCode: guard.exitCode, output: guard.output, logPath: guard.logPath };
  report.workersAliveAfterGuard = [repairing.pid, repairing.child].every(alive);
  report.guardRefused = guard.exitCode === 1 && guard.output.includes('still running in this profile');
  report.defectConfirmed = guard.exitCode === 0 && report.workersAliveAfterGuard;
  assert.deepEqual(await bytes(), original); report.profilePreserved = true;
  assert.equal(requests.length, 2); report.noConcurrentInstall = true;
  if (candidate || nativeInstalled) {
    assert.equal(guard.exitCode, 0); assert.equal(report.workersAliveAfterGuard, false);
    await assert.rejects(access(runPath), { code: 'ENOENT' });
    report.originalStaleRecordRecovery = true;
  } else {
    assert.equal(report.guardRefused, true, 'original pre-write guard admitted a pnpm operation while repair workers remain alive');
    assert.deepEqual(JSON.parse(await readFile(runPath)), recorded);
  }
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, message: error.message, code: error.code };
  process.exitCode = 1;
} finally {
  for (const response of responses) if (!response.destroyed && !response.writableEnded) response.writeHead(200).end();
  await delay(500);
  // 明确公布的本探针PID才能清理；清理结果不替代原保护结果。
  for (const pid of [...new Set([worker?.pid, recorded?.pid, ...requests.flatMap(item => [item.pid, item.child])])])
    if (Number.isSafeInteger(pid) && pid > 0 && alive(pid))
      execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { cwd: home, windowsHide: true, stdio: 'ignore' });
  await waitFor(() => requests.every(item => !alive(item.pid) && !alive(item.child)), 'owned repair workers survived cleanup');
  report.cleanupProcessesGone = true;
  try {
    // remove没有offline/ignore-scripts选项；此独立profile仅包含已经停止的测试包。
    const cleaned = await runPluginCommand(context, ['remove', fixture.name], options);
    report.cleanupExit = cleaned.exitCode;
    assert.equal(cleaned.exitCode, 0);
    await assert.rejects(access(resolve(profile, 'node_modules', fixture.name)), { code: 'ENOENT' });
    await assert.rejects(access(runPath), { code: 'ENOENT' });
    report.originalManagerCleanup = true;
  } catch (error) {
    report.cleanupFailure = { name: error.name, message: error.message, code: error.code };
    report.passed = false; process.exitCode = 1;
  } finally {
    server.closeAllConnections(); await new Promise(done => server.close(done));
    await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  }
  console.log(JSON.stringify({ mode, passed: report.passed, guardRefused: report.guardRefused,
    defectConfirmed: report.defectConfirmed, afterOwnerExit: report.afterOwnerExit,
    cleanupProcessesGone: report.cleanupProcessesGone, originalManagerCleanup: report.originalManagerCleanup, failure: report.failure }));
}
