// 显式运行的权限修复候选；不改原沙箱、模型能力或上游检出。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { existingInside } from '../background-output/install-runtime.mjs';
import { sourceRoot } from './source-runtime.mjs';

export const aclRepairSourcePath = 'packages/sandbox/sandbox-windows-acl/assets/diagnose-windows-sandbox-acl/scripts/diagnose-windows-sandbox-acl.ps1';
export const aclRepairSourceHash = 'adba89f3b10692302723d231d003cdf365311effaff996d32416f9531e3b63d9';
const digest = text => createHash('sha256').update(text).digest('hex');
const packageName = '@deepseek-ai/dsh-sandbox-windows-acl';
export const aclRepairVersion = '0.2.1-alpha.1';
const assetPath = 'assets/diagnose-windows-sandbox-acl/scripts/diagnose-windows-sandbox-acl.ps1';
const pluginRoot = resolve(import.meta.dirname, '../..');
const artifactRoot = resolve(pluginRoot, 'artifacts');

// 输出只属于本项目；逐级检查既有目录，不能经 junction 创建或复用脚本。
async function checkOutputDirectory(directory) {
  const local = relative(artifactRoot, directory);
  assert.ok(local && !local.startsWith('..') && !isAbsolute(local), 'latest_acl_repair_output_outside_artifacts');
  assert.equal(await realpath(pluginRoot), pluginRoot, 'latest_acl_repair_linked_project');
  try { await mkdir(artifactRoot); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const rootInfo = await lstat(artifactRoot);
  assert.ok(rootInfo.isDirectory() && !rootInfo.isSymbolicLink(), 'latest_acl_repair_linked_artifacts');
  assert.equal(await realpath(artifactRoot), artifactRoot, 'latest_acl_repair_linked_artifacts');
  let path = artifactRoot;
  for (const part of local.split(/[\\/]/)) {
    path = resolve(path, part);
    try {
      const info = await lstat(path);
      assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'latest_acl_repair_linked_output');
      assert.equal(await realpath(path), path, 'latest_acl_repair_linked_output');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

export function transformLatestAclRepair(source) {
  assert.equal(digest(source), aclRepairSourceHash, 'latest_acl_repair_unknown_source');
  let value = source.replaceAll('\r\n', '\n');
  const replace = (before, after) => {
    assert.equal(value.split(before).length - 1, 1, 'latest_acl_repair_anchor_changed');
    value = value.replace(before, after);
  };
  replace('    The script never creates, deletes, or writes the contents of any file.',
    '    Explicitly requested files owned by the caller may receive only TakeOwnership\n'
    + '    when effective WRITE_DAC exists and WRITE_OWNER is missing. The original\n'
    + '    boundary checks, backups, verification and rollback still apply.\n\n'
    + '    The script never creates, deletes, or writes the contents of any file.');
  replace('    $grantTargets = @($inspectOrder | Where-Object {',
    `    # A requested file is not a directory grant: repair only its missing label\n`
    + `    # provisioning right, and only for its current owner with WRITE_DAC.\n`
    + `    if ([System.IO.File]::Exists($full)) {\n`
    + `      $fileRefusal = Get-RepairRefusal -FullPath $full -Root $AllowRoot -AllowEqual\n`
    + `      if (-not $targetFacts.OwnerIsMe) { $fileRefusal = 'The requested file is not owned by the caller.' }\n`
    + `      if (-not $targetFacts.HasWriteDac) { $fileRefusal = 'The caller lacks effective WRITE_DAC for the requested file.' }\n`
    + `      if ($fileRefusal) {\n`
    + `        Write-Decision $mode $full refused $fileRefusal\n`
    + `        $refused++\n`
    + `        break paths\n`
    + `      }\n`
    + `    }\n`
    + `    $grantTargets = @($inspectOrder | Where-Object {`);
  replace('      [System.IO.Directory]::Exists($_) -and $factsByPath[$_].Readable -and $factsByPath[$_].Errors.Count -eq 0 -and',
    '      ([System.IO.Directory]::Exists($_) -or ($_ -ieq $full -and [System.IO.File]::Exists($_))) -and\n'
    + '      $factsByPath[$_].Readable -and $factsByPath[$_].Errors.Count -eq 0 -and');
  replace("'These directories lack effective WRITE_DAC or WRITE_OWNER; each is backed up, then receives a FullControl allow ACE for the current user.'",
    "'Back up missing provisioning rights: directories keep the original FullControl repair; an explicitly requested owned file receives TakeOwnership only.'");
  replace('      $grantAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new(',
    '      $grantRights = if ([System.IO.File]::Exists($object)) {\n'
    + '        [System.Security.AccessControl.FileSystemRights]::TakeOwnership\n'
    + '      } else { [System.Security.AccessControl.FileSystemRights]::FullControl }\n'
    + '      $grantAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new(');
  replace('        [System.Security.AccessControl.FileSystemRights]::FullControl,', '        $grantRights,');
  replace('"WRITE_DAC or WRITE_OWNER is missing; add a FullControl allow ACE for $meSid while preserving deny ACEs, owner and SACL."',
    '"A provisioning right is missing; add $grantRights for $meSid while preserving deny ACEs, owner and SACL."');
  return value;
}

export async function prepareLatestAclRepair({
  packageRoot = resolve(sourceRoot, 'packages/sandbox/sandbox-windows-acl'),
  outputDirectory = resolve(artifactRoot, 'latest-runtime-check/acl-repair-candidate'),
} = {}) {
  // 在创建任何输出前核对实际包与原资产；拒绝同名未知版本或定制脚本。
  const actualPackage = await realpath(resolve(packageRoot));
  const metadataPath = await existingInside(actualPackage, 'package.json');
  assert.ok((await lstat(metadataPath)).isFile(), 'latest_acl_repair_invalid_metadata');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  assert.equal(metadata.name, packageName, 'latest_acl_repair_unknown_package');
  assert.equal(metadata.version, aclRepairVersion, 'latest_acl_repair_unknown_version');
  const sourcePath = await existingInside(actualPackage, assetPath);
  assert.ok((await lstat(sourcePath)).isFile(), 'latest_acl_repair_invalid_asset');
  const source = await readFile(sourcePath, 'utf8');
  const transformed = transformLatestAclRepair(source);
  const directory = resolve(outputDirectory);
  for (const protectedRoot of [actualPackage, sourceRoot]) {
    const local = relative(protectedRoot, directory);
    assert.ok(isAbsolute(local) || local.split(/[\\/]/)[0] === '..', 'latest_acl_repair_output_in_source');
  }
  await checkOutputDirectory(directory);
  await mkdir(directory, { recursive: true });
  await checkOutputDirectory(directory);
  const path = resolve(directory, 'diagnose-windows-sandbox-acl.ps1');
  try {
    const info = await lstat(path);
    assert.ok(info.isFile() && !info.isSymbolicLink(), 'latest_acl_repair_linked_script');
    assert.equal(await realpath(path), path, 'latest_acl_repair_linked_script');
    assert.equal(await readFile(path, 'utf8'), transformed, 'latest_acl_repair_candidate_changed');
  }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(path, transformed, { flag: 'wx' });
  }
  return { path, version: aclRepairVersion, sourceHash: aclRepairSourceHash, candidateHash: digest(transformed) };
}
