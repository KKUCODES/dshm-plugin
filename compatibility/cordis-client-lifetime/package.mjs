import ts from 'typescript';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputRoot } from './build.mjs';
import { hashes, transform } from './changes.mjs';
import { baseline, patchVersion, runtimeHashes } from './baselines.mjs';
import { digest, existingInside } from '../background-output/install-runtime.mjs';

async function writeOwned(local, bytes) {
  const path = resolve(outputRoot, local);
  await mkdir(dirname(path), { recursive: true });
  if ((await realpath(dirname(path))).toLowerCase() !== dirname(path).toLowerCase()) throw Error('Linked artifact directory');
  try { await writeFile(path, bytes, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || !(await readFile(path)).equals(Buffer.from(bytes))) throw error; }
}
export async function preparePackage(target) {
  const root = await realpath(resolve(target));
  const candidates = new Map();
  for (const path of Object.keys(hashes)) {
    const source = await readFile(await existingInside(root, `packages/extensions/${path}`), 'utf8');
    const after = transform(path, source);
    if (await readFile(resolve(outputRoot, 'source', path), 'utf8') !== after) throw Error(`Stale build input: ${path}`);
    candidates.set(path, Buffer.from(after));
    const transpiled = ts.transpileModule(after, { fileName: path, compilerOptions: {
      target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, rewriteRelativeImportExtensions: true,
    } });
    // 不引用旧的js.map；浏览器bundle另带由原构建器生成的新source map。
    candidates.set(path.replace('/src/', '/lib/types/').replace(/\.ts$/, '.js'), Buffer.from(transpiled.outputText));
    candidates.set(path.replace('/src/', '/lib/types/').replace(/\.ts$/, '.d.ts'),
      await readFile(resolve(outputRoot, 'types', path.replace(/\.ts$/, '.d.ts'))));
  }
  for (const name of ['ui-cordis', 'cordis-client-runner']) for (const extension of ['js', 'js.map']) {
    candidates.set(`${name}/lib/client.${extension}`, await readFile(resolve(outputRoot, 'runtime', name, `client.${extension}`)));
  }
  const files = [];
  for (const [path, hash] of Object.entries(runtimeHashes)) {
    const before = await readFile(await existingInside(root, `packages/extensions/${path}`)), after = candidates.get(path);
    if (digest(before) !== hash || !after) throw Error(`Unsupported installed file: ${path}`);
    await writeOwned(`before/${path}`, before); await writeOwned(`after/${path}`, after);
    files.push({ path, before: hash, after: digest(after) });
  }
  await writeOwned('manifest.json', JSON.stringify({ baseline, patchVersion, files }, null, 2));
  return { files: files.length, outputRoot };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await preparePackage(process.argv[2])));
