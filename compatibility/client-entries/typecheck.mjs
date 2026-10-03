import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changes, directory } from './changes.mjs';
import { outputRoot } from './build.mjs';
import { write } from '../pending-notifications/build-test-runtime.mjs';
import { applyChange, sourceRoot } from '../background-output/prepare.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const declarationRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const overrides = new Map(await Promise.all(changes.map(async change => [resolve(sourceRoot, change.path).toLowerCase(),
  applyChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'))])));
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true, noImplicitOverride: true, noUnusedLocals: true, noUnusedParameters: true,
  skipLibCheck: true, declaration: true, emitDeclarationOnly: true, allowImportingTsExtensions: true,
  rootDir: resolve(sourceRoot, directory, 'src/client'), outDir: resolve(outputRoot, 'types'),
  esModuleInterop: true, typeRoots: [resolve(root, 'node_modules/@types')], types: [] };
const host = ts.createCompilerHost(options), originalRead = host.readFile, declarations = new Map();
host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
host.writeFile = (path, text) => { if (resolve(path) === resolve(options.outDir, 'entries.d.ts')) declarations.set(path, text); };
host.resolveModuleNames = (names, file) => names.map(name => name === '@deepseek-ai/dsh-package-manifest'
  ? { resolvedFileName: resolve(declarationRoot, 'packages/util/package-manifest/lib/types/index.d.ts'), extension: ts.Extension.Dts }
  : ts.resolveModuleName(name,
  name.startsWith('.') ? file : resolve(root, 'typecheck.ts'), options, host).resolvedModule
  ?? ts.resolveModuleName(name, resolve(root, '../dsh-mobile/typecheck.ts'), options, host).resolvedModule
  ?? ts.resolveModuleName(name, resolve(declarationRoot, 'typecheck.ts'), options, host).resolvedModule);
const program = ts.createProgram([resolve(sourceRoot, directory, 'src/client/index.ts')], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n' }));
const emitted = program.emit();
if (emitted.emitSkipped || emitted.diagnostics.length || declarations.size !== 1) throw Error('Client entries declaration emit failed');
for (const [path, text] of declarations) await write(path, text);
console.log('Strict client entries typecheck and declaration emit passed.');
