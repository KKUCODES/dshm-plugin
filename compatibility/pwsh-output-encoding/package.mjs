import { readFile, writeFile, mkdir, realpath, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, existingInside } from '../background-output/install-runtime.mjs';

export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/pwsh-output-encoding', import.meta.url));
export const baseline = JSON.parse(await readFile(new URL('./baseline.json', import.meta.url), 'utf8'));
export const patchVersion = 'pwsh-output-encoding-v1';
const reference = fileURLToPath(new URL('../../../deepseek-harness', import.meta.url));
export async function targetRoot(target) {
  const root = await realpath(resolve(target));
  if (root.toLowerCase() === (await realpath(reference)).toLowerCase()) throw Error('Reference checkout is read-only');
  return root;
}
export async function regular(root, path) {
  const result = await existingInside(root, path);
  if ((await realpath(result)).toLowerCase() !== result.toLowerCase() || !(await lstat(result)).isFile()) throw Error(`Linked or non-file input: ${path}`);
  return result;
}
export async function owned(path) {
  const destination = resolve(outputRoot, path);
  if (!destination.toLowerCase().startsWith(outputRoot.toLowerCase() + '\\')) throw Error('Unsafe output path');
  await mkdir(dirname(destination), { recursive: true });
  if ((await realpath(dirname(destination))).toLowerCase() !== dirname(destination).toLowerCase()) throw Error('Linked output directory');
  try { if (!(await lstat(destination)).isFile() || (await lstat(destination)).isSymbolicLink()) throw Error('Linked output file'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  return destination;
}
export async function verifyBaseline(root) {
  for (const [path, hash] of Object.entries(baseline.hashes)) {
    if (digest(await readFile(await regular(root, path))) !== hash) throw Error(`Unsupported encoding baseline: ${path}`);
  }
}
export async function preparePackage(target) {
  const root = await targetRoot(target); await verifyBaseline(root);
  const files = [];
  for (const path of baseline.outputs) {
    const before = await readFile(await regular(root, path));
    const after = await readFile(await regular(outputRoot, path));
    for (const [folder, bytes] of [['before', before], ['after', after]]) {
      const destination = await owned(`${folder}/${path}`);
      try { await writeFile(destination, bytes, { flag: 'wx' }); }
      catch (e) { if (e.code !== 'EEXIST' || !(await readFile(destination)).equals(bytes)) throw e; }
    }
    files.push({ path, before: digest(before), after: digest(after) });
  }
  const manifest = { patchVersion, inputs: baseline.hashes, files };
  await writeFile(await owned('manifest.json'), JSON.stringify(manifest, null, 2));
  return { files: files.length, outputRoot };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await preparePackage(process.argv[2])));
