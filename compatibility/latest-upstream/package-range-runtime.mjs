// 隔离发布入口复用已完整构建并实际验证的源码运行器；未知文件不允许覆盖。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { existingInside, replaceFile } from '../background-output/install-runtime.mjs';
import { sourceRoot } from './source-runtime.mjs';

export const packageRangeRuntime = resolve(import.meta.dirname, '../../artifacts/latest-runtime-check');
export const packageRangePayload = resolve(import.meta.dirname, '../../artifacts/latest-package-range-profile-payload');
export const packageRangeBaseline = resolve(packageRangeRuntime, 'package-range-baseline');
const manager = 'node_modules/@deepseek-ai/dsh-plugin-manager';
const sourceCommit = '5badb15009ae1756c3afe0ae0cef1faafc290ccc';
const version = '0.2.1-alpha.1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [
  { local: 'lib/index.js', before: '3817d380364b2775453e876514931ed1d6bdba4f3c30fa27d07dec5024ecce0c' },
  { local: 'lib/types/operations.js', before: '5383d7f6f07a17bec9c5b585e8165a34c10fbad5ad7fb6d16e4a819942b6b486',
    compiled: '6929d3567e68552022eb978ef1b7a852f03c1ee74e63f9fe389d173f2622f5e6' },
  { local: 'lib/types/run-tree.js', before: '3e65f458bd298dd2d3a8e3b48b30d771bb8e60a097bc2e6e924dad647f953e4b',
    compiled: 'e85799ee244eb6ff73bd33df76ef07d48ed3f2393b646f646e4986c2aea4ba1d' },
  { local: 'lib/types/run-tree.d.ts', before: 'd80a136f9217643212976b168db1c64f13c30e1bf135e94d502df564ac455de4',
    compiled: '1164e14bf6d95e806da50e8ba14d656ffa905ee2532fb9653c52fa001119cfea' },
  { local: 'package.json', before: '652bad775cae99900a2711b25c11baa1a5c8b569ca0d37ca9e83745e7b6c87e0' },
];
const baselineExtras = {
  'lib/types/install-spec.js': 'ad8b136cdb7b710609fb4ca1e07dbeb05aba39a096205767f6fbdc352cfa323b',
  'lib/types/failure.js': '144c57fa0f5e7c1fb9d850f97d80d46885e92aaf6cbc4b6180b9797f07de2303',
};
// 这里核验此前封存的普通Node运行器；SDK专用修正由完整源码载荷及SDK载体独立核验。
const bootstrapHash = '8c4ec843bff069c207216b1e65e59cc99e21901ea193c73f12b2e5b3ca093cce';
const runnerSourceHash = '894fe3ef4902ba3685e04f9069b2e9f11e6f357227330a7d0fc8e62bcd133325';
function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length, 2, 'latest_package_range_anchor_mismatch');
  return text.replace(before, after);
}
function wrapBundle(bytes) {
  let text = 'import { packageInvocation, packageRunnerEnvironment } from "./types/run-tree.js";\n' + bytes.toString();
  text = replaceOnce(text,
    'const child = execa(options.command ?? "pnpm", [...options.args ?? [], ...args.map((arg) => anchorPathSpec(arg, context.cwd))], {\n\t\tcwd: dir,\n\t\tenv: environment,',
    'const child = execa(...packageInvocation(options.command ?? "pnpm", [...options.args ?? [], ...args.map((arg) => anchorPathSpec(arg, context.cwd))]), {\n\t\tipc: process.platform === "win32",\n\t\tcwd: dir,\n\t\tenv: packageRunnerEnvironment(environment),');
  text = replaceOnce(text,
    'const repairing = execa(options.command ?? "pnpm", [...options.args ?? [], ...repair], {\n\t\t\t\t\tkillDescendants: true,\n\t\t\t\t\tcwd: dir,\n\t\t\t\t\tenv: environment,',
    'const repairing = execa(...packageInvocation(options.command ?? "pnpm", [...options.args ?? [], ...repair]), {\n\t\t\t\t\tipc: process.platform === "win32",\n\t\t\t\t\tkillDescendants: true,\n\t\t\t\t\tcwd: dir,\n\t\t\t\t\tenv: packageRunnerEnvironment(environment),');
  return Buffer.from(text);
}
function extendManifest(bytes) {
  const metadata = JSON.parse(bytes);
  assert.equal(metadata.name, '@deepseek-ai/dsh-plugin-manager'); assert.equal(metadata.version, version);
  let text = replaceOnce(bytes.toString(), '    "./types": {',
    '    "./runner": {\n      "types": "./lib/types/run-tree.d.ts",\n      "default": "./lib/types/run-tree.js"\n    },\n    "./types": {');
  text = replaceOnce(text, '    "@deepseek-ai/dsh-atomic-write": "0.2.1-alpha.1",',
    '    "@deepseek-ai/dsh-atomic-write": "0.2.1-alpha.1",\n    "@deepseek-ai/dsh-win32-process": "0.2.1-alpha.1",');
  return Buffer.from(text);
}
async function payload() {
  assert.equal(hash(await readFile(resolve(import.meta.dirname, 'package-runner-source.ts'))), runnerSourceHash);
  const manifest = JSON.parse(await readFile(resolve(packageRangePayload, 'manifest.json')));
  assert.equal(manifest.revision, 'explicit-source-tsconfig');
  assert.equal(manifest.version, version); assert.equal(manifest.sourceCommit, sourceCommit);
  assert.equal(manifest.runnerSourceHash, runnerSourceHash); assert.equal(manifest.files.length, files.length);
  const entries = [];
  for (const [index, file] of files.entries()) {
    const row = manifest.files[index]; assert.equal(row.local, file.local); assert.equal(row.before, file.before);
    const before = await readFile(await existingInside(packageRangePayload, 'original/' + file.local));
    const after = await readFile(await existingInside(packageRangePayload, 'patched/' + file.local));
    assert.equal(hash(before), file.before); assert.equal(hash(after), row.after);
    if (file.compiled) assert.equal(row.after, file.compiled);
    else assert.deepEqual(after, file.local === 'package.json' ? extendManifest(before) : wrapBundle(before));
    entries.push({ ...row, beforeBytes: before, afterBytes: after });
  }
  assert.equal(hash(await readFile(resolve(packageRangePayload, 'node-bootstrap.mjs'))), bootstrapHash);
  return { manifest, entries };
}

