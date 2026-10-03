import { readFile, realpath, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputRoot } from './build.mjs';
import { hashes, directory, patchVersion, digest } from './changes.mjs';
import { regular, targetRoot } from '../cordis-inspect/package.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

// 三份文件全量预检后写入；拒绝未知修改，失败恢复本次已写入的文件。
export async function install(action, target, write = replaceFile) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await targetRoot(target), out = await realpath(outputRoot);
  if (out.toLowerCase() !== outputRoot.toLowerCase().replace(/[\\/]$/, '')) throw Error('Linked artifact directory');
  const pkg = JSON.parse(await readFile(await regular(root, `${directory}/package.json`), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-client-ui-plugin-manager' || pkg.version !== '0.1.6-alpha.2') throw Error('Package mismatch');
  const manifest = JSON.parse(await readFile(await regular(out, 'manifest.json'), 'utf8'));
  if (manifest.patchVersion !== patchVersion || JSON.stringify(manifest.files.map(f => f.path).sort()) !== JSON.stringify(Object.keys(hashes).sort())) throw Error('Manifest mismatch');
  const records = [];
  for (const file of manifest.files) {
    const before = await readFile(await regular(out, `before/${file.path}`)), after = await readFile(await regular(out, `after/${file.path}`));
    if (file.before !== hashes[file.path] || digest(before) !== file.before || digest(after) !== file.after) throw Error('Payload mismatch');
    const path = await regular(root, file.path), current = await readFile(path);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed change: ${file.path}`);
    records.push({ path, relative: file.path, current, before, after });
  }
  const result = { action, root, patchVersion, files: records.length, patched: records.filter(r => r.current.equals(r.after)).length };
  if (action === 'plan') return result;
  const lockPath = resolve(out, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const desired = action === 'apply' ? 'after' : 'before', written = [];
  const check = async (r, bytes) => {
    if (await regular(root, r.relative) !== r.path || !(await readFile(r.path)).equals(bytes)) throw Error('Concurrent modification');
  };
  try {
    for (const r of records) await check(r, r.current);
    for (const r of records) {
      if (r.current.equals(r[desired])) continue;
      await check(r, r.current); await write(r.path, r[desired]); written.push(r);
    }
    for (const r of records) await check(r, r[desired]);
  } catch (error) {
    const failures = [];
    for (const r of written.reverse()) try { await check(r, r[desired]); await write(r.path, r.current); } catch (failure) { failures.push(failure); }
    if (failures.length) throw new AggregateError([error, ...failures], 'Rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  return { ...result, written: written.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (action !== 'plan' && stopped !== '--stopped')) throw Error('Use plan <root>, apply/restore <root> --stopped');
  console.log(JSON.stringify(await install(action, target)));
}
