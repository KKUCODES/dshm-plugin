import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';
import { validateGithubPackage } from './github-package.mjs';

const root = resolve(import.meta.dirname, '..');
const base = resolve(root, 'artifacts/github-install');
await mkdir(base, { recursive: true });
const output = await mkdtemp(join(base, 'run-'));
const cliRoot = resolve(process.env.DSHM_OFFICIAL_DSH_ROOT ?? join(root, 'artifacts/official-dsh-alpha2'));
const cli = join(cliRoot, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const official = JSON.parse(await readFile(join(cliRoot, 'node_modules/@deepseek-ai/dsh/package.json'), 'utf8'));
assert.equal(official.version, '0.2.1-alpha.2');
const expected = await validateGithubPackage(root);
const home = join(output, 'home');
// Git 归档会先完整解压；Windows 使用较短的自有缓存路径，避免叠加仓库长文件名。
const env = { ...process.env, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1',
  npm_config_store_dir: join(root, 'artifacts/p'), npm_config_cache: join(root, 'artifacts/npm-cache') };
for (const name of Object.keys(env)) {
  if (/^(?:DSH_TELEMETRY_OTLP_URL|DSH_MOBILE_|DEEPSEEK_API_KEY|OPENAI_API_KEY|GH_TOKEN|GITHUB_TOKEN)/.test(name)) delete env[name];
}
const report = { officialDsh: official.version, pluginVersion: expected.pluginVersion, installedFiles: expected.files, home,
  passed: false, startedAt: new Date().toISOString(), stages: [] };
let host;
async function run(binary, args, cwd = output, timeout = 180000) {
  const child = spawn(binary, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', value => { stdout += value; });
  child.stderr.on('data', value => { stderr += value; });
  const timer = setTimeout(() => {
    if (child.exitCode !== null) return;
    if (process.platform === 'win32') {
      const stopper = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'],
        { cwd: output, env, windowsHide: true, stdio: 'ignore' });
      stopper.once('error', () => child.kill());
    } else child.kill('SIGTERM');
  }, timeout);
  try {
    const code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
    await writeFile(join(output, `command-${report.stages.length}.private.log`), stdout + stderr, { mode: 0o600 });
    assert.equal(code, 0, `Command failed (${binary}): ${(stdout + stderr).slice(-4000)}`);
    return stdout;
  } finally { clearTimeout(timer); }
}
async function stopHost() {
  if (!host || host.exitCode !== null) return;
  if (process.platform === 'win32') await run('taskkill.exe', ['/PID', String(host.pid), '/T', '/F']);
  else host.kill('SIGTERM');
  await hostDone;
  assert.throws(() => process.kill(host.pid, 0), { code: 'ESRCH' });
}
let hostDone;
try {
  let spec = process.argv[2];
  if (!spec) {
    const npmCli = process.env.npm_execpath;
    assert.ok(npmCli, 'Run local verification through npm run verify:github');
    const packed = JSON.parse(await run(process.execPath, [npmCli, 'pack', '--json', '--ignore-scripts', '--pack-destination', output], root));
    assert.equal(packed.length, 1);
    assert.ok(packed[0].files.every(file => /^(?:lib\/|package\.json$|README(?:\.en)?\.md$|cordis\.patch\.yml$)/.test(file.path)));
    const repository = join(output, 'standalone-repository');
    await mkdir(repository);
    await run('tar', ['-xzf', join(output, packed[0].filename), '-C', repository, '--strip-components=1']);
    await copyFile(join(root, '.gitattributes'), join(repository, '.gitattributes'));
    await run('git', ['init', '-b', 'main'], repository);
    await run('git', ['add', '--all'], repository);
    await run('git', ['-c', 'user.name=DSHM install validation', '-c', 'user.email=validation@localhost',
      'commit', '-m', 'Verify the standalone Git install payload'], repository);
    const commit = (await run('git', ['rev-parse', 'HEAD'], repository)).trim();
    spec = `git+${pathToFileURL(repository).href}#${commit}`;
    report.gitCommit = commit;
    report.stages.push('standalone-git-payload');
  } else assert.match(spec, /^github:KKUCODES\/dshm-plugin#[a-f0-9]{40}$/);
  report.installSpec = spec;
  console.log(JSON.stringify({ stage: 'official-git-install', output }));
  // 不加 ignore-scripts 或构建许可，验证用户粘贴市场命令的默认安装行为。
  await run(process.execPath, [cli, 'plugin', '--profile', 'web', 'add', spec]);
  report.stages.push('official-git-install');
  const installed = join(home, 'profiles/web/node_modules/@dsh-mobile/plugin');
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(manifest.version, expected.pluginVersion);
  assert.equal(manifest.main, './lib/index.js');
  const receipt = JSON.parse(await readFile(join(root, 'lib/build-info.json'), 'utf8'));
  for (const [path, expectedHash] of Object.entries(receipt.files)) {
    assert.equal(createHash('sha256').update(await readFile(join(installed, path))).digest('hex'), expectedHash, `Installed file differs: ${path}`);
  }
  const profile = JSON.parse(await readFile(join(home, 'profiles/web/package.json'), 'utf8'));
  assert.ok(profile.dsh.profile.bundles.includes('@dsh-mobile/plugin'));
  const require = createRequire(join(installed, 'package.json'));
  const managerPath = require.resolve('@deepseek-ai/dsh-api-gateway');
  assert.ok(managerPath);
  report.stages.push('installed-files-and-selection');

  const server = createServer();
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done));
  report.port = port;
  host = spawn(process.execPath, [cli, 'web', '--no-open', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: output, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  hostDone = new Promise((done, fail) => { host.once('close', done); host.once('error', fail); });
  let hostOutput = '';
  const loginUrl = await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Official web startup timed out')), 120000);
    const receive = value => {
      hostOutput = (hostOutput + value).slice(-32768);
      const url = hostOutput.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
      if (url) { clearTimeout(timer); done(url); }
    };
    host.stdout.setEncoding('utf8'); host.stderr.setEncoding('utf8');
    host.stdout.on('data', receive); host.stderr.on('data', receive);
    hostDone.then(code => { clearTimeout(timer); fail(Error(`Official web exited: ${code}; ${hostOutput.slice(-4000)}`)); }, fail);
  });
  await writeFile(join(output, 'web.private.log'), hostOutput, { mode: 0o600 });
  const login = await fetch(loginUrl, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  assert.equal(login.status, 303);
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  const response = await fetch(`http://127.0.0.1:${port}/api/dsh-mobile`,
    { headers: { cookie }, signal: AbortSignal.timeout(10000) });
  const status = await response.json();
  assert.equal(response.status, 200);
  assert.equal(status.configured, false);
  assert.ok(!status.error);
  report.pluginStatus = response.status;
  report.stages.push('official-web-plugin-loaded');
  if (process.env.DSHM_GITHUB_UI_PROBE === '1') {
    await writeFile(join(output, 'browser-entry.private.json'), JSON.stringify({ url: loginUrl, port, pid: host.pid }), { mode: 0o600 });
    console.log(JSON.stringify({ stage: 'browser-check-ready', output, port }));
    const deadline = Date.now() + 180000;
    let observed;
    while (Date.now() < deadline) {
      try { observed = JSON.parse(await readFile(join(output, 'browser-check.json'), 'utf8')); break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await wait(250);
    }
    assert.equal(observed?.passed, true, 'Actual plugin settings page was not verified');
    report.stages.push('actual-browser-settings-verified');
  }
  await stopHost();
  report.stages.push('owned-host-stopped');
  await run(process.execPath, [cli, 'plugin', '--profile', 'web', 'remove', '@dsh-mobile/plugin']);
  const removed = JSON.parse(await readFile(join(home, 'profiles/web/package.json'), 'utf8'));
  assert.ok(!removed.dependencies?.['@dsh-mobile/plugin']);
  assert.ok(!removed.dsh.profile.bundles.includes('@dsh-mobile/plugin'));
  report.stages.push('official-plugin-removed');
  report.passed = true;
} catch (error) {
  report.failure = error.message.replace(/\?token=[^\s]+/g, '?token=[redacted]');
  process.exitCode = 1;
} finally {
  await stopHost();
  report.completedAt = new Date().toISOString();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
