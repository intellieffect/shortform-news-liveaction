# 층위

## 제작 모드

`script-faithful@1`은 아래 비트 데이터층과 4-0~4-6 조립층을 그대로 쓴다. `editorial-concept@1`은 의미 단위를 `story → concepts`, 시간 단위를 `narration → motion → timeline`으로 분리한다. 자막과 음향은 전역 마스터 시간을 읽고, 개념 장면은 여러 발화 비트 동안 상태를 유지한다. 상세 계약은 [editorial-concept-track.md](editorial-concept-track.md)와 [editorial-concept.schema.md](../../../../docs/specs/editorial-concept.schema.md)에 있다.

후보 트랙에서도 4-0~4-6 토글은 장면·자막·모션·음향 결함을 격리하는 내부 도구로 남는다. 한 층을 끝낼 때마다 사용자 승인받는 순차 게이트로 쓰지 않는다.

## A. 데이터층 5개 — 단방향 의존 `narration → beats → overlays/shots → audio`

내레이션이 바뀌면(sha256) 전부 재계산. 그래서 대본·WAV는 확정 input이어야 한다.

| 순서 | 층 | 파일 | 생성 | 규칙 요지 |
|---|---|---|---|---|
| 0 | 정렬 | `02_production/narration.json` v1.1 | input (`make_narration.py`) | 초 float 3자리, 0 = 오디오 첫 샘플. 문장 = narration.txt 한 줄(생성기 분할 없음). `text`(자막표기) ≠ `spoken_text`(낭독표기). `words[]`(정렬 토큰) + `caption_words[]`(자막표기 토큰, text≠spoken일 때). `root` 절대경로, 모든 path는 root 기준. `audio.loudness_lufs` 옵션 |
| 1 | 시간 | `beats.json` v1.0 | `scripts/make-beats.mjs` | 문장 → 구두점 절 → 5초 초과는 쉼표 재분할(≥1.2s). 무음은 앞 비트가 화면 유지. 첫 비트 hook, `?`로 끝나는 마지막 body는 cta, 꼬리 endcard 2.5s. 프레임은 여기서 처음(fps 30) |
| 2 | 텍스트 | `overlays.json` v1.0 (+`overlays.overrides.json`) | `scripts/make-overlays.mjs` | 자막 줄바꿈(의미 단위), `lines_timed`(줄별 in/out), 강조(`pop`은 핵심 수치만), 훅 헤드라인, 인용 블록(`card.block`), CTA 줄, 엔드카드 질문+크레딧, 스타일 토큰 `style`(+`style.onscreen`). **온스크린 카드**는 여기가 아니라 shots `graphics[]`의 onscreen 부품(문구 = 대본 자막 열, 텍스트층이라 graphics 토글과 무관하게 그려짐). 대본 자막 열이 있으면 overrides `card: null`로 자동 인용 카드 억제. 엔드카드 크레딧은 `npm run credits`가 shots에서 파생 |
| 3 | 화면 | `shots.json` v1.0 | 손작성 + `scripts/check-shots.mjs` | 비트당 `visual`(type/source/asset/file/crop/motion/clip/`clip_option`/`split.direction: wipe`), `insets[]`(+`in`·`layout`·영상), **`stickers[]`(2026-09-04 — 배경 위에 얹는 생성 오브젝트, tier 3a 은유의 자리. 인셋이 실사를 **창**으로면 스티커는 생성물을 **실루엣**으로. 형태는 프롬프트가 만든다(계약 `sticker_contract.md` 문형 고정) · 후처리 `npm run sticker:cut` · `kw_served`·`in`=낱말 시각)**, `inset_option`(제거 보관), `label_overlay`(+`label_overlay_in`), `graphics[]`(4-3 그래픽 + 온스크린 부품, `layout`·`hierarchy`·`replaces_caption_line: number 또는 number[]`), `gen{}`, `credit`, `needs[]`, `ai_allowed`. 루트에 **`layer43_plan`**(비트별 fact/how/what/why + `layout{zones,inset_sizes,hierarchy,max_layers,rules}`) — 4-3의 단일 소스, `npm run layout:43`이 px 파생. 씬(문장) 단위로 에셋, 비트 단위로 변화(크롭·줌·자막) |
| 4 | 소리 | `audio.json` v1.0 | `sync-pilot.mjs`가 기본 생성, 소싱 후 채움 | narration(loudnorm)·bgm(gain/duck/fade/loop/**duck_ranges[]** 구간 덕·`source_lufs`)·sfx[]·master_gain·measured(+`segments`). 파생물은 심링크가 아닌 `external_assets/<pilot_tag>/` |

### 검토용 정지 산출물 (모션·전환·소리 없음)
- **비트 시트**: `npm run still:sheet -- <id>` → `out/pilots/<id>/qa/beatsheet.png` (22칸 격자, `BeatSheet` Still)
- **슬라이드**: `npm run slides -- <id>` → `out/pilots/<id>/qa/slides.html` (← → 한 장씩, 스페이스 = 해당 내레이션 재생, A = 자동 재생). 대본 컷맵이 있으면 **컷 배지·컷 스트립 + 온스크린 줄 + "클라이언트 측 자료 및 구성 제안 · 대본 원문 그대로" 패널**(`pilots/<id>/script_cuts.json`) — 클라이언트가 자기 제안이 어디에 반영됐는지 본다
- 같은 컴포넌트(`BeatFrame`)를 쓰므로 슬라이드에서 확정한 층이 그대로 영상이 된다.
- **최종 검토 시트**: 비트마다 시작+0.4s·중간 프레임 비트×2장(1편 44, 2편 50) → `out/pilots/<id>/qa/review_1..4.jpg` (commands.md). 계획 placeholder는 편집 모드(`show_beat_id`)에서만 그려진다 — 최종엔 절대 없음.

## B. 영상 조립층 7개 — `render.config.json` `layers` 토글로 한 층씩 켠다

| 층 | 켜는 것 | 코드 위치 | 얹는 것 | 안 하는 것 |
|---|---|---|---|---|
| **4-0 정지 조립** | 전부 false | `Composition.tsx` Sequence×비트 + `<Audio>` | 스틸 하드컷 + 내레이션 | 모션·전환·BGM |
| **4-1 화면 모션** | `motion` | `primitives/Background.tsx` | 켄번스(`shots.motion`, 인/아웃 교대, 씬 내 이어감), 사전 트림 무음 클립(`shots.clip`, 비트+0.5s, `public/pilots/<id>/video/`), 역재생 클립은 ffmpeg로 미리 | 텍스트 애니 |
| **4-2 텍스트 모션** | `text_anim` | `primitives/Caption.tsx`, `Cards.tsx` | 자막 줄 in(첫 단어 −3f, 6f 페이드+16px), 핵심 수치 팝(세로 1→1.12→1, 10f), 헤드라인 프레임 0(8f settle), 인용 블록 줄 0.13s 순차, CTA 0.96→1, 인셋 `in`(초, 기본 6f), 라벨 `label_overlay_in`·엔드카드 페이드, 온스크린 요소별 `*_in`(낱말 시각, `style.onscreen.rise_px/in_frames`) | 그래픽 |
| **4-3 그래픽** | `graphics` | `primitives/Graphics.tsx`·`Onscreen.tsx`, `shots.graphics[]`, `shots.layer43_plan` | 그래픽: counter@1(`format`)·evidence_card@1·dot@1·veil@1·reveal@1·(measure@1·diagram@1 1편)·erase@1(구현·미적용) · 온스크린: hook_title@1·stat_block@1(`bar`)·quote_slab@1·cta_bar@1·timeline_axis@1·threshold@1·icon_strip@1 (arrow_step·equation_block·bullet_list 폐기) · 배경 `split.direction: wipe` · 인셋 영상. **계획(`layer43_plan`) 먼저, 부품은 계획을 구현**. 효과 부품은 컷당 1회 | 전환 |
| **4-4 전환** | `transitions` | `Composition.tsx` Dissolve | 씬(문장) 경계만 크로스디졸브 **8f**(배경만, 나가는 텍스트는 컷 — 자막 겹침 방지, `keep_text` 경계만 예외로 인용 카드 0.5s 연장), `overrides`·`keep_text`(b20>b21 15f 인용 연장), 끝 페이드아웃 12f. 훅은 시작 페이드 없음 | 소리 |
| **4-5 사운드** | `sound` | `Composition.tsx` + `audio.json`(`docs/specs/audio.schema.md`) | 내레이션 loudnorm −16(sync), BGM 게인·발화 덕킹(attack/release)·구간 덕 `duck_ranges`·페이드, SFX `at`(scene_dissolve/graphic:id/endcard/beat:id/sec:n), 렌더 후 ebur128 −14±1 확인 + **BGM 가청 기준**(발화 틈 RMS −26 dB 안팎 — [audio.schema 4c](../../../../docs/specs/audio.schema.md), 확정은 사용자 청취) | 브랜드 |
| **4-6 마감** | `debug.show_beat_id: false`, `audio.master_gain_db` | `Composition.tsx` + ffmpeg | 비트 태그 off, `npm run credits -- $R --check`(엔드카드 = 실사용분), 엔드카드 4s·질문 CTA 중복 제거, TP 보정(−0.5dB), `final_candidate.mp4`(crf18) → `_h264.mp4`(crf22·aac192k·faststart) → 확정 시 `deliver/v<N>/` 로 묶음(불변), 비트×2 프레임 최종 검토, 썸네일, 게이트 표 | — |

### 4-4 전환 세부 (`render.config.transitions`)
`{crossfade_frames: 8, scene_only: true, overrides: {"b20>b21": 15, "b21>b22": 12}, keep_text: ["b20>b21"], end_fade_frames: 12}` — 나가는 비트는 `duration + xf`만큼 살고 마지막 xf에서 1→0, 들어오는 비트는 첫 xf에서 0→1(둘 다 해야 비친다). 나가는 비트의 텍스트·그래픽은 경계에서 컷(`cutTextAfter`) — `keep_text` 경계만 같이 페이드. 훅은 시작 페이드 없음(프레임 0 원칙). **엔드카드 질문이 CTA 문장과 같은 말이면 질문을 뺀다**(CTA 가 엔드카드까지 유지되므로 중복) · 엔드카드 4s.

### 4-5 사운드 세부 (`audio.json`)
- 내레이션: sync에서 `loudnorm I=-16 TP=-1.5 linear` → `public/pilots/<id>/audio/narration.wav`(원본은 `_raw`).
- BGM: `gain_db` × 페이드인/아웃 × 발화 덕킹(`duck_db`, attack/release, 프레임 함수) × `duck_ranges[]`(구간 덕, 예: 인용구 −18) · `start_offset_sec = intro_silence_sec + 0.5` · `loop`는 곡 길이 < 영상일 때만. **레벨 기준**: 1편(−16 소스 −8 → −24)은 "안 들어간 것 같다"(사용자 2026-08-30)로 폐기 → 발화 중 BGM이 내레이션 −12~−15 dB 아래(2편 gain −3.5·duck −8, 발화 틈 −26 dB RMS), 최종은 사용자 청취.
- SFX: `at` = scene_dissolve(전환 경계마다) / graphic:counter@1 / endcard / beat:id / sec:n. 파생물(트림·페이드)은 `external_assets/audio/derived/`.
- 측정: ffmpeg ebur128 통합 −14±1, TP ≤ −1 → `measured`에 기록. 구간별(발화/무음/첫 1초/엔드카드)도 본다.

### 렌더 산출물 이름
`out/pilots/<id>/ShortformNews_4-N.mp4`(원본, crf 18 ≈124MB) + `_preview.mp4`(crf 26 ≈24MB, 전달용). 층을 바꾸면 N도 바꾼다 — 이전 렌더는 픽셀 diff 기준선.

## B'. 커버 — 영상 조립과 별도 생성

커버는 [cover.md](cover.md)의 판단에 따라 문구·장면·배치를 함께 구상하고 완성 이미지를 생성한다. 영상의 조립층이나 HTML/CSS의 고정 레이어로 나누어 만들지 않는다.

`brief.md`·실제 프롬프트·참조 입력 → 생성 PNG → 결과 검수·수정 → 출력본과 `manifest.json`을 남긴다. 영상 스틸도 참조 자료로 쓸 수 있지만 필수 입력은 아니다. 저장 경로·수정 이력·원본 증거의 보존은 [cover-build.md](cover-build.md)를 따른다.

## C. 부품(프리미티브) — `src/lib/primitives/`, 레지스트리 `docs/specs/primitives.registry.v1.json`

| 파일 | id | 층 |
|---|---|---|
| `clock.ts` | `useBeatClock` (localFrame·fps·t·anim·secToF) | 공통 |
| `Background.tsx` | crop_frame@1 · kenburns@1 · split@1 · dim_gradient@1 · 클립 | shots |
| `Caption.tsx` | caption@1 · emphasis@1 | overlays |
| `Cards.tsx` | headline@1 · quote_card@1 · cta_card@1 · endcard@1 | overlays |
| `Tags.tsx` | inset@1 · label_tag@1 · credit_tag@1 · beat_id · safe_guides | shots/overlays |
| (Background) | `visual.dim`(텍스트 비트에서 직전 배경 유지·어둡게) · placeholder는 `showPlan`일 때만 | shots |
| (Caption) | `style.caption.backdrop`(반투명 밴드) · `skipLines`(그래픽이 대신하는 줄, `graphics[].replaces_caption_line`) | overlays |
| (Cards) | QuoteCard: 나온 문장까지만으로 세로 중앙, 새 문장 진입 시 8f 이동 · Endcard: 질문 + 크레딧 34px | overlays |
| (Graphics) | EvidenceCard `doc_opacity`·`quote_size` · Measure `label_w` | overlays |
| `Graphics.tsx` | counter@1(`format: arabic`) · evidence_card@1 · dot@1 · measure@1 · diagram@1 · **veil@1**(광해 장막) · **reveal@1**(덮개 걷힘) · **erase@1**(구현·미적용) · Icon(Tabler MIT) | overlays |
| `Onscreen.tsx` | **hook_title@1 · stat_block@1(`bar`) · quote_slab@1 · cta_bar@1 · timeline_axis@1 · threshold@1 · icon_strip@1** — `ONSCREEN_IDS`, `enter(clock, style, sec)`, `NumberUnit`, `Scrim`, `Frame(align)`. 폐기: arrow_step@1 · equation_block@1 · bullet_list@1 | overlays(텍스트층, graphics 토글 무관) |
| (Background) | `split.direction: "wipe"`(오른쪽 패널을 좌→우로 밝힘, 전/후 비교) | shots |
| (Tags) | Inset `in`(초)·영상(`.mp4/.webm` muted cover)·라벨 박스 ≥620px · LabelTag `inSec` | shots |

규칙: props만 받는 순수 컴포넌트, 스타일 토큰은 `style`(overlays.json)로 주입, 텍스트 가공 금지(원고는 생성기 책임), `kind: motion` 부품은 frame·fps 필수, 슬라이드는 항상 완성 상태. props 스키마: `docs/specs/primitives.props.schema.v1.2.json`. 부품 분리 시 이전 렌더와 픽셀 diff 0 확인.
- **부품 id 등기처는 넷** — 스크립트의 사본 둘은 없앴다(2026-09-02 감사, summary (과거 내부 기록·로컬 보관)). 어긋남은 `npm run check:registry` 가 본다.

  | | 등기처 | 무엇을 말하나 |
  |---|---|---|
  | ① | 렌더러 switch — `Graphics.tsx`·`Onscreen.tsx` 의 `case "<id>"` | 실제로 그려지나 (없으면 렌더에서 조용히 null) |
  | ② | `Onscreen.tsx` 의 `ONSCREEN_IDS` | 카드로 라우팅되나 (Beat.tsx) |
  | ③ | `docs/specs/primitives.registry.v1.json` | 계약 — `bind`·`impl`·`props`·`rules`·**`motion`**(B3 면제) |
  | ④ | `docs/specs/primitives.props.schema.v1.2.json` | 값의 형태 |

  `scripts/layout-43.mjs` 의 `ONSCREEN` 과 `scripts/check-shots.mjs` 의 `MOTION_GFX` 는 **하드코딩을 없애고 ①③에서 파생**한다(`scripts/lib/primitives.mjs`). 하드코딩 사본은 우연히 일치하다 갈라진다 — 실측으로 둘 다 폐기 3종을 안고 있었다.
- **효과 부품은 컷당 1회.** 비트를 넘어 이어질 때 값(`from/to`)이 역행하지 않게 — reveal이 b07(→1.15)·b08(0.5→1.15)로 연달아 있으면 덮개가 되감겼다 다시 열린다(2편 사례).
- **보조 텍스트 44px 하한은 구현에서 강제**(icon_strip 첫 구현 37px 위반). 훅 함수 이름은 `use*`를 피한다(rules-of-hooks — `enter()`).

## D. 3편 추가 부품·계약 (2026-08-30)
| 파일 | 추가 | 층 |
|---|---|---|
| `Graphics.tsx` | **orbit_deploy@1**(지구 호 + 고도 눈금 + 거울 전개, `earth_fill/earth_rim`으로 자막 밴드 위 대비 조절) · **radius_map@1**(지름 원 + 윤곽 다각형, 비트 넘어 이어질 때 `outline_done`) | overlays(그래픽) |
| `Onscreen.tsx` | `timeline_axis@1 milestones[{label,value,in,dots,grow_sec}]` + `sub` — 점은 수치 비례 누적, 축 왼쪽부터 정렬 | overlays(온스크린) |
| `Caption.tsx` | `splitCore()` — 강조 토큰을 [따옴표][핵심어][조사·구두점]으로, 핵심어만 accent | overlays |
| `Beat.tsx` | 인용 카드 텍스트 == 자막 텍스트(정규화)면 자막 생략 | overlays |
| `Tags.tsx` Inset | 영상 인셋에 `gen{}`·`origin_path` 기록 허용(생성 인셋) | shots |
| `endcard-credits.mjs` | 엔드카드 id를 beats에서, 생성 비트 있으면 AI 줄 자동(「배경·예시 영상 AI 생성」), `--extra` 꼬리 줄 | 4-6 |
| `make-overlays.mjs` | `--glue` 다어절 고유명사, 숫자+숫자 규칙 한정(맨 숫자·연도만), 명사+수량 보호, 의존명사+있·없 보호, 보호 때문에 못 넣으면 relax 재시도 | 4-2 |
| `asset-gaps.mjs` | sentence_fit+cut_fit 이중 등재 dedupe | 2' |

## E. 4편 추가 부품·계약 (2026-08-31) — Motion Canvas 층 포함
| 파일 | 추가 | 층 |
|---|---|---|
| `Graphics.tsx` | **globe_arc@1**(두 지점 아크+끝점 맥동 — `flat{x1,x2,y}` 모드는 림 없이 하단 아크만: 배경 피사체 관통 회피) · **orbit_path@1**(궤도 1.5랩→재진입→하강·거리 눈금·착수 리플, `phase: orbit|descent`) · **disc_dims@1**(원통→원반 치수 — MC 이관으로 4편 최종판은 미사용, 코드판 보존) · **capsule_section@1 v2**(면 셰이딩 단면·**백색 냉가스 제트**(facts #19 — 화염·주황 금지)·하단 에지 글로우 #E85D2B 한정·분리 잔상·캐노피 3분할+산줄+easeOutBack·리더선) · **nosignal@1**(노이즈 그레인) · **motion_clip@1**(외부 도해 알파 클립 배치 — props `file/from_sec/len_sec/fade_f`, `replaces_caption_line` 공용) | overlays(그래픽) |
| `Onscreen.tsx` | stat_block@1 `sub_in`(sub 도 낱말 시각) | overlays |
| `Cards.tsx` | QuoteCard `card.in_sec`(카드 지연 등장 — 자막 도입부와 이중 노출 완화) | overlays |
| `Tags.tsx` Inset | **영상 인셋은 패널 px 로 사전 파생이 정본**(렌더 폴백이 style 크기 무시 — v1부터 잠복했던 버그) + 래퍼 overflow 클립(안전망). **Inset 은 crop 미지원** — 크롭이 필요하면 파생 이미지(예: FAA top view) | shots |
| (외부) | **Motion Canvas 씬** = input `tools/motion-canvas/`(Remotion 과 의존성 분리, vite@5 핀) — 컴포넌트 StatNumber·LinkedBar·DimensionLine·LineGraph + appearSequence + theme(layer43 위계 정렬). 산출물 = 알파 webm 만 넘어온다 | 외부 도해 |
- MC 씬의 값·타이밍은 씬에 굽는다(shots 엔 배치만) — 수정은 재렌더 왕복. **사용 기준·발주 스펙·검증은 rules §5c · [stages-log.md](stages-log.md) 4편 · 명령 [commands.md](commands.md).**
- 도해 색 계약: 슬레이트 면(#3E4C5A/#242E38/#1B232B) = '음영 있는 개념 도해'(§AI 조건 3) · 열 표현은 하단 에지 글로우(#E85D2B)만 · 수치·강조 텍스트는 채널 노랑 단독.

> **부품은 파일 하나씩** (2026-09-03 분리). 구현은 `src/lib/primitives/graphics/<편>-<이름>.tsx`, `Graphics.tsx` 는 **라우터**(1,602줄 → 116줄)다.
> 색 계약(`BRIGHT_TUBE`·`SPACE_TUBE`)·공용 헬퍼(`DEG`·`durF`·`ellipsePath`·`rand`)·타입은 `graphics/contracts.tsx`.
> 새 부품은 **새 파일 + 라우터에 import 한 줄 + case 한 줄**. 이래야 4-3 에서 에이전트 여럿이 동시에 쓸 수 있다.
> **감광(`scrim@1`)은 그래픽이 아니라 배경 층**이다 — `Beat.tsx` 가 `BACKDROP_IDS` 를 Background 직후에 그린다. graphics 자리에 두면 자막·온스크린·도해까지 눌린다(7편 v2 실측: 자막 흰 글자 255 → 181~194, 인용 138).
