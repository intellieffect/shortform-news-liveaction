# 명령·토글·QA

새 기사 시작·도구·플러그인 연결은 [production-entry.md](production-entry.md)의 `start`와 `doctor`를 사용한다. 현재 작업·재개·변경 영향은 `npm run produce -- resume <id>`에서 확인한다. 명령과 상태의 계약은 [production-state.md](production-state.md)에 있다. 실물 검수 템플릿·이슈 수정·최종 완료는 [review-loop.md](review-loop.md)의 `review-template`, `resolve`, `complete`를 사용한다.

검수 입력은 `node scripts/produce.mjs review-input <id> --source preview|render --phase experience|intent`로 구성한다. 현재 시안·입력 버전을 조회하는 명령이며, 실제 검수 호출과 관찰 기록은 [review-loop.md](review-loop.md)를 따른다.

## Contents

`head -100` 으로 앞만 읽어도 **뒤에 무엇이 있는지** 보이게 하는 목록이다. 제목은 본문 `##`/`###` 과 글자까지 같다 — 그대로 grep 한다.

- **데이터층** — beats · gaps · overlays · `layout:43` · `shots:check` · `credits`
- **Editorial concept 후보** — `editorial:check` · `editorial:compile` · `editorial:test`
- **전 편 회귀 (가드를 고친 뒤 반드시)** — `npm run check:all` · `check:registry`
- **착수 게이트 (층에 들어가기 전)**
- **정지 검토** — `slides`(웹) · `still:sheet` · `still:beat`
- **사람 게이트 기록 (2026-09-04, gates.md)** — `gate:log` · `gate:metrics` · `qa:crops` · `qa:clip` · `eval:defects`
- **시간 측정 (2026-09-04 승격)** — `time:session` · `time:episode`
- **영상 조립** — `render.config.json` 층 토글 ← **렌더 전 가드가 먼저 돈다**(ERROR 면 차단)
- **미디어 준비 (4-1 전)** · **확인 프레임 (검토 질문 답할 때)** · **생성(마지막 수단)**
- **4-5 사운드** — 덕킹 검증 · 구간 라우드니스
- **4-6 마감·최종 검토**
- **편 착수 (워크트리)** · **Motion Canvas (도해 외주 — input `tools/motion-canvas`)**
  - 편 이름 절(옛 「2·3·4편 추가 명령」)은 2026-09-02 에 주제 절로 접었다 — 편마다 절을 더하면 같은 명령이 세 곳에 갈라진다([maintenance §7](maintenance.md)). 편별 유래는 줄 끝 `(N편)` 로 남는다.
- **렌더 없이 확인하기** — 실측 표(5편 84초/2534프레임 기준)

## Editorial concept 후보

```bash
npm run editorial:check -- news/<id>       # story·concepts·motion·visual-system + narration 계약 검사
npm run editorial:compile -- news/<id>     # 검사 통과 뒤 02_production/timeline.json 생성
npm run sync -- news/<id>                  # 여섯 정본/파생 JSON·미디어 동기화. beats/overlays/shots 불필요
npm run still -- <id> out/pilots/<id>/qa/editorial.png --frame=<n>  # 표준 Composition 스틸
npm run still:sheet -- <id>                # 모든 concept/event 경계가 자동 수집된 proof sheet
npm run still:beat -- <id> --props='{"proofId":"p012"}'  # event 경계 원해상 proof
npm run slides -- <id>                     # event 경계 웹 검수판 + 내레이션 탐색
npm run render -- <id>                     # 표준 Composition 완성본
npm run editorial:test                     # 기준편 4개 + 결함 주입 + 신규 편 표준 런타임 smoke
```

`timeline.json`은 직접 고치지 않는다. `motion.json`에 절대 프레임을 적지 않고 `line + token_index + word + edge + offset_frames`를 쓴다. 내레이션 단어 시각이 바뀌면 `motion-narration-stale`이 이전 계획을 막는다. 스캐폴드가 만든 `src/editorial/episodes/<id>.tsx`에 개념 장면을 구현하고 `EDITORIAL_PLACEHOLDER`를 제거해야 레지스트리에 들어간다. `pilot-run`과 `npm run check:all`은 source/render timeline뿐 아니라 sync된 narration·story·concepts·motion·visual-system·audio·assets와 실제 미디어까지 대조해 낡은 렌더를 차단한다.

