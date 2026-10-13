import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';
import { transformLatestAutoReviewCancellation } from '../compatibility/latest-upstream/auto-review-cancel.mjs';
const mode = process.argv[2]; assert.ok(['before', 'after', 'installed'].includes(mode));
await verifyInstalledSource();
const hash = value => createHash('sha256').update(value.toString().replaceAll('\r\n', '\n')).digest('hex');
const sourcePath = resolve(sourceRoot, 'packages/experimental/auto-review/src/index.ts');
const specPath = resolve(sourceRoot, 'packages/experimental/auto-review/tests/auto-review.spec.ts');
const fixture = resolve(sourceRoot, 'packages/experimental/auto-review/tests/dshm-cancel-regression.spec.ts');
const original = await readFile(sourcePath), spec = await readFile(specPath);
const sourceHash = '5a869b87bf4ac397fffca5cf0a6ace05879fdbf1aecffc101b5464186a26e2e2';
const baseline = hash(original) === sourceHash ? original : await readFile(resolve(outputRoot, 'original/packages/experimental/auto-review/src/index.ts'));
assert.equal(hash(baseline), sourceHash);
const candidate = transformLatestAutoReviewCancellation(baseline.toString(), true);
assert.ok(original.equals(baseline) || original.toString().replaceAll('\r\n', '\n') === candidate.replaceAll('\r\n', '\n'));
if (mode === 'installed') assert.equal(original.toString().replaceAll('\r\n', '\n'), candidate.replaceAll('\r\n', '\n'));
assert.equal(hash(spec), '4736d4c983e38c7e68283c6838eb1eef4e803c3c4dca6eb06f0a5f4f54915280');
await assert.rejects(access(fixture), { code: 'ENOENT' });
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const prefix = resolve(runtime, 'latest-auto-review-cancel-' + mode), jsonPath = prefix + '-vitest.json';
await assert.rejects(access(jsonPath), { code: 'ENOENT' });
const report = { mode, scope: 'original-suite-and-typed-cancellation', inferenceVerified: false, passed: false };
try {
  await writeFile(fixture, spec.toString() + await readFile(new URL('../compatibility/latest-upstream/auto-review-cancel-regression.ts', import.meta.url), 'utf8'));
  if (mode === 'before') await writeFile(sourcePath, baseline);
  else if (mode === 'after') await writeFile(sourcePath, candidate);
  const child = spawn(process.execPath, [resolve(sourceRoot, 'node_modules/vitest/vitest.mjs'), 'run',
    'packages/experimental/auto-review/tests/dshm-cancel-regression.spec.ts', '--maxWorkers=1', '--reporter=json', '--outputFile=' + jsonPath],
    { cwd: sourceRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', value => { log += value; }); child.stderr.on('data', value => { log += value; });
  const timer = setTimeout(() => child.kill(), 30000);
  try { report.code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); }); }
  finally { clearTimeout(timer); }
  await writeFile(prefix + '.log', log, { flag: 'wx' });
  const result = JSON.parse(await readFile(jsonPath, 'utf8'));
  report.tests = result.numTotalTests; report.failed = result.numFailedTests;
  report.failures = result.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed').map(test => test.fullName));
  report.passed = report.code === 0 && report.failed === 0;
} finally {
  await writeFile(sourcePath, original); await unlink(fixture);
  assert.deepEqual(await readFile(sourcePath), original); await verifyInstalledSource(); report.installedSourceRestored = true;
  await writeFile(prefix + '-report.json', JSON.stringify(report, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify(report)); if (!report.passed) process.exitCode = 1;
// 报告落盘和源文件恢复完成后，不让构建解析器的句柄延长本次验证。
process.exit(process.exitCode ?? 0);
