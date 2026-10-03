import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare, sourceRoot, outputRoot } from './prepare.mjs';
import { changes } from './changes.mjs';

await prepare();
const pluginRoot = fileURLToPath(new URL('../../', import.meta.url));
const declarationRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const emitDeclarations = process.argv.includes('--emit');
const options = {
  target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true,
  noUnusedLocals: true, noUnusedParameters: true, skipLibCheck: true, noEmit: !emitDeclarations,
  declaration: emitDeclarations, emitDeclarationOnly: emitDeclarations,
  rootDir: sourceRoot, outDir: resolve(outputRoot, 'runtime'),
  allowImportingTsExtensions: true, esModuleInterop: true,
  typeRoots: [resolve(pluginRoot, 'node_modules/@types')], types: ['node'],
};
const overrides = new Map(await Promise.all(changes.map(async change => [
  resolve(sourceRoot, change.path).toLowerCase(), await readFile(resolve(outputRoot, 'patched', change.path), 'utf8'),
])));
const paths = {
  '@deepseek-ai/dsh-jobs': 'packages/jobs/jobs/src/index.ts',
  '@deepseek-ai/dsh-shell': 'packages/shell/shell/src/index.ts',
  '@deepseek-ai/dsh-subprocess': 'packages/subprocess/subprocess/src/index.ts',
};
const host = ts.createCompilerHost(options);
if (emitDeclarations) host.writeFile = (path, text) => {
  const local = relative(resolve(outputRoot, 'runtime'), path).replaceAll('\\', '/');
  if (local.startsWith('../') || !local.startsWith('packages/') || !local.endsWith('.d.ts') || !local.includes('/src/')) {
    throw new Error(`Unexpected declaration output: ${local}`);
  }
  const target = resolve(outputRoot, 'runtime', local.replace('/src/', '/lib/types/'));
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text);
};
const originalRead = host.readFile;
host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
host.resolveModuleNames = (names, containingFile) => names.map(name => {
  if (paths[name]) return { resolvedFileName: resolve(sourceRoot, paths[name]), extension: ts.Extension.Ts };
  if (name === '@deepseek-ai/dsh-http-proxy') return {
    resolvedFileName: resolve(declarationRoot, 'packages/util/http-proxy/lib/types/index.d.ts'), extension: ts.Extension.Dts,
  };
  const lookup = name.startsWith('.') ? containingFile : resolve(pluginRoot, 'typecheck.ts');
  return ts.resolveModuleName(name, lookup, options, host).resolvedModule
    ?? ts.resolveModuleName(name, resolve(declarationRoot, 'typecheck.ts'), options, host).resolvedModule;
});
const program = ts.createProgram(changes.map(change => resolve(sourceRoot, change.path)), options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => dirname(sourceRoot), getCanonicalFileName: name => name, getNewLine: () => '\n',
  })); process.exitCode = 1;
} else {
  if (emitDeclarations) {
    const result = program.emit();
    if (result.emitSkipped || result.diagnostics.length) throw new Error('Declaration emit failed');
  }
  console.log(`Strict typecheck passed for 10 patched source files${emitDeclarations ? '; declarations emitted to owned runtime directory' : ''}.`);
}
