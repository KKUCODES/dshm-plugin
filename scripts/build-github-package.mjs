import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative as relativePath, resolve } from 'node:path';
import { build } from 'esbuild';
import { buildLatestCandidate } from './build-latest-candidate.mjs';
import { githubDshVersion, githubSourceDigest, validateGithubPackage } from './github-package.mjs';

const root = resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');
assert.ok(process.argv.length === (check ? 3 : 2));
const sdkRoot = resolve(root, 'artifacts/ci/sdk/alpha2');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const release = JSON.parse(await readFile(join(root, 'ci/release.json'), 'utf8'));
assert.equal(manifest.version, release.version);
const built = await buildLatestCandidate('candidate', {
  targetVersion: githubDshVersion, candidateVersion: release.version, sdkRoot,
});
for (const [name, version] of Object.entries(built.manifest.peerDependencies)) {
  assert.equal(manifest.peerDependencies[name], version, `Root manifest does not match published SDK: ${name}`);
}
const buildRoot = resolve(root, 'artifacts/github-package-build');
await mkdir(buildRoot, { recursive: true });
const output = join(await mkdtemp(join(buildRoot, 'run-')), 'lib');
await mkdir(output, { recursive: true });
async function copyDeclarations(relative = '') {
  for (const entry of await readdir(join(built.target, 'dist', relative), { withFileTypes: true })) {
    const path = join(relative, entry.name);
    if (entry.isDirectory()) await copyDeclarations(path);
    else if (entry.name.endsWith('.d.ts')) {
      await mkdir(join(output, relative), { recursive: true });
      const protocolPath = relativePath(dirname(join(output, path)), join(output, 'protocol/index.js')).replace(/\\/g, '/');
      const importPath = protocolPath.startsWith('.') ? protocolPath : `./${protocolPath}`;
      const text = (await readFile(join(built.target, 'dist', path), 'utf8')).replace(/\r\n/g, '\n')
        .replaceAll("'@dsh-mobile/protocol'", JSON.stringify(importPath));
      await writeFile(join(output, path), text);
    }
  }
}
await copyDeclarations();
// 运行代码已打包协议；声明也携带同一协议的类型，避免公开包引用私有开发依赖。
const protocolTypes = join(root, 'node_modules/@dsh-mobile/protocol/dist');
await mkdir(join(output, 'protocol'), { recursive: true });
for (const entry of await readdir(protocolTypes, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.d.ts')) continue;
  const text = (await readFile(join(protocolTypes, entry.name), 'utf8')).replace(/\r\n/g, '\n');
  await writeFile(join(output, 'protocol', entry.name), text);
}
// 与 tgz 使用同一份隔离源码和 SDK；相对工作目录让路径注释保持稳定。
await build({ absWorkingDir: built.snapshot, entryPoints: ['src/index.ts'], outfile: join(output, 'index.js'),
  bundle: true, platform: 'node', target: 'node22', format: 'esm',
  external: ['@deepseek-ai/*', 'ws', 'zod'], define: { DSHM_LATEST_CANDIDATE: 'true' } });
await build({ absWorkingDir: built.snapshot, entryPoints: ['src/client/index.tsx'], outfile: join(output, 'client.js'),
  bundle: true, platform: 'browser', target: 'es2022', format: 'cjs', external: ['react', 'react/jsx-runtime'],
  banner: { js: 'window.__ModuleLoader__.load({id:"@dsh-mobile/plugin",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' } });
const files = {};
async function inventory(relative = '') {
  for (const entry of (await readdir(join(output, relative), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await inventory(path);
    else if (path !== 'build-info.json') files[`lib/${path}`] = createHash('sha256').update(await readFile(join(output, path))).digest('hex');
  }
}
await inventory();
const receipt = { pluginVersion: release.version, dshVersion: githubDshVersion,
  sourceDigest: await githubSourceDigest(root), files };
await writeFile(join(output, 'build-info.json'), JSON.stringify(receipt, null, 2) + '\n');
if (check) {
  await validateGithubPackage(root);
  for (const path of [...Object.keys(files), 'lib/build-info.json']) {
    assert.deepEqual(await readFile(join(root, path)), await readFile(join(output, path.slice(4))), `Committed GitHub package is stale: ${path}`);
  }
} else await cp(output, join(root, 'lib'), { recursive: true });
console.log(JSON.stringify({ ...(await validateGithubPackage(root)), rebuilt: true, checked: check }));
