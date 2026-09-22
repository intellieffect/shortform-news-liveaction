# shots.json 스키마 v1.0 — 화면층 (beats + assets → shots)

작성: 2026-08-27, 세션 "output". 입력: `beats.json` v1.0, `assets.json`(input), `facts.md` 금지 규칙. **손으로 작성**(편집 판단) + `scripts/check-shots.mjs`로 검증.
비트마다 화면에 "무엇을" 보여줄지 정한다. 사진/그래픽/텍스트를 비트별로 따로 만들고, 일부 비트는 생성 스틸 → Higgsfield i2v로 영상화해 끼운다 (2026-08-27 사용자 결정).

원칙 3개
- **문장이 말하는 것을 보여준다.** 우선순위 영상 > 사진 > 그래픽 > 텍스트만. 같은 씬(문장) 안에선 같은 에셋, 인접 씬은 다른 에셋.
- **AI 생성은 `ai_allowed: true`인 비트에서만.** 실제 관측·실존 시설·실존 인물·위성 실물·로고·특정 도시·"10만" 혼동은 제공 자료만 (facts.md 7항).
- **생성물엔 글자·선을 넣지 않는다.** 텍스트는 overlays가 얹는다. i2v 클립 길이 = 비트 길이 + 0.5s.

## 필드

| 필드 | 뜻 |
|---|---|
| `visual.type` | `image` \| `video` \| `graphic` \| `text` |
| `visual.source` | `provided`(한겨레 제공) \| `external`(기관 실사 — ESO CC BY 4.0·NASA PD·커먼즈, **크레딧 의무**) \| `stock`(Pexels·Unsplash·Pixabay, **크레딧 권장**) — 대장 `external_assets/SOURCES.md`, 확보 절차 `docs/asset-sourcing-workflow.md` \| `generated`(AI 스틸/클립) \| `remotion`(코드로 그림) \| `none`(배경색만) |
| `visual.origin_path` / `license` / `video_file` | 외부 소스 원본 경로(root 기준)·라이선스·영상 원본. `file`은 `public/pilots/<id>/ext/`의 2400px 파생물(영상은 포스터 프레임) |
| `visual.asset` / `file` | `assets.json` id / `public/` 기준 파일 경로(`pilot/photo1.png`). `sync-pilot.mjs`가 복사 |
| `visual.src_size` | 원본 [w, h] px. 크롭 계산용 |
| `visual.crop` | `{x, y, w, h}` 원본 대비 비율(0~1). 구워진 캡션 제외 + 9:16 영역. 렌더는 이 영역을 cover로 채운다 |
| `visual.split` | 전/후 비교 `{direction, crops[], labels[]}`. 슬라이드는 상하 분할로, 영상은 `motion.type: wipe`로 렌더 (b10) |
| `visual.motion` | 켄번스 `{scale_from, scale_to, dx, dy}` 또는 `{type: wipe, from, to}`. 슬라이드 단계에선 무시, 영상 단계에서만 |
| `label_overlay` | 화면 위 작은 설명 태그. 예측·시뮬레이션 이미지에 필수 (facts C: "우주거울 5만기 배치 시 예측 (ESO)") |
| `gen` | 생성 계획. `kind: still`, `provider`, `from`(다른 비트 산출물 재사용), `prompt`, `i2v: {provider, motion, duration_sec, status}`, `status: planned→generated→approved`, `output`(생성 파일 경로) |
| `ai_allowed` | facts.md 금지 규칙 판정 결과 |
| `credit` | 좌하단 출처 문구. 렌더는 `shot.credit ?? overlay.credit` |
| `kw[]` **(B 비트 키워드, 2026-09-04)** | **이 문장이 무엇을 보여달라고 요구하나.** 항목은 **그 비트 문장에서 그대로 인용**한다(부분 문자열 검사 — 형태소 분석기 없이 판단의 범위를 묶는 장치다). **A 화제 표가 이미 잡은 낱말은 다시 적지 않는다** — 요구는 A ∪ B 합집합이고, A 는 `beats.json[].kw` 로 자동으로 걸린다. 요구가 없으면 `[]` 로 **선언**한다(필드 자체가 없으면 오류 — 「안 뽑았다」와 「뽑을 게 없다」를 가른다). 편에 이 필드가 하나도 없으면 B 미도입으로 보고 통째로 건너뛴다(1~7편 호환) |
| `kw_carry` | 앞 비트의 화면을 잇는 비트. `"b15"` 처럼 비트 id. 이 문장이 새로 요구하는 것은 없지만 앞 화면이 계속 일한다는 선언 |
| `kw_waived{낱말: 사유}` | **「안 그린 것」과 「빠뜨린 것」을 가른다.** 사유가 비면 면제가 아니다 |
| `stickers[]` **(자리 예약, 2026-09-04)** | **배경 위에 얹는 생성 오브젝트.** 실사도 없고 도해로도 안 되는 비트 키워드를 알파 잘라낸 그림 하나로 **낱말 시각**에 세운다 — 3단 판정 **tier 3a(은유)** 에 대응하는 자리이고, 그전에는 이 자리가 없어 배경 전체를 생성으로 바꾸는 수밖에 없었다(8편 b09 윔프 = 생성 3회 실패). 인셋(②)의 형제 — **인셋은 실사를 창으로, 스티커는 생성물을 알파로.** 항목: `id` · `kw_served[]`(그 비트 문장에서 인용) · `in`(낱말 시각, `beats[].words` 파생) · `dur` · `anchor`·`size`(존에서 파생, px 직접 금지 R1-05) · `file` · `gen{provider,prompt,status}`. **사실을 나르지 않는다** — 수치가 붙으면 도해로 간다. `facts.md` §AI 금지가 그대로 적용된다(고유명사·실존 시설·인물 금지, 관측 결과 흉내 금지 — **양식화가 그 안전장치다**). **형태는 프롬프트가 만든다** — 계약(`02_production/sticker_contract.md`)이 문형을 고정하고, 편은 §6 목록만 채운다. 후처리는 `npm run sticker:cut` 하나(단색 평면 배경 + 흰 다이컷 테두리 → 가장자리 flood fill). 게이트 **E9** 가 계약·`gen.prompt`·`kw_served` 를 요구한다 |
| `visual.kw_served[]` / `graphics[].kw_served[]` / `insets[].kw_served[]` / `stickers[].kw_served[]` | 이 화면·부품·인셋이 수행하는 **화제 키워드**(`facts.md` 표의 낱말 그대로). 배경이든 도해든 인셋이든 **누가 그 낱말을 화면에 세웠는지**를 한 칸에 남긴다. `check-shots` 가 `kw N/M on-screen` 으로 세고, 표에 없는 낱말은 `[kw-served-unknown]`, 말하는데 수행자가 없으면 `[kw-unserved]` |
| `needs[]` | 확정 전 필요한 것(사용권·고해상·다운로드·생성). 비어야 확정 |

