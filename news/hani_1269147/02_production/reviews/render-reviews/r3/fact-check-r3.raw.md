# fact-check 회신 원문 (P7 r3, 2026-09-23) — 대상 MP4 production-182ca8fa (sha256 09e0fc39a1141f25727094b5b829a594aa8daa2a896801cd6f28cd84706b9994, render 273f3ebb, 2580f / 86.058667s / 30fps)

Round r3 verdict: pass. Blocking 0. Minor 1 open (heavyband, second half). The MP4 audio was not listened to.

Inputs checked: narration.json sha256 bd71688a… (same as r2, same as pilots/ copy); rendered tsx src/editorial/episodes/hani_1269147.tsx sha256 e027cbbd… (equals the render 273f3ebb input record in run.json); concepts.json (news/ and pilots/ same content); pilots/hani_1269147/timeline.json resolved event frames; facts.md sha 0cc545c4… (unchanged); article ¶12/¶13/¶17/¶19/¶23 (lines 12, 13, 17, 19, 23 of the preserved article md).

## Rechecks of r2
- r2:b1rest — FIXED. [1902,1991) boxed label 「연구진 모델 예측」 (model_note2) is on screen with the first clause of s14 「새는 건 가장 가벼운 기체뿐.」 (voice/caption 1903–1963). Seen in f1905, f1915, f1930, f1960, f1975, f1985; gone at f1993. f1898 (before s14) has no label. The clause is now marked as the model (F11, article line 12 「컴퓨터 모델링을 통해 추론」). The label also stays over 「아래엔 무거운 기체가 남아」 until ~1991, which matches article line 19 (possibility), so no conflict. Narration is unchanged; the model condition is carried by the screen label, not the voice.
- r2:m2label — FIXED. [2136,2237) label reads 「이 대기 / 30억 년 넘게 유지돼 왔을 / 가능성 높음 · 연구진 추산」 (f2150, f2200, f2230; strip 2112–2140 last tile). Matches F22 / article line 23 「30억년 이상 유지돼 왔을 가능성이 높다」. tsx L382 now 「넘게 유지돼 왔을」.
- r2:gap945 — FIXED. Strip 938–949: 938–941 TRAPPIST diagram with labels fading; 942–944 the code-drawn TRAPPIST diagram alone (dark background, star + 7 dots, not a generated image) while labels finish fading; from 945 the AI-generated planet-limb image appears together with the static 「컴퓨터 모델 예측 · 관측 아님」 from its first frame (f946, f950, f956, f960). No unlabeled generated frame found in 938–960.
- r2:heavyband — OPEN (minor, first half fixed). Band now starts at 1995 (s14 「남아」 66.56 s); f2000 faint, f2010 visible with caption 「있을 수 있고, 온실효과를」 (hedge at 2006), settled 2030 (f2030). The 1968–1995 part is gone. Unchanged part: the box 「무거운 기체가 남아 있을 수 있고, 온실효과가 있다면」 exits at 2120, and the band stays through s15 to 2237. At [2120,2136) the band is on screen with only the caption 「이 대기는 30억 년 넘게」 and no possibility marker (strip 2112–2140 tiles 3–7); from 2136 the age label 「가능성 높음 · 연구진 추산」 sits beside it, but that label is about the age, not the heavy layer. The narration carries the hedge, so minor.

## Rechecks of r1 (on this MP4)
- r1:B1 — FIXED. Both halves: first clause marked 「연구진 모델 예측」 (see r2:b1rest); second clause 「무거운 기체가 남아 있을 수 있고, 온실효과를 낸다면 액체 바다도 가능합니다」 with the box 「무거운 기체가 남아 있을 수 있고, 온실효과가 있다면」 + 「액체 바다 가능성」 [2038,2120) (f2060, f2100). Matches F19 / article line 19.
- r1:m1 — FIXED. Close [2236,2580) has 「상상도 · AI 재구성」 from 2240 to 2578 (f2240, f2250, f2320, f2400, f2480, f2540, f2578). Credits [2365,2557) include 「행성·별 장면: AI 생성 상상도 · 도해는 원리 개념도」 (f2400, f2480, f2540). The short gap is closed (see r2:gap945).
- r1:m2 — FIXED (see r2:m2label).
- r1:m3 — FIXED, holds. Dark line at the red end of the band, 「헬륨 흡수선」, no nm, 「통과 관측 원리 도해 · 실제 데이터 아님」 (f1640, f1700, f1725).
- r1:m4 — FIXED, holds. Photo note 「사진: Denys / Wikimedia Commons · CC BY 3.0」 (f1320, f1400); credits 「마젤란 망원경 사진: Denys / Wikimedia Commons · CC BY 3.0 (creativecommons.org/licenses/by/3.0) · 크롭 · 2004년 촬영」 (f2480).
- r1:m5 — FIXED, holds. s02 caption 「그런데 이게 오히려 반가운」 (f150); no attribution to scientists, no quotation marks.

