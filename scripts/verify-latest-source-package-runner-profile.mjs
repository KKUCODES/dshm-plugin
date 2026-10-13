// 对照源码运行器在真实profile工作目录中的解析；只执行自有输出测试，不安装插件。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { access, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';

assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--fixed'));
const fixed = process.argv.includes('--fixed');
assert.equal(process.platform, 'win32');
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const reportPath = resolve(runtime, 'latest-source-runner-profile-resolution' + (fixed ? '-fixed' : '') + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const state = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json')));
assert.equal(state.executionMode, 'source');
const profile = resolve(state.home, 'profiles/web');
assert.equal(await realpath(profile), profile);
process.kill(state.hostPid, 0);
const source = await verifyInstalledSource();
const { packageInvocation, packageRunnerEnvironment } = await import(pathToFileURL(resolve(sourceRoot,
  'packages/boot/plugin-manager/src/run-tree.ts')).href);
const requireSource = createRequire(resolve(sourceRoot, 'package.json'));
const expected = 'DSHM_SOURCE_PROFILE_RUNNER_OK';
const [command, originalArgs] = packageInvocation(process.execPath, ['-e', `process.stdout.write(${JSON.stringify(expected)})`]);
assert.equal(command, process.execPath);
const tsxManifest = requireSource.resolve('tsx/package.json');
const tsxMetadata = JSON.parse(await readFile(tsxManifest));
const importEntry = tsxMetadata.exports['./esm/api'].import.default;
assert.equal(typeof importEntry, 'string');
const api = fixed ? resolve(dirname(tsxManifest), importEntry) : requireSource.resolve('tsx/esm/api');
const loader = 'data:text/javascript,' + encodeURIComponent(`import { register } from ${JSON.stringify(pathToFileURL(api).href)};register({tsconfig:${JSON.stringify(resolve(sourceRoot, 'tsconfig.json'))}});`);
const configuredArgs = [...originalArgs];
assert.equal(configuredArgs[0], '--import');
configuredArgs[1] = loader;
if (fixed) assert.deepEqual(originalArgs, configuredArgs, 'actual source invocation must provide the explicit root config');
const legacyArgs = [...originalArgs];
if (fixed) legacyArgs[1] = pathToFileURL(requireSource.resolve('tsx/esm')).href;
const env = { DSH_TELEMETRY_DISABLED: '1' };
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA',
  'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
const report = { at: new Date().toISOString(), sourceCommit: source.sourceCommit, files: source.files,
  profile, passed: false, productionModified: fixed, actualInvocation: fixed,
  runnerSourceHash: createHash('sha256').update(await readFile(resolve(import.meta.dirname,
    '../compatibility/latest-upstream/package-runner-source.ts'))).digest('hex') };
async function run(args) {
  const child = spawn(command, args, { cwd: profile, env: packageRunnerEnvironment(env), windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  const exitCode = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
  return { pid: child.pid, exitCode, stdout, stderr };
}
try {
  report.original = await run(legacyArgs);
  report.legacyMissingDependencyReproduced = report.original.exitCode === 127;
  if (!fixed || report.legacyMissingDependencyReproduced) {
    assert.equal(report.original.exitCode, 127);
    assert.match(report.original.stderr, /Cannot find package '@deepseek-ai\/dsh-win32-process'/);
  } else {
    // 完整构建可能恢复workspace依赖链接；该对照不替代正式启动参数的核验。
    assert.equal(report.original.exitCode, 0);
    assert.equal(report.original.stdout, expected); assert.equal(report.original.stderr, '');
  }
  report.configured = await run(configuredArgs);
  assert.equal(report.configured.exitCode, 0);
  assert.equal(report.configured.stdout, expected);
  assert.equal(report.configured.stderr, '');
  report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally { await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' }); }
console.log(JSON.stringify(report));
process.exit(process.exitCode ?? 0);
