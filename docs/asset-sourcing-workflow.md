# 외부 소스 자산 확보 워크플로우 v2

v1: 2026-08-28 09:50 KST, 세션 "input", 위성공해 파일럿 실측. **v2: 2026-08-29** — output 제안 `docs/specs/sourcing-criteria.v2.md`(적합성 2축 연동, 개정 7항) 반영 + input 실측 1항 추가. 근거 실측: `work/hani_satellite_pollution/02_production/external_assets/SOURCES.md` §1~§15. 채택 대상: 다음 편부터 input 단계 표준.

## 왜 v2인가 — «위성공해» 실측

v1로 모은 22비트 화면층 = 실사 22·생성 0이었지만 **움직이는 화면 1/22, B축(표현력) 미달 20/22**. v1 5단계가 정지 이미지를 먼저 찾고 영상을 4단계로 미뤘기 때문이다 — ESO 타임랩스 2편은 정지 스틸에 밀렸고, 영상 후보는 "영상이라서" 기각됐다. b01 훅은 검색어를 문장("스타링크")이 아니라 기존 화면(밤하늘 궤적)에서 뽑아 실패했다. v2 재수집으로 영상 비트 1 → 9.

## 원칙 3개 (v1 유지)

1. **생성보다 실사.** 생성은 전 단계가 빈 뒤에만, 그리고 **"실사 소진 판정"을 SOURCES.md에 기록한 뒤에만** (예: §14 우주거울 — 궤도에 실물이 없어 어떤 실사도 A1을 못 채운다는 판정).
2. **라이선스는 읽고 기록, 추측 금지.** 파일마다 `license · license_url · credit(원문 그대로) · origin_url`이 없으면 미확보. 커먼즈는 API `extmetadata`, NASA SVS는 `svs.gsfc.nasa.gov/api/<id>`, Flickr는 oEmbed로 **현재 표시 라이선스를 실측**해 기록한다.
3. **원본 보존.** 내려받은 파일은 수정하지 않는다. 크롭·리프레임·업스케일 파생물은 output 쪽 `public/pilot/`.

## 판정 2축 (수집 시점에 적용) — output `docs/specs/shot_fit.md`

- **A 내용**: A1 문장의 주어·목적어가 화면 안 / A2 배경지식 없이 알아봄 / A3 오인 없음 → ○ 셋 다 · △ A2 또는 A3 미달 · ✗ A1 미달
- **B 표현**: B1 피사체가 움직임(켄번스 = 정지) / B2 문장의 동사를 화면이 수행 / B3 **정지 4초 초과 = 자동 미달**
- 훅(1~2초)은 A2가 결정적. 4초 이상 비트는 B3가 결정적 — 영상이거나 인셋 등장 같은 화면 내 변화가 있어야 한다.

## 개정 8항 (v1 → v2)

| # | v1 | v2 |
|---|---|---|
| 1 | 비트별 키워드(자유) | **검색어는 문장의 명사(주어·목적어)에서.** 기존 화면·기존 자산의 프레이밍에서 뽑지 않는다. 예: "스타링크" → 제품(위성 본체·적층·안테나), 궤적이 아니다 |
| 2 | 영상은 4단계 | **각 단계 안에서 사진·영상 동시 탐색.** 기관 직행 시 `cdn.eso.org/videos/`·NASA SVS API를 이미지와 같은 순위로. Pexels/Pixabay 영상 검색도 같은 쿼리로 동시에 |
| 3 | 기각 사유 자유 기술 | **기각 사유는 A·B·라이선스 중 하나.** "영상이라서"·"용량 커서"는 사유가 아니다 |
| 4 | 실물 확인(가로 원본) | **9:16 크롭 컨택트시트로 확인.** `ffmpeg -i <src> -vf "fps=<n>,crop=ih*9/16:ih,scale=340:604,tile=5x1" -frames:v 1 sheet.jpg`. 어두운 소재는 `eq=brightness=0.07:contrast=1.8` 리프트 후 판정. 가로 원본을 가로로 보고 판정하지 않는다 |
| 5 | SOURCES.md 라이선스만 | **A/B 판정 병기.** `assets.json judgement{A,B,note,B3}`. B ∈ {static, video}. 배정 비트가 4초 이상이면 static 단독 배경은 B3 표시 |
| 6 | PD → CC BY → 스톡 → BY-SA | 동일. **BY-SA는 상업 납품물에 쓰지 않는다** (스위스 열차 3840×2160 기각) |
| 7 | "Flickr 원본 API 키 필요" | **정정.** 페이지 `/sizes/o/`는 200, static 직링크만 410 → 페이지 HTML에서 `_o.jpg` URL 추출. 단, **원본이 작을 수 있고(SpaceX 60기 적층 = 960×540) 표시 라이선스가 바뀌어 있을 수 있다**(SpaceX Flickr 현재 CC BY-NC 2.0; 커먼즈 FlickreviewR cc-zero 기록이 CC0 근거). oEmbed(`flickr.com/services/oembed?url=…&format=json`)로 license_id 실측 |
| 8 | (없음) | **규격 게이트를 판정 앞에 둔다** (input 추가). 해상도(세로 크롭 후 ≥1080 목표, 인셋은 ≥540) · 길이(비트 길이 + 여유) 미달은 A/B/라이선스 판정 대상이 아니라 게이트 탈락으로 기록. 사유란에 "규격"으로 적는다 |

