// 独立普通Node对照：明确断开IPC后，分别记录进程退出和标准流结束，不调用SDK或模型。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { finished } from 'node:stream/promises';
import { resolve } from 'node:path';

assert.equal(process.argv.length, 2);
const directory = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const report = { at: new Date().toISOString(), nodeVersion: process.version, sdkUsed: false,
  modelRequests: 0, passed: false, events: [] };
const child = spawn(process.execPath, ['--input-type=module', '-e',
  "process.once('disconnect',()=>{process.exitCode=1});console.log('IPC_CONTROL_READY');console.error('IPC_CONTROL_STDERR');"],
{ cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
report.pid = child.pid;
let stdout = '', stderr = '';
child.stdout.on('data', bytes => { stdout += bytes; });
child.stderr.on('data', bytes => { stderr += bytes; });
for (const event of ['spawn', 'disconnect', 'exit', 'close', 'error']) child.on(event, (...args) =>
  report.events.push({ at: new Date().toISOString(), event,
    args: args.map(value => value instanceof Error ? value.message : value) }));
const exited = new Promise((done, fail) => { child.once('exit', (code, signal) => done({code, signal})); child.once('error', fail); });
const completed = Promise.all([exited, finished(child.stdout), finished(child.stderr)]);
const delay = ms => new Promise(done => setTimeout(done, ms));
let timer;
try {
  const deadline = Date.now() + 10000;
  while (!stdout.includes('IPC_CONTROL_READY')) { assert.ok(Date.now() < deadline); await delay(10); }
  child.disconnect();
  const [result] = await Promise.race([completed, new Promise((_done, fail) => {
    timer = setTimeout(() => fail(new Error('ordinary Node IPC control did not settle')), 10000);
  })]);
  Object.assign(report, result); assert.equal(result.code, 1); assert.equal(result.signal, null);
  await delay(300);
  assert.ok(child.stdout.readableEnded && child.stderr.readableEnded);
  assert.equal(child.connected, false);
  assert.throws(() => process.kill(child.pid, 0), { code: 'ESRCH' });
  assert.ok(stderr.includes('IPC_CONTROL_STDERR'));
  report.closeEmitted = report.events.some(row => row.event === 'close');
  report.streamsEnded = true; report.processDead = true; report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally {
  clearTimeout(timer); report.stdout = stdout; report.stderr = stderr;
  if (child.exitCode === null) child.kill();
  await writeFile(resolve(directory, 'node-disconnect-close-control-attempt-9.json'), JSON.stringify(report, null, 2), {flag:'wx'});
  console.log(JSON.stringify(report));
}
