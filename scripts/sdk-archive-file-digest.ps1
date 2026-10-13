# NTFS硬链接的目录项可能保留旧长度；长度和摘要必须来自同一个只读文件句柄。
function Get-DshmArchiveFileDigest([IO.FileInfo]$File) {
    $dshmFileStream = [IO.File]::OpenRead($File.FullName)
    try {
        [pscustomobject]@{
            length = $dshmFileStream.Length
            sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($dshmFileStream)).ToLowerInvariant()
        }
    } finally {
        $dshmFileStream.Dispose()
    }
}
