// 完整官方 SDK 的已知 runner 边界及实际包管理进程范围；不安装插件或修改用户 home。
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { finished } from 'node:stream/promises';
import { readLatestSdkCarrier } from '../../backend/scripts/latest-sdk-carrier.mjs';

const observeDisconnect = process.argv[2] === '--observe-disconnect';
const recheckSettlement = process.argv[2] === '--settlement-recheck';
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && (observeDisconnect || recheckSettlement)));
assert.equal(process.platform, 'win32');
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const carrier = await readLatestSdkCarrier(runtime);
assert.equal(carrier.buildReport, resolve(runtime, 'latest-sdk-sea-build-attempt-9.json'));
const directory = resolve(runtime, observeDisconnect
  ? 'sdk-runner-disconnect-observation-attempt-9' : recheckSettlement
  ? 'sdk-runner-settlement-recheck-attempt-9' : 'sdk-runner-execution-attempt-9');
if (observeDisconnect || recheckSettlement) {
  const previous = JSON.parse(await readFile(resolve(runtime, 'sdk-runner-execution-attempt-9/report.json')));
  assert.equal(previous.productSha256, carrier.productSha256);
  assert.equal(previous.failure.message, 'SDK package runner did not settle');
  assert.equal(previous.executions.at(-1).scenario, 'caller-disconnect');
  assert.equal(previous.executions.at(-1).callerIpcDisconnected, true);
  assert.equal(previous.executions.at(-1).failureCleanupRequested, undefined);
}
if (recheckSettlement) {
  const control = JSON.parse(await readFile(resolve(runtime, 'node-disconnect-close-control-attempt-9.json')));
  assert.equal(control.passed, true); assert.equal(control.nodeVersion, process.version);
  assert.equal(control.sdkUsed, false); assert.equal(control.closeEmitted, false);
  assert.equal(control.code, 1); assert.equal(control.streamsEnded, true); assert.equal(control.processDead, true);
  const observation = JSON.parse(await readFile(resolve(runtime, 'sdk-runner-disconnect-observation-attempt-9/report.json')));
  assert.equal(observation.productSha256, carrier.productSha256);
  const row = observation.executions[0]; assert.equal(row.scenario, 'caller-disconnect');
  assert.equal(row.observedState.exitCode, 1);
  for (const key of ['runnerAlive', 'targetAlive', 'writerAlive', 'connected']) assert.equal(row.observedState[key], false);
  for (const key of ['stdoutEnded', 'stderrEnded']) assert.equal(row.observedState[key], true);
  assert.equal(row.failureCleanupRequested, undefined);
}
await mkdir(directory);
const inspection = JSON.parse(await readFile(resolve(runtime, 'latest-sdk-sea-encoding-inspection-attempt-8.json')));
const text = inspection.toolResults[0].content.find(row => row.type === 'text').text;
const match = text.match(/invalid profile name ("(?:[^"\\]|\\.)*")/);
assert.ok(match);
const acl = JSON.parse(match[1]);
assert.match(acl, /^Q:\\snapshot\\.*\\@deepseek-ai\\dsh-sandbox-windows-acl\\lib\\runner\.js$/);
const manager = JSON.parse(await readFile(resolve(carrier.root, 'node/node_modules/@deepseek-ai/dsh-plugin-manager/package.json')));
assert.equal(manager.version, '0.2.1-alpha.1');
assert.equal(manager.exports['./runner'].default, './lib/types/run-tree.js');
const packageRunner = acl.replace(/dsh-sandbox-windows-acl\\lib\\runner\.js$/, 'dsh-plugin-manager\\lib\\types\\run-tree.js');
const environment = { DSH_HOME: directory, DSH_TELEMETRY_DISABLED: '1', DSHM_RANGE_PROBE: '自有环境🙂',
  PKG_NATIVE_CACHE_PATH: resolve(runtime, 'sdk-sea-temporary/native-cache') };
