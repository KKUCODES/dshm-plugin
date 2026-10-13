param([Parameter(Mandatory = $true)][string]$Candidate, [ValidatePattern('^[a-z0-9-]{1,40}$')][string]$Attempt = 'original-refusal-code')
$ErrorActionPreference = 'Stop'
$runtime = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../artifacts/latest-runtime-check'))
$expected = Join-Path $runtime 'acl-repair-candidate/diagnose-windows-sandbox-acl.ps1'
if ([System.IO.Path]::GetFullPath($Candidate) -ne [System.IO.Path]::GetFullPath($expected)) { throw 'unexpected_candidate_path' }
if ((Get-FileHash -LiteralPath $Candidate -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'e6389ffbdcbc6e3a50206c198ab8a348c9957681de231d1fb920aa50d6239ce0') { throw 'candidate_changed' }
$root = Join-Path $runtime ('acl-repair-deny-' + [guid]::NewGuid().ToString())
$reportPath = Join-Path $runtime ('latest-acl-repair-explicit-deny-' + $Attempt + '.json')
if (Test-Path -LiteralPath $reportPath) { throw 'report_already_exists' }
$file = Join-Path $root 'existing.txt'
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$report = @{ at = [DateTime]::UtcNow.ToString('o'); passed = $false; root = $root }
try {
  New-Item -ItemType Directory -Path $root | Out-Null
  $rootAcl = Get-Acl -LiteralPath $root
  $rootAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.InheritanceFlags]::None,
    [System.Security.AccessControl.PropagationFlags]::None,
    [System.Security.AccessControl.AccessControlType]::Allow))
  Set-Acl -LiteralPath $root -AclObject $rootAcl
  [System.IO.File]::WriteAllText($file, "BEFORE`n")
  $original = Get-Acl -LiteralPath $file
  $denied = Get-Acl -LiteralPath $file
  $denied.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,
    [System.Security.AccessControl.FileSystemRights]::TakeOwnership,
    [System.Security.AccessControl.AccessControlType]::Deny))
  Set-Acl -LiteralPath $file -AclObject $denied
  $before = Get-Acl -LiteralPath $file
  $beforeSddl = $before.GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
  $beforeRoot = (Get-Acl -LiteralPath $root).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
  $recovery = Join-Path $runtime ('acl-repair-deny-recovery-' + [guid]::NewGuid().ToString())
  & 'C:/Program Files/PowerShell/7/pwsh.exe' -NoProfile -File $Candidate -Path $file -AllowRoot $root -Out $recovery *> (Join-Path $runtime ('latest-acl-repair-explicit-deny-' + $Attempt + '-output.txt'))
  $report.exitCode = $LASTEXITCODE
  if ($LASTEXITCODE -ne 2) { throw 'expected_verification_refusal_and_rollback' }
  $after = Get-Acl -LiteralPath $file
  if ($after.GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All) -ne $beforeSddl) { throw 'explicit_deny_or_other_permissions_changed' }
  if ((Get-Acl -LiteralPath $root).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All) -ne $beforeRoot) { throw 'root_permissions_changed' }
  if ([System.IO.File]::ReadAllText($file) -ne "BEFORE`n") { throw 'file_bytes_changed' }
  $logs = @(Get-ChildItem -LiteralPath $recovery -Filter 'acl-report-*.jsonl')
  if ($logs.Count -ne 1) { throw 'repair_report_missing' }
  $events = @(Get-Content -LiteralPath $logs[0].FullName | ForEach-Object { $_ | ConvertFrom-Json })
  $verifications = @($events | Where-Object { $_.kind -eq 'verification' -and $_.operation -eq 'grant' })
  if ($verifications.Count -ne 1 -or $verifications[0].status -ne 'failed') { throw 'real_grant_failure_missing' }
  $restored = @($events | Where-Object { $_.kind -eq 'verification' -and $_.operation -eq 'restore' })
  if ($restored.Count -ne 1 -or $restored[0].status -ne 'verified') { throw 'original_rollback_not_verified' }
  $report.explicitDenyPreserved = $true
  $report.actualFailedGrantRolledBack = $true
  $report.fileUnchanged = $true
  $report.recovery = $recovery
  $report.passed = $true
} catch { $report.failure = $_.Exception.Message }
finally {
  # 排他创建的固定文件；恢复测试ACL后逐项移除，不递归删除任何目录。
  try {
    if (Test-Path -LiteralPath $file) {
      if ($null -ne $original) { Set-Acl -LiteralPath $file -AclObject $original }
      if ([System.IO.File]::ReadAllText($file) -ne "BEFORE`n") { throw 'cleanup_unknown_file_content' }
      Remove-Item -LiteralPath $file
    }
    if (Test-Path -LiteralPath $root) {
      if (@(Get-ChildItem -LiteralPath $root -Force).Count -ne 0) { throw 'cleanup_unknown_entries' }
      Remove-Item -LiteralPath $root
    }
    $report.createdObjectsRemoved = -not (Test-Path -LiteralPath $root)
  } catch { $report.cleanupFailure = $_.Exception.Message; $report.passed = $false }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
  $report | ConvertTo-Json -Depth 8 -Compress
}
if (-not $report.passed) { exit 1 }
