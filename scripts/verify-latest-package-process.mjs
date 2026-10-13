import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { sourcePackageProcessChanges } from '../compatibility/latest-upstream/source-package-process.mjs';
import { applySourceChange } from '../compatibility/latest-upstream/source-runtime.mjs';

assert.equal(process.platform, 'win32', 'This probe measures Windows pnpm.cmd process trees');
const flags = process.argv.slice(2);
assert.ok(flags.length <= 2 && new Set(flags).size === flags.length && flags.every(flag => ['--candidate', '--published', '--source-installed', '--native-installed'].includes(flag)));
const candidate = flags.includes('--candidate'), published = flags.includes('--published'), installed = flags.includes('--source-installed');
const nativeInstalled = flags.includes('--native-installed');
assert.ok(!nativeInstalled || (published && !candidate && !installed));
assert.ok([candidate, published, installed].filter(Boolean).length <= 1);
const mode = installed ? 'source-installed' : published ? 'published' + (nativeInstalled ? '-native-installed' : '') : candidate ? 'candidate' : 'original';
const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const output = resolve(runtime, 'package-process');
await mkdir(output, { recursive: true });
const require = createRequire(resolve(runtime, 'package.json'));
const originalPath = require.resolve('@deepseek-ai/dsh-plugin-manager/operations');
const original = await readFile(originalPath);
if (nativeInstalled) {
  const plan = await (await import('../compatibility/latest-upstream/package-range-runtime.mjs')).readInstalledLatestPackageRange();
  assert.equal(plan?.files.length, 5); assert.equal(plan.patched, 5);
} else if (!candidate && !installed) assert.equal(createHash('sha256').update(original).digest('hex'), published
  ? '5383d7f6f07a17bec9c5b585e8165a34c10fbad5ad7fb6d16e4a819942b6b486'
  : 'bf511a06b6ff2d7aab1f7725fcc80f304eb32a9541790e22cd28f8a9617b2c68');
let entry = originalPath;
if (installed) {
  await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
  entry = resolve(root, 'artifacts/latest-source-check/packages/boot/plugin-manager/lib/types/operations.js');
}
if (candidate) {
  const sourcePath = resolve(root, 'artifacts/latest-source-check/packages/boot/plugin-manager/src/operations.ts');
  const source = await readFile(sourcePath, 'utf8');
  assert.equal(createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex'),
    '16d141f794041d06122ce9f8ab7bae6f55b4a78feefb620f9cb6c7ba5efac547');
  const patched = applySourceChange(sourcePackageProcessChanges[0], source);
  const bundled = await build({ stdin: { contents: patched, loader: 'ts', resolveDir: resolve(sourcePath, '..') },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2024',
    plugins: [{ name: 'fixed-latest-runtime', setup(builder) {
      builder.onResolve({ filter: /^(?:@deepseek-ai\/|execa$)/ }, args => ({
        path: pathToFileURL(require.resolve(args.path)).href, external: true,
      }));
    } }] });
  entry = resolve(output, 'candidate-operations.mjs');
  await writeFile(entry, bundled.outputFiles[0].contents);
}
const operations = await import(pathToFileURL(entry));
const pnpm = resolve('F:/Program Files/nodejs/node_global/pnpm.cmd');
await readFile(pnpm); // 真实pnpm启动器，避免直接Node测试掩盖Windows启动器差异。
const alive = pid => { try { process.kill(pid, 0); return true } catch (error) { if (error.code === 'ESRCH') return false; throw error } };
const delay = ms => new Promise(done => setTimeout(done, ms));
const report = { at: new Date().toISOString(), mode,
  version: '0.2.1-alpha.1', scope: 'actual-pnpm-cmd-controlled-child-processes', cases: [], passed: false };
