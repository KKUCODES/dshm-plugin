// 正式源码安装器的真实Windows进程边界；不替代手机原管理组件验收。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { access, copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';
import { packageRangeBaseline, packageRangePayload, readInstalledLatestPackageRange } from '../compatibility/latest-upstream/package-range-runtime.mjs';

assert.equal(process.platform, 'win32');
const flags = process.argv.slice(2);
assert.ok(flags.length <= 2 && new Set(flags).size === flags.length);
assert.ok(flags.every(flag => flag === '--published' || /^--attempt-[2-9]$/.test(flag)));
const published = flags.includes('--published'), attempt = flags.find(flag => flag.startsWith('--attempt-')) ?? '';
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const output = resolve(runtime, published ? 'package-range-published' : 'package-range-source');
await mkdir(output, { recursive: true });
const reportPath = resolve(output, 'actual-report' + attempt.replace('--', '-') + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
if (published) {
  const installed = await readInstalledLatestPackageRange();
  assert.equal(installed?.patched, 5); assert.equal(installed.nativeRange, true);
} else await verifyInstalledSource();
const packageRoot = published ? resolve(runtime, 'node_modules/@deepseek-ai/dsh-plugin-manager')
  : resolve(sourceRoot, 'packages/boot/plugin-manager');
const entry = resolve(packageRoot, 'lib/types/operations.js');
const { runPluginCommand } = await import(pathToFileURL(entry));
// 封存的上一发布候选保留原Windows/execa路径，不能在安装新载体后把新实现当作原基线。
const baselineEntry = resolve(packageRangeBaseline, 'lib/types/operations.js');
assert.equal(createHash('sha256').update(await readFile(baselineEntry)).digest('hex'),
  '5383d7f6f07a17bec9c5b585e8165a34c10fbad5ad7fb6d16e4a819942b6b486');
const baselineMetadata = JSON.parse(await readFile(resolve(packageRangeBaseline, 'package.json')));
assert.equal(baselineMetadata.version, '0.2.1-alpha.1');
const { runPluginCommand: runBaselineCommand } = await import(pathToFileURL(baselineEntry));
const { initProfile } = await import(pathToFileURL(published
  ? resolve(runtime, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')
  : resolve(sourceRoot, 'packages/boot/app-boot/lib/index.js')));
const installAnchor = published ? resolve(runtime, 'node_modules/@deepseek-ai/dsh/package.json')
  : resolve(sourceRoot, 'apps/cli/package.json');
const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json')));
const report = { at: new Date().toISOString(), mode: published ? 'published' : 'source-installed', sourceCommit: manifest.sourceCommit,
  sourceFiles: manifest.files.length, actualEntryHash: createHash('sha256').update(await readFile(entry)).digest('hex'),
  baselineEntryHash: createHash('sha256').update(await readFile(baselineEntry)).digest('hex'),
  cases: [], passed: false };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };
const delay = ms => new Promise(done => setTimeout(done, ms));
try {
  for (const execution of ['service', 'cli']) {
    for (const scenario of ['normal', 'missing-command', 'leftover-writer']) {
      const home = await mkdtemp(resolve(output, 'owned-'));
      const profile = resolve(home, 'profile'); await mkdir(profile); initProfile(profile, []);
      const before = await readFile(resolve(profile, 'package.json'));
      const script = resolve(home, 'command.mjs'), facts = resolve(home, 'facts.json');
      const marks = resolve(home, 'writes.txt'), writer = resolve(home, 'writer.mjs');
      await writeFile(writer, `import {appendFileSync} from 'node:fs'; setInterval(()=>appendFileSync(${JSON.stringify(marks)},'x'),20);`);
      await writeFile(script, `import {spawn} from 'node:child_process'; import {writeFileSync,existsSync} from 'node:fs';
const child=${scenario === 'leftover-writer' ? `spawn(process.execPath,[${JSON.stringify(writer)}],{stdio:'inherit',windowsHide:true})` : 'undefined'};
writeFileSync(${JSON.stringify(facts)},JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2),custom:process.env.DSHM_RANGE_PROBE,privateMarker:process.env.DSHM_PACKAGE_ELECTRON_NODE,pid:process.pid,child:child?.pid}));
console.log('原输出中文🙂'); console.error('原错误流');
${scenario === 'leftover-writer' ? `const deadline=Date.now()+5000;while(!existsSync(${JSON.stringify(marks)})){if(Date.now()>deadline)throw Error('owned writer did not start');await new Promise(done=>setTimeout(done,10));}` : ''}
process.exit(0);`);
      const item = { execution, scenario, home, passed: false };
      report.cases.push(item);
      const chunks = [];
      try {
      if (scenario === 'missing-command') {
        const baseline = await runBaselineCommand({ profile: 'range-probe', dir: profile, home, cwd: home,
          installAnchor }, ['--owned-prefix', '含 空格🙂'], {
          command: resolve(home, 'does-not-exist.exe'), args: [], execution, outputBytes: 1024,
          env: { DSHM_RANGE_PROBE: '自有环境🙂' }, idleTimeoutMs: 10000,
        });
        assert.notEqual(baseline.exitCode, 0); assert.equal(baseline.timedOut === true, false);
        item.originalMissingCommand = { exitCode: baseline.exitCode, timedOut: false, output: baseline.output };
      }
      const result = await runPluginCommand({ profile: 'range-probe', dir: profile, home, cwd: home,
        installAnchor }, ['--owned-prefix', '含 空格🙂'], {
        command: scenario === 'missing-command' ? resolve(home, 'does-not-exist.exe') : process.execPath,
        args: scenario === 'missing-command' ? [] : [script], execution, outputBytes: 1024,
        env: { DSHM_RANGE_PROBE: '自有环境🙂' }, idleTimeoutMs: 10000, onOutput: (text, stream) => chunks.push({ text, stream }),
      });
      item.result = { exitCode: result.exitCode, timedOut: result.timedOut === true, output: result.output };
      assert.equal(result.exitCode, scenario === 'missing-command' ? item.originalMissingCommand.exitCode : 0);
      assert.equal(result.timedOut === true, false);
      if (scenario !== 'missing-command') {
        const actual = JSON.parse(await readFile(facts));
        assert.equal(actual.cwd, profile); assert.equal(actual.custom, '自有环境🙂');
        assert.deepEqual(actual.args, ['--owned-prefix', '含 空格🙂']);
        assert.equal(actual.privateMarker, undefined);
        assert.equal(alive(actual.pid), false);
        if (execution === 'service') {
          assert.ok(result.output.includes('原输出中文🙂'));
          assert.ok(result.output.includes('原错误流'));
          assert.ok(chunks.some(chunk => chunk.stream === 'stdout' && chunk.text.includes('原输出中文🙂')));
          assert.ok(chunks.some(chunk => chunk.stream === 'stderr' && chunk.text.includes('原错误流')));
        } else assert.equal(result.output, '');
        if (actual.child !== undefined) {
          assert.equal(alive(actual.child), false, '原操作结算时遗留写入进程必须已退出');
          const stopped = await readFile(marks); await delay(300); assert.deepEqual(await readFile(marks), stopped);
          item.writerStoppedAtSettlement = true;
        }
        item.actual = actual;
      }
      assert.deepEqual(await readFile(resolve(profile, 'package.json')), before);
      await assert.rejects(access(resolve(profile, '.plugin-manager/run.json')), { code: 'ENOENT' });
      item.profilePreserved = true; item.passed = true;
      } finally {
        // 失败清理与产品退出断言分开；只回收本次夹具自己公布的PID，不能把事后清理记作通过。
        if (!item.passed) {
          let actual;
          try { actual = JSON.parse(await readFile(facts, 'utf8')); }
          catch (error) { if (error.code !== 'ENOENT') throw error; }
          item.failureCleanup = [];
          for (const pid of [actual?.pid, actual?.child]) {
            if (!Number.isInteger(pid) || pid <= 0) continue;
            const wasAlive = alive(pid);
            if (wasAlive) execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'],
              { cwd: home, windowsHide: true, stdio: 'ignore' });
            item.failureCleanup.push({ pid, wasAlive, aliveAfterCleanup: alive(pid) });
          }
        }
      }
    }
  }
  for (const scenario of ['node-bootstrap', 'no-caller-ipc', 'native-load-failure']) {
    const home = await mkdtemp(resolve(output, 'owned-'));
    const facts = resolve(home, 'launched.json'), script = resolve(home, 'command.mjs');
    await writeFile(script, `import{writeFileSync}from'node:fs';writeFileSync(${JSON.stringify(facts)},JSON.stringify({pid:process.pid}));console.log('原引导输出🙂');`);
    const helper = resolve(packageRoot, 'lib/types/run-tree.js');
    const entry = scenario === 'node-bootstrap' ? resolve(home, 'runtime-bootstrap.mjs') : helper;
    if (scenario === 'node-bootstrap') {
      // 原文件仅在官方部署closure内运行；使用自有closure入口及固定原包，不能直接从未部署的python目录启动。
      await copyFile(published ? resolve(packageRangePayload, 'node-bootstrap.mjs')
        : resolve(sourceRoot, 'python/sdk-runtime/runtime-bootstrap.mjs'), entry);
      await mkdir(resolve(home, 'node_modules/@deepseek-ai'), { recursive: true });
      for (const [name, relative] of [
        ['dsh-plugin-manager', 'packages/boot/plugin-manager'],
        ['dsh-sandbox-windows-acl', 'packages/sandbox/sandbox-windows-acl'],
      ]) {
        const closurePackage = published ? resolve(runtime, 'node_modules/@deepseek-ai', name) : resolve(sourceRoot, relative);
        const metadata = JSON.parse(await readFile(resolve(closurePackage, 'package.json')));
        assert.equal(metadata.name, '@deepseek-ai/' + name); assert.equal(metadata.version, '0.2.1-alpha.1');
        await symlink(closurePackage, resolve(home, 'node_modules/@deepseek-ai/' + name), 'junction');
      }
    }
    const hook = resolve(home, 'deny-native.mjs');
    if (scenario === 'native-load-failure') await writeFile(hook,
      "import{registerHooks}from'node:module';registerHooks({resolve(specifier,context,next){if(specifier==='@deepseek-ai/dsh-win32-process')throw Error('owned native refusal');return next(specifier,context);}});");
    const args = [...scenario === 'native-load-failure' ? ['--import', pathToFileURL(hook).href] : [], entry,
      ...scenario === 'node-bootstrap' ? [helper] : [], '--run', process.execPath, JSON.stringify([script])];
    const child = spawn(process.execPath, args, { cwd: home, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe', ...scenario === 'no-caller-ipc' ? [] : ['ipc']] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
    const timer = setTimeout(() => { if (child.exitCode === null) child.kill(); }, 10000);
    const item = { scenario, home, passed: false }; report.cases.push(item);
    try {
      item.exitCode = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); });
      item.stdout = stdout; item.stderr = stderr;
      assert.equal(item.exitCode, scenario === 'node-bootstrap' ? 0 : 127);
      if (scenario === 'node-bootstrap') {
        assert.ok(stdout.includes('原引导输出🙂'));
        assert.equal(alive(JSON.parse(await readFile(facts)).pid), false);
      } else {
        await assert.rejects(access(facts), { code: 'ENOENT' });
        assert.ok(stderr.includes(scenario === 'no-caller-ipc' ? 'requires caller IPC' : 'owned native refusal'));
        item.targetNotLaunched = true;
      }
      item.passed = true;
    } finally {
      clearTimeout(timer);
      if (alive(child.pid)) execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { cwd: home, windowsHide: true, stdio: 'ignore' });
    }
  }
  report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally { await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' }); }
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.map(({ execution, scenario, passed }) => ({ execution, scenario, passed })), failure: report.failure }));
