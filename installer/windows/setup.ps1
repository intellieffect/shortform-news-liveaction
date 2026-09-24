#Requires -Version 5.1
<#
    Windows entry for this repository. The .cmd files at the repository root run this script.

      -Action Setup   install missing programs (winget, asks first), then Git LFS media,
                      npm packages, the pre-push hook, Python packages, the Claude plugin,
                      and API keys; ends with the doctor report
      -Action Check   read-only: program detection plus `produce doctor --installed`
      -Action Keys    ask for any empty API key in .env (hidden input) and save it

    Keys live in the repository .env, the same file every script already reads (README step 4).
    Nothing here prints a key or passes one on a command line, and the system execution policy
    is never changed.

    Adapted from the earlier hani-shortform-desktop installer (installer/windows/desktop.ps1).
    Source is ASCII so Windows PowerShell 5.1 parses it without a BOM.
#>
[CmdletBinding()]
param(
    [ValidateSet('Setup', 'Check', 'Keys')][string]$Action = 'Check',
    [string]$Project = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [switch]$InstallPrerequisites
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Windows only' }

# Node and the Python scripts emit UTF-8. Without this, Korean output is mojibake on cp949.
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$OutputEncoding = New-Object Text.UTF8Encoding($false)

$PREREQUISITES = @('node', 'git', 'git-lfs', 'python', 'ffmpeg', 'ffprobe')
# Only identifiers known exactly. A tool without an entry is reported as a manual install.
$WINGET_IDS = [ordered]@{
    node      = 'OpenJS.NodeJS.LTS'
    git       = 'Git.Git'
    'git-lfs' = 'GitHub.GitLFS'
    python    = 'Python.Python.3.12'
    ffmpeg    = 'Gyan.FFmpeg'
    ffprobe   = 'Gyan.FFmpeg'
}
$PYTHON_PACKAGES = @('pillow', 'numpy')
# Secret keys are read hidden; the rest are plain identifiers.
$SECRET_KEYS = @('PEXELS_API_KEY', 'PIXABAY_API_KEY', 'UNSPLASH_ACCESS_KEY', 'TYPECAST_API_KEY')
$PLAIN_KEYS = @('TYPECAST_VOICE_ID')
$DOCS = 'README.md'

function Find-Tool([string]$tool) {
    Get-Command $tool -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
}
# The Microsoft Store "python" alias exists but does not run; only a working --version counts.
function Test-Tool([string]$tool) {
    $command = Find-Tool $tool
    if (-not $command) { return $false }
    $versionArgs = @('--version')
    if ($tool -in @('ffmpeg', 'ffprobe')) { $versionArgs = @('-version') }
    try { & $command.Source @versionArgs *> $null } catch { return $false }
    return ($LASTEXITCODE -eq 0)
}
function Find-Python {
    foreach ($name in @('python', 'py')) { if (Test-Tool $name) { return (Find-Tool $name).Source } }
    return $null
}
# Reload Machine and User PATH after an install, keeping entries this session already had.
function Update-SessionPath {
    $registry = @()
    foreach ($scope in @('Machine', 'User')) {
        $value = [Environment]::GetEnvironmentVariable('Path', $scope)
        if ($value) { $registry += ($value -split ';') }
    }
    $merged = New-Object System.Collections.Generic.List[string]
    foreach ($entry in ($registry + ($env:Path -split ';'))) {
        if ($entry -and -not $merged.Contains($entry)) { $merged.Add($entry) | Out-Null }
    }
    $env:Path = ($merged -join ';')
}
function Invoke-Checked([string]$Executable, [string[]]$Arguments, [string]$What) {
    Write-Output "== $What"
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$What failed (exit $LASTEXITCODE)" }
}
function Get-ToolState {
    $state = @{}
    foreach ($tool in $PREREQUISITES) {
        $state[$tool] = $(if ($tool -eq 'python') { [bool](Find-Python) } else { Test-Tool $tool })
    }
    return $state
}

# --- project ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath (Join-Path $Project 'package.json') -PathType Leaf)) { throw "Not this repository (no package.json): $Project" }
if (-not (Test-Path -LiteralPath (Join-Path $Project 'scripts\produce.mjs') -PathType Leaf)) { throw "scripts\produce.mjs is missing: $Project" }
$envFile = Join-Path $Project '.env'
$envExample = Join-Path $Project '.env.example'

# --- .env keys -------------------------------------------------------------------------
function Read-EnvLines {
    if (Test-Path -LiteralPath $envFile -PathType Leaf) { return @([IO.File]::ReadAllLines($envFile, (New-Object Text.UTF8Encoding($false)))) }
    return @()
}
function Get-EnvValue([string[]]$lines, [string]$name) {
    foreach ($line in $lines) { if ($line -match "^\s*$name\s*=(.*)$") { return $Matches[1].Trim() } }
    return ''
}
function Set-EnvValue([System.Collections.Generic.List[string]]$lines, [string]$name, [string]$value) {
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*$name\s*=") { $lines[$i] = "$name=$value"; return }
    }
    $lines.Add("$name=$value")
}
function Invoke-Keys {
    if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
        if (-not (Test-Path -LiteralPath $envExample -PathType Leaf)) { throw ".env.example is missing: $envExample" }
        Copy-Item -LiteralPath $envExample -Destination $envFile
        Write-Output 'Created .env from .env.example'
    }
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($line in (Read-EnvLines)) { $lines.Add($line) }
    $changed = $false
    Write-Output 'Enter each empty key. Press Enter to skip one. Keys already filled are left as they are.'
    foreach ($name in ($SECRET_KEYS + $PLAIN_KEYS)) {
        if (Get-EnvValue $lines $name) { Write-Output "$name : already set"; continue }
        if ($name -in $SECRET_KEYS) {
            $secure = Read-Host "$name (hidden)" -AsSecureString
            $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            try { $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
            finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secure.Dispose() }
        } else {
            $value = Read-Host $name
        }
        $value = $value.Trim()
        if (-not $value) { Write-Output "$name : skipped"; continue }
        Set-EnvValue $lines $name $value
        $value = $null
        $changed = $true
        Write-Output "$name : saved"
    }
    if ($changed) { [IO.File]::WriteAllLines($envFile, $lines, (New-Object Text.UTF8Encoding($false))) }
}

