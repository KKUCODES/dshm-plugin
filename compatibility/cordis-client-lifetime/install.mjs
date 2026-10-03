import { readFile, realpath, lstat, open, unlink, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputRoot } from './build.mjs';
import { baseline, patchVersion, runtimeHashes, packageNames } from './baselines.mjs';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';

async function regular(root, path) {
  const target = await existingInside(root, path);
  if (!(await lstat(target)).isFile() || (await realpath(target)).toLowerCase() !== target.toLowerCase()) throw Error(`Linked target: ${path}`);
  return target;
}
export async function install(action, directory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown install action');
  const root = await realpath(resolve(directory));
  const reference = await realpath(fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url)));
  const inside = relative(reference, root);
  if (!inside || (!inside.startsWith('..') && !isAbsolute(inside))) throw Error('Reference checkout is read-only');
  if ((await realpath(outputRoot)).toLowerCase() !== outputRoot.toLowerCase().replace(/[\\/]$/, '')) throw Error('Linked artifacts');
  const manifest = JSON.parse(await readFile(await regular(outputRoot, 'manifest.json'), 'utf8'));
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion || manifest.files?.length !== Object.keys(runtimeHashes).length
    || new Set(manifest.files.map(file => file.path)).size !== manifest.files.length) throw Error('Unexpected manifest');
  for (const [name, expected] of Object.entries(packageNames)) {
    const pkg = JSON.parse(await readFile(await regular(root, `packages/extensions/${name}/package.json`), 'utf8'));
    if (pkg.name !== expected || pkg.version !== '0.1.6-alpha.2') throw Error('Package mismatch');
  }
  const records = [];
  for (const file of manifest.files) {
    if (runtimeHashes[file.path] !== file.before) throw Error('Unexpected manifest path or baseline');
    const target = await regular(root, `packages/extensions/${file.path}`);
    const before = await readFile(await regular(outputRoot, `before/${file.path}`));
    const after = await readFile(await regular(outputRoot, `after/${file.path}`));
    if (digest(before) !== file.before || digest(after) !== file.after) throw Error('Artifact hash mismatch');
    const current = await readFile(target);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Installed file changed: ${file.path}`);
    records.push({ ...file, target, before, after, current });
  }
  const summary = { action, root, patchVersion, files: records.length, patched: records.filter(file => file.current.equals(file.after)).length };
  if (action === 'plan') return summary;
  const desired = action === 'apply' ? 'after' : 'before', written = [];
  const lockPath = resolve(outputRoot, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const check = async (record, bytes) => {
    if (await regular(root, `packages/extensions/${record.path}`) !== record.target || !(await readFile(record.target)).equals(bytes)) throw Error(`Concurrent modification: ${record.path}`);
  };
  try {
    for (const record of records) await check(record, record.current);
    for (const record of records) {
      if (record.current.equals(record[desired])) continue;
      await check(record, record.current); await replaceFile(record.target, record[desired]); written.push(record);
    }
    for (const record of records) await check(record, record[desired]);
  } catch (error) {
    const failures = [];
    for (const record of written.reverse()) {
      try { await check(record, record[desired]); await replaceFile(record.target, record.current); } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  const result = { ...summary, written: written.length, state: action === 'apply' ? 'patched' : 'original' };
  await writeFile(resolve(outputRoot, 'install-receipt.json'), JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2));
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (action !== 'plan' && stopped !== '--stopped')) throw Error('Stop DSH and use <plan|apply|restore> <directory> [--stopped]');
  console.log(JSON.stringify(await install(action, target)));
}
