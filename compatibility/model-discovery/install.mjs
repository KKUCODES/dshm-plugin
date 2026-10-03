import { readFile, realpath, open, unlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { files } from './prepare.mjs';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';

export const output = fileURLToPath(new URL('../../artifacts/compatibility/model-discovery/', import.meta.url));
const packagePath = 'packages/llm/llm-pi-ai';
export async function install(action, directory, write = replaceFile, specification = { files, output }) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await realpath(resolve(directory));
  const reference = await realpath(fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url)));
  const rel = relative(reference, root);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw Error('Reference checkout is read-only');
  const records = [];
  for (const [path, expected, transform] of specification.files) {
    const before = await readFile(await existingInside(specification.output, `before/${path}`));
    if (digest(before) !== expected) throw Error('Unsupported baseline');
    const text = before.toString('utf8');
    let transformed = transform(text.replaceAll('\r\n', '\n'));
    if (text.includes('\r\n')) transformed = transformed.replaceAll('\n', '\r\n');
    const after = Buffer.from(transformed);
    const local = `${packagePath}/${path}`, target = await existingInside(root, local);
    const current = await readFile(target);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed change: ${path}`);
    records.push({ local, target, current, before, after });
  }
  const summary = { action, patched: records.filter(row => row.current.equals(row.after)).length };
  if (action === 'plan') return summary;
  const lockPath = resolve(output, `install-${digest(root.toLowerCase())}.lock`);
  const lock = await open(lockPath, 'wx'), written = [];
  const desired = action === 'apply' ? 'after' : 'before';
  const check = async (row, expected) => {
    if (await existingInside(root, row.local) !== row.target || !(await readFile(row.target)).equals(expected)) throw Error('Concurrent modification');
  };
  try {
    for (const row of records) await check(row, row.current);
    for (const row of records) {
      await check(row, row.current);
      if (row.current.equals(row[desired])) continue;
      await write(row.target, row[desired]); written.push(row);
    }
    for (const row of records) await check(row, row[desired]);
  } catch (error) {
    const failures = [];
    for (const row of written.reverse()) {
      try { await check(row, row[desired]); await replaceFile(row.target, row.current); }
      catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Discovery rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  return { ...summary, written: written.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || action !== 'plan' && stopped !== '--stopped') throw Error('Stop DSH before writing; pass --stopped');
  console.log(JSON.stringify(await install(action, target)));
}
