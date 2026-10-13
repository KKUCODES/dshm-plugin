import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');

test('真实新版 Host：Remote 固定设置读写、冲突拒绝及恢复继承', { timeout: 60000 }, async () => {
  const version = JSON.parse(await readFile(resolve(runtime, 'node_modules/@deepseek-ai/dsh/package.json'), 'utf8')).version;
  assert.equal(version, '0.2.1-alpha.1');
  const home = resolve(runtime, 'settings-home');
  await mkdir(home, { recursive: true });
  const probe = resolve(runtime, 'profile-settings-probe.mjs');
  await build({ entryPoints: [resolve(root, 'tests/fixtures/latest-settings-probe.ts')], outfile: probe,
    bundle: true, format: 'esm', platform: 'node', external: ['@deepseek-ai/*'], logLevel: 'silent' });
  const overlay = resolve(runtime, 'profile-settings-probe.patch.json');
  await writeFile(overlay, JSON.stringify([{ insert: [{ id: 'latest-settings-probe', name: pathToFileURL(probe).href }] }]) + '\n');
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
    if (process.env[key] !== undefined) env[key] = process.env[key];
  env.DSH_HOME = home;
  env.DSH_TELEMETRY_DISABLED = '1';
  const child = spawn(process.execPath, [resolve(runtime, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    'web', '--patch', overlay, '--host', '127.0.0.1', '--port', '0', '--no-open'],
  { cwd: runtime, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
  const stopped = new Promise((res, rej) => { child.once('close', (code, signal) => res({ code, signal })); child.once('error', rej); });
  const report = { at: new Date().toISOString(), version, pid: child.pid, checks: [] };
  try {
    let loginURL;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      loginURL = stdout.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
      if (loginURL) break;
      if (child.exitCode !== null) throw Error('Test Host exited before ready');
      await new Promise(res => setTimeout(res, 100));
    }
    assert.ok(loginURL, 'Test Host did not become ready');
    const login = await fetch(loginURL, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    assert.equal(login.status, 303);
    const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
    const url = new URL('/api/latest-settings-probe', loginURL);
    const call = async body => {
      const response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { cookie, 'content-type': 'application/json', origin: url.origin }, body: JSON.stringify(body) });
      return { status: response.status, value: await response.json() };
    };
    const initial = await call({ kind: 'read' }); assert.equal(initial.status, 200);
    const field = initial.value.fields.find(row => row.key === 'maxTokens'); assert.ok(field);
    assert.equal(initial.value.fields.length, 5);
    assert.equal(Object.hasOwn(initial.value, 'schema'), false);
    report.checks.push('original-host-read');
    const edit = (view, value) => ({ kind: 'write', operation: { method: 'remote.settingsWrite',
      snapshot: view.snapshot, expectedRevision: view.revision, edits: [{ op: 'set', key: 'maxTokens', value }] } });
    const current = await call({ kind: 'read' });
    const stale = await call(edit(initial.value, 4000));
    assert.deepEqual(stale, { status: 409, value: { error: 'remote_settings_stale' } });
    report.checks.push('superseded-snapshot-refused');
    const updated = await call(edit(current.value, 4000)); assert.equal(updated.status, 200);
    assert.deepEqual(updated.value.fields.find(row => row.key === 'maxTokens'), { key: 'maxTokens', value: 4000, overridden: true });
    assert.ok(updated.value.revision > current.value.revision);
    report.checks.push('original-config-editor-write');
    const reset = await call({ kind: 'write', operation: { method: 'remote.settingsWrite',
      snapshot: updated.value.snapshot, expectedRevision: updated.value.revision, edits: [{ op: 'unset', key: 'maxTokens' }] } });
    assert.equal(reset.status, 200);
    assert.deepEqual(reset.value.fields.find(row => row.key === 'maxTokens'), { key: 'maxTokens', value: field.value, overridden: false });
    report.checks.push('original-inherited-value-restored');
    const patch = await readFile(resolve(home, 'profiles/web/cordis.patch.yml'), 'utf8');
    assert.equal(patch.includes('maxTokens'), false);
    report.checks.push('override-removed-from-profile');
    report.passed = true;
  } catch (error) { report.passed = false; report.error = error.message; throw error; }
  finally {
    if (child.exitCode === null) child.kill();
    report.stopped = await stopped;
    report.stderr = stderr.replace(/https?:\/\/\S+/g, '[URL]');
    await writeFile(resolve(runtime, 'profile-settings-test.json'), JSON.stringify(report, null, 2) + '\n');
  }
});
