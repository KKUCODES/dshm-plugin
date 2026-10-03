import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changes, directory } from './changes.mjs';
import { applyChange, sourceRoot } from '../background-output/prepare.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const installed = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const overrides = new Map(await Promise.all(changes.map(async change => [resolve(sourceRoot, change.path).toLowerCase(), applyChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'))])));
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true,
  noUnusedLocals: true, noUnusedParameters: true, skipLibCheck: true, noEmit: true, allowImportingTsExtensions: true,
  typeRoots: [resolve(root, 'node_modules/@types')], types: ['node'] };
const host = ts.createCompilerHost(options), originalRead = host.readFile;
host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
host.resolveModuleNames = (names, file) => names.map(name => ts.resolveModuleName(name,
  name.startsWith('.') || !resolve(file).toLowerCase().startsWith(sourceRoot.toLowerCase()) ? file : resolve(installed, relative(sourceRoot, file)), options, host).resolvedModule);
const program = ts.createProgram([resolve(sourceRoot, directory, 'src/operations.ts')], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n' }));
console.log('Strict package operation typecheck passed.');
