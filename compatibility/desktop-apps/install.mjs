import { readFile, realpath, open, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, replaceFile } from '../background-output/install-runtime.mjs';
import { baseline, patchVersion } from './changes.mjs';
import { directory, hashes, outputRoot, regular, targetRoot } from './package.mjs';

/** 固定七文件完整预检，再逐个替换；失败仅恢复本轮写入，拒绝覆盖外部新改动。 */
export async function install(action, installedRoot, write = replaceFile) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await targetRoot(installedRoot), out = await realpath(outputRoot);
  if (out.toLowerCase() !== outputRoot.toLowerCase()) throw Error('Linked artifact directory');
  const manifest = JSON.parse(await readFile(await regular(out, 'manifest.json'), 'utf8'));
  const allowed = Object.keys(hashes).map(path => `${directory}/${path}`).sort();
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion
    || JSON.stringify(manifest.files.map(file => file.path).sort()) !== JSON.stringify(allowed)) throw Error('Unexpected manifest');
  const records = [];
  for (const file of manifest.files) {
    const before = await readFile(await regular(out, `before/${file.path}`)), after = await readFile(await regular(out, `after/${file.path}`));
    if (file.before !== hashes[file.path.slice(directory.length + 1)] || digest(before) !== file.before || digest(after) !== file.after) throw Error('Payload mismatch');
    const target = await regular(root, file.path), current = await readFile(target);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed changes: ${file.path}`);
    records.push({ ...file, target, current, beforeBytes: before, afterBytes: after });
  }
  for (const input of manifest.inputs) {
    if (!input.path.startsWith(`${directory}/src/`) || !input.path.endsWith('.ts')) throw Error('Unexpected source input');
    const current = digest(await readFile(await regular(root, input.path)));
    if (current !== input.hash && current !== records.find(file => file.path === input.path)?.after) throw Error('Source input changed');
  }
  const summary = { action, root, files: records.length, patched: records.filter(file => file.current.equals(file.afterBytes)).length };
  if (action === 'plan') return summary;
  const lockPath = resolve(out, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const desired = action === 'apply' ? 'afterBytes' : 'beforeBytes', written = [];
  const check = async (file, bytes) => {
    if (await regular(root, file.path) !== file.target || !(await readFile(file.target)).equals(bytes)) throw Error('Concurrent modification');
  };
  try {
    for (const file of records) await check(file, file.current);
    for (const file of records) {
      await check(file, file.current);
      if (file.current.equals(file[desired])) continue;
      await write(file.target, file[desired]); written.push(file);
    }
    for (const file of records) await check(file, file[desired]);
  } catch (error) {
    const failures = [];
    for (const file of written.reverse()) {
      try { await check(file, file[desired]); await write(file.target, file.current); }
      catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  const result = { ...summary, written: written.length, at: new Date().toISOString() };
  await writeFile(resolve(out, `receipt-${digest(root.toLowerCase())}.json`), JSON.stringify(result, null, 2));
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (action !== 'plan' && stopped !== '--stopped')) throw Error('Use plan <root>, or apply/restore <root> --stopped');
  console.log(JSON.stringify(await install(action, target)));
}
