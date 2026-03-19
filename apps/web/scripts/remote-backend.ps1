[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Command = "help",

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$Arguments,

    [switch]$Backup,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot ".env.local"
$ContainerName = "service-php85"
$ContainerProjectPath = "/app/api1.buka.sh"

function Show-Usage {
    @"
Usage:
  ./scripts/remote-backend.ps1 env-check
  ./scripts/remote-backend.ps1 connect
  ./scripts/remote-backend.ps1 host-cmd <command>
  ./scripts/remote-backend.ps1 php-cmd <command>
  ./scripts/remote-backend.ps1 route-list [path]
  ./scripts/remote-backend.ps1 read-file <remotePath>
  ./scripts/remote-backend.ps1 file-exists <remotePath>
  ./scripts/remote-backend.ps1 backup-file <remotePath>
  ./scripts/remote-backend.ps1 upload-file <localPath> <remotePath> [-Backup]
  ./scripts/remote-backend.ps1 download-file <remotePath> <localPath>
  ./scripts/remote-backend.ps1 grep <pattern> [remotePath]
  ./scripts/remote-backend.ps1 bookmarks-check
  ./scripts/remote-backend.ps1 notes-check

Options:
  -Backup  Create a timestamped backup before upload-file overwrites a remote file.
  -DryRun  Print the command that would run without executing it.
"@ | Write-Output
}

function Fail([string]$Message) {
    throw $Message
}

function Join-CommandArguments {
    param([string[]]$Parts)

    if (-not $Parts -or $Parts.Count -eq 0) {
        return ""
    }

    return ($Parts -join " ").Trim()
}

function Quote-ShSingle {
    param([string]$Value)

    $escaped = $Value.Replace("'", "'""'""'")
    return "'" + $escaped + "'"
}

function Resolve-LocalPath {
    param([string]$PathValue)

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return $PathValue
    }

    return [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $PathValue))
}

function Get-BackendConfig {
    if (-not (Test-Path $EnvFile)) {
        Fail "Missing .env.local at $EnvFile"
    }

    $requiredKeys = @(
        "SECRET_REMOTE_BACKEND_HOST",
        "SECRET_REMOTE_BACKEND_USER",
        "SECRET_REMOTE_BACKEND_PASSWORD",
        "SECRET_REMOTE_BACKEND_PATH"
    )

    $vars = @{}
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match '^(SECRET_REMOTE_BACKEND_[A-Z_]+)=(.*)$') {
            $vars[$matches[1]] = $matches[2]
        }
    }

    foreach ($key in $requiredKeys) {
        if (-not $vars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($vars[$key])) {
            Fail "Missing required key in .env.local: $key"
        }
    }

    $plink = (Get-Command plink -ErrorAction SilentlyContinue)?.Source
    if (-not $plink) {
        $plink = "plink"
    }

    $pscp = (Get-Command pscp -ErrorAction SilentlyContinue)?.Source
    if (-not $pscp) {
        $pscp = "pscp"
    }

    return [pscustomobject]@{
        Host = $vars["SECRET_REMOTE_BACKEND_HOST"]
        User = $vars["SECRET_REMOTE_BACKEND_USER"]
        Password = $vars["SECRET_REMOTE_BACKEND_PASSWORD"]
        RemotePath = $vars["SECRET_REMOTE_BACKEND_PATH"]
        Plink = $plink
        Pscp = $pscp
    }
}

function Invoke-RemoteHostCommand {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$RemoteCommand
    )

    $target = "$($Config.User)@$($Config.Host)"
    if ($DryRun) {
        Write-Output "[dry-run] ssh $target $RemoteCommand"
        return
    }

    & $Config.Plink `
        -ssh `
        -batch `
        -no-antispoof `
        -pw $Config.Password `
        $target `
        $RemoteCommand

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

function Invoke-RemotePhpCommand {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$PhpCommand
    )

    $remoteCommand = "docker exec $ContainerName sh -lc " + (Quote-ShSingle("cd $ContainerProjectPath && $PhpCommand"))
    Invoke-RemoteHostCommand -Config $Config -RemoteCommand $remoteCommand
}

function Backup-RemoteFile {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$RemoteRelativePath
    )

    $remoteRelativePath = $RemoteRelativePath -replace "\\", "/"
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $source = "$($Config.RemotePath.TrimEnd('/'))/$remoteRelativePath"
    $backup = "$source.bak.$timestamp"
    $command = "cp " + (Quote-ShSingle $source) + " " + (Quote-ShSingle $backup)
    Invoke-RemoteHostCommand -Config $Config -RemoteCommand $command
    Write-Output "Backup created: $RemoteRelativePath.bak.$timestamp"
}

function Upload-RemoteFile {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$LocalPath,
        [Parameter(Mandatory = $true)]
        [string]$RemoteRelativePath
    )

    $resolvedLocalPath = Resolve-LocalPath $LocalPath
    if (-not (Test-Path $resolvedLocalPath)) {
        Fail "Local file not found: $resolvedLocalPath"
    }

    if ($Backup) {
        Backup-RemoteFile -Config $Config -RemoteRelativePath $RemoteRelativePath
    }

    $remoteRelativePath = $RemoteRelativePath -replace "\\", "/"
    $remoteTarget = "$($Config.User)@$($Config.Host):$($Config.RemotePath.TrimEnd('/'))/$remoteRelativePath"

    if ($DryRun) {
        Write-Output "[dry-run] upload $resolvedLocalPath -> $remoteTarget"
        return
    }

    & $Config.Pscp -batch -pw $Config.Password $resolvedLocalPath $remoteTarget
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

