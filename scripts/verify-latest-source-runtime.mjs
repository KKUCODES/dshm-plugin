import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installSourceRuntime, prepareSourceRuntime, sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(sourceRoot, 'package.json'));
const git = (...args) => execFileSync('git', args, { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim();
assert.equal(git('status', '--porcelain'), '');
const manifest = await prepareSourceRuntime();
const originals = await Promise.all(manifest.files.map(file => readFile(resolve(sourceRoot, file.path))));
const unitsOnly = process.argv.includes('--units-only');
const env = { DSHM_LATEST_SOURCE_ROOT: sourceRoot, DSHM_SOURCE_ROOT: sourceRoot, TSX_TSCONFIG_PATH: resolve(sourceRoot, 'tsconfig.json'), DSH_TELEMETRY_DISABLED: '1' };
for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE'])
  if (process.env[key] !== undefined) env[key] = process.env[key];
const report = { at: new Date().toISOString(), sourceCommit: manifest.sourceCommit, patches: manifest.patches,
  scope: unitsOnly ? 'source-units-install-restore' : 'source-types-and-units-install-restore',
  files: manifest.files.map(({ path, before, after }) => ({ path, before, after })), passed: false, stages: [] };
const run = async (name, args, cwd) => {
  const started = Date.now();
  const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', value => { output += value; }); child.stderr.on('data', value => { output += value; });
  const timer = setTimeout(() => child.kill(), 180000);
  try {
    const code = await new Promise((done, reject) => { child.once('error', reject); child.once('close', done); });
    await writeFile(resolve(outputRoot, `${name}.log`), output);
    report.stages.push({ name, code, elapsedMs: Date.now() - started });
    if (code !== 0) throw Error(`latest_source_stage_failed: ${name}`);
  } finally { clearTimeout(timer); }
};
// 两个原配置分别运行，释放Host编译内存后再检查Client；不减少项目引用范围。
const typecheck = async prefix => {
  for (const config of ['host', 'client'])
    await run(`${prefix}-${config}-typecheck`, [require.resolve('typescript/bin/tsc'), '-b', `tsconfig.${config}.json`], sourceRoot);
};
try {
  report.apply = await installSourceRuntime('apply', sourceRoot);
  assert.equal((await installSourceRuntime('apply', sourceRoot)).written, 0);
  if (!unitsOnly) await typecheck('patched');
  await run('source-unit', ['--import', pathToFileURL(require.resolve('tsx/esm')).href, '--import', pathToFileURL(resolve(root, 'compatibility/source-start/preload-probe.mjs')).href,
    '--test', 'tests/latest-pending-notifications.test.mjs', 'tests/latest-preset-archive.test.mjs', 'tests/latest-model-discovery.test.mjs', 'tests/latest-client-entries.test.mjs', 'tests/latest-cordis-client-lifetime.test.mjs', 'tests/latest-cordis-scopes.test.mjs', 'tests/latest-command-output.test.mjs', 'tests/latest-tool-cancellation.test.mjs', 'tests/latest-ptc-process.test.mjs'], root);
  report.passed = true;
} catch (error) { report.error = error.message; throw error; }
finally {
  try {
    report.restore = await installSourceRuntime('restore', sourceRoot);
    assert.equal((await installSourceRuntime('restore', sourceRoot)).written, 0);
    for (const [index, file] of manifest.files.entries()) assert.deepEqual(await readFile(resolve(sourceRoot, file.path)), originals[index]);
    assert.equal(git('status', '--porcelain'), '');
    report.restoredOriginalBytes = true;
    if (!unitsOnly) await typecheck('restored');
  } catch (error) {
    report.passed = false;
    report.restoreError = error.message;
    throw error;
  } finally {
    // 恢复后的类型检查也可能失败，失败报告必须保留，不能留下上一轮的绿色结果。
    await writeFile(resolve(outputRoot, unitsOnly ? 'source-unit-verification.json' : 'source-verification.json'), JSON.stringify(report, null, 2) + '\n');
  }
}
console.log(JSON.stringify(report));
