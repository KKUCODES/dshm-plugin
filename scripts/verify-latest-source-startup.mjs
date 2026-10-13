import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const source = resolve(root, 'artifacts/latest-source-check');
const checkout = JSON.parse(await readFile(resolve(runtime, 'source-checkout.json'), 'utf8'));
assert.equal(checkout.commit, '5badb15009ae1756c3afe0ae0cef1faafc290ccc');
assert.equal(checkout.sourceBuildVerified, true);
const { readClientBuildRecord } = await import(pathToFileURL(resolve(source, 'scripts/client-build-environment.ts')).href);
readClientBuildRecord(source);
const report = { at: new Date().toISOString(), commit: checkout.commit, command: 'pnpm dsh web', cases: [] };
const installed = process.argv.includes('--installed');
const waitFor = async (read, milliseconds = 45000) => {
  const until = Date.now() + milliseconds;
  do { const value = read(); if (value) return value; await new Promise(done => setTimeout(done, 100)); } while (Date.now() < until);
  throw Error('source_startup_timeout');
};
try {
  for (const mode of installed ? ['candidate-installed'] : ['original', 'candidate', 'candidate-canonical']) {
    const candidate = mode !== 'original';
    const home = resolve(runtime, 'source-start-homes', randomUUID());
    await mkdir(home, { recursive: true });
    const args = [resolve(source, 'node_modules/pnpm/bin/pnpm.cjs'), 'dsh', 'web'];
    if (candidate) {
      const overlay = resolve(home, 'candidate.patch.json');
      await writeFile(overlay, JSON.stringify([{ insert: [{ id: 'dsh-mobile', name: pathToFileURL(resolve(runtime, 'candidate/dist/index.js')).href }] }]));
      args.push('--patch', overlay);
    }
    // Launcher参数必须在首个Web应用参数之前，之后的参数原样交给Web应用。
    args.push('--host', '127.0.0.1', '--port', '0', '--no-open');
    const env = { DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1' };
    for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
      if (process.env[key] !== undefined) env[key] = process.env[key];
    if (mode === 'candidate-canonical') {
      env.DSHM_SOURCE_ROOT = source;
      env.NODE_OPTIONS = `--import=${pathToFileURL(resolve(root, 'compatibility/source-start/preload-probe.mjs')).href}`;
    }
    const child = spawn(process.execPath, args, { cwd: source, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stopped = new Promise(done => child.once('close', (code, signal) => done({ code, signal })));
    let output = '', errors = '', spawnError;
    child.on('error', error => { spawnError = error; });
    child.stdout.setEncoding('utf8'); child.stdout.on('data', value => { output += value; });
    child.stderr.setEncoding('utf8'); child.stderr.on('data', value => { errors += value; });
    const item = { mode, candidate, passed: false };
    report.cases.push(item);
    try {
      const url = await waitFor(() => {
        if (spawnError) throw spawnError;
        if (child.exitCode !== null) throw Error('source_startup_exited');
        return output.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
      });
      const login = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
      assert.equal(login.status, 303);
      const cookie = login.headers.get('set-cookie').split(';')[0];
      const page = await fetch(new URL('/', url), { headers: { cookie }, signal: AbortSignal.timeout(10000) });
      assert.equal(page.status, 200); assert.match(await page.text(), /<html/);
      const rpcId = randomUUID();
      const session = await fetch(new URL('/api/session/list', url), { method: 'POST', headers: { cookie, 'content-type': 'application/json' },
        signal: AbortSignal.timeout(10000), body: JSON.stringify({ type: 'client-request', rpcId, method: 'session/list', payload: { args: { _request: {} } } }) });
      assert.equal(session.status, 200);
      const result = await session.json();
      assert.equal(result.rpcId, rpcId); assert.equal(result.result.ok, true); assert.deepEqual(result.result.value.items, []);
      if (candidate) {
        const settings = await fetch(new URL('/api/dsh-mobile', url), { headers: { cookie }, signal: AbortSignal.timeout(10000) });
        assert.equal(settings.status, 200);
        assert.equal((await settings.json()).configured, false);
        assert.ok(!errors.includes('disabling profile plugin row "dsh-mobile"'));
      }
      item.passed = true;
    } finally {
      // pnpm拥有CLI子进程；只结束本次spawn且尚存活的进程树，不能仅杀掉包管理器留下服务器。
      if (child.exitCode === null && child.signalCode === null) {
        if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        else child.kill();
      }
      item.stopped = await stopped;
      item.stderr = errors.replace(/https?:\/\/\S+/g, '[URL]');
      // 专用空home没有模型历史；失败时保留启动stdout，登录URL仍脱敏，避免遗漏pnpm错误。
      if (!item.passed) item.stdout = output.replace(/https?:\/\/\S+/g, '[URL]');
    }
  }
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = error.message; throw error;
} finally {
  await writeFile(resolve(runtime, installed ? 'latest-source-startup-installed.json' : 'latest-source-startup.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.map(({ mode, candidate, passed }) => ({ mode, candidate, passed })) }));
