// 在独立小型 SEA 中复现同一 Koffi 加载；不改 SDK、沙箱、测试 home 或鉴权。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { seaNativeDlopenPrelude } from '../compatibility/latest-upstream/sdk-native-path.mjs';

assert.ok(process.argv.length === 2 || process.argv.length === 3 && ['--esm', '--q-caller', '--candidate'].includes(process.argv[2]));
const candidate = process.argv[2] === '--candidate';
const qCaller = process.argv[2] === '--q-caller' || candidate;
const esm = process.argv[2] === '--esm' || qCaller;
assert.equal(process.platform, 'win32');
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const source = resolve(import.meta.dirname, '../artifacts/latest-source-check');
const diagnostic = resolve(runtime, 'sdk-native-drive-diagnostic' + (candidate ? '-candidate' : qCaller ? '-q-caller' : esm ? '-esm' : ''));
await mkdir(diagnostic); // 排他目录；不得覆盖已有失败或复用原模型请求。
const staged = resolve(source, 'python/sdk-runtime/src/deepseek_harness_runtime/runtime/node');
const pkg = resolve(source, 'node_modules/@yao-pkg/pkg');
assert.equal(JSON.parse(await readFile(resolve(pkg, 'package.json'))).version, '6.21.0');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { at: new Date().toISOString(), entryMode: qCaller ? 'esm-q-caller' : esm ? 'esm' : 'cjs',
  candidatePreludeSha256: candidate ? hash(Buffer.from(seaNativeDlopenPrelude)) : undefined,
  modelRequests: 0, productionModified: false, passed: false };
