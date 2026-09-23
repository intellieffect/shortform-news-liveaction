# video 소싱 후보 — hani_1269147

담당 gap: `reddwarf_flare_footage`(metaphor) · `atmosphere_escape_footage`(metaphor) · `space_bg_footage`(tone)
다운로드: `npm run fetch:assets -- news/hani_1269147 --manifest 02_production/sourcing/video/assets.json` (space_bg·atmosphere_escape는 이 명령으로 자동 수신, reddwarf는 스크립트 내부 타임아웃(900초)에 걸려 수동 curl로 원본과 동일 URL을 받아 같은 경로에 배치 — 파일 상태는 스크립트 성공 시와 동일).
미리보기: `02_production/sourcing/video/preview/*.jpg` (ffmpeg 프레임 추출, 실제 다운로드 파일 기준).
raw 위치: `02_production/sourcing/video/raw/`.

## 채택 후보

| ref | 파일(경로) | 규격·크롭 | 크레딧(원문)·라이선스 근거 | 실제 내용·확인 범위 | 활용 구간 | 이야기에서 할 일·오인 한계 |
|---|---|---|---|---|---|---|
| atmosphere_escape_footage | `raw/atmosphere_escape_maven_1080p.mp4` (source: https://svs.gsfc.nasa.gov/vis/a000000/a004300/a004370/final_ions01_1920x1080_30fps.mp4) | 1920×1080, 30fps, 70.5s. 세로 크롭 시 화성 원반이 프레임 중앙에 있어 피사체 보존 가능(과확대 불필요, ×1 그대로 세로 레터박스/좌우 크롭 가능) | "NASA's Scientific Visualization Studio and the MAVEN Science Team" — SVS ID 4370 "Solar Wind Strips the Martian Atmosphere". 미국 정부 저작물로 미국 내 저작권 없음(NASA Media Usage Guidelines, nasa.gov/nasa-brand-center/images-and-media: "generally are not subject to copyright"; "NASA should be acknowledged as the source"). | MAVEN 관측 데이터 기반 시뮬레이션(이온 유출 스트림라인). **화성**을 보여준다 — LHS 1140b도 적색왜성도 아님. preview에서 실제 확인: t=0~18s 화성 원반+옅은 스트림라인(텍스트 없음, `atmosphere_escape_t02.jpg`), t=20~38s 컬러(빨강~초록) 유출 스트림라인 확대(텍스트 없음, `atmosphere_escape_t28.jpg`), t=40~68s "MAVEN observed O⁺ ion flux" 라벨·컬러바·격자 오버레이(영문 텍스트 포함, `atmosphere_escape_t50.jpg`) | 권장: t=0~18s 또는 t=20~38s (텍스트 없는 구간)만 배경으로 사용. t=40s 이후는 영문 라벨이 화면에 박혀 있어 자막과 겹침 — 쓰려면 그 구간만 별도로 크롭/블러 처리 필요 | F9(적색왜성의 대기 벗김) 장면의 "대기 탈출" 개념 메타포로 사용 가능하나, 반드시 "화성 사례(참고)"로 라벨링해야 함 — LHS 1140b나 적색왜성 자체의 관측이 아님. 실제 별(적색왜성)이 아니라 **행성 대기가 벗겨지는 원리**의 시각적 유비로만 쓸 것 |
| reddwarf_flare_footage | `raw/reddwarf_flare_dgcvn_720p.mov` (source: https://svs.gsfc.nasa.gov/vis/a010000/a011500/a011531/11531_Flaring_MDwarf_H264_Good_1280x720_29.97.mov) | **1280×720**, 29.97fps, 241s(4분 다큐 전체). NASA가 이 항목에 공개한 최대 해상도가 720p — 요청한 "1080p" 미달, 더 높은 해상도 없음(ProRes도 동일 1280×720). 정사각/세로 크롭 시 별 원반이 중앙에 있어 피사체 보존 가능 | "NASA's Goddard Space Flight Center" — SVS ID 11531 "Swift Catches Mega Flares from a Mini Star"(G2014-041). 애니메이터 Scott Wiessinger(USRA), Tom Bridgman(GST, Inc.), Walt Feimer(HTSI). 미국 정부 저작물, 저작권 없음(위와 동일 NASA 가이드라인). | 2014년 Swift 위성이 포착한 적색왜성 쌍성계 DG CVn(60광년) 초대형 플레어를 다룬 4분 다큐. **전체 241초 중 순수 애니메이션 구간은 일부뿐** — 실제로 4~6장 확인: t=15s 과학자 인터뷰(Rachel Osten, 실존 인물 실사, `reddwarf_t15_INTERVIEW.jpg`), t=32s 붉은 별 클로즈업 확대(블러 전환컷, `reddwarf_t32.jpg`), t=48s "Sun" vs "DG CVn" 크기 비교 애니메이션(양쪽 라벨 텍스트 포함, `reddwarf_t48.jpg`) — 이 구간이 유일하게 쓸 수 있는 "적색왜성 시각화", t=62s는 **실제 태양 SDO 관측 영상**(2003년 11월, 초록색 극자외선, 날짜 타임스탬프 포함, `reddwarf_t62.jpg`) — 이건 태양이지 적색왜성이 아님 | t≈40~58s 구간만("Sun"·"DG CVn" 라벨이 화면에 박힌 크기 비교 숏, 또는 라벨 없는 단독 별 클로즈업이 있다면 그 부분) | F9(적색왜성 복사) 메타포 후보이나 한계 큼: (1) 해상도 720p로 min 1080p 미달, (2) DG CVn은 LHS 1140b의 중심별이 아닌 다른 적색왜성 — 크기 비율(태양의 1/3)도 기사의 1/5과 다름, 라벨을 지우거나 "다른 적색왜성 사례" 표기 필수, (3) 클립 대부분이 인터뷰·실제 태양 영상이라 잘라 쓸 수 있는 순수 애니메이션 구간이 좁음(대략 15~20초 분량), (4) 영문 "Sun"/"DG CVn" 텍스트가 화면에 타서 나와 지우거나 크롭해야 함 |
| space_bg_footage | `raw/space_bg_drift_1080p.mp4` (source: https://cdn.pixabay.com/video/2024/01/24/197923-906226438_large.mp4) | 1920×1080, 25fps, 20.0s, 가로 랜드스케이프 — 세로 크롭 시 화면 중앙의 밝은 성운 핵을 살리려면 좌우 크롭(약 ×1.3 확대, 1080폭 세로 프레임 기준)으로 충분, 특정 피사체 없어 크롭 여유 큼 | "Video by ColorfulBackground from Pixabay" (Pixabay video ID 197923). Pixabay Content License — 상업적 이용·수정 가능, 크레딧 불요(권장 표기만). | CG 렌더 성운/별밭 루프 애니메이션(파랑 성운 배경에 흰 별들이 반짝이며 서서히 확대). 실제 관측 사진 아님 — 스톡 CG 배경. preview 3장 확인: t=1s(`space_bg_t01.jpg`), t=9s(`space_bg_t09.jpg`), t=17s(`space_bg_t17.jpg`) 전 구간 동일한 정적/느린 확대 톤, 텍스트 없음, 특정 천체(행성·별자리) 식별 불가 | 전체 20초, 루프하여 사용 가능 | tone 전용 배경 — "실제 우주 관측"으로 오인되지 않도록 캡션·맥락에서 구분. 특정 행성이나 별을 지칭하는 장면 옆에 놓지 않을 것(이 영상 자체는 어떤 실재 천체와도 대응하지 않는 CG 이미지) |

## 기각/대체 후보

- **NASA SVS 12224 "SDO Solar Flare 4K"**: 실제 태양(SDO) 플레어 영상. facts.md에 "태양 실사(SDO)는 다른 별. 생성·도해로 표현, 실제 관측 아님 표기" 명시 — 적색왜성 자리에 태양 실사를 쓰면 오인 위험이 커서 기각.
- **NASA SVS 12046 "Stripping the Martian Atmosphere"**: 4370과 같은 소스 영상을 재편집한 버전이나 최대 해상도가 960×540로 min 1080p 미달, 4370의 1080p 버전이 이미 있어 중복 기각.
- Pexels 스타필드 후보(`37652488` 등, Nicola Narracci 업로드 다수): 컨택트시트 확인 결과 전부 매우 화려한 색조의 CG 성운/은하 애니메이션(보라색 소용돌이, 웜홀형 별똥별 등) — "느리게 흐르는" 톤 요구에 비해 과도하게 역동적이라 1차 기각, Pixabay 157615(차분한 흑백 성운, 12초, 1920×1080)를 예비 대체로 남김(미다운로드).
- reddwarf_flare_footage 자체도 인터뷰 구간·실제 태양 구간은 `_rejected` 사유로 기록(아래 참고) — 파일 자체는 채택 구간이 있어 raw에 유지, 인터뷰/실제 태양 구간만 사용 금지 표시.

## 미확보·한계

1. **적색왜성 실사는 원리적으로 없음**: DG CVn조차 해상 불가능한 항성이라 이 영상도 "정확한 관측 이미지"가 아니라 NASA의 스타일화된 렌더(태양 텍스처를 붉게 재채색)다. LHS 1140b의 실제 중심별을 시각화한 자료는 존재하지 않는다 — 어떤 적색왜성 영상을 쓰든 "재구성/시각화" 표기가 필수다(facts.md와 일치).
2. **reddwarf_flare_footage 해상도 미달**: NASA가 공개한 최고 해상도가 1280×720이라 게재된 파일들 중 1080p 이상이 없다. 더 높은 해상도가 필요하면 다른 SVS 항목(예: TESS M왜성 아트 컨셉 정지화상 등)을 사진 트랙에서 병행 검토해야 한다 — 영상으로는 이 이상 확보 불가.
3. **atmosphere_escape_footage의 라벨 있는 구간(t=40s~)**은 영문 텍스트가 하드코딩돼 있어 그대로 쓰면 자막과 겹치거나 이중 언어로 보일 수 있다 — 편집 단계에서 크롭/블러 처리 필요성을 제작자가 판단해야 함.
4. Pixabay space_bg 대체 후보(157615)는 포스터 프레임만 확인했고 다운로드·ffprobe는 하지 않았다 — 필요 시 재요청.
