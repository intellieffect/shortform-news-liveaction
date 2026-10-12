# 현재 로그인한 계정의 실제 바탕화면(OneDrive·폴더 리디렉션 반영)에 바로가기를 만든다.
$desktop = [Environment]::GetFolderPath('Desktop')
# 이 파일은 installer\windows 안에 있다 — 저장소 루트는 두 단계 위다.
$ScriptDir = $(if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path })
$Repo = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$target  = Join-Path $Repo '제작 영상 열기.cmd'
$lnk = Join-Path $desktop '한겨레 제작 영상.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = $target
$s.WorkingDirectory = $Repo
$s.WindowStyle = 7
$s.IconLocation = "$env:SystemRoot\System32\imageres.dll,189"
$s.Description = '한겨레 제작 영상 갤러리 열기'
$s.Save()
Write-Host "계정: $env:USERNAME"
Write-Host "바로가기를 만들었습니다: $lnk"