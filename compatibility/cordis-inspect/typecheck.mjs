import ts from 'typescript';
import { resolve } from 'node:path';

const root = resolve('.'), prepared = resolve('artifacts/compatibility/cordis-inspect');
const emit = process.argv.includes('--emit');
const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, noUncheckedIndexedAccess: true,
  skipLibCheck: true, noEmit: !emit, declaration: emit, rewriteRelativeImportExtensions: emit,
  rootDir: resolve(prepared, 'src'), outDir: resolve(prepared, 'production/lib/types'),
  allowImportingTsExtensions: true, esModuleInterop: true,
  typeRoots: [resolve(root, 'node_modules/@types')], types: ['node'] };
const program = ts.createProgram([resolve(prepared, 'src/index.ts')], options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => root,
    getCanonicalFileName: name => name, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else {
  if (emit) {
    const result = program.emit();
    if (result.emitSkipped || result.diagnostics.length) throw Error('Cordis runner emit failed');
  }
  console.log('Strict Cordis runner typecheck passed.');
}
