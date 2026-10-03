import { readFile, writeFile, mkdir, realpath, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';

const reference = fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url));
export const output = fileURLToPath(new URL('../../artifacts/compatibility/auto-review-cancel/', import.meta.url));
const prefix = 'packages/experimental/auto-review/';
const hashes = {
  'src/index.ts': 'd4ba657e99ed3e56b0c78c3626c1ed74b9d8e1cffee11b58b106a14a352ff4f6',
  'lib/index.js': 'bd0d44af90661076d0b7caccb74953d8f5fdcc5e380da02b09ba612e39535436',
};
export function transform(source) {
  if (source.split('isAborted(lifecycle.signal)').length !== 3) throw Error('Unsupported Auto review boundaries');
  // 用户中止和插件卸载同样停止执行；模型真正拒绝、未取消的审核失败仍按原规则拒绝。
  return source.replaceAll('isAborted(lifecycle.signal)', 'isAborted(lifecycle.signal) || isAborted(exec.signal)');
}
export async function patch(action, target, write = replaceFile) {
  if (!['prepare', 'plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await realpath(resolve(target));
  if (root.toLowerCase() === (await realpath(reference)).toLowerCase()) throw Error('Reference checkout is read-only');
  await mkdir(output, { recursive: true });
  const records = [];
  for (const [local, hash] of Object.entries(hashes)) {
    const path = prefix + local;
    const location = await existingInside(root, path), current = await readFile(location);
    const originalPath = resolve(output, local.endsWith('.ts') ? 'original.ts' : 'original.mjs');
    let before;
    try { before = await readFile(originalPath); }
    catch (error) {
      if (error.code !== 'ENOENT' || digest(current) !== hash || action !== 'prepare') throw error;
      await writeFile(originalPath, current, { flag: 'wx' }); before = current;
    }
    if (digest(before) !== hash) throw Error(`Unsupported original: ${path}`);
    const after = Buffer.from(transform(before.toString('utf8')));
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed change: ${path}`);
    records.push({ path, location, current, before, after });
  }
  const summary = { action, root, files: records.length, patched: records.filter(row => row.current.equals(row.after)).length };
  if (action === 'prepare') {
    for (const row of records) await writeFile(resolve(output, row.path.endsWith('.ts') ? 'candidate.ts' : 'candidate.mjs'), row.after);
    return summary;
  }
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
    if (failures.length) throw new AggregateError([error, ...failures], 'Auto review rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  const result = { ...summary, written: written.length, at: new Date().toISOString() };
  await writeFile(resolve(output, 'receipt.json'), JSON.stringify(result, null, 2));
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, unloaded] = process.argv.slice(2);
  if (!target || (['apply', 'restore'].includes(action) && unloaded !== '--unloaded')) throw Error('Unload Auto review before apply/restore; pass --unloaded');
  console.log(JSON.stringify(await patch(action, target)));
}
