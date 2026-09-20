# 파일·스키마 지도

파일럿 루트 `<root>` = `<저장소>/news/<id>/` (input 세션 저장소). 이 저장소(output)는 코드·스펙·렌더.

## input 쪽 (`<root>`)
| 파일 | 내용 | 스키마/규칙 |
|---|---|---|
| `01_input/` | 원본(수정 금지), `MANIFEST.md`, `assets.json`(assets + external_assets + brief_assets{free,paid_candidates} + overlay_assets + **`cut_map`·`cut_fit`**) | id·path(root 기준)·width/height·credit 원문·license·license_url·origin_url·rights_status(cleared/unconfirmed/restricted/rejected/**unused** = 대본 제공본을 기관 원본으로 대체)·sentence_fit/beat_fit·supersedes_generated. `cut_map[C]{script_asset, sentences[], onscreen}`(대본 컷 → 문장·지정 자료), `cut_fit{primary, alt}`(컷별 1순위·대안 자산) |
| `02_production/overlay_texts.md` | 대본 「자막(온스크린 텍스트)」 열 원문 + 컷 매핑 | 온스크린 문구의 단일 소스(원문 보존) |
| `02_production/gen/<pilot_tag>/` | 생성 원본(mp4)·시작 프레임 | `shots.gen.output`·`gen.start_image`가 가리킴 |
| `02_production/asset_brief.v3.json` | 3′ 회수 요청(비트·A/B 판정·wanted·avoid) | 소진 판정 회신은 input 문서 |
| `02_production/facts.md` | 사실 잠금(#번호)·캡션·표기표·대본 불일치·AI 생성 금지 | 화면 표현 규칙 열 = shots notes가 인용 |
| `02_production/substitutions.json` | 자막표기→낭독표기 치환쌍 | overlays 강조 후보 |
| `02_production/narration.txt` + `narration.json` | 낭독본 / 정렬 결과 v1.1. 표준 `sentences[]`와 이관 `lines[]`를 같은 내부 형식으로 정규화 | `narration.schema.md` (input) |
| `02_production/story.json` | `editorial-concept@1`의 전체 질문·결론·대본 정책·창작 위임 범위·개념 순서 | `docs/specs/editorial-concept.schema.md` |
| `02_production/concepts.json` | 여러 내레이션 줄을 묶는 개념 장면·표현 선택·유지/추가/제거 상태·모바일 정보 예산 | 같은 스펙 |
| `02_production/motion.json` | 단어 위치에 묶인 등장·정착·퇴장·의존·조건쌍·SFX 결합 | 같은 스펙 |
| `02_production/visual-system.json` | 공통 자막 프로필 참조·풀블리드·상단 고정문구 금지·모바일 라벨 예산·renderer 미디어 원본/파생 경로 | 같은 스펙 |
| `02_production/timeline.json` | 위 네 파일과 내레이션에서 컴파일한 렌더용 시간표·event proof·입력 해시. 직접 수정 금지 | `npm run editorial:compile` |
| `02_production/audio.json` | 분리 narration/BGM/SFX 또는 품질 확정 통합 믹스. 통합 믹스는 `master_mix:true`와 편 고유 `audio/*.wav` 경로를 쓴다 | `docs/specs/audio.schema.md` |
| `02_production/external_assets/` | 원본 + `SOURCES.md` 대장 | 소스별 폴더(eso/nasa/wikimedia/stock/openverse/brief/<beat>/overlay/) |
| `02_production/asset_brief.json` | output→input 소싱 요청 | beat·text·keywords·wanted·avoid·fallback |
| `02_production/credit_log.md` | 생성 도구 크레딧 소모 | job_id·비용·파일 |

## output 쪽 (이 저장소)
| 파일 | 내용 | 스펙 |
|---|---|---|
| `<root>/02_production/beats.json` | 시간층 | `docs/specs/beats.schema.md` |
| `<root>/02_production/overlays.json` + `overlays.overrides.json` | 텍스트층 + 편집 덮어쓰기(card/headline/credit만) | `docs/specs/overlays.schema.md` |
| `<root>/02_production/shots.json` | 화면층 (+insets, graphics, clip) | `docs/specs/shots.schema.md` (4-3 계획표 포함) |
| `pilots/<id>/render.config.json` (조립층 소유 — `02_production` 에 두지 않는다, sync 가 덮어쓴다) | `layers{motion,text_anim,graphics,transitions,sound}`, `transitions{crossfade_frames,scene_only,overrides,keep_text,end_fade_frames}`, `debug.show_beat_id` | layers.md §B |
| `<root>/02_production/audio.json` | `narration{file,gain_db}`, `bgm{asset,file,gain_db,duck_db,duck_attack_sec,duck_release_sec,fade_in_sec,fade_out_sec,start_offset_sec,loop,credit}`, `sfx[{id,asset,file,gain_db,at}]`, `master_gain_db`, `measured` | `docs/specs/audio.schema.md` |
| `<root>/02_production/asset_gaps.json` | 자료 공백 플래그 | beats.schema.md §자료 공백 |
| `pilots/<id>/*.json` | 위 JSON의 동기화 복사본(커밋 대상, 빌드에 필요). 미디어 경로는 편 상대(`ext/…`, `pilot/` 접두 없음 — sync 가 벗긴다) | `scripts/sync-pilot.mjs` |
| `pilots/<id>/pilot.json` | 편 매니페스트 — id·제목·기사·상태·input 경로/커밋·`engine`(`script-faithful@1` 또는 `editorial-concept@1`)·`engine_commit`·**`guards[]`**(이 편이 받는 가드 세대 — `check-all` 이 해당 경고를 오류로 승격. 실측 통과분만 선언, 옛 편은 비운다)·`versions[]`(납품본 `file`·md5·LUFS·master)·`gates_open`·docs·linear | sync 가 뼈대, 사람이 채움 → `npm run pilots` 가 대장 생성 |
| `src/editorial/episodes/<id>.tsx` | `editorial-concept@1` 편별 개념 장면. 중앙 런타임이 timeline·자막·오디오를 주입하며 placeholder가 남으면 등록을 막는다 | `scripts/pilots-index.mjs` |
| `pilots/active.json` | Studio 에 등록할 편 id 목록 → `pilots/index.ts`(생성) | sync 가 추가, 납품·보관 편은 빼도 됨 |
| `public/pilots/<id>/` | 파생 미디어(ext/ 4000px, video/ 트림 클립, overlay/ 컷아웃·증거, audio/narration.wav, fonts/) — git 제외 | sync + ffmpeg/sips |
| `docs/specs/primitives.registry.v1.json` · `primitives.props.schema.v1.2.json` | 부품 레지스트리(id@version, kind, layer, status, license_scope) · props JSON Schema | layers.md §C |
| `pilots/<id>/pilot.json` `thumbnails` | 생성 커버 위치 — `method: "image_generation"` · `target` · `manifest` · `candidates[]{id,file,status}` · `history`(기존 기록 보존) | 단계 9, [cover-build.md](cover-build.md). 과거 HTML 대장은 소급 변환하지 않는다 |
| `design/thumbnails/<id>/v<N>/manifest.json` | 생성 커버 상세 기록 — `cover-generation/v1` | [cover-record.json](../templates/cover-record.json), 아래 필드 설명 |
| `pilots/<id>/script_cuts.json` | 대본 컷 8개 원문(자막·화면 구성 제안·참고자료·메모·썸네일) | 슬라이드 패널 원천, 원문 그대로 |
| `docs/specs/shot_fit*.md` · `gen_plan*.md` | 3′ 판정표·헌장 대조표·회수 기록 / 8 출처 분류·후보·실행 로그·채택 | [track-3prime.md](track-3prime.md) |
| `docs/INDEX.md` | 색인(조사·스펙·결정) | 한 줄 한 행 |

## 핵심 필드 요약

**beats[]**: `id role scene clause piece text speech_start speech_end start end duration start_frame end_frame duration_frames words[]`
**overlays[]**: `beat role caption{text lines lines_timed[] words speech_start speech_end} headline{text kicker} emphasis[{index text kind pop}] card{type text attribution lines emphasis block{lines own_sentence sentence_count attribution stagger_sec} question source} credit`
**shots[]**: `beat scene role visual{type source asset file src_size crop split{…direction:"wipe"} motion clip clip_option{visual credit why} video_file video_option origin_path license label dim} label_overlay label_overlay_in insets[{file src_size x y w in opacity border label credit asset layout}] inset_option{removed[] why date restore} graphics[{id in props note layout hierarchy replaces_caption_line(number|number[])}] graphics_disabled[] gen{kind provider model job_id variant status output start_image alternatives[] credits prompt prompt_avoid[]} ai_allowed credit needs[] notes layout{inset card graphic hierarchy}`
**shots.layer43_plan**: `_comment · layout{zones{<name>{y|center_y side align label_lift desc}} inset_sizes{XS S M L} hierarchy{H1..H4 caption} max_layers rules[] pilot_rules[]} · <beat>{fact how **tier** **ref** what why graphics[] insets[] layout{inset:"<zone>-<size>" card graphic hierarchy}} · none[]` — `tier` = §5c 3단 판정 결과(`1|2|3a|3b|3c`), `ref` = 레퍼런스 근거(tier 1·3b 필수). 둘 다 `npm run gate -- <id> 4-3` 이 착수 전에 검사한다 — 존 이름만 적고 px는 `npm run layout:43`이 shots[]에 써 넣는다. 템플릿 `templates/layer43_plan.json`.
**`rules` 는 표준(템플릿에서 파생·수정 금지) · `pilot_rules` 는 이 편의 결정** — 한 배열에 섞으면 편별 복제본을 통해 앞 편 규칙이 따라온다. 실측 2026-09-02: **5편 15줄 중 4줄이 4편(«우주택배») 것**이었다. `[plan-rules-standard]`(표준 대조) · `[plan-rules-foreign]`(다른 편 제목이 든 줄) 이 본다.
**style**(overlays.json): `font_family colors{bg text muted accent quote} sizes{headline caption card attribution credit cta endcard_question} safe{x y} caption{anchor_y max_chars_per_line min_chars_per_line max_lines line_height backdrop} card{center_y line_height} headline{top_y frame0} cta{center_y keep_on_endcard comment_prompt} onscreen{center_y size sub_size weight scrim scrim_span rise_px in_frames line_height}`
**audio**: `master_mix:true`면 narration.file 하나가 내레이션·BGM·SFX가 합쳐진 확정 믹스이며 중앙 런타임은 cue를 중복 재생하지 않는다. 분리 믹스의 **audio.bgm** 추가: `duck_ranges[{from to gain_db attack_sec release_sec why}] source_lufs intro_silence_sec note` · **measured** 추가: `segments{speech_* gap_* endcard_lufs} lra_lu pass`
**visual-system.media.assets[]**: `{id source file trim?{from_sec duration_sec}}`. `source`는 편 루트 안, `file`은 `editorial/` 아래. sync가 복사·트림하고 preflight가 실물을 확인한다.
**timeline.proof_frames[]**: `{id frame labels[]}`. 개념 경계와 모든 motion `from/settled/to/end`를 컴파일러가 중복 제거해 만든다.
**온스크린 부품 id**(graphics[].id, 텍스트층): `hook_title@1 stat_block@1 quote_slab@1 cta_bar@1 timeline_axis@1 threshold@1 icon_strip@1` (폐기 `arrow_step@1 equation_block@1 bullet_list@1`) · 그래픽 추가: `veil@1 reveal@1 erase@1(미적용)`. props는 `docs/specs/primitives.props.schema.v1.2.json`, 낱말 시각은 `*_in`(초, 비트 시작 기준)
**audio_assets[]**(assets.json, input): `id role rank path duration lufs_integrated lra bpm_est drum_strength bright_hz fit_score intro_silence_sec intro_rms_db_0_5s intro_note credit license license_url`

## 3편 추가 필드 (2026-08-30)
- **shots[].visual.clip_option.nested_option** — 되돌림이 2단(상상도 → ISS 실사 → 생성)일 때 안쪽 대안. `inset_option{removed[],why,date,restore}`는 인셋 되돌림.
- **shots[].gen_rejected** — 기각된 생성 기록(`status: rejected`, `rejected_why`), 파일은 `gen/<pilot_tag>/`에 보관. `gen.alternatives[]`에 기각 변형과 사유.
- **shots[].insets[].gen / origin_path** — 생성 인셋.
- **graphics props** — `timeline_axis@1.milestones[{label,value,in,dots,grow_sec}]`·`sub`·`sub_in` / `orbit_deploy@1{center,earth_r,alt_px,alt_label,alt_in,alt_sec,mirror_label,mirror_in,unfold_sec,mirror_size,sat_angle,earth_fill,earth_rim}` / `radius_map@1{center,radius_px,radius_km,radius_in,grow_sec,label,outline,outline_in,outline_label,outline_done}`.
- **assets.json(input)** — `brief_assets{free[],unmet[{beat,request,verdict,reason[]}]}` · `audio_assets[].selected_by` · `exhaustion[]`(소진 판정) · `cut_map[C]{script_asset,sentences,start,end}`.
- **render.config.transitions.keep_text** 기본 `[]` — 인용 카드 연장이 필요하면 카드만 연장하는 별도 플래그를 두기 전까지 쓰지 않는다(자막 겹침).
- **audio.json.measured.segments** — `gap_quote_duck[]`처럼 창 여러 개를 배열로.

## 4편 추가 필드 (2026-08-31)
- **shots[].graphics[] `motion_clip@1`** — props `{file, from_sec, len_sec, fade_f?, x?, y?, w?, h?, opacity?}`(알파 webm, public 기준). `replaces_caption_line` 공용. 교체된 코드 부품·온스크린은 **`graphics_disabled[]`** 보관(되돌림 단위).
- **shots[].gen_superseded** — 생성물이 공식 실사·MC 로 대체된 이력(`status: superseded`, why, credits).
- **overlays.overrides card.`in_sec`** — 인용 카드 지연 등장(낱말 시각).
- **assets.json(input) `motion_clips[]`** — MC 납품 대장(path·프레임·타이밍·알파 bbox 실측·license "자체 제작(Motion Canvas)"·credit null·cleared). 씬 소스는 `tools/motion-canvas/src/scenes/`.
- **온스크린·그래픽 부품 id 추가(4편)**: `globe_arc@1(+flat)` `orbit_path@1` `disc_dims@1` `capsule_section@1(v2)` `nosignal@1` `motion_clip@1` · stat_block `sub_in` — 부품 추가 시 등기처 4군데(layers §C) — `motion`(B3 면제)은 registry 필드다.
- 파생 이미지 인셋: Inset 은 crop 미지원 — 크롭 파생본(`ext/<name>.png`)을 만들고 src_size 를 파생본 기준으로.

## 생성 커버 기록

[cover-record.json](../templates/cover-record.json)은 생성 커버의 기록 양식이며 자동 검증 JSON Schema가 아니다. 경로는 저장소 루트 상대경로다.

- 상위 `episode`는 편 폴더명, `target`은 배포 목적, `brief`는 사실·훅·시안별 의도를 적은 파일 경로다.
- `branding`은 로고 상태(`placeholder`·`provided`), 원본 로고 경로 또는 `null`, 미수령 문구와 캔버스 대비 공통 영역(`area_normalized`)을 기록한다. 영역 수치는 의도한 규격이며 실제 일치 여부는 실물 검수에 남긴다. `presentation.include_style_reference: false`는 사용자 제출 화면에 기준 PNG를 넣지 않는다는 뜻이며 생성 입력에서 제외한다는 뜻은 아니다.
- `candidates[]`는 수정본을 포함한 시안 목록이다. `id`는 기록 안에서 고유하고, `copy`는 이미지에 들어간 제목을 줄별로 보존한다. `hook`은 볼 이유, `visual_intent`는 장면으로 전달하려는 내용, `prompt_file`은 실제 사용한 프롬프트 파일이다.
- `reference_inputs[]`는 `{file, role, handling, credit, license}`다. `role`은 `style`·`subject`·`evidence`, `handling`은 `preserve`·`reinterpret`다. 실제 증거를 제시하는 입력은 `evidence`·`preserve`로 기록한다. 모르는 출처·사용 조건은 `null`로 두고 확인이 필요한 내용을 `review.issues`에 남긴다.
- `generation`은 실제 도구명, 반환된 모델명·작업 ID, **보관한 생성 원본 경로**(`original_output`)다. 도구가 알려주지 않은 모델·ID는 `null`이다.
- `output`은 사용자에게 보여준 파일과 실제 폭·높이(px)다. 규격 변환 시 생성 원본과 분리한다. `revision_of`는 수정 전 시안 `id`이며 새 시안은 `null`이다.
- `review`는 `status`(`draft`·`needs_revision`·`reviewed`·`approved`), 실제 확인 내용 `checked[]`, 남은 결함 `issues[]`다. `approved`는 사용자 채택 때만 쓴다.
- `credits[]`는 `{text, placement}`다. 출처·개념도·재구성 표기의 실제 문구와 위치를 기록한다. 필요 없으면 빈 배열이다.
- `pilot.json.thumbnails.candidates[].status`는 해당 시안의 `review.status`를 따르고, 상세 내용은 `manifest`에서 읽는다. 새 작업으로 포인터를 바꿀 때 기존 `history[]`는 유지하고, 직전 `thumbnails`에서 `history`를 제외한 기록을 한 항목으로 추가한다.