for (const name of ['service-cancel', 'view-cancel', 'view-timeout', 'registry-timeout', 'preflight-cancel']) {
  const dir = await mkdtemp(resolve(output, 'owned-'));
  const pidFile = resolve(dir, 'pids.json');
  const parent = resolve(dir, 'parent.mjs'), child = resolve(dir, 'child.mjs');
  const manifest = Buffer.from('{"name":"dshm-process-probe","private":true}');
  await writeFile(resolve(dir, 'package.json'), manifest);
  await writeFile(child, 'setInterval(() => {}, 1000);');
  await writeFile(parent, `import {spawn} from 'node:child_process'; import {writeFileSync} from 'node:fs';
const child=spawn(process.execPath,[${JSON.stringify(child)}],{stdio:'inherit',windowsHide:true});
writeFileSync(${JSON.stringify(pidFile)},JSON.stringify({parent:process.pid,pnpm:process.ppid,child:child.pid}));
setInterval(()=>{},1000);`);
  const abort = new AbortController();
  const options = { command: pnpm, args: ['exec', process.execPath, parent, '--'],
    signal: abort.signal, timeoutMs: name.endsWith('timeout') ? 2000 : 15000 };
  let pids, settled = false, answer, failed;
  const start = Date.now();
  const running = (name === 'registry-timeout' ? operations.readProfileRegistry(dir, options)
    : name.startsWith('view-') ? operations.viewProfilePackage(dir, 'dshm-never-installed', options)
    : operations.runProfilePnpm({ profile: 'test', dir, cwd: dir, installAnchor: resolve(dir, 'package.json') },
      name === 'preflight-cancel' ? ['add', 'dshm-never-installed'] : [],
      { ...options, execution: 'service', outputBytes: 1024, activateNewBundles: false }))
    .then(value => { settled = true; answer = value }, error => { settled = true; failed = String(error) });
  const item = { name, passed: false };
  try {
    for (let i = 0; i < 160; i++) {
      try { pids = JSON.parse(await readFile(pidFile, 'utf8')); break }
      catch (error) { if (error.code !== 'ENOENT') throw error }
      if (settled) break;
      await delay(25);
    }
    assert.ok(pids?.parent > 0 && pids?.pnpm > 0 && pids?.child > 0, 'Actual fixture did not start');
    assert.ok(alive(pids.parent) && alive(pids.child));
    if (!name.endsWith('timeout')) abort.abort();
    // 查询自身结束和子树消失必须均先于清理；事后清理不算补丁成功。
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && (!settled || alive(pids.parent) || alive(pids.child))) await delay(25);
    Object.assign(item, { pids, settledBeforeCleanup: settled, parentGone: !alive(pids.parent),
      childGone: !alive(pids.child), answer, error: failed, elapsedMs: Date.now() - start });
    item.passed = settled && !failed && item.parentGone && item.childGone;
    if (settled && !failed) {
      if (name.startsWith('view-')) assert.equal(answer.timedOut, name === 'view-timeout');
      if (name === 'registry-timeout') assert.equal(answer, null);
      else assert.notEqual(answer.exitCode, 0);
    }
    assert.deepEqual(await readFile(resolve(dir, 'package.json')), manifest);
    item.manifestUnchanged = true;
  } catch (error) { item.passed = false; item.error = String(error) }
  finally {
    abort.abort();
    // 仅清理夹具自己写出的PID；绝不扫描或结束日常DSH/其他pnpm。
    if (pids) for (const pid of [pids.pnpm, pids.parent, pids.child]) if (alive(pid))
      spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 5000 });
    const finished = await Promise.race([running.then(() => true), delay(5000).then(() => false)]);
    assert.ok(finished, 'Owned operation did not settle after cleanup');
    if (pids) for (const pid of Object.values(pids)) assert.equal(alive(pid), false);
    item.cleanupPassed = true;
    await rm(dir, { recursive: true });
    report.cases.push(item);
    console.log(JSON.stringify(item));
  }
}
report.passed = report.cases.every(item => item.passed);
await writeFile(resolve(output, report.mode + '-report.json'), JSON.stringify(report, null, 2) + '\n');
assert.deepEqual(await readFile(originalPath), original);
if (installed) await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
if (!report.passed) process.exitCode = 1;
