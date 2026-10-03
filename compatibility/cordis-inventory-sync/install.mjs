import { readFile, realpath, open, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputRoot } from './build.mjs';
import { baseline, patchVersion, runtimeHashes } from './baselines.mjs';
import { regular, targetRoot } from '../cordis-inspect/package.mjs';
import { digest, replaceFile } from '../background-output/install-runtime.mjs';

/** 全量预检、可恢复写入；保留既有审批和生命周期补丁。 */
export async function install(action, target, write = replaceFile) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await targetRoot(target), out = await realpath(outputRoot);
  if (out.toLowerCase() !== outputRoot.toLowerCase().replace(/[\\/]$/, '')) throw Error('Linked artifacts');
  for (const [path, name] of [['extensions/ui-cordis', '@deepseek-ai/dsh-client-ui-cordis'], ['api/remotes', '@deepseek-ai/dsh-api-remotes']]) {
    const pkg = JSON.parse(await readFile(await regular(root, `packages/${path}/package.json`), 'utf8'));
    if (pkg.name !== name || pkg.version !== '0.1.6-alpha.2') throw Error('Package mismatch');
  }
  const manifest = JSON.parse(await readFile(await regular(out, 'manifest.json'), 'utf8'));
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion
    || JSON.stringify(manifest.files.map(file => file.path).sort()) !== JSON.stringify(Object.keys(runtimeHashes).sort())) throw Error('Unexpected manifest');
  const records = [];
  for (const file of manifest.files) {
    const before = await readFile(await regular(out, `before/${file.path}`)), after = await readFile(await regular(out, `after/${file.path}`));
    if (file.before !== runtimeHashes[file.path] || digest(before) !== file.before || digest(after) !== file.after) throw Error('Payload mismatch');
    const path = await regular(root, `packages/${file.path}`), current = await readFile(path);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed changes: ${file.path}`);
    records.push({ ...file, target: path, before, after, current });
  }
  const summary = { action, root, patchVersion, files: records.length, patched: records.filter(file => file.current.equals(file.after)).length };
  if (action === 'plan') return summary;
  const lockPath = resolve(out, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const desired = action === 'apply' ? 'after' : 'before', written = [];
  const check = async (record, bytes) => {
    if (await regular(root, `packages/${record.path}`) !== record.target || !(await readFile(record.target)).equals(bytes)) throw Error('Concurrent modification');
  };
  try {
    for (const record of records) await check(record, record.current);
    for (const record of records) {
      if (record.current.equals(record[desired])) continue;
      await check(record, record.current); await write(record.target, record[desired]); written.push(record);
    }
    for (const record of records) await check(record, record[desired]);
  } catch (error) {
    const failures = [];
    for (const record of written.reverse()) {
      try { await check(record, record[desired]); await write(record.target, record.current); } catch (failure) { failures.push(failure); }
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
  if (!target || (action !== 'plan' && stopped !== '--stopped')) throw Error('Use plan <root>, apply/restore <root> --stopped');
  console.log(JSON.stringify(await install(action, target)));
}
