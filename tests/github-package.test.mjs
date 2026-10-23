import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { githubSourceDigest, validateGithubPackage } from '../scripts/github-package.mjs';
import { githubPeerRange } from '../scripts/dsh-versions.mjs';
import semver from 'semver';

test('npm peer ranges admit current prereleases and future patches but stop at the next contract family', () => {
  const range = githubPeerRange('@deepseek-ai/dsh-client-modules');
  for (const version of ['0.2.0-rc.2', '0.2.1-alpha.2', '0.2.1-rc.2', '0.2.1', '0.2.2'])
    assert.equal(semver.satisfies(version, range), true);
  for (const version of ['0.2.0-rc.1', '0.3.0-alpha.1', '0.3.0']) assert.equal(semver.satisfies(version, range), false);
});

const fixtures = [];
afterEach(async () => {
  for (const root of fixtures.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const base = resolve(import.meta.dirname, '../artifacts/github-package-tests');
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'package-'));
  fixtures.push(root);
  const files = {
    'package.json': JSON.stringify({ name: '@dsh-mobile/plugin', version: '0.1.83-latest.0',
      main: './lib/index.js', types: './lib/index.d.ts',
      exports: { '.': { default: './lib/index.js' }, './client': { default: './lib/client.js', types: './lib/client/index.d.ts' } },
      dsh: { bundle: { patch: './cordis.patch.yml' } },
      peerDependencies: { '@deepseek-ai/dsh-api-gateway': '>=0.2.0-rc.2 <0.3.0-0 || >=0.2.1-alpha.1 <0.3.0-0' },
      devDependencies: { '@dsh-mobile/protocol': 'file:../backend/packages/protocol' } }),
    'ci/release.json': JSON.stringify({ version: '0.1.83-latest.0' }),
    'ci/sdk/alpha2/package.json': '{}', 'ci/sdk/alpha2/package-lock.json': '{}',
    'ci/sdk/rc2/package.json': '{}', 'ci/sdk/rc2/package-lock.json': '{}',
    'ci/sdk/rc21/package.json': '{}', 'ci/sdk/rc21/package-lock.json': '{}',
    'scripts/build-github-package.mjs': '// build', 'scripts/build-latest-candidate.mjs': '// candidate',
    'scripts/github-package.mjs': '// inputs', 'scripts/dsh-versions.mjs': '// versions', 'src/index.ts': 'export default {};\n',
    'cordis.patch.yml': '- insert:\n    - id: dsh-mobile\n      name: "@dsh-mobile/plugin"\n',
    'lib/index.js': 'export default {};\n', 'lib/client.js': '// client\n',
    'lib/index.d.ts': 'declare const plugin: unknown;\n', 'lib/client/index.d.ts': 'export {};\n',
    'lib/config.d.ts': 'export {};\n',
  };
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  const inventory = Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith('lib/'))
    .map(([path, text]) => [path, createHash('sha256').update(text).digest('hex')]));
  await writeFile(join(root, 'lib/build-info.json'), JSON.stringify({ pluginVersion: '0.1.83-latest.0',
    dshVersion: '0.2.1-alpha.2', dshVersions: ['0.2.0-rc.2', '0.2.1-alpha.2', '0.2.1-rc.2'],
    sourceDigest: await githubSourceDigest(root), files: inventory }));
  return root;
}

test('a precompiled GitHub package validates without a sibling backend', async () => {
  const root = await fixture();
  assert.equal((await validateGithubPackage(root)).dshVersion, '0.2.1-alpha.2');
  const before = await githubSourceDigest(root);
  await writeFile(join(root, 'src/index.ts'), 'export default {};\r\n');
  assert.equal(await githubSourceDigest(root), before);
});

test('changing source requires rebuilding the committed package', async () => {
  const root = await fixture();
  await writeFile(join(root, 'src/index.ts'), 'export default { changed: true };\n');
  await assert.rejects(validateGithubPackage(root), /build:github/);
});

test('missing or modified compiled entries are rejected', async () => {
  const root = await fixture();
  await writeFile(join(root, 'lib/index.js'), 'export default { stale: true };\n');
  await assert.rejects(validateGithubPackage(root), /GitHub build changed/);
  await rm(join(root, 'lib/client.js'));
  await assert.rejects(validateGithubPackage(root), { code: 'ENOENT' });
});

test('installation scripts and local runtime dependencies cannot enter the GitHub package', async () => {
  const root = await fixture();
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  manifest.scripts = { prepare: 'node build.mjs' };
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
  const receipt = JSON.parse(await readFile(join(root, 'lib/build-info.json'), 'utf8'));
  receipt.sourceDigest = await githubSourceDigest(root);
  await writeFile(join(root, 'lib/build-info.json'), JSON.stringify(receipt));
  await assert.rejects(validateGithubPackage(root), /must not run prepare/);
  delete manifest.scripts;
  manifest.dependencies = { '@dsh-mobile/protocol': 'file:../backend/packages/protocol' };
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
  receipt.sourceDigest = await githubSourceDigest(root);
  await writeFile(join(root, 'lib/build-info.json'), JSON.stringify(receipt));
  await assert.rejects(validateGithubPackage(root), /Local install dependency/);
});

test('unlisted package files and unpublished protocol type imports are rejected', async () => {
  const root = await fixture();
  await writeFile(join(root, 'lib/private.json'), '{}');
  await assert.rejects(validateGithubPackage(root), /Unexpected file/);
  await rm(join(root, 'lib/private.json'));
  const text = "import type { Operation } from '@dsh-mobile/protocol';\n";
  await writeFile(join(root, 'lib/config.d.ts'), text);
  const receipt = JSON.parse(await readFile(join(root, 'lib/build-info.json'), 'utf8'));
  receipt.files['lib/config.d.ts'] = createHash('sha256').update(text).digest('hex');
  await writeFile(join(root, 'lib/build-info.json'), JSON.stringify(receipt));
  await assert.rejects(validateGithubPackage(root), /Unpublished protocol dependency/);
});

test('a wildcard or an unreviewed host version cannot replace the two verified versions', async () => {
  const root = await fixture();
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  manifest.peerDependencies['@deepseek-ai/dsh-api-gateway'] = '*';
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
  const receipt = JSON.parse(await readFile(join(root, 'lib/build-info.json'), 'utf8'));
  receipt.sourceDigest = await githubSourceDigest(root);
  await writeFile(join(root, 'lib/build-info.json'), JSON.stringify(receipt));
  await assert.rejects(validateGithubPackage(root), /Unexpected SDK peer/);
});