## 데이터층
```bash
npm run beats    -- $R/02_production/narration.json   # → beats.json (옵션 --fps 30 --endcard 2.5 --max 5.0 --min 1.2)
npm run gaps     -- $R                                # → asset_gaps.json (registry vs beats)
npm run overlays -- $R/02_production/beats.json       # → overlays.json (overrides·substitutions 자동 탐색, --terms a,b --max-chars 18)
npm run layout:43 -- $R                              # 4-3 레이아웃: layer43_plan.layout 존/크기/위계 → 인셋·카드 px 파생 (--check = 검사만)
npm run shots:check -- $R                             # shots.json 검증: 커버리지·에셋·AI·크롭·인접·i2v·크레딧·graphics id + 3′ 집계(moving N/M · static>4s · 부품당 비트)
#   검증 대상은 **렌더가 읽는 pilots/<id>/shots.json** (2026-09-02 통일 — 훅·check:all 과 같은 파일). 무엇을 봤는지 집계줄 끝에 찍힌다.
#   다른 파일을 보려면 인자 2로 명시: node scripts/check-shots.mjs $R <경로>
npm run credits  -- $R [--music "…"] [--check]        # 엔드카드 크레딧을 shots 실사용분에서 재생성 → overlays.overrides b<endcard>.card.text (--check = 차이 있으면 exit 1). 실행 후 overlays → sync
npm run sync     -- $R                                # JSON → pilots/<id>/, 미디어 → public/pilots/<id>/ (오디오·오버레이 포함)
npm run beats -- $R/02_production/narration.json --endcard 4          # 엔드카드 4s (3편)
node scripts/make-overlays.mjs $R/02_production/beats.json --terms 우주거울,리플렉트 --glue "리플렉트 오비탈,사만다 로울러"   # 다어절 고유명사 보호 (3편)
node scripts/endcard-credits.mjs $R --extra "출처: 한겨레 곽노필 선임기자"   # AI 줄 자동 + 출처 꼬리 줄 (3편)
```

## 전 편 회귀 (가드를 고친 뒤 반드시)

```bash
npm run check:all                  # 활성 편 전부 × check-shots · layout:43 · mc:check → ERROR 총합 (1.1초)
npm run check:all -- --restore     # public/pilots/<id>/ 가 없는 편은 미디어부터 복원 (2.5분)
npm run check:all -- --json > baseline.json     # 가드 추가 전/후 비교용
```
**부품·렌더러를 고친 뒤의 회귀는 md5 로 판정하지 않는다**(G13) — 렌더가 **비결정적**이라 같은 코드·같은 데이터로 비트시트를 두 번 뽑아도 md5 가 다르다(비디오 디코딩 타이밍).
**대조군을 세운다**: 같은 코드로 두 번 렌더 → 그 픽셀 차이가 잡음의 크기다. 실험군(고치기 전/후) 차이가 그보다 작으면 **순수 이동**이다.
7편 D1(`Graphics.tsx` 분리) 실측 — 대조군 최대 34·평균 0.100·다른 픽셀 5.24% ↔ 실험군 최대 2·평균 0.003·0.25%.
```bash
npm run fetch:assets -- news/<id>     # 수집 자산 복구·병렬 다운로드 [--jobs 4] [--dry] [--force]
#   URL 해소 5갈래: _search/nasaimg_assets(NASA) · _search/svs_item_*(SVS) · *.article.json(한겨레 게재) ·
#   파일명 mixkit-<곡>-<id>.mp3 → assets.mixkit.co/music/<id>/<id>.mp3 · asset.derive(ffmpeg 파생)
#   원장이 없어도 파일명만으로 되찾는 갈래가 있다 — 7편 BGM 4곡이 그렇게 복구됐다(사용 곡 570 md5 동일)
npm run worktree:remove -- <경로>     # 워크트리 제거 가드 — deliver/ 가 있으면 막는다
npm run render -- <id> <out> --frames=<a-b>   # **구간 렌더** — 한두 비트 고치고 85초를 다시 돌리지 않는다
#   2026-09-04 부터 **가드가 계산해서 강제한다** — 비트 단위 수정만 있으면 풀 렌더가 exit 2 로 막히고
#   바뀐 비트의 프레임 구간이 붙은 명령이 그대로 나온다. 해제는 SKIP_RENDER_SCOPE_GUARD=1 (아래)
npm run check:captions -- news/<id>   # script-faithful beats/overlays의 줄별 자/초·노출·줄 수 경고
# editorial-concept의 공통 한 줄 자막: editorial:check/compile에서 줄바꿈·구간 검사, still/render에서 실제 폰트 폭 검사
npm run check:registry             # 편과 무관한 등기 검사만 (check:all 이 편 루프 앞에서 한 번 돌린다)
npm run check:symlinks             # 커밋된 심링크 — 절대경로·해소불가·저장소밖은 오류(2026-09-03 사고 2차)
npm run check:deliver              # 납품본 무결성 — 대장 md5 ↔ 실물. **크기가 같은데 md5 가 다르면 손상**이다(다른 렌더가 아니다)
npm run check:links [-- <경로>]    # 저장소 전체 md 상대링크 (밖으로 나감·없음). 스킬·문서를 옮기면 반드시
npm run pilots                     # pilots/index.json + docs/PILOTS.md 대장 재생성
npm run gallery [-- --open]        # out/gallery.html — 편마다 기사 제목·기사 URL·완성 영상 한 장. 폴더를 뒤지지 않고 고른다
#   대장(pilot.json)·기사 원문 JSON·out/pilots/*/deliver/ 를 읽기만 한다. LATEST 판이 기본 재생, 판이 여럿이면 카드에서 갈아 끼운다
#   본체 out/ 에 실물이 없으면 .claude/worktrees/*/out/ 에서 찾아 가리키고 「워크트리 …」 라고 카드에 적는다
npm run restore:media              # public/pilots/*/ext·video 재생성 (sync 가 못 만드는 부분)
npm run browser:ensure             # 렌더 브라우저 — node_modules/.remotion/chrome-headless-shell/ (git 제외, 클론 후 재실행)
npm run skills:update              # Remotion 스킬만 갱신 (전체 업그레이드는 npx remotion upgrade)
```
`check:registry` 는 **부품 id 등기처 넷의 어긋남**을 본다(layers §C) — `impl: implemented` 인데 렌더러 `case` 가 없는 거짓 등기, 그 반대(미등기 구현), `impl_at` 헛참조, `ONSCREEN_IDS` ↔ `OnscreenByType` 불일치. **쓰이지 않는 부품도 본다** — 편별 검사는 `shots.graphics` 에 쓰인 id 만 봐서 거짓 등기를 못 잡았다(실측 2건).