function Download-RemoteFile {
    param(
        [Parameter(Mandatory = $true)]
        $Config,
        [Parameter(Mandatory = $true)]
        [string]$RemoteRelativePath,
        [Parameter(Mandatory = $true)]
        [string]$LocalPath
    )

    $resolvedLocalPath = Resolve-LocalPath $LocalPath
    $localDir = Split-Path -Parent $resolvedLocalPath
    if ($localDir) {
        New-Item -ItemType Directory -Force -Path $localDir | Out-Null
    }

    $remoteRelativePath = $RemoteRelativePath -replace "\\", "/"
    $remoteSource = "$($Config.User)@$($Config.Host):$($Config.RemotePath.TrimEnd('/'))/$remoteRelativePath"

    if ($DryRun) {
        Write-Output "[dry-run] download $remoteSource -> $resolvedLocalPath"
        return
    }

    & $Config.Pscp -batch -pw $Config.Password $remoteSource $resolvedLocalPath
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

function Show-EnvCheck {
    param([Parameter(Mandatory = $true)]$Config)

    $maskedPassword = "*" * [Math]::Min($Config.Password.Length, 12)
    [pscustomobject]@{
        env_file = $EnvFile
        host = $Config.Host
        user = $Config.User
        password = $maskedPassword
        remote_path = $Config.RemotePath
        container = $ContainerName
        container_project_path = $ContainerProjectPath
        plink = $Config.Plink
        pscp = $Config.Pscp
    } | Format-List
}

$normalizedCommand = $Command.ToLowerInvariant()
$config = Get-BackendConfig

switch ($normalizedCommand) {
    "help" {
        Show-Usage
    }
    "env-check" {
        Show-EnvCheck -Config $config
    }
    "connect" {
        Invoke-RemoteHostCommand -Config $config -RemoteCommand "pwd"
    }
    "host-cmd" {
        $cmd = Join-CommandArguments $Arguments
        if (-not $cmd) {
            Fail "host-cmd requires a command string."
        }
        Invoke-RemoteHostCommand -Config $config -RemoteCommand $cmd
    }
    "php-cmd" {
        $cmd = Join-CommandArguments $Arguments
        if (-not $cmd) {
            Fail "php-cmd requires a command string."
        }
        Invoke-RemotePhpCommand -Config $config -PhpCommand $cmd
    }
    "route-list" {
        $pathFilter = Join-CommandArguments $Arguments
        $cmd = "php artisan route:list"
        if ($pathFilter) {
            $cmd += " --path=" + $pathFilter
        }
        Invoke-RemotePhpCommand -Config $config -PhpCommand $cmd
    }
    "read-file" {
        if (-not $Arguments -or $Arguments.Count -lt 1) {
            Fail "read-file requires <remotePath>."
        }
        $path = ($Arguments[0] -replace "\\", "/")
        $cmd = "cat " + (Quote-ShSingle $path)
        Invoke-RemotePhpCommand -Config $config -PhpCommand $cmd
    }
    "file-exists" {
        if (-not $Arguments -or $Arguments.Count -lt 1) {
            Fail "file-exists requires <remotePath>."
        }
        $path = ($Arguments[0] -replace "\\", "/")
        $cmd = "if [ -e " + (Quote-ShSingle $path) + " ]; then echo exists; else echo missing; fi"
        Invoke-RemotePhpCommand -Config $config -PhpCommand $cmd
    }
    "backup-file" {
        if (-not $Arguments -or $Arguments.Count -lt 1) {
            Fail "backup-file requires <remotePath>."
        }
        Backup-RemoteFile -Config $config -RemoteRelativePath $Arguments[0]
    }
    "upload-file" {
        if (-not $Arguments -or $Arguments.Count -lt 2) {
            Fail "upload-file requires <localPath> <remotePath>."
        }
        Upload-RemoteFile -Config $config -LocalPath $Arguments[0] -RemoteRelativePath $Arguments[1]
    }
    "download-file" {
        if (-not $Arguments -or $Arguments.Count -lt 2) {
            Fail "download-file requires <remotePath> <localPath>."
        }
        Download-RemoteFile -Config $config -RemoteRelativePath $Arguments[0] -LocalPath $Arguments[1]
    }
    "grep" {
        if (-not $Arguments -or $Arguments.Count -lt 1) {
            Fail "grep requires <pattern> [remotePath]."
        }
        $pattern = $Arguments[0]
        $searchPath = if ($Arguments.Count -ge 2) { $Arguments[1] } else { "." }
        $cmd = "grep -RIn -- " + (Quote-ShSingle $pattern) + " " + (Quote-ShSingle ($searchPath -replace "\\", "/"))
        Invoke-RemotePhpCommand -Config $config -PhpCommand $cmd
    }
    "bookmarks-check" {
        Invoke-RemotePhpCommand -Config $config -PhpCommand "php artisan route:list --path=api/bookmarks"
    }
    "notes-check" {
        Invoke-RemotePhpCommand -Config $config -PhpCommand "php artisan route:list --path=api/notes"
    }
    default {
        Fail "Unknown command: $Command`n`n$(Show-Usage | Out-String)"
    }
}