const capture = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: diagnostic, windowsHide: true,
    encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, ...options });
  return { status: result.status, signal: result.signal, stdout: result.stdout ?? '',
    stderr: result.stderr ?? '', error: result.error?.code };
};
try {
  const require = createRequire(import.meta.url);
  const koffi = require(resolve(staged, 'node_modules/koffi'));
  const nativePid = koffi.load('kernel32.dll').func('GetCurrentProcessId', 'uint32_t', [])();
  assert.equal(nativePid, process.pid);
  report.physical = { version: koffi.version, nativePid, processPid: process.pid, passed: true };

  const vfsSource = await readFile(resolve(pkg, 'prelude/sea-vfs-setup.js'), 'utf8');
  const helpers = vfsSource.slice(vfsSource.indexOf('var SNAPSHOT_PREFIXES_POSIX'), vfsSource.indexOf('\nmodule.exports ='));
  assert.ok(helpers.includes('function insideSnapshot(f)'));
  const detector = vm.runInNewContext(helpers + '\ninsideSnapshot', { process: { platform: 'win32' } });
  const classic = require(resolve(pkg, 'lib-es5/common.js')).insideSnapshot;
  const virtual = 'Q:\\snapshot\\fixture\\node_modules\\@koromix\\koffi-win32-x64\\win32_x64\\koffi.node';
  report.detector = { sourceSha256: hash(Buffer.from(vfsSource)), virtual,
    originalSea: detector(virtual), originalClassic: classic(virtual),
    cDriveSea: detector(virtual.replace(/^Q:/, 'C:')) };
  assert.equal(report.detector.originalSea, false);
  assert.equal(report.detector.originalClassic, true);
  assert.equal(report.detector.cDriveSea, true);

  const fixture = resolve(diagnostic, 'fixture');
  await mkdir(resolve(fixture, 'node_modules/@koromix'), { recursive: true });
  for (const name of ['koffi', '@koromix/koffi-win32-x64']) {
    const input = await realpath(resolve(staged, 'node_modules', name));
    assert.equal(input, resolve(staged, 'node_modules', name));
    await cp(input, resolve(fixture, 'node_modules', name), { recursive: true, errorOnExist: true });
  }
  await writeFile(resolve(fixture, 'package.json'), JSON.stringify({ name: 'dshm-sdk-native-diagnostic',
    version: '0.0.0', bin: esm ? 'index.mjs' : 'index.cjs', dependencies: { koffi: '3.1.1' },
    pkg: { assets: ['node_modules/koffi/**/*', 'node_modules/@koromix/koffi-win32-x64/**/*'] } }), { flag: 'wx' });
  // 单变量对照只在诊断入口规范化盘符，然后交回原打包器提取逻辑；不替换 native 库。
  await writeFile(resolve(fixture, esm ? 'index.mjs' : 'index.cjs'), `${esm ? "import assert from 'node:assert/strict';" : "const assert=require('node:assert/strict');"}
const observedDlopen=process.dlopen;
process.dlopen=function(module,file,...rest) {
  console.error('[DSHM_NATIVE_PROBE] '+JSON.stringify({file}));
  return observedDlopen.call(process,module,file,...rest);
};
if(process.argv.includes('--normalize-drive')) {
  ${candidate ? seaNativeDlopenPrelude : `const original=process.dlopen;
  process.dlopen=function(module,file,...rest) {
    const normal=file.replace(/^(\\\\\\\\\\?\\\\)?[A-Za-z]:(?=[\\\\/]snapshot[\\\\/])/,'C:');
    return original.call(process,module,normal,...rest);
  };`}
}
${qCaller ? "const {createRequire}=await import('node:module'); const caller=new URL(import.meta.url); caller.pathname=caller.pathname.replace(/^\\/[A-Za-z]:/, '/Q:'); const requireQ=createRequire(caller); console.error('[DSHM_NATIVE_CALLER] '+caller.href);" : ''}
const koffi=${qCaller ? "requireQ('koffi')" : esm ? "(await import('koffi')).default" : "require('koffi')"};
const nativePid=koffi.load('kernel32.dll').func('GetCurrentProcessId','uint32_t',[])();
assert.equal(nativePid,process.pid);
console.log(JSON.stringify({version:koffi.version,nativePid,processPid:process.pid,passed:true}));
`, { flag: 'wx' });
  const executable = resolve(diagnostic, 'native-drive.exe');
  const temporary = resolve(runtime, 'sdk-sea-temporary');
  const env = { ...process.env, TEMP: temporary, TMP: temporary,
    PKG_CACHE_PATH: resolve(temporary, 'pkg-cache'), PKG_NATIVE_CACHE_PATH: resolve(diagnostic, 'native-cache') };
  console.log(JSON.stringify({ stage: 'minimal-official-sea-build', modelRequests: 0 }));
  report.build = capture(process.execPath, [resolve(pkg, 'lib-es5/bin.js'), fixture,
    '--sea', '--targets=node24-win-x64', '--output', executable], { env });
  await writeFile(resolve(diagnostic, 'build.log'), report.build.stdout + report.build.stderr, { flag: 'wx' });
  assert.equal(report.build.status, 0);
  report.executableSha256 = hash(await readFile(executable));
  report.baseline = capture(executable, [], { env });
  assert.notEqual(report.baseline.status, 0);
  assert.match(report.baseline.stderr, /Q:\\snapshot.*koffi\.node/s);
  report.normalized = capture(executable, ['--normalize-drive'], { env });
  assert.equal(report.normalized.status, 0);
  assert.equal(JSON.parse(report.normalized.stdout.trim()).passed, true);
  const nativePath = 'node_modules/@koromix/koffi-win32-x64/win32_x64/koffi.node';
  const nativeSha256 = hash(await readFile(resolve(fixture, nativePath)));
  assert.equal(nativeSha256, hash(await readFile(resolve(staged, nativePath))));
  const extracted = resolve(diagnostic, 'native-cache/pkg', nativeSha256, '@koromix/koffi-win32-x64/win32_x64/koffi.node');
  assert.equal(hash(await readFile(extracted)), nativeSha256);
  report.native = { sha256: nativeSha256, originalAndExtractedBytesIdentical: true };
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, code: error.code, message: error.message };
  process.exitCode = 1;
} finally {
  await writeFile(resolve(diagnostic, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, physical: report.physical, detector: report.detector,
    buildExitCode: report.build?.status, baselineExitCode: report.baseline?.status,
    normalizedExitCode: report.normalized?.status, failure: report.failure }));
}
