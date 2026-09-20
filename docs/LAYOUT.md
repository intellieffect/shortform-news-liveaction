# 저장소 층 구조 — 편 id 하나가 다섯 층을 묶는다

`CLAUDE.md` 에서 옮겨 온 규약과 그 근거. **CLAUDE.md 는 규칙만 두고 경위는 여기 둔다.**
편 폴더 내부 구조는 [news/README.md](../news/README.md), 편 대장은 [PILOTS.md](PILOTS.md)(생성물), 결정 원문은 [INDEX.md](INDEX.md).

## 전체 폴더와 찾는 순서

이 문서는 현재 경로와 소유 관계를 안내한다. 새 편의 제작 판단·절차는 [제작 스킬](../plugin/skills/shortform-news-pipeline/SKILL.md)과 [시작·재개 안내](../plugin/skills/shortform-news-pipeline/reference/production-entry.md)를 읽는다. 실험 당시의 원고·장면·스타일을 새 편의 기본값으로 가져오는 안내가 아니다.

```text
news/<id>/              편별 요청·기사 원문·자료·제작 계획
pilots/<id>/            렌더용 데이터·설정·완성본 대장
public/                 공통 폰트와 렌더용 미디어 캐시
design/thumbnails/      편별 썸네일 원본·시안·프롬프트
out/                    완성본·중간 출력·검수·실험 결과

src/                    영상 구현
  lib/                  공통 자막·그래픽·시간·모션 기능
  pilot/                비트 기반 영상과 검수판
  editorial/            개념 시간표 기반 영상과 검수판
    episodes/           편별 장면 구현·기준편 연결
    golden/             표준 경로로 이관된 기준편 장면
  experiments/          실험 전용 영상 구현
scripts/                실행 명령·생성·검증
  lib/                  공유 구현과 제작 상태·재개 기능
tests/                  테스트 실행 코드
  fixtures/             테스트 보조 코드·편집 검증용 기준 데이터
config/                 제작 엔진·현재 프로필·이전 프로필
plugin/                 배포하는 스킬·에이전트·훅·진입 스크립트
tools/motion-canvas/    별도 의존성을 갖는 도해 도구 프로젝트

experiments/            실험 설명·원고·실행 스크립트·자료 계획
docs/                   구조 안내·명세·제작 기록·조사와 결정 근거
.claude/                에이전트 설정·Remotion 스킬·로컬 워크트리
.claude-plugin/         로컬 플러그인 마켓플레이스 등록 정보
```

원문·대본은 `news/`, 영상 구현은 `src/`, 제작 절차는 `plugin/`, 결과는 `out/`에서 찾는다. 실험은 [실험 목록](../experiments/README.md)에서 코드·미디어·출력 경로를 함께 확인한다.

### 제작 방식과 코드의 경계

[엔진 판별 구현](../scripts/lib/engine.mjs)은 비트 기반 `script-faithful@1`과 개념 시간표 기반 `editorial-concept@1`을 구분한다. [Root](../src/Root.tsx)는 두 방식의 영상·검수판을 함께 등록한다. 현재 새 편 진입점의 엔진 계약은 [production-engine.json](../config/production-engine.json)에 있다.

| 경로 | 현재 책임 |
|---|---|
| `src/Composition.tsx`, `src/pilot/` | beats·overlays·shots를 사용하는 기존 제작 방식 |
| `src/editorial/Composition.tsx`, `Proof.tsx` | 컴파일된 timeline을 사용하는 영상·검수판 |
| `src/editorial/episodes/` | 편별 설명과 장면 구현. 데이터만으로 표현하지 않는 편 전용 코드도 여기 있다 |
| `src/editorial/golden/` | 은하·우주택배·로먼에서 실제 사용하는 이관 장면. 일부 공통 함수는 다른 편도 사용한다 |
| `src/lib/primitives/`, `src/lib/editorial/` | 공통 그래픽·자막·타이밍·모션 기능 |
| `src/experiments/` | 별도 entry로 실행하는 실험판 |

`golden/`의 [이관 경위](research/2026-09-05-editorial-concept-plugin/summary.md)와 [실제 연결 코드](../src/editorial/episodes/golden.tsx)를 참조한다. 실험 자료의 보존 여부와 정식 렌더러의 사용 여부를 폴더 이름만으로 판단하지 않는다.

### 설정·지침·실행의 위치

