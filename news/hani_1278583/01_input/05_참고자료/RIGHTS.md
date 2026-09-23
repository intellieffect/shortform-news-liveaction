# RIGHTS — hani_1278583 자산별 권리 판정 (P0 source-verify, 2026-09-22)

판정 원문(검수자 회신 전문)은 `02_production/reviews/source-verify-raw.md`에 보존. 이 표는 그 회신을 파일로 앉힌 것이며 문구를 바꾸지 않았다.

## 1-A. 게재 자산(한겨레 제공) — 기본 ❌ 참고용

| ref | 자산(경로) | 크레딧(원문) | 라이선스 | 근거(문구 위치) | 판정 | 사유 |
|---|---|---|---|---|---|---|
| P-01 | `01_input/05_참고자료/hani_published/img1.webp` (1280×960) | `픽사베이` | 미확보 | 기사 캡션 외 라이선스 문구 없음 | ⚠️ 미확보 | Pixabay Content License는 관대하나 **게재본이 Pixabay의 어느 항목인지 특정 불가** |
| P-02 | `…/hani_published/img2.webp` (1140×641) | `Vito Technology/starwalk` | 사용 불가 | starwalk.space/en/terms-of-use — "You agree not to copy, republish, frame, download, transmit, modify, … distribute, … or create derivative works based on the Services except as expressly authorized herein" | ❌ 안 쓴다 | 약관이 복제·재배포·2차적저작물을 명시 금지 |
| P-03 | `…/hani_published/img3.webp` (1140×641) | `Vito Technology/starwalk` | 사용 불가 | 동일 (P-02) | ❌ 안 쓴다 | 동일 |

**결론: 게재 이미지 3장 중 제작 사용 가능 0장.** 캡션이 가리키는 1차 출처에서 직접 받는다.

## 1-B. 제작 사용 후보 — 1차 출처

