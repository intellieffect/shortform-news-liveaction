# 한겨레 숏폼 제작

기사 URL을 주고 “이 기사로 숏폼 만들어봐”라고 요청한다. 에이전트는 CLAUDE.md의 첫 진입 규칙에 따라 V2 제작 기준·프로젝트 설정을 읽는다. 자세한 프롬프트를 매번 입력할 필요는 없다.

## 처음 준비

Windows·macOS·Linux가 같은 절차를 쓴다. 아래를 차례로 실행한다.

**시작 전**: 저장소는 비공개다. 접근 권한이 있는 GitHub 계정으로 로그인해야 clone된다 — Windows에서는 첫 `git clone` 때 Git Credential Manager 로그인 창이 뜬다(권한 없으면 `could not read Username`). clone은 Git LFS로 약 280MB를 받아 몇 분 걸린다; 멈춘 것처럼 보여도 기다린다.

**Windows 빠른 설치**: 저장소 폴더에서 `설치 시작.cmd` 를 더블클릭하면 1·2·3·4·6단계를 한 번에 한다 — 빠진 프로그램은 물어본 뒤 winget으로 설치하고, API 키는 가려진 입력으로 받아 `.env` 에 적는다. 키만 다시 넣을 때는 `API 키 등록.cmd`, 상태만 볼 때는 `환경 점검.cmd`. 5단계(Higgsfield 연결)는 직접 한다. 스크립트는 `installer/windows/setup.ps1` 이고, 이전 한겨레 설치본(hani-shortform-desktop)의 Windows 설치 스크립트를 이 저장소 구조에 맞게 옮긴 것이다.

> 실측 상태: 이 절차는 macOS에서 끝까지 확인했다. Windows는 코드에서 운영체제 의존을 걷어냈고 검사를 `.github/workflows/portable-install.yml` 에 넣었지만, **아직 Windows에서 실제로 돌려보지 못했다.** 막히는 곳이 있으면 어느 단계에서 어떤 메시지가 났는지 알려주면 된다.

### 1. 필요한 프로그램

| 프로그램 | 쓰는 곳 | Windows 설치 예 |
|---|---|---|
| Node.js 20 이상 + npm | 렌더·검사 전체 | `winget install OpenJS.NodeJS.LTS` |
| Git + Git LFS | 저장소·미디어 실물 | `winget install Git.Git GitHub.GitLFS` |
| FFmpeg (ffmpeg·ffprobe 둘 다) | 오디오 측정·길이 확인 | `winget install Gyan.FFmpeg` |
| Python 3 | 자료 검색·내레이션·컷아웃 스크립트 | `winget install Python.Python.3.12` |
| Claude Code CLI | 제작 진행과 플러그인 | `npm install -g @anthropic-ai/claude-code --allow-scripts=@anthropic-ai/claude-code` |

winget 설치는 관리자 권한 확인(UAC) 창을 눌러야 진행된다 — 창이 작업 표시줄 뒤에 숨어 멈춘 것처럼 보일 수 있다. 설치 직후 **이미 열려 있던 터미널은 새 프로그램을 못 찾으므로** 새 창을 열어 다음 단계를 한다(`설치 시작.cmd` 는 알아서 다시 읽는다).

Python 쪽은 `pip install pillow numpy` 를 한 번 실행한다(스티커 컷아웃과 표현 레퍼런스 준비가 쓴다). Windows에서 명령 이름은 `python3` 이 아니라 `py` 또는 `python` 이다 — 스크립트가 알아서 찾으므로 그대로 두면 되고, 여러 벌이 깔려 있으면 `PYTHON_PATH` 로 고른다. 마찬가지로 FFmpeg가 여러 벌이면 `FFMPEG_PATH`·`FFPROBE_PATH` 로 고른다.

