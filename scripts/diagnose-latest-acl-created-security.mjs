// 独立原生对照：安全描述符仅在创建 UUID 测试目录时指定，不修补已有用户目录。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, realpath, rmdir, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const writeOwnerOnly = process.argv[2] === 'write-owner-only';
const repairExisting = process.argv[2] === 'repair-existing';
const attempt = process.argv[3];
assert.ok(process.argv.length === 2 || ((writeOwnerOnly || repairExisting) && [3, 4].includes(process.argv.length)));
if (attempt !== undefined) assert.match(attempt, /^[a-z0-9-]{1,40}$/);
assert.equal(process.platform, 'win32');
assert.equal(process.arch, 'x64');
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const reportPath = resolve(runtime, 'latest-acl-created-security' + (writeOwnerOnly ? '-write-owner-only' : repairExisting ? '-repair-existing' : '')
  + (attempt ? '-' + attempt : '') + '.json');
await assert.rejects(access(reportPath), { code: 'ENOENT' });
const state = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json'), 'utf8'));
assert.equal(state.executionMode, 'source');
const { verifyInstalledSource } = await import('../compatibility/latest-upstream/source-host.mjs');
const installed = await verifyInstalledSource();
assert.equal(installed.sourceCommit, state.sourceCommit);
const libraryRoot = resolve(state.sourceRoot, 'packages/sandbox/sandbox-windows-acl');
const library = await import(pathToFileURL(resolve(libraryRoot, 'lib/index.js')));
const ffi = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/ffi.js')));
const abi = await import(pathToFileURL(resolve(libraryRoot, 'lib/types/win32-abi.js')));
const api = ffi.win32Sync();
const koffi = createRequire(resolve(libraryRoot, 'lib/types/ffi.js'))('koffi');
const pointer = koffi.pointer('void');
// Microsoft SECURITY_ATTRIBUTES：x64 结构的实际尺寸与指针偏移由 Koffi 计算。
const attributesType = koffi.struct('DSHM_CreatedSecurityAttributes', {
  nLength: 'uint32', lpSecurityDescriptor: pointer, bInheritHandle: 'int',
});
assert.equal(koffi.sizeof(attributesType), 24);
const createDirectory = koffi.load('kernel32.dll').func('__stdcall', 'CreateDirectoryW', 'int',
  ['str16', koffi.pointer(attributesType)]);
const convertDescriptor = koffi.load('advapi32.dll').func('__stdcall',
  'ConvertStringSecurityDescriptorToSecurityDescriptorW', 'int',
  ['str16', 'uint32', koffi.pointer(pointer), koffi.pointer('uint32')]);
const identities = execFileSync('C:/Windows/System32/whoami.exe', ['/user', '/fo', 'csv', '/nh'],
  { cwd: runtime, encoding: 'utf8', windowsHide: true }).match(/S-1-5-21-\d+-\d+-\d+-\d+/g);
assert.equal(identities?.length, 1);
const userSid = identities[0];
const root = resolve(runtime, 'acl-created-security-' + randomUUID());
assert.equal(dirname(root), runtime);
assert.match(relative(runtime, root), /^acl-created-security-[0-9a-f-]{36}$/);
const report = { at: new Date().toISOString(), sourceCommit: installed.sourceCommit, root, writeOwnerOnly, repairExisting, attempt,
  descriptorAtCreation: writeOwnerOnly ? 'protected test root DACL; explicit current user FullControl on root; child inheritance differs only by WRITE_OWNER'
    : 'current user FullControl, OI|CI; existing parent untouched', scenarios: [], cleanup: [] };

function sidString(sid, offset = 0) {
  assert.notEqual(api.isValidSid(sid), 0);
  const count = ffi.decodeUint8At(sid, offset + 1);
  assert.ok(count <= 15);
  let authority = 0n;
  for (let i = 0; i < 6; i++) authority = authority * 256n + BigInt(ffi.decodeUint8At(sid, offset + 2 + i));
  const subs = Array.from({ length: count }, (_, i) => ffi.decodeUint32At(sid, offset + 8 + 4 * i));
  return `S-${ffi.decodeUint8At(sid, offset)}-${authority}${subs.length ? '-' + subs.join('-') : ''}`;
}

