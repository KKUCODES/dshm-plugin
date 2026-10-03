import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseline, patchVersion, changes } from './changes.mjs';
import { buildRuntime as prepare, outputRoot, write } from './build-test-runtime.mjs';
import { sourceRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { digest, existingInside } from '../background-output/install-runtime.mjs';

const pluginRoot = fileURLToPath(new URL('../../', import.meta.url));
export const directory = 'packages/api/gateway';
// 核对过的本机固定基线编译文件；不同构建不能仅凭相同版本号覆盖。
export const runtimeBaselines = {
  [`${directory}/lib/index.js`]: '4410b2a92fb12cedb1ce7eb5238ac83b7355131cabf67ecdad91b8b43ddb3e15',
  [`${directory}/lib/types/index.d.ts`]: '8cbb8e0c87e7d1c7a1a3be2b2e89936d3066d14163b9249b87e41cd455c4e3df',
  [`${directory}/lib/types/types.d.ts`]: '829117746d9c892b3f20e29de09b3803ec317f22808aa0df9b1fb90bc9e2653c',
};

export async function buildRuntime(installedRoot) {
  const root = await realpath(resolve(installedRoot));
  const pkg = JSON.parse(await readFile(await existingInside(root, `${directory}/package.json`), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-api-gateway' || pkg.version !== '0.1.6-alpha.2') throw Error('Gateway package mismatch');
  // 在生成新产物前确认原始编译文件，防止已安装的不同代补丁被重新定义为基线。
  const originals = new Map();
  for (const [path, hash] of Object.entries(runtimeBaselines)) {
    const bytes = await readFile(await existingInside(root, path));
    if (digest(bytes) !== hash) throw Error(`Restore existing patch before rebuilding: ${path}`);
    originals.set(path, bytes);
  }
  await prepare();
  const overrides = new Map(await Promise.all(changes.map(async change => [resolve(sourceRoot, change.path).toLowerCase(),
    applyChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'))])));
  const result = await build({ absWorkingDir: sourceRoot,
    entryPoints: [resolve(sourceRoot, directory, 'src/index.ts')],
    bundle: true, write: false, metafile: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external',
    plugins: [{ name: 'production-gateway', setup(builder) {
      builder.onLoad({ filter: /\.ts$/ }, args => {
        const contents = overrides.get(args.path.toLowerCase());
        if (contents !== undefined) return { contents, loader: 'ts', resolveDir: dirname(args.path) };
      });
    } }],
  });
  const originalModule = await build({ entryPoints: [resolve(root, directory, 'lib/index.js')],
    bundle: false, write: false, metafile: true, format: 'esm', platform: 'node', logLevel: 'silent' });
  const exports = Object.values(result.metafile.outputs)[0].exports;
  const beforeExports = Object.values(originalModule.metafile.outputs)[0].exports;
  if (JSON.stringify([...exports].sort()) !== JSON.stringify([...beforeExports].sort())) throw Error('Production exports changed');
  const sourceInputs = [];
  for (const path of Object.keys(result.metafile.inputs)) {
    const before = normalize(await readFile(await existingInside(sourceRoot, path), 'utf8'));
    const after = overrides.get(resolve(sourceRoot, path).toLowerCase()) ?? before;
    const actual = normalize(await readFile(await existingInside(root, path), 'utf8'));
    if (actual !== before && actual !== after) throw Error(`Source input mismatch: ${path}`);
    sourceInputs.push({ path, before: digest(before), after: digest(after) });
  }
  // types.ts 被类型擦除，仍作为声明产物的必检输入。
  for (const change of changes) if (!sourceInputs.some(input => input.path === change.path)) {
    const before = normalize(await readFile(resolve(sourceRoot, change.path), 'utf8'));
    const after = applyChange(change, before);
    const actual = normalize(await readFile(await existingInside(root, change.path), 'utf8'));
    if (actual !== before && actual !== after) throw Error(`Source input mismatch: ${change.path}`);
    sourceInputs.push({ path: change.path, before: digest(before), after: digest(after) });
  }
  execFileSync(process.execPath, ['compatibility/pending-notifications/typecheck.mjs', root, '--emit'],
    { cwd: pluginRoot, windowsHide: true, stdio: 'inherit' });
  await write(resolve(outputRoot, 'runtime', directory, 'lib/index.js'), result.outputFiles[0].contents);
  const files = [];
  for (const [path, before] of originals) {
    const after = await readFile(resolve(outputRoot, 'runtime', path));
    await write(resolve(outputRoot, 'runtime-original', path), before);
    files.push({ path, before: digest(before), after: digest(after) });
  }
  await write(resolve(outputRoot, 'runtime-manifest.json'), JSON.stringify({ baseline, patchVersion,
    package: { name: pkg.name, version: pkg.version }, sourceInputs, files }, null, 2) + '\n');
  return { files: files.length, sourceInputs: sourceInputs.length, exports };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw Error('Specify the verified DSH source installation');
  console.log(JSON.stringify(await buildRuntime(process.argv[2])));
}
