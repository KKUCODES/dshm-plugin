# 清理固定的失败 SDK 大文件；报告、原摘要和逐文件清单保留，当前源码与缓存不动。
param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$dshmPlugin = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$dshmRuntime = (Resolve-Path -LiteralPath (Join-Path $dshmPlugin 'artifacts/latest-runtime-check')).Path
$dshmAttempts = @(2, 3, 4, 6)

function Assert-DshmOwnedPath([string]$Path) {
    $resolved = (Resolve-Path -LiteralPath $Path).Path
    if (-not $resolved.StartsWith($dshmPlugin + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Cleanup target escapes plugin' }
    $ancestor = $resolved
    while ($ancestor.Length -ge $dshmPlugin.Length) {
        if ((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Cleanup target has a reparse ancestor' }
        if ($ancestor -eq $dshmPlugin) { break }
        $ancestor = Split-Path -Parent $ancestor
    }
    return $resolved
}

if (Test-Path -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-product.json')) { throw 'Successful SDK product exists; review cleanup scope again' }
$dshmPlan = @()
foreach ($attempt in $dshmAttempts) {
    $archive = Assert-DshmOwnedPath (Join-Path $dshmRuntime "sdk-sea-attempt-$attempt-failed-products")
    $archiveReport = Get-Content -LiteralPath (Join-Path $dshmRuntime "latest-sdk-sea-attempt-$attempt-failed-products-archive.json") -Raw | ConvertFrom-Json
    $buildReport = Get-Content -LiteralPath (Join-Path $dshmRuntime "latest-sdk-sea-build-attempt-$attempt.json") -Raw | ConvertFrom-Json
    if ($archiveReport.archived -ne $true -or $archiveReport.failedBuildExitCode -ne 1 -or
        $archiveReport.sourceCommit -ne '5badb15009ae1756c3afe0ae0cef1faafc290ccc' -or
        $buildReport.passed -ne $false -or $buildReport.exitCode -ne 1) { throw 'Unexpected failed-build ownership' }
    $exe = Join-Path $archive 'dist-exe/deepseek-harness-sdk-runtime-win-x64.exe'
    if ($archiveReport.productSha256 -and (Test-Path -LiteralPath $exe)) {
        if ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $archiveReport.productSha256) { throw 'Failed executable digest changed' }
    }
    foreach ($name in @('dist-exe', 'runtime-node')) {
        $target = Join-Path $archive $name
        if (-not (Test-Path -LiteralPath $target)) { continue }
        $target = Assert-DshmOwnedPath $target
        $tracked = @(git -C $dshmPlugin ls-files -- $target)
        if ($LASTEXITCODE -ne 0 -or $tracked.Count -ne 0) { throw 'Cleanup target includes tracked files' }
        $items = @(Get-ChildItem -LiteralPath $target -Recurse -Force)
        if (@($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count -ne 0) { throw 'Cleanup target contains a reparse point' }
        $files = @($items | Where-Object { -not $_.PSIsContainer })
        $total = ($files | Measure-Object -Property Length -Sum).Sum
        $dshmPlan += [pscustomobject]@{attempt=$attempt; path=$target; files=$files; bytes=[long]$total}
    }
}

function Assert-DshmNoActiveConsumer {
    foreach ($process in (Get-CimInstance Win32_Process)) {
        if ($process.ProcessId -eq $PID -or -not $process.CommandLine) { continue }
        if ($process.CommandLine -match 'build-latest-sdk-sea\.mjs') { throw 'SDK build is active' }
        foreach ($entry in $dshmPlan) {
            if ($process.CommandLine.IndexOf($entry.path, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
                $process.CommandLine.IndexOf($entry.path.Replace('\','/'), [StringComparison]::OrdinalIgnoreCase) -ge 0) {
                throw "Cleanup target is referenced by live PID $($process.ProcessId)"
            }
        }
    }
}
Assert-DshmNoActiveConsumer
$dshmSummary = @($dshmPlan | ForEach-Object { [pscustomobject]@{attempt=$_.attempt;path=$_.path;files=$_.files.Count;bytes=$_.bytes} })
if (-not $Apply) {
    [pscustomobject]@{dryRun=$true;targets=$dshmSummary;logicalBytes=[long]($dshmSummary | Measure-Object -Property bytes -Sum).Sum} | ConvertTo-Json -Depth 5
    return
}

$dshmEvidence = Join-Path $dshmRuntime ('storage-cleanup-' + [Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $dshmEvidence | Out-Null
$dshmReport = [ordered]@{at=[DateTime]::UtcNow.ToString('o');passed=$false;freeBytesBefore=(Get-PSDrive -Name Q).Free;targets=$dshmSummary;removed=@();originalReportsRetained=$true}
foreach ($entry in $dshmPlan) {
    $manifest = Join-Path $dshmEvidence "attempt-$($entry.attempt)-$(Split-Path -Leaf $entry.path).tsv"
    $writer = [IO.StreamWriter]::new($manifest, $false, [Text.UTF8Encoding]::new($false))
    try {
        foreach ($file in $entry.files) {
            $relative = $file.FullName.Substring($entry.path.Length + 1)
            $writer.WriteLine("$relative`t$($file.Length)`t$($file.LastWriteTimeUtc.ToString('o'))")
        }
    } finally { $writer.Dispose() }
}
$dshmReportPath = Join-Path $dshmEvidence 'report.json'
try {
    # 再次确认最终绝对路径和消费者；清单先落盘，删除只使用这些固定 LiteralPath。
    Assert-DshmNoActiveConsumer
    foreach ($entry in $dshmPlan) {
        $resolved = Assert-DshmOwnedPath $entry.path
        if ($resolved -ne $entry.path) { throw 'Cleanup target changed' }
        Remove-Item -LiteralPath $resolved -Recurse -Force
        if (Test-Path -LiteralPath $resolved) { throw 'Cleanup target remains' }
        $dshmReport.removed += $resolved
        [pscustomobject]@{stage='removed-failed-sdk-products';attempt=$entry.attempt;name=(Split-Path -Leaf $resolved);logicalBytes=$entry.bytes} | ConvertTo-Json -Compress
    }
    foreach ($attempt in $dshmAttempts) {
        $archive = Join-Path $dshmRuntime "sdk-sea-attempt-$attempt-failed-products"
        $notice = "Failed SDK binary products were removed during user-authorized storage cleanup. Original build reports, logs, archive hashes and compression manifests remain in the parent directory. File inventory and cleanup result: $dshmEvidence. Rebuild using the fixed source and official SDK build script; this archive was never a successful SDK product."
        [IO.File]::WriteAllText((Join-Path $archive 'CLEANED.txt'), $notice)
    }
    $dshmReport.passed = $true
} finally {
    $dshmReport.freeBytesAfter = (Get-PSDrive -Name Q).Free
    $dshmReport.observedFreeBytesDelta = $dshmReport.freeBytesAfter - $dshmReport.freeBytesBefore
    [IO.File]::WriteAllText($dshmReportPath, ($dshmReport | ConvertTo-Json -Depth 6))
    [pscustomobject]@{passed=$dshmReport.passed;report=$dshmReportPath;freeBytesAfter=$dshmReport.freeBytesAfter;observedFreeBytesDelta=$dshmReport.observedFreeBytesDelta} | ConvertTo-Json -Compress
}
