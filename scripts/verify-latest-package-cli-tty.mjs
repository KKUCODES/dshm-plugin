// 用原dsh plugin与真实TTY核对输入/输出；只在本项目新建的专用profile中执行。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageRangeRuntime, readInstalledLatestPackageRange } from '../compatibility/latest-upstream/package-range-runtime.mjs';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

const phase = process.argv[2];
assert.ok(['prepare', 'input', 'exit', 'interrupt', 'recover', 'verify', 'verify-recovery'].includes(phase));
const flags = process.argv.slice(3);
assert.ok(flags.length <= 2 && new Set(flags).size === flags.length);
assert.ok(flags.every(flag => flag === '--source' || /^--attempt-[2-9]$/.test(flag)));
assert.ok(flags.filter(flag => flag.startsWith('--attempt-')).length <= 1);
const source = flags.includes('--source');
const suffix = flags.find(flag => flag.startsWith('--attempt-'))?.replace('--', '-') ?? '';
assert.equal(process.platform, 'win32');
const output = resolve(packageRangeRuntime, source ? 'package-range-tty/source' : 'package-range-tty');
await mkdir(output, { recursive: true }); assert.equal(await realpath(output), output);
const seedPath = resolve(output, 'original-cli-seed' + suffix + '.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let installed;
if (source) {
  const { verifyInstalledSource } = await import('../compatibility/latest-upstream/source-host.mjs');
  installed = await verifyInstalledSource(); assert.equal(installed.files, 38);
  const lease = JSON.parse(await readFile(resolve(packageRangeRuntime, 'latest-live-source-lease.json')));
  assert.equal(lease.state, 'ready'); assert.equal(lease.scope, 'tty-cli'); assert.equal(lease.sourceCommit, installed.sourceCommit);
} else {
  installed = await readInstalledLatestPackageRange();
  assert.equal(installed.patched, 5); assert.equal(installed.nativeRange, true);
}
const cliRoot = source ? resolve(sourceRoot, 'apps/cli') : resolve(packageRangeRuntime, 'node_modules/@deepseek-ai/dsh');
const metadata = JSON.parse(await readFile(resolve(cliRoot, 'package.json')));
assert.equal(metadata.name, '@deepseek-ai/dsh'); assert.equal(metadata.version, '0.2.1-alpha.1');
const cli = resolve(cliRoot, source ? 'src/bin.ts' : 'lib/bin.js');
let seed;
if (phase === 'prepare') {
  await assert.rejects(access(seedPath), { code: 'ENOENT' });
  const home = await mkdtemp(resolve(output, 'owned-'));
  const profile = resolve(home, 'profiles/web'); await mkdir(profile, { recursive: true });
  const { initProfile } = await import(pathToFileURL(source ? resolve(sourceRoot, 'packages/boot/app-boot/lib/index.js')
    : resolve(packageRangeRuntime, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')));
  initProfile(profile, []);
  const manifestPath = resolve(profile, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath));
  const probe = resolve(home, 'tty-probe.mjs');
  // 原pnpm负责脚本解析；固定的可执行文件/自有路径不能含shell元字符。
  for (const path of [process.execPath, probe]) assert.match(path, /^[A-Za-z0-9 /:\\._-]+$/);
  manifest.scripts = { 'dshm:tty-input': `node "${probe}" input`,
    'dshm:tty-exit': `node "${probe}" exit`, 'dshm:tty-interrupt': `node "${probe}" interrupt` };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const wanted = 'DSHM_TTY_INPUT_' + randomUUID().replaceAll('-', '');
  await writeFile(probe, `import {writeFileSync,existsSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {spawn} from 'node:child_process';
const phase=process.argv[2],home=${JSON.stringify(home)},profile=${JSON.stringify(profile)};
const facts={phase,pid:process.pid,node:process.execPath,cwd:process.cwd(),stdinTTY:process.stdin.isTTY===true,stdoutTTY:process.stdout.isTTY===true,stderrTTY:process.stderr.isTTY===true};
const path=home+'/target-'+phase+'.json';
const save=()=>writeFileSync(path,JSON.stringify(facts,null,2));
save();
if(process.cwd()!==profile||!facts.stdinTTY||!facts.stdoutTTY||!facts.stderrTTY)process.exit(91);
console.log('DSHM_CLI_TTY_OUTPUT 中文🙂');console.error('DSHM_CLI_TTY_STDERR 中文🙂');
if(phase==='exit'){facts.requestedExitCode=7;save();process.exit(7);}
if(phase==='interrupt'){
  const marks=home+'/interrupt-marks.txt';
  const writer=spawn(process.execPath,['-e','const fs=require("node:fs");setInterval(()=>fs.appendFileSync('+JSON.stringify(marks)+',"x"),20);'],{stdio:'inherit',windowsHide:true});
  facts.writerPid=writer.pid;save();
  const end=Date.now()+5000;while(!existsSync(marks)){if(Date.now()>end)process.exit(94);await new Promise(done=>setTimeout(done,10));}
  console.log('DSHM_CLI_TTY_INTERRUPT_READY');setTimeout(()=>process.exit(95),60000);
}else{
console.log('DSHM_CLI_TTY_READY');
const timer=setTimeout(()=>process.exit(92),60000);
const lines=createInterface({input:process.stdin});
lines.once('line',line=>{facts.input=line;facts.passed=line===${JSON.stringify(wanted)};save();clearTimeout(timer);lines.close();console.log('DSHM_CLI_TTY_DONE');process.exit(facts.passed?0:93);});
}
`, { flag: 'wx' });
  seed = { at: new Date().toISOString(), home, profile, cli, wanted,
    manifestHash: hash(await readFile(manifestPath)), probeHash: hash(await readFile(probe)),
    cliHash: hash(await readFile(cli)), version: metadata.version, source, cases: ['input', 'exit', 'interrupt'] };
  await writeFile(seedPath, JSON.stringify(seed, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ prepared: true, home, wanted }));
  process.exit(0);
}
seed = JSON.parse(await readFile(seedPath));
assert.equal(seed.cli, cli); assert.equal(seed.version, metadata.version);
assert.equal(seed.source ?? false, source);
assert.equal(hash(await readFile(cli)), seed.cliHash);
assert.equal(dirname(seed.home), output); assert.match(seed.home.slice(output.length + 1), /^owned-[A-Za-z0-9]+$/);
assert.equal(await realpath(seed.home), seed.home);
assert.equal(seed.profile, resolve(seed.home, 'profiles/web')); assert.equal(await realpath(seed.profile), seed.profile);
assert.equal(hash(await readFile(resolve(seed.home, 'tty-probe.mjs'))), seed.probeHash);
assert.equal(hash(await readFile(resolve(seed.profile, 'package.json'))), seed.manifestHash);
if (!['verify', 'verify-recovery'].includes(phase)) {
  assert.equal(process.stdin.isTTY, true); assert.equal(process.stdout.isTTY, true); assert.equal(process.stderr.isTTY, true);
  await assert.rejects(access(resolve(output, 'original-cli-' + phase + suffix + '.json')), { code: 'ENOENT' });
  if (phase === 'recover') {
    // Ctrl+C可以先结束整个CLI，原管理器在下一次操作接管死记录；保留中断时证据。
    const previous = JSON.parse(await readFile(resolve(output, 'original-cli-tty-report' + suffix + '.json')));
    assert.equal(previous.passed, false); assert.equal(previous.cases.length, 3);
    assert.equal(previous.failure.message, 'Missing expected rejection.');
    const record = await readFile(resolve(seed.profile, '.plugin-manager/run.json'));
    const tree = JSON.parse(record);
    assert.ok(Number.isSafeInteger(tree.pid) && tree.pid > 0);
    assert.equal(typeof tree.grouped, 'boolean');
    assert.throws(() => process.kill(tree.pid, 0), error => error.code === 'ESRCH');
    const interrupt = JSON.parse(await readFile(resolve(output, 'original-cli-interrupt' + suffix + '.json')));
    const facts = JSON.parse(await readFile(resolve(seed.home, 'target-interrupt.json')));
    assert.equal(interrupt.interrupted, true); assert.notEqual(interrupt.exitCode, 0);
    for (const pid of [interrupt.pid, facts.pid, facts.writerPid])
      assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
    await writeFile(resolve(output, 'original-cli-dead-record' + suffix + '.json'), record, { flag: 'wx' });
    await writeFile(resolve(output, 'original-cli-exit-before-recovery' + suffix + '.json'),
      await readFile(resolve(seed.home, 'target-exit.json')), { flag: 'wx' });
  }
  const env = { DSH_HOME: seed.home, DSH_TELEMETRY_DISABLED: '1' };
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA',
    'LOCALAPPDATA', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
    if (process.env[key] !== undefined) env[key] = process.env[key];
  const args = source ? [resolve(sourceRoot, 'node_modules/pnpm/bin/pnpm.cjs'), 'dsh'] : [cli];
  const scriptPhase = phase === 'recover' ? 'exit' : phase;
  const child = spawn(process.execPath, [...args, 'plugin', '--profile', 'web', 'run', 'dshm:tty-' + scriptPhase],
    { cwd: source ? sourceRoot : output, env, windowsHide: true, stdio: 'inherit' });
  let interrupted = false;
  const onInterrupt = () => { interrupted = true; };
  if (phase === 'interrupt') {
    process.once('SIGINT', onInterrupt);
    await writeFile(resolve(output, 'original-cli-interrupt-launch' + suffix + '.json'), JSON.stringify({ pid: child.pid, home: seed.home }), { flag: 'wx' });
  }
  const exitCode = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
  process.off('SIGINT', onInterrupt);
  await writeFile(resolve(output, 'original-cli-' + phase + suffix + '.json'), JSON.stringify({ at: new Date().toISOString(),
    phase, pid: child.pid, exitCode, interrupted, parentTTY: true, home: seed.home,
    command: (source ? 'pnpm dsh' : 'dsh') + ' plugin --profile web run dshm:tty-' + scriptPhase }, null, 2), { flag: 'wx' });
  const expected = phase === 'interrupt' ? interrupted && exitCode !== 0 : exitCode === (phase === 'input' ? 0 : 7);
  console.log(JSON.stringify({ phase, exitCode, interrupted, expectedOutcome: expected }));
  process.exit(expected ? 0 : 1);
}
const recovery = phase === 'verify-recovery';
const reportPath = resolve(output, 'original-cli-tty-' + (recovery ? 'recovery-report' : 'report') + suffix + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const report = { at: new Date().toISOString(), version: metadata.version, source,
  ...(source ? { sourceCommit: installed.sourceCommit, files: installed.files } : {}), nativeRange: true, cases: [], passed: false };
try {
  for (const kind of seed.cases ?? ['input', 'exit']) {
    const result = JSON.parse(await readFile(resolve(output, 'original-cli-' + kind + suffix + '.json')));
    const facts = JSON.parse(await readFile(recovery && kind === 'exit'
      ? resolve(output, 'original-cli-exit-before-recovery' + suffix + '.json')
      : resolve(seed.home, 'target-' + kind + '.json')));
    assert.equal(result.home, seed.home); assert.equal(result.parentTTY, true);
    if (kind === 'interrupt') { assert.equal(result.interrupted, true); assert.notEqual(result.exitCode, 0); }
    else assert.equal(result.exitCode, kind === 'input' ? 0 : 7);
    assert.equal(facts.cwd, seed.profile);
    assert.equal(facts.node, process.execPath);
    for (const field of ['stdinTTY', 'stdoutTTY', 'stderrTTY']) assert.equal(facts[field], true);
    if (kind === 'input') { assert.equal(facts.input, seed.wanted); assert.equal(facts.passed, true); }
    else if (kind === 'exit') assert.equal(facts.requestedExitCode, 7);
    if (kind === 'interrupt') {
      assert.ok(Number.isSafeInteger(facts.writerPid) && facts.writerPid > 0);
      const marks = await readFile(resolve(seed.home, 'interrupt-marks.txt'));
      assert.ok(marks.length > 0); await new Promise(done => setTimeout(done, 300));
      assert.deepEqual(await readFile(resolve(seed.home, 'interrupt-marks.txt')), marks);
    }
    for (const pid of [result.pid, facts.pid, ...kind === 'interrupt' ? [facts.writerPid] : []])
      assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
    report.cases.push({ kind, originalCli: true, actualTargetTTY: true, exitCode: result.exitCode, processesStopped: true });
  }
  if (recovery) {
    const previous = JSON.parse(await readFile(resolve(output, 'original-cli-tty-report' + suffix + '.json')));
    assert.equal(previous.passed, false); assert.equal(previous.cases.length, 3);
    assert.equal(previous.failure.message, 'Missing expected rejection.');
    const dead = JSON.parse(await readFile(resolve(output, 'original-cli-dead-record' + suffix + '.json')));
    assert.throws(() => process.kill(dead.pid, 0), error => error.code === 'ESRCH');
    const result = JSON.parse(await readFile(resolve(output, 'original-cli-recover' + suffix + '.json')));
    const facts = JSON.parse(await readFile(resolve(seed.home, 'target-exit.json')));
    assert.equal(result.home, seed.home); assert.equal(result.parentTTY, true); assert.equal(result.exitCode, 7);
    assert.equal(facts.cwd, seed.profile); assert.equal(facts.node, process.execPath); assert.equal(facts.requestedExitCode, 7);
    for (const field of ['stdinTTY', 'stdoutTTY', 'stderrTTY']) assert.equal(facts[field], true);
    for (const pid of [result.pid, facts.pid]) assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH');
    report.interruptRecordImmediateRemoval = false; report.originalSuccessorRecovery = true;
  }
  assert.equal(hash(await readFile(resolve(seed.profile, 'package.json'))), seed.manifestHash);
  await assert.rejects(access(resolve(seed.profile, '.plugin-manager/run.json')), { code: 'ENOENT' });
  report.profilePreserved = true; report.runRecordRemoved = true; report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally { await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' }); }
console.log(JSON.stringify(report));
process.exit(process.exitCode ?? 0);
