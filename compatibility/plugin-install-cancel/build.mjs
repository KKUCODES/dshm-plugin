import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseline, patchVersion, directory, changes } from './changes.mjs';
import { sourceRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { digest, existingInside } from '../background-output/install-runtime.mjs';
import { write } from '../pending-notifications/build-test-runtime.mjs';

export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/plugin-install-cancel/', import.meta.url)).replace(/[\\/]$/, '');
export const runtimeBaselines = {
  [`${directory}/lib/index.js`]: 'c4e78d334a928596cb02a25376b8aab482d1cb8aa3368f34f56335a7716a5e86',
  [`${directory}/lib/types/operations.js`]: '85231dd641823e34e2836697ef2fce06dfae13f11407574122580f407160cb88',
};
export async function buildRuntime(installedRoot) {
  const root = await realpath(resolve(installedRoot));
  if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim() !== baseline) throw Error('Reference baseline mismatch');
  const overrides = new Map(await Promise.all(changes.map(async change => [resolve(sourceRoot, change.path).toLowerCase(), applyChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'))])));
  const inputs = new Set(), files = [];
  for (const [path, expected] of Object.entries(runtimeBaselines)) {
    const before = await readFile(await existingInside(root, path));
    if (digest(before) !== expected) throw Error(`Original runtime mismatch: ${path}`);
    const entry = path.endsWith('/lib/index.js') ? 'index' : 'operations';
    const result = await build({ absWorkingDir: sourceRoot,
      entryPoints: [resolve(sourceRoot, directory, `src/${entry}.ts`)],
      bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2024', packages: 'external', metafile: true,
      plugins: [{ name: 'verified-install-cancel', setup(builder) {
        builder.onResolve({ filter: /^@deepseek-ai\// }, args => ({ path: args.path, external: true }));
        builder.onLoad({ filter: /\.ts$/ }, args => {
          const contents = overrides.get(args.path.toLowerCase());
          if (contents !== undefined) return { contents, loader: 'ts', resolveDir: dirname(args.path) };
        });
      } }],
    });
    const original = await build({ stdin: { contents: before.toString('utf8'), loader: 'js' },
      bundle: false, write: false, format: 'esm', platform: 'node', metafile: true });
    const exports = new Set(Object.values(result.metafile.outputs)[0].exports);
    for (const name of Object.values(original.metafile.outputs)[0].exports) if (!exports.has(name)) throw Error(`Missing public export: ${name}`);
    for (const input of Object.keys(result.metafile.inputs)) inputs.add(input.replaceAll('\\', '/'));
    const after = result.outputFiles[0].contents;
    await write(resolve(outputRoot, 'runtime-original', path), before);
    await write(resolve(outputRoot, 'runtime', path), after);
    files.push({ path, before: digest(before), after: digest(after) });
  }
  const sourceInputs = [];
  for (const path of inputs) {
    if (!path.startsWith(`${directory}/src/`)) throw Error(`Unexpected bundled source: ${path}`);
    const before = normalize(await readFile(resolve(sourceRoot, path), 'utf8'));
    const after = overrides.get(resolve(sourceRoot, path).toLowerCase()) ?? before;
    if (normalize(await readFile(await existingInside(root, path), 'utf8')) !== before) throw Error(`Installed source mismatch: ${path}`);
    await write(resolve(outputRoot, 'original', path), before);
    await write(resolve(outputRoot, 'patched', path), after);
    sourceInputs.push({ path, before: digest(before), after: digest(after) });
  }
  await write(resolve(outputRoot, 'runtime-manifest.json'), JSON.stringify({ baseline, patchVersion,
    package: { name: '@deepseek-ai/dsh-plugin-manager', version: '0.1.6-alpha.2' }, sourceInputs, files }, null, 2) + '\n');
  return { sourceInputs: sourceInputs.length, runtimeFiles: files.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await buildRuntime(process.argv[2])));