러너가 흡수하는 것 셋 — ① **미디어 캐시 결합**: `public/` 이 없으면 `clip … not in public/` 은 결함이 아니라 **SKIP** ② **규약 이전 편**: `layer43_plan.layout` 이 없으면 layout:43 은 **N/A**(스크립트 단독으로는 exit 1 이 맞다) ③ **가드 세대**: `pilot.json.guards[]` 에 선언한 코드는 경고가 아니라 **오류**.
개별 가드는 안 고친다 — 러너를 씌우는 일이다.

**가드 세대 코드**(줄 앞 `[코드]`): `plan-present` · `plan-bidirectional` · `registry-complete` · `draw-tier` · `label-not-card` · `ai-notice-endcard` · `gen-count-1` · `no-black-bg` · `continuous-declared` · `pop-no-year` · `mc-spec-required` · `card-once` · `word-timed-in` · `safe-area-px` · `label-provenance` · `gen-avoid` · `gen-banned-word` · `plan-rules-standard` · `plan-rules-foreign`. 실측으로 통과하는 편만 선언한다 — 선언은 「이 편이 이 규약을 지킨다」는 등기다. 옛 편은 비운다(되돌리지 않는다).
**등급은 편이 정한다** — 선언했으면 **오류**, 안 했으면 **경고**. 승격(warn→ERROR)과 완화(ERROR→warn)는 같은 규칙의 양쪽이다: 새 편엔 오류여야 하지만 옛 편에 소급하면 안 되는 규칙(`mc-spec-required`)은 스크립트가 오류로 내고 러너가 옛 편에서만 내린다. 표에 `(완화 <코드>)` 로 보인다.
**이것이 소급 실측의 실행기다**(절차 [maintenance §3](maintenance.md)) — 새 규칙에 가드를 붙여 옛 편 전부에 돌리고, 위반 0이면 「잘 되던 편들이 이미 지키던 선」이라 승격, 위반이 나오면 그 편의 취향이다(rules 승격 게이트).

**워크트리에서 돌리려면** `ln -s <main>/public/pilots public/pilots` 먼저 — 안 하면 편마다 SKIP 수십 건.

## 착수 게이트 (층에 **들어가기 전**)

```bash
npm run gate -- <id> 4-3        # 4-3 착수 조건: tier·ref·부품 지명·registry 등기·mc_spec + 미사용 자산 목록
```
`--shots <path>` 로 과거 커밋 데이터에 돌려볼 수 있고(게이트 검증), `--root <path>` 는 input 루트 덮어쓰기.
납품 확정 편·규약 이전 편(서술형 계획)은 **N/A exit 0** — 착수 게이트는 소급하지 않는다.
사후 가드(`shots:check`·`layout:43`·`mc:check`)는 만든 뒤에 잡지만, 이건 **만들기 전에** 잡는다.

