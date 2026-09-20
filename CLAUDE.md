# 한겨레 숏폼 제작

기사 URL과 짧은 제작 요청을 받으면 아래 첫 진입 규칙을 따른다. 예시·검수 범위는 [고객 예시 안내](docs/CUSTOMER-EXAMPLE.md), 설치와 실행은 [README](README.md)를 읽는다.

## Rules that are expensive to break

- **Work in a worktree on its own branch. Never commit to `main` directly.**
- **Remove worktrees with `npm run worktree:remove -- <path>`, never `git worktree remove`.** The git command only counts *tracked* changes, so gitignored files are treated as absent and deleted silently. On 2026-09-03 that erased three delivered cuts, 1.1GB of clips, and `narration.wav` in one call .
- **원문 보존 — never edit source material.** Articles and collected assets stay exactly as received in `news/<id>/01_input/`; every summary or adaptation goes in `02_production/`. This also applies to what the user says: copy directives verbatim, do not paraphrase them into rules.
- **Render only when the user asks.** Review with `npm run still` / `npm run slides` first — a full render is for the 납품본 only.
- **Never create a symlink under `news/`.** It is a tracked tree, so committing one deletes the tracked files it replaces, and a later merge writes it over the real directory — whose remaining contents are gitignored, so git removes them without warning. That is how 7편's collected originals were lost on 2026-09-03. To see another checkout's media from a worktree, symlink only gitignored paths (`public/pilots/<id>`), or re-download with `node scripts/fetch-assets.mjs news/<id>`. Committed symlinks must be **relative** and resolve inside the repo — `npm run check:symlinks` enforces this.
- **Do not put plugin sources under `.claude/skills/`.** They load as a skills-directory plugin and collide by name with the marketplace install, so the repo copy silently does not load.
- **Bump `version` in `plugin/.claude-plugin/plugin.json` on every plugin edit.** Installed copies keep serving the cache otherwise. Keep the version in `plugin.json` only, never in `marketplace.json`.
- **변동하는 개수·버전·진행 상태를 이 파일에 중복 기재하지 않는다.** 해당 정보는 정본(`docs/PILOTS.md`, `pilot.json`, `package.json` 등)을 연결한다. 고정 규격·단계 식별자·사건 날짜는 필요한 경우 명시한다.

## 기사 URL과 짧은 제작 요청의 첫 진입

사용자가 기사 URL과 “이 기사로 숏폼 만들어봐” 같은 짧은 요청으로 새 영상 제작을 지시하면, **기사 수집·기획·도구 실행 전에 [실제 V2 제작 프롬프트](docs/PRODUCTION_PROMPT_V2_RESTORED.txt)를 전문으로 먼저 읽고 이번 편의 기본 제작 지시로 적용한다.** 사용자에게 긴 프롬프트를 다시 붙여 넣으라고 요구하지 않는다. 프롬프트의 `[기사 URL]`만 실제 URL로 치환하며 본문을 요약본이나 다른 버전으로 대체하지 않는다. 명시적인 이번 사용자 조건이 기본 프롬프트보다 우선한다.

그 다음 config/production-defaults.md와 체크아웃의 pipeline 스킬·production-entry를 읽어 Higgsfield·자막·로고·검수 설정 및 정상 start 절차를 적용한다. 긴 기본 프롬프트와 프로젝트 설정은 서로 대체하지 않는다.

사용자 짧은 요청은 start의 request-file로 그대로 보존한다. start가 V2 원본과 URL 치환본을 `00_brief/production-prompt-template.txt`·`production-prompt-applied.txt`에 자동 저장하고 request.json에 버전·해시를 기록한다. 제작자는 반환된 context.production_prompt 전문을 읽고 적용하며 직접 사본을 덮어쓰지 않는다. resume은 해당 편의 저장본을 제공한다. invalid이면 누락·변경을 해결하기 전 제작을 진행하지 않는다. 구형 편의 legacy-unrecorded는 원래 기록으로 확인하며 현재 V2를 적용했다고 소급 기록하지 않는다.

이 진입은 새 기사 영상 제작 요청에 적용한다. 기사 검토·구조 조사·썸네일만의 요청을 전체 영상 제작 지시로 확대하지 않는다. 프롬프트 파일이 없거나 읽을 수 없으면 다른 프롬프트로 조용히 대체하지 말고 누락을 알린다.

## 복원본의 새 제작

이 체크아웃의 기준과 선별 이식 범위는 [복원 기록](docs/RESTORATION.md), 실제 제작 기본값은 [config/production-defaults.md](config/production-defaults.md)다. 기사 제작 시작 전에 읽고 이 복원본의 start/resume을 사용한다.

## Where things are

