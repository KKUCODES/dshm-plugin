import { readFile, writeFile, mkdir, readdir, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { digest, existingInside } from '../background-output/install-runtime.mjs';
import { transform, transformRunner } from './changes.mjs';

export const baseline = 'ddefc45fbc7f8e46dd73185e68295696d1297887';
export const patchVersion = 'cordis-inspect-v1';
export const directory = 'packages/extensions/cordis-host-runner';
export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/cordis-inspect/package', import.meta.url));
export const sourceRoot = fileURLToPath(new URL('../../../deepseek-harness', import.meta.url));
const prepared = resolve(outputRoot, '..');
export const hashes = {
  'src/index.ts': '6cf4486a16f335ab13e120d131ac0e4c0e296116061cd920ecac7e0ef65f10dc',
  'src/inspect-registry.ts': '1f530c25e6eeffdf6386e2896b4555825111cb6efdb4b784fae71c3cc08e518e',
  'lib/index.js': 'c92d9b637d9113a19e5395922566e67a8b768c8181a6061d75247a1b352cf5e5',
  'lib/types/index.js': '0bbccd9a4eb6120656aa7ddd95ced83b6a20c2a064536327e7cce160a25d2231',
  'lib/types/index.d.ts': '7aea65861354133df4c772115ad3463bd60f37309237d449761a8cd1346d01d1',
  'lib/types/inspect-registry.js': '0abddf219865d07243d039d9e2c7240507afcce6a27d5c35f240620d08b31345',
  'lib/types/inspect-registry.d.ts': 'cbbbf95633e71beebeea9aaa3b9798d6442fd59161274dc82404b7d3b159f64e',
};
// 远程签名保持原生成接口，任何未知生成文件都不能与此补丁混装。
export const generatedHashes = {
  'lib/typert.host.js': '452e3e5d46f1f3ed333079628a6ed01e0903db265567daace6102bf411c42394',
  'lib/typert.remote-client.js': '112aedb6f3e94c3c571a9c552729020eb3d155320363a66c2965a2a52ae7044f',
  'lib/typert.remote-client.d.ts': '6873cd930dd7493a4fe32d09374c2d0f4514893568f131aecab914bd14f1c32f',
};
export async function regular(root, local) {
  const path = await existingInside(root, local);
  if (!(await lstat(path)).isFile() || (await realpath(path)).toLowerCase() !== path.toLowerCase()) throw Error('Linked or non-file target');
  return path;
}
export async function targetRoot(target) {
  const root = await realpath(resolve(target)), reference = await realpath(sourceRoot);
  const rel = relative(reference, root);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw Error('Reference checkout is read-only');
  const pkg = JSON.parse(await readFile(await regular(root, `${directory}/package.json`), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-cordis-host-runner' || pkg.version !== '0.1.6-alpha.2') throw Error('Package mismatch');
  return root;
}
async function writeOwned(local, bytes) {
  const path = resolve(outputRoot, local);
  await mkdir(dirname(path), { recursive: true });
  if ((await realpath(dirname(path))).toLowerCase() !== dirname(path).toLowerCase()) throw Error('Linked output directory');
  try { await writeFile(path, bytes, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || !(await readFile(await regular(outputRoot, local))).equals(Buffer.from(bytes))) throw error; }
}
export async function preparePackage(target) {
  const root = await targetRoot(target), inputs = [];
  for (const name of await readdir(resolve(sourceRoot, directory, 'src'))) {
    if (!name.endsWith('.ts')) continue;
    const path = `${directory}/src/${name}`, reference = await readFile(resolve(sourceRoot, path));
    const installed = await readFile(await regular(root, path));
    if (!installed.equals(reference)) throw Error(`Source differs from reference: ${path}`);
    const expected = name === 'index.ts' ? transformRunner(reference.toString())
      : name === 'inspect-registry.ts' ? transform(reference.toString()) : reference.toString();
    if (await readFile(resolve(prepared, 'src', name), 'utf8') !== expected) throw Error(`Prepared source stale: ${name}`);
    inputs.push({ path, hash: digest(installed) });
  }
  for (const [local, hash] of Object.entries(generatedHashes)) {
    const path = `${directory}/${local}`;
    if (digest(await readFile(await regular(root, path))) !== hash) throw Error(`Unknown generated interface: ${local}`);
    inputs.push({ path, hash });
  }
  execFileSync(process.execPath, [fileURLToPath(new URL('./typecheck.mjs', import.meta.url)), '--emit'],
    { cwd: fileURLToPath(new URL('../../', import.meta.url)), stdio: 'pipe', windowsHide: true });
  await build({ entryPoints: [resolve(prepared, 'production/lib/types/index.js')], outfile: resolve(prepared, 'production/lib/index.js'),
    bundle: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external' });
  const files = [];
  for (const [local, hash] of Object.entries(hashes)) {
    const path = `${directory}/${local}`, before = await readFile(await regular(root, path));
    if (digest(before) !== hash) throw Error(`Unknown installed baseline: ${path}`);
    const after = await readFile(resolve(prepared, local.startsWith('src/') ? local : `production/${local}`));
    await writeOwned(`before/${path}`, before); await writeOwned(`after/${path}`, after);
    files.push({ path, before: hash, after: digest(after) });
  }
  await writeOwned('manifest.json', JSON.stringify({ baseline, patchVersion, inputs, files }, null, 2));
  return { files: files.length, outputRoot };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await preparePackage(process.argv[2])));
