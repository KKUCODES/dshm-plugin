import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceFile } from '../install-files.mjs';

export function transformLatestAutoReviewCancellation(source, typescript = false) {
  const replaceOne = (old, value) => {
    if (source.split(old).length !== 2) throw Error('latest_auto_review_anchor_mismatch');
    source = source.replace(old, value);
  };
  const declaration = typescript
    ? 'async function readDecision(stream: AsyncIterable<StreamChunk>): Promise<AutoReviewDecision> {'
    : 'async function readDecision(stream) {';
  replaceOne(declaration, 'class AutoReviewAbortError extends Error {}\n' + declaration);
  const end = 'throw new Error(`auto-review: reviewer ended with ${chunk.reason.kind} ${code}: ${message}`)';
  replaceOne(end, 'if (chunk.reason.kind === "aborted" && code === "ABORTED") throw new AutoReviewAbortError(`auto-review: reviewer ended with ${chunk.reason.kind} ${code}: ${message}`)\n        ' + end);
  replaceOne('if (!review.ok) return failed(exec, review.error)',
    'if (!review.ok) {\n          // 只把明确的原流取消归为取消；UNKNOWN或真正故障继续保留失败。\n          if (exec.signal.aborted && review.error instanceof AutoReviewAbortError) return { kind: "cancel" }\n          return failed(exec, review.error)\n        }');
  return source;
}
const runtime = fileURLToPath(new URL('../../artifacts/latest-runtime-check/', import.meta.url));
const originalHash = '697b168133d5d9a3c2b33380cc407b8e94d9c454791b66d2173049af5e8d0033';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function prepareLatestAutoReviewCancellation() {
  const dir = resolve(runtime, 'node_modules/@deepseek-ai/dsh-experimental-auto-review');
  const pkg = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-experimental-auto-review' || pkg.version !== '0.2.1-alpha.1') throw Error('latest_auto_review_version_mismatch');
  const path = resolve(dir, 'lib/index.js'), originals = resolve(runtime, 'patch-originals');
  await mkdir(originals, { recursive: true });
  const actual = await realpath(runtime);
  for (const target of [path, originals]) {
    const rel = relative(actual, await realpath(target));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_auto_review_outside_runtime');
  }
  const backup = resolve(originals, 'auto-review-index.js'), current = await readFile(path);
  const original = hash(current) === originalHash ? current : await readFile(backup);
  if (hash(original) !== originalHash) throw Error('latest_auto_review_original_mismatch');
  const modified = Buffer.from(transformLatestAutoReviewCancellation(original.toString()));
  if (![originalHash, hash(modified)].includes(hash(current))) throw Error('latest_auto_review_outside_change');
  await writeFile(backup, original);
  if (!(await readFile(path)).equals(current)) throw Error('latest_auto_review_concurrent_change');
  if (!current.equals(modified)) await replaceFile(path, modified);
  const report = { patch: 'latest-auto-review-cancel-v1', version: pkg.version, isolatedCandidateOnly: true,
    files: [{ path, name: pkg.name, before: originalHash, after: hash(modified) }] };
  await writeFile(resolve(runtime, 'auto-review-cancel-patch.json'), JSON.stringify(report, null, 2)); return report;
}
