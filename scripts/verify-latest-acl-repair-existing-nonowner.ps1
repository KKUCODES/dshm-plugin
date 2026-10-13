param([Parameter(Mandatory = $true)][string]$Candidate)
$ErrorActionPreference = 'Stop'
$runtime = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../artifacts/latest-runtime-check'))
if ([System.IO.Path]::GetFullPath($Candidate) -ne (Join-Path $runtime 'acl-repair-candidate/diagnose-windows-sandbox-acl.ps1')) { throw 'unexpected_candidate_path' }
if ((Get-FileHash -LiteralPath $Candidate -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'e6389ffbdcbc6e3a50206c198ab8a348c9957681de231d1fb920aa50d6239ce0') { throw 'candidate_changed' }
# 已核对的公开安装许可证，不能接受任意用户路径；不读取或输出正文。
$file = 'F:\Program Files\Netease\MuMu Player 12\nx_main\licenses.txt'
$paths = @($file)
$parent = [System.IO.Path]::GetDirectoryName($file)
while ($parent) {
  $paths += $parent
  $parent = [System.IO.Path]::GetDirectoryName($parent)
}
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$reportPath = Join-Path $runtime 'latest-acl-repair-existing-nonowner.json'
if (Test-Path -LiteralPath $reportPath) { throw 'report_already_exists' }
$report = @{ at = [DateTime]::UtcNow.ToString('o'); passed = $false; file = $file }
function Read-Security([string]$Path) {
  (Get-Acl -LiteralPath $Path).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All)
}
try {
  $acl = Get-Acl -LiteralPath $file
  $owner = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
  if ($owner -eq $sid -or $owner -ne 'S-1-5-32-544') { throw 'existing_nonowner_changed' }
  # 原脚本先核对包规则；只有整条实际路径均不存在这类规则才运行此只读负例。
  foreach ($path in $paths) {
    if ((Get-Item -LiteralPath $path -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'existing_path_reparse_changed' }
    if (@((Get-Acl -LiteralPath $path).GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | Where-Object {
      $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Value -match '^S-1-15-3-'
    }).Count -ne 0) { throw 'existing_path_package_ace_changed' }
  }
  $before = @($paths | ForEach-Object { Read-Security $_ })
  $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
  $directory = Join-Path $runtime ('acl-existing-nonowner-refusal-' + [guid]::NewGuid().ToString())
  & 'C:/Program Files/PowerShell/7/pwsh.exe' -NoProfile -File $Candidate -Path $file -AllowRoot ([System.IO.Path]::GetDirectoryName($file)) -Out $directory *> ($directory + '-output.txt')
  $report.exitCode = $LASTEXITCODE
  if ($LASTEXITCODE -ne 2) { throw 'existing_nonowner_not_refused' }
  $logs = @(Get-ChildItem -LiteralPath $directory -Filter 'acl-report-*.jsonl')
  if ($logs.Count -ne 1) { throw 'report_missing' }
  $events = @(Get-Content -LiteralPath $logs[0].FullName | ForEach-Object { $_ | ConvertFrom-Json })
  $facts = @($events | Where-Object { $_.kind -eq 'observation' -and $_.operation -eq 'inspect_acl' -and $_.path -eq $file })
  if ($facts.Count -ne 1 -or $facts[0].details.owner -ne $owner -or $facts[0].details.writeDac -ne $true) { throw 'independent_owner_guard_not_proven' }
  if (@($events | Where-Object { $_.kind -eq 'decision' -and $_.status -eq 'refused' -and $_.reason -match 'not owned by the caller' }).Count -ne 1) { throw 'actual_nonowner_refusal_missing' }
  if (@($events | Where-Object { $_.operation -in @('backup', 'grant_dacl', 'move_package_aces', 'restore_dacl') }).Count -ne 0) { throw 'unexpected_permission_mutation_attempt' }
  $after = @($paths | ForEach-Object { Read-Security $_ })
  if (($before -join "`n") -ne ($after -join "`n") -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $hash) { throw 'existing_file_or_ancestor_changed' }
  $report.independentNonownerRefusedWithWriteDac = $true
  $report.existingFileAndAncestorsUnchanged = $true
  $report.permissionMutationAttempts = 0
  $report.directory = $directory
  $report.passed = $true
} catch { $report.failure = $_.Exception.Message }
finally {
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
  $report | ConvertTo-Json -Depth 8 -Compress
}
if (-not $report.passed) { exit 1 }
