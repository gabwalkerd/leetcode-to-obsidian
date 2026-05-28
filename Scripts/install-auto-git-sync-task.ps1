[CmdletBinding()]
param(
    [string]$RepoPath = "",
    [string]$TaskName = "LeetCode Auto Git Sync",
    [string]$Time = "23:20",
    [string]$Remote = "origin",
    [string]$Branch = "",
    [string[]]$IncludePathspecs = @("*.md")
)

$ErrorActionPreference = "Stop"

if ($Time -notmatch "^(?<Hour>[01]?\d|2[0-3]):(?<Minute>[0-5]\d)$") {
    throw "Time must use HH:mm format, for example 23:20."
}

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    $RepoPath = Join-Path $PSScriptRoot ".."
}

$RepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
$syncScript = Join-Path $RepoPath "scripts\auto-git-sync.ps1"
if (-not (Test-Path -LiteralPath $syncScript)) {
    throw "Cannot find sync script: $syncScript"
}

$at = (Get-Date).Date.AddHours([int]$Matches.Hour).AddMinutes([int]$Matches.Minute)
$quotedPathspecs = $IncludePathspecs | ForEach-Object { "`"$($_ -replace '"', '\"')`"" }
$pathspecArgs = "-IncludePathspecs $($quotedPathspecs -join ' ')"
$branchArgs = ""
if (-not [string]::IsNullOrWhiteSpace($Branch)) {
    $branchArgs = "-Branch `"$Branch`""
}

$arguments = @(
    "-NoProfile",
    "-ExecutionPolicy Bypass",
    "-File `"$syncScript`"",
    "-RepoPath `"$RepoPath`"",
    "-Remote `"$Remote`"",
    $branchArgs,
    $pathspecArgs
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$powershellArguments = $arguments -join " "
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $powershellArguments `
    -WorkingDirectory $RepoPath

$trigger = New-ScheduledTaskTrigger -Daily -At $at
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal `
    -UserId $userId `
    -LogonType Interactive `
    -RunLevel Limited

$description = "Commits matching LeetCode solution changes and pushes them to GitHub every day before 23:30."

try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description $description `
        -Force | Out-Null
}
catch {
    $registerError = $_.Exception.Message
    $taskCommand = "powershell.exe $powershellArguments"

    & schtasks.exe /Create /TN $TaskName /SC DAILY /ST ($at.ToString("HH:mm")) /TR $taskCommand /F
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to register scheduled task. Try running PowerShell as Administrator. Register-ScheduledTask error: $registerError"
    }
}

Write-Host "Registered scheduled task '$TaskName' for $($at.ToString('HH:mm')) as $userId."
Write-Host "Sync script: $syncScript"
