// 只读审计已完成的原生对照；诊断成立不代表原失败工作区已修复。
import assert from 'node:assert/strict';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

assert.equal(process.argv.length, 2);
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const output = resolve(runtime, 'latest-acl-created-security-audit.json');
await assert.rejects(access(output), { code: 'ENOENT' });
const read = async name => JSON.parse(await readFile(resolve(runtime, name + '.json'), 'utf8'));
const full = await read('latest-acl-created-security');
const isolated = await read('latest-acl-created-security-write-owner-only-explicit-root');
const failed = await read('latest-acl-created-security-write-owner-only');
const oldFailure = await read('latest-acl-inheritance-audit');
const report = { at: new Date().toISOString(), sourceCommit: full.sourceCommit, passed: false,
  originalWorkspaceFixed: false, productionSandboxChanged: false };
try {
  for (const item of [full, isolated, failed, oldFailure]) assert.equal(item.sourceCommit, full.sourceCommit);
  for (const item of [full, isolated]) {
    assert.equal(item.failure, undefined); assert.equal(item.cleanupFailure, undefined);
    assert.equal(item.diagnosisVerified, true); assert.equal(item.createdObjectsRemoved, true);
    assert.equal(dirname(item.root), runtime); await assert.rejects(access(item.root), { code: 'ENOENT' });
    assert.equal(item.scenarios.length, 2);
    for (const scenario of item.scenarios) { assert.equal(scenario.results.length, 14); assert.equal(scenario.boundaryDenied, true); }
  }
  assert.equal(full.existingWritesCompatibleInControlledCreation, true);
  assert.equal(isolated.writeOwnerDifferenceVerified, true);
  const [withoutOwner, withOwner] = isolated.scenarios;
  assert.equal(withoutOwner.strategy, 'without-owner'); assert.equal(withOwner.strategy, 'with-owner');
  const normalize = rows => rows.map(({ owner, dacl, label }) => ({ owner, label,
    dacl: dacl.map(ace => ({ ...ace, mask: ace.mask & ~0x80000 })) }));
  assert.deepEqual(normalize(withoutOwner.before), normalize(withOwner.before));
  for (const index of [1, 2, 3, 5]) {
    assert.equal(withOwner.before[index].dacl.length, 1); assert.equal(withoutOwner.before[index].dacl.length, 1);
    assert.equal(withOwner.before[index].dacl[0].mask ^ withoutOwner.before[index].dacl[0].mask, 0x80000);
    assert.deepEqual(withoutOwner.afterGrant[index].label, []);
    assert.ok(withOwner.afterGrant[index].label.some(ace => ace.type === 17 && ace.sid === 'S-1-16-4096'
      && ace.mask === 1 && (ace.flags & 16)));
  }
  assert.equal(withoutOwner.existingWritesPassed, false); assert.equal(withOwner.existingWritesPassed, true);
  assert.equal(oldFailure.existingWritesCompatible, false); assert.equal(oldFailure.originalSecurityAndBytesRestored, undefined);
  // 首个 IO 描述符触发父目录重算并导致 revoke 失败，仍保留失败，不能写成整组通过。
  assert.equal(failed.failure.name, 'AggregateError'); assert.equal(failed.createdObjectsRemoved, true);
  await assert.rejects(access(failed.root), { code: 'ENOENT' });
  report.nativeOperations = full.scenarios.length * 14 + isolated.scenarios.length * 14;
  report.singleWriteOwnerDifference = true; report.boundariesRetained = true; report.createdObjectsRemoved = true;
  report.failedControlPreserved = true; report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally { await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify(report)); }
