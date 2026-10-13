param([Parameter(Mandatory = $true)][string]$Workspace)
$ErrorActionPreference = 'Stop'
$runtime = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../artifacts/latest-runtime-check'))
$relative = [System.IO.Path]::GetRelativePath($runtime, [System.IO.Path]::GetFullPath($Workspace))
if ($relative -notmatch '^live-homes\\[0-9a-f-]{36}\\test-project$') { throw 'snapshot_workspace_outside_test_home' }
$paths = @((Get-Item -LiteralPath $Workspace)) + @(Get-ChildItem -LiteralPath $Workspace -Force)
if ($paths.Count -ne 8) { throw 'snapshot_original_workspace_changed' }
$result = @($paths | Sort-Object FullName | ForEach-Object {
  if ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'snapshot_reparse_refused' }
  $acl = Get-Acl -LiteralPath $_.FullName
  @{ path = $_.FullName; owner = $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value;
    protected = $acl.AreAccessRulesProtected;
    accessSddl = $acl.GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::Access) }
})
ConvertTo-Json -InputObject $result -Depth 5 -Compress
