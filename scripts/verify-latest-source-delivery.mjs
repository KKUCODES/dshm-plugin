import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installStartup } from '../compatibility/source-start/install.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'artifacts/latest-source-check');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const git = (...args) => execFileSync('git', args, { cwd: source, encoding: 'utf8', windowsHide: true }).trim();
assert.equal(git('rev-parse', 'HEAD'), '5badb15009ae1756c3afe0ae0cef1faafc290ccc');
assert.equal(git('status', '--porcelain'), '');
const original = await readFile(resolve(source, 'package.json'));
const report = { at: new Date().toISOString(), commit: git('rev-parse', 'HEAD'), passed: false };
try {
  report.plan = await installStartup('plan', source);
  assert.equal(report.plan.state, 'original');
  report.apply = await installStartup('apply', source);
  assert.equal(report.apply.written, 3);
  assert.equal((await installStartup('apply', source)).written, 0);
  // 此处使用交付安装器实际写入的bootstrap和根dsh脚本，不使用测试NODE_OPTIONS。
  for (const script of ['verify-latest-source-identity.mjs', 'verify-latest-source-startup.mjs']) {
    execFileSync(process.execPath, [resolve(root, 'scripts', script), '--installed'], {
      cwd: root, encoding: 'utf8', windowsHide: true, timeout: 90000, maxBuffer: 1024 * 1024,
    });
  }
  report.identity = JSON.parse(await readFile(resolve(runtime, 'latest-source-identity-installed.json'), 'utf8'));
  report.startup = JSON.parse(await readFile(resolve(runtime, 'latest-source-startup-installed.json'), 'utf8'));
  report.passed = true;
} catch (error) {
  report.error = String(error.stderr ?? error.message).slice(-4000); throw error;
} finally {
  report.restore = await installStartup('restore', source);
  assert.equal((await installStartup('restore', source)).written, 0);
  assert.deepEqual(await readFile(resolve(source, 'package.json')), original);
  for (const file of ['register.mjs', 'bootstrap.mjs'])
    await assert.rejects(access(resolve(source, '.dshm-source', file)), { code: 'ENOENT' });
  assert.equal(git('status', '--porcelain'), '');
  report.restoredOriginalBytes = true;
  await writeFile(resolve(runtime, 'latest-source-delivery.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, restoredOriginalBytes: report.restoredOriginalBytes }));
