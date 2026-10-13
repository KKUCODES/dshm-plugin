# 系统下载工具预取同一官方资源；缓存规则和校验值来自已锁定的Electron依赖。
$ErrorActionPreference = 'Stop'
$dshmPluginRoot = Split-Path -Parent $PSScriptRoot
$dshmSourceRoot = Join-Path $dshmPluginRoot 'artifacts/latest-source-check'
$dshmRuntimeRoot = Join-Path $dshmPluginRoot 'artifacts/latest-runtime-check'
$dshmReportPath = Join-Path $dshmRuntimeRoot 'latest-electron-prefetch-attempt-1.json'
if (Test-Path -LiteralPath $dshmReportPath) { throw 'Refuse to overwrite Electron prefetch evidence' }
$dshmCommit = git -C $dshmSourceRoot rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $dshmCommit.Trim() -ne '5badb15009ae1756c3afe0ae0cef1faafc290ccc') { throw 'Unexpected Electron source commit' }
$dshmDependency = Join-Path $dshmSourceRoot 'node_modules/.pnpm/electron@44.0.0/node_modules/electron'
$dshmMetadata = Get-Content -LiteralPath (Join-Path $dshmDependency 'package.json') -Raw | ConvertFrom-Json
if ($dshmMetadata.name -ne 'electron' -or $dshmMetadata.version -ne '44.0.0') { throw 'Unexpected Electron dependency' }
$dshmFilename = 'electron-v44.0.0-win32-x64.zip'
$dshmChecksums = Get-Content -LiteralPath (Join-Path $dshmDependency 'checksums.json') -Raw | ConvertFrom-Json
$dshmExpected = $dshmChecksums.$dshmFilename
if ($dshmExpected -notmatch '^[0-9a-f]{64}$') { throw 'Invalid official Electron checksum' }
$dshmBaseUrl = 'https://github.com/electron/electron/releases/download/v44.0.0'
$dshmHash = [Security.Cryptography.SHA256]::Create()
try { $dshmCacheKey = [Convert]::ToHexString($dshmHash.ComputeHash([Text.Encoding]::UTF8.GetBytes($dshmBaseUrl))).ToLowerInvariant() }
finally { $dshmHash.Dispose() }
$dshmCacheRoot = Join-Path $dshmRuntimeRoot 'electron-download-cache'
$dshmCache = Join-Path $dshmCacheRoot $dshmCacheKey
New-Item -ItemType Directory -Path $dshmCache -Force | Out-Null
$dshmResolvedRuntime = (Resolve-Path -LiteralPath $dshmRuntimeRoot).Path
$dshmResolvedCache = (Resolve-Path -LiteralPath $dshmCache).Path
if (-not $dshmResolvedCache.StartsWith($dshmResolvedRuntime + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Electron cache escapes owned runtime' }
foreach ($dshmPath in @($dshmRuntimeRoot, $dshmCacheRoot, $dshmCache)) {
    if ((Get-Item -LiteralPath $dshmPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Electron cache parent is a reparse point' }
}
$dshmDestination = Join-Path $dshmCache $dshmFilename
$dshmPart = Join-Path $dshmCache ($dshmFilename + '.' + [Guid]::NewGuid().ToString() + '.download')
$dshmReport = [ordered]@{at=[DateTime]::UtcNow.ToString('o'); sourceCommit=$dshmCommit.Trim(); version='44.0.0'; officialUrl=($dshmBaseUrl + '/' + $dshmFilename); expectedSha256=$dshmExpected; cache=$dshmDestination; defaultTlsValidation=$true; passed=$false}
try {
    $dshmReport.reused = Test-Path -LiteralPath $dshmDestination
    if (-not $dshmReport.reused) {
        Invoke-WebRequest -Uri $dshmReport.officialUrl -OutFile $dshmPart -TimeoutSec 120 -MaximumRedirection 8
        if ((Get-FileHash -LiteralPath $dshmPart -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dshmExpected) { throw 'Electron download checksum mismatch' }
        [IO.File]::Move($dshmPart, $dshmDestination)
    }
    $dshmItem = Get-Item -LiteralPath $dshmDestination
    if ($dshmItem.PSIsContainer -or ($dshmItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected cached Electron object' }
    $dshmReport.sha256 = (Get-FileHash -LiteralPath $dshmDestination -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($dshmReport.sha256 -ne $dshmExpected) { throw 'Cached Electron checksum mismatch' }
    $dshmReport.bytes = $dshmItem.Length
    $dshmReport.passed = $true
} catch { $dshmReport.failure = $_.Exception.Message; throw }
finally {
    $dshmStream = [IO.File]::Open($dshmReportPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $dshmBytes = [Text.UTF8Encoding]::new($false).GetBytes(($dshmReport | ConvertTo-Json -Depth 5)); $dshmStream.Write($dshmBytes, 0, $dshmBytes.Length) }
    finally { $dshmStream.Dispose() }
    $dshmReport | ConvertTo-Json -Compress
}