| 성격 | 정본 |
|---|---|
| 프로젝트 작업 규칙 | [CLAUDE.md](../CLAUDE.md) |
| 새 편 시작·재개와 환경 확인 | [production-entry.md](../plugin/skills/shortform-news-pipeline/reference/production-entry.md) |
| 제작 절차·입력 자료 처리 | `plugin/skills/` |
| 현재 제작 기본값 | [production-profile.json](../config/production-profile.json) |
| 이전 버전을 참조하는 편의 프로필 | `config/production-profiles/` — [읽기 구현](../scripts/lib/production-profile.mjs) |
| 엔진 실행 입구·작업 상태 | `scripts/produce.mjs`, `scripts/lib/production/` |
| 검증 역할·렌더 전 훅 | `plugin/agents/`, `plugin/hooks/` |
| 결정과 당시 근거 | `docs/research/<날짜>-<주제>/` → [색인](INDEX.md) |

플러그인 소스와 설치 캐시는 별개다. 실제 사용 경로와 설치본 차이를 확인하는 방법은 제작 진입 문서에 있다. 이 구조 안내에 플러그인 버전이나 자막 수치를 복사해 관리하지 않는다.

테스트 코드와 보조 자료는 `tests/`로 모았다. [테스트 안내](../tests/README.md)에 실행 명령·입력 의존성·검증 출력 위치가 있다. 기존 npm 명령과 전체 검사는 이 경로의 테스트를 실행한다.

## 편별 다섯 층

| 층 | 무엇 | git |
|---|---|---|
| `news/<id>/` | 기사·자료·대본. `01_input/`은 원문 보존, 파생 제작물은 `02_production/` | 문서·데이터 커밋, 미디어는 제외 |
| `pilots/<id>/` | 데이터 JSON + `pilot.json`(매니페스트) + `render.config.json` | 커밋 |
| `public/pilots/<id>/` | 파생 미디어 캐시 | 제외 — `npm run sync` · `restore:media` 로 복원 |
| `out/pilots/<id>/` | 렌더·QA 6층 (아래) | 제외 |
| `design/thumbnails/<id>/` | 생성 커버 PNG·brief·프롬프트·참조 입력·manifest (`v<N>/`). 과거 HTML은 재현용 보존 | 커밋 |

`pilots/active.json` → `npm run pilots:index` 가 `pilots/index.ts` 생성(생성 파일이지만 커밋).

```
out/pilots/<id>/
├ deliver/v<N>[-변종]/  납품본 + 부속물(썸네일·고지·MANIFEST). 불변 — 고칠 게 있으면 v<N+1>
├ deliver/LATEST        최신 판 심링크 하나
├ stage/                단계 렌더·후보·잔해. 언제든 삭제 가능
├ thumbnails/           단계 9 커버 출력본 — v<N>/에 요청한 시안 전체 보존. 납품 묶음 요청 시 새 deliver/v<N>/에 포함
├ qa/                   스틸·비트시트·슬라이드
├ assets/               소재 클립·수집 원본
└ hold/                 유실본 복구 후보(감사 HOLD). 판정 전까지 지우지 않는다
```

## 규약과 그 근거

- **편 id = `news/<id>` 폴더명 그대로**(snake_case). 번호는 이름이 아니라 `pilot.json.started` 로 파생한다. input 폴더를 개명하지 않는다.
- **`pilots/<id>/` 는 `news/<id>` 의 스냅샷이고 존치한다**(2026-09-02 재검토). 문제는 복사가 아니라 **낡음이 조용한 것**이었다 — 게이트가 12비트 사본을 판정했고, sync 가 `render.config` 편집을 5번 덮어썼다.
  → 낡음은 `scripts/lib/sync.mjs` 의 `syncStatus` 가 묻고 **렌더 가드·`gate`·`check:all` 이 막는다**. 「pilots/<id>/ 가 낡았다」가 나오면 `npm run sync -- news/<id>`.
  → `render.config.json` 은 **`pilots/<id>/` 소유** — sync 는 없을 때 기본값만 만들고 복사하지 않는다.
  → JSON 의 `root`·`pilot.json.input.path` 는 저장소 상대 `news/<id>` 로 적는다. 절대경로는 클론·워크트리에서 거짓이 된다.
- 비트 기반 공통 부품은 편 고유 요구를 데이터(부품 props)로 받는다. 현재 editorial 방식의 편별 장면 구현은 위 `src/editorial/episodes/` 경계를 따른다. 공통 부품을 고치면 `npm run still:all` 로 옛 편 회귀를 본다 — 납품편은 mp4+md5 가 산출물이지 재렌더 보장이 아니다(`engine_commit` 기록).