## 두 시점 (v1 유지)

| 시점 | 일 | 이유 |
|---|---|---|
| **입력 게이트** (자료 수령 직후) | 제공 자료의 **원본·권리 추적** — 캡션의 기관으로 직행해 원본 해상도·라이선스 확정 | 사용권 미확인은 정의서 §7.2 게이트 발동 조건. 5~10분 |
| **shots 직전** (beats 확정 후) | **빈 비트 채우기** — `asset_brief.json`의 비트별 문장 명사로 실사·영상 후보 | 어느 문장이 비는지는 beats 뒤에야 안다 |

## 5단계 (순서 고정 — 각 단계에서 사진+영상 동시)

```
1. 기관 직행     캡션/출처 → ESO·NASA·NOIRLab. 뉴스 재인용 제외
                 ESO 이미지  cdn.eso.org/images/publicationjpg/<id>.jpg
                 ESO 영상    cdn.eso.org/videos/hd_1080p25_screen/<id>.mp4 · 4K ultra_hd/<id>.mp4 (ultra_hd_h264는 404)
                             아카이브 검색은 ?q= 가 무시됨 → ?adv=&subject_name=<주제> (예: Laser+Guide+Star)
                 NASA SVS    svs.gsfc.nasa.gov/api/<id> → media_groups[].items[].instance.url (1080p60·2160p60 mp4 전부)
                 NASA Images images-api.nasa.gov/search?q=&media_type=image|video → collection.json에 ~orig
                 NASA EOL    eol.jsc.nasa.gov/DatabaseImages/ESC/large/<MISSION>/<ID>.JPG
2. Openverse     무키. license_type=commercial,modification. 커먼즈 히트 ≥2000px만. 영상은 인덱스 안 됨 → 커먼즈 API
                 srsearch "<주제> filemime:video/webm" 로 영상 직접 검색, extmetadata로 라이선스
3. 스톡          Pexels 사진+영상 (orientation=portrait). 영상은 videos/videos/<id>로 원본 파일 목록(최대 해상도) 확인
   → Unsplash    사진. download_location 트리거 필수
   → Pixabay     영상만 실용. CG 렌더 섞임 → 실사 판정
4. 실물 확인     9:16 컨택트시트(개정 4항). 채택/기각/보류 + 사유(A·B·라이선스·규격). 기각도 _rejected/에 보존
5. 생성          위 전부 빈 뒤 + SOURCES.md에 "실사 소진 판정" 기록 뒤 + 사용자 결정
```

라이선스 우선순위: **퍼블릭 도메인(NASA) → CC BY(ESO·NOIRLab·커먼즈) → 스톡 라이선스(Pexels/Unsplash/Pixabay)**. CC BY-SA 불사용. 기관별 조건: ESO 식별 가능 인물 상업 금지·로고 금지 / JAXA 상업 목적 사전 허가 필요 / NASA 보증 암시 금지.

## 소재별 어디서 나오나 (실측 v1+v2)

