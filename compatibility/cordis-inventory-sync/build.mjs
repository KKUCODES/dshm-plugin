import ts from 'typescript';
import { build as bundle } from 'esbuild';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { hashes, transform } from './changes.mjs';

export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/cordis-inventory-sync/', import.meta.url));

/** 仅生成候选产物；不改参考源码或运行中的安装目录。 */
export async function prepare(target) {
  const root = await realpath(resolve(target)), overrides = new Map();
  for (const path of Object.keys(hashes)) {
    const absolute = resolve(root, 'packages', path);
    const after = transform(path, await readFile(absolute, 'utf8'));
    overrides.set(absolute.toLowerCase(), after);
    const output = resolve(outputRoot, 'source', path);
    await mkdir(dirname(output), { recursive: true }); await writeFile(output, after);
  }
  const options = { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
    strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    noImplicitOverride: true, noUnusedLocals: true, noUnusedParameters: true,
    skipLibCheck: true, esModuleInterop: true, allowImportingTsExtensions: true,
    rewriteRelativeImportExtensions: true, declaration: true, noEmitOnError: true,
    rootDir: resolve(root, 'packages'), outDir: resolve(outputRoot, 'types'),
    typeRoots: [resolve(root, 'scripts/types'), resolve(root, 'node_modules/@types')], types: ['node', 'client-build-environment'] };
  const aliases = {
    '@deepseek-ai/dsh-cordis-host-runner/types': 'extensions/cordis-host-runner/src/types.ts',
    '@deepseek-ai/dsh-api-remotes/client': 'api/remotes/src/client/index.ts',
    '@deepseek-ai/dsh-api-remotes/types': 'api/remotes/src/types.ts',
  };
  // Host 与 Client 分别核验，避免混合两侧 Context 的全局类型声明。
  for (const entries of [
    ['extensions/cordis-host-runner/src/index.ts', 'api/remotes/src/index.ts'],
    ['extensions/ui-cordis/src/client/index.ts', 'extensions/ui-cordis/src/css-modules.d.ts'],
  ]) {
    const host = ts.createCompilerHost(options), originalRead = host.readFile;
    host.readFile = path => overrides.get(resolve(path).toLowerCase()) ?? originalRead(path);
    host.resolveModuleNames = (names, file) => names.map(name => aliases[name]
      ? { resolvedFileName: resolve(root, 'packages', aliases[name]), extension: ts.Extension.Ts }
      : ts.resolveModuleName(name, file, options, host).resolvedModule);
    const program = ts.createProgram(entries.map(path => resolve(root, 'packages', path)), options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n' }));
    const emitted = program.emit();
    if (emitted.emitSkipped || emitted.diagnostics.length) throw Error('Inventory emission failed');
  }
  await mkdir(resolve(outputRoot, 'runtime'), { recursive: true });
  for (const [name, path] of [['runner', 'extensions/cordis-host-runner'], ['remotes', 'api/remotes']]) {
    await bundle({ entryPoints: [resolve(outputRoot, 'types', path, 'src/index.js')],
      outfile: resolve(outputRoot, 'runtime', `${name}.mjs`),
      bundle: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external' });
  }
  const require = createRequire(resolve(root, 'package.json'));
  const { build } = await import(pathToFileURL(require.resolve('tsdown')).href);
  const { clientBundle } = await import(pathToFileURL(resolve(root, 'packages/client/tsdown.client.ts')).href);
  const config = clientBundle('@deepseek-ai/dsh-client-ui-cordis', [])({ env: {} }).at(-1);
  await build({ ...config, config: false, cwd: resolve(root, 'packages/extensions/ui-cordis'),
    entry: { client: resolve(root, 'packages/extensions/ui-cordis/src/client/index.ts') },
    outDir: resolve(outputRoot, 'runtime/ui-cordis'),
    plugins: [{ name: 'dshm-inventory-candidate', load: { order: 'pre', handler(id) {
      const code = overrides.get(resolve(id).toLowerCase()); return code === undefined ? null : { code };
    } } }, ...config.plugins],
  });
  console.log(JSON.stringify({ outputRoot, strictTypecheck: true, installed: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepare(process.argv[2]);
