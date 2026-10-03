import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { directory, patchVersion, hashes, digest, transform } from './changes.mjs';
import { targetRoot, regular } from '../cordis-inspect/package.mjs';

export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/plugin-restart-notice/', import.meta.url));
export async function prepare(target) {
  const root = await targetRoot(target), overrides = new Map(), originals = new Map();
  for (const [path, expected] of Object.entries(hashes)) {
    const data = await readFile(await regular(root, path));
    if (digest(data) !== expected) throw Error(`Unknown restart-notice baseline: ${path}`);
    originals.set(path, data);
    if (!path.endsWith('/lib/client.js')) overrides.set(resolve(root, path).toLowerCase(), transform(path, data.toString('utf8')));
  }
  const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    noImplicitOverride: true, noUnusedLocals: true, noUnusedParameters: true,
    skipLibCheck: true, esModuleInterop: true, allowImportingTsExtensions: true, noEmit: true,
    typeRoots: [resolve(root, 'scripts/types'), resolve(root, 'node_modules/@types')], types: ['node', 'client-build-environment'] };
  const host = ts.createCompilerHost(options), originalRead = host.readFile;
  host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
  const program = ts.createProgram(['src/client/index.ts', 'src/css-modules.d.ts'].map(path => resolve(root, directory, path)), options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n' }));
  const require = createRequire(resolve(root, 'package.json'));
  const { build } = await import(pathToFileURL(require.resolve('tsdown')).href);
  const { clientBundle } = await import(pathToFileURL(resolve(root, 'packages/client/tsdown.client.ts')).href);
  const config = clientBundle('@deepseek-ai/dsh-client-ui-plugin-manager', [])({ env: {} }).at(-1);
  await build({ ...config, config: false, cwd: resolve(root, directory),
    entry: { client: resolve(root, directory, 'src/client/index.ts') }, outDir: resolve(outputRoot, 'bundle'),
    plugins: [{ name: 'restart-notice-candidate', load: { order: 'pre', handler(id) {
      const code = overrides.get(resolve(id).toLowerCase()); return code === undefined ? null : { code };
    } } }, ...config.plugins] });
  const files = [];
  for (const [path, before] of originals) {
    const after = path.endsWith('/lib/client.js') ? await readFile(resolve(outputRoot, 'bundle/client.js'))
      : Buffer.from(overrides.get(resolve(root, path).toLowerCase()));
    for (const [side, bytes] of [['before', before], ['after', after]]) {
      const out = resolve(outputRoot, side, path); await mkdir(dirname(out), { recursive: true }); await writeFile(out, bytes);
    }
    files.push({ path, before: digest(before), after: digest(after) });
  }
  await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify({ patchVersion, files }, null, 2));
  return { patchVersion, strictTypecheck: true, files: files.length, installed: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await prepare(process.argv[2])));
