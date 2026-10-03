import ts from 'typescript';
import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { hashes, transform } from './changes.mjs';

export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/cordis-client-lifetime/', import.meta.url));
const project = fileURLToPath(new URL('../../', import.meta.url));
const sourceRoot = resolve(project, '../deepseek-harness');
const packages = { 'ui-cordis': '@deepseek-ai/dsh-client-ui-cordis', 'cordis-client-runner': '@deepseek-ai/dsh-cordis-client-runner' };

/** 原构建预设与完整入口类型检查；仅向本项目artifacts输出，实际安装另行执行。 */
export async function prepare(target) {
  const root = await realpath(resolve(target));
  const overrides = new Map();
  for (const path of Object.keys(hashes)) {
    const original = await readFile(resolve(sourceRoot, 'packages/extensions', path), 'utf8');
    const candidate = transform(path, original);
    const installed = resolve(root, 'packages/extensions', path);
    if (await readFile(installed, 'utf8') !== original) throw Error(`Installed source differs: ${path}`);
    overrides.set(installed.toLowerCase(), candidate);
    const output = resolve(outputRoot, 'source', path);
    await mkdir(dirname(output), { recursive: true }); await writeFile(output, candidate);
  }
  const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    noImplicitOverride: true, noUnusedLocals: true, noUnusedParameters: true,
    skipLibCheck: true, esModuleInterop: true, allowImportingTsExtensions: true,
    declaration: true, emitDeclarationOnly: true, noEmitOnError: true,
    rootDir: resolve(root, 'packages/extensions'), outDir: resolve(outputRoot, 'types'),
    typeRoots: [resolve(root, 'scripts/types'), resolve(root, 'node_modules/@types')], types: ['client-build-environment'] };
  const host = ts.createCompilerHost(options), originalRead = host.readFile;
  host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
  host.resolveModuleNames = (names, file) => names.map(name => {
    if (name === '@deepseek-ai/dsh-cordis-client-runner/client') return { resolvedFileName: resolve(root, 'packages/extensions/cordis-client-runner/src/client/index.ts'), extension: ts.Extension.Ts };
    if (name === '@deepseek-ai/dsh-client-connection/client') return { resolvedFileName: resolve(root, 'packages/client/connection/lib/types/client/index.d.ts'), extension: ts.Extension.Dts };
    return ts.resolveModuleName(name, file, options, host).resolvedModule;
  });
  const program = ts.createProgram([...Object.keys(packages).map(name => resolve(root, 'packages/extensions', name, 'src/client/index.ts')),
    resolve(root, 'packages/extensions/ui-cordis/src/css-modules.d.ts')], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n' }));
  const emitted = program.emit();
  if (emitted.emitSkipped || emitted.diagnostics.length) throw Error('Declaration emission failed');
  console.log('Strict typecheck for both full client entries passed.');
  const require = createRequire(resolve(root, 'package.json'));
  const { build } = await import(pathToFileURL(require.resolve('tsdown')).href);
  const { clientBundle } = await import(pathToFileURL(resolve(root, 'packages/client/tsdown.client.ts')).href);
  for (const [name, id] of Object.entries(packages)) {
    const configs = clientBundle(id, [])({ env: {} });
    const config = configs.at(-1);
    await build({ ...config, config: false, cwd: resolve(root, 'packages/extensions', name),
      entry: { client: resolve(root, 'packages/extensions', name, 'src/client/index.ts') },
      outDir: resolve(outputRoot, 'runtime', name),
      plugins: [{ name: 'dshm-verified-lifetime-source', load: { order: 'pre', handler(id) {
        const code = overrides.get(resolve(id).toLowerCase());
        return code === undefined ? null : { code };
      } } }, ...config.plugins],
    });
  }
  console.log('Built both browser modules with the original DSH CSS/module preset.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepare(process.argv[2]);
