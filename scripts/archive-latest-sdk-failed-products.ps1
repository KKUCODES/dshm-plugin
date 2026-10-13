# 保留SDK失败产物，给原官方打包器留下空的生成目录；不删除任何旧证据。
param([ValidateSet(2, 3, 4, 6, 11)][int]$Attempt = 2)
$ErrorActionPreference = 'Stop'
$dshmPluginRoot = Split-Path -Parent $PSScriptRoot
$dshmRuntime = (Resolve-Path -LiteralPath (Join-Path $dshmPluginRoot 'artifacts/latest-runtime-check')).Path
$dshmSource = (Resolve-Path -LiteralPath (Join-Path $dshmPluginRoot 'artifacts/latest-source-check')).Path
$dshmBuild = Get-Content -LiteralPath (Join-Path $dshmRuntime "latest-sdk-sea-build-attempt-$Attempt.json") -Raw | ConvertFrom-Json
if ($dshmBuild.passed -ne $false -or $dshmBuild.exitCode -ne 1 -or $dshmBuild.sourceRoot -ne $dshmSource -or $dshmBuild.sourceCommit -ne '5badb15009ae1756c3afe0ae0cef1faafc290ccc') { throw 'Unexpected failed SDK build ownership' }
if (Get-Process -Id $dshmBuild.pid -ErrorAction SilentlyContinue) { throw 'Recorded SDK build process is still alive' }
$dshmArchive = Join-Path $dshmRuntime "sdk-sea-attempt-$Attempt-failed-products"
$dshmReport = Join-Path $dshmRuntime "latest-sdk-sea-attempt-$Attempt-failed-products-archive.json"
if ((Test-Path -LiteralPath $dshmArchive) -or (Test-Path -LiteralPath $dshmReport)) { throw 'SDK failure archive already exists' }
$dshmMoves = @(
    [pscustomobject]@{relative='dist-exe'; destination=(Join-Path $dshmArchive 'dist-exe')},
    [pscustomobject]@{relative=$(if ($Attempt -eq 11) { 'python/sdk-runtime/src/deepseek_harness_runtime/runtime' } else { 'python/sdk-runtime/src/deepseek_harness_runtime/runtime/node' }); destination=(Join-Path $dshmArchive $(if ($Attempt -eq 11) { 'runtime' } else { 'runtime-node' }))}
)
foreach ($dshmMove in $dshmMoves) {
    $dshmPath = (Resolve-Path -LiteralPath (Join-Path $dshmSource $dshmMove.relative)).Path
    if (-not $dshmPath.StartsWith($dshmSource + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'SDK output escapes isolated source' }
    if ((Get-Item -LiteralPath $dshmPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'SDK output is a reparse point' }
    $dshmParent = Split-Path -Parent $dshmPath
    while ($dshmParent.Length -ge $dshmSource.Length) {
        if ((Get-Item -LiteralPath $dshmParent).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'SDK output parent is a reparse point' }
        if ($dshmParent -eq $dshmSource) { break }
        $dshmParent = Split-Path -Parent $dshmParent
    }
    if (-not ([IO.Path]::GetFullPath($dshmMove.destination)).StartsWith($dshmRuntime + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'SDK archive escapes runtime' }
    $dshmMove | Add-Member -NotePropertyName source -NotePropertyValue $dshmPath
}
$dshmExe = Join-Path $dshmMoves[0].source 'deepseek-harness-sdk-runtime-win-x64.exe'
$dshmExeHash = $null
$dshmExeBytes = $null
if ($Attempt -eq 6) {
    $dshmFailedLog = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-6.log') -Raw
    if (-not ($dshmFailedLog.Contains('sea-prep.blob:no space left on device'))) { throw 'Unexpected sixth SDK build failure' }
    if (@(Get-ChildItem -LiteralPath $dshmMoves[0].source -Force).Count -ne 0) { throw 'Sixth SDK failure must have no executable products' }
} else {
    $dshmExeHash = (Get-FileHash -LiteralPath $dshmExe -Algorithm SHA256).Hash.ToLowerInvariant()
    $dshmExeBytes = (Get-Item -LiteralPath $dshmExe).Length
    if ($dshmExeBytes -ne @{2=326913536;3=177209344;4=326914560;11=327077888}[$Attempt]) { throw 'Unexpected failed SDK executable size' }
}
if ($Attempt -eq 11) {
    $dshmFailedLog = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-11.log') -Raw
    if ($dshmBuild.files -ne 38 -or -not $dshmFailedLog.Contains('ENOSPC: no space left on device, copyfile') -or -not $dshmFailedLog.Contains('numpy\__init__.pyi')) { throw 'Unexpected SDK11 resource sync failure' }
    if (Test-Path -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-product.json')) { throw 'Successful SDK product exists' }
}
if ($Attempt -eq 3) {
    $dshmFailedLog = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-3.log') -Raw
    if (-not $dshmFailedLog.Contains("Couldn't write executable")) { throw 'Unexpected third SDK build failure' }
}
if ($Attempt -eq 4) {
    $dshmFailedLog = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-4.log') -Raw
    if (-not $dshmFailedLog.Contains('ENOSPC: no space left on device')) { throw 'Unexpected fourth SDK build failure' }
}
New-Item -ItemType Directory -Path $dshmArchive | Out-Null
foreach ($dshmMove in $dshmMoves) {
    # 同一项目/卷内改名保留完整目录；所有实际源和目标绝对路径在操作前已核验。
    [IO.Directory]::Move($dshmMove.source, $dshmMove.destination)
    if ((Test-Path -LiteralPath $dshmMove.source) -or -not (Test-Path -LiteralPath $dshmMove.destination)) { throw 'SDK archive move did not complete' }
}
$dshmArchivedExe = Join-Path $dshmMoves[0].destination 'deepseek-harness-sdk-runtime-win-x64.exe'
if ($Attempt -eq 6) {
    if (Test-Path -LiteralPath $dshmArchivedExe) { throw 'Sixth SDK archive unexpectedly contains executable' }
} elseif ((Get-FileHash -LiteralPath $dshmArchivedExe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dshmExeHash) { throw 'Archived SDK executable changed' }
$dshmEvidence = [ordered]@{at=[DateTime]::UtcNow.ToString('o'); archived=$true; sourceCommit=$dshmBuild.sourceCommit; failedBuildExitCode=1; productBytes=$dshmExeBytes; productSha256=$dshmExeHash; moves=$dshmMoves; originalFailureReportsRetained=$true}
$dshmEvidence | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $dshmReport -Encoding utf8NoBOM
[pscustomobject]@{archived=$true; bytes=$dshmExeBytes; sha256=$dshmExeHash} | ConvertTo-Json -Compress
