# 只设置隔离SDK构建目录的新文件压缩继承；记录并恢复原目录属性，不递归改源码。
param([Parameter(Mandatory)][ValidateSet('apply', 'restore')][string]$Action, [ValidateSet('original', 'sdk-attempt-11')][string]$Scope = 'original')
$ErrorActionPreference = 'Stop'
$dshmProject = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$dshmRuntime = (Resolve-Path -LiteralPath (Join-Path $dshmProject 'artifacts/latest-runtime-check')).Path
$dshmSource = (Resolve-Path -LiteralPath (Join-Path $dshmProject 'artifacts/latest-source-check')).Path
$dshmLeasePath = Join-Path $dshmRuntime $(if ($Scope -eq 'original') { 'latest-sdk-compression-directory-lease.json' } else { 'latest-sdk-compression-directory-lease-attempt-11.json' })
$dshmTargets = @($dshmSource, (Join-Path $dshmSource 'python/sdk-runtime/src/deepseek_harness_runtime/runtime'), (Join-Path $dshmRuntime 'sdk-sea-temporary'))
if ($Action -eq 'apply' -and $Scope -eq 'sdk-attempt-11') {
    $dshmSourceLease = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-live-source-lease.json') -Raw | ConvertFrom-Json
    if ($dshmSourceLease.state -ne 'ready' -or $dshmSourceLease.scope -ne $Scope -or $dshmSourceLease.files -ne 38 -or $dshmSourceLease.sourceRoot -ne $dshmSource) { throw 'Unexpected SDK11 source lease' }
    if (Test-Path -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-11.json')) { throw 'SDK11 build already started' }
    $dshmFrozen = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-node-freeze-archive-10.json') -Raw | ConvertFrom-Json
    if ($dshmFrozen.passed -ne $true) { throw 'Previous carrier freeze missing' }
    # 原目录已同卷封存；这里只在已解析、无链接的隔离源码包内创建本轮生成目录。
    if (-not (Test-Path -LiteralPath $dshmTargets[1])) {
        $dshmOwner = (Resolve-Path -LiteralPath (Split-Path -Parent $dshmTargets[1])).Path
        if ($dshmOwner -ne (Join-Path $dshmSource 'python/sdk-runtime/src/deepseek_harness_runtime')) { throw 'Unexpected SDK11 generated directory owner' }
        if ((Get-Item -LiteralPath $dshmOwner).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'SDK11 owner is linked' }
        [void](New-Item -ItemType Directory -Path $dshmTargets[1])
    }
}
foreach ($dshmTarget in $dshmTargets) {
    $dshmResolved = (Resolve-Path -LiteralPath $dshmTarget).Path
    if ($dshmResolved -ne $dshmTarget -or -not $dshmResolved.StartsWith($dshmProject + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'SDK compression target escapes project' }
    $dshmParent = $dshmResolved
    while ($dshmParent.Length -ge $dshmProject.Length) {
        $dshmItem = Get-Item -LiteralPath $dshmParent
        if (-not $dshmItem.PSIsContainer -or ($dshmItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'SDK compression target has reparse parent' }
        if ($dshmParent -eq $dshmProject) { break }
        $dshmParent = Split-Path -Parent $dshmParent
    }
}
if ($Action -eq 'apply') {
    if (Test-Path -LiteralPath $dshmLeasePath) { throw 'SDK compression directory lease already exists' }
    if ($Scope -eq 'original') {
    $dshmFailure = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-4.json') -Raw | ConvertFrom-Json
    if ($dshmFailure.passed -ne $false -or $dshmFailure.exitCode -ne 1 -or $dshmFailure.sourceRoot -ne $dshmSource) { throw 'Unexpected SDK failed build ownership' }
    $dshmFailureLog = Get-Content -LiteralPath (Join-Path $dshmRuntime 'latest-sdk-sea-build-attempt-4.log') -Raw
    if (-not $dshmFailureLog.Contains('ENOSPC: no space left on device')) { throw 'No verified SDK disk-space failure' }
    if (Get-Process -Id $dshmFailure.pid -ErrorAction SilentlyContinue) { throw 'Failed SDK build is still running' }
    }
    $dshmLease = [ordered]@{at=[DateTime]::UtcNow.ToString('o');state='applying';project=$dshmProject;targets=@(foreach ($dshmTarget in $dshmTargets) { [pscustomobject]@{path=$dshmTarget;originalCompressed=[bool]((Get-Item -LiteralPath $dshmTarget).Attributes -band [IO.FileAttributes]::Compressed);applied=$false} })}
    [IO.File]::WriteAllText($dshmLeasePath, ($dshmLease | ConvertTo-Json -Depth 5))
} else {
    $dshmLease = Get-Content -LiteralPath $dshmLeasePath -Raw | ConvertFrom-Json
    if ($dshmLease.project -ne $dshmProject -or $dshmLease.state -notin @('applying','applied')) { throw 'Unexpected SDK compression lease' }
    if (($dshmLease.targets.path -join "`n") -ne ($dshmTargets -join "`n")) { throw 'SDK compression lease targets changed' }
}
foreach ($dshmRow in $dshmLease.targets) {
    $dshmExpected = if ($Action -eq 'apply') { $true } else { $dshmRow.originalCompressed }
    if ([bool]((Get-Item -LiteralPath $dshmRow.path).Attributes -band [IO.FileAttributes]::Compressed) -ne $dshmExpected) {
        # 没有/S，不递归改现有文件；只影响该目录随后创建的构建产物。
        $dshmResult = & compact.exe $(if ($dshmExpected) { '/C' } else { '/U' }) /Q $dshmRow.path
        if ($LASTEXITCODE -ne 0) { throw 'SDK compression directory operation failed' }
    }
    if ([bool]((Get-Item -LiteralPath $dshmRow.path).Attributes -band [IO.FileAttributes]::Compressed) -ne $dshmExpected) { throw 'SDK compression directory state mismatch' }
    $dshmRow.applied = $Action -eq 'apply'
    [IO.File]::WriteAllText($dshmLeasePath, ($dshmLease | ConvertTo-Json -Depth 5))
}
$dshmLease.state = if ($Action -eq 'apply') { 'applied' } else { 'restored' }
[IO.File]::WriteAllText($dshmLeasePath, ($dshmLease | ConvertTo-Json -Depth 5))
[pscustomobject]@{state=$dshmLease.state;directories=$dshmLease.targets.Count;recursive=$false;freeBytes=(Get-PSDrive -Name ([IO.Path]::GetPathRoot($dshmProject).TrimEnd('\', ':'))).Free} | ConvertTo-Json -Compress
