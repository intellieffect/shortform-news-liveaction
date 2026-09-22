# shortform-news — 숏폼 뉴스 제작 플러그인

**`plugin/` 이 납품 단위다.** 제작 판단 — 절차(스킬)·분리된 검증(에이전트)·렌더 전 가드(훅) — 를 담아, 한겨레가 우리 없이 기사 한 편을 9:16 뉴스 영상으로 만들 수 있게 하는 것이 목표다. 영상이 아니라 이 능력이 계약의 산출물이다 (근거 (과거 내부 기록·로컬 보관)).

## 안에 있는 것

| 경로 | 역할 |
|---|---|
| `skills/shortform-news-input/` | 자료 수령·원문 보존·사실 잠금·소싱 — 편의 **입력** 쪽 절차 |
| `skills/shortform-news-pipeline/` | `script-faithful` 비트 조립과 `editorial-concept@1` 개념 장면 제작·검토 — 편의 **출력** 쪽 절차. 썸네일은 [전체 이미지 생성·검수](skills/shortform-news-pipeline/reference/cover-build.md)로 제작. `reference/`가 세부 |
| `agents/` | 만든 사람이 검증하지 않는다 — 착수 실측·소싱·설명 구조·화면·팩트 대조를 fresh 컨텍스트가 본다. 계약은 [reference/agents.md](skills/shortform-news-pipeline/reference/agents.md) |
| `hooks/hooks.json` | 렌더 명령 앞에 `shots:check` 가드. **선언만** 배포 — 구현은 저장소 `scripts/pre-render-guard.mjs`, 없는 프로젝트에서는 fail-open |

## 기사 위임 제작 후보 트랙

기사 기반 제작을 위임받은 편은 `editorial-concept@1`을 쓴다. `story.json → concepts.json → motion.json → timeline.json`으로 설명 단위와 발화 단위를 분리하고, 편별 장면은 표준 editorial Composition이 이 timeline을 받아 그린다. sync·Studio·still·render·렌더 전 검사는 legacy `beats/overlays/shots` 없이 이어진다. 기존 `script-faithful@1`은 제공 대본을 잠가야 하는 편을 위해 유지한다. 후보 트랙의 계약과 승격 기준은 [editorial-concept-track.md](skills/shortform-news-pipeline/reference/editorial-concept-track.md)에 있다.

구성 요소의 이름과 수는 `.claude-plugin/plugin.json` 과 각 폴더가 말한다 — 이 문서에 개수를 적지 않는다.

새 기사 진입, 설치본과 실행 엔진의 연결, 실제 도구 확인은 [production-entry.md](skills/shortform-news-pipeline/reference/production-entry.md)를 따른다. 현재 버전은 manifest에서 읽으며, 개발 소스와 실제 사용 중인 설치본의 버전을 구분한다.

## 설치

이 플러그인은 저장소 안에 들어 있다 — 따로 내려받지 않는다. 저장소 루트에서:

```console
claude plugin marketplace add .
claude plugin install shortform-news@shortform-news-workflow
```

`marketplace add .` 는 루트의 `.claude-plugin/marketplace.json` 을 읽고, 그 항목이 `./plugin` 을 가리킨다. 설치 뒤 `@agent-shortform-news:<이름>` 검수 에이전트와 렌더 전 가드가 활성화된다 — 이것들 없이는 제작 절차가 돌지 않는다.

## 고칠 때

```console
claude --plugin-dir ./plugin      # 저장소 사본으로 띄우고 /reload-plugins
claude plugin validate ./plugin --strict
```

고칠 때마다 `.claude-plugin/plugin.json` 의 `version` 을 올린다 — 안 올리면 설치본이 캐시를 계속 쓴다. 버전은 `plugin.json` 에만 둔다(`marketplace.json` 에는 안 쓴다).
