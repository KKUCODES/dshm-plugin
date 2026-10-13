// 只在已完整构建的固定源码候选上运行官方Windows SDK打包；不改日常安装。
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';

const flags = process.argv.slice(2);
assert.ok(flags.length <= 2 && new Set(flags).size === flags.length);
assert.ok(flags.every(flag => /^--attempt-(?:[2-9]|10|11)$/.test(flag) || flag === '--write-probe'));
assert.ok(flags.filter(flag => /^--attempt-/.test(flag)).length <= 1);
assert.equal(process.platform, 'win32');
const suffix = flags.find(flag => /^--attempt-/.test(flag))?.replace('--', '-') ?? '';
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const reportPath = resolve(runtime, 'latest-sdk-sea-build' + suffix + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const productRecord = resolve(runtime, 'latest-sdk-sea-product.json');
await assert.rejects(access(productRecord), { code: 'ENOENT' });
const lease = JSON.parse(await readFile(resolve(runtime, 'latest-live-source-lease.json'), 'utf8'));
assert.equal(lease.state, 'ready'); assert.equal(lease.sourceRoot, sourceRoot);
const installed = await verifyInstalledSource(); assert.equal(installed.files, 38);
assert.equal(installed.sourceCommit, lease.sourceCommit);
const manifestBytes = await readFile(resolve(outputRoot, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
const sdkBootstrapSha256 = manifest.files.find(file => file.path === 'python/sdk-runtime/runtime-bootstrap.mjs')?.after;
if (['-attempt-8', '-attempt-9', '-attempt-10', '-attempt-11'].includes(suffix)) {
  assert.equal(lease.scope, 'sdk' + suffix);
  assert.equal(sdkBootstrapSha256, suffix === '-attempt-8'
    ? '38edf143c0190e8051a4d1b9d63d9908c577c6776100153d6c780f8ebbf2fdc1'
    : suffix === '-attempt-9' ? '61241cde85c14d3abd279867ff70a2babf12f3bf8d70f125883159c7fa714ae3'
    : 'd8b2790415e8031e3476e069cf0770461e97ef0674a9ab102fa0468118ce39a2');
  // 每个载体核对当时的完整清单；后续修正不能改变旧成功/失败的事实。
  await writeFile(resolve(runtime, `latest-source-manifest-sdk${suffix}.json`), manifestBytes, { flag: 'wx' });
}
if (suffix === '-attempt-11') assert.equal(manifest.files.find(file => file.patch === 'file-version-watch')?.after,
  'eb65639ce4681d1641f2dc2c6a4a4734a7fecc384ab2a85db41bdf07bde751fc');
const root = await realpath(sourceRoot);
const pythonParent = resolve(root, 'python/sdk-runtime/src/deepseek_harness_runtime');
assert.equal(await realpath(pythonParent), pythonParent);
// 官方打包器会清理这两个生成目录；先核对实际父目录和所有目标都归属隔离检出。
for (const target of ['python/sdk-runtime/src/deepseek_harness_runtime/runtime/node', 'dist-exe']) {
  const path = resolve(root, target), rel = relative(root, path);
  assert.ok(rel && rel !== '..' && !rel.startsWith('..\\') && !isAbsolute(rel));
  await assert.rejects(access(path), { code: 'ENOENT' });
}
const temporary = resolve(runtime, 'sdk-sea-temporary');
await mkdir(temporary, { recursive: true }); assert.equal(await realpath(temporary), temporary);
const env = { DSH_TELEMETRY_DISABLED: '1', TEMP: temporary, TMP: temporary,
  PKG_CACHE_PATH: resolve(temporary, 'pkg-cache'), PKG_NATIVE_CACHE_PATH: resolve(temporary, 'native-cache'),
  npm_execpath: resolve(root, 'node_modules/pnpm/bin/pnpm.cjs') };
if (flags.includes('--write-probe')) {
  // 只观察本轮exe的原writeFile，不改变写入/错误；产物外的诊断目录保留原始errno。
  const diagnostic = resolve(runtime, 'sdk-write-diagnostic' + suffix);
  await assert.rejects(access(diagnostic), { code: 'ENOENT' }); await mkdir(diagnostic);
  const preload = resolve(diagnostic, 'write-probe.cjs'), evidence = resolve(diagnostic, 'write-result.json');
  const target = resolve(root, 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe');
  await writeFile(preload, `const fs=require('node:fs'),path=require('node:path');
const target=${JSON.stringify(target)},evidence=${JSON.stringify(evidence)};
const original=fs.promises.writeFile.bind(fs.promises);
fs.promises.writeFile=async function(file,data,options){
  if(typeof file!=='string'||path.resolve(file)!==target)return original(file,data,options);
  const record={at:new Date().toISOString(),pid:process.pid,bufferBytes:data.byteLength,passed:false};
  try{const disk=fs.statfsSync(path.parse(target).root);record.freeBytesBefore=disk.bavail*disk.bsize;}
  catch(error){record.diskObservationError=error.code;}
  try{const value=await original(file,data,options);record.passed=true;return value;}
  catch(error){record.error={code:error.code,syscall:error.syscall};console.error('[DSHM_SDK_WRITE_PROBE]',JSON.stringify(record));throw error;}
  finally{try{fs.writeFileSync(evidence,JSON.stringify(record,null,2),{flag:'wx'});}
  catch(error){console.error('[DSHM_SDK_WRITE_PROBE] record_write_failed',error.code);}}
};
`, { flag: 'wx' });
  env.NODE_OPTIONS = '--require=' + JSON.stringify(preload);
}
assert.equal(JSON.parse(await readFile(resolve(root, 'node_modules/pnpm/package.json'))).version, '11.7.0');
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA',
  'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
const report = { at: new Date().toISOString(), sourceRoot: root, sourceCommit: installed.sourceCommit,
  files: installed.files, sourceManifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
  sdkBootstrapSha256, passed: false, runtimeVerified: false };
const started = Date.now(); let output = '';
try {
  const child = spawn(process.execPath, [resolve(root, 'node_modules/pnpm/bin/pnpm.cjs'), 'exec', 'tsx',
    'scripts/build-exe-for-python-sdk.ts', '--skip-build', '--targets=node24-win-x64'],
  { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  report.pid = child.pid;
  child.stdout.on('data', bytes => { output += bytes; }); child.stderr.on('data', bytes => { output += bytes; });
  console.log(JSON.stringify({ stage: 'official-sdk-sea-build', pid: child.pid, running: true }));
  report.exitCode = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
  assert.equal(report.exitCode, 0, 'official_sdk_sea_build_failed');
  const product = resolve(root, 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe');
  assert.equal(await realpath(product), product);
  const bytes = await readFile(product);
  report.product = { path: product, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally {
  report.elapsedMs = Date.now() - started;
  await writeFile(resolve(runtime, 'latest-sdk-sea-build' + suffix + '.log'), output.replace(/https?:\/\/\S+/g, '[URL]'), { flag: 'wx' });
  await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  if (report.passed && suffix === '-attempt-11') {
    // 原源码恢复会重建共享 workspace 文件；在暴露新载体前拆开 deploy 的硬链接。
    try {
      execFileSync(process.execPath, [resolve(import.meta.dirname, 'freeze-latest-sdk-node-carrier.mjs'), '--attempt-11'],
        { cwd: resolve(import.meta.dirname, '..'), windowsHide: true, stdio: 'pipe' });
      const frozen = JSON.parse(await readFile(resolve(runtime, 'latest-sdk-node-freeze-attempt-11.json')));
      assert.equal(frozen.passed, true);
      report.nodeCarrierFrozen = { passed: true, files: frozen.files.length, detached: frozen.detached };
    } catch (error) {
      report.passed = false; report.failure = { name: error.name, message: 'sdk_node_carrier_freeze_failed' };
      process.exitCode = 1;
    }
    await writeFile(reportPath, JSON.stringify(report, null, 2));
  }
  // 只有完整官方命令成功且报告落盘后才提供载体入口；失败轮次不能成为默认SDK。
  if (report.passed) await writeFile(productRecord, JSON.stringify({ buildReport: reportPath,
    sourceCommit: report.sourceCommit, productSha256: report.product.sha256 }, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify({ passed: report.passed, runtimeVerified: false, exitCode: report.exitCode,
  elapsedMs: report.elapsedMs, product: report.product, failure: report.failure }));
process.exit(process.exitCode ?? 0);
