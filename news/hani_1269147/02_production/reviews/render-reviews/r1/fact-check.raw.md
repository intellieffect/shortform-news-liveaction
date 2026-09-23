# fact-check 회신 원문 (P7 r1, 2026-09-23 07:40 KST) — 수정 없이 보존. 대상 MP4 production-ac747eed (sha 38a16eef…)

Round r1 verdict: fail. 1 blocking, 5 minor. MP4 audio track and continuous playback unchecked.

Blocking
- B1 — s14, frames [2052,2230), F19 and F11: possibility stated as fact. Narration/captions 「새는 건 가장 가벼운 기체뿐. 아래 남은 무거운 기체가 온실효과를 낸다면」. Article ¶12: 「그 아래층에는 … 무거운 기체들이 있을 가능성이 있다. 만약 … 온실효과를 일으키고 있다면」. facts F19 says 「무거운 기체 가능성」. The video presents as confirmed: heavy gas remains below, and only the lightest gas escapes. "Only the lightest gas" comes from the model (F11), not observation, yet s14 sits post-observation with no model label. Greenhouse condition and ocean possibility kept (ocean_condition [2147,2232) ✓). heavy_layer band [2115,2361) has no possibility marker.

Minor
- m1 — AI-generated scenes missing "상상도/재구성" labels: [2360,2515) no label (credits add 「행성·별 장면: AI 생성 상상도」 only from 2515); [1061,1081) short gap; model [1081,1449)/observation [1542,1875) labels differ from literal wording but achieve intent.
- m2 — F22 [2258,2361): 「30억 년 넘게 유지 / 가능성 높음 · 연구진 추산」 has no tense; could read as future projection. Narration says 「유지돼 왔을」.
- m3 — F14 [1633,1875): dark line sits in yellow-orange of a visible rainbow band. Rule met (no nm, absorption as dark line, principle-diagram label). Risk: WINERED is infrared; viewers may take away helium absorbed a visible color.
- m4 — Magellan photo [1452,1550): file is Commons "Magellan Campanas.jpg" (Denys, CC BY 3.0, shot 2004-02-01; SHA1 8163b87f… confirmed via Commons API) — not R13 in RIGHTS.md; only in sourcing/photo/assets.json. 「2024년」 label sits over a 2004 photo. Photo does not show whether Clay or Baade. License link and modification (crop) note not shown.
- m5 — s02 [142,249): 「과학자들은 이걸 반가운 소식이라고 합니다」 attributes reaction to scientists without a source; article carries it via reporter framing (¶3) and quotes (¶14–15). No quotation marks, so not a quote violation.

Pass by item: F1 s04 [364,537) 「최소」 both; F2/D1 「49광년 · 암석형」 [252,358); F3 haze rises evenly, s09 「대기 맨 바깥」; F4/D3 s13 [1888,2031) 「골디락스 영역 암석형 행성 / 대기 확인 · 처음」, 6000 unused; F5 [560,639); F7/F9 s06 [741,899) 「~곤」, label 「상상도 · AI 재구성 + 도해」; F10 s07 [940,1041) 「대기 흔적 찾지 못함」, 7 dots; F11 s08 「연구진의 모델에선」+ label [1081,1449); F12 s09 prediction; F13 s10 label [1497,1544) real photo; F17 s16 [2368,2496); F23 s17; D2 not used; D4–D6 not used. Quotes: none. AI-prohibited subjects: OK. Credits [2515,2688): Denys CC BY 3.0 ✓, On the Shore CC BY 4.0 ✓ (audio.json bgm.asset=on_the_shore). CfA image not in media.

Observations (not violations): 「액체 물이 남을 온도 ✓」 ([609,727),[1957,2151)) in tension with s14 conditional ocean (article has same tension ¶2 vs ¶12). Stripping animation [831,940) on a different-looking generated planet; s06 general tense.

fact_ranges (frames [from,end)): s01 [3,127) s02 [142,249) s03 [254,352) s04 [364,537) s05 [543,719) s06 [741,899) s07 [940,1041) s08 [1081,1305) s09 [1318,1443) s10 [1452,1617) s11 [1635,1769) s12 [1780,1867) s13 [1888,2031) s14 [2052,2230) s15 [2230,2353) s16 [2368,2496) s17 [2515,2640). Screen text/diagrams: all concepts [0,2700) incl. credits.

How checked: frames 30,120,280,400,520,610,700,800,900,1000,1065,1100,1250,1360,1452,1480,1530,1600,1700,1800,1860,1920,2000,2100,2180,2220,2300,2362,2400,2480,2512,2560,2680 from this MP4; screen text cross-checked against tsx, concepts.json, timeline events.
Incomplete: MP4 audio not listened/transcribed (spoken claims checked against narration.json spoken_text and whisper transcript of hf-narration-raw.wav); frames between samples; Science article not opened (403).
