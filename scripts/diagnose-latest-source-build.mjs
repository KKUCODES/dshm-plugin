import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourceRoot, outputRoot, installSourceRuntime } from '../compatibility/latest-upstream/source-runtime.mjs';

// 只在原编译器读文件的入口提供固定补丁投影，不写检出，不替代实际完整构建验收。
const args = process.argv.slice(2), packageIndex = args.indexOf('--package'), omitIndex = args.indexOf('--omit');
const packageName = packageIndex < 0 ? undefined : args[packageIndex + 1];
const omit = omitIndex < 0 ? undefined : args[omitIndex + 1];
const omitRoutingExport = args.includes('--omit-routing-export');
const localRoutingExport = args.includes('--local-routing-export');
const typedPackageRunner = args.includes('--typed-package-runner');
await installSourceRuntime('plan', sourceRoot);
const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
assert.ok(omit === undefined || manifest.patches.includes(omit));
const generatorFile = resolve(sourceRoot, 'packages/typert/generator/lib/index.js');
const require = createRequire(generatorFile);
const ts = require('typescript');
let generator = await readFile(generatorFile, 'utf8');
for (const name of ['typescript', '@jridgewell/gen-mapping']) {
  const entry = require.resolve(name);
  const module = name === '@jridgewell/gen-mapping' ? resolve(dirname(entry), 'gen-mapping.mjs') : entry;
  generator = generator.replaceAll(`from "${name}"`, `from ${JSON.stringify(pathToFileURL(module).href)}`);
}
assert.equal(generator.split('analyzePackage(registration) {').length, 2);
generator = generator.replace('analyzePackage(registration) {',
  'analyzePackage(registration) { console.error("[DSHM_BUILD_DIAG] package", registration.name);');
const debugModule = resolve(outputRoot, 'diagnostic-generator.mjs');
await writeFile(debugModule, generator);
const { WorkspaceAnalyzer, WorkspaceCaches } = await import(pathToFileURL(debugModule).href);
const normalize = file => resolve(file).replaceAll('\\', '/').toLowerCase();
const overrides = new Map();
for (const file of manifest.files) {
  let text = await readFile(resolve(outputRoot, file.patch === omit ? 'original' : 'patched', file.path), 'utf8');
  if (omitRoutingExport && file.path === 'packages/core/tools/src/index.ts')
    text = text.replace("export { scopeTarget } from '@deepseek-ai/dsh-scope'", '');
  if (localRoutingExport && file.path === 'packages/core/tools/src/index.ts')
    text = text.replace("export { scopeTarget } from '@deepseek-ai/dsh-scope'", 'export { scopeTarget }');
  overrides.set(normalize(resolve(sourceRoot, file.path)), text);
}
const caches = new WorkspaceCaches(), programHost = caches.programHost.bind(caches);
const wrapped = new WeakSet(), parses = new Map();
caches.programHost = (face, options) => {
  const host = programHost(face, options);
  if (!wrapped.has(host)) {
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (file, language, onError, fresh) => {
      const text = overrides.get(normalize(file));
      if (text === undefined) return getSourceFile(file, language, onError, fresh);
      if (!parses.has(file)) parses.set(file, ts.createSourceFile(file, text, language, true));
      return parses.get(file);
    };
    wrapped.add(host);
  }
  return host;
};
const options = { root: sourceRoot, faces: ['host'], caches, checkDiagnostics: false };
const discovered = new WorkspaceAnalyzer(options).discoverPackages();
// 包导出从registration读取，不经过CompilerHost；必须同步投影，才能复现真实候选的反射入口。
for (const registrations of caches.registrations.values()) {
  for (const registration of registrations) {
    const projected = overrides.get(normalize(resolve(registration.root, 'package.json')));
    if (projected !== undefined) registration.manifest = JSON.parse(projected);
    if (typedPackageRunner && registration.name === '@deepseek-ai/dsh-plugin-manager') {
      const runner = registration.manifest.exports['./runner'];
      assert.ok(runner === './lib/types/run-tree.js'
        || (runner?.types === './lib/types/run-tree.d.ts' && runner?.default === './lib/types/run-tree.js'));
      registration.manifest.exports['./runner'] = {
        types: './lib/types/run-tree.d.ts', default: './lib/types/run-tree.js',
      };
    }
  }
}
const packages = [];
for (const item of discovered) {
  const pkg = JSON.parse(await readFile(resolve(sourceRoot, item.root, 'package.json'), 'utf8'));
  if (pkg.exports?.['./typert']) packages.push(item.package);
}
assert.ok(packageName === undefined || packages.includes(packageName), 'Expected original reflected Host package');
console.error('[DSHM_BUILD_DIAG] starting', JSON.stringify({ packageName, omit, omitRoutingExport, localRoutingExport, typedPackageRunner, packages: packages.length }));
const started = Date.now();
const model = new WorkspaceAnalyzer({ ...options, packages: packageName ? [packageName] : packages }).analyze();
const report = { at: new Date().toISOString(), scope: 'read-only-original-reflection-model',
  packageName, omit, omitRoutingExport, localRoutingExport, typedPackageRunner, elapsedMs: Date.now() - started,
  packages: model.faces.map(face => face.packages.length), nodes: model.faces.map(face => face.graph.nodes.length), passed: true };
await writeFile(resolve(outputRoot, typedPackageRunner ? 'reflection-diagnosis-typed-package-runner.json' : 'reflection-diagnosis.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
