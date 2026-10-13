import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceFile } from '../background-output/install-runtime.mjs';
import { fileWatchCompiledHash, transformFileWatchCompiled } from './file-watch-changes.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const path = resolve(runtime, 'node_modules/@deepseek-ai/dsh-fs-local/lib/index.js');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

/** 只修改项目内固定发布候选；拒绝未知包、字节和越界软链接。 */
export async function prepareLatestFileVersionWatch() {
  const pkg = JSON.parse(await readFile(resolve(runtime, 'node_modules/@deepseek-ai/dsh-fs-local/package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-fs-local' || pkg.version !== '0.2.1-alpha.1') throw Error('latest_fs_local_version_mismatch');
  const originals = resolve(runtime, 'patch-originals');
  await mkdir(originals, { recursive: true });
  const backup = resolve(originals, 'fs-local-index.js'), actual = await realpath(runtime);
  const inside = async target => {
    const rel = relative(actual, await realpath(target));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_fs_local_outside_runtime');
  };
  await inside(path); await inside(originals);
  let bytes = await readFile(path);
  if (digest(bytes) !== fileWatchCompiledHash) { await inside(backup); bytes = await readFile(backup); }
  if (digest(bytes) !== fileWatchCompiledHash) throw Error('latest_fs_local_original_mismatch');
  const changed = Buffer.from(transformFileWatchCompiled(bytes.toString('utf8')));
  const current = await readFile(path);
  if (![fileWatchCompiledHash, digest(changed)].includes(digest(current))) throw Error('latest_fs_local_changed_outside_patch');
  try {
    await writeFile(backup, bytes, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    await inside(backup);
    if (digest(await readFile(backup)) !== fileWatchCompiledHash) throw Error('latest_fs_local_backup_mismatch');
  }
  if (digest(current) !== digest(changed)) await replaceFile(path, changed);
  const report = { version: pkg.version, sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc',
    package: pkg.name, patch: 'latest-file-version-watch-v1', before: fileWatchCompiledHash,
    after: digest(changed), target: path, isolatedCandidateOnly: true };
  await writeFile(resolve(runtime, 'file-version-watch-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await prepareLatestFileVersionWatch()));