## 정지 검토
```bash
npm run mc:check -- <root>                                     # MC 씬 계약 검사 — 2D 겹침·안전영역·자막 밴드·선언 union vs 알파 실측
npm run still:sheet -- <id>                                    # out/pilots/<id>/qa/beatsheet.png (22칸 격자)   ← **검토의 기본 도구. 3.4초**
#   editorial-concept 편에서는 비트 대신 timeline이 만든 concept/event from·settled·to·end 경계가 자동으로 들어간다.
#   시트는 두 번 — 1차(3단계, 수집본으로 화면이 서나) / **2차(3′ 뒤, 생성 대상 배지)**. 확인 1 에 올라가는 것은 2차 (track-3prime.md 「시트는 두 번이다」)
npm run still:beat -- <id> --props='{"beatId":"b09","guides":true}'   # out/pilots/<id>/qa/beat.png 1080×1920
#   editorial-concept 편은 --props='{"proofId":"p012"}'처럼 timeline.proof_frames id를 쓴다.
npm run slides -- <id>                                         # Slides 시퀀스 → out/pilots/<id>/qa/slides/*.jpeg → out/pilots/<id>/qa/slides.html (← → / Space / A)
npm run studio                                         # Remotion Studio: 편마다 폴더 — ShortformNews-<id> · BeatSheet-<id> · Slides-<id> · BeatStill-<id> (pilots/active.json 에 있는 편만)
npm run still:all                                      # 활성 편 전부 비트시트 — 부품 고친 뒤 옛 편 회귀 확인
```

## 사람 게이트 기록 (2026-09-04, gates.md)

```bash
npm run gate:log -- present <편id> <게이트1-7|-> [--card <경로>]   # 제시 시점 선기록 — 안 찍으면 대기 측정 불가
npm run gate:log -- decide <편id> <게이트|-> --verbatim "<원문>" [--item b20=reject:사유]…   # 회신 그 턴에, 원문 그대로
npm run gate:log -- to-defects <편id> [--write] [--prefix pN]      # 기각·자유발견·전제오류 → defects.json (guard:null 백로그)
npm run gate:metrics                                               # 게이트별 대기·왕복·전제오류 — 왕복 2+ = 형식 결함 신호
npm run qa:crops -- <편id> [--beats b01,b05]                       # 원해상 크롭(caption·onscreen 존) — 「읽히나」는 이것으로만
npm run qa:clip -- <video> [--n 4~6] [--excerpt <초>]              # 클립 4~6프레임 균등 + 발췌 — 1프레임 판정 금지(G7)
npm run eval:defects                                               # 결함 장부 채점 — 가드·규칙을 고친 뒤 재채점 (check:all 편입)
```

## 시간 측정 (2026-09-04 승격)

```bash
npm run time:session -- <세션.jsonl> [--mark <ISO>]        # 단일 세션 — 작업(순)·사람게이트·턴간 분리
npm run time:episode -- [--from ISO] [--to ISO] [--mark ISO] <a.jsonl> [b.jsonl …]   # 편 단위 다중 세션 합집합
```

## 영상 조립
```bash
# pilots/<id>/render.config.json 에서 layers 를 한 층씩 true (2026-09-02 부터 pilots/ 소유 — sync 가 복사하지 않는다) (motion → text_anim → graphics → transitions → sound), debug.show_beat_id true(편집)/false(최종)
npm run sync -- $R && npm run lint
npm run render -- <id> out/pilots/<id>/ShortformNews_4-N.mp4            # 원본 (crf 18)
ffmpeg -i out/pilots/<id>/ShortformNews_4-N.mp4 -c:v libx264 -preset fast -crf 26 -c:a copy -movflags +faststart out/pilots/<id>/ShortformNews_4-N_preview.mp4
open out/pilots/<id>/ShortformNews_4-N_preview.mp4
```

> **렌더 전 자동 가드 (2026-09-02).** `npm run render` · `npx remotion render` · `node scripts/pilot-run.mjs render` 는 **PreToolUse 훅**이 먼저 `shots:check` 를 돌린다 — 플러그인 `hooks/hooks.json` → `${CLAUDE_PROJECT_DIR}/scripts/pre-render-guard.mjs` (**구현은 프로젝트에 있다** — 설치본에서는 상대경로로 저장소에 못 닿는다). **ERROR 가 1건이라도 있으면 렌더가 `exit 2` 로 막히고** 그 ERROR 목록이 그대로 표시된다. **경고(warn)로는 막지 않는다** — 통과시키고 메시지로만 보여준다. 편 id 를 못 찾거나 검사가 죽으면 **통과시킨다**(fail-open — 가드가 작업을 막으면 사람이 훅을 꺼버린다). 검증 대상은 렌더가 실제로 읽는 `pilots/<id>/shots.json` 이다.
> `still`·`still:sheet`·`slides`·`studio` 는 대상이 아니다 — 「렌더 없이 확인하는 사다리」는 그대로 쓴다.
> 왜 자동인가: `check-shots` 가 커버하는 규칙은 5편에서 **한 건도 안 어겼다.** 효과는 입증됐는데 호출이 수동이라 안 돌았을 뿐이다(근거 (과거 내부 기록·로컬 보관) 「규칙 위반의 기전」 — 어긴 3건의 원인은 규칙의 불명확함이 아니라 **작업 순간 문맥에 없었던 것**).

