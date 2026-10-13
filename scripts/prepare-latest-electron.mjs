// 只在固定检出自己的依赖中运行官方Electron安装器；下载缓存/报告均归本项目。
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';

assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--cached-attempt-2');
assert.equal(process.platform, 'win32');
const attempt = process.argv[2] ? 2 : 1;
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const file = resolve(runtime, `latest-electron-runtime-attempt-${attempt}.json`);
await assert.rejects(access(file), {code:'ENOENT'});
if (attempt === 2) {
  const original = JSON.parse(await readFile(resolve(runtime, 'latest-electron-runtime-attempt-1.json')));
  assert.equal(original.passed, false); assert.equal(original.code, 1); assert.equal(original.version, '44.0.0');
  const prefetched = JSON.parse(await readFile(resolve(runtime, 'latest-electron-prefetch-attempt-1.json')));
  assert.equal(prefetched.passed, true); assert.equal(prefetched.defaultTlsValidation, true);
  assert.equal(prefetched.sourceCommit, sourceCommit);
  assert.equal(createHash('sha256').update(await readFile(prefetched.cache)).digest('hex'), prefetched.expectedSha256);
}
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {cwd:sourceRoot, encoding:'utf8', windowsHide:true}).trim(), sourceCommit);
const root = await realpath(sourceRoot);
const require = createRequire(resolve(root, 'apps/desktop/package.json'));
const metadataPath = await realpath(require.resolve('electron/package.json'));
const within = relative(root, metadataPath); assert.ok(within && !within.startsWith('..') && !isAbsolute(within));
const metadata = JSON.parse(await readFile(metadataPath)); assert.equal(metadata.name, 'electron'); assert.equal(metadata.version, '44.0.0');
const installer = resolve(dirname(metadataPath), 'install.js'); assert.equal(await realpath(installer), installer);
const cache = resolve(runtime, 'electron-download-cache'); await mkdir(cache, {recursive:true});
assert.equal(await realpath(cache), cache);
const env = {electron_config_cache:cache};
for (const name of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','COMSPEC','APPDATA','LOCALAPPDATA','USERPROFILE',
  'HOMEDRIVE','HOMEPATH','PROGRAMFILES','HTTPS_PROXY','HTTP_PROXY','NO_PROXY'])
  if (process.env[name] !== undefined) env[name] = process.env[name];
const report = {at:new Date().toISOString(), sourceCommit, version:metadata.version, installer, cache,
  officialInstaller:true, passed:false};
let output = '', timer;
try {
  const started = Date.now();
  const child = spawn(process.execPath, [installer], {cwd:root, env, windowsHide:true, stdio:['ignore','pipe','pipe']});
  report.pid = child.pid;
  child.stdout.on('data', bytes => {output += bytes;}); child.stderr.on('data', bytes => {output += bytes;});
  const exited = new Promise((done, fail) => {child.once('close', code => done(code)); child.once('error', fail);});
  timer = setTimeout(() => {
    report.timedOut = true;
    if (child.exitCode === null) execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {cwd:root, windowsHide:true, stdio:'ignore'});
  }, 900000);
  report.code = await exited; report.elapsedMs = Date.now() - started;
  assert.equal(report.timedOut, undefined); assert.equal(report.code, 0);
  const executable = require('electron'); assert.equal(await realpath(executable), executable);
  assert.ok(relative(root, executable) && !relative(root, executable).startsWith('..'));
  report.executable = executable;
  report.executableSha256 = createHash('sha256').update(await readFile(executable)).digest('hex');
  report.runtime = JSON.parse(execFileSync(executable, ['-p', 'JSON.stringify(process.versions)'], {
    cwd:root, env:{...env,ELECTRON_RUN_AS_NODE:'1'}, encoding:'utf8',windowsHide:true,timeout:10000}));
  assert.equal(report.runtime.electron, metadata.version);
  report.passed = true;
} catch (error) {report.failure = {name:error.name,code:error.code,message:error.message};process.exitCode=1;}
finally {
  clearTimeout(timer);
  output = output.replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g, '$1[redacted]@');
  await writeFile(resolve(runtime, `latest-electron-runtime-attempt-${attempt}.log`), output, {flag:'wx'});
  await writeFile(file, JSON.stringify(report,null,2), {flag:'wx'});
  console.log(JSON.stringify({passed:report.passed,version:report.version,pid:report.pid,code:report.code,elapsedMs:report.elapsedMs,failure:report.failure}));
}
