import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { Context } from '@deepseek-ai/cordis';
import * as earlyTools from '@deepseek-ai/dsh-tools';
import { createRuntimeResolution } from '@deepseek-ai/dsh-app-boot';
import * as earlyBoot from '@deepseek-ai/dsh-app-boot';
import { ModuleLoader } from '@deepseek-ai/cordis-plugin-loader';

// 由验证器在固定源码根目录执行；只创建独立 profile，不读日常用户配置。
const root = process.cwd();
const home = process.env.DSHM_IDENTITY_HOME;
const profileDir = resolve(home, 'profiles/probe');
const externalDir = resolve(profileDir, 'node_modules/dshm-identity-probe');
await mkdir(externalDir, { recursive: true });
await writeFile(resolve(externalDir, 'package.json'), JSON.stringify({ name: 'dshm-identity-probe', version: '1.0.0', type: 'module', exports: './index.js' }));
await writeFile(resolve(externalDir, 'index.js'), "export * from '@deepseek-ai/dsh-tools';\n");
await writeFile(resolve(externalDir, 'entry.cjs'), "module.exports = require('@deepseek-ai/dsh-tools');\n");
const entry = resolve(profileDir, 'entry.mjs');
await writeFile(entry, `export * from '@deepseek-ai/dsh-tools';
export { default as SystemPrompt } from '@deepseek-ai/dsh-system-prompt';
export * as presentation from '@deepseek-ai/dsh-tools/presentation';
export const resolved = import.meta.resolve('@deepseek-ai/dsh-tools');\n`);
const pinnedDir = resolve(profileDir, 'node_modules/dshm-pinned-probe');
const pinnedTools = resolve(pinnedDir, 'node_modules/@deepseek-ai/dsh-tools');
await mkdir(resolve(pinnedTools, 'lib'), { recursive: true });
await writeFile(resolve(pinnedDir, 'package.json'), JSON.stringify({ name: 'dshm-pinned-probe', version: '1.0.0', type: 'module' }));
await writeFile(resolve(pinnedTools, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-tools', version: '0.0.1', type: 'module', exports: './lib/index.js' }));
await writeFile(resolve(pinnedTools, 'lib/index.js'), "export const pinned = 'DSHM_IDENTITY_PINNED';\n");
await writeFile(resolve(pinnedDir, 'index.js'), "export * from '@deepseek-ai/dsh-tools';\n");
const mobileDir = resolve(profileDir, 'node_modules/@dsh-mobile/plugin');
await mkdir(resolve(mobileDir, 'dist'), { recursive: true });
for (const file of ['package.json', 'dist/index.js'])
  await writeFile(resolve(mobileDir, file), await readFile(resolve(process.env.DSHM_IDENTITY_CANDIDATE, file)));
const generation = await createRuntimeResolution({
  installAnchor: resolve(root, 'apps/cli/package.json'), home,
  profile: { name: 'probe', dir: profileDir, layers: [], patchPath: resolve(profileDir, 'patch.yml'), patches: [], skippedBundles: [] },
});
const { installRuntimeInterception, registerWorkerResolution } = await import(pathToFileURL(resolve(root,
  'packages/boot/app-boot/src/profile-resolution/resolver.ts')).href);
const registration = installRuntimeInterception(generation);
const releaseWorker = registerWorkerResolution(generation);
const ctx = new Context();
const result = { mode: process.env.DSHM_IDENTITY_MODE, earlyPath: import.meta.resolve('@deepseek-ai/dsh-tools') };
try {
  const scoped = await import(pathToFileURL(entry).href);
  result.profilePath = scoped.resolved;
  result.sameSymbol = earlyTools.TOOL_RUNTIME_SCHEDULER === scoped.TOOL_RUNTIME_SCHEDULER;
  result.sameClass = earlyTools.ToolRuntime === scoped.ToolRuntime;
  result.sameSubpath = scoped.presentation === await import('@deepseek-ai/dsh-tools/presentation');
  const external = await import(pathToFileURL(resolve(externalDir, 'index.js')).href);
  result.externalSameSymbol = earlyTools.TOOL_RUNTIME_SCHEDULER === external.TOOL_RUNTIME_SCHEDULER;
  result.pinned = (await import(pathToFileURL(resolve(pinnedDir, 'index.js')).href)).pinned;
  const mobile = await import(pathToFileURL(resolve(mobileDir, 'dist/index.js')).href);
  result.mobilePlugin = { name: mobile.name, apply: typeof mobile.apply };
  const nativeBoot = await ModuleLoader.fromInternal().import('@deepseek-ai/dsh-app-boot', pathToFileURL(resolve(profileDir, 'package.json')).href, {});
  result.hostBootSameReconcile = nativeBoot.reconcileProfilePatches === earlyBoot.reconcileProfilePatches;
  result.hostBootSameResolution = nativeBoot.createRuntimeResolution === earlyBoot.createRuntimeResolution;
  try {
    const cjs = createRequire(resolve(externalDir, 'entry.cjs'))('@deepseek-ai/dsh-tools');
    result.cjsSameSymbol = earlyTools.TOOL_RUNTIME_SCHEDULER === cjs.TOOL_RUNTIME_SCHEDULER;
    result.cjsSameClass = earlyTools.ToolRuntime === cjs.ToolRuntime;
  } catch (error) { result.cjsError = error.message; }
  const workerPath = resolve(externalDir, 'worker.mjs');
  const sourceTools = pathToFileURL(resolve(root, 'packages/core/tools/src/index.ts')).href;
  const bootstrap = pathToFileURL(resolve(root, 'packages/boot/app-boot/lib/worker/profile-resolution-bootstrap.js')).href;
  await writeFile(workerPath, `import {parentPort} from 'node:worker_threads';
import * as early from ${JSON.stringify(sourceTools)};
import ${JSON.stringify(bootstrap)};
import {createRequire} from 'node:module';
const scoped = await import('./index.js');
const cjs = createRequire(import.meta.url)('@deepseek-ai/dsh-tools');
parentPort.postMessage({sameSymbol:early.TOOL_RUNTIME_SCHEDULER===scoped.TOOL_RUNTIME_SCHEDULER,
sameClass:early.ToolRuntime===scoped.ToolRuntime,cjsSameSymbol:early.TOOL_RUNTIME_SCHEDULER===cjs.TOOL_RUNTIME_SCHEDULER});\n`);
  const execArgv = [];
  for (let i = 0; i < process.execArgv.length; i++)
    if (process.execArgv[i] === '--import') execArgv.push('--import', process.execArgv[++i]);
  const worker = new Worker(pathToFileURL(workerPath), { execArgv });
  try {
    result.worker = await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(Error('source_identity_worker_timeout')), 15000);
      worker.once('message', value => { clearTimeout(timer); done(value); });
      worker.once('error', error => { clearTimeout(timer); reject(error); });
      worker.once('exit', code => { clearTimeout(timer); reject(Error(`source_identity_worker_exit_${code}`)); });
    });
  } catch (error) { result.workerError = error.message; }
  finally { await worker.terminate(); }
  await ctx.plugin(scoped.SystemPrompt, {}).await();
  await ctx.plugin(scoped.ToolRuntime, {}).await();
  result.profilePrepare = typeof ctx.tools[scoped.TOOL_RUNTIME_SCHEDULER].prepare;
  ctx.tools.register(scoped.defineTool({
    name: 'dshm_identity_echo', description: 'Isolated fixed-value identity check', parameters: {},
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute: async () => 'DSHM_IDENTITY_OK',
  }));
  try {
    const scheduler = ctx.tools[earlyTools.TOOL_RUNTIME_SCHEDULER];
    result.earlyPrepare = typeof scheduler.prepare;
    const prepared = await scheduler.prepare({ signal: new AbortController().signal, callId: 'dshm-identity', name: 'dshm_identity_echo', arguments: {} });
    result.prepared = prepared.kind;
    if (prepared.kind === 'dispatch') {
      const dispatched = await scheduler.dispatch(prepared.exec);
      const finished = dispatched.kind === 'post-result'
        ? await scheduler.finalize(prepared.exec, dispatched.result) : scheduler.finish(prepared.exec, dispatched.result);
      result.toolValue = finished.value;
    }
  } catch (error) { result.symptom = error.message; }
} finally {
  await ctx.fiber.dispose(); registration.dispose(); releaseWorker();
}
console.log(JSON.stringify(result));
