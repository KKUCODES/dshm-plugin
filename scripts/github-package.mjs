import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { githubDshVersion, githubDshVersions, githubPeerRange } from './dsh-versions.mjs';
export { githubDshVersion, githubDshVersions } from './dsh-versions.mjs';

/** Windows 与 CI 按同一文件顺序及换行计算发布输入，避免源码变更后仍安装旧产物。 */
export async function githubSourceDigest(root) {
  const inputs = ['package.json', 'cordis.patch.yml', 'ci/release.json',
    'scripts/build-github-package.mjs', 'scripts/build-latest-candidate.mjs',
    'scripts/github-package.mjs', 'scripts/dsh-versions.mjs',
    ...['rc2', 'alpha2'].flatMap(variant => [`ci/sdk/${variant}/package.json`, `ci/sdk/${variant}/package-lock.json`])];
  async function collect(relative) {
    for (const entry of (await readdir(join(root, relative), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) inputs.push(path);
      else throw Error(`Unsupported source entry: ${path}`);
    }
  }
  await collect('src');
  const digest = createHash('sha256');
  for (const path of inputs.sort()) {
    digest.update(path + '\0');
    digest.update((await readFile(join(root, path), 'utf8')).replace(/\r\n/g, '\n'));
    digest.update('\0');
  }
  return digest.digest('hex');
}

export async function validateGithubPackage(root) {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const release = JSON.parse(await readFile(join(root, 'ci/release.json'), 'utf8'));
  const receipt = JSON.parse(await readFile(join(root, 'lib/build-info.json'), 'utf8'));
  assert.equal(manifest.version, release.version, 'GitHub package and CI release versions must agree');
  assert.equal(receipt.dshVersion, githubDshVersion);
  assert.deepEqual(receipt.dshVersions, githubDshVersions);
  assert.equal(receipt.pluginVersion, manifest.version);
  assert.equal(receipt.sourceDigest, await githubSourceDigest(root), 'Run npm run build:github after changing release inputs');
  assert.equal(manifest.main, './lib/index.js');
  assert.equal(manifest.exports['.'].default, manifest.main);
  assert.equal(manifest.exports['./client'].default, './lib/client.js');
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  for (const script of ['prepare', 'preinstall', 'install', 'postinstall', 'prepack']) {
    assert.equal(manifest.scripts?.[script], undefined, `GitHub installation must not run ${script}`);
  }
  for (const [name, spec] of Object.entries({ ...manifest.dependencies, ...manifest.peerDependencies })) {
    assert.ok(!/^(?:file:|link:|workspace:|\.\.?\/)/.test(spec), `Local install dependency: ${name}`);
    if (Object.hasOwn(manifest.peerDependencies ?? {}, name)) assert.equal(spec, githubPeerRange(name), `Unexpected SDK peer: ${name}`);
  }
  for (const path of [manifest.main, manifest.types, manifest.exports['./client'].default,
    manifest.exports['./client'].types, manifest.dsh.bundle.patch, './lib/config.d.ts']) {
    assert.ok((await readFile(join(root, path))).length > 0, `Missing package entry: ${path}`);
  }
  assert.ok(Object.keys(receipt.files).length > 2, 'Missing GitHub build file inventory');
  const actualFiles = [];
  async function collectLib(relative = 'lib') {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await collectLib(path);
      else if (entry.isFile()) actualFiles.push(path);
      else throw Error(`Unsupported GitHub package entry: ${path}`);
    }
  }
  await collectLib();
  assert.deepEqual(actualFiles.sort(), [...Object.keys(receipt.files), 'lib/build-info.json'].sort(),
    'Unexpected file in GitHub package');
  for (const [path, expected] of Object.entries(receipt.files)) {
    assert.ok(/^lib\/(?!.*\.\.)[a-zA-Z0-9/_.-]+$/.test(path), `Invalid release path: ${path}`);
    const actual = createHash('sha256').update(await readFile(join(root, path))).digest('hex');
    assert.equal(actual, expected, `GitHub build changed: ${path}`);
    if (path.endsWith('.d.ts')) {
      assert.ok(!/['"]@dsh-mobile\/protocol['"]/.test(await readFile(join(root, path), 'utf8')),
        `Unpublished protocol dependency in declaration: ${path}`);
    }
  }
  return { pluginVersion: manifest.version, dshVersion: githubDshVersion, dshVersions: githubDshVersions,
    files: Object.keys(receipt.files).length };
}
