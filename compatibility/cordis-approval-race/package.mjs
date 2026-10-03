import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { build } from 'esbuild';
import { digest } from '../background-output/install-runtime.mjs';
import { directory, targetRoot, regular, sourceRoot, generatedHashes, baseline } from '../cordis-inspect/package.mjs';
import { transform as inspectTransform, transformRunner } from '../cordis-inspect/changes.mjs';
import { hashes, transform } from './changes.mjs';

export { directory, targetRoot, regular, generatedHashes, baseline, hashes };
export const patchVersion = 'cordis-approval-race-v1';
export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/cordis-approval-race', import.meta.url));

export async function preparePackage(target) {
  const root = await targetRoot(target), inputs = [];
  await mkdir(resolve(outputRoot, 'src'), { recursive: true });
  for (const name of await readdir(resolve(sourceRoot, directory, 'src'))) {
    if (!name.endsWith('.ts')) continue;
    const local = `src/${name}`, reference = await readFile(resolve(sourceRoot, directory, local), 'utf8');
    const expected = name === 'index.ts' ? transformRunner(reference)
      : name === 'inspect-registry.ts' ? inspectTransform(reference) : reference;
    const installed = await readFile(await regular(root, `${directory}/${local}`), 'utf8');
    if (installed !== expected) throw Error(`Unsupported source input: ${local}`);
    inputs.push({ path: `${directory}/${local}`, hash: digest(installed) });
    await writeFile(resolve(outputRoot, local), name === 'index.ts' ? transform(installed) : installed);
  }
  for (const [local, hash] of Object.entries(generatedHashes)) {
    if (digest(await readFile(await regular(root, `${directory}/${local}`))) !== hash) throw Error('Generated interface changed');
    inputs.push({ path: `${directory}/${local}`, hash });
  }
  const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, noUncheckedIndexedAccess: true,
    skipLibCheck: true, declaration: true, rewriteRelativeImportExtensions: true, allowImportingTsExtensions: true,
    esModuleInterop: true, rootDir: resolve(outputRoot, 'src'), outDir: resolve(outputRoot, 'production/lib/types'),
    typeRoots: [resolve('node_modules/@types')], types: ['node'] };
  const program = ts.createProgram([resolve(outputRoot, 'src/index.ts')], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: value => value, getNewLine: () => '\n' }));
  const result = program.emit(); if (result.emitSkipped || result.diagnostics.length) throw Error('Runner emission failed');
  await build({ entryPoints: [resolve(outputRoot, 'production/lib/types/index.js')], outfile: resolve(outputRoot, 'production/lib/index.js'),
    bundle: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external' });
  const files = [];
  for (const [local, hash] of Object.entries(hashes)) {
    const path = `${directory}/${local}`, before = await readFile(await regular(root, path));
    if (digest(before) !== hash) throw Error(`Unsupported installed runtime: ${local}`);
    const after = await readFile(resolve(outputRoot, local.startsWith('src/') ? local : `production/${local}`));
    for (const [kind, bytes] of [['before', before], ['after', after]]) {
      const destination = resolve(outputRoot, kind, path); await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    files.push({ path, before: hash, after: digest(after) });
  }
  await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify({ baseline, patchVersion, inputs, files }, null, 2));
  return { files: files.length, outputRoot, strictTypecheck: true };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await preparePackage(process.argv[2])));
