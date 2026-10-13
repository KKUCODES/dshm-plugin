# 仅压缩本项目已核对归属的SDK归档；逐文件核对字节，不删除旧证据。
param([ValidateSet(1, 2)][int]$Attempt = 1, [ValidateSet(2, 3, 4, 7, 8, 9, 10)][int]$ArchiveAttempt = 2)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'sdk-archive-file-digest.ps1')
$dshmProject = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$dshmRuntime = (Resolve-Path -LiteralPath (Join-Path $dshmProject 'artifacts/latest-runtime-check')).Path
$dshmFailureKind = if ($ArchiveAttempt -eq 7) { '-native' } elseif ($ArchiveAttempt -eq 8) { '-runner' } elseif ($ArchiveAttempt -eq 9) { '-profile' } else { '' }
$dshmArchiveName = if ($ArchiveAttempt -eq 10) { 'sdk-sea-attempt-10-completed-products' } else { "sdk-sea-attempt-$ArchiveAttempt$dshmFailureKind-failed-products" }
$dshmArchive = (Resolve-Path -LiteralPath (Join-Path $dshmRuntime $dshmArchiveName)).Path
$dshmEvidenceBase = "latest-sdk-sea-attempt-$ArchiveAttempt-compression" + $(if ($Attempt -gt 1) { "-attempt-$Attempt" } else { '' })
$dshmReport = Join-Path $dshmRuntime "$dshmEvidenceBase.json"
$dshmLog = Join-Path $dshmRuntime "$dshmEvidenceBase.log"
if ((Test-Path -LiteralPath $dshmReport) -or (Test-Path -LiteralPath $dshmLog)) { throw 'Compression evidence already exists' }
if (-not $dshmArchive.StartsWith($dshmProject + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive escapes project' }
$dshmParent = $dshmArchive
while ($dshmParent.Length -ge $dshmProject.Length) {
    if ((Get-Item -LiteralPath $dshmParent).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Archive has reparse parent' }
    if ($dshmParent -eq $dshmProject) { break }
    $dshmParent = Split-Path -Parent $dshmParent
}
$dshmArchiveRecord = if ($ArchiveAttempt -eq 10) { 'latest-sdk-sea-attempt-10-completed-products-archive.json' } elseif ($ArchiveAttempt -ge 7) { "latest-sdk-sea-attempt-$ArchiveAttempt$dshmFailureKind-products-archive.json" } else { "latest-sdk-sea-attempt-$ArchiveAttempt-failed-products-archive.json" }
$dshmPrevious = Get-Content -LiteralPath (Join-Path $dshmRuntime $dshmArchiveRecord) -Raw | ConvertFrom-Json
if ($dshmPrevious.archived -ne $true -or $dshmPrevious.sourceCommit -ne '5badb15009ae1756c3afe0ae0cef1faafc290ccc') { throw 'Unexpected archive ownership' }
if ($ArchiveAttempt -ge 7 -and ($dshmPrevious.completeOfficialBuildPassed -ne $true -or $dshmPrevious.pythonResourceCheckPassed -ne $true)) { throw 'Complete SDK archive evidence missing' }
if ($ArchiveAttempt -eq 8 -and ($dshmPrevious.sdkChatAccepted -ne $true -or $dshmPrevious.sdkToolExecutionPassed -ne $false)) { throw 'Unexpected SDK8 runner failure evidence' }
if ($ArchiveAttempt -eq 9 -and ($dshmPrevious.modelWritePassed -ne $false -or $dshmPrevious.productSha256 -ne '989222642e2e05a287e15fbe52a232a5b2ae810b2b82785858d88a6c80992803')) { throw 'Unexpected SDK9 profile failure evidence' }
if ($ArchiveAttempt -eq 10 -and ($dshmPrevious.successfulRuns.Count -lt 1 -or $dshmPrevious.oldReportsRetained -ne $true -or $dshmPrevious.productSha256 -ne '287ffb6eff947ebaf44add0076355ae5c4bec1b504c66dd3986e11b2a7d84ff8')) { throw 'Unexpected SDK10 completed archive evidence' }
if ((Get-FileHash -LiteralPath (Join-Path $dshmArchive 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dshmPrevious.productSha256) { throw 'Archived executable changed' }
$dshmDriveName = [IO.Path]::GetPathRoot($dshmArchive).TrimEnd('\', ':')
if ((Get-Volume -DriveLetter $dshmDriveName).FileSystem -ne 'NTFS') { throw 'NTFS compression is unavailable' }
function Read-DshmArchiveManifest([string]$Stage) {
    $dshmRows = [Collections.Generic.List[string]]::new()
    foreach ($dshmItem in (Get-ChildItem -LiteralPath $dshmArchive -Recurse -Force)) {
        if ($dshmItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Archive contains reparse point' }
        if (-not $dshmItem.PSIsContainer) {
            $dshmRelative = $dshmItem.FullName.Substring($dshmArchive.Length + 1)
            $dshmDigest = Get-DshmArchiveFileDigest $dshmItem
            $dshmRows.Add("$dshmRelative`t$($dshmDigest.length)`t$($dshmDigest.sha256)")
        }
    }
    # 文件名使用Ordinal顺序；同时保留逐文件依据，聚合差异不能自动视为字节损坏。
    $dshmCanonical = $dshmRows.ToArray()
    [Array]::Sort($dshmCanonical, [StringComparer]::Ordinal)
    $dshmManifest = [Text.Encoding]::UTF8.GetBytes(($dshmCanonical -join "`n"))
    $dshmManifestFile = Join-Path $dshmRuntime "$dshmEvidenceBase-$Stage.sha256"
    if (Test-Path -LiteralPath $dshmManifestFile) { throw 'Manifest evidence already exists' }
    [IO.File]::WriteAllBytes($dshmManifestFile, $dshmManifest)
    [pscustomobject]@{files=$dshmRows.Count;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($dshmManifest)).ToLowerInvariant()}
}
$dshmBefore = Read-DshmArchiveManifest 'before'
$dshmFreeBefore = (Get-PSDrive -Name $dshmDriveName).Free
[pscustomobject]@{stage='compress-owned-sdk-archive';files=$dshmBefore.files;freeBytesBefore=$dshmFreeBefore} | ConvertTo-Json -Compress
$dshmCompactOutput = & compact.exe /C "/S:$dshmArchive" /A /Q
$dshmCode = $LASTEXITCODE
[IO.File]::WriteAllText($dshmLog, ($dshmCompactOutput -join "`n"))
$dshmAfter = Read-DshmArchiveManifest 'after'
$dshmSame = $dshmBefore.files -eq $dshmAfter.files -and $dshmBefore.sha256 -eq $dshmAfter.sha256
$dshmEvidence = [ordered]@{at=[DateTime]::UtcNow.ToString('o');passed=($dshmCode -eq 0 -and $dshmSame);archive=$dshmArchive;exitCode=$dshmCode;before=$dshmBefore;after=$dshmAfter;allFileBytesPreserved=$dshmSame;freeBytesBefore=$dshmFreeBefore;freeBytesAfter=(Get-PSDrive -Name $dshmDriveName).Free;originalFailureReportsRetained=$true}
[IO.File]::WriteAllText($dshmReport, ($dshmEvidence | ConvertTo-Json -Depth 5))
$dshmEvidence | ConvertTo-Json -Depth 5 -Compress
if (-not $dshmEvidence.passed) { throw 'Owned SDK archive compression verification failed' }
