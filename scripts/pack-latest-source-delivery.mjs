import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { digest } from '../compatibility/install-files.mjs';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';

const root = resolve(import.meta.dirname, '..');
const [candidateArgument, runtimeArgument, ...extra] = process.argv.slice(2);
assert.ok(candidateArgument && runtimeArgument && !extra.length, 'Specify candidate and completed runtime report explicitly');
const candidate = resolve(candidateArgument), runtimePath = resolve(runtimeArgument);
const built = JSON.parse(await readFile(resolve(candidate, 'build-report.json'), 'utf8'));
const runtime = JSON.parse(await readFile(runtimePath, 'utf8'));
assert.equal(built.sourceCommit, sourceCommit); assert.equal(built.sourceFiles, 38);
assert.equal(digest(await readFile(resolve(candidate, 'install.mjs'))), built.installerSha256);
assert.equal(digest(await readFile(resolve(candidate, 'manifest.json'))), built.manifestSha256);
assert.equal(runtime.passed, true); assert.deepEqual(runtime.flags, ['--source-delivery']);
assert.equal(runtime.sourceCommit, sourceCommit); assert.equal(runtime.files, 38);
assert.equal(runtime.deliveryApply.written, built.sourceFiles + 3);
assert.equal(runtime.deliveryRestore.written, built.sourceFiles + 3);
assert.equal(runtime.restoredOriginalBytes, true); assert.equal(runtime.restoredOriginalClientArtifacts.fileCount, 355);
assert.equal(runtime.relay.passed, true); assert.equal(runtime.relay.reviewedPackage.files, 62);
assert.ok(runtime.stages.every(stage => stage.code === 0 && stage.timedOut === false));
const boundaryLog = await readFile(resolve(candidate, 'install-boundaries-final.log'), 'utf8');
assert.match(boundaryLog, /tests 9/); assert.match(boundaryLog, /pass 9/); assert.match(boundaryLog, /fail 0/);
const parent = resolve(root, 'artifacts/latest-source-delivery');
const output = await mkdtemp(resolve(parent, 'pack-'));
const staging = resolve(output, 'dshm-source-compat'); await mkdir(staging);
for (const name of ['install.mjs', 'manifest.json', 'README.md', 'build-report.json', 'payload'])
  await cp(resolve(candidate, name), resolve(staging, name), { recursive: true, errorOnExist: true, force: false });
await mkdir(resolve(staging, 'licenses'));
await cp(resolve(sourceRoot, 'LICENSE'), resolve(staging, 'licenses/DSH-MIT.txt'), { errorOnExist: true, force: false });
await cp(resolve(root, 'node_modules/typescript/LICENSE.txt'), resolve(staging, 'licenses/TypeScript.txt'), { errorOnExist: true, force: false });
const files = [];
const inventory = async (directory, prefix = '') => {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    assert.equal(entry.isSymbolicLink(), false, 'No linked file may enter the archive');
    const path = prefix + entry.name;
    if (entry.isDirectory()) await inventory(resolve(directory, entry.name), path + '/');
    else { const bytes = await readFile(resolve(directory, entry.name)); files.push({ path, bytes: bytes.length, sha256: digest(bytes) }); }
  }
};
await inventory(staging);
const archive = resolve(output, 'dshm-source-compat-0.2.1-alpha.1-candidate.zip');
execFileSync('tar', ['--format', 'zip', '-cf', archive, '-C', output, 'dshm-source-compat'], { cwd: root, windowsHide: true });
const extracted = resolve(output, 'extracted'); await mkdir(extracted);
execFileSync('tar', ['-xf', archive, '-C', extracted], { cwd: root, windowsHide: true });
for (const file of files)
  assert.equal(digest(await readFile(resolve(extracted, 'dshm-source-compat', file.path))), file.sha256);
const relocatedPlan = JSON.parse(execFileSync(process.execPath,
  [resolve(extracted, 'dshm-source-compat/install.mjs'), 'plan', sourceRoot],
  { cwd: extracted, windowsHide: true, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' } }));
assert.equal(relocatedPlan.state, 'original'); assert.equal(relocatedPlan.sourceFiles, 38);
const bytes = await readFile(archive);
const report = { at: new Date().toISOString(), passed: true, candidateOnly: true, archive,
  bytes: bytes.length, sha256: digest(bytes), candidate, runtimeReport: runtimePath,
  sourceCommit, files, relocatedPlan,
  inferenceVerifiedInThisScope: false, androidVerifiedInThisScope: false };
await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, candidateOnly: true, archive, bytes: report.bytes, sha256: report.sha256, files: files.length }));