for (const name of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA',
  'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'PROGRAMFILES'])
  if (process.env[name] !== undefined) environment[name] = process.env[name];
const report = { at: new Date().toISOString(), productSha256: carrier.productSha256,
  actualSdkExecutable: true, modelRequests: 0, pluginInstallations: 0, passed: false, boundaries: [], executions: [],
  settlementObservation: observeDisconnect ? 'legacy-close-event' : 'exit-streams-and-ipc' };
const alive = pid => {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
};
const delay = ms => new Promise(done => setTimeout(done, ms));
try {
  for (const [runner, selector, expected] of [
    ['acl', acl, /windows-acl-run: missing --workspace/],
    ['package', packageRunner, /invalid package range invocation/],
  ]) {
    for (const drive of ['Q', 'C']) {
      const result = spawnSync(carrier.executable, [selector.replace(/^Q:/, drive + ':')], {
        cwd: directory, env: environment, windowsHide: true, encoding: 'utf8', timeout: 30000,
        maxBuffer: 1024 * 1024 });
      report.boundaries.push({ runner, drive, exitCode: result.status, signal: result.signal,
        error: result.error?.code, stdout: result.stdout, stderr: result.stderr });
      assert.equal(result.error, undefined); assert.equal(result.signal, null);
      assert.notEqual(result.status, 0); assert.match(result.stderr, expected);
      assert.doesNotMatch(result.stderr, /invalid profile name/);
      if (runner === 'acl') assert.equal(result.status, 127);
    }
  }
  // 给了合法命令但没有IPC时必须拒绝；不能退回没有进程范围控制的执行。
  const closed = spawnSync(carrier.executable, [packageRunner, '--run', process.execPath, '[]'], {
    cwd: directory, env: environment, windowsHide: true, encoding: 'utf8', timeout: 30000 });
  assert.equal(closed.error, undefined); assert.notEqual(closed.status, 0);
  assert.match(closed.stderr, /package range requires caller IPC/);
  report.noIpcRejected = true;
  for (const scenario of observeDisconnect ? ['caller-disconnect'] : ['normal', 'leftover-writer', 'caller-disconnect']) {
    const home = resolve(directory, scenario); await mkdir(home);
    const facts = resolve(home, 'facts.json'), marks = resolve(home, 'writes.txt');
    const script = resolve(home, 'command.mjs'), writer = resolve(home, 'writer.mjs');
    await writeFile(writer, `import {appendFileSync} from 'node:fs';setInterval(()=>appendFileSync(${JSON.stringify(marks)},'x'),20);`, { flag: 'wx' });
    await writeFile(script, `import {spawn} from 'node:child_process';import {writeFileSync,existsSync} from 'node:fs';
const child=${scenario === 'normal' ? 'undefined' : `spawn(process.execPath,[${JSON.stringify(writer)}],{stdio:'inherit',windowsHide:true})`};
writeFileSync(${JSON.stringify(facts)},JSON.stringify({pid:process.pid,childPid:child?.pid,cwd:process.cwd(),args:process.argv.slice(2),custom:process.env.DSHM_RANGE_PROBE,privateMarker:process.env.DSHM_PACKAGE_ELECTRON_NODE}));
if(child){const deadline=Date.now()+5000;while(!existsSync(${JSON.stringify(marks)})){if(Date.now()>deadline)throw Error('owned writer did not start');await new Promise(r=>setTimeout(r,10));}}
console.log('SDK真实输出中文🙂');console.error('SDK真实错误输出🦉');
${scenario === 'caller-disconnect' ? 'setInterval(()=>{},1000);' : 'process.exit(0);'}
`, { flag: 'wx' });
    const child = spawn(carrier.executable, [packageRunner, '--run', process.execPath,
      JSON.stringify([script, '--owned-prefix', '含 空格🙂'])], {
      cwd: home, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', bytes => { stdout += bytes; }); child.stderr.on('data', bytes => { stderr += bytes; });
    const row = { scenario, runnerPid: child.pid, passed: false, observations: [] }; report.executions.push(row);
    for (const [emitter, source, events] of [[child, 'runner', ['spawn', 'disconnect', 'exit', 'close', 'error']],
      [child.stdout, 'stdout', ['end', 'close', 'error']], [child.stderr, 'stderr', ['end', 'close', 'error']]]) {
      for (const event of events) emitter.on(event, (...args) => row.observations.push({
        at: new Date().toISOString(), source, event, args: args.map(value => value instanceof Error
          ? { name: value.name, code: value.code, message: value.message } : value) }));
    }
    const closedPromise = new Promise((done, fail) => { child.once('close', (code, signal) => done({ code, signal })); child.once('error', fail); });
    // 普通Node对照已复现主动disconnect缺少close事件；仍要求真实退出、两流EOF和IPC结束全部完成。
    const exitedPromise = new Promise((done, fail) => { child.once('exit', (code, signal) => done({code, signal})); child.once('error', fail); });
    const disconnectedPromise = new Promise(done => child.once('disconnect', done));
    const settledPromise = Promise.all([exitedPromise, finished(child.stdout), finished(child.stderr), disconnectedPromise])
      .then(([result]) => result);
    const deadline = Date.now() + 30000;
    try {
      if (scenario === 'caller-disconnect') {
        while (!stdout.includes('SDK真实输出中文🙂')) {
          assert.equal(child.exitCode, null, stderr); assert.ok(Date.now() < deadline, 'SDK package runner did not launch');
          await delay(25);
        }
        assert.equal(child.connected, true); child.disconnect(); row.callerIpcDisconnected = true;
      }
      let timer;
      const result = await Promise.race([observeDisconnect ? closedPromise : settledPromise, new Promise((_done, fail) => {
        timer = setTimeout(() => fail(new Error('SDK package runner did not settle')), Math.max(0, deadline - Date.now()));
      })]).finally(() => clearTimeout(timer));
      Object.assign(row, result, { stdout, stderr });
      assert.equal(result.signal, null); assert.equal(result.code, scenario === 'caller-disconnect' ? 1 : 0);
      assert.ok(stdout.includes('SDK真实输出中文🙂')); assert.ok(stderr.includes('SDK真实错误输出🦉'));
      const actual = JSON.parse(await readFile(facts)); row.actual = actual;
      assert.equal(actual.cwd, home); assert.equal(actual.custom, '自有环境🙂');
      assert.deepEqual(actual.args, ['--owned-prefix', '含 空格🙂']); assert.equal(actual.privateMarker, undefined);
      assert.equal(alive(child.pid), false); assert.equal(alive(actual.pid), false);
      if (actual.childPid !== undefined) {
        assert.equal(alive(actual.childPid), false);
        const before = await readFile(marks); await delay(300); assert.deepEqual(await readFile(marks), before);
        row.writerStoppedAtSettlement = true;
      }
      row.passed = true;
    } finally {
      row.stdout = stdout; row.stderr = stderr;
      row.observedState = { exitCode: child.exitCode, signalCode: child.signalCode, connected: child.connected,
        runnerAlive: alive(child.pid), stdoutEnded: child.stdout.readableEnded, stderrEnded: child.stderr.readableEnded };
      try { row.actual ??= JSON.parse(await readFile(facts)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (row.actual !== undefined) {
        row.observedState.targetAlive = alive(row.actual.pid);
        if (row.actual.childPid !== undefined) {
          row.observedState.writerAlive = alive(row.actual.childPid);
          try { row.observedState.writerBytes = (await readFile(marks)).length; } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
      }
      // 仅回收本次已创建的runner树；失败清理不计作原结算成功。
      if (!row.passed && Number.isInteger(child.pid) && alive(child.pid)) {
        row.failureCleanupRequested = true;
        child.kill();
        await Promise.race([settledPromise, delay(5000)]);
      }
    }
  }
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, code: error.code, message: error.message };
  process.exitCode = 1;
} finally {
  await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, noIpcRejected: report.noIpcRejected,
    boundaries: report.boundaries.length, executions: report.executions.map(({ scenario, passed, code }) =>
      ({ scenario, passed, code })), failure: report.failure }));
}