## New / carried findings
- heavyband (minor) — [2120,2237) heavy_layer band stays after the condition box leaves, without its own possibility marker (see recheck).
- No new violations.

## Pass by item (r3 MP4)
F1 s04 「최소」 + list 단단한 땅 / 액체 물이 남을 온도 / 대기 (f420, f600). F2/D1 「LHS 1140b / 49광년 · 암석형」 (f250); article figure 49. F4/D3 s13 「골디락스 영역 암석형 행성 / 대기 확인 · 처음」 (f1760, f1850). F5 goldilocks check (f600). F7/F9 s06 「적색왜성 / 강한 복사 ↓」, 「~곤」, note 「상상도 · AI 재구성 + 도해」 (f700, f780). F10 s07 label now 「TRAPPIST-1 행성계 · 개념도」 with separate large 「대기 흔적 찾지 못함」 (f870, f930, f940); code diagram of 7 dots, 41광년 unused — the 「개념도」 marker now sits on the diagram name, and the finding sentence stands alone, consistent with F10 note (no 「관측 결과」 attribution). F11 s08 「연구진의 모델에선」 + static 「컴퓨터 모델 예측 · 관측 아님」 from 945, split labels 「수소·헬륨 ↑ 조금씩 우주로」 / 「질소 ↓ 아래에 남음」 (f1000, f1100, f1250). F12 s09 「있을 것」 (f1250). F13 s10 「2024년 / 마젤란 망원경 / 칠레 라스캄파나스 천문대」, real photo (f1320, f1400). F14 s11/s12 absorption line, no nm (f1560, f1640, f1700). F17 s16 「2025년 관측 / 헬륨 신호 없음 / 방출량 변동 가능성으로 해석」 (f2250, f2320). F19 s14 (see B1). F22 s15 (see m2label). F23 s17 「이정표」 (f2480). Credits 「Science, Cherubim et al. 2026 (DOI 10.1126/science.aea9708) · 한겨레」, 「"On the Shore" Kevin MacLeod (incompetech.com) · CC BY 4.0」 (f2400, f2480). Quotes: none. AI-prohibited subjects: Magellan is a real photo; no real persons; spectrum marked as principle diagram; ocean shown only as 「가능성」. Repeated helium-escape statements (s01/s12/s13/s17) are explanation linking, not a violation.

Observation (not violation, carried): 「단단한 땅 ✓ 온도 ✓ 대기 ✓」 [1808,2042) vs conditional ocean in s14 — the article has the same tension (line 6 「세 가지 요건을 모두 갖춘」 vs line 19).

## fact_ranges
Sentences (frames [from,end), 30 fps, narration.json sha bd71688a…): s01 [2,114) s02 [132,233) s03 [238,329) s04 [342,494) s05 [502,656) s06 [672,801) s07 [822,934) s08 [957,1167) s09 [1180,1306) s10 [1313,1469) s11 [1489,1625) s12 [1624,1723) s13 [1740,1886) s14 [1903,2110) s15 [2118,2229) s16 [2243,2365) s17 [2364,2509). Screen text/diagrams: [0,2580) including credits.

## How checked
MP4 sha256 recomputed = template value. ffprobe: 2580 frames read, 30/1, 86.058667 s. Frames extracted by ffmpeg from this MP4 into out/pilots/hani_1269147/review/r3/fact-check/: 30 150 250 420 600 700 780 870 930 940 943 944 946 950 956 960 1000 1100 1250 1320 1400 1470 1560 1640 1700 1725 1760 1850 1898 1905 1915 1930 1960 1975 1985 1993 2000 2010 2030 2060 2100 2125 2150 2200 2230 2240 2250 2320 2400 2480 2540 2578; plus viewing strips 938–949 (every frame) and 2112–2140 (every 4th), kept in session scratchpad only. Frames were viewed as half-scale 4-up sheets; small notes were readable at that scale. Screen text between samples was checked via tsx + timeline.json event frames.
Incomplete / limits: MP4 audio not listened or transcribed; spoken claims checked from narration.json text/spoken_text/word timings only (unchanged from r2). No continuous playback. Science paper not opened (403, per primary-sources). No resolve records exist in run.json for r2 items (r2 review_facts attempt ed1cd0f4 failed before finish), so rechecks carry resolution_id null and are tied to direction.md "07:45 fact-check r2" response.
