import { build } from 'esbuild';
import { readFile, writeFile, mkdir, realpath, lstat } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { baseline, patchVersion, changes } from './changes.mjs';
import { sourceRoot, normalize, sha256, applyChange } from '../background-output/prepare.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const outputRoot = resolve(root, 'artifacts/compatibility/pending-notifications');
export async function write(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const local = relative(await realpath(root), await realpath(dirname(path)));
  if (local.startsWith('..') || isAbsolute(local)) throw Error('Output escaped plugin project');
  try { if (!(await lstat(path)).isFile()) throw Error('Output is not a regular file'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(path, value);
}
export async function buildRuntime() {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim();
  if (commit !== baseline) throw Error('Gateway reference commit mismatch');
  const files = await Promise.all(changes.map(async change => {
    const original = normalize(await readFile(resolve(sourceRoot, change.path), 'utf8'));
    return { path: change.path, original, patched: applyChange(change, original) };
  }));
  for (const file of files) for (const kind of ['original', 'patched']) await write(resolve(outputRoot, kind, file.path), file[kind]);
  await write(resolve(outputRoot, 'manifest.json'), JSON.stringify({ baseline, patchVersion,
    files: files.map(file => ({ path: file.path, originalSha256: sha256(file.original), patchedSha256: sha256(file.patched) })) }, null, 2) + '\n');
  let patch;
  try { patch = execFileSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--no-ext-diff', '--', 'original', 'patched'],
    { cwd: outputRoot, encoding: 'utf8', windowsHide: true }); }
  catch (error) { if (error.status !== 1 || typeof error.stdout !== 'string') throw error; patch = error.stdout; }
  patch = patch.split('\n').map(line => /^(diff --git |--- |\+\+\+ )/.test(line)
    ? line.replaceAll('a/original/', 'a/').replaceAll('b/patched/', 'b/') : line).join('\n');
  const patchPath = resolve(outputRoot, `${patchVersion}.patch`);
  await write(patchPath, patch);
  for (const kind of ['original', 'patched']) execFileSync('git', ['-c', 'core.autocrlf=false', 'apply',
    ...(kind === 'patched' ? ['--reverse'] : []), '--check', patchPath], { cwd: resolve(outputRoot, kind), windowsHide: true });
  const overrides = new Map(files.map(file => [resolve(sourceRoot, file.path).toLowerCase(), file.patched]));
  const result = await build({ absWorkingDir: root, stdin: { loader: 'ts', resolveDir: root,
    contents: `export { default } from ${JSON.stringify(resolve(sourceRoot, 'packages/api/gateway/src/index.ts'))};\nexport { TaskNotifications } from ${JSON.stringify(resolve(root, 'src/task-notifications.ts'))};` },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node24', packages: 'external',
    plugins: [{ name: 'verified-gateway-copy', setup(builder) {
      builder.onLoad({ filter: /\.ts$/ }, args => {
        const contents = overrides.get(args.path.toLowerCase());
        if (contents !== undefined) return { contents, loader: 'ts', resolveDir: dirname(args.path) };
      });
    } }],
  });
  await write(resolve(outputRoot, 'test-runtime.mjs'), result.outputFiles[0].contents);
  console.log('Built isolated Gateway notification runtime; reference and installed DSH unchanged.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildRuntime();