## 검증 (`node scripts/check-shots.mjs <root>`)

0. **화제·비트 키워드 집계** — `kw N/M 낱말 · N/M 비트` + `비트: 배경 a · 인셋 b · 스티커 c · 도해 d · none e · 면제 f`. **수행자 종류가 보이면 편이 어떤 화면인지가 숫자로 읽힌다**(8편 실측 도해 13 · 배경 4 = 도해로 버틴 편).
   차단은 셋뿐 — `kw` 빈칸(`[kw-beat-missing]`) · 인용 위반(`[kw-quote]`) · 그 외는 전부 경고다. **전부 「적었나」를 묻지 「잘 했나」를 판정하지 않는다.** 4-3 착수 게이트 E8 은 **실물 ✅ 인데 수행자 없음**만 막는다(실물 ❌ 는 note — 도해냐 자막이냐는 설계다)
1. beats ↔ shots 1:1
2. 에셋 존재·타입 일치, 사용권 미확인이면 `needs`에 있어야 함
3. `generated`는 `ai_allowed: true` + prompt(또는 `from`) 필수
4. 크롭 범위·9:16 비율·업스케일 배수(>2.5 경고)
5. 인접 씬 같은 에셋 경고
6. i2v 길이 ≥ 비트 길이 + 패딩

## 재배정 v2 (2026-08-28) — 생성보다 실사 우선