## 납품본 — 이름이 아니라 위치

규약 [2026-08-31 deliver-structure](research/2026-08-31-deliver-structure/summary.md). **실물 이관은 2026-08-31 에 끝났고 활성 편 전부가 이 구조다.**

- `deliver/` 안이면 완성본, 밖이면 중간물.
- 파일명은 `<id>_v<N>[-변종].mp4` 뿐 — `final`·`candidate`·`clean` 같은 **형용사 금지**(순서를 기록하지 못한다).
- 렌더 원본은 `.master.mp4`. **어느 파일이 그 판의 마스터인지는 이름이 아니라 대장 `versions[].master` 가 말한다**(2026-09-02 — 이름 짝 추론은 stage 의 `ShortformNews_*.master.mp4` 와 만나지 못해 죽은 코드였다). 마스터가 없으면 `null`, 지어내지 않는다.
- 해상도·길이·LUFS 는 이름이 아니라 `MANIFEST.txt` 로. **SoT 는 `pilot.json versions[]`**, `LATEST`·MANIFEST 는 파생물이다.
- **편 id 를 파일명 앞에 유지한다** — main `out/` 과 워크트리 `out/` 이름이 같으면 옛 영상이 열린다.
- **`out/archive/` 는 없앴다** — 편 밖에 산출물을 두면 어느 편 것인지 폴더가 말해주지 않는다(1편 유실본 2개가 2편 폴더에 있었다).
- **게시 조건 문서는 그 판의 폴더 안에** — 3편 `credits_description.txt` 는 v11 전용 고지인데 평면 폴더에서는 v10 것으로도 읽힌다.

## 새 편 시작·재개와 작업 공간

기사 URL·분량·사용자 요청으로 시작하는 현재 입구는 [시작·재개 안내](../plugin/skills/shortform-news-pipeline/reference/production-entry.md)에 있다. 실행 환경 확인, `produce start`, `produce resume`의 인자와 생성물은 그 문서를 따른다. 비트 기반 기존 생성기와 동기화 명령은 [명령 목록](../plugin/skills/shortform-news-pipeline/reference/commands.md)에서 용도를 확인한다.

작업은 별도 브랜치·워크트리에서 진행한다. 워크트리는 Git으로 추적하는 파일을 가져오므로 `news/`의 gitignored 원본 미디어, `public/pilots/` 캐시, `out/` 결과물은 별도 확인이 필요하다. 미디어가 없는 워크트리의 실패를 바로 제작 코드 결함으로 해석하지 않는다.

**워크트리 제거는 `npm run worktree:remove`** — `git worktree remove` 는 gitignore 된 것을 「없는 것」으로 취급해 조용히 지운다([사고 기록](research/2026-09-03-pipeline-restructure/incident-worktree-remove.md)).

## 편 밖의 출력과 실험 자료

- `out/gallery.html`은 현재 갤러리 생성 명령의 출력이다. 기존 위치를 유지한다.
- `out/experiments/<실험명>/`에는 실험 결과와 복원 묶음이 있다. 버전·출력 이력은 [실험 목록](../experiments/README.md)의 기록으로 찾아간다.
- `out/tmp/caption-layout-*`는 자막 검사의 새 임시 출력이다. 이전 `out/caption-layout-*` 파일은 원래 위치에 보존한다.
- `out/_audit/`, `references/`, `research/`, `production-structure/`, `viewers/`는 기존 작업의 자료다. 세부 보존 여부는 구조 정리 후속 조사 대상이다.

Git에서 제외된다는 사실이 삭제 가능하다는 뜻은 아니다. 편별 `deliver/`·`hold/` 및 실험 복원 묶음의 보존 근거를 함께 확인한다.

## 저장소 통합 (2026-09-02)

`shortform-news-input` 을 `news/` 로 합쳤다 — `git subtree` 라 이력이 그대로 조상으로 들어와 있다.
쪼갰던 이유(「input 세션·output 세션 둘을 동시에」)는 2026-08-31 단일 세션 모드로 폐기됐다.
원문 보존과 경계 파일은 **폴더 규약**으로 그대로 선다 — 저장소가 아니라 규칙이었다.
경위·무엇을 버렸나 = [2026-09-02 repo-merge](research/2026-09-02-repo-merge/summary.md). 옛 저장소 `~/Projects/shortform-news-input` 는 읽기 전용 보관.