| 소재 | 나오는 곳 | 안 나오는 곳 |
|---|---|---|
| 기사 그 사진·그 영상 (과학 자료) | 기관 직행만 | 스톡 전부 0건 |
| 특정 시설·현상 (VLT·레이저·스타링크 궤적) | 기관(ESO videos subject 검색) + 커먼즈 | 스톡은 "별 궤적"으로 오인 |
| 궤도 시각화 (위성 분포·소행성 회전) | **NASA SVS** (PD, 변형 다수, 4K) | 커먼즈 |
| 스타링크 제품 실물 | 커먼즈 지상 안테나(CC BY) · SpaceX 커먼즈 등재본(CC0, 960px) | 궤도 위성 실물은 SpaceX 웹캐스트뿐(저작물) |
| 아마추어 위성 열차 영상 | 커먼즈 webm (CC BY/CC0) — 확대해도 가는 점선, 훅엔 못 씀 | |
| 분위기·은유 (밤하늘·해변·도시·바다) | Pexels 영상(portrait) > Unsplash | 기관 |
| 우주에서 본 지구·소행성 | NASA(PD) | 스톡은 CG 위주 |
| 궤도에 실물이 없는 것 (우주거울) | **없음 → 소진 판정 → 생성** | 태양돛 등 유사 실물은 라벨 전제, 짧은 비트에서 A2 실패 |

## ②시점 트리거 (output 구현)

`npm run gaps -- <root>` → `asset_gaps.json` / `asset_brief.json`(v2: 비트별 `judgement`·`keywords_from_sentence`·`wanted`·`avoid`). shots `visual.source`: `external`(CC BY → 크레딧 없으면 에러) / `stock`(경고). output `check-shots`는 4초+ 비트의 static을 B3 경고로 잡는다.

## 산출물 (input → output 경계)

- `02_production/external_assets/<source>/…` 원본 (eso / wikimedia / nasa / openverse / stock / brief / overlay / `_v2_motion`(회수 영상) / `*/_rejected`)
- `02_production/external_assets/SOURCES.md` — 라이선스 대장 (파일·출처·해상도·크레딧 원문·비트·**A/B**·기각 사유 A/B/라이선스/규격)
- `01_input/assets.json` `external_assets[]` — 필드: id, type, source, provider, path, width/height(/fps/duration), `variants{}`(4K·원본), label, credit, license, license_url, origin_url, beat_fit|sentence_fit, replaces|supersedes, status(held), rights_status, rights_note, **judgement{A,B,note,B3}**. `rejected_v2[]`
- output `check-shots`가 `assets + external_assets`를 단일 레지스트리로 읽음 (rights_status cleared 허용)

## 검색 스크립트

`work/<pilot>/02_production/external_assets/_search/` — `openverse_search.py` · `stock_search.py`(사진+영상, portrait) · `brief_search.py`. v2 추가 절차는 인라인 실행(커먼즈 API·SVS API·ESO subject 검색·Pexels videos/videos/<id>) — 다음 편에 `brief_search.py`로 합칠 것.

## 크레딧 표기

- ESO/NOIRLab/커먼즈 CC BY: **의무.** 원문 그대로, 비트 하단 소자막 + 엔드카드 이중. ESO 로고 금지.
- NASA PD: 의무 아님, 관례상 표기 ("NASA's Scientific Visualization Studio" 등). NASA 보증 암시 금지.
- Pexels/Unsplash/Pixabay: 권장 표기. 엔드카드에 같이.

## 실측 결과

- v1 (8/28): 22비트 = 기관 12 · Openverse 1 · Pexels 2(+영상 2) · 텍스트/코드 6 · 생성 1. 움직이는 화면 1.
- v2 (8/29): 회수 영상 7(NASA SVS 4·커먼즈 3) + 재수집 영상 5(ESO 3·Pexels 2) + 제품 실물 2 + 4K 6. 영상 비트 1 → 9. 생성 0 (b09 소진 판정 → 사용자 결정 대기).

## 사운드(BGM·SFX) 규칙 (2026-08-28, 유지)

- 소스: Mixkit(항목별 라이선스 JSON-LD 실측). Pixabay 음악·SFX는 공개 API 없음. Freesound는 키 필요.
- BGM 선정 = 분위기 프로필(내레이션·facts) × Mixkit mood/tag 교집합 × 오디오 특징(drum·bright·LRA·LUFS). 제목만 보고 고르지 않는다 (`_search/mood_search.py`).
- 등록 시 필수 측정: duration · lufs_integrated · lra · bpm_est(신뢰도) · **intro_silence_sec** · intro_rms_db_0_5s.
- 최종 곡은 사용자 청취 선택. 크레딧 "Music: <곡> by <아티스트> — Mixkit".
