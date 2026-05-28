[CmdletBinding()]
param(
    [string]$RepoPath = "",
    [string]$Remote = "origin",
    [string]$Branch = "",
    [string[]]$IncludePathspecs = @("*.md"),
    [switch]$NoPush,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line

    if ($script:LogFile) {
        Add-Content -LiteralPath $script:LogFile -Value $line
    }
}

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Get-GitOutput {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    $output = & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }

    return $output
}

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    $RepoPath = Join-Path $PSScriptRoot ".."
}

$RepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
Set-Location -LiteralPath $RepoPath

$gitDir = Get-GitOutput rev-parse --git-dir
if (-not [System.IO.Path]::IsPathRooted($gitDir)) {
    $gitDir = Join-Path $RepoPath $gitDir
}
$script:LogFile = Join-Path $gitDir "auto-git-sync.log"

Write-Log "Starting auto git sync in $RepoPath"

$insideWorkTree = Get-GitOutput rev-parse --is-inside-work-tree
if ($insideWorkTree -ne "true") {
    throw "$RepoPath is not inside a git work tree"
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = Get-GitOutput branch --show-current
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    throw "Cannot determine current branch. Pass -Branch explicitly."
}

$changedPaths = & git status --porcelain -- @IncludePathspecs
if ($LASTEXITCODE -ne 0) {
    throw "git status failed with exit code $LASTEXITCODE"
}

if (-not $changedPaths) {
    Write-Log "No matching changes found. Nothing to commit."
    exit 0
}

Write-Log "Found matching changes:"
$changedPaths | ForEach-Object { Write-Log "  $_" }

if ($DryRun) {
    Write-Log "Dry run enabled. No files were staged, committed, or pushed."
    exit 0
}

$addArgs = @("add", "--") + $IncludePathspecs
Invoke-Git @addArgs

& git diff --cached --quiet --exit-code
$diffExitCode = $LASTEXITCODE
if ($diffExitCode -eq 0) {
    Write-Log "No staged changes after git add. Nothing to commit."
    exit 0
}
elseif ($diffExitCode -ne 1) {
    throw "git diff --cached failed with exit code $diffExitCode"
}

$stagedFiles = Get-GitOutput diff --cached --name-only
Write-Log "Staged files:"
$stagedFiles | ForEach-Object { Write-Log "  $_" }

$date = Get-Date -Format "yyyy-MM-dd"
$message = "docs(leetcode): sync solutions $date"
Invoke-Git commit -m $message
Write-Log "Created commit: $message"

if ($NoPush) {
    Write-Log "NoPush enabled. Commit was created but not pushed."
    exit 0
}

Invoke-Git push $Remote $Branch
Write-Log "Pushed $Branch to $Remote"
