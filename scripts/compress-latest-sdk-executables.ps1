# 保留全部历史EXE字节，仅以Windows无损压缩降低归档占用。
param([switch]$Sdk11)
$ErrorActionPreference = 'Stop'
$dshmProject = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$dshmRuntime = (Resolve-Path -LiteralPath (Join-Path $dshmProject 'artifacts/latest-runtime-check')).Path
$dshmReportPath = Join-Path $dshmRuntime $(if ($Sdk11) { 'latest-sdk11-failed-exe-lzx.json' } else { 'latest-sdk-archived-exe-lzx.json' })
if (Test-Path -LiteralPath $dshmReportPath) { throw 'Archive compression evidence exists' }
$dshmArchives = @(
    @{name='sdk-sea-attempt-7-native-failed-products';record='latest-sdk-sea-attempt-7-native-products-archive.json'},
    @{name='sdk-sea-attempt-8-runner-failed-products';record='latest-sdk-sea-attempt-8-runner-products-archive.json'},
    @{name='sdk-sea-attempt-9-profile-failed-products';record='latest-sdk-sea-attempt-9-profile-products-archive.json'},
    @{name='sdk-sea-attempt-10-completed-products';record='latest-sdk-sea-attempt-10-completed-products-archive.json'}
)
if ($Sdk11) { $dshmArchives = @(@{name='sdk-sea-attempt-11-failed-products';record='latest-sdk-sea-attempt-11-failed-products-archive.json'}) }
$dshmTargets = @()
foreach ($dshmArchive in $dshmArchives) {
    $dshmRecord = Get-Content -LiteralPath (Join-Path $dshmRuntime $dshmArchive.record) -Raw | ConvertFrom-Json
    if ($dshmRecord.archived -ne $true -or $dshmRecord.sourceCommit -ne '5badb15009ae1756c3afe0ae0cef1faafc290ccc') { throw 'Unexpected archive ownership' }
    foreach ($dshmSuffix in @('dist-exe/deepseek-harness-sdk-runtime-win-x64.exe','runtime/deepseek-harness-sdk-runtime-win-x64.exe')) {
        $dshmTarget = (Resolve-Path -LiteralPath (Join-Path (Join-Path $dshmRuntime $dshmArchive.name) $dshmSuffix)).Path
        if (-not $dshmTarget.StartsWith($dshmRuntime + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Target escapes project' }
        for ($dshmParent = $dshmTarget; $dshmParent.Length -gt $dshmProject.Length; $dshmParent = Split-Path -Parent $dshmParent) {
            if ((Get-Item -LiteralPath $dshmParent).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Target has reparse parent' }
        }
        if ((Get-FileHash -LiteralPath $dshmTarget -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dshmRecord.productSha256) { throw 'Archive executable changed' }
        $dshmTargets += @{path=$dshmTarget;sha256=$dshmRecord.productSha256}
    }
}
$dshmReport = [ordered]@{at=[DateTime]::UtcNow.ToString('o');passed=$false;freeBytesBefore=(Get-PSDrive Q).Free;files=@()}
[IO.File]::WriteAllText($dshmReportPath, ($dshmReport | ConvertTo-Json -Depth 5))
foreach ($dshmTarget in $dshmTargets) {
    $dshmOutput = & compact.exe /C /EXE:LZX /Q $dshmTarget.path
    if ($LASTEXITCODE -ne 0) { throw 'Archive LZX compression failed' }
    if ((Get-FileHash -LiteralPath $dshmTarget.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dshmTarget.sha256) { throw 'Archive EXE bytes changed' }
    $dshmReport.files += $dshmTarget
    [IO.File]::WriteAllText($dshmReportPath, ($dshmReport | ConvertTo-Json -Depth 5))
}
$dshmReport.passed = $true
$dshmReport.freeBytesAfter = (Get-PSDrive Q).Free
[IO.File]::WriteAllText($dshmReportPath, ($dshmReport | ConvertTo-Json -Depth 5))
[pscustomobject]@{passed=$true;files=$dshmReport.files.Count;freeBytesAfter=$dshmReport.freeBytesAfter} | ConvertTo-Json -Compress