> **렌더 범위 가드 (2026-09-04).** 같은 훅이 `shots:check` 를 통과한 뒤 **「직전 렌더 이후 무엇이 바뀌었나」를 비트 단위로 계산**한다(근거 (과거 내부 기록·로컬 보관)). 지문은 `out/pilots/<id>/.render-scope.json`(파생물, 지우면 리셋).
> **막는 경우는 둘뿐이고 둘 다 「사람이 이미 본 결과를 다시 만드는」 경우다.**
> ① 직전 풀 렌더 이후 입력이 **하나도** 안 바뀜 → 있는 mp4 를 보면 된다.
> ② **비트 단위 수정만** 있고 그 구간이 전편의 일부 → 바뀐 비트의 프레임 구간(전환 8프레임 포함)을 계산해 **명령을 그대로 내민다**.
> **통과시키는 경우:** 편 단위 입력(`audio.json`·`render.config.json`·비트 격자·`layer43_plan.layout`·overlays style)이 바뀐 렌더 — 전편이 영향을 받으므로 풀 렌더가 옳다. `--frames` 가 이미 붙은 호출. 지문이 없거나(첫 렌더) 읽다 실패한 경우(fail-open).
> **해제:** `SKIP_RENDER_SCOPE_GUARD=1 npm run render -- …` — 납품본처럼 전편이 필요할 때. 훅을 끄지 말고 이걸 쓴다.
> 왜: 「한두 비트 고치고 85초를 다시 돌리지 않는다」는 규칙이 2026-09-02 부터 있었는데 **8편 수정 라운드에서 풀 렌더가 4회** 돌았다 — 규칙은 있고 가드가 없었다. 문서를 한 번 더 적는 대신 **계산된 명령**을 내민다.
> 끄거나 고치려면 `.claude/settings.json` 의 `hooks.PreToolUse` 항목(`/hooks` 로도 본다). 손으로 돌릴 때는 `npm run shots:check -- $R`.
> 편 id 해결은 가드가 따로 구현하지 않고 `scripts/lib/pilot.mjs` 의 `resolvePilotId` 를 쓴다(규약이 바뀌면 같이 바뀐다). 편 root 는 `inputRoot()` 가 `news/<id>` 를 먼저 본다(2026-09-02 통합). 렌더가 읽는 `pilots/<id>/` 가 `news/<id>` 보다 **낡았으면 exit 2 로 막는다** — `npm run sync -- news/<id>` 뒤 다시.

## 미디어 준비 (4-1 전)
```bash
sips -s format jpeg -s formatOptions 88 -Z 4000 <원본> --out public/pilots/<id>/ext/<name>.jpg          # 스틸 파생물
ffmpeg -ss <from> -t <비트길이+0.5> -i <원본.mp4> -an -c:v libx264 -crf 18 -pix_fmt yuv420p public/pilots/<id>/video/<beat>_<name>.mp4   # 클립 트림
ffmpeg -ss 1.0 -t 3.3 -i <원본.mp4> -an -vf "reverse,scale=2560:-2" ... <beat>_reverse.mp4       # 역재생
ffmpeg -ss <t> -i <mp4> -frames:v 1 public/pilots/<id>/ext/<name>_poster.jpg                           # 시트용 포스터
# 클립 내용 실측(궤적·움직임이 실제로 있는 4초 창) — 정지 프레임 한 장으로 판정하지 않는다
ffmpeg -i <원본.mp4> -vf "select='gt(scene,0.02)',showinfo" -an -f null - 2>&1 | grep -oE "pts_time:[0-9.]+"   # 변화 지점
ffmpeg -i <원본.mp4> -vf "tblend=all_mode=difference,scale=64:-2" -an -f null -  # 프레임 차분(값이 큰 구간 = 움직임)
# 원본 여백 크롭(원본에 박힌 방위 문자·타임스탬프 배제, 비율 유지) → crop x/y/w/h 를 shots 에
# 자산 실측 — 확장자는 믿지 않는다 (.jpg 가 WebM 이었다, 3편)
file <asset>; ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,duration -of csv=p=0 <asset>
# 영상 인셋 파생은 패널 px 로 (렌더 폴백이 style 크기를 무시한다 — Tags.tsx 주석, 4편)
ffmpeg -ss <in> -t <len> -i <src> -an -vf "crop=...,scale=460:460" -c:v libx264 -crf 18 -pix_fmt yuv420p public/pilots/<id>/video/<beat>_<name>_460.mp4
```

## 확인 프레임 (검토 질문 답할 때)
```bash
for t in 0.0 9.0 17.5 55.0; do ffmpeg -v error -y -ss $t -i out/pilots/<id>/ShortformNews_4-N.mp4 -frames:v 1 -vf scale=300:-2 out/pilots/<id>/qa/f_$t.jpg; done
# PIL 로 몽타주 → Read 로 확인. 픽셀 diff(리팩터 검증): 이전 렌더와 같은 시각 프레임 ImageChops.difference 평균 0.0
# 원해상 에지 검사(인셋·도해 공존 비트, 4편) — 인셋 좌변·자막 밴드(y=1267) 기준선을 그려 **원본 해상도로** 판독. 축소 시트로 판정하지 않는다
```

