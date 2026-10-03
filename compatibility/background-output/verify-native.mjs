import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { outputRoot } from './prepare.mjs';
import { processJob } from '../../artifacts/compatibility/background-output/native-producer.mjs';

const installedRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const installed = path => import(pathToFileURL(resolve(installedRoot, path)).href);
const require = createRequire(resolve(installedRoot, 'apps/cli/package.json'));
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
const { default: Agents } = await installed('packages/core/agent/lib/index.js');
const { Session, SessionId } = await installed('packages/core/session/lib/index.js');
const { default: Jobs } = await installed('packages/jobs/jobs-local/lib/index.js');
const { default: Subprocess } = await installed('packages/subprocess/subprocess-local/lib/index.js');
const { default: Pwsh } = await installed('packages/shell/pwsh-local/lib/index.js');
const report = { at: new Date().toISOString(), installedRoot, errors: [] };
const ctx = new Context(); const fibers = [];
let offAgent, offController, offNotice, shellProcess, hooks;
try {
  for (const plugin of [Agents, Jobs, Subprocess, Pwsh]) {
    const fiber = ctx.plugin(plugin, {}); fibers.push(fiber); await fiber.await();
  }
  const scope = ctx.plugin(() => {}); fibers.push(scope); await scope.await();
  const id = SessionId('dshm-independent-native-test');
  const agent = { id, session: Session.create(id), ctx: scope.ctx, options: {}, status: 'idle' };
  offAgent = await ctx.agents.register(agent); offController = ctx.jobs.attachController('native-test');
  let notices = 0;
  offNotice = ctx.jobs.onJobDone(snapshot => { notices++; assert.equal(snapshot.reported, false); });
  const start = async signal => {
    shellProcess = await ctx.shell.start(ctx.shell.resolve({
      command: "[Console]::Write('START🙂中文'); Start-Sleep -Milliseconds 1200; [Console]::Error.Write('错误流'); [Console]::Write('END完成')",
      workdir: outputRoot, signal,
    }));
    return shellProcess;
  };
  const jobId = ctx.jobs.start({ kind: 'pwsh', label: 'DSHM independent output native test', owner: agent,
    run: () => (hooks = processJob(start, process => process.readOutput().delta)) });
  const decoder = { stdout: new TextDecoder(), stderr: new TextDecoder() };
  const offsets = { stdout: 0, stderr: 0 }, text = { stdout: '', stderr: '' };
  let modelFirst;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    for (const stream of ['stdout', 'stderr']) {
      const read = ctx.jobs.readOutputBytes(jobId, { stream, fromByte: offsets[stream], maxBytes: 2 }, agent);
      if (read.output.state === 'unsupported') throw Error('Installed runtime did not expose independent output');
      if (read.output.state === 'available') {
        assert.equal(read.output.lossy, false);
        text[stream] += decoder[stream].decode(read.output.bytes, { stream: true }); offsets[stream] = read.output.nextOffset;
      }
    }
    if (text.stdout === 'START🙂中文' && modelFirst === undefined) {
      assert.equal(shellProcess.status, 'running', 'Output must be visible before process exit');
      modelFirst = ctx.jobs.read(jobId, agent).text;
      assert.equal(modelFirst, 'START🙂中文'); assert.equal(ctx.jobs.get(jobId, agent).reported, false);
      report.liveOutputBeforeExit = true;
    }
    if (text.stdout === 'START🙂中文END完成' && text.stderr === '错误流' && ctx.jobs.get(jobId, agent).status === 'completed') break;
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  assert.equal(report.liveOutputBeforeExit, true);
  assert.equal(text.stdout + decoder.stdout.decode(), 'START🙂中文END完成');
  assert.equal(text.stderr + decoder.stderr.decode(), '错误流');
  await hooks.done; await Promise.resolve();
  assert.equal(notices, 1); assert.equal(ctx.jobs.get(jobId, agent).reported, false);
  assert.equal(ctx.jobs.read(jobId, agent).text, 'END完成\n[stderr]\n错误流');
  assert.equal(ctx.jobs.get(jobId, agent).reported, true);
  const history = ctx.jobs.readOutputBytes(jobId, { stream: 'stdout', fromByte: 0, maxBytes: 65536 }, agent);
  assert.equal(Buffer.from(history.output.bytes).toString(), 'START🙂中文END完成');
  report.independentHistory = true; report.modelCursorPreserved = true; report.completionNoticePreserved = true;
  report.exitCode = shellProcess.exitCode;
  offNotice(); offNotice = undefined;
  const stopped = ctx.jobs.start({ kind: 'pwsh', label: 'DSHM independent output cancellation test', owner: agent,
    run: () => (hooks = processJob(async signal => {
      shellProcess = await ctx.shell.start(ctx.shell.resolve({
        command: "[Console]::Write('STOP_READY'); Start-Sleep -Seconds 30; [Console]::Write('UNEXPECTED_LATE')",
        workdir: outputRoot, signal,
      })); return shellProcess;
    }, process => process.readOutput().delta)) });
  const stopDeadline = Date.now() + 15000;
  let ready = false;
  while (Date.now() < stopDeadline) {
    const read = ctx.jobs.readOutputBytes(stopped, { stream: 'stdout', fromByte: 0, maxBytes: 64 }, agent).output;
    if (read.state === 'available' && Buffer.from(read.bytes).toString() === 'STOP_READY') { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.equal(ready, true);
  assert.equal(ctx.jobs.kill(stopped, agent, 'DSHM native verification cleanup'), 'requested');
  await hooks.done; await Promise.resolve();
  assert.equal(ctx.jobs.get(stopped, agent).status, 'killed');
  assert.equal(Buffer.from(ctx.jobs.readOutputBytes(stopped, { stream: 'stdout', fromByte: 0, maxBytes: 64 }, agent).output.bytes).toString(), 'STOP_READY');
  report.nativeCancellation = true;
} catch (error) { report.errors.push(error.stack); process.exitCode = 1; }
finally {
  if (shellProcess?.status === 'running') shellProcess.kill();
  if (hooks) await hooks.done;
  offNotice?.(); offController?.(); await offAgent?.();
  for (const fiber of fibers.reverse()) await fiber.dispose();
  await writeFile(resolve(outputRoot, 'native-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
