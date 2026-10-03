import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { mkdirSync, writeFileSync, realpathSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changes } from './changes.mjs';
import { applyChange, sourceRoot } from '../background-output/prepare.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const declarationRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const emit = process.argv.includes('--emit');
const declarations = new Map();
const overrides = new Map(await Promise.all(changes.map(async change => [resolve(sourceRoot, change.path).toLowerCase(),
  applyChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'))])));
const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true, noImplicitOverride: true, noUnusedLocals: true, noUnusedParameters: true,
  skipLibCheck: true, noEmit: !emit, declaration: emit, emitDeclarationOnly: emit,
  rootDir: resolve(sourceRoot, 'packages/api/gateway/src'),
  outDir: resolve(root, 'artifacts/compatibility/pending-notifications/runtime/packages/api/gateway/lib/types'),
  allowImportingTsExtensions: true, esModuleInterop: true,
  typeRoots: [resolve(root, 'node_modules/@types')], types: ['node'] };
const host = ts.createCompilerHost(options), originalRead = host.readFile;
host.writeFile = (path, text) => {
  if (['index.d.ts', 'types.d.ts'].some(name => resolve(path) === resolve(options.outDir, name))) declarations.set(path, text);
};
host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
host.resolveModuleNames = (names, file) => names.map(name => name === '@deepseek-ai/dsh-host-webserver'
  ? { resolvedFileName: resolve(declarationRoot, 'packages/host/webserver/lib/types/index.d.ts'), extension: ts.Extension.Dts }
  : ts.resolveModuleName(name,
  name.startsWith('.') ? file : resolve(root, 'typecheck.ts'), options, host).resolvedModule
  ?? ts.resolveModuleName(name, resolve(declarationRoot, 'typecheck.ts'), options, host).resolvedModule);
const program = ts.createProgram(changes.map(change => resolve(sourceRoot, change.path)), options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root,
    getCanonicalFileName: name => name, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else {
  if (emit) {
    const result = program.emit();
    if (result.emitSkipped || result.diagnostics.length || declarations.size !== 2) throw Error('Declaration emit failed');
    mkdirSync(options.outDir, { recursive: true });
    if (realpathSync(options.outDir).toLowerCase() !== options.outDir.toLowerCase()) throw Error('Linked declaration directory');
    for (const [path, text] of declarations) {
      try { if (!lstatSync(path).isFile()) throw Error('Declaration output is not a regular file'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      writeFileSync(path, text);
    }
  }
  console.log('Strict typecheck passed for pending-notifications Gateway patch.');
}
