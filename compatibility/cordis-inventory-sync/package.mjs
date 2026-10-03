import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputRoot } from './build.mjs';
import { hashes, transform } from './changes.mjs';
import { baseline, patchVersion, runtimeHashes } from './baselines.mjs';
import { regular, targetRoot } from '../cordis-inspect/package.mjs';
import { digest } from '../background-output/install-runtime.mjs';

export async function preparePackage(target) {
  const root = await targetRoot(target), candidates = new Map();
  for (const path of Object.keys(hashes)) {
    const after = transform(path, await readFile(await regular(root, `packages/${path}`), 'utf8'));
    if (await readFile(resolve(outputRoot, 'source', path), 'utf8') !== after) throw Error(`Stale build: ${path}`);
    candidates.set(path, Buffer.from(after));
    for (const extension of ['.js', '.d.ts']) candidates.set(path.replace('/src/', '/lib/types/').replace(/\.ts$/, extension),
      await readFile(resolve(outputRoot, 'types', path.replace(/\.ts$/, extension))));
  }
  for (const extension of ['js', 'js.map']) candidates.set(`extensions/ui-cordis/lib/client.${extension}`,
    await readFile(resolve(outputRoot, 'runtime/ui-cordis', `client.${extension}`)));
  for (const [name, path] of [['runner', 'extensions/cordis-host-runner'], ['remotes', 'api/remotes']]) candidates.set(`${path}/lib/index.js`, await readFile(resolve(outputRoot, 'runtime', `${name}.mjs`)));
  candidates.set('extensions/cordis-host-runner/lib/typert.host.js', await readFile(resolve(outputRoot, 'generated/typert.host.js')));
  const files = [];
  for (const [path, hash] of Object.entries(runtimeHashes)) {
    const before = await readFile(await regular(root, `packages/${path}`)), after = candidates.get(path);
    if (digest(before) !== hash || !after) throw Error(`Unsupported installed file: ${path}`);
    for (const [side, bytes] of [['before', before], ['after', after]]) {
      const output = resolve(outputRoot, side, path); await mkdir(dirname(output), { recursive: true });
      await writeFile(output, bytes);
    }
    files.push({ path, before: hash, after: digest(after) });
  }
  await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify({ baseline, patchVersion, files }, null, 2));
  return { files: files.length, outputRoot };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await preparePackage(process.argv[2])));