function readSecurity(path) {
  const slots = Array.from({ length: 5 }, () => ffi.allocPtrSlot());
  assert.equal(api.getNamedSecurityInfoW(path, abi.SE_FILE_OBJECT,
    1 | abi.DACL_SECURITY_INFORMATION | abi.LABEL_SECURITY_INFORMATION, ...slots), 0);
  const descriptor = ffi.decodePtr(slots[4]);
  const owner = ffi.decodePtr(slots[0]);
  const readAcl = slot => {
    const acl = ffi.decodePtr(slot); if (acl === null) return [];
    const size = ffi.decodeUint16At(acl, 2); const count = ffi.decodeUint16At(acl, 4);
    assert.ok(size >= 8 && size <= 1048576);
    let offset = 8; const entries = [];
    for (let i = 0; i < count; i++) {
      const length = ffi.decodeUint16At(acl, offset + 2);
      assert.ok(length >= 16 && offset + length <= size);
      const count = ffi.decodeUint8At(acl, offset + 9);
      assert.ok(count <= 15 && 16 + 4 * count <= length);
      // SID 内嵌于 ACE，先按已校验长度复制，避免给 IsValidSid 错误的 ACL 指针。
      const sid = koffi.decode(acl, offset + 8, 'uint8', 8 + 4 * count);
      entries.push({ type: ffi.decodeUint8At(acl, offset), flags: ffi.decodeUint8At(acl, offset + 1),
        mask: ffi.decodeUint32At(acl, offset + 4), sid: sidString(Buffer.from(sid)) });
      offset += length;
    }
    return entries;
  };
  try { assert.notEqual(owner, null); return { path, owner: sidString(owner), dacl: readAcl(slots[2]), label: readAcl(slots[3]) }; }
  finally { if (descriptor !== null) api.localFree(descriptor); }
}

function checkRight(path, right, mask, directory) {
  const handle = api.createFileW(path, mask, 7, null, 3, directory ? 0x02000000 : 0, null);
  const granted = !ffi.isInvalidHandle(handle); const error = granted ? 0 : api.getLastError();
  if (granted) assert.notEqual(api.closeHandle(handle), 0);
  return { path, right, granted, error };
}

