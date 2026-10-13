import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { sourceDesktopChanges } from '../compatibility/latest-upstream/source-desktop-apps.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'artifacts/latest-source-check');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const output = resolve(runtime, 'desktop-apps/validation');
const require = createRequire(resolve(runtime, 'package.json'));
const commit = '5badb15009ae1756c3afe0ae0cef1faafc290ccc';
const report = { at: new Date().toISOString(), version: '0.2.1-alpha.1', sourceCommit: commit, passed: false,
  scope: 'fixed Git source copy; original Cordis/plugin/routes; controlled OS probing and launch', files: [] };
await mkdir(output, { recursive: true });
const save = () => writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
await save();
try {
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, windowsHide: true, encoding: 'utf8' }).trim(), commit);
const { transform } = require('esbuild');
const metadata = JSON.parse(execFileSync('git', ['show', `${commit}:packages/host/open-in-app/package.json`],
  { cwd: source, windowsHide: true, encoding: 'utf8' }));
assert.equal(metadata.name, '@deepseek-ai/dsh-host-open-in-app');
assert.equal(metadata.version, '0.2.1-alpha.1');
for (const file of await readdir(resolve(source, 'packages/host/open-in-app/src'))) {
  if (!file.endsWith('.ts')) continue;
  const path = 'packages/host/open-in-app/src/' + file;
  // 从固定Git对象读取整组原文件；另一项源码构建正在安装候选时也不混入其工作树。
  const original = execFileSync('git', ['show', `${commit}:${path}`], { cwd: source, windowsHide: true });
  const change = sourceDesktopChanges.find(item => item.path === path);
  let text = original.toString();
  if (change) {
    const hash = createHash('sha256').update(original).digest('hex');
    assert.equal(hash, change.hash, 'fixed latest source hash');
    text = change.transform(text);
    report.files.push({ path, before: hash, after: createHash('sha256').update(text).digest('hex') });
  }
  const js = await transform(text, { loader: 'ts', format: 'esm', target: 'node22', sourcefile: path });
  await writeFile(resolve(output, file), text);
  await writeFile(resolve(output, file.replace(/\.ts$/, '.mjs')), js.code.replaceAll(".ts'", ".mjs'").replaceAll('.ts"', '.mjs"'));
}
await writeFile(resolve(output, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
const typecheck = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict',
  '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'es2023',
  '--allowImportingTsExtensions', '--esModuleInterop', resolve(output, 'index.ts'), resolve(output, 'resolver.ts')],
  { cwd: runtime, windowsHide: true, encoding: 'utf8', timeout: 60000 });
await writeFile(resolve(output, 'typecheck.log'), typecheck.stdout + typecheck.stderr);
if (typecheck.status !== 0) { process.stdout.write(typecheck.stdout + typecheck.stderr); throw Error('latest_desktop_apps_typecheck_failed'); }
report.typesPassed = true;
const test = spawnSync(process.execPath, ['--test', 'tests/latest-desktop-apps.test.mjs'], {
  cwd: root, windowsHide: true, encoding: 'utf8', timeout: 60000,
});
await writeFile(resolve(output, 'test.log'), test.stdout + test.stderr);
report.passed = test.status === 0;
if (test.status !== 0) { process.stdout.write(test.stdout + test.stderr); throw Error('latest_desktop_apps_validation_failed'); }
} catch (error) { report.error = String(error); throw error; }
finally { await save(); }
console.log(JSON.stringify({ passed: report.passed, files: report.files.length, scope: report.scope }));
