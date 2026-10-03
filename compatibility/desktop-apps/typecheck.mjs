import ts from 'typescript';
import { resolve } from 'node:path';

const root = resolve('.');
const declarationRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const emit = process.argv.includes('--emit');
const icons = process.argv.includes('--icons');
const sourceDirectory = icons ? 'artifacts/compatibility/desktop-app-icons' : 'artifacts/compatibility/desktop-apps';
const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true, noImplicitOverride: true, noUnusedLocals: true, noUnusedParameters: true,
  skipLibCheck: true, noEmit: !emit, declaration: emit, rewriteRelativeImportExtensions: emit,
  rootDir: resolve(root, sourceDirectory, 'src'),
  outDir: resolve(root, sourceDirectory, 'production/lib/types'),
  allowImportingTsExtensions: true, esModuleInterop: true,
  typeRoots: [resolve(root, 'node_modules/@types')], types: ['node'] };
const host = ts.createCompilerHost(options);
host.resolveModuleNames = (names, file) => names.map(name => name === '@deepseek-ai/dsh-host-webserver'
  ? { resolvedFileName: resolve(declarationRoot, 'packages/host/webserver/lib/types/index.d.ts'), extension: ts.Extension.Dts }
  : ts.resolveModuleName(name, name.startsWith('.') ? file : resolve(root, 'typecheck.ts'), options, host).resolvedModule
    ?? ts.resolveModuleName(name, resolve(declarationRoot, 'typecheck.ts'), options, host).resolvedModule);
const program = ts.createProgram([resolve(root, sourceDirectory, 'src/index.ts')], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root,
    getCanonicalFileName: name => name, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else {
  if (emit) {
    const result = program.emit();
    if (result.emitSkipped || result.diagnostics.length) throw new Error('Desktop applications emit failed');
  }
  console.log('Strict typecheck passed for desktop applications service and original host routes.');
}