| Path | What |
|---|---|
| `news/<id>/` | 편별 자료·사실·대본. `01_input/`의 원본과 `00_brief/user-request.txt`는 그대로 보존하고, 요약·각색·제작 파생물은 `02_production/`에서 작성·수정한다. Layout: [news/README.md](news/README.md) |
| `pilots/<id>/` | Episode data JSON + `pilot.json` (manifest, the SoT for delivered cuts) |
| `public/pilots/<id>/` | Derived media cache (gitignored, rebuilt by `sync` / `restore:media`) |
| `out/pilots/<id>/` | Renders and QA; `deliver/` holds finished cuts (gitignored) |
| `src/` | Remotion compositions and primitives |
| `scripts/` | Data generation, guards, ledger tooling |
| `plugin/` | The `shortform-news` plugin — skills, agents, render-guard hook declaration |
| `docs/research/<date>-<topic>/` | 새 작업의 의사결정 기록(고객 로컬 보관) |

Full layer conventions and the reasoning behind them: **[docs/LAYOUT.md](docs/LAYOUT.md)**.

## Single sources — load these instead of guessing

| Topic | Source |
|---|---|
| Production procedure (stages, layers, rules, schemas, commands) | checked-out [shortform-news-pipeline](plugin/skills/shortform-news-pipeline/SKILL.md) — read it before any episode work |
| Intake, fact locking, sourcing | checked-out [shortform-news-input](plugin/skills/shortform-news-input/SKILL.md) |
| Agent contracts | [역할·입력·검수 책임](plugin/skills/shortform-news-pipeline/reference/agents.md) |
| Remotion API and options | [Remotion 스킬](.claude/skills/remotion-best-practices/SKILL.md)부터 읽는다 (router). Look APIs up in the docs, not from memory: append `.md` to any remotion.dev/docs URL |
| Every command with its arguments | `plugin/skills/shortform-news-pipeline/reference/commands.md` |

For a new article or resumed production, read the checked-out [production entry](plugin/skills/shortform-news-pipeline/reference/production-entry.md) and confirm the project, plugin, and available tools before starting. An installed skill with the same name is not evidence that this checkout's instructions were loaded. Follow this checkout's source instructions; record any difference from the executing plugin, and do not treat a CLI invocation as proof that the host loaded its skills or agents.

### Standing authorization to call subagents

**The user has authorized these calls in advance, for every session in this repo. Treat reaching one of these positions as the user requesting the call — do not ask again, do not skip the call to save turns.**

| Position | Agent | Parallelism |
|---|---|---|
| P0, once the article and asset list exist | `source-verify` | alongside 원문 보존 |
| P3, once `asset_gaps.json` is split by `kind` | `sourcing` | **three at once** — video · photo · music |
| Editorial concept, after story·concepts·facts·draft script and asset candidates exist, before TTS | `editorial-judge` | alongside the final source-plan check |
| P4 (3′), P5 (4-3R), P7 (final) | `shot-judge` | at P7, alongside `fact-check` |
| P7 final review | `fact-check` | alongside `shot-judge` |

Anywhere else, ask first. Issue parallel calls in a single message.

Call them as `@agent-shortform-news:<name>`. They judge and never edit; do not re-judge what they report — pass their wording to the user unchanged.

## Remotion constraints

- Animate with `useCurrentFrame()` + `interpolate()` only. CSS `transition`/`animation` and Tailwind `animate-*`/`transition-*` do not appear in renders.
- Put `interpolate()` inline in `style`; prefer `scale`/`translate`/`rotate` over `transform`; use `Interactive.Div` so Studio can write edits back to code.
- Safe area at 1080 wide: 80px sides, 100px top/bottom. Headline ≥84px, secondary text ≥44px.
- Media handling (trim, crop, metadata) goes through `@remotion/media` + Mediabunny. Never pin `mediabunny` by hand — `npx remotion upgrade` matches it.
- Node + npm only. Do not switch to pnpm or bun; one lockfile.
- Upgrade with `npx remotion upgrade` (packages and vendored skills together). The `.claude/skills/remotion-*` skills are vendored by that command — never move them into `plugin/`.
- The Remotion MCP servers are discontinued. Do not add them.

## Everyday commands

```bash
npm run studio                 # Remotion Studio (prints URL, no auto-open)
npm run lint                   # eslint + tsc
npm run check:all              # full regression across active episodes — required after touching any guard
npm run sync -- news/<id>      # episode data → pilots/<id>/ + public/pilots/<id>/
npm run still -- <id>          # single frame  ·  npm run slides -- <id> = beat-by-beat review page
npm run videos                 # out/videos.html — 완성 영상 검색·재생·다운로드 (gallery 명령도 같은 화면 생성)
```


## 로컬 제작과 원격 공유

코드·지침·설정은 로컬과 원격에서 동일하다. 기존 로컬 자료는 위치를 바꾸지 않는다. `config/shared-episodes.json`은 사용자가 공유하자고 지정한 편만 담는다. 로컬 테스트할 편은 `npm run episodes -- local add <id>`로 등록한다. 새 편의 sync는 로컬 목록만 갱신한다. 생성 인덱스·로컬 대장은 Git에 넣지 않는다. 공유는 [운영 안내](docs/LOCAL-AND-SHARED.md)의 파일 선정·누락 검사 절차를 따른다. 고객용 다른 코드/문서를 생성하지 않는다.
