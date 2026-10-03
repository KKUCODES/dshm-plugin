import { readFile, writeFile, realpath, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';
import { files, output, transform } from './prepare.mjs';

export async function patch(action, target, write = replaceFile, specification = { files, output, transform }) {
  const { files, output, transform } = specification;
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await realpath(resolve(target));
  const reference = await realpath(resolve('../deepseek-harness'));
  if (root.toLowerCase() === reference.toLowerCase()) throw Error('Reference checkout is read-only');
  const records = [];
  for (const [path, hash] of Object.entries(files)) {
    const ts = path.endsWith('.ts'), location = await existingInside(root, path);
    const current = await readFile(location), before = await readFile(resolve(output, ts ? 'original.ts' : 'original.mjs'));
    if (digest(before) !== hash) throw Error('Unsupported original');
    const after = Buffer.from(transform(before.toString('utf8'), ts));
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed change: ${path}`);
    records.push({ location, path, before, after, current });
  }
  const summary = { action, root, patched: records.filter(row => row.current.equals(row.after)).length };
  if (action === 'plan') return summary;
  const lockPath = resolve(output, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const desired = action === 'apply' ? 'after' : 'before', written = [];
  const check = async (row, bytes) => {
    if (await existingInside(root, row.path) !== row.location || !(await readFile(row.location)).equals(bytes)) throw Error('Concurrent modification');
  };
  try {
    for (const row of records) await check(row, row.current);
    for (const row of records) {
      await check(row, row.current);
      if (row.current.equals(row[desired])) continue;
      await write(row.location, row[desired]); written.push(row);
    }
    for (const row of records) await check(row, row[desired]);
  } catch (error) {
    const failures = [];
    for (const row of written.reverse()) {
      try { await check(row, row[desired]); await write(row.location, row.current); } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'PTC rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  const result = { ...summary, written: written.length, at: new Date().toISOString() };
  await writeFile(resolve(output, 'receipt.json'), JSON.stringify(result, null, 2));
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || action !== 'plan' && stopped !== '--stopped') throw Error('Stop DSH before writing; pass --stopped');
  console.log(JSON.stringify(await patch(action, target)));
}
