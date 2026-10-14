import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildLatestCandidate } from './build-latest-candidate.mjs';
import { sdkVariant } from './dsh-versions.mjs';

const root = resolve(import.meta.dirname, '..');
const version = process.env.DSHM_DSH_VERSION ?? '0.2.1-alpha.2';
const release = JSON.parse(await readFile(resolve(root, 'ci/release.json'), 'utf8'));
const candidateVersion = process.env.DSHM_PLUGIN_VERSION ?? release.version;
assert.match(candidateVersion, /^0\.1\.\d+-latest\.0$/);
assert.ok(process.env.npm_execpath, 'Run through npm run build:ci');
const source = await readFile(resolve(root, 'src/index.ts'), 'utf8');
for (const removed of ['CommandOutput', 'pendingNotificationsOf', 'dshmDesktopApps', 'cordisInspectService']) {
  assert.ok(!source.includes(removed), `Patch-only startup wiring remains: ${removed}`);
}
const sdkRoot = resolve(root, 'artifacts/ci/sdk', sdkVariant(version));
const built = await buildLatestCandidate('candidate', { targetVersion: version, candidateVersion, sdkRoot });
const output = resolve(root, 'artifacts/ci/packages');
await mkdir(output, { recursive: true });
const packed = spawnSync(process.execPath, [process.env.npm_execpath, 'pack', '--ignore-scripts', '--json', '--pack-destination', output],
  { cwd: built.target, encoding: 'utf8', windowsHide: true });
assert.equal(packed.status, 0, packed.stderr);
const [archive] = JSON.parse(packed.stdout);
assert.ok(archive.files.every(file => /^(dist\/|cordis\.patch\.yml$|LICENSE$|README\.md$|package\.json$)/.test(file.path)), 'Unexpected archive content');
assert.equal(built.manifest.license, 'MIT', 'Plugin package must declare its license');
assert.ok(archive.files.some(file => file.path === 'LICENSE'), 'Plugin archive must include LICENSE');
const name = `dshm-plugin-${candidateVersion}-dsh-${version}.tgz`;
const bytes = await readFile(resolve(output, archive.filename));
await copyFile(resolve(output, archive.filename), resolve(output, name));
await writeFile(resolve(output, `${name}.sha256`), `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`);
await writeFile(resolve(output, `compatibility-${version}.json`), JSON.stringify({
  pluginVersion: candidateVersion, dshVersion: version, files: archive.files.length,
  officialDshModified: false, sdkBuilt: false, candidate: true,
}, null, 2) + '\n');
console.log(`Built ${name} (${bytes.length} bytes)`);
