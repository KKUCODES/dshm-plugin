import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sourceChanges, sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { applySourceChange, sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

const flags = process.argv.slice(2);
assert.ok(flags.length === 0 || (flags.length === 1 && ['--candidate', '--installed'].includes(flags[0])));
const candidate = flags.includes('--candidate');
const installed = flags.includes('--installed');
const output = resolve(import.meta.dirname, '../artifacts/latest-runtime-check/tool-cancellation');
const git = (...args) => execFileSync('git', args, { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), sourceCommit);
if (!installed) assert.equal(git('status', '--porcelain'), '');
else await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
const hash = bytes => createHash('sha256').update(bytes.toString().replaceAll('\r\n', '\n')).digest('hex');
const paths = ['packages/core/tools/src/ptc.ts', 'packages/core/tools/src/index.ts'];
const originals = await Promise.all(paths.map(path => readFile(resolve(sourceRoot, path))));
if (!installed) {
  assert.equal(hash(originals[0]), '227d0d5221432fa9caf5492058ca08f449f732f18a566e708c2aea1a9ee2d96a');
  assert.equal(hash(originals[1]), '9107a2b6447b10c2ecb90429d7c1b80b956759e96d35230af16f5a88f5d3eccd');
}
const spec = await readFile(resolve(sourceRoot, 'packages/core/tools/tests/ptc.spec.ts'));
assert.equal(hash(spec), '236ed6542ae866853e2128d10d6c566fc3d60794739cfb2df5af82e42cfcab28');
assert.equal(hash(await readFile(resolve(sourceRoot, 'packages/experimental/auto-review/tests/auto-review.spec.ts'))),
  '4736d4c983e38c7e68283c6838eb1eef4e803c3c4dca6eb06f0a5f4f54915280');
const anchor = "expect((result.content[0] as { text: string }).text).toContain('code run failed (abort)')";
assert.equal(spec.toString().split(anchor).length, 2);
const extra = await readFile(new URL('../compatibility/ptc-cancel/inner-regression.ts', import.meta.url), 'utf8');
const fixture = resolve(sourceRoot, 'packages/core/tools/tests/dshm-cancel-regression.spec.ts');
await assert.rejects(access(fixture), { code: 'ENOENT' });
await mkdir(output, { recursive: true });
const mode = installed ? 'installed' : candidate ? 'candidate' : 'original';
const jsonFile = resolve(output, mode + '-vitest.json');
const report = { at: new Date().toISOString(), sourceCommit, scope: 'original-source-suites-and-controlled-cancellation',
  mode, inferenceVerified: false, passed: false };
let wroteFixture = false, applied = 0;
try {
  await writeFile(fixture, spec.toString().replace(anchor,
    anchor + "\n    expect(result.error?.info).toEqual({ name: 'AbortError', code: 'ABORTED' })") + extra);
  wroteFixture = true;
  if (candidate) {
    const patched = paths.map((path, index) => applySourceChange(
      sourceChanges.find(change => change.path === path), originals[index].toString()));
    for (const [index, path] of paths.entries()) {
      assert.deepEqual(await readFile(resolve(sourceRoot, path)), originals[index]);
      await writeFile(resolve(sourceRoot, path), patched[index]); applied++;
    }
  }
  try { await unlink(jsonFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const started = Date.now();
  const child = spawn(process.execPath, [resolve(sourceRoot, 'node_modules/vitest/vitest.mjs'), 'run',
    'packages/core/tools/tests/dshm-cancel-regression.spec.ts', 'packages/experimental/auto-review/tests/auto-review.spec.ts',
    '--maxWorkers=2', '--reporter=json', '--outputFile=' + jsonFile],
    { cwd: sourceRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '', timedOut = false;
  child.stdout.on('data', value => { logs += value }); child.stderr.on('data', value => { logs += value });
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, 30000);
  try {
    report.code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail) });
  } finally { clearTimeout(timer) }
  report.elapsedMs = Date.now() - started; report.timedOut = timedOut;
  await writeFile(resolve(output, mode + '.log'), logs);
  const result = JSON.parse(await readFile(jsonFile, 'utf8'));
  report.tests = result.numTotalTests; report.failed = result.numFailedTests;
  report.failures = result.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed')
    .map(test => ({ name: test.fullName, failures: test.failureMessages })));
  report.passed = !timedOut && report.code === 0 && report.failed === 0;
} finally {
  for (let index = 0; index < applied; index++) await writeFile(resolve(sourceRoot, paths[index]), originals[index]);
  if (wroteFixture) await unlink(fixture);
  for (const [index, path] of paths.entries()) assert.deepEqual(await readFile(resolve(sourceRoot, path)), originals[index]);
  if (!installed) assert.equal(git('status', '--porcelain'), '');
  else await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
  if (installed) report.preservedInstalledBytes = true;
  else report.restoredOriginalBytes = true;
  await writeFile(resolve(output, mode + '-report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ ...report, failures: report.failures?.map(test => test.name) }));
if (!report.passed) process.exitCode = 1;
