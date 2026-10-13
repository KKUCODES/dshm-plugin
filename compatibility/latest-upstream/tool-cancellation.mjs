import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform as outerCancel } from '../ptc-cancel/prepare.mjs';
import { transform as innerCancel } from '../ptc-cancel/prepare-inner.mjs';
import { replaceFile } from '../background-output/install-runtime.mjs';

const runtime = fileURLToPath(new URL('../../artifacts/latest-runtime-check/', import.meta.url));
const originalHash = '2e9b6a72ba6b917197965c08eb894d4e8d01dc6f81e0e1c9870a5ae8514687a7';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const transformLatestToolCancellation = source => innerCancel(outerCancel(source, false), false);

/** 只处理固定新版的隔离npm副本；外层与内部取消在同一个原子载荷中交付。 */
export async function prepareLatestToolCancellation() {
  const dir = resolve(runtime, 'node_modules/@deepseek-ai/dsh-tools');
  const path = resolve(dir, 'lib/index.js'), originals = resolve(runtime, 'patch-originals');
  await mkdir(originals, { recursive: true });
  const actual = await realpath(runtime);
  const inside = async target => {
    const rel = relative(actual, await realpath(target));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel))
      throw Error('latest_cancellation_outside_runtime');
  };
  await inside(path); await inside(originals);
  const pkg = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-tools' || pkg.version !== '0.2.1-alpha.1')
    throw Error('latest_cancellation_version_mismatch');
  const backup = resolve(originals, 'tools-index.js'), current = await readFile(path);
  let original = current;
  if (digest(original) !== originalHash) { await inside(backup); original = await readFile(backup); }
  if (digest(original) !== originalHash) throw Error('latest_cancellation_original_mismatch');
  const modified = Buffer.from(transformLatestToolCancellation(original.toString()));
  if (![originalHash, digest(modified)].includes(digest(current))) throw Error('latest_cancellation_changed_outside_patch');
  await writeFile(backup, original);
  if (!(await readFile(path)).equals(current)) throw Error('latest_cancellation_concurrent_change');
  if (!current.equals(modified)) await replaceFile(path, modified);
  const report = { patch: 'latest-ptc-cancel-v1', version: pkg.version,
    sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc', isolatedCandidateOnly: true,
    files: [{ path, name: pkg.name, before: originalHash, after: digest(modified) }] };
  await writeFile(resolve(runtime, 'tool-cancellation-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await prepareLatestToolCancellation()));
