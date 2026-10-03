import { readFile, mkdir, readdir, writeFile, symlink, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { build } from 'esbuild';
import { hashes, transform } from './changes.mjs';
import { outputRoot, targetRoot, regular, owned, verifyBaseline } from './package.mjs';

const root = await targetRoot(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
await verifyBaseline(root);
const packages = ['packages/shell/pwsh-local', 'packages/sandbox/sandbox-windows-acl'];
const diagnostics = [];
for (const pkg of packages) {
  const dest = resolve(outputRoot, pkg); await mkdir(resolve(dest, 'src'), { recursive: true });
  const modules = resolve(dest, 'node_modules'), sourceModules = resolve(root, pkg, 'node_modules');
  try { await lstat(modules); } catch (e) { if (e.code !== 'ENOENT') throw e; await symlink(sourceModules, modules, 'junction'); }
  if ((await realpath(modules)).toLowerCase() !== (await realpath(sourceModules)).toLowerCase()) throw Error('Unexpected dependency junction');
  const files = (await readdir(resolve(root, pkg, 'src'))).filter(n => n.endsWith('.ts'));
  for (const name of files) {
    const path = `${pkg}/src/${name}`, source = await readFile(await regular(root, path), 'utf8');
    await writeFile(await owned(path), path in hashes ? transform(path, source) : source);
  }
  const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, noUncheckedIndexedAccess: true,
    skipLibCheck: true, declaration: true, rewriteRelativeImportExtensions: true, allowImportingTsExtensions: true,
    esModuleInterop: true, rootDir: resolve(dest, 'src'), outDir: resolve(dest, 'lib/types'),
    typeRoots: [resolve('node_modules/@types')], types: ['node'] };
  await writeFile(await owned(`${pkg}/package.json`), JSON.stringify({ type: 'module' }));
  for (const name of files) for (const suffix of ['.js', '.d.ts']) await owned(`${pkg}/lib/types/${name.replace(/\.ts$/, suffix)}`);
  const program = ts.createProgram(files.map(n => resolve(dest, 'src', n)), options);
  const found = ts.getPreEmitDiagnostics(program);
  if (found.length) throw Error(ts.formatDiagnosticsWithColorAndContext(found, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: v => v, getNewLine: () => '\n' }));
  const emitted = program.emit(); if (emitted.emitSkipped || emitted.diagnostics.length) throw Error('Encoding patch emit failed');
  const entries = pkg.endsWith('/pwsh-local') ? ['index'] : ['index', 'runner'];
  for (const entry of entries) await build({ entryPoints: [resolve(dest, `lib/types/${entry}.js`)],
    outfile: await owned(`${pkg}/lib/${entry}.js`), bundle: true, platform: 'node', format: 'esm', target: 'es2024', packages: 'external' });
  diagnostics.push({ package: pkg, sourceFiles: files.length, strictTypecheck: true, entries });
}
await writeFile(await owned('build.json'), JSON.stringify({ at: new Date().toISOString(), diagnostics }, null, 2));
console.log(JSON.stringify({ outputRoot, diagnostics }));
