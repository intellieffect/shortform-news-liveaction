# RIGHTS — 자산별 권리 판정 (source-verify P0, 2026-09-23)
원문: 02_production/reviews/source-verify.raw.md


**기관별 요약**
- **CfA:** 이미지 사용 정책 원문은 「follows the Smithsonian Institution's Open Access (CC0) policy. Our digital assets are in the public domain … may be used for any purpose, free of charge, without further permission.」이다. 다만 CfA 크레딧이 붙은 자산만 해당한다. 같은 페이지의 Harvard FAS 사진과 개인 제공 사진은 대상이 아니다.
- **Carnegie Science:** 보도자료 페이지에는 크레딧만 있다(라이선스 문구 0건). 미디어 페이지 원문은 「Requests for permission to use Carnegie material should be emailed to archives@carnegiescience.edu」다. 그래서 전부 미확보다.
- **arXiv 2607.14326v1:** 「License: CC BY 4.0」. Science 게재본(AAAS)이 아니라 arXiv 판의 도판만 해당한다.
- **ESO:** 크레딧에 spaceengine.org가 함께 있어 구성요소 권리를 확인하지 못했다.
- **NASA/JPL:** 크레딧이 NASA/JPL-Caltech다. 로고는 제외하고, 보증을 암시하면 안 된다.
- **Wikimedia Commons:** 파일마다 라이선스가 다르다.

| ref | 자산(경로 또는 URL) | 크레딧(원문) | 라이선스 | 근거(문구 위치) | 판정 | 사유 |
|---|---|---|---|---|---|---|
| R1 | 01_input/05_참고자료/article_images/lhs1140b_artist_harvard.webp (800×450) | 한겨레 캡션 「하버드대 제공」 | 없음 | 한겨레 figcaption | ❌ | 게재 사본이라 참고용. 원본은 R3 |
| R2 | 01_input/05_참고자료/article_images/magellan_spectrograph_carnegie.webp (800×450) | 한겨레 캡션 「카네기사이언스 제공」 | 없음 | 한겨레 figcaption | ❌ | 게재 사본이라 참고용. 원본은 R4 |
| R3 | https://www.cfa.harvard.edu/sites/default/files/2026-07/cfa-055-helium_atomsphere_planet3H_lrg.jpg (6000×4000) | `Credit: Melissa Weiss/CfA` (CfA 이미지 목록). Carnegie 재게시본 표기는 `Melissa Weiss/Center for Astrophysics \|Harvard &amp; Smithsonian` | CC0 / PD | https://www.cfa.harvard.edu/news/image-use-policy 및 https://www.cfa.harvard.edu/news/11465/imagelist | ✅ | CfA 저작. 엔드카드 크레딧 「Melissa Weiss/CfA」. Smithsonian Terms 추가 조항은 열람하지 못함 |
| R4 | https://carnegiescience.edu/sites/default/files/2026-07/20190406_OBS_LCOTrip_IMG_0924%20%283%29.jpg (4032×3024) | `WINERED on Clay. Credit: Milan Karol/Carnegie Science.` | 문구 없음 | 보도자료 캡션. 허가 절차는 미디어 페이지 https://carnegiescience.edu/about/connect-us/media | ⚠️ | 허가 요청 필요. 사용자 결정 대기. 파일명 날짜(2019)와 WINERED 이전 시기(2022)가 어긋나 사진 내용 확인도 필요 |
| R5 | Carnegie 재게시 상상도 cfa-055-helium_planet3H_lrg.jpg | Melissa Weiss/CfA | — | — | 쓰지 않음 | R3과 같은 이미지. CfA 원본(R3)에서 받는다 |
| R6 | CfA 보도자료의 연구자 3인 사진 | `Carlos Sanchez, Harvard FAS` | 문구 없음 | CfA 보도자료 본문 | ❌ | CfA가 아니라 Harvard FAS 저작. 식별 가능한 인물 |
| R7 | Harvard FAS 기사 속 체루빔 사진 2장 | `Courtesy of Collin Cherubim` | 문구 없음 | https://current.fas.harvard.edu/stories/harvard-scientists-detect-atmosphere-distant-earth-planet | ⚠️ | 개인 제공 사진이고 인물이 주제 |
| R8 | arXiv 2607.14326v1 도판 Fig.1~5(헬륨 시계열·투과 스펙트럼·2024 대 2025 비교·질량손실 모델) | Cherubim et al. 2026, arXiv:2607.14326 | CC BY 4.0 | https://arxiv.org/html/2607.14326v1 상단 「License: CC BY 4.0」 | ✅ | 헬륨 흡수선 도해로 쓸 수 있다. 크레딧 필수. Science 판 도판은 쓰지 않음. 해상도는 확인하지 않음 |
| R9 | https://www.eso.org/public/images/eso1712a/ (4000×3000) | `ESO/ spaceengine.org` | ESO 기본은 CC BY 4.0 | ESO 이미지 페이지 크레딧 줄 | ⚠️ | spaceengine.org 구성요소의 권리를 확인하지 못함 |
| R10 | https://www.cfa.harvard.edu/sites/default/files/2020-06/Exoplanets_0.jpg (650×539) | `M. Weiss/CfA` | CC0 | CfA 정책 + /news/8713/imagelist | ✅ | 해상도가 낮다. 캡션이 「about 40 light-years」라서 화면 문구와 충돌하지 않게 조심 |
| R11 | NASA PIA21429, PIA21751, PIA22093/22094 (TRAPPIST-1) | `NASA/JPL-Caltech` | PD (NASA/JPL 정책) | images-api.nasa.gov 메타데이터 | ✅ | 로고 제외, 보증 암시 금지. 해상도는 확인하지 않음 |
| R12 | https://commons.wikimedia.org/wiki/File:LasCampanasObservatory.jpg (2048×1360) | `Cédric Foellmi` | CC BY 2.5 | Commons 메타데이터 | ✅ | 크레딧 필수. 사진에 무엇이 찍혔는지는 확인하지 않음 |
| R13 | https://commons.wikimedia.org/wiki/File:Las_Campanas_Magellan.jpg (1600×1200) | `Denys` (fr) | CC BY 3.0 | Commons 메타데이터 | ✅ | 크레딧 필수 |
| R14 | Commons: Magellan-Telescopes-at-LCO-2014-04-19.jpg, Magellan telescopes.jpg | Jan Skowron / Krzysztof Ulaczyk | CC BY-SA 3.0 | Commons 메타데이터 | ❌ | SA 조건이라 안 쓴다 |
| R15 | Commons: Giant Magellan Telescope 도판 2건 | GMTO / US-ELTP | CC BY 4.0 | Commons 메타데이터 | ❌ | 이번 관측과 다른 망원경이라 오인 소지 |
| — | 적색왜성 플레어 시각화, 지구 대기 실사 | — | — | — | ⚠️ | 탐색하지 못함. sourcing 단계로 넘긴다 |


| R16 (추가 2026-09-23 fact-check m4) | https://commons.wikimedia.org/wiki/File:Magellan_Campanas.jpg (1600×1200, 2004-02-01 촬영) — 02_production/sourcing/photo/raw/magellan_dome_close_denys.jpg | `Denys` (fr), own work | CC BY 3.0 | Commons 메타데이터·API SHA1 8163b87f… 확인(fact-check) | ✅ | 실제 사용 파일. 크레딧+라이선스 링크+크롭 표기를 엔드 크레딧에. Clay/Baade 여부는 사진에서 식별 불가 → 라벨은 "마젤란 망원경"으로만 |