if ($Action -eq 'Keys') { Invoke-Keys; return }

# --- prerequisites ---------------------------------------------------------------------
Update-SessionPath
$tools = Get-ToolState
$missing = @($PREREQUISITES | Where-Object { -not $tools[$_] })

if ($Action -eq 'Check') {
    foreach ($tool in $PREREQUISITES) { Write-Output ("{0,-8} {1}" -f $tool, $(if ($tools[$tool]) { 'ok' } else { 'MISSING' })) }
    Write-Output ("{0,-8} {1}" -f 'claude', $(if (Find-Tool 'claude') { 'ok' } else { 'MISSING' }))
    if (-not $tools['node']) { Write-Output "node is missing; run Setup first. See $DOCS"; exit 1 }
    Push-Location -LiteralPath $Project
    try { & (Find-Tool 'node').Source 'scripts/produce.mjs' 'doctor' '--installed'; $code = $LASTEXITCODE }
    finally { Pop-Location }
    Write-Output 'Detection only. It is not proof of sign-in, generation, render or audio quality.'
    if ($missing.Count -or $code -ne 0) { exit 1 }
    return
}

if ($missing.Count) {
    $winget = Find-Tool 'winget'
    $approved = [bool]$InstallPrerequisites
    if (-not $approved) {
        Write-Output ('Missing programs: ' + ($missing -join ', '))
        if ($winget) { $approved = ((Read-Host 'Install them with winget now? [y/N]') -match '^[yY]') }
    }
    if ($approved -and -not $winget) { throw "winget is not available. Install these manually and rerun: $($missing -join ', '). See $DOCS" }
    if ($approved) {
        foreach ($id in ($missing | ForEach-Object { $WINGET_IDS[$_] } | Where-Object { $_ } | Select-Object -Unique)) {
            # winget's exit code is not proof that the tool is usable; every tool is re-detected below.
            & $winget.Source install --id $id --exact --source winget --accept-package-agreements --accept-source-agreements --silent
        }
        Update-SessionPath
        $tools = Get-ToolState
        $missing = @($PREREQUISITES | Where-Object { -not $tools[$_] })
    }
}
if ($missing.Count) {
    throw "Still missing: $($missing -join ', '). Install them, open a new window, then run Setup again. See $DOCS"
}

# --- Setup -----------------------------------------------------------------------------
$node = (Find-Tool 'node').Source
$npm = (Find-Tool 'npm.cmd').Source
$git = (Find-Tool 'git').Source
$python = Find-Python
$remaining = New-Object System.Collections.Generic.List[string]

Push-Location -LiteralPath $Project
try {
    Invoke-Checked $git @('lfs', 'install', '--local') 'Enabling Git LFS for this repository'
    Invoke-Checked $git @('lfs', 'pull') 'Downloading media with Git LFS'
    Invoke-Checked $npm @('ci') 'Installing npm packages'
    Invoke-Checked $npm @('run', 'setup:hooks') 'Installing the pre-push hook'
    $pipArgs = @('-m', 'pip', 'install', '--user', '--disable-pip-version-check') + $PYTHON_PACKAGES
    if ((Split-Path -Leaf $python) -eq 'py.exe') { $pipArgs = @('-3') + $pipArgs }
    Invoke-Checked $python $pipArgs 'Installing Python packages'

    $claude = Find-Tool 'claude'
    if ($claude) {
        # Adding a marketplace that is already present fails harmlessly; the install below is what counts.
        & $claude.Source plugin marketplace add . *> $null
        Invoke-Checked $claude.Source @('plugin', 'install', 'shortform-news@shortform-news-workflow') 'Installing the Claude plugin'
    } else {
        $remaining.Add('Claude Code CLI is missing: install it, then run Setup again for the plugin')
    }
} finally { Pop-Location }

Invoke-Keys

Push-Location -LiteralPath $Project
try { & $node 'scripts/produce.mjs' 'doctor' '--installed'; $code = $LASTEXITCODE }
finally { Pop-Location }
if ($code -ne 0) { $remaining.Add("doctor reported problems (exit $code)") }

$remaining.Add('Connect Higgsfield in claude.ai (README step 5); this script cannot do or verify it')
Write-Output ''
Write-Output 'Remaining:'
foreach ($item in $remaining) { Write-Output " - $item" }
if ($code -ne 0) { exit 1 }
