import { build } from 'esbuild';
import { readFile, mkdir, writeFile, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { changes, applyForegroundChange, patchVersion, prerequisite } from './changes.mjs';
import { changes as backgroundChanges, baseline } from '../background-output/changes.mjs';
import { applyChange, sourceRoot, sha256 } from '../background-output/prepare.mjs';

export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/foreground-output/', import.meta.url));
const pluginRoot = fileURLToPath(new URL('../../', import.meta.url));
async function ownedTarget(target) {
  await mkdir(dirname(target), { recursive: true });
  const local = relative(await realpath(pluginRoot), await realpath(dirname(target)));
  if (local.startsWith('..') || isAbsolute(local)) throw new Error('Output escaped plugin project');
  try { if ((await lstat(target)).isSymbolicLink()) throw new Error('Output file is a link'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return target;
}
export async function sources() {
  const overrides = new Map();
  for (const change of backgroundChanges) {
    overrides.set(resolve(sourceRoot, change.path).toLowerCase(), applyChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8')));
  }
  const files = [];
  for (const change of changes) {
    const result = applyForegroundChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'));
    overrides.set(resolve(sourceRoot, change.path).toLowerCase(), result.modified);
    files.push({ path: change.path, ...result });
  }
  return { overrides, files };
}

export async function buildRuntime() {
  const { overrides, files } = await sources();
  // 这里只生成项目内副本，没有电脑安装/更新入口。
  for (const file of files) {
    for (const [kind, text] of [['original', file.original], ['patched', file.modified]]) {
      const target = resolve(outputRoot, kind, file.path), local = relative(outputRoot, target);
      if (local.startsWith('..') || isAbsolute(local)) throw new Error('Invalid output path');
      await writeFile(await ownedTarget(target), text);
    }
  }
  await writeFile(await ownedTarget(resolve(outputRoot, 'manifest.json')), JSON.stringify({ baseline, prerequisite, patchVersion,
    files: files.map(file => ({ path: file.path, originalSha256: sha256(file.original), patchedSha256: sha256(file.modified) })),
  }, null, 2) + '\n');
  let diff;
  const options = { cwd: outputRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 };
  try { diff = execFileSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--no-ext-diff', '--', 'original', 'patched'], options); }
  catch (error) { if (error.status !== 1 || typeof error.stdout !== 'string') throw error; diff = error.stdout; }
  diff = diff.split('\n').map(line => /^(diff --git |--- |\+\+\+ )/.test(line)
    ? line.replaceAll('a/original/', 'a/').replaceAll('b/patched/', 'b/') : line).join('\n');
  const patch = await ownedTarget(resolve(outputRoot, `${patchVersion}.patch`)); await writeFile(patch, diff);
  for (const [kind, reverse] of [['original', []], ['patched', ['--reverse']]]) {
    execFileSync('git', ['-c', 'core.autocrlf=false', 'apply', ...reverse, '--check', patch], { cwd: resolve(outputRoot, kind), windowsHide: true });
  }
  const aliases = {
    '@deepseek-ai/dsh-shell': 'packages/shell/shell/src/index.ts',
    '@deepseek-ai/dsh-subprocess': 'packages/subprocess/subprocess/src/index.ts',
    '@deepseek-ai/dsh-http-proxy': 'packages/util/http-proxy/src/index.ts',
    '@deepseek-ai/dsh-sandbox': 'packages/sandbox/sandbox/src/index.ts',
    '@deepseek-ai/dsh-bash-local': 'packages/shell/bash-local/src/index.ts',
    '@deepseek-ai/dsh-pwsh-local': 'packages/shell/pwsh-local/src/index.ts',
  };
  const entries = [
    ['OutputCollector', 'packages/subprocess/subprocess-local/src/output.ts'],
    ['LocalBashExecutor', 'packages/shell/bash-local/src/index.ts'],
    ['PwshLocalExecutor', 'packages/shell/pwsh-local/src/index.ts'],
    ['SandboxBashExecutor', 'packages/shell/bash-sandbox/src/index.ts'],
    ['SandboxPwshExecutor', 'packages/shell/pwsh-sandbox/src/index.ts'],
    ['* as PwshTool', 'packages/shell/tool-pwsh/src/index.ts'],
    ['* as BashTool', 'packages/shell/tool-bash/src/index.ts'],
    ['ShellEnvRegistry', 'packages/shell/shell-env/src/index.ts'],
  ];
  await build({
    stdin: { contents: entries.map(([names, path]) => `export ${names.startsWith('*') ? names : `{ ${names} }`} from ${JSON.stringify(resolve(sourceRoot, path))};`).join('\n'),
      resolveDir: sourceRoot, sourcefile: 'foreground-output-test-runtime.ts', loader: 'ts' },
    outfile: await ownedTarget(resolve(outputRoot, 'test-runtime.mjs')), bundle: true, format: 'esm', platform: 'node', target: 'node24', external: ['undici'],
    plugins: [{ name: 'verified-foreground-copy', setup(build) {
      build.onResolve({ filter: /^@deepseek-ai\// }, args => aliases[args.path]
        ? { path: resolve(sourceRoot, aliases[args.path]) } : { path: args.path, external: true });
      build.onLoad({ filter: /\.ts$/ }, args => {
        const contents = overrides.get(args.path.toLowerCase());
        if (contents !== undefined) return { contents, loader: 'ts', resolveDir: dirname(args.path) };
      });
    } }],
  });
  console.log('Built foreground output test runtime; installed DSH and reference source unchanged.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildRuntime();
