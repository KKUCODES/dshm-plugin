import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 复用原官方安装的正常 CLI，仅为测试指定独立用户目录；不注入模块或替换服务。
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && ['--endpoints', '--endpoint-policy', '--endpoint-interruption', '--endpoint-race', '--endpoint-process'].includes(process.argv[2])));
const endpoints = process.argv[2] === '--endpoints';
const policy = process.argv[2] === '--endpoint-policy';
const interruption = process.argv[2] === '--endpoint-interruption';
const race = process.argv[2] === '--endpoint-race';
const processRecovery = process.argv[2] === '--endpoint-process';
const installation = resolve(import.meta.dirname, '../artifacts/official-dsh-alpha2');
const root = resolve(import.meta.dirname, '../artifacts', processRecovery ? 'official-dsh-alpha2-endpoint-process' : race ? 'official-dsh-alpha2-endpoint-race' : interruption ? 'official-dsh-alpha2-endpoint-interruption' : policy ? 'official-dsh-alpha2-endpoint-policy' : endpoints ? 'official-dsh-alpha2-endpoint' : 'official-dsh-alpha2-key');
const home = resolve(root, 'home'), port = processRecovery ? 16965 : race ? 16964 : interruption ? 16963 : policy ? 16962 : endpoints ? 16961 : 16960;
const manifest = JSON.parse(readFileSync(resolve(installation, 'node_modules/@deepseek-ai/dsh/package.json'), 'utf8'));
assert.equal(manifest.version, '0.2.1-alpha.2');
const pnpmCli = process.env.DSHM_PNPM_CLI;
assert.ok(pnpmCli);
const env = { ...process.env, DSH_HOME: home };
delete env.DEEPSEEK_API_KEY;
delete env.DSH_MOBILE_ENROLLMENT_TOKEN;
assert.ok(!env.NODE_OPTIONS, 'Do not inject code into the official host');
const run = randomUUID(), log = resolve(root, `web-${run}.private.log`);
const receipt = resolve(root, 'official-web-receipt.json');
writeFileSync(log, '', { flag: 'wx', mode: 0o600 });
const child = spawn(process.execPath, [pnpmCli, 'dsh', 'web', '--no-open', '--host', '127.0.0.1', '--port', String(port)],
  { cwd: installation, env, windowsHide: true });
const state = { run, pid: child.pid, port, version: manifest.version, entry: 'pnpm dsh web',
  installation, home, privateLog: log, scope: processRecovery ? 'isolated-service-address-process' : race ? 'isolated-service-address-race' : interruption ? 'isolated-service-address-interruption' : policy ? 'isolated-service-address-policy' : endpoints ? 'isolated-service-address' : 'isolated-synthetic-provider-key', stage: 'starting' };
const save = () => writeFileSync(receipt, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
save();
let output = '', probed = false;
child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
const receive = (text, stdout) => {
  appendFileSync(log, text);
  if (!stdout) return;
  output = (output + text).slice(-16384);
  const url = output.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
  if (!url || probed) return;
  assert.equal(new URL(url).origin, `http://127.0.0.1:${port}`); probed = true;
  void (async () => {
    const login = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.equal(login.status, 303); assert.ok(cookie);
    const response = await fetch(`http://127.0.0.1:${port}/api/dsh-mobile`, { headers: { cookie }, signal: AbortSignal.timeout(10000) });
    state.pluginStatus = response.status; state.loginStatus = login.status;
    state.stage = response.ok ? 'plugin-ready' : 'plugin-unavailable'; save();
    console.log(JSON.stringify(state));
  })().catch(error => { state.stage = 'probe-failed'; state.failure = error.name; save(); console.log(JSON.stringify(state)); });
};
child.stdout.on('data', text => receive(text, true));
child.stderr.on('data', text => receive(text, false));
child.on('error', error => { state.stage = 'launch-failed'; state.failure = error.code; save(); console.log(JSON.stringify(state)); });
child.on('exit', (code, signal) => { state.stage = 'exited'; state.exitCode = code; state.signal = signal; save(); process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill()); process.on('SIGTERM', () => child.kill());
