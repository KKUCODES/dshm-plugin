import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { sourcePackageRangeChanges } from '../compatibility/latest-upstream/source-package-range.mjs';
import { applySourceChange, sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { seaNativeDlopenPrelude, seaRunnerMatch, transformSdkNativePath } from '../compatibility/latest-upstream/sdk-native-path.mjs';
import { sdkModuleIdentityResolver } from '../compatibility/latest-upstream/sdk-module-identity.mjs';

function runnerMatcher(platform = 'win32', sea = true) {
  return vm.runInNewContext(seaRunnerMatch + '\nmatchesSdkRunner', { process: { platform }, isSea: () => sea });
}

test('SDK Windows runner dispatch accepts only a different drive of the same snapshot entry', () => {
  const matches = runnerMatcher();
  for (const runner of ['dsh-sandbox-windows-acl/lib/runner.js', 'dsh-plugin-manager/lib/types/run-tree.js']) {
    const entry = 'C:/snapshot/fixture/node_modules/@deepseek-ai/' + runner;
    for (const drive of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.equal(matches(drive + entry.slice(1), entry), true);
    assert.equal(matches(entry.replaceAll('/', '\\').replace(/^C:/, 'Q:'), entry.replaceAll('/', '\\')), true);
    assert.equal(matches(entry.replaceAll('/', '\\'), entry), false);
    for (const input of [entry.replace('snapshot/', 'snapshot-other/'), entry.replace('fixture/', 'other/'),
      entry + '.bak', entry.replace('/lib/', '/src/'), '/snapshot/' + runner, '\\\\server\\snapshot\\' + runner,
      '\\\\?\\' + entry.replaceAll('/', '\\'), undefined, {}, entry.replace('/fixture/', '/fixture/../fixture/')]) {
      assert.equal(matches(input, entry), false);
    }
    assert.equal(matches(entry, undefined), false);
    assert.equal(matches(undefined, undefined), false);
  }
});

test('real paths, non-SEA and other platforms preserve exact runner matching', () => {
  const original = 'C:/snapshot/fixture/runner.js', changedDrive = 'Q:/snapshot/fixture/runner.js';
  for (const matches of [runnerMatcher('win32', false), runnerMatcher('linux'), runnerMatcher('darwin')]) {
    assert.equal(matches(original, original), true);
    assert.equal(matches(changedDrive, original), false);
  }
  assert.equal(runnerMatcher()('Q:/project/runner.js', 'C:/project/runner.js'), false);
  assert.equal(runnerMatcher()('Q:/project/runner.js', 'Q:/project/runner.js'), true);
});

function carrier(platform = 'win32') {
  const calls = [], originalDlopen = function (...args) { calls.push({ owner: this, args }); return 42; };
  const process = { platform, dlopen: originalDlopen };
  vm.runInNewContext(seaNativeDlopenPrelude, { process });
  return { process, calls, originalDlopen };
}

test('virtual Q drive reaches the original extractor with native arguments preserved', () => {
  const { process, calls } = carrier(), module = {}, flags = 17;
  assert.equal(process.dlopen(module, '\\\\?\\Q:\\snapshot\\fixture\\koffi.node', flags), 42);
  assert.equal(calls[0].owner, process);
  assert.deepEqual(calls[0].args, [module, 'C:\\snapshot\\fixture\\koffi.node', flags]);
});

test('all other drive letters and both separators use the same virtual namespace', () => {
  const { process, calls } = carrier();
  for (const drive of 'ABDEFGHIJKLMNOPQRSTUWXYZ') {
    process.dlopen({}, drive + ':/snapshot/fixture/koffi.node');
    assert.equal(calls.at(-1).args[1], 'C:/snapshot/fixture/koffi.node');
  }
  process.dlopen({}, 'q:\\snapshot\\fixture\\koffi.node');
  assert.equal(calls.at(-1).args[1], 'C:\\snapshot\\fixture\\koffi.node');
});

test('real files, existing C/V paths, lookalike directories and nonstrings stay exact', () => {
  const { process, calls } = carrier();
  for (const path of ['Q:\\project\\koffi.node', 'Q:\\snapshot-other\\koffi.node',
    '\\\\?\\Q:\\project\\koffi.node', 'C:\\snapshot\\koffi.node', 'V:/snapshot/koffi.node',
    '/snapshot/koffi.node', '\\\\server\\snapshot\\koffi.node', undefined, Buffer.from('native')]) {
    process.dlopen({}, path);
    assert.equal(calls.at(-1).args[1], path);
    assert.equal(calls.at(-1).args.length, 2);
  }
});

test('other platforms keep the exact original dlopen', () => {
  for (const platform of ['linux', 'darwin']) {
    const { process, originalDlopen } = carrier(platform);
    assert.equal(process.dlopen, originalDlopen);
  }
});

test('bootstrap insertion preserves original text and rejects an unknown or repeated anchor', () => {
  const original = 'before\nif (isSea()) {\n  // original Office resolver\n}\nafter\n';
  const patched = transformSdkNativePath(original);
  assert.equal(patched.replace(seaNativeDlopenPrelude, ''), original);
  assert.throws(() => transformSdkNativePath('before\nafter\n'), /anchor_mismatch/);
  assert.throws(() => transformSdkNativePath(original + original), /anchor_mismatch/);
});

test('the pinned real SDK bootstrap contains the correction and existing runner dispatch', () => {
  const change = sourcePackageRangeChanges.find(row => row.path === 'python/sdk-runtime/runtime-bootstrap.mjs');
  const original = execFileSync('git', ['show', '5badb15009ae1756c3afe0ae0cef1faafc290ccc:' + change.path],
    { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' });
  const patched = applySourceChange(change, original);
  assert.equal(patched.split(seaNativeDlopenPrelude).length, 2);
  assert.ok(patched.includes('const { runPackageRunner } = await import'));
  assert.ok(patched.includes('matchesSdkRunner(process.argv[2], packageRunner)'));
  assert.ok(patched.includes('matchesSdkRunner(process.argv[2], aclRunner)'));
  assert.equal(patched.split('process.argv.splice(1, 1)').length, 3);
  assert.ok(patched.includes('const office = specifier ==='));
  assert.equal(patched.split(sdkModuleIdentityResolver).length, 2);
  // 第九轮载体仍是旧字节；新解析修正不能改变那份历史证据。
  const ninth = patched.replace(sdkModuleIdentityResolver, '      return nextResolve(specifier, office ? { ...context, parentURL } : context)');
  assert.equal(createHash('sha256').update(ninth).digest('hex'),
    '61241cde85c14d3abd279867ff70a2babf12f3bf8d70f125883159c7fa714ae3');
  const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    cwd: resolve(import.meta.dirname, '..'), windowsHide: true, encoding: 'utf8', input: patched });
  assert.equal(syntax.status, 0, syntax.stderr);
  assert.throws(() => applySourceChange(change, original + '\n// unknown edit\n'), /baseline_mismatch/);
});
