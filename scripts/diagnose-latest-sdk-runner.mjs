// 用已生成的原 SDK 验证 runner 分派；故意不给工作区或命令，原参数校验须先拒绝。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

assert.equal(process.argv.length, 2);
assert.equal(process.platform, 'win32');
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const directory = resolve(runtime, 'sdk-runner-dispatch-diagnostic-attempt-8');
await mkdir(directory);
const build = JSON.parse(await readFile(resolve(runtime, 'latest-sdk-sea-build-attempt-8.json')));
assert.equal(build.passed, true);
assert.equal(build.product.sha256, '1ba71341f0ae3c9ceed8c8b9da7c739fd361ec7fcaa8ef3ee31269fab7e6a57c');
assert.equal(createHash('sha256').update(await readFile(build.product.path)).digest('hex'), build.product.sha256);
const inspection = JSON.parse(await readFile(resolve(runtime, 'latest-sdk-sea-encoding-inspection-attempt-8.json')));
const text = inspection.toolResults[0].content.find(row => row.type === 'text').text;
const match = text.match(/invalid profile name ("(?:[^"\\]|\\.)*")/);
assert.ok(match);
const acl = JSON.parse(match[1]);
assert.match(acl, /^Q:\\snapshot\\.*\\@deepseek-ai\\dsh-sandbox-windows-acl\\lib\\runner\.js$/);
const packageRunner = acl.replace(/dsh-sandbox-windows-acl\\lib\\runner\.js$/, 'dsh-plugin-manager\\lib\\types\\run-tree.js');
const environment = { DSH_HOME: directory, DSH_TELEMETRY_DISABLED: '1',
  PKG_NATIVE_CACHE_PATH: resolve(runtime, 'sdk-sea-temporary/native-cache') };
for (const name of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA',
  'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[name] !== undefined) environment[name] = process.env[name];
const report = { at: new Date().toISOString(), productSha256: build.product.sha256,
  actualSdkExecutable: true, modelRequests: 0, sandboxCommandProvided: false, passed: false, cases: [] };
try {
  for (const [runner, selector, expected] of [
    ['acl', acl, /windows-acl-run: missing --workspace/],
    ['package', packageRunner, /invalid package range invocation/],
  ]) {
    for (const drive of ['Q', 'C']) {
      const result = spawnSync(build.product.path, [selector.replace(/^Q:/, drive + ':')], {
        cwd: directory, env: environment, windowsHide: true, encoding: 'utf8', timeout: 30000,
        maxBuffer: 1024 * 1024 });
      const row = { runner, drive, exitCode: result.status, signal: result.signal,
        error: result.error?.code, stdout: result.stdout, stderr: result.stderr };
      report.cases.push(row);
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, drive === 'Q' ? /invalid profile name/ : expected);
      if (runner === 'acl' && drive === 'C') assert.equal(result.status, 127);
      if (drive === 'C') assert.doesNotMatch(result.stderr, /invalid profile name/);
    }
  }
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, code: error.code, message: error.message };
  process.exitCode = 1;
} finally {
  await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.map(({ runner, drive, exitCode }) =>
    ({ runner, drive, exitCode })), failure: report.failure }));
}
