import { readFile, mkdir, writeFile, realpath, lstat, open, unlink } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';

export const directory = 'packages/api/workspace-files';
export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/file-metadata', import.meta.url));
export const changes = [
  { path: `${directory}/src/client/provider.ts`, sha256: '4e719d56cbb9b5c15f24487942ac0f0b7ce7a72404c96d7b8676a56af8e145ed', edits: [
    { before: ' * metadata with its reported version; a reported disappearance, or a write while the\n * last stat had failed, runs `stat` again.', after: ' * freshly read metadata, including its byte size; a reported disappearance or\n * write runs `stat` again.' },
    { before: '            current = { ...current, version: notice.version }\n            yield { ok: true, value: current }\n            continue\n', after: '            // A new version can change size too; refresh the complete Host stat.\n' },
  ] },
  { path: `${directory}/lib/types/client/provider.js`, sha256: '6ff031002c56cd84142155fe4df33b72300aecea3c184c713ec730ad346bc9f2', edits: [
    { before: '                        current = { ...current, version: notice.version };\n                        yield { ok: true, value: current };\n                        continue;\n', after: '                        // A new version can change size too; refresh the complete Host stat.\n' },
  ] },
  { path: `${directory}/lib/client.js`, sha256: '73cdadc4ed04110b789f970e62fc4b0a3bb9562117f817d04acbf14449eede2d', edits: [
    { before: '\t\t\t\t\t\t\t\tcurrent = {\n\t\t\t\t\t\t\t\t\t...current,\n\t\t\t\t\t\t\t\t\tversion: notice.version\n\t\t\t\t\t\t\t\t};\n\t\t\t\t\t\t\t\tyield {\n\t\t\t\t\t\t\t\t\tok: true,\n\t\t\t\t\t\t\t\t\tvalue: current\n\t\t\t\t\t\t\t\t};\n\t\t\t\t\t\t\t\tcontinue;\n', after: '\t\t\t\t\t\t\t\t// Refresh all metadata after an observed version change.\n' },
  ] },
];
async function regular(root, path) {
  const target = await existingInside(root, path);
  if (!(await lstat(target)).isFile() || (await realpath(target)).toLowerCase() !== target.toLowerCase()) throw Error(`Linked or non-file: ${path}`);
  return target;
}
async function targetRoot(path) {
  const root = await realpath(resolve(path)), reference = await realpath(sourceRoot);
  const inside = relative(reference, root);
  if (!inside || (!inside.startsWith('..') && !isAbsolute(inside))) throw Error('Reference checkout is read-only');
  const pkg = JSON.parse(await readFile(await regular(root, `${directory}/package.json`), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-api-workspace-files' || pkg.version !== '0.1.6-alpha.2') throw Error('Package mismatch');
  return root;
}
async function artifacts() {
  const root = await realpath(outputRoot);
  if (root.toLowerCase() !== outputRoot.toLowerCase()) throw Error('Linked artifact directory');
  return root;
}
/** 固定三个文件的哈希与唯一锚点；保留原始字节，不重新打包其他依赖。 */
export async function prepare(installedRoot) {
  const root = await targetRoot(installedRoot);
  const records = await Promise.all(changes.map(async change => {
    const before = await readFile(await regular(root, change.path));
    const patched = applyChange(change, before.toString('utf8'));
    if (change.path.endsWith('.ts')) {
      const reference = normalize(await readFile(resolve(sourceRoot, change.path), 'utf8'));
      if (digest(reference) !== change.sha256) throw Error('Reference source mismatch');
    }
    return { ...change, before, after: Buffer.from(before.includes(Buffer.from('\r\n')) ? patched.replaceAll('\n', '\r\n') : patched) };
  }));
  await mkdir(outputRoot, { recursive: true });
  const out = await artifacts();
  for (const record of records) for (const kind of ['before', 'after']) {
    const path = resolve(out, kind, record.path);
    await mkdir(dirname(path), { recursive: true });
    if ((await realpath(dirname(path))).toLowerCase() !== dirname(path).toLowerCase()) throw Error('Linked output parent');
    try { await writeFile(path, record[kind], { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST' || !(await readFile(await regular(out, relative(out, path).replaceAll('\\', '/')))).equals(record[kind])) throw error;
    }
  }
  return { files: records.length, outputRoot };
}
/** 安装前核对全部文件，拒绝未知改动；失败恢复本次写入，不碰其他补丁。 */
export async function install(action, installedRoot) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await targetRoot(installedRoot), out = await artifacts();
  const records = await Promise.all(changes.map(async change => {
    const before = await readFile(await regular(out, `before/${change.path}`));
    const after = await readFile(await regular(out, `after/${change.path}`));
    if (normalize(after.toString('utf8')) !== applyChange(change, before.toString('utf8'))) throw Error('Payload mismatch');
    const target = await regular(root, change.path), current = await readFile(target);
    const encode = value => Buffer.from(current.includes(Buffer.from('\r\n')) ? normalize(value.toString()).replaceAll('\n', '\r\n') : normalize(value.toString()));
    const original = encode(before), patched = encode(after);
    if (!current.equals(original) && !current.equals(patched)) throw Error(`Unknown installed changes: ${change.path}`);
    return { path: change.path, target, current, before: original, after: patched };
  }));
  const summary = { action, root, files: records.length, patched: records.filter(r => r.current.equals(r.after)).length };
  if (action === 'plan') return summary;
  const lockPath = resolve(out, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const desired = action === 'apply' ? 'after' : 'before', written = [];
  const check = async (record, bytes) => {
    if (await regular(root, record.path) !== record.target || !(await readFile(record.target)).equals(bytes)) throw Error('Concurrent modification');
  };
  try {
    for (const record of records) await check(record, record.current);
    for (const record of records) {
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
    if (failures.length) throw new AggregateError([error, ...failures], 'Rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  return { ...summary, written: written.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (!['prepare', 'plan'].includes(action) && stopped !== '--stopped')) throw Error('Use prepare/plan, or apply/restore <root> --stopped');
  console.log(JSON.stringify(await (action === 'prepare' ? prepare(target) : install(action, target))));
}
