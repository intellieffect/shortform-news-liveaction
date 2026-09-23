# BGM 후보 — hani_1269147 (editorial-concept)

내레이션 16문장, 문장 글자수 비례 추정(실제 TTS 미생성, `02_production/audio/`에 파일 없음 — 추정치임을 표기):
도입 0–8.5s · 조건 8.5–29.5s · 위협 29.5–46.3s · 모델예측 46.3–49.3s · 관측 49.3–67.9s · 의미 67.9–75.4s · 결말 75.4–85.0s

측정 방법: 실제 파일을 다운로드해 `ffprobe`로 길이, `ffmpeg -af ebur128`로 통합 러프니스(LUFS)·LRA, 10초 창 `volumedetect`로 구간별 평균 음량을 측정. **사람이 청취하지는 않았다** — 아래 "구간별 적합성"은 이 신호 측정치 + incompetech 게시자 자신의 곡 설명(무드·구성 노트)에 근거한 추정이며, 실제 청음 확인이 필요하다.

## 추천 1순위 — On the Shore (Kevin MacLeod / incompetech)

| 항목 | 값 |
|---|---|
| 파일 | `news/hani_1269147/02_production/sourcing/music/raw/on_the_shore.mp3` |
| URL | https://incompetech.com/music/royalty-free/mp3-royaltyfree/On%20the%20Shore.mp3 |
| 원곡 길이 | 100.78s (ffprobe 실측) |
| 통합 러프니스 | -16.6 LUFS, LRA 12.9 LU, True Peak -0.1 dBFS (ffmpeg ebur128 실측) |
| BPM / 악기 | 82 BPM · Strings, Glockenspiel, Tympani, Flute (incompetech 메타데이터) |
| 무드(게시자 표기) | Calming, Mystical, Somber — "Beautiful, thoughtful piece worthy of character reflection." |
| 라이선스 원문 | CC BY 4.0. 필수 크레딧 문구(incompetech FAQ 권장 형식 그대로): `On the Shore Kevin MacLeod (incompetech.com)` / `Licensed under Creative Commons: By Attribution 4.0` / `https://creativecommons.org/licenses/by/4.0/` |

**구간별 적합성 (10초 창 mean_volume 실측, dB)**
| t | -19.6 | -19.0 | -18.7 | -18.5 | -18.4 | -17.9 | -17.9 | -18.4 | -18.7 | -19.1 |
|---|---|---|---|---|---|---|---|---|---|---|
| 구간 | 0s | 10s | 20s | 30s | 40s | 50s | 60s | 70s | 80s | 90s |

가장 조용한 지점(0–10s, 90–100s)이 도입·결말과 겹치고, 가장 큰 지점(50–60s, 약 -17.9dB로 약 1.7dB 상승)이 추정 모델예측~관측 구간(46–68s)과 거의 겹친다 — "중반 살짝 고조"를 실측으로 가장 잘 만족하는 후보. 단 상승폭은 1.7dB로 미세하며 극적인 스웰은 아니다. 100.78s 원곡을 **0:00–1:28(88s) 트림 + 마지막 1.5–2초 페이드아웃**으로 잘라 쓰면 85s 내레이션 + 여유 3초에 맞고, 자연 테이퍼(80–100s 하강)를 그대로 살릴 수 있다.

**한계**: 스트링·글로켄슈필·플루트가 들어가 "미니멀 피아노·신스"보다 악기 수가 많고 원곡 라우드니스(-16.6 LUFS)가 목표 대비 상당히 커서 내레이션 아래 깔 때 게인을 크게(약 -12~-15dB) 낮춰야 한다. 그 상태에서 글로켄슈필·팀파니 트랜지언트가 어떻게 들리는지는 실제 믹스에서 재확인 필요.

## 대안 — Promising Relationship (Kevin MacLeod / incompetech)