## 생성(마지막 수단)
Higgsfield MCP: `generate_image_batch`(z_image 0.15크레딧/장, 9:16) → `jobs_wait` → `show_generation_by_ids` → `curl` 저장 → `credit_log.md` 기록.
영상(2편 실측): `generate_video` kling3_0 **pro** t2v 6~7s 9:16 무음 ≈10.5~12cr / i2v 7s ≈12cr(`media_upload` → `curl -X PUT` → `media_confirm` 뒤 image id). 프리셋 "IN THE DARK"류는 `declined_preset_id`. **비트당 1개만**(count 1, 2026-08-30 사용자 지시) → 9:16 프레임 확인 → 부적합이면 프롬프트 수정 후 1개 재생성. 크레딧 소모는 **사용자 결정** 후에만. 원본은 input `gen/<pilot_tag>/`, `shots.gen{}`에 job_id·variant·credits·prompt·prompt_avoid·alternatives·start_image. 생성물 `credit: null`, 엔드카드는 `npm run credits`.
```bash
# 생성 클립 판정 시트(0.3/1.5/3.0/4.5s ×N행) + 움직임 실측 — 프레임 차분 평균(실사 궤적 0.66 vs 생성 별하늘 1.77, 3편)
ffmpeg -i <gen.mp4> -vf "tblend=all_mode=difference,scale=64:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -an -f null - 2>&1 | grep -oE "YAVG=[0-9.]+" | awk -F= '{s+=$2;n++} END{print s/n}'
# 생성물 파생 처리는 **파생 클립에만**(원본 무수정) — 지평선 광 돔: PNG 그라디언트 overlay / 가짜 브랜드 마크: delogo(궤도 이동 범위 합집합)
ffmpeg -ss 0 -t 2.34 -i gen.mp4 -i gradient.png -filter_complex "[0:v][1:v]overlay=0:0:format=auto" -an -c:v libx264 -crf 18 -pix_fmt yuv420p public/pilots/<id>/video/bNN.mp4
ffmpeg -ss 0 -t 2.94 -i gen.mp4 -an -vf "delogo=x=490:y=755:w=215:h=55" -c:v libx264 -crf 18 -pix_fmt yuv420p public/pilots/<id>/video/bNN.mp4
# 파생 검증: 처리 띠의 프레임별 평균·명암폭(max−min) — 글자 100+ / 평면 60 이하. 하늘 띠 평균은 불변이어야 한다
```

## 4-5 사운드
```bash
npm run audio:measure -- out/pilots/<id>/stage/X.mp4 --narr public/pilots/<id>/audio/narration.wav --beats pilots/<id>/beats.json [--win 이름:시작:길이]   # 통합·TP·LRA + 첫 0.4/1초·발화 틈·엔드카드·마지막 1초 (6편)
# 파생물 (원본 불변): 디졸브 whoosh 0.5s, 카운터 클릭, 엔드카드 드론 3s → external_assets/audio/derived/
ffmpeg -i <sfx.mp3> -t 0.5 -af "afade=t=out:st=0.35:d=0.15" -ar 44100 derived/sfx_whoosh.wav
ffmpeg -i <hum.mp3> -t 3.0 -af "afade=t=in:d=0.4,afade=t=out:st=2.2:d=0.8" -ar 44100 derived/sfx_drone.wav
# 원곡 인트로 곡선 (앞부분 BGM 안 들릴 때)
for s in 0 2 4 6 8 10 15; do ffmpeg -ss $s -t 2 -i <bgm.mp3> -af ebur128 -f null - 2>&1 | grep -oE "I:\s+-?[0-9.]+ LUFS" | tail -1; done
# 믹스 측정 (통합·TP) + 구간(0.5s 창 순간값)
ffmpeg -i out/X.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+I:|^\s+Peak:"
ffmpeg -ss 1.5 -t 0.5 -i out/X.mp4 -af ebur128 -f null - 2>&1 | grep -oE "M:\s+-?[0-9.]+" | tail -1
# 덕킹 검증: 내레이션 무음 창을 잡아 발화/틈/duck_ranges 구간의 BGM RMS 를 따로 잰다 → audio.json measured.segments
ffmpeg -i public/pilots/<id>/audio/narration.wav -af silencedetect=n=-35dB:d=0.25 -f null - 2>&1 | grep -oE "silence_(start|end): [0-9.]+"
ffmpeg -ss <틈 start> -t <len> -i out/X.mp4 -af "volumedetect" -f null - 2>&1 | grep mean_volume
# 인용·덕킹 구간 낙차: 일반 틈 M 값 vs duck_ranges 구간 M 값 → 설정 duck 과 비교 (3편 b18 −7.5 vs −8)
# 끝단 무음·짧은 틈(<0.4s)은 ebur128 대신 volumedetect (4편)
```

