import { readFile, realpath, lstat, open, unlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseline, patchVersion, changes } from './changes.mjs';
import { outputRoot } from './build-test-runtime.mjs';
import { directory, runtimeBaselines } from './build-runtime.mjs';
import { sourceRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';

const sourcePaths = ['index.ts', 'types.ts', 'stream-protocol.ts', 'stream-server.ts'].map(name => `${directory}/src/${name}`);
function exactPaths(items, paths) {
  return Array.isArray(items) && items.length === paths.length && new Set(items.map(item => item.path)).size === paths.length
    && items.every(item => paths.includes(item.path));
}
async function regular(root, path) {
  const target = await existingInside(root, path);
  if (!(await lstat(target)).isFile()) throw Error(`Not a regular file: ${path}`);
  // 拒绝目录别名，即使别名仍在同一个安装内，避免改到另一个入口。
  if ((await realpath(target)).toLowerCase() !== target.toLowerCase()) throw Error(`Linked target: ${path}`);
  return target;
}
function sourceBytes(current, before, after, path) {
  const text = current.toString('utf8');
  if (!Buffer.from(text).equals(current)) throw Error(`Source encoding mismatch: ${path}`);
  const lf = normalize(text), crlf = text.includes('\r\n');
  const encode = value => Buffer.from(crlf ? value.replaceAll('\n', '\r\n') : value);
  if (!encode(lf).equals(current) || (lf !== before && lf !== after)) throw Error(`Source mismatch: ${path}`);
  return { before: encode(before), after: encode(after) };
}

/** 同一事务覆盖源码及编译入口；必须先停止DSH，避免运行时读到混合代次。 */
export async function install(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  const root = await realpath(resolve(targetDirectory));
  const reference = await realpath(sourceRoot), withinReference = relative(reference, root);
  if (!withinReference || (!withinReference.startsWith('..') && !isAbsolute(withinReference))) throw Error('Reference checkout is read-only');
  const artifacts = await realpath(outputRoot);
  if (artifacts.toLowerCase() !== outputRoot.toLowerCase()) throw Error('Linked artifact directory');
  const manifest = JSON.parse(await readFile(await regular(artifacts, 'runtime-manifest.json'), 'utf8'));
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion
    || manifest.package?.name !== '@deepseek-ai/dsh-api-gateway' || manifest.package?.version !== '0.1.6-alpha.2'
    || !exactPaths(manifest.files, Object.keys(runtimeBaselines)) || !exactPaths(manifest.sourceInputs, sourcePaths)) throw Error('Unexpected manifest');
  const pkg = JSON.parse(await readFile(await regular(root, `${directory}/package.json`), 'utf8'));
  if (pkg.name !== manifest.package.name || pkg.version !== manifest.package.version) throw Error('Package mismatch');
  const records = [];
  for (const input of manifest.sourceInputs) {
    const before = normalize(await readFile(await regular(reference, input.path), 'utf8'));
    const change = changes.find(change => change.path === input.path);
    const after = change ? applyChange(change, before) : before;
    if (digest(before) !== input.before || digest(after) !== input.after) throw Error('Source manifest mismatch');
    const target = await regular(root, input.path), current = await readFile(target);
    const variants = sourceBytes(current, before, after, input.path);
    records.push({ path: input.path, target, current, ...variants, changed: !!change });
  }
  for (const file of manifest.files) {
    if (file.before !== runtimeBaselines[file.path]) throw Error('Runtime baseline mismatch');
    const before = await readFile(await regular(artifacts, `runtime-original/${file.path}`));
    const after = await readFile(await regular(artifacts, `runtime/${file.path}`));
    if (digest(before) !== file.before || digest(after) !== file.after) throw Error('Payload hash mismatch');
    const target = await regular(root, file.path), current = await readFile(target);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Installed runtime changed: ${file.path}`);
    records.push({ path: file.path, target, current, before, after, changed: true });
  }
  const changed = records.filter(record => record.changed);
  const summary = { action, targetRoot: root, patchVersion, files: changed.length,
    patched: changed.filter(record => record.current.equals(record.after)).length };
  if (action === 'plan') return summary;
  const desired = action === 'apply' ? 'after' : 'before';
  const lockPath = resolve(artifacts, `install-${digest(root.toLowerCase())}.lock`);
  const lock = await open(lockPath, 'wx');
  const check = async (record, expected) => {
    if (await regular(root, record.path) !== record.target || !(await readFile(record.target)).equals(expected)) throw Error(`Concurrent modification: ${record.path}`);
  };
  const written = [];
  try {
    // 取得锁后重验所有文件，包括本次不改的相邻输入。
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
      try { await check(record, record[desired]); await replaceFile(record.target, record.current); }
      catch (rollback) { failures.push(rollback); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Install failed; rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  return { ...summary, written: written.length, state: action === 'apply' ? 'patched' : 'original' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (action !== 'plan' && stopped !== '--stopped')) throw Error('Stop DSH first; use <plan|apply|restore> <DSH directory> [--stopped]');
  console.log(JSON.stringify(await install(action, target)));
}
