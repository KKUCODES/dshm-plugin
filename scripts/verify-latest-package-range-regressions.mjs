// 保留原业务断言；仅让原execa替身解开新增载体，真实载体另由实际Windows专项验证。
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { verifyInstalledSource } from '../compatibility/latest-upstream/source-host.mjs';

const attempt = process.argv[2] ?? '';
assert.ok(process.argv.length <= 3 && (attempt === '' || attempt === '--combined' || /^--attempt-(?:[2-9]|10)$/.test(attempt)));
await verifyInstalledSource();
const output = resolve(import.meta.dirname, '../artifacts/latest-runtime-check/package-range-source');
await mkdir(output, { recursive: true });
const prefix = resolve(output, 'original-regressions' + (attempt === '--combined' ? '-combined-' + randomUUID() : attempt.replace('--', '-')));
await assert.rejects(access(prefix + '.json'), { code: 'ENOENT' });
const originalPath = resolve(sourceRoot, 'packages/boot/plugin-manager/tests/operations.spec.ts');
const fixture = resolve(sourceRoot, 'packages/boot/plugin-manager/tests/dshm-range-regression.spec.ts');
await assert.rejects(access(fixture), { code: 'ENOENT' });
const original = await readFile(originalPath);
const anchor = "vi.mock('execa', () => ({ execa: (...args: unknown[]) => command.run(...args) }))";
assert.equal(original.toString().split(anchor).length, 2);
const mock = `vi.mock('execa', () => ({ execa: (file: string, argv: readonly string[], options: unknown) => {
  const index = argv.indexOf('--run')
  return file === process.execPath && index !== -1
    ? command.run(argv[index + 1], JSON.parse(argv[index + 2] as string), options)
    : command.run(file, argv, options)
} }))`;
const report = { scope: 'original-package-business-and-tree-suites-with-carrier-aware-execa-mock', passed: false };
try {
  await writeFile(fixture, original.toString().replace(anchor, mock), { flag: 'wx' });
  const child = spawn(process.execPath, [resolve(sourceRoot, 'node_modules/vitest/vitest.mjs'), 'run',
    'packages/boot/plugin-manager/tests/dshm-range-regression.spec.ts', 'packages/boot/plugin-manager/tests/run-tree.spec.ts',
    'scripts/build-exe-for-python-sdk.spec.ts', '--maxWorkers=2', '--reporter=json', '--outputFile=' + prefix + '-vitest.json'],
    { cwd: sourceRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', data => { log += data; }); child.stderr.on('data', data => { log += data; });
  const timer = setTimeout(() => child.kill(), 90000);
  try { report.code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail); }); }
  finally { clearTimeout(timer); }
  await writeFile(prefix + '.log', log, { flag: 'wx' });
  const result = JSON.parse(await readFile(prefix + '-vitest.json'));
  report.tests = result.numTotalTests; report.failed = result.numFailedTests;
  report.failures = result.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed')
    .map(test => ({ name: test.fullName, messages: test.failureMessages })));
  report.passed = report.code === 0 && report.failed === 0;
} finally {
  await unlink(fixture); assert.deepEqual(await readFile(originalPath), original);
  await verifyInstalledSource(); report.originalSpecsPreserved = true;
  await writeFile(prefix + '.json', JSON.stringify(report, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify({ passed: report.passed, tests: report.tests, failed: report.failed, failures: report.failures, reportPath: prefix + '.json' }));
process.exit(report.passed ? 0 : 1);