외부 실사 12비트(ESO eso2607a/b/c 원본 4000px, ESO 타임랩스 2편 1080p, 커먼즈 VLT 항공 8000px·Starlink CTIO 2019 7939px, NASA ISS066 지구 림), 생성 유지 4비트(b09 우주거울·b11 익명 도시·b19/b20 해변 — 외부 소스 없음 또는 facts #14 충돌). 크레딧은 비트 하단 소자막 + 엔드카드 블록에 원문 그대로(ESO 조건, 로고 금지). 대체된 생성 스틸은 `gen.status: superseded`로 보관.

## 초안 v1 배정 (2026-08-27)

| 비트 | 화면 | 소스 |
|---|---|---|
| b01 훅, b21 CTA | photo1 위성 궤적 (다른 크롭 → 루프) | provided |
| b02 | 궤도 점 무리 추상 | generated + i2v |
| b03, b04 | ESO 타임랩스 video2/video1 (미다운로드) | provided → 폴백 photo1/그래픽 |
| b05, b18 | 배경색 + 자막만 | none |
| b06 | 점이 불어나며 176만 (합계만) | remotion |
| b07, b08 | photo2 100만기 시뮬레이션 (모션 없음) | provided |
| b09 | 우주거울 추상 반사 아이콘 | generated + i2v |
| b10 | photo3 상하 분할(실측→예측), 영상은 좌→우 와이프 | provided |
| b14, b15 | photo3 오른쪽(예측) + 태그 "우주거울 5만기 배치 시 예측 (ESO)". s08 아래 '3~4배' 숫자 금지 | provided |
| b11 | 익명 도시 실루엣 + 밝은 점 | generated + i2v |
| b12, b13 | photo4 VLT 전경 | provided |
| b16, b17 | 돔 실루엣 / 소행성·대기층 추상 | generated (+ i2v) |
| b19, b20 | '천상의 해변' 추상 (한 클립 공유) | generated + i2v |
| b22 | 엔드카드 | remotion (브랜드 대기) |

생성 스틸 6장(b02·b09·b11·b16·b17·b19), i2v 클립 5개(b02·b09·b11·b17·b19+b20). 제공 사진 4장 모두 사용권 미확인·업스케일 ×3 이상 → ESO 원본 필요.

## 4-3 그래픽 층 계획 (2026-08-28, input 합의 — 착수 전 메모)

오버레이 자산은 `assets.json overlay_assets[]`(배경 external_assets와 분리), 원본 `external_assets/overlay/`. 프리미티브 `inset@1`(shots, static, props {asset_id, x, y, w, opacity, in, out, inset_shrink}) · `evidence_card@1`(overlays, 문서 크롭 + 하이라이트 박스 + 소출처).

| 비트 | 자산 | 배치 |
|---|---|---|
| b10 | `cutout_moon` (NASA PD, 1986px 알파) | 실측 반쪽(상단) 우상단 인셋, "4배" 강조와 동기. "3~4배" 숫자는 s06에서만 (facts C) |
| b06 | `cutout_earth` Blue Marble (2048px) | counter@1 중심 — 점이 지구 주위로 늘어남, 합계 176만만 (#6) |
| b17 | `cutout_bennu` 커먼즈 BennuAsteroid PolyCam 모자이크 (PD, 1183×1125 알파) | 좌상단 인셋 ≤600px, 인과 화살표 없음 (#25) |
| b12 | `evidence_arxiv_hainaut2026` 1페이지 PNG 1600px | 제목+저자 크롭 y 0.12~0.25 (제목 2줄 + O. R. Hainaut + ESO 소속줄). 크레딧 "O. R. Hainaut (ESO), arXiv:2604.09427" |
| b13 | 같은 논문 | 초록 Conclusions 구절 하이라이트: "the total satellite population should remain below ~100 000 satellites" (facts #16·#28 원문 근거) |
| b19·b20 | ESO 보도자료 eso2607 (2026-07-01, CC BY 4.0) 영문 원문 | 증거 카드 = 영문 첫 문장 "Low Earth orbit is a celestial seashore…" + 소출처 "ESO 보도자료 eso2607 · 한겨레 번역". 출처 사슬: ESO 영문 → 한겨레 번역(¶15) → 대본 축약. (논문엔 이 문장 없음 — arXiv는 b13 "100 000" 근거 전용) |
| b04·b09 | Tabler 아이콘 (MIT, 9종 SVG) | 카운터 보조 / 우주거울 보조(satellite·sun) — 위성 실물 대신 아이콘 |

컷아웃 공통: 원형/윤곽 알파 + 1.5~2px 페더. 가장자리 검은 링은 `inset_shrink: 1`로 처리.
