import { readFile, realpath, lstat, open, unlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseline, patchVersion, directory, changes } from './changes.mjs';
import { outputRoot } from './build.mjs';
import { runtimeBaselines, sourcePaths } from './build-runtime.mjs';
import { sourceRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';

const exactPaths = (items, paths) => Array.isArray(items) && items.length === paths.length
  && new Set(items.map(item => item.path)).size === paths.length && items.every(item => paths.includes(item.path));
async function regular(root, path) {
  const target = await existingInside(root, path);
  if (!(await lstat(target)).isFile() || (await realpath(target)).toLowerCase() !== target.toLowerCase()) throw Error(`Linked or non-file target: ${path}`);
  return target;
}
/** 源码、浏览器产物和声明一起核对；安装与恢复均不覆盖未知修改。 */
export async function install(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  const root = await realpath(resolve(targetDirectory)), reference = await realpath(sourceRoot);
  const inside = relative(reference, root);
  if (!inside || (!inside.startsWith('..') && !isAbsolute(inside))) throw Error('Reference checkout is read-only');
  const artifacts = await realpath(outputRoot);
  if (artifacts.toLowerCase() !== outputRoot.toLowerCase().replace(/[\\/]$/, '')) throw Error('Linked artifact directory');
  const manifest = JSON.parse(await readFile(await regular(artifacts, 'runtime-manifest.json'), 'utf8'));
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion
    || manifest.package?.name !== '@deepseek-ai/dsh-client-modules' || manifest.package?.version !== '0.1.6-alpha.2'
    || !exactPaths(manifest.files, Object.keys(runtimeBaselines)) || !exactPaths(manifest.sourceInputs, sourcePaths)) throw Error('Unexpected manifest');
  const pkg = JSON.parse(await readFile(await regular(root, `${directory}/package.json`), 'utf8'));
  if (pkg.name !== manifest.package.name || pkg.version !== manifest.package.version) throw Error('Package mismatch');
  const records = [];
  for (const input of manifest.sourceInputs) {
    const before = normalize(await readFile(await regular(reference, input.path), 'utf8'));
    const change = changes.find(change => change.path === input.path), after = change ? applyChange(change, before) : before;
    if (digest(before) !== input.before || digest(after) !== input.after) throw Error('Source manifest mismatch');
    const target = await regular(root, input.path), current = await readFile(target), text = current.toString('utf8');
    const encode = value => Buffer.from(text.includes('\r\n') ? value.replaceAll('\n', '\r\n') : value);
    if (!encode(normalize(text)).equals(current) || (normalize(text) !== before && normalize(text) !== after)) throw Error(`Source mismatch: ${input.path}`);
    records.push({ path: input.path, target, current, before: encode(before), after: encode(after), changed: !!change });
  }
  for (const file of manifest.files) {
    const before = await readFile(await regular(artifacts, `runtime-original/${file.path}`));
    const after = await readFile(await regular(artifacts, `runtime/${file.path}`));
    if (file.before !== runtimeBaselines[file.path] || digest(before) !== file.before || digest(after) !== file.after) throw Error('Payload hash mismatch');
    const target = await regular(root, file.path), current = await readFile(target);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Installed runtime changed: ${file.path}`);
    records.push({ path: file.path, target, current, before, after, changed: true });
  }
  const changed = records.filter(record => record.changed);
  const summary = { action, root, patchVersion, files: changed.length, patched: changed.filter(record => record.current.equals(record.after)).length };
  if (action === 'plan') return summary;
  const desired = action === 'apply' ? 'after' : 'before', written = [];
  const lockPath = resolve(artifacts, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const check = async (record, expected) => {
    if (await regular(root, record.path) !== record.target || !(await readFile(record.target)).equals(expected)) throw Error(`Concurrent modification: ${record.path}`);
  };
  try {
    for (const record of records) await check(record, record.current);
    for (const record of changed) {
      await check(record, record.current);
      if (record.current.equals(record[desired])) continue;
      await replaceFile(record.target, record[desired]); written.push(record);
    }
    for (const record of records) await check(record, record[desired]);
  } catch (error) {
    const failures = [];
    for (const record of written.reverse()) {
      try { await check(record, record[desired]); await replaceFile(record.target, record.current); } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Install rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  return { ...summary, written: written.length, state: action === 'apply' ? 'patched' : 'original' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (action !== 'plan' && stopped !== '--stopped')) throw Error('Stop DSH; use <plan|apply|restore> <directory> [--stopped]');
  console.log(JSON.stringify(await install(action, target)));
}
