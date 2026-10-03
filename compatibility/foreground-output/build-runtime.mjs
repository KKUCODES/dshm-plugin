import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources, outputRoot } from './build-test-runtime.mjs';
import { changes, patchVersion, prerequisite } from './changes.mjs';
import { baseline } from '../background-output/changes.mjs';
import { sourceRoot, outputRoot as backgroundRoot, normalize } from '../background-output/prepare.mjs';
import { digest } from '../background-output/install-runtime.mjs';
import { installSource } from './install-source.mjs';

const pluginRoot = fileURLToPath(new URL('../../', import.meta.url));
// These unchanged compiled entries were verified on the fixed source build, not inferred from a filename.
export const extraBaselines = {
  'packages/shell/shell/lib/index.js': '2b521409904273bef9beb8a9a6aeb46e824775f25d8649d1de335410b8cd175b',
  'packages/shell/tool-bash/lib/types/index.d.ts': '27718efd3ad8c207fc6bfb3de6112bedda75a15c6a61d24ad2482c2057095935',
  'packages/shell/tool-pwsh/lib/types/index.d.ts': '869b1ae2b0c920335f0c3ffd699e2026efb59b4ccf14f06a0ffee9e4f9a49530',
};
export const runtimePackages = ['shell', 'bash-local', 'pwsh-local', 'tool-bash', 'tool-pwsh'].map(name => `packages/shell/${name}`);
export const runtimePaths = new Set([
  ...runtimePackages.map(directory => `${directory}/lib/index.js`),
  ...changes.filter(change => change.path.endsWith('.ts')).map(change => change.path.replace('/src/', '/lib/types/').replace(/\.ts$/, '.d.ts')),
]);

export async function buildRuntime(installedRoot) {
  await installSource('plan', installedRoot);
  const background = JSON.parse(await readFile(resolve(backgroundRoot, 'runtime-manifest.json'), 'utf8'));
  if (background.baseline !== baseline || background.patchVersion !== prerequisite) throw Error('Background runtime prerequisite mismatch');
  const { overrides } = await sources();
  const runtimeRoot = resolve(outputRoot, 'runtime');
  execFileSync(process.execPath, ['compatibility/foreground-output/typecheck.mjs', installedRoot, '--emit'],
    { cwd: pluginRoot, stdio: 'inherit', windowsHide: true });
  const inputs = new Set();
  for (const directory of runtimePackages) {
    const result = await build({
      absWorkingDir: sourceRoot, entryPoints: [resolve(sourceRoot, directory, 'src/index.ts')],
      outfile: resolve(runtimeRoot, directory, 'lib/index.js'), bundle: true, format: 'esm', platform: 'node', target: 'es2024',
      packages: 'external', metafile: true,
      plugins: [{ name: 'foreground-runtime', setup(builder) {
        // Scope/Cordis identities must come from the installation, never an inlined second instance.
        builder.onResolve({ filter: /^@deepseek-ai\// }, args => ({ path: args.path, external: true }));
        builder.onLoad({ filter: /\.ts$/ }, args => {
          const contents = overrides.get(args.path.toLowerCase());
          if (contents !== undefined) return { contents, loader: 'ts', resolveDir: dirname(args.path) };
        });
      } }],
    });
    for (const path of Object.keys(result.metafile.inputs)) inputs.add(path);
    const original = await build({ entryPoints: [resolve(installedRoot, directory, 'lib/index.js')], bundle: false,
      write: false, metafile: true, format: 'esm', platform: 'node', logLevel: 'silent' });
    const exports = Object.values(result.metafile.outputs)[0].exports;
    for (const name of Object.values(original.metafile.outputs)[0].exports) {
      if (!exports.includes(name)) throw Error(`Missing runtime export ${name}: ${directory}`);
    }
  }
  const sourceInputs = [];
  for (const path of inputs) {
    const original = normalize(await readFile(resolve(sourceRoot, path), 'utf8'));
    const combined = overrides.get(resolve(sourceRoot, path).toLowerCase()) ?? original;
    // Source preflight handles changed files; these auxiliary inputs must still be byte-equivalent upstream.
    if (combined === original && normalize(await readFile(resolve(installedRoot, path), 'utf8')) !== original) throw Error(`Source input mismatch: ${path}`);
    sourceInputs.push({ path, original: digest(original), combined: digest(combined) });
  }
  const beforeHashes = new Map(background.files.map(file => [file.path, file.after]));
  for (const [path, hash] of Object.entries(extraBaselines)) beforeHashes.set(path, hash);
  let previous;
  try { previous = JSON.parse(await readFile(resolve(outputRoot, 'runtime-manifest.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const files = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) { await collect(path); continue; }
      if (!entry.isFile()) throw Error('Unexpected runtime output');
      const local = relative(runtimeRoot, path).replaceAll('\\', '/');
      if (!runtimePaths.has(local)) continue;
      const after = await readFile(path), beforeHash = beforeHashes.get(local);
      const backup = resolve(outputRoot, 'runtime-original', local);
      let before;
      try { before = await readFile(backup); }
      catch (error) { if (error.code !== 'ENOENT') throw error; before = await readFile(resolve(installedRoot, local)); }
      if (digest(before) === digest(after)) continue;
      if (!beforeHash || digest(before) !== beforeHash) throw Error(`Unverified runtime baseline: ${local}`);
      const currentHash = digest(await readFile(resolve(installedRoot, local)));
      const old = previous?.files.find(file => file.path === local);
      if (currentHash !== beforeHash && currentHash !== old?.after) throw Error(`Installed runtime changed: ${local}`);
      // A new build must not overwrite backups or change an already-installed patch generation.
      if (currentHash !== beforeHash && digest(after) !== old.after) throw Error('Restore foreground runtime before rebuilding a different payload');
      await mkdir(dirname(backup), { recursive: true }); await writeFile(backup, before);
      files.push({ path: local, before: beforeHash, after: digest(after) });
    }
  }
  await collect(runtimeRoot);
  await writeFile(resolve(outputRoot, 'runtime-manifest.json'), JSON.stringify({ baseline, patchVersion, prerequisite,
    packages: runtimePackages, sourceInputs, files,
    backgroundFiles: background.files.filter(file => !files.some(changed => changed.path === file.path)).map(file => ({ path: file.path, hash: file.after })),
  }, null, 2) + '\n');
  return { files: files.length, packages: runtimePackages.length, sourceInputs: sourceInputs.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) throw Error('Specify the verified installed DSH directory');
  console.log(JSON.stringify(await buildRuntime(resolve(target))));
}
