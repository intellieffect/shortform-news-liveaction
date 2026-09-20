# news/ — 편별 자료·사실·대본

편 하나 = 폴더 하나. **폴더명이 곧 편 id** (snake_case 영소문자, 예 `hani_disc_flip`). 개명하지 않는다 — `pilots/<id>`·`public/pilots/<id>`·`out/pilots/<id>` 가 같은 id 로 묶인다.

> 2026-09-02 저장소 통합 전에는 별도 저장소 `shortform-news-input` 의 `work/<id>` 였다. 이력은 `git subtree` 로 그대로 들어와 있다.

## 편 폴더 구조

```
news/<id>/
├── README.md          상태판 — 단계별 ✅/⏳
├── 00_brief/          접수·1차 출처 추적 원문
├── 01_input/          ⚠ 원문 보존 구역 — 고치지 않는다
│   ├── MANIFEST.md    입력 자료 대장
│   ├── assets.json    ★ 경계 파일
│   ├── 01_원문_기사/  [원문]….md · ….article.json
│   └── 05_참고자료/   INDEX.md · RIGHTS.md · article_images/
└── 02_production/     파생물만
    ├── facts.md ★ · narration.json ★ · narration.txt · substitutions.json
    ├── narration_drafts/ · beats·overlays·shots·audio .json   (render.config 는 여기 없다 — pilots/<id>/ 소유)
    ├── [유튜브 제작용] ….md
    ├── external_assets/  SOURCES.md · <기관>/ · _rejected/ · _search/
    └── audio/ · voice_samples/ · scripts/ · credit_log.md
```

## 규칙

- **원문 보존.** `01_input/` 은 받은 그대로. 요약·각색은 `02_production/` 에서만. 대본 불일치는 고치지 말고 `facts.md` 에 적어 클라이언트 확인 항목으로.
- **근거 없는 숫자·고유명사·인용은 화면에 없다.** 모든 항목이 기사 문단 번호(¶)로 추적된다 — `facts.md`.
- **경계 파일 3개** `narration.json` · `assets.json` · `facts.md` — 이쪽이 쓰고 조립층이 읽는다.
- **라이선스는 페이지가 아니라 자산마다.** 같은 페이지·같은 크레딧이어도 항목마다 갈린다(6편 RAS 실측).
- **미디어는 gitignore.** 출처·경로의 정본은 `SOURCES.md` 와 `assets.json` 이다.
- **`pilots/<id>/` 는 이 폴더의 렌더 스냅샷**이다 — `npm run sync -- news/<id>` 로 만든다. 여기를 고치고 sync 를 안 하면 렌더 가드·gate·`check:all` 이 「낡았다」로 막는다. `pilot.json`·`render.config.json` 은 `pilots/<id>/` 소유라 여기 두지 않는다(2026-09-02 존치 결정). JSON 의 `root` 는 저장소 상대 `news/<id>` 로 적는다.

## 절차

`shortform-news` 플러그인의 `shortform-news-input` 스킬이 단일 소스다. 자료가 도착하면 그 스킬부터 로드한다.
