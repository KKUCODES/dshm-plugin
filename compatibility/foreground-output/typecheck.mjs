import ts from 'typescript';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources, outputRoot } from './build-test-runtime.mjs';
import { changes } from './changes.mjs';
import { changes as backgroundChanges } from '../background-output/changes.mjs';
import { sourceRoot } from '../background-output/prepare.mjs';

const pluginRoot = fileURLToPath(new URL('../../', import.meta.url));
const declarationRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const { overrides } = await sources();
const emitDeclarations = process.argv.includes('--emit');
const outputDirectory = resolve(outputRoot, 'runtime');
const emittedPackages = new Set(changes.map(change => change.path.replace(/\/(src\/.*|package\.json)$/, '')));
const options = {
  target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true,
  noUnusedLocals: true, noUnusedParameters: true, skipLibCheck: true, noEmit: !emitDeclarations,
  declaration: emitDeclarations, emitDeclarationOnly: emitDeclarations, rootDir: sourceRoot, outDir: outputDirectory,
  allowImportingTsExtensions: true, esModuleInterop: true,
  typeRoots: [resolve(pluginRoot, 'node_modules/@types')], types: ['node'],
};
const paths = {
  '@deepseek-ai/dsh-jobs': 'packages/jobs/jobs/src/index.ts',
  '@deepseek-ai/dsh-shell': 'packages/shell/shell/src/index.ts',
  '@deepseek-ai/dsh-subprocess': 'packages/subprocess/subprocess/src/index.ts',
  '@deepseek-ai/dsh-bash-local': 'packages/shell/bash-local/src/index.ts',
  '@deepseek-ai/dsh-pwsh-local': 'packages/shell/pwsh-local/src/index.ts',
  '@deepseek-ai/dsh-shell-env': 'packages/shell/shell-env/src/index.ts',
};
const host = ts.createCompilerHost(options), originalRead = host.readFile;
if (emitDeclarations) host.writeFile = (path, text) => {
  const local = relative(outputDirectory, path).replaceAll('\\', '/');
  if (local.startsWith('../') || !local.endsWith('.d.ts') || !local.includes('/src/')) throw Error(`Unexpected declaration: ${local}`);
  if (!emittedPackages.has(local.split('/src/')[0])) return;
  const target = resolve(outputDirectory, local.replace('/src/', '/lib/types/'));
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, text);
};
host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
host.resolveModuleNames = (names, containingFile) => names.map(name => {
  if (paths[name]) return { resolvedFileName: resolve(sourceRoot, paths[name]), extension: ts.Extension.Ts };
  if (name === '@deepseek-ai/dsh-http-proxy') return { resolvedFileName: resolve(declarationRoot, 'packages/util/http-proxy/lib/types/index.d.ts'), extension: ts.Extension.Dts };
  const lookup = name.startsWith('.') ? containingFile : resolve(pluginRoot, 'typecheck.ts');
  return ts.resolveModuleName(name, lookup, options, host).resolvedModule
    ?? ts.resolveModuleName(name, resolve(declarationRoot, 'typecheck.ts'), options, host).resolvedModule;
});
const entries = [...new Set([...backgroundChanges, ...changes].filter(change => change.path.endsWith('.ts')).map(change => resolve(sourceRoot, change.path))),
  ...['bash-sandbox', 'pwsh-sandbox'].map(name => resolve(sourceRoot, `packages/shell/${name}/src/index.ts`))];
const program = ts.createProgram(entries, options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => pluginRoot, getCanonicalFileName: name => name, getNewLine: () => '\n',
  })); process.exitCode = 1;
} else {
  if (emitDeclarations) {
    const result = program.emit();
    if (result.emitSkipped || result.diagnostics.length) throw Error('Declaration emit failed');
  }
  console.log('Strict typecheck passed for combined background/foreground patch and both sandbox subclasses.');
}
