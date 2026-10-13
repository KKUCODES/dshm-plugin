// 在项目产物内复现原沙箱授权传播；只用原 API，不替换 Win32 结果或放宽受限令牌。
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const phase = process.argv[2];
assert.ok(['prepare', 'grant-before-repair', 'grant-after-repair', 'probe', 'probe-valid', 'tree-inspect', 'tree-dacl-only', 'tree-label-only', 'split-grant', 'probe-split', 'cleanup-fresh', 'cleanup', 'restore-verify', 'audit', 'child-rights'].includes(phase));
assert.equal(process.argv.length, 3);
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const seedPath = resolve(runtime, 'latest-acl-inheritance-seed.json');
const reportPath = resolve(runtime, 'latest-acl-inheritance-' + phase + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const state = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json'), 'utf8'));
assert.equal(state.executionMode, 'source');
const { verifyInstalledSource } = await import('../compatibility/latest-upstream/source-host.mjs');
const installed = await verifyInstalledSource(); assert.equal(installed.sourceCommit, state.sourceCommit);
const libraryRoot = resolve(state.sourceRoot, 'packages/sandbox/sandbox-windows-acl');
const library = await import(pathToFileURL(resolve(libraryRoot, 'lib/index.js')));
const ffi = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/ffi.js')));
const abi = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/win32-abi.js')));
const grantModule = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/grant.js')));
const api = ffi.win32Sync();
const report = { at: new Date().toISOString(), phase, sourceCommit: installed.sourceCommit, nativeCalls: [] };
let seed;

function snapshot(path, information) {
  const slots = Array.from({ length: 5 }, () => ffi.allocPtrSlot());
  const result = api.getNamedSecurityInfoW(path, abi.SE_FILE_OBJECT, information, ...slots);
  assert.equal(result, abi.ERROR_SUCCESS);
  const acl = ffi.decodePtr(slots[information === abi.DACL_SECURITY_INFORMATION ? 2 : 3]);
  const descriptor = ffi.decodePtr(slots[4]);
  try {
    if (acl === null) return [];
    const size = ffi.decodeUint16At(acl, 2); const count = ffi.decodeUint16At(acl, 4);
    assert.ok(size >= 8 && size <= 1048576);
    let offset = 8; const entries = [];
    for (let index = 0; index < count; index++) {
      const length = ffi.decodeUint16At(acl, offset + 2);
      assert.ok(length >= 16 && offset + length <= size);
      const sidOffset = offset + 8; const subCount = ffi.decodeUint8At(acl, sidOffset + 1);
      assert.ok(subCount <= 15 && 16 + 4 * subCount <= length);
      let authority = 0n;
      for (let i = 0; i < 6; i++) authority = authority * 256n + BigInt(ffi.decodeUint8At(acl, sidOffset + 2 + i));
      const subs = Array.from({ length: subCount }, (_, i) => ffi.decodeUint32At(acl, sidOffset + 8 + 4 * i));
      entries.push({ type: ffi.decodeUint8At(acl, offset), flags: ffi.decodeUint8At(acl, offset + 1),
        mask: ffi.decodeUint32At(acl, offset + 4),
        sid: `S-${ffi.decodeUint8At(acl, sidOffset)}-${authority}${subs.length ? '-' + subs.join('-') : ''}` });
      offset += length;
    }
    return entries;
  } finally { if (descriptor !== null) api.localFree(descriptor); }
}
const readSecurity = path => ({ path, dacl: snapshot(path, abi.DACL_SECURITY_INFORMATION), label: snapshot(path, abi.LABEL_SECURITY_INFORMATION) });
const loggedApi = { ...api, setNamedSecurityInfoW(...args) {
  const outcome = api.setNamedSecurityInfoW(...args);
  report.nativeCalls.push({ path: args[0], objectType: args[1], information: args[2], result: outcome });
  return outcome;
} };

try {
  if (phase === 'prepare') {
    seed = { at: new Date().toISOString(), sourceCommit: installed.sourceCommit,
      root: resolve(runtime, 'acl-inheritance-' + randomUUID()) };
    await writeFile(seedPath, JSON.stringify(seed, null, 2), { flag: 'wx' });
    await mkdir(seed.root); await mkdir(resolve(seed.root, 'nested'));
    for (const name of ['existing.txt', 'nested/existing.txt']) await writeFile(resolve(seed.root, name), 'BEFORE\n', { flag: 'wx' });
  } else seed = JSON.parse(await readFile(seedPath, 'utf8'));
  assert.equal(seed.sourceCommit, installed.sourceCommit);
  assert.equal(dirname(seed.root), runtime); assert.match(relative(runtime, seed.root), /^acl-inheritance-[0-9a-f-]{36}$/);
  assert.equal(await realpath(seed.root), seed.root);
  report.root = seed.root; report.writeSid = library.workspaceWriteSid(seed.root);
  const paths = [seed.root, resolve(seed.root, 'existing.txt'), resolve(seed.root, 'nested'), resolve(seed.root, 'nested/existing.txt')];
  report.before = paths.map(readSecurity);
  if (phase === 'grant-before-repair' || phase === 'grant-after-repair') {
    if (phase === 'grant-after-repair') {
      const earlier = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-grant-before-repair.json'), 'utf8'));
      assert.equal(earlier.root, seed.root); assert.match(earlier.failure.message, /SetNamedSecurityInfoW failed \(Win32 5\)/);
      const recovery = resolve(runtime, 'latest-acl-inheritance-recovery');
      const reports = (await readdir(recovery)).filter(name => /^acl-report-.*\.jsonl$/.test(name)); assert.equal(reports.length, 1);
      const records = (await readFile(resolve(recovery, reports[0]), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
      const grants = records.filter(item => item.kind === 'verification' && item.operation === 'grant');
      assert.equal(grants.length, 1); assert.equal(grants[0].status, 'verified'); assert.equal(grants[0].path, seed.root);
      assert.deepEqual(grants[0].details.after, { writeDac: true, writeOwner: true });
    }
    const grant = grantModule.AclWriteGrant.create(report.writeSid, loggedApi);
    try { grant.add(seed.root, true); report.granted = true; }
    finally { grant.dispose(); }
  } else if (phase === 'split-grant') {
    const earlier = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-tree-label-only.json'), 'utf8'));
    assert.equal(earlier.root, seed.root); assert.equal(earlier.treeResult, 0);
    const revoke = grantModule.AclWriteGrant.create(report.writeSid, loggedApi);
    try { revoke.add(seed.root, false); } finally { revoke.dispose(); }
    report.between = paths.map(readSecurity);
    // 仅作独立测试变量；没有在两次设置之间启动任何受限进程，也不作为生产修复。
    const splitApi = { ...api, setNamedSecurityInfoW(path, objectType, information, owner, group, dacl, sacl) {
      assert.equal(path, seed.root); assert.equal(information, abi.DACL_SECURITY_INFORMATION | abi.LABEL_SECURITY_INFORMATION);
      const daclResult = api.setNamedSecurityInfoW(path, objectType, abi.DACL_SECURITY_INFORMATION, owner, group, dacl, null);
      report.nativeCalls.push({ path, objectType, information: abi.DACL_SECURITY_INFORMATION, result: daclResult });
      if (daclResult !== abi.ERROR_SUCCESS) return daclResult;
      const labelResult = api.setNamedSecurityInfoW(path, objectType, abi.LABEL_SECURITY_INFORMATION, owner, group, null, sacl);
      report.nativeCalls.push({ path, objectType, information: abi.LABEL_SECURITY_INFORMATION, result: labelResult });
      return labelResult;
    } };
    const grant = grantModule.AclWriteGrant.create(report.writeSid, splitApi);
    try { grant.add(seed.root, true); report.granted = true; } finally { grant.dispose(); }
  } else if (phase === 'probe' || phase === 'probe-valid' || phase === 'probe-split') {
    const granted = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-grant-after-repair.json'), 'utf8'));
    assert.equal(granted.root, seed.root); assert.equal(granted.granted, true);
    if (phase === 'probe-valid') {
      const earlier = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-probe.json'), 'utf8'));
      assert.equal(earlier.root, seed.root); assert.deepEqual(earlier.results, []);
      assert.equal(earlier.failure.message, 'AclSandbox read-only does not accept write SIDs');
    }
    report.results = [];
    for (const mode of ['read-only', 'workspace-write']) {
      const sandbox = new library.AclSandbox({ writableDirs: [seed.root], mode,
        ...(mode === 'workspace-write' ? { writeSid: report.writeSid } : {}),
        tempDir: null, manageDacls: false });
      try {
        await sandbox.init();
        for (const name of ['existing.txt', 'nested/existing.txt', 'fresh-' + (phase === 'probe-split' ? 'split-' : '') + mode + '.txt']) {
          const file = resolve(seed.root, name);
          const code = `import {writeFile,readFile} from 'node:fs/promises';try{await writeFile(${JSON.stringify(file)},${JSON.stringify('AFTER\n')});console.log(await readFile(${JSON.stringify(file)},'utf8'));}catch(error){console.error(error.code);process.exitCode=1;}`;
          const child = sandbox.spawn({ command: process.execPath, args: ['--input-type=module', '-e', code], cwd: seed.root });
          const outcome = await child.wait();
          report.results.push({ mode, name, exitCode: outcome.exitCode, stdout: outcome.stdout.toString(), stderr: outcome.stderr.toString() });
        }
      } finally { sandbox.dispose(); }
    }
  } else if (['tree-inspect', 'tree-dacl-only', 'tree-label-only'].includes(phase)) {
    const probe = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-probe-valid.json'), 'utf8'));
    assert.equal(probe.root, seed.root); assert.equal(probe.results.length, 6);
    assert.equal(probe.results.find(item => item.mode === 'workspace-write' && item.name === 'existing.txt').stderr.trim(), 'EPERM');
    // TREE_SEC_INFO_SET 保留原继承规则；回调只记录原生逐对象结果，不重试、取消或改写权限。
    const koffi = createRequire(resolve(libraryRoot, 'lib/types/ffi.js'))('koffi');
    const pointer = koffi.pointer('void');
    const progressType = koffi.proto('DSHM_AclTreeProgress', 'void', ['str16', 'uint32', koffi.pointer('int'), pointer, 'int']);
    const treeSet = koffi.load('advapi32.dll').func('__stdcall', 'TreeSetNamedSecurityInfoW', 'uint32',
      ['str16', 'int', 'uint32', pointer, pointer, pointer, pointer, 'uint32', koffi.pointer(progressType), 'int', pointer]);
    const slots = Array.from({ length: 5 }, () => ffi.allocPtrSlot());
    const information = phase === 'tree-dacl-only' ? abi.DACL_SECURITY_INFORMATION
      : phase === 'tree-label-only' ? abi.LABEL_SECURITY_INFORMATION
      : abi.DACL_SECURITY_INFORMATION | abi.LABEL_SECURITY_INFORMATION;
    assert.equal(api.getNamedSecurityInfoW(seed.root, abi.SE_FILE_OBJECT,
      abi.DACL_SECURITY_INFORMATION | abi.LABEL_SECURITY_INFORMATION, ...slots), abi.ERROR_SUCCESS);
    const descriptor = ffi.decodePtr(slots[4]);
    report.treeProgress = [];
    try {
      report.treeResult = treeSet(seed.root, abi.SE_FILE_OBJECT, information, null, null,
        (information & abi.DACL_SECURITY_INFORMATION) ? ffi.decodePtr(slots[2]) : null,
        (information & abi.LABEL_SECURITY_INFORMATION) ? ffi.decodePtr(slots[3]) : null, 1,
        (path, status, invokeSetting, args, securitySet) => {
          report.treeProgress.push({ path, status, invokeSetting: koffi.decode(invokeSetting, 'int'), securitySet });
        }, 5, null);
    } finally { if (descriptor !== null) api.localFree(descriptor); }
  } else if (phase === 'cleanup-fresh') {
    const probe = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-probe-split.json'), 'utf8'));
    assert.equal(probe.root, seed.root); assert.equal(probe.results.length, 6);
    for (const name of ['existing.txt', 'nested/existing.txt']) assert.equal(await readFile(resolve(seed.root, name), 'utf8'), 'BEFORE\n');
    for (const name of ['fresh-read-only.txt', 'fresh-split-read-only.txt']) await assert.rejects(access(resolve(seed.root, name)), { code: 'ENOENT' });
    report.removed = [];
    for (const name of ['fresh-workspace-write.txt', 'fresh-split-workspace-write.txt']) {
      const file = resolve(seed.root, name);
      assert.equal(await readFile(file, 'utf8'), 'AFTER\n');
      await unlink(file); report.removed.push(name);
    }
  } else if (phase === 'cleanup') {
    const granted = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-grant-after-repair.json'), 'utf8'));
    assert.equal(granted.root, seed.root); assert.equal(granted.granted, true);
    const grant = grantModule.AclWriteGrant.create(report.writeSid, loggedApi);
    try { grant.add(seed.root, false); }
    finally { grant.dispose(); }
    report.grantRevoked = true;
  } else if (phase === 'restore-verify') {
    const initial = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-prepare.json'), 'utf8'));
    assert.equal(initial.root, seed.root);
    assert.deepEqual(report.before, initial.before);
    for (const name of ['existing.txt', 'nested/existing.txt']) assert.equal(await readFile(resolve(seed.root, name), 'utf8'), 'BEFORE\n');
    for (const name of ['fresh-workspace-write.txt', 'fresh-split-workspace-write.txt']) await assert.rejects(access(resolve(seed.root, name)), { code: 'ENOENT' });
    report.originalSecurityAndBytesRestored = true;
  } else if (phase === 'child-rights') {
    const restored = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-restore-verify.json'), 'utf8'));
    assert.equal(restored.root, seed.root); assert.equal(restored.originalSecurityAndBytesRestored, true);
    assert.deepEqual(report.before, restored.after);
    // OPEN_EXISTING 只打开授权测试对象；不启用备份/恢复特权或修改任何权限。
    report.accessChecks = [];
    for (const path of paths) {
      for (const [right, mask] of [['WRITE_DAC', 0x00040000], ['WRITE_OWNER', 0x00080000]]) {
        const handle = api.createFileW(path, mask, abi.FILE_SHARE_READ | abi.FILE_SHARE_WRITE | abi.FILE_SHARE_DELETE,
          null, 3, [seed.root, resolve(seed.root, 'nested')].includes(path) ? 0x02000000 : 0, null);
        const granted = !ffi.isInvalidHandle(handle);
        const error = granted ? 0 : api.getLastError();
        if (granted) assert.notEqual(api.closeHandle(handle), 0);
        report.accessChecks.push({ path, right, granted, error });
      }
    }
    const aclModule = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/acl.js')));
    const sidSlot = ffi.allocPtrSlot();
    assert.notEqual(api.convertStringSidToSidW('S-1-16-4096', sidSlot), 0);
    const sid = ffi.decodePtr(sidSlot); let label;
    report.directLabelWrites = [];
    try {
      label = aclModule.buildLowLabelAcl(api, sid);
      for (const path of [resolve(seed.root, 'existing.txt'), resolve(seed.root, 'nested/existing.txt')]) {
        const result = api.setNamedSecurityInfoW(path, abi.SE_FILE_OBJECT, abi.LABEL_SECURITY_INFORMATION, null, null, null, label);
        const item = { path, information: abi.LABEL_SECURITY_INFORMATION, result };
        report.directLabelWrites.push(item);
        if (result === abi.ERROR_SUCCESS) {
          // 意外允许时立即恢复原空标签，先清理再判定假设；不留下 Low 文件。
          item.restoreResult = api.setNamedSecurityInfoW(path, abi.SE_FILE_OBJECT, abi.LABEL_SECURITY_INFORMATION, null, null, null, null);
          assert.equal(item.restoreResult, abi.ERROR_SUCCESS);
        }
      }
    } finally {
      if (label != null) api.localFree(label);
      if (sid !== null) api.localFree(sid);
    }
    assert.deepEqual(paths.map(readSecurity), restored.after);
    for (const path of [resolve(seed.root, 'existing.txt'), resolve(seed.root, 'nested/existing.txt')]) assert.equal(await readFile(path, 'utf8'), 'BEFORE\n');
    report.originalSecurityAndBytesRestored = true;
  } else if (phase === 'audit') {
    const readReport = async name => {
      const item = JSON.parse(await readFile(resolve(runtime, 'latest-acl-inheritance-' + name + '.json'), 'utf8'));
      assert.equal(item.root, seed.root); assert.equal(item.sourceCommit, seed.sourceCommit);
      assert.equal(item.failure, undefined); return item;
    };
    const combined = await readReport('grant-after-repair');
    assert.equal(combined.granted, true); assert.deepEqual(combined.nativeCalls.map(item => [item.information, item.result]), [[20, 0]]);
    assert.ok(combined.after.slice(1).every(item => !item.dacl.some(ace => ace.sid === report.writeSid) && item.label.length === 0));
    const split = await readReport('split-grant');
    assert.deepEqual(split.nativeCalls.map(item => [item.information, item.result]), [[20, 0], [4, 0], [16, 0]]);
    assert.ok(split.after.slice(1).every(item => item.dacl.some(ace => ace.sid === report.writeSid && (ace.flags & 16)) && item.label.length === 0));
    for (const name of ['probe-valid', 'probe-split']) {
      const probe = await readReport(name); assert.equal(probe.results.length, 6);
      for (const result of probe.results) {
        const writableFresh = result.mode === 'workspace-write' && result.name.startsWith('fresh-');
        assert.equal(result.exitCode, writableFresh ? 0 : 1);
        assert.equal(result.stderr, writableFresh ? '' : 'EPERM\n');
        assert.equal(result.stdout, writableFresh ? 'AFTER\n\n' : '');
      }
    }
    const restored = await readReport('restore-verify'); assert.equal(restored.originalSecurityAndBytesRestored, true);
    assert.deepEqual(report.before, restored.after);
    report.diagnosisVerified = true; report.existingWritesCompatible = false;
    // 验证诊断成功不等于兼容通过；兼容失败保持非零退出码。
    process.exitCode = 1;
  }
  report.after = paths.map(readSecurity);
} catch (error) {
  report.failure = { name: error.name, code: error.code, message: error.message };
  process.exitCode = 1;
} finally {
  await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ phase, root: report.root, granted: report.granted, grantRevoked: report.grantRevoked,
    nativeCalls: report.nativeCalls, results: report.results, treeResult: report.treeResult,
    treeProgress: report.treeProgress, removed: report.removed,
    originalSecurityAndBytesRestored: report.originalSecurityAndBytesRestored,
    diagnosisVerified: report.diagnosisVerified, existingWritesCompatible: report.existingWritesCompatible,
    accessChecks: report.accessChecks, directLabelWrites: report.directLabelWrites, failure: report.failure }));
}
setTimeout(() => process.exit(process.exitCode ?? 0), 200);
