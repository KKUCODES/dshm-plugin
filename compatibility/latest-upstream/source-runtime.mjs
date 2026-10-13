import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existingInside, replaceFile } from '../background-output/install-runtime.mjs';
import { sourceChanges, sourceCommit } from './source-changes.mjs';
import { applySourceChange, normalizeSource as normalized } from './source-transform.mjs';
export { applySourceChange } from './source-transform.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const sourceRoot = resolve(root, 'artifacts/latest-source-check');
export const outputRoot = resolve(root, 'artifacts/latest-source-patches');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

/** 完整预检后生成交付副本，不能直接在参考源码上生成未知补丁。 */
export async function prepareSourceRuntime() {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim();
  if (commit !== sourceCommit) throw Error('latest_source_commit_mismatch');
  const prepared = [];
  for (const change of sourceChanges) {
    const original = await readFile(await existingInside(sourceRoot, change.path));
    const next = Buffer.from(applySourceChange(change, original.toString('utf8')));
    const pkg = JSON.parse(await readFile(await existingInside(sourceRoot, `${change.package}/package.json`), 'utf8'));
    if (pkg.name !== change.name || pkg.version !== '0.2.1-alpha.1') throw Error('latest_source_package_version_mismatch');
    prepared.push({ ...change, original, next, packageName: pkg.name });
  }
  const files = [];
  await mkdir(outputRoot, { recursive: true });
  const actualOutput = await realpath(outputRoot);
  const outside = path => { const rel = relative(root, path); return rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel); };
  if (outside(actualOutput)) throw Error('latest_source_output_outside_project');
  for (const { original, next, edits: _edits, transform: _transform, hash, ...change } of prepared) {
    for (const [kind, bytes] of [['original', original], ['patched', next]]) {
      const target = resolve(outputRoot, kind, change.path);
      await mkdir(dirname(target), { recursive: true });
      if (outside(await realpath(dirname(target)))) throw Error('latest_source_output_outside_project');
      try { if ((await lstat(target)).isSymbolicLink()) throw Error('latest_source_linked_payload'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await writeFile(target, bytes);
    }
    files.push({ ...change, sourceHash: hash, before: digest(original), after: digest(next) });
  }
  const manifest = { version: '0.2.1-alpha.1', sourceCommit, patches: [...new Set(sourceChanges.map(item => item.patch))], files };
  await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

/** 只覆盖明确前/后状态；逐文件原子替换，错误时只回滚本次写入。 */
export async function installSourceRuntime(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  const targetRoot = await realpath(resolve(targetDirectory));
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
  if (manifest.sourceCommit !== sourceCommit || manifest.version !== '0.2.1-alpha.1' || manifest.files.length !== sourceChanges.length)
    throw Error('latest_source_manifest_mismatch');
  const rootPackage = JSON.parse(await readFile(await existingInside(targetRoot, 'package.json'), 'utf8'));
  if (rootPackage.name !== '@deepseek-ai/dsh-root' || rootPackage.version !== manifest.version) throw Error('latest_source_root_version_mismatch');
  const prepared = [];
  for (const [index, change] of sourceChanges.entries()) {
    const file = manifest.files[index];
    if (file.path !== change.path || file.package !== change.package || file.patch !== change.patch || file.sourceHash !== change.hash || file.packageName !== change.name)
      throw Error('latest_source_manifest_path_mismatch');
    const target = await existingInside(targetRoot, file.path);
    const pkg = JSON.parse(await readFile(await existingInside(targetRoot, `${file.package}/package.json`), 'utf8'));
    if (pkg.name !== change.name || pkg.version !== manifest.version) throw Error('latest_source_package_mismatch');
    const before = await readFile(resolve(outputRoot, 'original', file.path)), after = await readFile(resolve(outputRoot, 'patched', file.path));
    if (digest(normalized(before.toString('utf8'))) !== change.hash || digest(before) !== file.before || digest(after) !== file.after
      || !Buffer.from(applySourceChange(change, before.toString('utf8'))).equals(after)) throw Error('latest_source_payload_mismatch');
    const current = await readFile(target), hash = digest(current);
    if (![file.before, file.after].includes(hash)) throw Error(`latest_source_target_changed: ${file.path}`);
    prepared.push({ ...file, target, before, after, current });
  }
  const report = { action, targetRoot, sourceCommit, patches: manifest.patches, files: prepared.length, written: 0 };
  if (action === 'plan') return report;
  const written = [];
  try {
    for (const file of prepared) {
      const desired = action === 'apply' ? file.after : file.before;
      if (!(await readFile(file.target)).equals(file.current)) throw Error('latest_source_concurrent_change');
      if (desired.equals(file.current)) continue;
      await replaceFile(file.target, desired); written.push({ file, desired });
    }
    for (const file of prepared)
      if (!(await readFile(file.target)).equals(action === 'apply' ? file.after : file.before)) throw Error('latest_source_final_state_mismatch');
  } catch (error) {
    const failures = [];
    for (const { file, desired } of written.reverse()) {
      try {
        if (!(await readFile(file.target)).equals(desired)) throw Error('latest_source_rollback_concurrent_change');
        await replaceFile(file.target, file.current);
      } catch (rollback) { failures.push(rollback); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Latest source rollback needs attention');
    throw error;
  }
  report.written = written.length;
  await writeFile(resolve(outputRoot, 'install-receipt.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target] = process.argv.slice(2);
  if (action === 'prepare') console.log(JSON.stringify(await prepareSourceRuntime()));
  else {
    if (!target) throw Error('Specify stopped source installation');
    console.log(JSON.stringify(await installSourceRuntime(action, target)));
  }
}
