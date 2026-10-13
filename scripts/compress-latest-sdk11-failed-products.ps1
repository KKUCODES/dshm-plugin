# 原SDK11在同步Python资源时磁盘不足；只压缩其已停止的隔离产物，保留失败现场。
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'sdk-archive-file-digest.ps1')
$dshmProject = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$dshmRuntime = (Resolve-Path -LiteralPath (Join-Path $dshmProject 'artifacts/latest-runtime-check')).Path
$dshmSource = (Resolve-Path -LiteralPath (Join-Path $dshmProject 'artifacts/latest-source-check')).Path
$dshmBuild = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-11.json') -Raw | ConvertFrom-Json
$dshmLog = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-11.log') -Raw
if ($dshmBuild.passed -ne $false -or $dshmBuild.exitCode -ne 1 -or $dshmBuild.files -ne 38 -or $dshmBuild.sourceRoot -ne $dshmSource) { throw 'Unexpected SDK11 failure ownership' }
if (-not $dshmLog.Contains('ENOSPC: no space left on device, copyfile') -or -not $dshmLog.Contains('numpy\__init__.pyi')) { throw 'Unexpected SDK11 failure stage' }
if (Get-Process -Id $dshmBuild.pid -ErrorAction SilentlyContinue) { throw 'SDK11 build still running' }
if (Test-Path -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-product.json')) { throw 'Successful SDK product exists' }
$dshmLease = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-live-source-lease.json') -Raw | ConvertFrom-Json
if ($dshmLease.state -ne 'ready' -or $dshmLease.scope -ne 'sdk-attempt-11' -or $dshmLease.files -ne 38) { throw 'Unexpected source lease' }
$dshmTargets = @((Join-Path $dshmSource 'dist-exe'), (Join-Path $dshmSource 'python/sdk-runtime/src/deepseek_harness_runtime/runtime'))
foreach ($dshmTarget in $dshmTargets) {
    if ((Resolve-Path -LiteralPath $dshmTarget).Path -ne $dshmTarget -or -not $dshmTarget.StartsWith($dshmProject + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'SDK11 compression target escapes project' }
    for ($dshmParent = $dshmTarget; $dshmParent.Length -gt $dshmProject.Length; $dshmParent = Split-Path -Parent $dshmParent) {
        if ((Get-Item -LiteralPath $dshmParent).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'SDK11 target has reparse parent' }
    }
}
$dshmReportPath = Join-Path $dshmRuntime 'latest-sdk11-failed-products-compression.json'
if (Test-Path -LiteralPath $dshmReportPath) { throw 'SDK11 compression evidence exists' }
function Read-DshmSdk11Manifest {
    $dshmRows = [Collections.Generic.List[string]]::new()
    foreach ($dshmTarget in $dshmTargets) {
        foreach ($dshmItem in (Get-ChildItem -LiteralPath $dshmTarget -Recurse -Force)) {
            if ($dshmItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'SDK11 resource is linked' }
            if (-not $dshmItem.PSIsContainer) {
                $dshmDigest = Get-DshmArchiveFileDigest $dshmItem
                $dshmRows.Add("$($dshmItem.FullName.Substring($dshmSource.Length + 1))`t$($dshmDigest.length)`t$($dshmDigest.sha256)")
            }
        }
    }
    $dshmCanonical = $dshmRows.ToArray(); [Array]::Sort($dshmCanonical, [StringComparer]::Ordinal)
    $dshmBytes = [Text.Encoding]::UTF8.GetBytes(($dshmCanonical -join "`n"))
    [pscustomobject]@{files=$dshmRows.Count;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($dshmBytes)).ToLowerInvariant()}
}
$dshmBefore = Read-DshmSdk11Manifest
$dshmFreeBefore = (Get-PSDrive Q).Free
foreach ($dshmTarget in $dshmTargets) {
    $dshmResult = & compact.exe /C "/S:$dshmTarget" /A /Q
    if ($LASTEXITCODE -ne 0) { throw 'SDK11 resource compression failed' }
}
$dshmAfter = Read-DshmSdk11Manifest
$dshmPassed = $dshmBefore.files -eq $dshmAfter.files -and $dshmBefore.sha256 -eq $dshmAfter.sha256
$dshmReport = @{at=[DateTime]::UtcNow.ToString('o');passed=$dshmPassed;before=$dshmBefore;after=$dshmAfter;freeBytesBefore=$dshmFreeBefore;freeBytesAfter=(Get-PSDrive Q).Free;failureEvidencePreserved=$true}
[IO.File]::WriteAllText($dshmReportPath, ($dshmReport | ConvertTo-Json -Depth 5))
$dshmReport | ConvertTo-Json -Depth 5 -Compress
if (-not $dshmPassed) { throw 'SDK11 compressed bytes changed' }
