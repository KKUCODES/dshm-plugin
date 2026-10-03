import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { prepare, outputRoot } from './build.mjs';
import { directory } from './changes.mjs';
import { write } from '../pending-notifications/build-test-runtime.mjs';
import { digest, existingInside } from '../background-output/install-runtime.mjs';

export const runtimeBaselines = {
  [`${directory}/lib/client.js`]: '3f7769d5f860961d412810d6a88a359ba05fe19b77624bf6a31207dae6c22760',
  [`${directory}/lib/types/client/entries.d.ts`]: '02379b85acc160d4966b387b9633bf884402c953a9e6b853cdfb73d09eea422c',
};
export const sourcePaths = ['index', 'manifest', 'system', 'entries', 'entry-lifecycle'].map(name => `${directory}/src/client/${name}.ts`);
export async function buildRuntime(installedRoot) {
  const root = await realpath(resolve(installedRoot));
  const originals = new Map();
  for (const [path, expected] of Object.entries(runtimeBaselines)) {
    const bytes = await readFile(await existingInside(root, path));
    if (digest(bytes) !== expected) throw Error(`Unexpected original runtime: ${path}`);
    originals.set(path, bytes);
  }
  await prepare();
  execFileSync(process.execPath, [fileURLToPath(new URL('./typecheck.mjs', import.meta.url)), root], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)), windowsHide: true, stdio: 'pipe' });
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
  const files = [];
  for (const [path, before] of originals) {
    const after = await readFile(resolve(outputRoot, path.endsWith('client.js') ? 'client.js' : 'types/entries.d.ts'));
    await write(resolve(outputRoot, 'runtime-original', path), before);
    await write(resolve(outputRoot, 'runtime', path), after);
    files.push({ path, before: digest(before), after: digest(after) });
  }
  await write(resolve(outputRoot, 'runtime-manifest.json'), JSON.stringify({ ...manifest,
    package: { name: '@deepseek-ai/dsh-client-modules', version: '0.1.6-alpha.2' }, files }, null, 2) + '\n');
  return { sourceInputs: manifest.sourceInputs.length, runtimeFiles: files.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await buildRuntime(process.argv[2])));
