import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { sourcePluginRestartChanges } from '../compatibility/latest-upstream/source-plugin-restart.mjs';
import { applySourceChange, sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

const flags = process.argv.slice(2);
assert.ok(flags.length === 0 || (flags.length === 1 && ['--candidate', '--installed'].includes(flags[0])));
const candidate = flags.includes('--candidate'), installed = flags.includes('--installed');
const mode = installed ? 'installed' : candidate ? 'candidate' : 'original';
const git = (...args) => execFileSync('git', args, { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), sourceCommit);
if (!installed) assert.equal(git('status', '--porcelain'), '');
else await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
const hash = bytes => createHash('sha256').update(bytes.toString().replaceAll('\r\n', '\n')).digest('hex');
const originals = await Promise.all(sourcePluginRestartChanges.map(change => readFile(resolve(sourceRoot, change.path))));
if (!installed) for (const [i, change] of sourcePluginRestartChanges.entries()) assert.equal(hash(originals[i]), change.hash);
const directory = 'packages/client/ui-plugin-manager/tests/';
const specs = [
  ['components.client.spec.tsx', '733d6f165e36a2ac29075f99e5776a11bd2d34a166e35563736059ee7459c82e'],
  ['manager-store.client.spec.ts', '3667ae709a319851524d17c8d9a1ff3c0ce41ee3f7944f635a4918c7d838ffa1'],
];
const texts = await Promise.all(specs.map(([file]) => readFile(resolve(sourceRoot, directory, file), 'utf8')));
for (const [i, [, expected]] of specs.entries()) assert.equal(hash(texts[i]), expected);
const before = "expect(screen.getByRole('button', { name: en.installEnableNow })).toHaveProperty('disabled', true)\n    expect(screen.getByText(en.installDoneRestart)).toBeTruthy()";
const page = texts[0].replaceAll('\r\n', '\n');
assert.equal(page.split(before).length, 2);
texts[0] = page.replace(before,
  "expect(screen.queryByRole('button', { name: en.installEnableNow })).toBeNull()\n    expect(screen.getByRole('button', { name: en.installClose })).toHaveProperty('disabled', false)\n    expect(screen.getByText(en.installDoneRestart)).toBeTruthy()");
texts[1] += `
it.each([false, true])('keeps restart-required installation open without an enable RPC (enabled=%s)', async (enabled) => {
  const { plugins, face, state, controller } = bench({
    installBundle: vi.fn(() => Promise.resolve(ok({ ...APPLIED, application: 'restart-required', bundle: 'dsh-a' }))),
  }, enabled)
  await controller.load()
  face.openInstall()
  face.editInstallSpec('dsh-a')
  face.runInstall()
  await vi.waitFor(() => { expect(state().install.phase).toBe('done') })
  expect(state().install.restartRequired).toBe(true)
  face.enableInstalled()
  await Promise.resolve()
  expect(plugins.setBundleEnabled).not.toHaveBeenCalled()
  expect(state().install.open).toBe(true)
  expect(state().install.enabling).toBe(false)
  face.closeInstall()
  expect(state().install.open).toBe(false)
})
`;
const fixtures = specs.map(([file]) => resolve(sourceRoot, directory, 'dshm-restart-' + file));
for (const fixture of fixtures) await assert.rejects(access(fixture), { code: 'ENOENT' });
const output = resolve(import.meta.dirname, '../artifacts/latest-runtime-check/plugin-restart');
await mkdir(output, { recursive: true });
const jsonFile = resolve(output, mode + '-vitest.json');
const report = { at: new Date().toISOString(), sourceCommit, mode,
  scope: 'original-client-suites-with-restart-regression', passed: false };
let fixturesWritten = 0, applied = 0;
try {
  for (const [i, fixture] of fixtures.entries()) { await writeFile(fixture, texts[i]); fixturesWritten++ }
  if (candidate) for (const [i, change] of sourcePluginRestartChanges.entries()) {
    assert.deepEqual(await readFile(resolve(sourceRoot, change.path)), originals[i]);
    await writeFile(resolve(sourceRoot, change.path), applySourceChange(change, originals[i].toString())); applied++;
  }
  try { await unlink(jsonFile) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const started = Date.now();
  const child = spawn(process.execPath, [resolve(sourceRoot, 'node_modules/vitest/vitest.mjs'), 'run',
    ...fixtures.map(file => file.slice(sourceRoot.length + 1)), '--maxWorkers=2', '--reporter=json', '--outputFile=' + jsonFile],
    { cwd: sourceRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '', timedOut = false;
  child.stdout.on('data', value => { logs += value }); child.stderr.on('data', value => { logs += value });
  const timer = setTimeout(() => { timedOut = true; child.kill() }, 60000);
  try { report.code = await new Promise((done, fail) => { child.once('close', done); child.once('error', fail) }) }
  finally { clearTimeout(timer) }
  report.elapsedMs = Date.now() - started; report.timedOut = timedOut;
  await writeFile(resolve(output, mode + '.log'), logs);
  const result = JSON.parse(await readFile(jsonFile, 'utf8'));
  report.tests = result.numTotalTests; report.failed = result.numFailedTests;
  report.failures = result.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed')
    .map(test => ({ name: test.fullName, failures: test.failureMessages })));
  report.passed = !timedOut && report.code === 0 && report.failed === 0;
} finally {
  for (let i = 0; i < applied; i++) await writeFile(resolve(sourceRoot, sourcePluginRestartChanges[i].path), originals[i]);
  for (let i = 0; i < fixturesWritten; i++) await unlink(fixtures[i]);
  for (const [i, change] of sourcePluginRestartChanges.entries()) assert.deepEqual(await readFile(resolve(sourceRoot, change.path)), originals[i]);
  if (!installed) { assert.equal(git('status', '--porcelain'), ''); report.restoredOriginalBytes = true }
  else { await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource(); report.preservedInstalledBytes = true }
  await writeFile(resolve(output, mode + '-report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ ...report, failures: report.failures?.map(test => test.name) }));
if (!report.passed) process.exitCode = 1;
