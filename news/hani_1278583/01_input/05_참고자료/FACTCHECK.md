# FACTCHECK — 기사 주장 ↔ 1차 출처 대조 (P0 source-verify, 2026-09-22)

원문: `02_production/reviews/source-verify-raw.md`. 문구 변경 없음.

| 항목 | 기사 표기 | 1차 출처 표기 | 출처(URL) | 일치 |
|---|---|---|---|---|
| (a) 서울 남중 | "서울 기준으로 달은 19일 오후 6시50분에 가장 높이 뜬다" | `Upper Transit 18:50` (37.5665N/126.978E, tz=+9) | USNO `aa.usno.navy.mil/api/rstt/oneday?date=2026-09-19&coords=37.5665,126.9780&tz=9` | ✅ |
| (a) 서울 월몰 | "달이 지는 시각은 밤 11시24분" | `Set 23:24` | 동일 | ✅ |
| (a-보충) 월출 | (기사 없음) | `Rise 14:17` | 동일 | — |
| (a-보충) 일몰 | (기사 없음) | `Sun Set 18:34` → 남중 18:50이 일몰 16분 후 | 동일 | — |
| (b) 상현 정각(UTC) | "UTC 기준 18일 20시44분" | `First Quarter, 2026-09-18, 20:44` (UT) | USNO `aa.usno.navy.mil/api/moon/phases/date?date=2026-09-10&nump=4` | ✅ |
| (b) 상현 정각(KST) | "한국시각 19일 새벽 5시44분" | `closestphase: First Quarter, 2026-09-19, 05:44` | USNO oneday | ✅ |
| (c) 2026 개최일 | "올해는 9월19일" | "Saturday, September 19, 2026" | science.nasa.gov/moon/observe-the-moon-night/ | ✅ |
| (c) 2027 | "2027년엔 9월10일" | "Friday, September 10, 2027" | …/overview/ | ✅ (요일 D-02) |
| (c) 2028 | "2028년엔 9월23일" | "Saturday, September 23, 2028" | …/overview/ | ✅ |
| (c) 2025 | "지난해엔 10월4일" | 2025-10-04 (NASA 1차 페이지 미확인, Wikipedia만) | en.wikipedia.org/wiki/International_Observe_the_Moon_Night | ⚠️ 1차 미확인 |
| (d) 2009 행사 성격 | "2009년 나사가 아폴로 11호의 달 착륙 40주년을 맞아 개최한 달 관측 행사를 계기로" | "The events were in honor of NASA's return to the Moon with the launch of the Lunar Reconnaissance Orbiter (LRO) and the Lunar Crater Observation and Sensing Satellite missions" | nasa.gov/solar-system/international-observe-the-moon-night-celebrates-10-years-of-lunar-engagement/ | ❌ 불일치 |
| (d) 2010 정례화 | "2010년부터 국제적인 행사로 정례화" | "The following year the event went international and became known as International Observe the Moon Night" | 동일 | ✅ |
| (d) 나사 주도 | "나사가 주도해 만든 이 날" | LRO 미션 + Goddard 태양계탐사부 주관 | science.nasa.gov/moon/observe-the-moon-night/ | ✅ |
| (e) 궁수자리 통과 | "궁수자리 앞을 지나간다" | 2026-09-19 09·11·13·15 UT 전 시각 별자리 = `Sgr` | JPL Horizons (COMMAND='301', 서울 topocentric) | ✅ |
| (e) 은하 중심부 방향 | "우리 은하 중심부 방향" | 19:00 KST 달 RA 18h11.2m / Dec −28°37′ → Sgr A*에서 약 5.6° | JPL Horizons | ✅ |
| (e) 눈키 근접 | "시그마(눈키)를 상현달 가까이에서" | 달–σ Sgr 이격 약 10.0° (보름달 시직경의 약 20배) | JPL Horizons + SIMBAD | ⚠️ 정도 불일치 |
| (e) 눈키 밝기 | "궁수자리에서 가장 밝은 별 가운데 하나" | σ Sgr V 2.067, ε Sgr V 1.81 → 2번째 | SIMBAD | ✅ |
| 날짜 선정 기준 | "상현달이 가장 가까운 주말" | "usually occurs when the Moon is around first quarter", "usually on a Saturday" | …/faq/ · /overview/ | ⚠️ 부분 불일치 |
| 상현 이점 ① | "초저녁 무렵에 가장 높이 뜬다" | 남중 18:50 = 일몰 18:34 직후 / "a great phase for evening observing" | USNO + NASA overview | ✅ |
| 상현 이점 ② | "경계선 부근의 그림자 효과로 지형이 입체적으로" | "shadows enhance our view of the Moon's rugged terrain, just like views at sunrise and sunset here on Earth are beautiful when the shadows are long" | …/faq/ | ✅ |
| 달의 바다 정의 | "과거 화산활동으로 흘러나온 용암이 굳어 생긴 지형" | "Once thought to be seas of water, these are actually large, flat plains of solidified basaltic lava" | NASA Moon_Map_2026_Northern.pdf | ✅ |
| 바다 관측 수단 | "쌍안경이나 소형 망원경이 있다면" | "They can be viewed in binoculars or even with the unaided eye … 15 maria" | 동일 PDF | ✅ (1차가 더 관대) |
| 상현달 정의 | "달의 오른쪽 절반 정도가 태양빛을 받아" | 북반구 기준 우측 조명 / 19일 저녁 `fracillum 53%` | NASA Moon Map + USNO | ✅ |
| 행사 규모 변화 | "소규모로 출발 … 지금은 전 세계 다수 기관" | 2009 Goddard·Ames 2개 센터 → 2010 52개국 → 2018 75개국 | nasa.gov 10주년 기사 | ✅ |

## 불일치 (D)

- **D-01 2009년 행사의 성격** — 기사 "아폴로 11호 40주년" vs NASA "LRO·LCROSS 발사 기념". 2009년은 두 사건이 같은 해. NASA 자신의 연혁 서술은 LRO/LCROSS.
- **D-02 "주말" 규칙** — NASA FAQ "usually on a Saturday", 2027년은 금요일. "주말"을 규칙으로 단정하면 기사 자신이 인용한 2027 날짜와 충돌.
- **D-03 눈키 "가까이"** — 이격 약 10°. 달과 눈키를 한 프레임에 붙여 그리면 틀린 그림. "은하 중심부 방향"은 정확(약 5.6°).

## 미확인 (U)

- **U-01** 2025년 개최일 10월 4일 — NASA 1차 페이지에서 확인 실패(Wikipedia만).
- **U-02** 한국천문연구원 월출몰·남중 — 교차 확인 못 함(JS 렌더·API 키). USNO 값과 분 단위 일치.
