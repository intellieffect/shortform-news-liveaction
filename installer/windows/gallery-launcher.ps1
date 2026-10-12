# 한겨레 제작 영상 갤러리 실행기
# - 이 실행기가 띄운 서버만 기록(gallery-server.json)하고, 그 서버만 재사용·재시작한다.
# - 서버 코드가 바뀌었으면 기록된 서버만 종료하고 새로 띄운다.
# - 포트를 다른 프로그램이 쓰고 있으면 아무것도 종료하지 않고 안내만 한다.
$ErrorActionPreference = 'Stop'
# 이 파일은 installer\windows 안에 있다 — 저장소 루트는 두 단계 위다.
$ScriptDir = $(if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path })
$Repo = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$Port  = if ($env:VIDEO_LIBRARY_PORT) { [int]$env:VIDEO_LIBRARY_PORT } else { 4381 }
$Url   = "http://127.0.0.1:$Port/videos.html"
# 실행 기록은 Git에서 제외된 out\ 에 둔다.
$State = Join-Path $Repo 'out\gallery-server.json'
$CodeFiles = @(
  'scripts\serve-video-library.mjs',
  'scripts\lib\video-library-server.mjs',
  'scripts\lib\video-library.mjs',
  'scripts\lib\zip-stream.mjs',
  'scripts\lib\pilot.mjs'
)

function Open-Gallery { if ($env:GALLERY_NO_BROWSER) { Write-Host "열기: $Url" } else { Start-Process $Url } }

function Fail($msg) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($msg, '한겨레 제작 영상', 'OK', 'Warning') | Out-Null
  exit 1
}

function Get-CodeHash {
  $text = foreach ($f in $CodeFiles) {
    $p = Join-Path $Repo $f
    if (Test-Path $p) { "$f=" + (Get-FileHash $p -Algorithm SHA256).Hash }
  }
  ($text -join ';')
}

function Test-Gallery {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return ($r.StatusCode -eq 200 -and $r.Content -match '제작 영상')
  } catch { return $false }
}

function Test-PortBusy {
  $c = New-Object Net.Sockets.TcpClient
  try { $c.Connect('127.0.0.1', $Port); return $true } catch { return $false } finally { $c.Close() }
}

# 기록된 서버가 아직 살아 있는 바로 그 프로세스인지 (PID 재사용 방지: 시작 시각까지 비교)
function Get-ManagedProcess {
  if (-not (Test-Path $State)) { return $null }
  try { $s = Get-Content $State -Raw -Encoding UTF8 | ConvertFrom-Json } catch { return $null }
  $p = Get-Process -Id $s.pid -ErrorAction SilentlyContinue
  if ($p -and $p.ProcessName -eq 'node' -and $p.StartTime.ToString('o') -eq $s.started) {
    return @{ Process = $p; Hash = $s.hash }
  }
  return $null
}

if (-not (Test-Path (Join-Path $Repo 'scripts\serve-video-library.mjs'))) {
  Fail "저장소를 찾지 못했습니다:`n$Repo"
}
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) { Fail 'Node.js(node.exe)를 찾지 못했습니다.' }

$hash = Get-CodeHash
$managed = Get-ManagedProcess

if ($managed) {
  if ($managed.Hash -eq $hash -and (Test-Gallery)) {
    Write-Host '실행 중인 갤러리 서버를 재사용합니다.'
    Open-Gallery; exit 0
  }
  Write-Host '서버 코드가 바뀌었거나 응답이 없어 이 실행기가 띄운 서버만 다시 시작합니다.'
  Stop-Process -Id $managed.Process.Id -Force
  $managed.Process.WaitForExit(5000) | Out-Null
  Remove-Item $State -ErrorAction SilentlyContinue
}

if (Test-PortBusy) {
  if (Test-Gallery) {
    # 직접 띄운 갤러리 서버(npm run videos:serve 등). 종료하지 않는다.
    # 코드보다 먼저 시작된 서버면 수정 전 코드를 쓰는 중이므로 재사용하지 않고 안내한다.
    $newest = ($CodeFiles | % { Join-Path $Repo $_ } | ? { Test-Path $_ } | Get-Item |
      Measure-Object LastWriteTime -Maximum).Maximum
    $line = netstat -ano | Select-String ":$Port\s.*LISTENING" | Select-Object -First 1
    $owner = if ($line) { Get-Process -Id ([int](($line -split '\s+')[-1])) -ErrorAction SilentlyContinue }
    $started = try { $owner.StartTime } catch { $null }
    if ($started -and $started -gt $newest) {
      Write-Host '직접 실행된 갤러리 서버를 재사용합니다.'
      Open-Gallery; exit 0
    }
    Fail "포트 $Port 에서 이 실행기가 띄우지 않은 갤러리 서버(PID $($owner.Id))가 수정 전 코드로 실행 중일 수 있습니다.`n다른 작업을 보호하기 위해 종료하지 않았습니다.`n그 서버 창을 닫은 뒤 다시 실행해 주세요."
  }
  Fail "포트 $Port 을(를) 다른 프로그램이 사용 중이라 갤러리를 열 수 없습니다.`n해당 프로그램은 종료하지 않았습니다.`n그 프로그램을 닫은 뒤 다시 실행해 주세요."
}

$p = Start-Process -FilePath $node -ArgumentList 'scripts\serve-video-library.mjs' `
  -WorkingDirectory $Repo -WindowStyle Minimized -PassThru
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $State) | Out-Null
@{ pid = $p.Id; started = $p.StartTime.ToString('o'); hash = $hash; repo = $Repo } |
  ConvertTo-Json | Set-Content $State -Encoding UTF8

for ($i = 0; $i -lt 60; $i++) {
  if ($p.HasExited) { Remove-Item $State -ErrorAction SilentlyContinue; Fail '갤러리 서버가 시작 직후 종료되었습니다. 저장소 상태를 확인해 주세요.' }
  if (Test-Gallery) { Open-Gallery; exit 0 }
  Start-Sleep -Milliseconds 500
}
Fail '갤러리 서버가 30초 안에 준비되지 않았습니다.'
