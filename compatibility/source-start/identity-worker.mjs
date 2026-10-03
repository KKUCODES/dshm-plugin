import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { Context } from '@deepseek-ai/cordis';
import * as earlyTools from '@deepseek-ai/dsh-tools';
import { createProfileResolutionGeneration, healProfilesModuleFallback } from '@deepseek-ai/dsh-app-boot';

// This text runs from the installation root, as does the source CLI command.
const root = process.cwd();
let sourceHook;
if (process.env.DSHM_IDENTITY_MODE === 'canonical-all') {
  const { registerSourceResolution } = await import(process.env.DSHM_IDENTITY_REGISTER);
  sourceHook = registerSourceResolution(root);
}
const home = process.env.DSHM_IDENTITY_HOME;
const profileDir = resolve(home, 'profiles/probe');
await mkdir(profileDir, { recursive: true });
const entry = resolve(profileDir, 'entry.mjs');
const externalDir = resolve(profileDir, 'node_modules/dshm-identity-probe');
await mkdir(externalDir, { recursive: true });
await writeFile(resolve(externalDir, 'package.json'), JSON.stringify({ name: 'dshm-identity-probe', version: '1.0.0', type: 'module', exports: './index.js' }));
await writeFile(resolve(externalDir, 'index.js'), `export * from '@deepseek-ai/dsh-tools';\n`);
await writeFile(resolve(externalDir, 'entry.cjs'), `module.exports = require('@deepseek-ai/dsh-tools');\n`);
const mobileDir = resolve(profileDir, 'node_modules/@dsh-mobile/plugin');
await mkdir(resolve(mobileDir, 'dist'), { recursive: true });
for (const file of ['package.json', 'dist/index.js']) {
  await writeFile(resolve(mobileDir, file), await readFile(resolve(process.env.DSHM_PLUGIN_ROOT, file)));
}
const pinnedDir = resolve(profileDir, 'node_modules/dshm-pinned-probe');
const pinnedTools = resolve(pinnedDir, 'node_modules/@deepseek-ai/dsh-tools');
await mkdir(resolve(pinnedTools, 'lib'), { recursive: true });
await writeFile(resolve(pinnedDir, 'package.json'), JSON.stringify({ name: 'dshm-pinned-probe', version: '1.0.0', type: 'module' }));
await writeFile(resolve(pinnedTools, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-tools', version: '0.0.1', type: 'module', exports: './lib/index.js' }));
await writeFile(resolve(pinnedTools, 'lib/index.js'), `export const pinned = 'DSHM_IDENTITY_PINNED';\n`);
await writeFile(resolve(pinnedDir, 'index.js'), `export * from '@deepseek-ai/dsh-tools';\n`);
await writeFile(entry, `export * from '@deepseek-ai/dsh-tools';
export { default as SystemPrompt } from '@deepseek-ai/dsh-system-prompt';
export * as invariant from '@deepseek-ai/dsh-tools/invariant';
export const resolved = import.meta.resolve('@deepseek-ai/dsh-tools');\n`);
const generation = await (process.env.DSHM_IDENTITY_MODE === 'link' ? healProfilesModuleFallback : createProfileResolutionGeneration)({
  installAnchor: resolve(root, 'apps/cli/package.json'), home,
  profile: { name: 'probe', dir: profileDir, layers: [], patchPath: resolve(profileDir, 'patch.yml'), patches: [] },
});
const { installProfileResolution, registerWorkerResolution } = await import(pathToFileURL(resolve(root,
  'packages/boot/app-boot/src/profile-resolution/resolver.ts')).href);
const registration = process.env.DSHM_IDENTITY_MODE === 'link' ? undefined : installProfileResolution(generation);
const releaseWorkerResolution = registerWorkerResolution(generation);
const ctx = new Context();
const result = { mode: process.env.DSHM_IDENTITY_MODE, earlyPath: import.meta.resolve('@deepseek-ai/dsh-tools') };
try {
  const scopedTools = await import(pathToFileURL(entry).href);
  result.profilePath = scopedTools.resolved;
  result.sameSymbol = earlyTools.TOOL_RUNTIME_SCHEDULER === scopedTools.TOOL_RUNTIME_SCHEDULER;
  result.sameClass = earlyTools.ToolRuntime === scopedTools.ToolRuntime;
  const invariant = await import(process.env.DSHM_IDENTITY_MODE === 'compiled'
    ? pathToFileURL(resolve(root, 'packages/core/tools/lib/invariant.js')).href : '@deepseek-ai/dsh-tools/invariant');
  result.sameSubpath = scopedTools.invariant === invariant;
  result.pinned = (await import(pathToFileURL(resolve(pinnedDir, 'index.js')).href)).pinned;
  const external = await import(pathToFileURL(resolve(externalDir, 'index.js')).href);
  result.externalSameSymbol = earlyTools.TOOL_RUNTIME_SCHEDULER === external.TOOL_RUNTIME_SCHEDULER;
  const mobile = await import(pathToFileURL(resolve(mobileDir, 'dist/index.js')).href);
  result.mobilePlugin = { name: mobile.name, apply: typeof mobile.apply };
  if (['canonical-preload', 'original-source', 'compiled'].includes(result.mode)) {
    const workerPath = resolve(externalDir, 'worker.mjs');
    const earlyPath = pathToFileURL(resolve(root, `packages/core/tools/${result.mode === 'compiled' ? 'lib/index.js' : 'src/index.ts'}`)).href;
    const bootstrap = pathToFileURL(resolve(root, 'packages/boot/app-boot/lib/worker/profile-resolution-bootstrap.js')).href;
    await writeFile(workerPath, `import {parentPort} from 'node:worker_threads';
import * as early from ${JSON.stringify(earlyPath)};
import ${JSON.stringify(bootstrap)};
const scoped = await import('./index.js');
parentPort.postMessage({sameSymbol:early.TOOL_RUNTIME_SCHEDULER===scoped.TOOL_RUNTIME_SCHEDULER,sameClass:early.ToolRuntime===scoped.ToolRuntime});\n`);
    const execArgv = [];
    for (let i = 0; i < process.execArgv.length; i++) if (process.execArgv[i] === '--import') execArgv.push('--import', process.execArgv[++i]);
    const worker = new Worker(pathToFileURL(workerPath), { execArgv });
    try {
      result.worker = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Worker identity probe timed out')), 15000);
        worker.once('message', value => { clearTimeout(timer); resolve(value); });
        worker.once('error', error => { clearTimeout(timer); reject(error); });
        worker.once('exit', code => { if (code !== 0) { clearTimeout(timer); reject(Error(`Worker exit ${code}`)); } });
      });
    } finally { await worker.terminate(); }
  }
  try {
    const cjsTools = createRequire(resolve(externalDir, 'entry.cjs'))('@deepseek-ai/dsh-tools');
    result.cjsSameSymbol = earlyTools.TOOL_RUNTIME_SCHEDULER === cjsTools.TOOL_RUNTIME_SCHEDULER;
  } catch (error) { result.cjsError = error.message; }
  await ctx.plugin(scopedTools.SystemPrompt, {}).await();
  await ctx.plugin(scopedTools.ToolRuntime, {}).await();
  result.profilePrepare = typeof ctx.tools[scopedTools.TOOL_RUNTIME_SCHEDULER].prepare;
  ctx.tools.register(scopedTools.defineTool({
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
        ? await scheduler.finalize(prepared.exec, dispatched.result)
        : scheduler.finish(prepared.exec, dispatched.result);
      result.toolValue = finished.value;
    }
  }
  catch (error) { result.symptom = error.message; }
} finally {
  await ctx.fiber.dispose();
  registration?.dispose();
  releaseWorkerResolution();
  sourceHook?.deregister();
}
console.log(JSON.stringify(result));
