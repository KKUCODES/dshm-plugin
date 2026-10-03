import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { outputRoot } from './prepare.mjs';
import { processJob } from '../../artifacts/compatibility/background-output/native-producer.mjs';

// 独立 Cordis 树使用实际安装包和 Windows 进程，不触碰正在运行的用户 DSH。
const installedRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const installed = path => import(pathToFileURL(resolve(installedRoot, path)).href);
const require = createRequire(resolve(installedRoot, 'apps/cli/package.json'));
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
const { default: Agents } = await installed('packages/core/agent/lib/index.js');
const { Session, SessionId } = await installed('packages/core/session/lib/index.js');
const { default: Jobs } = await installed('packages/jobs/jobs-local/lib/index.js');
const { default: Subprocess } = await installed('packages/subprocess/subprocess-local/lib/index.js');
const { default: Pwsh } = await installed('packages/shell/pwsh-local/lib/index.js');
await build({ entryPoints: ['src/job-control.ts'], bundle: true, packages: 'external', platform: 'node',
  format: 'esm', outfile: resolve(outputRoot, 'native-lifecycle-host.mjs') });
const { JobControl } = await import(pathToFileURL(resolve(outputRoot, 'native-lifecycle-host.mjs')).href);
const report = { at: new Date().toISOString(), installedRoot, errors: [] };
const ctx = new Context(), fibers = [], owners = [], processes = [];
let jobsFiber, currentControl;
async function use(plugin) {
  const fiber = ctx.plugin(plugin, {}); fibers.push(fiber); await fiber.await(); return fiber;
}
async function until(check, label) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw Error(`Timed out: ${label}`);
}
async function owner(label) {
  const scope = await use(() => {}), id = SessionId(`dshm-native-lifecycle-${label}`);
  const agent = { id, session: Session.create(id), ctx: scope.ctx, options: {}, status: 'idle' };
  const unregister = await ctx.agents.register(agent);
  owners.push({ scope, unregister });
  return { agent, scope };
}
async function start(agent, marker) {
  const entry = {};
  processes.push(entry);
  const id = ctx.jobs.start({ kind: 'pwsh', label: `DSHM lifecycle ${marker}`, owner: agent,
    run: () => (entry.hooks = processJob(async signal => {
      entry.process = await ctx.shell.start(ctx.shell.resolve({
        command: `[Console]::Write('${marker}'); Start-Sleep -Seconds 30; [Console]::Write('UNEXPECTED_LATE')`,
        workdir: outputRoot, signal,
      }));
      return entry.process;
    }, process => process.readOutput().delta)) });
  entry.request = { method: 'remote.jobOutput', sessionId: agent.id, jobId: id,
    startedAt: ctx.jobs.get(id, agent).startedAt, generation: currentControl.generation,
    stream: 'stdout', fromByte: 0, maxBytes: 65536 };
  await until(async () => {
    const result = await currentControl.output(entry.request, new AbortController().signal);
    return result.state === 'available' && Buffer.from(result.data, 'base64').toString() === marker;
  }, `${marker} live output`);
  assert.equal(entry.process.status, 'running');
  return entry;
}
try {
  await use(Agents); jobsFiber = await use(Jobs); await use(Subprocess); await use(Pwsh);
  // 与插件相同的服务依赖生命周期；卸载 jobs 必须销毁旧 controller，重载生成新代次。
  const injector = ctx.inject(['jobs', 'agents'], scope => {
    const control = new JobControl(scope); currentControl = control;
    scope.jobs.attachController('dshm-native-lifecycle');
    scope.effect(() => () => { control.dispose(); if (currentControl === control) currentControl = undefined; });
  });
  fibers.push(injector);
  await until(() => currentControl, 'controller injection');
  const first = await owner('owner-dispose'), retained = await owner('unrelated');
  const removedJob = await start(first.agent, 'OWNER_READY');
  const unrelatedJob = await start(retained.agent, 'UNRELATED_READY');
  const sameControl = currentControl;
  await first.scope.dispose();
  assert.equal((await removedJob.hooks.done).status, 'killed');
  assert.notEqual(removedJob.process.status, 'running');
  await assert.rejects(sameControl.output(removedJob.request, new AbortController().signal), /remote_job_(missing|session_closed)/);
  assert.deepEqual(ctx.jobs.list(first.agent), []);
  assert.equal(currentControl, sameControl);
  assert.equal(unrelatedJob.process.status, 'running');
  assert.equal(Buffer.from((await sameControl.output(unrelatedJob.request, new AbortController().signal)).data, 'base64').toString(), 'UNRELATED_READY');
  report.ownerCleanup = { cancelledActualProcess: true, removedRecords: true, rejectedOldRead: true, unrelatedOwnerPreserved: true };

  const oldGeneration = sameControl.generation;
  await jobsFiber.dispose();
  assert.equal((await unrelatedJob.hooks.done).status, 'killed');
  assert.notEqual(unrelatedJob.process.status, 'running');
  await until(() => currentControl === undefined, 'old controller disposal');
  await assert.rejects(sameControl.output(unrelatedJob.request, new AbortController().signal), /remote_job_stale/);
  jobsFiber = await use(Jobs);
  await until(() => currentControl && currentControl.generation !== oldGeneration, 'controller reinjection');
  assert.deepEqual(ctx.jobs.list(retained.agent), []);
  const replacement = await start(retained.agent, 'RELOADED_READY');
  assert.equal(replacement.request.jobId, removedJob.request.jobId, 'Registry restart should exercise reused job id');
  await assert.rejects(currentControl.output(removedJob.request, new AbortController().signal), /remote_job_stale/);
  await assert.rejects(currentControl.output(unrelatedJob.request, new AbortController().signal), /remote_job_stale/);
  assert.equal(Buffer.from((await currentControl.output(replacement.request, new AbortController().signal)).data, 'base64').toString(), 'RELOADED_READY');
  assert.equal(ctx.jobs.get(replacement.request.jobId, retained.agent).reported, false);
  report.serviceReload = { cancelledActualProcess: true, controllerReplaced: true, generationChanged: true,
    reusedIdRejected: true, freshOutputReadable: true, modelCursorUntouched: true };
} catch (error) { report.errors.push(error.stack); process.exitCode = 1; }
finally {
  for (const entry of processes) if (entry.process?.status === 'running') entry.process.kill();
  await Promise.all(processes.map(entry => entry.hooks?.done));
  for (const { scope, unregister } of owners.reverse()) { await scope.dispose(); await unregister(); }
  for (const fiber of fibers.reverse()) await fiber.dispose();
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(outputRoot, 'native-lifecycle-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