let created = false;
function createSecurityDirectory(path, childMask) {
  const slot = ffi.allocPtrSlot(); const size = ffi.allocUint32(); let descriptor;
  try {
    // 仅创建时指定：根目录本人可授权；子对象仅继承选定掩码。两组只差 WRITE_OWNER。
    // 原 grant 撤销会保留环境删除拒绝；修复对照从这一正常站立状态开始。
    const standingDeny = repairExisting ? '(D;CI;0x40;;;WD)' : '';
    const sddl = childMask === undefined ? `D:(A;OICI;FA;;;${userSid})`
      : `D:P${standingDeny}(A;;FA;;;${userSid})(A;OICIIO;0x${childMask.toString(16)};;;${userSid})`;
    assert.notEqual(convertDescriptor(sddl, 1, slot, size), 0,
      `ConvertStringSecurityDescriptor failed: ${api.getLastError()}`);
    descriptor = ffi.decodePtr(slot); assert.notEqual(descriptor, null);
    assert.notEqual(createDirectory(path, { nLength: 24, lpSecurityDescriptor: descriptor, bInheritHandle: 0 }), 0,
      `CreateDirectory failed: ${api.getLastError()}`);
  } finally { if (descriptor != null) api.localFree(descriptor); }
}
try {
  createSecurityDirectory(root, writeOwnerOnly || repairExisting ? abi.FILE_ALL_ACCESS & ~0x80000 : undefined);
  created = true;
  assert.equal(await realpath(root), root);
  for (const strategy of (writeOwnerOnly ? ['without-owner', 'with-owner'] : repairExisting ? ['original-repair', 'file-repair'] : ['combined', 'split'])) {
    const scope = resolve(root, strategy); const workspace = resolve(scope, 'workspace');
    const foreign = resolve(scope, 'foreign'); const nested = resolve(workspace, 'nested');
    await mkdir(scope);
    if (writeOwnerOnly || repairExisting) {
      const mask = strategy === 'with-owner' ? abi.FILE_ALL_ACCESS : abi.FILE_ALL_ACCESS & ~0x80000;
      createSecurityDirectory(workspace, mask); createSecurityDirectory(foreign, mask);
    } else { await mkdir(workspace); await mkdir(foreign); }
    await mkdir(nested);
    const files = [resolve(workspace, 'existing.txt'), resolve(nested, 'existing.txt'),
      resolve(foreign, 'existing.txt'), resolve(scope, 'outside.txt')];
    for (const file of files) await writeFile(file, 'BEFORE\n', { flag: 'wx' });
    const paths = [workspace, files[0], nested, files[1], foreign, files[2], files[3]];
    const item = { strategy, workspace, foreign, writeSid: library.workspaceWriteSid(workspace),
      before: paths.map(readSecurity), accessChecks: [], nativeCalls: [], results: [] };
    report.scenarios.push(item);
    assert.ok(item.before.every(snapshot => snapshot.owner === userSid));
    if (writeOwnerOnly || repairExisting) {
      // 仅测试根目录禁止重新继承，保证它的本人授权在原 grant 之后不会被父目录重算移除。
      for (const snapshot of item.before.filter(row => [workspace, foreign].includes(row.path))) {
        assert.ok(snapshot.dacl.some(ace => ace.sid === userSid && ace.mask === abi.FILE_ALL_ACCESS && ace.flags === 0));
      }
    }
    for (const path of paths) for (const [right, mask] of [['WRITE_DAC', 0x40000], ['WRITE_OWNER', 0x80000]]) {
      const check = checkRight(path, right, mask, [workspace, nested, foreign].includes(path));
      item.accessChecks.push(check);
      const expected = !(writeOwnerOnly || repairExisting) || right === 'WRITE_DAC' || path === workspace || path === foreign
        || (strategy === 'with-owner' && path !== files[3]);
      assert.equal(check.granted, expected);
    }
    const recoveryDirectory = resolve(runtime, 'acl-repair-recovery-' + randomUUID());
    if (repairExisting) {
      const { prepareLatestAclRepair, aclRepairSourcePath } = await import('../compatibility/latest-upstream/acl-repair.mjs');
      const candidate = await prepareLatestAclRepair(); report.repairCandidate = candidate;
      const repairScript = strategy === 'file-repair' ? candidate.path : resolve(state.sourceRoot, aclRepairSourcePath);
      if (strategy === 'file-repair') {
        const refusedDirectory = resolve(runtime, 'acl-repair-refused-' + randomUUID());
        let exitCode;
        try {
          execFileSync('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-File', candidate.path,
            '-Path', files[2], '-AllowRoot', workspace, '-Out', refusedDirectory],
          { cwd: runtime, windowsHide: true, stdio: 'pipe' });
        } catch (error) { exitCode = error.status; }
        assert.equal(exitCode, 2); // 原官方脚本的明确拒绝退出码。
        assert.deepEqual(paths.map(readSecurity), item.before);
        assert.equal(await readFile(files[2], 'utf8'), 'BEFORE\n');
        item.outsideRootRefused = true; item.refusedEvidenceDirectory = refusedDirectory;
      }
      // 两组都在文件已经存在且权限不足之后运行修复，不用新文件替代旧文件。
      for (const path of files.slice(0, 2)) {
        execFileSync('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-File', repairScript,
          '-Path', path, '-AllowRoot', workspace, '-Out', recoveryDirectory],
        { cwd: runtime, windowsHide: true, stdio: 'pipe' });
      }
      item.afterRepair = paths.map(readSecurity);
      if (strategy === 'file-repair') {
        const backups = (await readdir(recoveryDirectory)).filter(name => /^acl-backup-[a-f0-9]+\.json$/.test(name));
        execFileSync('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-File', candidate.path,
          '-Path', files[0], '-AllowRoot', workspace, '-Out', recoveryDirectory],
        { cwd: runtime, windowsHide: true, stdio: 'pipe' });
        assert.deepEqual(paths.map(readSecurity), item.afterRepair);
        assert.deepEqual((await readdir(recoveryDirectory)).filter(name => /^acl-backup-[a-f0-9]+\.json$/.test(name)), backups);
        item.repeatedRepairUnchanged = true;
      }
      item.repairedRights = files.slice(0, 2).map(path => checkRight(path, 'WRITE_OWNER', 0x80000, false));
      assert.equal(item.repairedRights.every(check => check.granted), strategy === 'file-repair');
      for (const path of files.slice(0, 2)) {
        assert.equal(await readFile(path, 'utf8'), 'BEFORE\n');
        const before = item.before.find(row => row.path === path), after = item.afterRepair.find(row => row.path === path);
        assert.equal(after.owner, before.owner); assert.deepEqual(after.label, before.label);
        if (strategy === 'file-repair') {
          const added = after.dacl.filter(ace => !before.dacl.some(old => JSON.stringify(old) === JSON.stringify(ace)));
          // .NET Allow规则会附带Synchronize；该位原已存在，实际新增权限仅WRITE_OWNER。
          assert.deepEqual(added, [{ type: 0, flags: 0, mask: 0x180000, sid: userSid }]);
          const oldMask = before.dacl.filter(ace => ace.type === 0 && ace.sid === userSid)
            .reduce((mask, ace) => mask | ace.mask, 0);
          assert.equal(oldMask & 0x100000, 0x100000);
          assert.equal(added[0].mask & ~oldMask, 0x80000);
        }
      }
    }
    const loggedApi = { ...api, setNamedSecurityInfoW(path, objectType, information, owner, group, dacl, sacl) {
      if (strategy === 'split' && information === 20) {
        const daclResult = api.setNamedSecurityInfoW(path, objectType, 4, owner, group, dacl, null);
        item.nativeCalls.push({ path, information: 4, result: daclResult });
        if (daclResult !== 0) return daclResult;
        const labelResult = api.setNamedSecurityInfoW(path, objectType, 16, owner, group, null, sacl);
        item.nativeCalls.push({ path, information: 16, result: labelResult }); return labelResult;
      }
      const result = api.setNamedSecurityInfoW(path, objectType, information, owner, group, dacl, sacl);
      item.nativeCalls.push({ path, information, result }); return result;
    } };
    const ownGrant = library.AclWriteGrant.create(item.writeSid, loggedApi);
    const foreignGrant = library.AclWriteGrant.create(library.workspaceWriteSid(foreign), loggedApi);
    try {
      ownGrant.add(workspace, false); foreignGrant.add(foreign, false);
      item.afterGrant = paths.map(readSecurity);
      const operations = [
        { name: 'existing', path: files[0], action: 'writeFile', expectedInWorkspace: true },
        { name: 'nested-existing', path: files[1], action: 'writeFile', expectedInWorkspace: true },
        { name: 'new', path: resolve(workspace, 'new.txt'), action: 'writeFile', expectedInWorkspace: true },
        { name: 'foreign-write', path: files[2], action: 'writeFile', expectedInWorkspace: false },
        { name: 'outside-write', path: files[3], action: 'writeFile', expectedInWorkspace: false },
        { name: 'foreign-delete', path: files[2], action: 'unlink', expectedInWorkspace: false },
        { name: 'outside-delete', path: files[3], action: 'unlink', expectedInWorkspace: false },
      ];
      for (const mode of ['read-only', 'workspace-write']) {
        const sandbox = new library.AclSandbox({ writableDirs: [workspace], mode, tempDir: null,
          ...(mode === 'workspace-write' ? { writeSid: item.writeSid } : {}), manageDacls: false });
        try {
          await sandbox.init();
          for (const op of operations) {
            const code = `import * as fs from 'node:fs/promises';try{await fs.${op.action}(${JSON.stringify(op.path)}${op.action === 'writeFile' ? ',' + JSON.stringify('AFTER\n') : ''});console.log('SUCCESS');}catch(error){console.error(error.code);process.exitCode=1;}`;
            const outcome = await sandbox.spawn({ command: process.execPath,
              args: ['--input-type=module', '-e', code], cwd: workspace }).wait();
            const result = { mode, name: op.name, exitCode: outcome.exitCode,
              stdout: outcome.stdout.toString(), stderr: outcome.stderr.toString() };
            item.results.push(result);
            if (mode === 'read-only' || !op.expectedInWorkspace) {
              assert.equal(result.exitCode, 1); assert.equal(result.stderr, 'EPERM\n');
            }
          }
        } finally { sandbox.dispose(); }
      }
      item.existingWritesPassed = item.results.filter(result => result.mode === 'workspace-write'
        && ['existing', 'nested-existing'].includes(result.name)).every(result => result.exitCode === 0);
      item.boundaryDenied = item.results.filter(result => result.mode === 'read-only'
        || result.name.startsWith('foreign-') || result.name.startsWith('outside-')).every(result => result.exitCode === 1);
      item.fileBytesAfterOperations = await Promise.all(files.map(async path => ({ path, text: await readFile(path, 'utf8') })));
      for (const file of files.slice(2)) assert.equal(await readFile(file, 'utf8'), 'BEFORE\n');
    } finally {
      const failures = [];
      for (const grant of [foreignGrant, ownGrant]) try { grant.dispose(); } catch (error) { failures.push(error); }
      if (failures.length) throw new AggregateError(failures, 'Original grant cleanup failed');
    }
    item.afterRevoke = paths.map(readSecurity);
    if (repairExisting) {
      const backups = (await readdir(recoveryDirectory)).filter(name => /^acl-backup-[a-f0-9]+\.json$/.test(name));
      const records = await Promise.all(backups.map(async name => ({ path: resolve(recoveryDirectory, name),
        saved: JSON.parse(await readFile(resolve(recoveryDirectory, name), 'utf8')) })));
      // 子对象先恢复；父目录继承重算结束后核对全部实际描述符。
      records.sort((a, b) => b.saved.Path.length - a.saved.Path.length);
      for (const record of records) {
        assert.ok([nested, ...files.slice(0, 2)].includes(record.saved.Path));
        execFileSync('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoProfile', '-File', record.path + '.ps1',
          '-Path', record.saved.Path, '-AllowRoot', workspace, '-Restore', record.path],
        { cwd: runtime, windowsHide: true, stdio: 'pipe' });
      }
      item.afterRepairRestore = paths.map(readSecurity);
      assert.deepEqual(item.afterRepairRestore, item.before); item.repairRestored = true;
    }
  }
  report.diagnosisVerified = true;
  report.existingWritesCompatibleInControlledCreation = report.scenarios.every(item => item.existingWritesPassed);
  if (writeOwnerOnly) {
    const [withoutOwner, withOwner] = report.scenarios;
    assert.equal(withoutOwner.existingWritesPassed, false);
    assert.equal(withOwner.existingWritesPassed, true);
    for (const item of report.scenarios) {
      for (const row of item.fileBytesAfterOperations.slice(0, 2)) {
        assert.equal(row.text, item.existingWritesPassed ? 'AFTER\n' : 'BEFORE\n');
      }
    }
    report.writeOwnerDifferenceVerified = true;
  } else if (!report.existingWritesCompatibleInControlledCreation) process.exitCode = 1;
  if (repairExisting) {
    assert.equal(report.scenarios[0].existingWritesPassed, false);
    assert.equal(report.scenarios[1].existingWritesPassed, true);
    assert.ok(report.scenarios.every(item => item.boundaryDenied && item.repairRestored));
    report.existingRepairVerified = true; process.exitCode = 0;
  }
} catch (error) {
  report.failure = { name: error.name, code: error.code, message: error.message };
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      assert.equal(await realpath(root), root);
      // 删除只枚举本探针排他创建的固定名字；不递归删除，不跟随链接。
      for (const strategy of (writeOwnerOnly ? ['without-owner', 'with-owner'] : repairExisting ? ['original-repair', 'file-repair'] : ['combined', 'split'])) {
        const scope = resolve(root, strategy);
        try { await access(scope); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        for (const [directory, allowed] of [[resolve(scope, 'workspace/nested'), ['existing.txt']],
          [resolve(scope, 'workspace'), ['existing.txt', 'new.txt', 'nested']],
          [resolve(scope, 'foreign'), ['existing.txt']], [scope, ['workspace', 'foreign', 'outside.txt']]]) {
          assert.equal(await realpath(directory), directory);
          const names = await readdir(directory); assert.ok(names.every(name => allowed.includes(name)));
          for (const name of names.filter(name => name.endsWith('.txt'))) {
            const file = resolve(directory, name);
            assert.ok(['BEFORE\n', 'AFTER\n'].includes(await readFile(file, 'utf8')));
            await unlink(file); report.cleanup.push(file);
          }
          await rmdir(directory); report.cleanup.push(directory);
        }
      }
      assert.deepEqual(await readdir(root), []); await rmdir(root);
      await assert.rejects(access(root), { code: 'ENOENT' }); report.createdObjectsRemoved = true;
    } catch (error) { report.cleanupFailure = { name: error.name, code: error.code, message: error.message }; process.exitCode = 1; }
  }
  await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ reportPath, root, diagnosisVerified: report.diagnosisVerified,
    existingWritesCompatibleInControlledCreation: report.existingWritesCompatibleInControlledCreation,
    existingRepairVerified: report.existingRepairVerified,
    writeOwnerDifferenceVerified: report.writeOwnerDifferenceVerified,
    createdObjectsRemoved: report.createdObjectsRemoved,
    scenarios: report.scenarios.map(item => ({ strategy: item.strategy,
      nativeCalls: item.nativeCalls, results: item.results, fileBytesAfterOperations: item.fileBytesAfterOperations,
      existingWritesPassed: item.existingWritesPassed, boundaryDenied: item.boundaryDenied })),
    failure: report.failure, cleanupFailure: report.cleanupFailure }));
}
setTimeout(() => process.exit(process.exitCode ?? 0), 200);
