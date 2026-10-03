import { readFile, mkdir, writeFile, readdir, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { digest, existingInside } from '../background-output/install-runtime.mjs';
import { baseline, patchVersion, transform, transformResolver } from './changes.mjs';

export const directory = 'packages/host/open-in-app';
export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/desktop-apps/package', import.meta.url));
export const sourceRoot = fileURLToPath(new URL('../../../deepseek-harness', import.meta.url));
const prepared = resolve(outputRoot, '..');
export const hashes = {
  'src/index.ts': '6a76a3ae6b06bebd8ab31f9a473023590e14a4fa7906a4a41f69b0d852764f7f',
  'src/resolver.ts': '18a99782d539fc6b80a153572957da52e3687e856d1a6b4b2dca6c367526f504',
  'lib/index.js': '909c828941b97620db518beee55243209dac9b8efbc70ee52f55dd932379663a',
  'lib/types/index.js': '2e3d9cd1edf74deb34f7895968f3211e50dcb7b82534b9266c16afb7b40d4665',
  'lib/types/index.d.ts': '51d18093ff9b4459aeb221540b2fd04f9eb3fc374374d238186e87f9a8ddab78',
  'lib/types/resolver.js': '6d0931214d8c4ce16e77b813fe4b249ab06198ce66be8cc9532179c8ac83e1d6',
  'lib/types/resolver.d.ts': '58888a8b8cfb72d2d287d3391e767cc21326193ebe064c5be79700cc2d838b77',
};
export async function regular(root, local) {
  const file = await existingInside(root, local);
  if (!(await lstat(file)).isFile() || (await realpath(file)).toLowerCase() !== file.toLowerCase()) throw Error('Linked or non-file target');
  return file;
}
export async function targetRoot(path) {
  const root = await realpath(resolve(path));
  const reference = await realpath(sourceRoot), inside = relative(reference, root);
  if (!inside || (!inside.startsWith('..') && !isAbsolute(inside))) throw Error('Reference checkout is read-only');
  const pkg = JSON.parse(await readFile(await regular(root, `${directory}/package.json`), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-host-open-in-app' || pkg.version !== '0.1.6-alpha.2') throw Error('Package mismatch');
  return root;
}
async function writeOwned(local, bytes) {
  const path = resolve(outputRoot, local);
  await mkdir(dirname(path), { recursive: true });
  if ((await realpath(dirname(path))).toLowerCase() !== dirname(path).toLowerCase()) throw Error('Linked output parent');
  try { await writeFile(path, bytes, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || !(await readFile(await regular(outputRoot, local))).equals(Buffer.from(bytes))) throw error; }
}
export async function preparePackage(installedRoot) {
  const root = await targetRoot(installedRoot);
  const inputs = [];
  for (const name of await readdir(resolve(sourceRoot, directory, 'src'))) {
    if (!name.endsWith('.ts')) continue;
    const path = `${directory}/src/${name}`;
    const reference = await readFile(resolve(sourceRoot, path));
    const actual = await readFile(await regular(root, path));
    if (actual.toString().replaceAll('\r\n', '\n') !== reference.toString().replaceAll('\r\n', '\n')) throw Error(`Source differs from reference: ${path}`);
    inputs.push({ path, hash: digest(actual) });
  }
  for (const [name, transformSource] of [['index.ts', transform], ['resolver.ts', transformResolver]]) {
    if (await readFile(resolve(prepared, 'src', name), 'utf8') !== transformSource(await readFile(resolve(sourceRoot, directory, 'src', name), 'utf8'))) throw Error('Prepared source is stale');
  }
  // 包构建必须重新检查并编译当前副本，防止遗漏 --emit 而混入旧编译产物。
  execFileSync(process.execPath, [fileURLToPath(new URL('./typecheck.mjs', import.meta.url)), root, '--emit'],
    { cwd: fileURLToPath(new URL('../../', import.meta.url)), stdio: 'pipe', windowsHide: true });
  // 编译入口独立打包，不携带测试 internals 分片或另一份 Cordis。
  await build({ entryPoints: [resolve(prepared, 'production/lib/types/index.js')], outfile: resolve(prepared, 'production/lib/index.js'),
    bundle: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external' });
  const records = [];
  for (const [local, hash] of Object.entries(hashes)) {
    const path = `${directory}/${local}`, before = await readFile(await regular(root, path));
    if (digest(before) !== hash) throw Error(`Unknown installed baseline: ${path}`);
    const after = await readFile(resolve(prepared, local.startsWith('src/') ? local : `production/${local}`));
    await writeOwned(`before/${path}`, before); await writeOwned(`after/${path}`, after);
    records.push({ path, before: hash, after: digest(after) });
  }
  await writeOwned('manifest.json', JSON.stringify({ baseline, patchVersion, inputs, files: records }, null, 2));
  return { files: records.length, outputRoot };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await preparePackage(process.argv[2])));
