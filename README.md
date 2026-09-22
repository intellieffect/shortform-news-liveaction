# 한겨레 숏폼 제작

기사 URL을 주고 “이 기사로 숏폼 만들어봐”라고 요청한다. 에이전트는 CLAUDE.md의 첫 진입 규칙에 따라 V2 제작 기준·프로젝트 설정을 읽는다. 자세한 프롬프트를 매번 입력할 필요는 없다.

## 처음 준비

Windows·macOS·Linux가 같은 절차를 쓴다. 자동 설치 프로그램은 제공하지 않으며 아래를 차례로 실행한다.

> 실측 상태: 이 절차는 macOS에서 끝까지 확인했다. Windows는 코드에서 운영체제 의존을 걷어냈고 검사를 `.github/workflows/portable-install.yml` 에 넣었지만, **아직 Windows에서 실제로 돌려보지 못했다.** 막히는 곳이 있으면 어느 단계에서 어떤 메시지가 났는지 알려주면 된다.

### 1. 필요한 프로그램

| 프로그램 | 쓰는 곳 | Windows 설치 예 |
|---|---|---|
| Node.js 20 이상 + npm | 렌더·검사 전체 | `winget install OpenJS.NodeJS.LTS` |
| Git + Git LFS | 저장소·미디어 실물 | `winget install Git.Git Git.GitLFS` |
| FFmpeg (ffmpeg·ffprobe 둘 다) | 오디오 측정·길이 확인 | `winget install Gyan.FFmpeg` |
| Python 3 | 자료 검색·내레이션·컷아웃 스크립트 | `winget install Python.Python.3.12` |
| Claude Code CLI | 제작 진행과 플러그인 | 설치 안내는 Anthropic 문서 |

Python 쪽은 `pip install pillow numpy` 를 한 번 실행한다(스티커 컷아웃과 표현 레퍼런스 준비가 쓴다). Windows에서 명령 이름은 `python3` 이 아니라 `py` 또는 `python` 이다 — 스크립트가 알아서 찾으므로 그대로 두면 되고, 여러 벌이 깔려 있으면 `PYTHON_PATH` 로 고른다. 마찬가지로 FFmpeg가 여러 벌이면 `FFMPEG_PATH`·`FFPROBE_PATH` 로 고른다.

사람 목소리 WAV를 강제정렬할 때만 `whisperx` 가 더 필요하다 — Typecast 내레이션만 쓰면 없어도 된다. 믹스 측정(`npm run audio:measure`)은 셸 스크립트라 Windows에서는 Git Bash 같은 POSIX 셸에서 실행한다.

### 2. 저장소 준비

```console
git lfs pull
npm ci
npm run setup:hooks
```

`setup:hooks` 는 이 저장소의 공유 검사와 LFS 업로드를 push 앞에 건다.

### 3. 플러그인 설치

플러그인은 저장소 `plugin/` 에 들어 있다. 따로 내려받지 않고 루트에서 설치한다.

```console
claude plugin marketplace add .
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

## 수록 예시 확인

[최신 N44 예시](docs/CUSTOMER-EXAMPLE.md)에서 완성 영상·썸네일·출처·검수 한계를 확인한다. `npm run studio`로 장면을 연다. 이 예시는 검수 미완료 상태이므로 delivered 편만 표시하는 `npm run videos` 목록에는 나오지 않는다. 위 예시 링크로 완성 시안을 직접 연다.

수정 요청은 “N44에서 가스가 모이는 장면을 수정해줘”처럼 전달한다. 새 세션은 해당 편을 지정해 이어서 진행한다. 새 기사는 예시 대본·장면을 복제하지 않고 기사에 맞게 설계한다.

## 로컬 제작과 공유

[동일 로컬·원격 운영 안내](docs/LOCAL-AND-SHARED.md)를 따른다. 기존 자료는 현재 위치에 보존한다. 코드·지침·설정을 별도 고객 버전으로 변환하지 않는다. 공유 선정은 config/shared-episodes.json, 로컬 활성은 pilots/local.json에서 구분한다. 원격에 올리기로 지정한 편만 파일 검사 후 일반 커밋으로 추가한다.

## 표현 레퍼런스

모든 새 영상은 [공통 표현 레퍼런스](references/visual/README.md)를 확인하고 기사별 연출을 설계한다. `npm run videos:serve`의 **표현 레퍼런스** 탭에서 세 기준 영상을 재생하고 제작 요청에 연결할 수 있다. start/resume도 동일한 세트와 해설을 제공한다.

새 제작의 화면 설계·생성·초기 시안·검수 연결: [변경 범위](docs/VISUAL-PRODUCTION-CHANGE.md) · [짧은 요청으로 새 세션 실증](docs/FRESH-SESSION-VALIDATION.md).
