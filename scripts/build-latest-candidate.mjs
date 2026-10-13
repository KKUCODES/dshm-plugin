import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const version = '0.2.1-alpha.1';

/** 从同一份隔离源码生成运行入口和声明；审查包不覆盖持久联调目录。 */
export async function buildLatestCandidate(relativeTarget = 'candidate', { targetVersion = version, candidateVersion = '0.1.77-latest.0', sdkRoot } = {}) {
assert.ok(['0.2.1-alpha.1', '0.2.1-alpha.2'].includes(targetVersion));
assert.match(candidateVersion, /^0\.1\.\d+-latest\.0$/);
const runtime = sdkRoot ?? resolve(root, 'artifacts', targetVersion === '0.2.1-alpha.2' ? 'official-alpha2-sdk' : 'latest-runtime-check');
const version = targetVersion;
assert.match(relativeTarget, /^candidate(?:-package-check-[A-Za-z0-9]+\/package)?$/);
const target = resolve(runtime, relativeTarget);
const snapshot = await mkdtemp(resolve(runtime, 'candidate-build-'));
await cp(resolve(root, 'src'), resolve(snapshot, 'src'), { recursive: true });
await writeFile(resolve(snapshot, 'tsconfig.json'), JSON.stringify({ extends: resolve(root, 'tsconfig.json'),
  compilerOptions: { rootDir: 'src', outDir: resolve(target, 'dist'), noEmit: false, emitDeclarationOnly: true, sourceMap: false },
  include: ['src/**/*.ts', 'src/**/*.tsx'] }, null, 2) + '\n');
const types = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json', '--pretty', 'false'],
  { cwd: snapshot, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
await writeFile(resolve(snapshot, 'declarations.log'), types.stdout + types.stderr, { flag: 'wx' });
if (types.status !== 0) console.error(types.stdout + types.stderr || types.error?.message || 'Declaration compiler exited without diagnostics');
assert.equal(types.status, 0, 'latest_candidate_declarations_failed');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
manifest.version = candidateVersion;
delete manifest.devDependencies;
delete manifest.scripts;
for (const name of ['@deepseek-ai/dsh-config-editor', '@deepseek-ai/dsh-app-boot', '@deepseek-ai/dsh-atomic-write', '@deepseek-ai/dsh-session']) manifest.peerDependencies[name] = version;
for (const name of Object.keys(manifest.peerDependencies)) {
  const peer = JSON.parse(await readFile(resolve(runtime, 'node_modules', name, 'package.json'), 'utf8'));
  if (name.startsWith('@deepseek-ai/dsh-') && peer.version !== version) throw Error(`Unexpected candidate peer version: ${name}`);
  manifest.peerDependencies[name] = peer.version;
}
await mkdir(resolve(target, 'dist'), { recursive: true });
manifest.files = ['dist/**/*.js', 'dist/**/*.js.map', 'dist/**/*.d.ts', 'cordis.patch.yml', 'README.md'];
await writeFile(resolve(target, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
await copyFile(resolve(root, 'cordis.patch.yml'), resolve(target, 'cordis.patch.yml'));
await copyFile(resolve(root, 'compatibility/latest-upstream/candidate-README.md'), resolve(target, 'README.md'));
const host = await build({ entryPoints: [resolve(snapshot, 'src/index.ts')], outfile: resolve(target, 'dist/index.js'),
  bundle: true, platform: 'node', target: 'node22', format: 'esm', sourcemap: true,
  metafile: true, external: ['@deepseek-ai/*', 'ws', 'zod'], define: { DSHM_LATEST_CANDIDATE: 'true' } });
await build({ entryPoints: [resolve(snapshot, 'src/client/index.tsx')], outfile: resolve(target, 'dist/client.js'),
  bundle: true, platform: 'browser', target: 'es2022', format: 'cjs', sourcemap: true, external: ['react', 'react/jsx-runtime'],
  banner: { js: 'window.__ModuleLoader__.load({id:"@dsh-mobile/plugin",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' } });
return { target, snapshot, version, manifest, hostMetafile: host.metafile };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2);
  const result = await buildLatestCandidate();
  console.log(`Built isolated DSH ${version} candidate: ${result.target}`);
}
