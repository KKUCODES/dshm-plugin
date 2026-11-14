import assert from 'node:assert/strict';
import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { githubDshVersion, githubDshVersions } from './dsh-versions.mjs';

const config = JSON.parse(await readFile(resolve(import.meta.dirname, '../ci/release.json'), 'utf8'));
assert.match(config.version, /^0\.1\.\d+-latest\.0$/);
assert.match(config.backendCommit, /^[a-f0-9]{40}$/);
assert.deepEqual(config.dshVersions, githubDshVersions);
if (process.env.GITHUB_REF_TYPE === 'tag') {
  assert.equal(process.env.GITHUB_REF_NAME, `v${config.version}`, 'Tag must match ci/release.json');
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `version=${config.version}\nbackend_ref=${config.backendCommit}\n`);
}
if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `DSHM_PLUGIN_VERSION=${config.version}\nDSHM_DSH_VERSION=${githubDshVersion}\n`);
console.log(`Plugin candidate ${config.version}`);
