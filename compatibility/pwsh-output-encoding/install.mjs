import { readFile, writeFile, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, replaceFile } from '../background-output/install-runtime.mjs';
import { baseline, outputRoot, patchVersion, targetRoot, regular, owned } from './package.mjs';

/** 只安装固定基线；源码、编译及声明一起核验，任何未知修改都在写入前拒绝。 */
export async function install(action, target, write = replaceFile) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await targetRoot(target);
  const manifest = JSON.parse(await readFile(await regular(outputRoot, 'manifest.json'), 'utf8'));
  if (manifest.patchVersion !== patchVersion || JSON.stringify(manifest.inputs) !== JSON.stringify(baseline.hashes)
    || JSON.stringify(manifest.files.map(f => f.path).sort()) !== JSON.stringify([...baseline.outputs].sort())) throw Error('Unexpected encoding manifest');
  const records = [];
  for (const file of manifest.files) {
    const before = await readFile(await regular(outputRoot, `before/${file.path}`));
    const after = await readFile(await regular(outputRoot, `after/${file.path}`));
    if (file.before !== baseline.hashes[file.path] || digest(before) !== file.before || digest(after) !== file.after) throw Error('Invalid encoding payload');
    const path = await regular(root, file.path), current = await readFile(path);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed change: ${file.path}`);
    records.push({ ...file, target: path, current, beforeBytes: before, afterBytes: after });
  }
  const checkInputs = async () => {
    for (const [path, hash] of Object.entries(baseline.hashes)) {
      const value = digest(await readFile(await regular(root, path)));
      if (value !== hash && value !== records.find(f => f.path === path)?.after) throw Error(`Changed encoding input: ${path}`);
    }
  };
  await checkInputs();
  const summary = { action, root, files: records.length, patched: records.filter(f => f.current.equals(f.afterBytes)).length };
  if (action === 'plan') return summary;
  const lockPath = await owned(`install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const desired = action === 'apply' ? 'afterBytes' : 'beforeBytes', written = [];
  const check = async (file, bytes) => {
    if (await regular(root, file.path) !== file.target || !(await readFile(file.target)).equals(bytes)) throw Error('Concurrent modification');
  };
  try {
    await checkInputs();
    for (const file of records) await check(file, file.current);
    for (const file of records) {
      await check(file, file.current);
      if (file.current.equals(file[desired])) continue;
      await write(file.target, file[desired]); written.push(file);
    }
    await checkInputs();
    for (const file of records) await check(file, file[desired]);
  } catch (error) {
    const failures = [];
    for (const file of written.reverse()) {
      try { await check(file, file[desired]); await write(file.target, file.current); } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Encoding rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  const result = { ...summary, written: written.length, at: new Date().toISOString() };
  await writeFile(await owned(`receipt-${digest(root.toLowerCase())}.json`), JSON.stringify(result, null, 2));
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (action !== 'plan' && stopped !== '--stopped')) throw Error('Use plan <root> or apply/restore <root> --stopped');
  console.log(JSON.stringify(await install(action, target)));
}