/** 一次生成后排他封存；后续启动只核验，不再依赖仍被打补丁的源码检出。 */
export async function prepareLatestPackageRangePayload() {
  let exists = true;
  try { await access(resolve(packageRangePayload, 'manifest.json')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; exists = false; }
  if (exists) return (await payload()).manifest;
  const { verifyInstalledSource } = await import('./source-host.mjs');
  const source = await verifyInstalledSource(); assert.equal(source.sourceCommit, sourceCommit); assert.equal(source.files, 36);
  assert.equal(hash(await readFile(resolve(import.meta.dirname, 'package-runner-source.ts'))), runnerSourceHash);
  const ready = JSON.parse(await readFile(resolve(packageRangeRuntime, 'latest-package-range-profile-source-ready-lease.json')));
  assert.equal(ready.state, 'ready'); assert.equal(ready.files, 36);
  assert.equal(ready.sourceCommit, sourceCommit); assert.deepEqual(ready.patchedClientArtifacts, source.clientArtifacts);
  const profile = JSON.parse(await readFile(resolve(packageRangeRuntime, 'latest-source-runner-profile-resolution-fixed.json')));
  assert.equal(profile.passed, true); assert.equal(profile.actualInvocation, true);
  assert.equal(profile.runnerSourceHash, runnerSourceHash); assert.equal(profile.sourceCommit, sourceCommit);
  for (const name of ['package-range-source/actual-report-attempt-8.json', 'package-range-source/original-regressions-attempt-2.json',
    'package-host-only/source-installed-native-installed-attempt-2.json', 'package-host-only/source-installed-native-installed-cancel-attempt-2.json',
    'package-host-only/source-installed-native-installed-timeout-attempt-2.json'])
    assert.equal(JSON.parse(await readFile(resolve(packageRangeRuntime, name))).passed, true);
  const entries = [];
  for (const file of files) {
    const before = await readFile(await existingInside(packageRangeRuntime, manager + '/' + file.local));
    assert.equal(hash(before), file.before, 'latest_package_range_previous_state_mismatch');
    let after;
    if (file.compiled) {
      after = await readFile(resolve(sourceRoot, 'packages/boot/plugin-manager', file.local));
      assert.equal(hash(after), file.compiled, 'latest_package_range_compiled_source_mismatch');
    } else after = file.local === 'package.json' ? extendManifest(before) : wrapBundle(before);
    entries.push({ ...file, beforeBytes: before, afterBytes: after });
  }
  const bootstrap = await readFile(resolve(sourceRoot, 'python/sdk-runtime/runtime-bootstrap.mjs'));
  assert.equal(hash(bootstrap), bootstrapHash);
  const extras = [];
  for (const [local, expected] of Object.entries(baselineExtras)) {
    const bytes = await readFile(await existingInside(packageRangeRuntime, manager + '/' + local));
    assert.equal(hash(bytes), expected); extras.push({ local, bytes });
  }
  await mkdir(packageRangePayload, { recursive: true }); await mkdir(packageRangeBaseline, { recursive: true });
  await existingInside(resolve(import.meta.dirname, '../../artifacts'), 'latest-package-range-profile-payload');
  await existingInside(packageRangeRuntime, 'package-range-baseline');
  for (const file of entries) {
    for (const [kind, bytes] of [['original', file.beforeBytes], ['patched', file.afterBytes]]) {
      const target = resolve(packageRangePayload, kind, file.local); await mkdir(dirname(target), { recursive: true });
      await existingInside(packageRangePayload, relative(packageRangePayload, dirname(target)).replaceAll('\\', '/'));
      await writeFile(target, bytes, { flag: 'wx' });
    }
  }
  for (const file of [...entries.filter(row => ['package.json', 'lib/types/operations.js', 'lib/types/run-tree.js'].includes(row.local))
    .map(row => ({ local: row.local, bytes: row.beforeBytes })), ...extras]) {
    const target = resolve(packageRangeBaseline, file.local); await mkdir(dirname(target), { recursive: true });
    if (dirname(target) !== packageRangeBaseline)
      await existingInside(packageRangeBaseline, relative(packageRangeBaseline, dirname(target)).replaceAll('\\', '/'));
    // 原基线已封存时仅核对；新修订不能覆盖旧版的原字节。
    let original;
    try { original = await readFile(await existingInside(packageRangeBaseline, file.local)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (original !== undefined) assert.deepEqual(original, file.bytes, 'latest_package_range_baseline_changed');
    else await writeFile(target, file.bytes, { flag: 'wx' });
  }
  await writeFile(resolve(packageRangePayload, 'node-bootstrap.mjs'), bootstrap, { flag: 'wx' });
  const manifest = { version, sourceCommit, revision: 'explicit-source-tsconfig', runnerSourceHash, isolatedCandidateOnly: true,
    files: entries.map(file => ({ local: file.local, before: file.before, after: hash(file.afterBytes) })) };
  await writeFile(resolve(packageRangePayload, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  await payload(); return manifest;
}

/** 全量预检后一起切换Host bundle、operations、运行器及声明；失败只恢复本次写入。 */
export async function installLatestPackageRange(action, targetDirectory = packageRangeRuntime) {
  assert.ok(['plan', 'apply', 'restore'].includes(action));
  const root = await realpath(resolve(targetDirectory)), artifacts = await realpath(resolve(import.meta.dirname, '../../artifacts'));
  const rel = relative(artifacts, root);
  assert.ok(!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..\\') && root !== await realpath(sourceRoot),
    'latest_package_range_isolated_target_required');
  const { manifest, entries } = await payload();
  for (const name of ['dsh-plugin-manager', 'dsh-win32-process']) {
    const metadata = JSON.parse(await readFile(await existingInside(root, 'node_modules/@deepseek-ai/' + name + '/package.json')));
    assert.equal(metadata.name, '@deepseek-ai/' + name); assert.equal(metadata.version, version);
  }
  const targets = [];
  for (const file of entries) {
    const target = await existingInside(root, manager + '/' + file.local), current = await readFile(target);
    const currentHash = hash(current);
    assert.ok([file.before, file.after].includes(currentHash), 'latest_package_range_unknown_edit: ' + file.local);
    targets.push({ ...file, target, current });
  }
  const report = { action, targetRoot: root, patch: 'latest-plugin-install-cancel', nativeRange: true,
    sourceCommit, version, isolatedCandidateOnly: true, files: manifest.files,
    original: targets.filter(file => hash(file.current) === file.before).length,
    patched: targets.filter(file => hash(file.current) === file.after).length, written: 0 };
  if (action === 'plan') return report;
  const written = [], desired = action === 'apply' ? 'afterBytes' : 'beforeBytes';
  try {
    for (const file of targets) {
      assert.deepEqual(await readFile(file.target), file.current, 'latest_package_range_concurrent_change');
      if (file.current.equals(file[desired])) continue;
      await replaceFile(file.target, file[desired]); written.push(file);
    }
    for (const file of targets) assert.deepEqual(await readFile(file.target), file[desired]);
  } catch (error) {
    const failures = [];
    for (const file of written.reverse()) try {
      assert.deepEqual(await readFile(file.target), file[desired]); await replaceFile(file.target, file.current);
    } catch (failure) { failures.push(failure); }
    if (failures.length) throw new AggregateError([error, ...failures], 'Package range rollback needs attention');
    throw error;
  }
  report.written = written.length; return report;
}

/** 原启动准备函数在新组合下只核验；不会将已装入的运行器降级为旧两文件补丁。 */
export async function readInstalledLatestPackageRange() {
  try { await access(resolve(packageRangePayload, 'manifest.json')); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
  const plan = await installLatestPackageRange('plan');
  if (plan.original === plan.files.length) return undefined;
  assert.equal(plan.patched, plan.files.length, 'latest_package_range_partial_state');
  return plan;
}
