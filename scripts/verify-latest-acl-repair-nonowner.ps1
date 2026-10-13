param([Parameter(Mandatory = $true)][string]$Candidate)
$ErrorActionPreference = 'Stop'
$runtime = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../artifacts/latest-runtime-check'))
if ([System.IO.Path]::GetFullPath($Candidate) -ne (Join-Path $runtime 'acl-repair-candidate/diagnose-windows-sandbox-acl.ps1')) { throw 'unexpected_candidate_path' }
if ((Get-FileHash -LiteralPath $Candidate -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'e6389ffbdcbc6e3a50206c198ab8a348c9957681de231d1fb920aa50d6239ce0') { throw 'candidate_changed' }
$root = Join-Path $runtime ('acl-repair-nonowner-' + [guid]::NewGuid().ToString())
$file = Join-Path $root 'existing.txt'
$reportPath = Join-Path $runtime 'latest-acl-repair-native-nonowner.json'
if (Test-Path -LiteralPath $reportPath) { throw 'report_already_exists' }
$report = @{ at = [DateTime]::UtcNow.ToString('o'); root = $root; passed = $false }
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
function Read-Security([string]$Path) {
  (Get-Acl -LiteralPath $Path).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
}
try {
  New-Item -ItemType Directory -Path $root | Out-Null
  [System.IO.File]::WriteAllText($file, "BEFORE`n")
  $original = Get-Acl -LiteralPath $file
  $acl = Get-Acl -LiteralPath $file
  $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.AccessControlType]::Allow))
  Set-Acl -LiteralPath $file -AclObject $acl
  # 仅尝试把排他测试文件交给令牌中的Administrators组，不启用特权或提权。
  # 是否允许由真实Windows决定；失败必须记录为未覆盖，不能伪造非本人所有状态。
  $otherOwner = [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
  $owned = Get-Acl -LiteralPath $file
  $owned.SetOwner($otherOwner)
  Set-Acl -LiteralPath $file -AclObject $owned
  if ((Get-Acl -LiteralPath $file).GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $otherOwner.Value) { throw 'nonowner_fixture_not_created' }
  $before = Read-Security $file; $beforeRoot = Read-Security $root
  $directory = Join-Path $runtime ('acl-nonowner-refusal-' + [guid]::NewGuid().ToString())
  & 'C:/Program Files/PowerShell/7/pwsh.exe' -NoProfile -File $Candidate -Path $file -AllowRoot $root -Out $directory *> ($directory + '-output.txt')
  $report.exitCode = $LASTEXITCODE
  if ($LASTEXITCODE -ne 2) { throw 'nonowner_not_refused' }
  $logs = @(Get-ChildItem -LiteralPath $directory -Filter 'acl-report-*.jsonl')
  if ($logs.Count -ne 1) { throw 'report_missing' }
  $events = @(Get-Content -LiteralPath $logs[0].FullName | ForEach-Object { $_ | ConvertFrom-Json })
  $facts = @($events | Where-Object { $_.kind -eq 'observation' -and $_.operation -eq 'inspect_acl' -and $_.path -eq $file })
  if ($facts.Count -ne 1 -or $facts[0].details.owner -ne $otherOwner.Value -or $facts[0].details.writeDac -ne $true) { throw 'independent_owner_guard_not_proven' }
  if (@($events | Where-Object { $_.kind -eq 'decision' -and $_.status -eq 'refused' -and $_.reason -match 'not owned by the caller' }).Count -ne 1) { throw 'actual_nonowner_refusal_missing' }
  if (@($events | Where-Object { $_.operation -in @('backup', 'grant_dacl', 'move_package_aces', 'restore_dacl') }).Count -ne 0) { throw 'acl_mutation_attempted' }
  if ((Read-Security $file) -ne $before -or (Read-Security $root) -ne $beforeRoot) { throw 'nonowner_permissions_changed' }
  if ([System.IO.File]::ReadAllText($file) -ne "BEFORE`n") { throw 'nonowner_bytes_changed' }
  $report.independentNonownerRefusedWithWriteDac = $true
  $report.permissionMutationAttempts = 0
  $report.directory = $directory
  $report.passed = $true
} catch { $report.failure = $_.Exception.Message }
finally {
  try {
    if (Test-Path -LiteralPath $file) {
      $restoredOwner = Get-Acl -LiteralPath $file
      $restoredOwner.SetOwner($sid)
      Set-Acl -LiteralPath $file -AclObject $restoredOwner
      if ($null -ne $original) { Set-Acl -LiteralPath $file -AclObject $original }
      if ([System.IO.File]::ReadAllText($file) -ne "BEFORE`n") { throw 'cleanup_unknown_file_content' }
      if ((Get-Acl -LiteralPath $file).GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'cleanup_owner_not_restored' }
      Remove-Item -LiteralPath $file
    }
    if (Test-Path -LiteralPath $root) {
      if (@(Get-ChildItem -LiteralPath $root -Force).Count -ne 0) { throw 'cleanup_unknown_entries' }
      [System.IO.Directory]::Delete($root, $false)
    }
    $report.createdObjectsRemoved = -not (Test-Path -LiteralPath $root)
  } catch { $report.cleanupFailure = $_.Exception.Message; $report.passed = $false }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
  $report | ConvertTo-Json -Depth 8 -Compress
}
if (-not $report.passed) { exit 1 }
