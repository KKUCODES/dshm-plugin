# 官方锁定资源的独立预取；保留系统默认TLS校验，以SHA-256命名供原打包器复用。
$ErrorActionPreference = 'Stop'
$dshmPluginRoot = Split-Path -Parent $PSScriptRoot
$dshmSourceRoot = Join-Path $dshmPluginRoot 'artifacts/latest-source-check'
$dshmCommit = git -C $dshmSourceRoot rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $dshmCommit.Trim() -ne '5badb15009ae1756c3afe0ae0cef1faafc290ccc') { throw 'Unexpected SDK source commit' }
$dshmLockPath = Join-Path $dshmSourceRoot 'scripts/primary-runtime/lock.json'
$dshmLock = Get-Content -LiteralPath $dshmLockPath -Raw | ConvertFrom-Json
$dshmTarget = $dshmLock.targets.'win-x64'
$dshmRuntimeRoot = Join-Path $dshmPluginRoot 'artifacts/latest-runtime-check'
$dshmTemporary = Join-Path $dshmRuntimeRoot 'sdk-sea-temporary'
$dshmCache = Join-Path $dshmTemporary 'dsh-primary-runtime-downloads'
$dshmReportPath = Join-Path $dshmRuntimeRoot 'latest-sdk-primary-prefetch.json'
if (Test-Path -LiteralPath $dshmReportPath) { throw 'Refuse to overwrite SDK prefetch evidence' }
New-Item -ItemType Directory -Path $dshmCache -Force | Out-Null
$dshmResolvedCache = (Resolve-Path -LiteralPath $dshmCache).Path
$dshmResolvedRuntime = (Resolve-Path -LiteralPath $dshmRuntimeRoot).Path
if (-not $dshmResolvedCache.StartsWith($dshmResolvedRuntime + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Cache escapes owned runtime' }
foreach ($dshmDirectory in @($dshmCache, $dshmTemporary, $dshmRuntimeRoot)) {
    if ((Get-Item -LiteralPath $dshmDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Cache parent is a reparse point' }
}
$dshmOwned = Join-Path $dshmRuntimeRoot ('sdk-primary-prefetch-owned-' + [Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $dshmOwned | Out-Null
$dshmPythonFilename = 'cpython-' + $dshmLock.pythonVersion + '+' + $dshmLock.pythonRelease + '-' + $dshmTarget.pythonTarget + '-install_only_stripped.tar.gz'
$dshmAssets = @(
    [pscustomobject]@{url=('https://nodejs.org/dist/v' + $dshmLock.nodeVersion + '/node-v' + $dshmLock.nodeVersion + '-' + $dshmTarget.nodeArchive); sha256=$dshmTarget.nodeSha256},
    [pscustomobject]@{url=('https://github.com/astral-sh/python-build-standalone/releases/download/' + $dshmLock.pythonRelease + '/' + [Uri]::EscapeDataString($dshmPythonFilename)); sha256=$dshmTarget.pythonSha256}
) + @($dshmTarget.wheels) + @($dshmLock.wheels)
$dshmResults = [Collections.Generic.List[object]]::new()
$dshmReport = [ordered]@{at=[DateTime]::UtcNow.ToString('o'); sourceCommit=$dshmCommit.Trim(); lockSha256=(Get-FileHash -LiteralPath $dshmLockPath -Algorithm SHA256).Hash.ToLowerInvariant(); passed=$false; defaultTlsValidation=$true; cache=$dshmCache; owned=$dshmOwned; assets=$dshmResults}
try {
    foreach ($dshmAsset in $dshmAssets) {
        $dshmUrl = [Uri]$dshmAsset.url
        if ($dshmUrl.Scheme -ne 'https' -or $dshmUrl.Host -notin @('github.com','nodejs.org','files.pythonhosted.org') -or $dshmUrl.UserInfo -ne '') { throw 'Unexpected locked SDK asset URL' }
        if ($dshmAsset.sha256 -notmatch '^[0-9a-f]{64}$') { throw 'Invalid locked SDK digest' }
        $dshmDestination = Join-Path $dshmCache $dshmAsset.sha256
        $dshmReused = Test-Path -LiteralPath $dshmDestination
        if ($dshmReused) {
            $dshmItem = Get-Item -LiteralPath $dshmDestination
            if ($dshmItem.PSIsContainer -or ($dshmItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected cached SDK object' }
            if ((Get-FileHash -LiteralPath $dshmDestination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dshmAsset.sha256) { throw 'Existing SDK cache digest mismatch' }
        } else {
            $dshmPart = Join-Path $dshmOwned ($dshmAsset.sha256 + '.download')
            if (Test-Path -LiteralPath $dshmPart) { throw 'Unexpected SDK temporary download' }
            Invoke-WebRequest -Uri $dshmUrl -OutFile $dshmPart -TimeoutSec 120 -MaximumRedirection 8
            if ((Get-FileHash -LiteralPath $dshmPart -Algorithm SHA256).Hash.ToLowerInvariant() -ne $dshmAsset.sha256) { throw 'Downloaded SDK asset digest mismatch' }
            # File.Move的两参数重载不覆盖已存在目标；此前缓存和失败下载均不删除。
            [IO.File]::Move($dshmPart, $dshmDestination)
        }
        $dshmResult = [pscustomobject]@{sha256=$dshmAsset.sha256; bytes=(Get-Item -LiteralPath $dshmDestination).Length; reused=$dshmReused; host=$dshmUrl.Host}
        $dshmResults.Add($dshmResult)
        $dshmResult | ConvertTo-Json -Compress
    }
    $dshmReport.passed = $true
} catch {
    $dshmReport.failure = $_.Exception.Message
    throw
} finally {
    $dshmJson = $dshmReport | ConvertTo-Json -Depth 8
    $dshmStream = [IO.File]::Open($dshmReportPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $dshmBytes = [Text.UTF8Encoding]::new($false).GetBytes($dshmJson); $dshmStream.Write($dshmBytes, 0, $dshmBytes.Length) }
    finally { $dshmStream.Dispose() }
}
