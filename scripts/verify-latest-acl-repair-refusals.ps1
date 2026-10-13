param([Parameter(Mandatory = $true)][string]$Candidate, [ValidatePattern('^[a-z0-9-]{1,40}$')][string]$Attempt = 'delete-owned-fixture')
$ErrorActionPreference = 'Stop'
$runtime = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../artifacts/latest-runtime-check'))
if ([System.IO.Path]::GetFullPath($Candidate) -ne (Join-Path $runtime 'acl-repair-candidate/diagnose-windows-sandbox-acl.ps1')) { throw 'unexpected_candidate_path' }
if ((Get-FileHash -LiteralPath $Candidate -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'e6389ffbdcbc6e3a50206c198ab8a348c9957681de231d1fb920aa50d6239ce0') { throw 'candidate_changed' }
$root = Join-Path $runtime ('acl-repair-refusals-' + [guid]::NewGuid().ToString())
$reportPath = Join-Path $runtime ('latest-acl-repair-native-refusals-' + $Attempt + '.json')
if (Test-Path -LiteralPath $reportPath) { throw 'report_already_exists' }
$report = @{ at = [DateTime]::UtcNow.ToString('o'); root = $root; passed = $false; cases = @() }
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$file = Join-Path $root 'existing.txt'
$allowed = Join-Path $root 'allowed'
$target = Join-Path $root 'target'
$targetFile = Join-Path $target 'existing.txt'
$link = Join-Path $allowed 'link'
# 与官方同样的OPEN_EXISTING权限检查。测试文件排他创建，结束后使用未改变的DELETE权移除。
Add-Type -Namespace DshmTest -Name RecoveryHandle -MemberDefinition @'
[DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
private static extern Microsoft.Win32.SafeHandles.SafeFileHandle CreateFileW(
  string path, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
public static bool CanWriteDacl(string path) {
  using (var handle = CreateFileW(path, 0x40000u, 7u, IntPtr.Zero, 3u, 0x02200000u, IntPtr.Zero)) {
    if (!handle.IsInvalid) return true;
    int code = Marshal.GetLastWin32Error();
    if (code != 5) throw new System.ComponentModel.Win32Exception(code);
    return false;
  }
}
'@
function Read-Security([string]$Path) {
  (Get-Acl -LiteralPath $Path).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
}
function Invoke-Refusal([string]$Name, [string]$Path, [string]$AllowRoot, [string]$Reason) {
  $directory = Join-Path $runtime ('acl-refusal-' + $Name + '-' + [guid]::NewGuid().ToString())
  & 'C:/Program Files/PowerShell/7/pwsh.exe' -NoProfile -File $Candidate -Path $Path -AllowRoot $AllowRoot -Out $directory *> ($directory + '-output.txt')
  # 重定向文件属于runtime；Out目录由原诊断脚本独立创建。
  $exit = $LASTEXITCODE
  if ($exit -ne 2) { throw "unexpected_refusal_exit_$Name" }
  $logs = @(Get-ChildItem -LiteralPath $directory -Filter 'acl-report-*.jsonl')
  if ($logs.Count -ne 1) { throw "report_missing_$Name" }
  $events = @(Get-Content -LiteralPath $logs[0].FullName | ForEach-Object { $_ | ConvertFrom-Json })
  if (@($events | Where-Object { $_.kind -eq 'decision' -and $_.status -eq 'refused' -and $_.reason -match $Reason }).Count -ne 1) { throw "actual_refusal_reason_missing_$Name" }
  if (@($events | Where-Object { $_.operation -in @('backup', 'grant_dacl', 'move_package_aces', 'restore_dacl') }).Count -ne 0) { throw "acl_mutation_attempted_$Name" }
  @{ name = $Name; exitCode = $exit; actualRefusal = $true; permissionMutationAttempts = 0; directory = $directory }
}
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
  $original = Read-Security $file
  $denied = Get-Acl -LiteralPath $file
  # OWNER RIGHTS取消隐含WRITE_DAC；当前用户规则同时拒绝继承来的该权限。
  foreach ($identity in @($sid, [System.Security.Principal.SecurityIdentifier]::new('S-1-3-4'))) {
    $denied.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($identity,
      [System.Security.AccessControl.FileSystemRights]::ChangePermissions,
      [System.Security.AccessControl.AccessControlType]::Deny))
  }
  Set-Acl -LiteralPath $file -AclObject $denied
  if ([DshmTest.RecoveryHandle]::CanWriteDacl($file)) { throw 'fixture_effective_write_dac_not_denied' }
  $before = Read-Security $file; $beforeRoot = Read-Security $root
  $report.cases += Invoke-Refusal 'missing-write-dac' $file $root 'lacks effective WRITE_DAC'
  if ((Read-Security $file) -ne $before -or (Read-Security $root) -ne $beforeRoot) { throw 'missing_dac_permissions_changed' }
  if ([System.IO.File]::ReadAllText($file) -ne "BEFORE`n") { throw 'missing_dac_bytes_changed' }
  Remove-Item -LiteralPath $file
  $report.missingWriteDacDeniedAndOwnedFixtureRemoved = $true
  New-Item -ItemType Directory -Path $allowed | Out-Null
  New-Item -ItemType Directory -Path $target | Out-Null
  [System.IO.File]::WriteAllText($targetFile, "BEFORE`n")
  New-Item -ItemType Junction -Path $link -Target $target | Out-Null
  $security = @($root, $allowed, $target, $targetFile) | ForEach-Object { Read-Security $_ }
  $report.cases += Invoke-Refusal 'junction-component' (Join-Path $link 'existing.txt') $allowed 'reparse point'
  $report.cases += Invoke-Refusal 'junction-allow-root' (Join-Path $link 'existing.txt') $link 'reparse point'
  $after = @($root, $allowed, $target, $targetFile) | ForEach-Object { Read-Security $_ }
  if (($security -join "`n") -ne ($after -join "`n")) { throw 'junction_permissions_changed' }
  if ([System.IO.File]::ReadAllText($targetFile) -ne "BEFORE`n") { throw 'junction_target_bytes_changed' }
  $report.junctionTargetsUnchanged = $true
  $report.passed = $true
} catch { $report.failure = $_.Exception.Message }
finally {
  try {
    if (Test-Path -LiteralPath $link) {
      if (-not ((Get-Item -LiteralPath $link -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { throw 'cleanup_link_type_changed' }
      [System.IO.Directory]::Delete($link, $false)
    }
    foreach ($path in @($file, $targetFile)) {
      if (Test-Path -LiteralPath $path) {
        if ([System.IO.File]::ReadAllText($path) -ne "BEFORE`n") { throw 'cleanup_unknown_file_content' }
        Remove-Item -LiteralPath $path
      }
    }
    foreach ($directory in @($allowed, $target, $root)) {
      if (Test-Path -LiteralPath $directory) {
        if (@(Get-ChildItem -LiteralPath $directory -Force).Count -ne 0) { throw 'cleanup_unknown_directory_entries' }
        [System.IO.Directory]::Delete($directory, $false)
      }
    }
    $report.createdObjectsRemoved = -not (Test-Path -LiteralPath $root)
  } catch { $report.cleanupFailure = $_.Exception.Message; $report.passed = $false }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
  $report | ConvertTo-Json -Depth 8 -Compress
}
if (-not $report.passed) { exit 1 }
