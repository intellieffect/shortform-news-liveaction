#Requires -Version 5.1
<#
    내레이션 보이스(TYPECAST_VOICE_ID)를 바꾼다.

    이름으로 검색 → 목록에서 번호 선택 → 저장소 .env 의 TYPECAST_VOICE_ID·
    TYPECAST_VOICE_NAME 을 고쳐 쓴다. .env 는 Git 에 올라가지 않는다.

    목록은 .env 의 TYPECAST_API_KEY 로 Typecast 계정에서 직접 받아오므로,
    그 계정에 실제로 있는 보이스만 나온다. 조회는 무료이고 음성을 만들지 않는다.

    실행: "보이스 변경.cmd" 더블클릭
          또는  powershell -NoProfile -ExecutionPolicy Bypass -File installer\windows\change-voice.ps1
          비대화형으로 바로 지정: -VoiceId tc_xxxx -VoiceName 이름
#>
[CmdletBinding()]
param(
    [string]$VoiceId,
    [string]$VoiceName
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)

# 이 파일은 installer\windows 안에 있다 — 저장소 루트는 두 단계 위다.
$ScriptDir = $(if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path })
$Repo = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$ENV_FILE = Join-Path $Repo '.env'
$UTF8 = New-Object Text.UTF8Encoding($false)

function Get-EnvValue([string]$name) {
    foreach ($line in [IO.File]::ReadAllLines($ENV_FILE, $UTF8)) {
        if ($line -match "^\s*$name\s*=(.*)$") { return $Matches[1].Trim() }
    }
    return ''
}
function Set-EnvValues([hashtable]$pairs) {
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($line in [IO.File]::ReadAllLines($ENV_FILE, $UTF8)) { $lines.Add($line) | Out-Null }
    foreach ($name in $pairs.Keys) {
        $done = $false
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^\s*$name\s*=") { $lines[$i] = "$name=$($pairs[$name])"; $done = $true }
        }
        if (-not $done) { $lines.Add("$name=$($pairs[$name])") | Out-Null }
    }
    [IO.File]::WriteAllLines($ENV_FILE, $lines, $UTF8)
}

if (-not (Test-Path -LiteralPath $ENV_FILE -PathType Leaf)) { throw ".env 가 없다: $ENV_FILE — 먼저 `API 키 등록.cmd` 를 실행한다." }

Write-Output "현재 보이스: $(Get-EnvValue 'TYPECAST_VOICE_NAME')  ($(Get-EnvValue 'TYPECAST_VOICE_ID'))"
Write-Output ''

# --- 비대화형: 값이 주어지면 바로 쓴다 -------------------------------------------
if ($VoiceId) {
    Set-EnvValues @{ TYPECAST_VOICE_ID = $VoiceId; TYPECAST_VOICE_NAME = $(if ($VoiceName) { $VoiceName } else { $VoiceId }) }
    Write-Output "바꿨다: $(Get-EnvValue 'TYPECAST_VOICE_NAME')  ($VoiceId)"
    return
}

# --- 계정의 보이스 목록 -----------------------------------------------------------
$key = Get-EnvValue 'TYPECAST_API_KEY'
if (-not $key) { throw ".env 에 TYPECAST_API_KEY 가 없다. 먼저 키를 넣는다." }

Write-Output '보이스 목록을 받는 중…'
try {
    $voices = Invoke-RestMethod -Uri 'https://api.typecast.ai/v1/voices' -Headers @{ 'X-API-KEY' = $key } -TimeoutSec 60
} catch { throw "목록을 못 받았다: $($_.Exception.Message)" }
Write-Output "계정의 보이스 $($voices.Count)개"
Write-Output ''

# --- 검색 → 선택 -------------------------------------------------------------------
while ($true) {
    $term = Read-Host '이름 일부를 입력한다 (그냥 Enter 치면 취소)'
    if (-not $term) { Write-Output '취소했다. .env 는 그대로다.'; return }

    $hits = @($voices | Where-Object { $_.voice_name -like "*$term*" } | Select-Object -First 30)
    if (-not $hits.Count) { Write-Output "'$term' 에 맞는 보이스가 없다. 다시 입력한다."; Write-Output ''; continue }

    for ($i = 0; $i -lt $hits.Count; $i++) {
        Write-Output ("  {0,2}. {1,-28} {2}" -f ($i + 1), $hits[$i].voice_name, $hits[$i].voice_id)
    }
    Write-Output ''
    $pick = Read-Host '번호를 고른다 (다시 검색하려면 Enter)'
    if (-not $pick) { Write-Output ''; continue }

    $index = 0
    if (-not [int]::TryParse($pick, [ref]$index) -or $index -lt 1 -or $index -gt $hits.Count) {
        Write-Output '번호가 범위를 벗어났다.'; Write-Output ''; continue
    }
    $chosen = $hits[$index - 1]
    Set-EnvValues @{ TYPECAST_VOICE_ID = $chosen.voice_id; TYPECAST_VOICE_NAME = $chosen.voice_name }
    Write-Output ''
    Write-Output "바꿨다: $($chosen.voice_name)  ($($chosen.voice_id))"
    Write-Output '다음 내레이션 생성부터 적용된다. 이미 만든 편의 음성은 다시 만들어야 바뀐다.'
    return
}