| ref | 자산(URL) | 크레딧(원문) | 라이선스 | 근거 | 판정 | 사유 |
|---|---|---|---|---|---|---|
| S-01 | `https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/phases_2026_plain_v_1920p30.mp4` — 1080×1920 세로, 오디오 없음 | `NASA Scientific Visualization Studio` | NASA PD | svs.gsfc.nasa.gov/5587 "Please give credit for this item to: NASA Scientific Visualization Studio" + NASA Media Usage Guidelines | ✅ 쓴다 | 세로 숏폼에 그대로 맞는 유일한 1차 출처 영상. 2026년 전체 위상·칭동 |
| S-02 | `…/a005587/phases_2026_plain_2160p30.mp4` (3840×2160) · `…plain_1080p30.mp4` | `NASA Scientific Visualization Studio` | NASA PD | 동일 | ✅ 쓴다 | 가로 크롭·확대용 |
| S-03 | `…/a005587/frames/5760x3240_16x9_30p/plain/` · `…/frames/1080x1920_9x16_30p/vplain/` | `NASA Scientific Visualization Studio` | NASA PD | 동일 | ✅ 쓴다 | 9/19 해당 시각 단일 프레임 추출용 |
| S-04 | `…/a005587/phases_2026_fancy_*.mp4` · `*_music_*.mp4` | Music: `"Places" and "Reverse Dream" – Matthew Lawrenson (Universal Production Music)` | 음원 제3자 | SVS 5587 Music 항목 | ❌ 안 쓴다 | 음원이 Universal Production Music. plain 계열로 대체 |
| S-05 | `https://science.nasa.gov/resource/2026-moon-maps-for-international-observe-the-moon-night/` → `Moon_Map_2026_Northern.pdf` | 도판 내 `NP-2024-9-343-GSFC Rev: 4/26` | NASA PD | NASA Media Usage Guidelines | ✅ 쓴다 | 9/19 당일 달 모습에 15개 바다 이름이 찍힌 NASA 공식 도판. NASA 로고는 잘라낸다 |
| S-06 | `https://images-assets.nasa.gov/image/art002e014055/art002e014055~orig.jpg` (5568×3712) "Craters Along the Lunar Terminator", 2026-04-06 | `NASA` (secondary_creator 없음) | NASA PD | images.nasa.gov API 메타데이터 `secondary_creator: None`, `rights: None` | ✅ 쓴다 | Artemis II 승무원 촬영 명암경계선 근접 실사 |
| S-07 | `https://images-assets.nasa.gov/image/art002e009281/art002e009281~orig.jpg` (5568×3712) "Shadows at the Edge of Lunar Day", 2026-04-06 | `NASA` | NASA PD | 동일 | ✅ 쓴다 | 대안 컷 |
| S-08 | `https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001863/…~orig.jpg` "First Quarter" | `NASA/GSFC` | NASA PD | 동일 | ✅ 쓴다 | 상현달 표준 도판(LRO 고도지도 기반 렌더) |
| S-09 | `https://www.eso.org/public/images/eso0934a/` "A 340-million pixel starscape from Paranal" (24403×13973) | `ESO/S. Guisard (www.eso.org/~sguisard)` | CC BY 4.0 | eso.org/public/copyright/ — 크레딧 "clear and visible", "unaltered" | ✅ 쓴다 | 궁수자리~전갈자리 + 은하 중심부 실사. 크레딧 원문을 화면 또는 엔드 표기 |
| S-10 | `https://www.eso.org/public/images/eso0932a/` "The Milky Way panorama" (6000×3000) | `ESO/S. Brunier` | CC BY 4.0 | 동일 | ✅ 쓴다 | 전천 파노라마 대안 |
| S-11 | `https://svs.gsfc.nasa.gov/15079/` INOMN 2026 트레일러 | Music `"Past Lives (instrumental)" – John Bisset (PRS)` + 관측자 43명 사진 | 제3자 다수 | SVS 15079 크레딧 블록 | ❌ 안 쓴다 | 합성물 |
| S-12 | `https://science.nasa.gov/moon/observe-the-moon-night/` 배너 사진 | `Image credit: lunar observer Leonardo Hoet` · `Credit: Zach Tejral` | 제3자 개인 | 페이지 크레딧 | ❌ 안 쓴다 | 개인 관측자 저작 |
| S-13 | LROC 웹사이트 이미지 | `NASA/GSFC/Arizona State University` | 저작권 있음 | lroc.im-ldi.com/about/terms — 상업 사용 사전 허가 | ⚠️ 미확보 | SNS 숏폼이 상업 사용에 걸릴 수 있음 |
| S-14 | LROC PDS 아카이브 경유 데이터 | `NASA/GSFC/Arizona State University` | PD | 동일 페이지 | ✅ 쓴다 | 가공 전 데이터라 즉시 사용은 어려움 |
| S-15 | NASA 인사이니어·로고타입 | — | PD 아님 | NASA Media Usage Guidelines | ❌ 안 쓴다 | S-05 PDF에서 잘라낸다 |
| S-16 | Pixabay 원본(항목 미특정) | — | Pixabay Content License | — | ⚠️ 미확보 | P-01 참조 |

## 기관 지침 → 화면 규칙

| 출처 | 조항 | 화면 규칙 |
|---|---|---|
| NASA | 상업 보증 오인 금지 | NASA 자산을 한겨레 로고·CTA와 결합해 보증처럼 보이게 하지 않는다. 로고는 동결 배치 그대로 |
| NASA | 식별 가능 인물 초상권 | 얼굴이 주제인 컷 제외(S-06·S-07은 달 표면만) |
| NASA | 인사이니어 보호 | S-05 사용 시 NASA 로고 영역 크롭 |
| ESO | 크레딧 "clear and visible", "unaltered" | S-09·S-10 크레딧 문자열 화면 표기, 원문 그대로 `ESO/S. Guisard (www.eso.org/~sguisard)` |
| ESO | 로고 별도 허가 | ESO 로고 미사용 |

## 사용자 결정 대기 (검수자가 열지 않은 것)

1. P-01 픽사베이 원본 특정 — 대체 가능하므로 진행에 불필요.
2. S-13 LROC 웹 이미지 상업 사용 허가 — S-05~S-08로 커버되므로 접촉 없이 진행.
3. D-01·D-02·D-03 표기 — 제작자 선택은 `02_production/facts.md` D절에 기록.