| 항목 | 값 |
|---|---|
| 파일 | `news/hani_1269147/02_production/sourcing/music/raw/promising_relationship.mp3` |
| URL | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Promising%20Relationship.mp3 |
| 원곡 길이 | 108.05s (ffprobe 실측) |
| 통합 러프니스 | -32.7 LUFS, LRA 9.9 LU (ffmpeg ebur128 실측) |
| BPM / 악기 | 56 BPM · Piano, Strings |
| 무드(게시자 표기) | Dark, Mysterious, Somber — "A striking chordal change keeps the first and second halves different." |
| 라이선스 원문 | CC BY 4.0. 크레딧: `Promising Relationship Kevin MacLeod (incompetech.com)` / `Licensed under Creative Commons: By Attribution 4.0` / `https://creativecommons.org/licenses/by/4.0/` |

**구간별 적합성**: 10초 창 실측 결과 -38.0 ~ -34.8dB 범위로 전 구간 사실상 평탄(변화폭 3dB 이내) — 게시자가 말한 "중반 화성 전환"은 실재하되 음량 스웰로는 나타나지 않는다(코드만 바뀌고 크기는 그대로). 즉 이 곡 자체는 "중반 고조"를 못 준다 — 필요하면 편집 단계에서 자동화로 만들어야 한다. 대신 원곡이 이미 -32.7 LUFS로 매우 조용해 내레이션 아래 깔 때 게인 조정이 거의 필요 없고, 피아노+스트링만으로 구성이 가장 미니멀하다. 108s→88s 트림 필요(뒤쪽 트림 + 페이드아웃).

## 기각 후보

| 후보 | 사유 |
|---|---|
| Envision (Kevin MacLeod, 85.4s, -14.4 LUFS, LRA 1.6) | 길이는 정확히 맞지만 "Grooving"으로 표기된 대로 일정한 리듬 펄스(신스+기타)가 있어 "멜로디 과하지 않은 미니멀" 요건과 충돌 위험. LRA 1.6은 다이내믹이 아니라 시종일관 같은 세기의 그루브라는 뜻 — 내레이션과 리듬이 부딪힐 수 있음. |
| Dreamlike (Kevin MacLeod, 98.6s, -16.3 LUFS) | Dark/Eerie/Unnerving 표기가 강하고 "creepy theme"로 게시자가 직접 설명 — 서사가 위협 구간을 지나 "조건부 바다·열린 결말"로 풀리는데, 이 곡은 끝까지 공포색이 짙어 오인 위험(전체를 위협적으로만 읽힐 수 있음). |
| Ghostpocalypse - 3 Road of Trials (Kevin MacLeod, 150.8s, -24.3 LUFS) | 게임 사운드트랙 조각(8부작 중 3번째)이라 "Road of Trials"라는 게임적 맥락, 150.8s로 트림 폭이 커 구조 손실 위험. 대체 후보로만 보류. |
| Incredulity (Scott Buckley, CC BY 4.0, 374.1s, -15.4 LUFS) | 무드 설명("introspective piano, strings and synth, with moments of suspended dissonance")은 서사에 잘 맞지만 원곡이 6:14로 85–95s까지 트림하려면 사실상 재편집 수준의 작업이 필요해 이번 범위를 넘어섬. 대안으로 남겨두되 우선순위에서 제외. 크레딧 필수 문구: `"Incredulity" by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au` |
| Pixabay Music | pixabay.com/music 페이지가 Cloudflare로 curl 차단(403), 공개 API에도 음악 엔드포인트가 없어(api.pixabay.com은 사진/영상만) 이번 회차에서 확보 불가 — 미확보로 기록. |

## 남은 한계
- 실제 사람 청취(귀로 듣고 정서 판단)는 하지 않았다. 위 적합성 판단은 신호 측정(길이·LUFS·10초 구간 음량)과 게시자 텍스트 설명에 근거한 추정이다. 최종 채택 전 실제 재생 확인을 권장한다.
- 내레이션 타임코드는 문장 글자수 비례 추정치다(TTS 결과 없음). TTS 완료 후 실제 어절 타임코드로 재정렬 필요.
- Free Music Archive/Musopen/ccMixter는 이번 회차에서 검색하지 않았다 — incompetech 카탈로그(1442곡, `pieces.json` 전수 필터링)에서 조건에 맞는 후보가 확보되어 그쪽으로 확장하지 않았다. 다른 질감(신스 패드 중심, 보컬 없는 드론 등)이 필요하면 FMA/ccMixter 추가 탐색 여지가 있다.