## 4-6 마감·최종 검토
```bash
# render.config: debug.show_beat_id false / audio.json: master_gain_db −0.5 (TP 보정)
npm run sync -- $R && npm run render -- <id> out/pilots/<id>/ShortformNews_final_candidate.mp4 --crf 18
ffmpeg -i out/pilots/<id>/ShortformNews_final_candidate.mp4 -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 192k -movflags +faststart out/pilots/<id>/ShortformNews_final_candidate_h264.mp4
npm run credits -- $R --check                          # 엔드카드 크레딧 = 실사용분 (exit 0 이어야 마감)
# 비트×2 프레임 검토 시트: 비트마다 start+min(0.4, dur*0.3) 와 start+dur*0.75 → 행당 11~13장 몽타주 (PIL) → Read 로 육안 (1편 44장, 2편 50장)
# 커버는 단계 9의 이미지 생성 도구로 별도 제작 — reference/cover-build.md
# 구간 라우드니스: 문장 사이 무음(≥0.25s) / 발화 4곳 / 엔드카드 / 첫 1초
# 이슈 스윕(최종 검토 위, 4편): 1초 전수 프레임 + 이음새(경계 ±0.3/±0.07) 몽타주 → A/B/C/D 표
# 전 층 미리보기: render.config layers 전부 true + debug.show_beat_id true → npm run render -- <id> …_preview_all.mp4 --crf 26
npm run out:deliver -- <id>                                    # 예행: 무엇이 어디로 가는지만 (3편)
npm run out:deliver -- <id> --extra <ver>=<고지·썸네일 경로> --yes   # 복사 실행. 원본은 그대로 둔다
#   렌더 원본은 대장 versions[].master 가 가리키는 경로 (없으면 null 로 명시 — 추론하지 않는다, 2026-09-02)
npm run out:audit && npm run out:prune -- --trash --yes        # deliver/ 안은 KEEP-deliver 로 보호. 묘비 남기고 납품본 md5 재검증
```
납품본 규약(`deliver/` 6층·이름·불변·SoT)은 저장소 [CLAUDE.md](../../../../CLAUDE.md) §파일럿 구조가 단일 소스. **`deliver/v<N>/` 는 불변 — 고칠 게 있으면 `v<N+1>`**(덮어써서 3편 v9·4편 v1 이 사라졌다). 백그라운드 렌더 중 데이터가 바뀌면 `TaskStop` → 재트림/sync → 재렌더.
주의: **파이프 뒤의 `$?` 는 마지막 명령(예 `tail`)의 코드다** — `cmd | tail` 로 검증하면 실패를 통과로 읽는다. 종료코드를 볼 때는 `cmd > /tmp/log 2>&1; echo $?`.
**워크트리에서 렌더·검사하려면 `node_modules` 와 `public/pilots` 를 심링크**한다(CLAUDE.md 규약) — `pilot-run.mjs` 는 `REPO/node_modules/.bin/remotion` 절대경로를 쓰므로 없으면 아무것도 안 나온다.
주의: bash 히어독에 백틱(`)이 든 마크다운을 쓸 때는 `<<'EOF'`(따옴표)로 — 안 그러면 명령 치환으로 파일명이 실행된다. `grep -c`가 0을 세면 exit 1이라 `&&` 사슬이 끊긴다(`|| true`). zsh는 `$var`를 단어 분리하지 않는다 — ffmpeg 인자 묶음은 배열이나 명시 인자로. 정규식으로 JSX를 패치하지 말고 정확한 문자열 치환(엉뚱한 div를 바꾼 사례).

## 커버 이미지 생성 — 단계 9

[cover.md](cover.md)에서 영상에 맞는 문구·장면을 설계한 뒤, 세션에 제공된 이미지 생성·편집 도구를 호출한다. 저장·수정·검수·표시 절차는 [cover-build.md](cover-build.md), 기록 양식은 [cover-record.json](../templates/cover-record.json)이다. 고정 템플릿을 렌더하는 npm 명령으로 대체하지 않는다.

`design/thumbnails/render.sh`·`sheet.sh`·`safezone.sh`는 과거 HTML 시안의 재현용이다. 새 생성 커버는 PNG 자체를 열어 검수하고, 요청한 시안을 버전별로 보존한다.

## 편 착수 (워크트리)
```bash
npm run new -- <id> --url <기사 URL> [--title <제목>] [--mode script-faithful|editorial-concept] [--fetch]  # 단계 0 — 후보 모드는 story/concepts/motion/visual-system 뼈대도 생성. 날짜는 KST
npm run fetch:article -- --url <기사 URL> --root news/<id>              # 기사만 (다시) 받기 — html·article.json·txt·MD5SUMS + 05_참고자료/hani_published/
```
`--fetch` 는 **한겨레 기사면** 원문·메타·게재 이미지까지 받는다. 내장 WebFetch 는 hani.co.kr 에서 차단되고, 본문만 긁는 도구는 **캡션·게재일시·이미지 URL** 을 흘린다 — 그게 라이선스·사실 대조의 근거다. 그래서 `curl` + `__NEXT_DATA__`.
남기는 것 4종: `.html`(내려받은 그대로 = 증거) · `.article.json`(무손실) · `.txt`(읽는 판) · `MD5SUMS`. **게재 이미지는 기본이 ❌ 참고용** — 캡션이 가리키는 1차 출처에서 제작본을 받는다.
```bash
git switch -c pilot/<id>   # 또는 git worktree add .claude/worktrees/<id> -b pilot/<id> main (워크트리엔 node_modules·public/pilots/<id> 심링크)
npm run sync -- $R                                                       # script-faithful: beats 뒤. editorial-concept: compile+episode renderer 뒤(legacy beats/overlays/shots 불필요) — pilots/<id>/·active.json·index.ts·pilot.json 뼈대
git worktree add .claude/worktrees/<name>-fit -b experiment/<name>-fit pilot/<name>   # 3′ 재작업 트랙
git log --since="1 day" --format='%h %an %s' && git status --short     # 착수 전: 다른 세션이 같은 워크트리를 만졌는지
```

## Motion Canvas (도해 외주 — input `tools/motion-canvas`)
```bash
cd tools/motion-canvas && npm run editor   # http://localhost:9000 미리보기·렌더
ffmpeg -framerate 30 -i output/<scene>/%06d.png -c:v libvpx-vp9 -pix_fmt yuva420p <scene>_alpha.webm   # PNG 시퀀스 → 알파 webm
ffmpeg -ss <t> -c:v libvpx-vp9 -i mc_alpha.webm -frames:v 1 -vf format=rgba -f image2 -c:v png f.png   # 알파 프레임 추출(기본 디코더는 알파를 버린다)
npm run mc:check -- <root>                                                 # 씬 계약 검사. **스펙이 없는데 motion_clip@1 을 쓰면 오류**
```
- 씬 제작은 input, output 은 발주·통합. 발주 스펙 필수 항목·납품 검증(알파 bbox)·통합 절차는 [stages.md](stages.md) Motion Canvas 트랙.

## 렌더 없이 확인하기 (실측 2026-09-01, 5편 84초/2534프레임 기준)

전체 렌더는 비싸다. **비트시트(3.4초)가 검토의 90%를 잡는다** — `Beat.tsx` 를 그대로 쓰므로 도해·카드·인셋·자막이 진짜로 그려진다.

| 단 | 명령 | 실측 | 쓰는 때 |
|---|---|---|---|
| 1 | `npm run slides -- <id>` | ~1초 | 구성·문안 훑기 |
| 2 | `npm run still:sheet -- <id>` | **3.4초** | **기본.** 전편 한 장 — 반복·공백·구도를 이어서 본다 |
| 3 | `npx remotion still src/index.ts ShortformNews-<comp> out.png --frame=N --scale=0.5` | ~8초 | 한 프레임 정밀(잘림·겹침) |
| 4 | `npx remotion render src/index.ts ShortformNews-<comp> out.mp4 --frames=A-B --scale=0.5` | **18초/162f** | 그 비트의 모션·전환·클립 재생 |
| 5 | 전체 `--scale=0.5` | ≈4.7분 | 검토용 프록시 |
| 6 | 전체 정품 | 그보다 김 | **납품본에만** |

- 컴포지션 id 는 편 id 의 `_` 가 `-` 다 (`hani_solar_swirl` → `ShortformNews-hani-solar-swirl`). `npm run compositions` 로 확인.
- 프레임 번호 = `beats.json` 의 `start_frame`.
- **2단의 한계**: 영상 인셋은 첫 프레임이라 까맣게 나온다(코로나그래프 등). 인셋은 4단으로 본다.

## 스티커

```bash
npm run sticker:cut -- <생성 png…> --out news/<id>/02_production/external_assets/sticker
npm run sticker:cut -- <png…> --check     # 판정만, 파일 안 씀
```

생성 png(연회색 평면 배경 + 흰 다이컷 테두리) → 알파 png. 계약이 배경·테두리를 고정하므로 **가장자리 flood fill 하나**로 떨어진다 — 크로마키·알파 이진화·연결 성분 검사가 필요 없다(전부 실패했다). 옵션 `--tol`(배경 판정 허용치) · `--pad`(여백 비율 기본 6%). 계약·근거 = [templates/sticker_contract.md](../templates/sticker_contract.md)

초기 장면은 `produce begin <id> scene_proof --output <새 시안> --output <관찰 JSON>` 후 실제 도구 실행·`finish`로 기록한다. 음성 확정 전 사용 가능하며 [발화→화면 제작](visual-production.md)의 형식을 따른다. `review-input --source scene --phase experience|intent`로 실물과 의도를 분리한다.