사람 목소리 WAV를 강제정렬할 때만 `whisperx` 가 더 필요하다 — Typecast 내레이션만 쓰면 없어도 된다. 믹스 측정(`npm run audio:measure`)은 셸 스크립트라 Windows에서는 Git Bash 같은 POSIX 셸에서 실행한다.

### 2. 저장소 준비

```console
git lfs pull
npm ci
npm run setup:hooks
```

`setup:hooks` 는 push 앞에 Git LFS 업로드를 건다.

### 3. 플러그인 설치

플러그인은 저장소 `plugin/` 에 들어 있다. 따로 내려받지 않고 루트에서 설치한다.

```console
claude plugin marketplace add ./
claude plugin marketplace update shortform-news-workflow
claude plugin install shortform-news@shortform-news-workflow
```

검수 에이전트(`@agent-shortform-news:…`)와 렌더 전 가드가 이걸로 활성화된다. 설치하지 않으면 제작 절차가 중간에 선다.

### 4. API 키

`.env.example` 을 `.env` 로 복사하고 값을 채운다. `.env` 는 Git에 올라가지 않는다.

| 키 | 발급처 |
|---|---|
| `PEXELS_API_KEY` | pexels.com/api |
| `PIXABAY_API_KEY` | pixabay.com/api/docs |
| `UNSPLASH_ACCESS_KEY` | unsplash.com/developers |
| `TYPECAST_API_KEY` · `TYPECAST_VOICE_ID` | typecast.ai — 음성은 계정마다 다르므로 쓸 voice_id를 함께 적는다 |

키를 채팅에 붙여넣지 않는다. 스크립트는 환경 변수를 먼저 보고, 없으면 `.env` 를 읽는다.

### 5. 생성 서비스 연결

이미지·영상 생성은 Higgsfield를 쓴다. API 키가 아니라 claude.ai의 커넥터로 **본인 계정**을 연결하며, 생성 크레딧도 그 계정에서 나간다. 연결하면 세션에 생성 도구가 붙고 지침이 그 도구를 호출한다. 연결하지 않았으면 제작을 시작하기 전에 알린다 — 다른 제공자로 조용히 바꾸지 않는다.

### 6. 점검

```console
node scripts/produce.mjs doctor --installed
```

프로그램 탐지, 채워진 키 이름(값은 읽지 않는다), 플러그인 설치 상태를 보여준다. 탐지는 실제 기사 수집·생성·렌더·시청 검증을 대신하지 않으므로, 실제 세션에서 스킬·검수 역할·생성·청취 도구가 쓸 수 있는지 따로 확인한다.

## 요청과 확정본

요청·수정·되돌리기와 확정본 찾는 법은 [사용 안내](docs/HANI-GUIDE.md)를 읽는다. 완성 영상은 `out/videos.html`에서 보고 내려받는다.

수정 요청은 “<기사 URL> 편에서 두 번째 장면을 고쳐줘”처럼 전달한다. 같은 기사는 같은 편을 이어서 고치고, 확정할 때마다 새 버전이 쌓이며 가장 마지막 버전이 확정본이다.

## 편이 쌓이는 방식

편은 `main`에서 바로 만들고, 확정할 때 그 편의 대본·데이터·장면 코드만 자동 커밋된다. 미디어와 완성 영상은 Git에 넣지 않는다(`out/`, `public/pilots/`, 편의 음성·생성 폴더). 워크트리·브랜치·push는 쓰지 않는다.


## 표현 레퍼런스

모든 새 영상은 [공통 표현 레퍼런스](references/visual/README.md)를 확인하고 기사별 연출을 설계한다. `npm run videos:serve`의 **표현 레퍼런스** 탭에서 세 기준 영상을 재생하고 제작 요청에 연결할 수 있다. start/resume도 동일한 세트와 해설을 제공한다.

새 제작의 화면 설계·생성·초기 시안·검수 연결: [변경 범위](docs/VISUAL-PRODUCTION-CHANGE.md) · [짧은 요청으로 새 세션 실증](docs/FRESH-SESSION-VALIDATION.md).
