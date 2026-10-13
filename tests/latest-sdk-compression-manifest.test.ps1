$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/sdk-archive-file-digest.ps1')
$dshmFixtureRoot = Join-Path (Split-Path -Parent $PSScriptRoot) ('artifacts/latest-runtime-check/sdk-compression-manifest-regression-' + [guid]::NewGuid())
[void](New-Item -ItemType Directory -Path $dshmFixtureRoot)
$dshmOriginal = Join-Path $dshmFixtureRoot 'original.txt'
$dshmLinked = Join-Path $dshmFixtureRoot 'linked.txt'
[IO.File]::WriteAllText($dshmOriginal, 'abc')
[void](New-Item -ItemType HardLink -Path $dshmLinked -Target $dshmOriginal)
$dshmCachedEntry = Get-Item -LiteralPath $dshmLinked
if ($dshmCachedEntry.Length -ne 3) { throw 'Initial hardlink fixture is invalid' }
[IO.File]::WriteAllText($dshmOriginal, 'abcdef')
# 真实共享文件已经改变，先前枚举的FileInfo仍显示原长度；原清单会混合两个时点。
if ($dshmCachedEntry.Length -ne 3) { throw 'Stale FileInfo failure did not reproduce' }
$dshmActual = Get-DshmArchiveFileDigest $dshmCachedEntry
if ($dshmActual.length -ne 6 -or $dshmActual.sha256 -ne 'bef57ec7f53a6d40beb640a780a639c83bc29ac8a9816f1fc6c5c6dcd93c4721') { throw 'Hardlink content and length do not agree' }
[IO.File]::WriteAllText($dshmOriginal, 'abc')
$dshmChanged = Get-DshmArchiveFileDigest $dshmCachedEntry
if ($dshmChanged.length -ne 3 -or $dshmChanged.sha256 -ne 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') { throw 'Real content changes were not detected' }
$dshmMissing = [IO.FileInfo]::new((Join-Path $dshmFixtureRoot 'missing.txt'))
$dshmRejected = $false
try { [void](Get-DshmArchiveFileDigest $dshmMissing) } catch { $dshmRejected = $true }
if (-not $dshmRejected) { throw 'Missing archive files must not be accepted' }
[pscustomobject]@{passed=$true;checks=3;fixture=$dshmFixtureRoot;hardlinkUsed=$true} | ConvertTo-Json -Compress
