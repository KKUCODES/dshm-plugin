import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');

test('真实新版 Host 加载隔离候选插件，原鉴权管理入口可读取', { timeout: 60000 }, async () => {
  const candidate = resolve(runtime, 'candidate');
  const manifest = JSON.parse(await readFile(resolve(candidate, 'package.json'), 'utf8'));
  assert.equal(manifest.version, '0.1.76-latest.0');
  const home = resolve(runtime, 'candidate-home');
  await mkdir(home, { recursive: true });
  const overlay = resolve(runtime, 'candidate-plugin.patch.json');
  await writeFile(overlay, JSON.stringify([{ insert: [{ id: 'dsh-mobile', name: pathToFileURL(resolve(candidate, 'dist/index.js')).href }] }]) + '\n');
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
    if (process.env[key] !== undefined) env[key] = process.env[key];
  env.DSH_HOME = home; env.DSH_TELEMETRY_DISABLED = '1';
  const child = spawn(process.execPath, [resolve(runtime, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    'web', '--patch', overlay, '--host', '127.0.0.1', '--port', '0', '--no-open'],
  { cwd: runtime, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
  const stopped = new Promise((res, rej) => { child.once('close', (code, signal) => res({ code, signal })); child.once('error', rej); });
  const report = { at: new Date().toISOString(), version: '0.2.1-alpha.1', candidate: manifest.version, pid: child.pid };
  try {
    let loginURL;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      loginURL = stdout.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
      if (loginURL) break;
      if (child.exitCode !== null) throw Error('Candidate Host exited before ready');
      await new Promise(res => setTimeout(res, 100));
    }
    assert.ok(loginURL, 'Candidate Host did not become ready');
    const login = await fetch(loginURL, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    assert.equal(login.status, 303);
    const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
    const url = new URL('/api/dsh-mobile', loginURL);
    const anonymous = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    assert.equal(anonymous.status, 401);
    const response = await fetch(url, { headers: { cookie }, signal: AbortSignal.timeout(10000) });
    const status = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(status, { configured: false, connection: 'disabled', devices: [] });
    assert.equal(stderr.includes('disabling profile plugin row "dsh-mobile"'), false);
    report.loaded = true; report.authenticatedStatusRead = true; report.anonymousDenied = true;
    report.passed = true;
  } catch (error) { report.passed = false; report.error = error.message; throw error; }
  finally {
    if (child.exitCode === null) child.kill();
    report.stopped = await stopped;
    report.stderr = stderr.replace(/https?:\/\/\S+/g, '[URL]');
    await writeFile(resolve(runtime, 'candidate-host-test.json'), JSON.stringify(report, null, 2) + '\n');
  }
});
