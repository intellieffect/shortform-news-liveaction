# 자산 소싱 — 배경·오버레이·브리프 대응

정본: `docs/asset-sourcing-workflow.md` (5단계·두 시점·산출물). 그래픽 부품 소스: `docs/graphic-primitives-sourcing.md`. 여기는 실행 순서만.

## 두 시점

1. **입력 게이트** — 제공 자료의 원본·권리 (`intake.md` §2).
2. **beats 확정 후** — output이 `npm run gaps` → `asset_gaps.json` / `asset_brief.json` → 여기서 채운다. **시트 전 완료가 게이트다(두 판 체계)** — 회수 후보·실사 소진 판정 문서까지 이 시점에 같이. 시트에는 생성물이 0(수집·공식·게재본·도해만)이고, 생성은 3′에서 '대상 확정'(gen_plan)만 한 뒤 **v2 생성판 단계에서 실행**(사용자 크레딧 게이트, 수집본 clip_option 보관). 같은 문장 안 다른 피사체(예: 우주거울)는 shots 초안의 generated 표시로 잡힌다.

## 5단계 (순서 고정 — v2: 각 단계에서 사진+영상 동시)

기관 직행(ESO images **+ videos** `?adv=&subject_name=`, NASA SVS API `svs.gsfc.nasa.gov/api/<id>`) → Openverse(무키, 커먼즈 ≥2000px; 영상은 커먼즈 API `filemime:video/webm`) → Pexels(portrait 사진+영상, 원본은 `videos/videos/<id>`) → Unsplash(download_location 트리거) → Pixabay(영상만) → **생성은 전부 빈 뒤 + SOURCES.md에 "실사 소진 판정" 기록 뒤 + 사용자 결정**. 라이선스 우선순위 PD → CC BY → 스톡. **CC BY-SA 불사용.**

v2 규칙(`docs/asset-sourcing-workflow.md` 개정 8항): 검색어는 **문장의 명사**에서 · 기각 사유는 **A·B·라이선스** 중 하나(해상도·길이는 규격 게이트) · 실물 확인은 **9:16 컨택트시트** · SOURCES/assets.json에 **A/B 판정 병기**(B ∈ static|video, 4초+ 비트 static은 B3 표시) · Flickr는 페이지에서 원본 추출 가능하나 원본 크기·현재 라이선스를 oEmbed로 실측.

키: `PEXELS_API_KEY` · `PIXABAY_API_KEY` · `UNSPLASH_ACCESS_KEY` · `TYPECAST_API_KEY` (환경변수 또는 저장소 `.env`, `.env.example` 참고). 스크립트: `scripts/openverse_search.py`, `scripts/stock_search.py`, `scripts/brief_search.py` (쿼리 리스트만 바꿔 파일럿 `external_assets/_search/`에서 실행).

## 오버레이용은 따로 뽑는다

배경판만 모으면 안 된다. 문장별로 **피사체 컷아웃**(달·지구·소행성 등 NASA PD → PIL 알파: 휘도키+원형/볼록껍질 마스크+페더, 어두운 배경 전용 표기), **증거 문서**(논문 1페이지 PNG — arXiv CC BY 확인, 보도자료 영문 인용), **아이콘**(Tabler MIT)을 `external_assets/overlay/` + `assets.json overlay_assets[]`로.

## 실물 오인 규칙

AI 실물 묘사·로고 금지이지 **실사 금지가 아니다**. 주제 실물(스타링크 위성·발사)은 SpaceX 공식 CC0·커먼즈 CC BY 실사로. 실물이 없으면(우주거울) **같은 원리의 실물(NASA 태양돛) + "실물 아님" 라벨**.

## 실물 확인 후 채택

후보는 다운로드해 **보고** 판정한다(스크린샷 캡션 구움·CG 렌더·브랜드 로고·특정 도시·별 궤적 오인·인물 식별). 기각도 `_rejected/`에 사유와 보존.

## 등록 (경계 파일)

`01_input/assets.json`: `assets[]`(제공) · `external_assets[]`(기관·커먼즈·스톡 배경) · `overlay_assets[]`(컷아웃·문서·아이콘) · `brief_assets{free[], paid_candidates[]}`(브리프 대응, beat_fit·rank·label_suggestion). 필드: id, type, source(external|stock), provider, path(root 기준), width/height(/duration/fps), label, credit(원문), license, license_url, **license_evidence(문구가 붙은 자리 — 페이지의 어느 항목인지)**, origin_url, replaces|supersedes_generated, rights_status, sentence_fit, is_real_observation(시뮬레이션·상상도는 false — 자산 여부가 아니라 **라벨** 판정용, `asset-gaps` 가 `non_real_only` 로 돌려준다), note. **라이선스는 자산마다** — 같은 페이지의 다른 항목에 문구가 있다고 물려받지 않는다(6편 RAS). 유료 후보는 URL·라이선스·가격만(미구매).

`SOURCES.md`: 섹션별 표 + 기각 사유 + 미확보 + 최종 집계(assets.json에서 계산해 적는다).

## 크레딧

CC BY(ESO·NOIRLab·커먼즈) 의무 — 원문 그대로, 비트 소자막 + 엔드카드 이중. NASA·스톡은 권장. ESO 로고 금지. output shots `visual.source` = external(의무)/stock(권장) 분기. **CC BY-SA 는 원칙적으로 불사용**(§5단계) — 사용자가 명시 지정하면 예외이되 share-alike 전파를 facts 확인 항목으로 남기고, 엔드카드 표기는 `CC BY-SA 3.0 IGO` 처럼 **변형·버전·IGO 까지 원문대로**(6편: 스크립트가 "CC BY" 로 깎고 있었다).

## 사운드 (4-5 요청 대응)

- 소스: Mixkit — 음악은 tag/mood 페이지 JSON-LD(항목별 `copyrightNotice` 실측), SFX는 카드 HTML(preview mp3). Pixabay 음악·SFX 공개 API 없음, Freesound 키 필요.
- BGM 선정: `scripts/mood_search.py` — 내레이션·facts에서 분위기 프로필 → Mixkit mood/tag 페이지 교집합 점수 → 상위 곡 오디오 특징(drum·bright·LRA·LUFS·BPM추정) → fit 순위. **제목만 보고 고르지 않는다.**
- 등록 필수(`assets.json audio_assets[]`): role(bgm|sfx_*)·rank·duration·lufs_integrated·lra·bpm_est(+confidence)·**intro_silence_sec**(0.5s RMS −30dBFS 최초 초과, output `bgm.start_offset_sec` 기본값)·intro_rms_db_0_5s·credit·license_url·selected.
- 최종 곡 = 사용자 청취 선택. 크레딧 "Music: <곡> by <아티스트> — Mixkit".

## 사운드 측정 함정 2건 (2026-08-30 «우주거울» 실측)

**① BPM 자기상관은 하한 랙에 붙는다.** RMS 포락선 자기상관은 단조 감쇠라 `argmax`가 항상 최소 랙을 고른다 — 13곡 전부 200 BPM이 나왔다. 감쇠 추세를 1차 다항식으로 뺀 뒤 **국소최대**를 피킹하고, 피크 높이로 신뢰도(high >0.05 / mid >0.02 / low)를 병기할 것. 구현 = `work/hani_space_mirror/02_production/external_assets/_search/audio/repulse.py`.

**② `intro_silence_sec == 0.0`이 falsy다.** 게이트를 `(r["intro_silence_sec"] or 9) > 1.0`으로 쓰면 무음이 아예 없는 곡(0.0초)이 탈락한다. `is None` 검사로 분리할 것.

**③ Mixkit SFX 페이지 구조가 바뀌었다.** `/free-sound-effects/tag/<t>/`는 **404**, `/free-sound-effects/<t>/`가 200인데 **JSON-LD를 안 내보낸다.** `data-audio-player-item-id-value` + `item-grid-card__title`로 파싱하고, mp3는 `assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3`. **길이는 페이지에 없으니 받아서 ffprobe로 잰다.** 음악 페이지는 그대로 JSON-LD를 낸다. `scripts/mixkit_scrape.py`에 반영 완료.

## 생성 규칙 2건 (2026-08-30 사용자 지시, «우주거울»)

**① 생성은 비트당 1개.** 시안을 여러 개 뽑지 않는다(`count: 1`). 이전 편들은 비트당 2~3 변형을 뽑아 고르는 방식이었는데, 크레딧이 배로 들고 "고르는 재미"가 판정을 흐린다. **프롬프트를 정확히 쓰고 한 번에 받는다.** 결과가 avoid에 걸리면 프롬프트를 고쳐 다시 1개.

**② 수집한 스톡도 생성 재판정 대상이다.** 7단계(적합성 판정)에서 "스톡은 실사니까 유지"로 뭉뚱그리면 안 된다. **비트별로 '이 문장에 이게 더 적합한가'를 남긴다.** 실사라는 이유만으로 통과시키면, 문장이 요구하는 것과 다른 그림이 살아남는다.
- 실측 사례: «우주거울» b21·b22에 배정한 별 궤적 타임랩스는 **지구 자전에 의한 궤적**이라 이 영상 맥락(위성)에서 오인 소지가 있었다(input이 A△로 적어 뒀는데도 7단계에서 "스톡 유지"로 묶여 넘어갔다). 재판정에서 생성으로 갔다.
- 다만 **생성 금지 상위 규칙이 먼저다**(아래 ③) — 특정 실물은 재판정에서도 생성으로 가지 않는다.

**③ 생성 금지 범위 = 특정 실물.** (2026-08-30 사용자 지시 + 같은 날 정정)
> "실제 제품이나 고유한 형태가 있는 것은 AI 생성으로 넘어가면 안 돼" → "b05의 냉장고는 에아렌딜-1처럼 물체의 고유성을 해치는 제품이 아니잖니"

**판정은 대본이 그것을 무엇이라 부르는지로 한다.**

| 대본의 호칭 | 예 | 생성 |
|---|---|---|
| 고유명사·특정 개체 | 「에아렌딜-1」 | **금지** — 생성물이 "그것의 실제 모습"으로 오독된다 |
| 실존 시설·장소 | 「키트피크 국립천문대」 「VLT」 | **금지** |
| 실존 인물 | 이름이 나오는 사람 | **금지** |
| 보통명사·범주 | 「소형 냉장고」 「밤하늘」 「태양광 패널」 | **가능** |

금지 대상은 ① 제품이 안 보이는 배경 ② 공개된 공식 자료로 가고, **대상 자체는 코드 도해**가 맡는다.
실측: «우주거울»에서 「에아렌딜-1」 생성(G1)은 기각, 「소형 냉장고」 생성(G3)은 진행. 같은 규칙의 양면이다.

→ 판정 결과는 `assets.json judgement.note`에 비트 단위로 남기고, "유지"도 사유를 적는다(문장을 수행한다/생성 이득 없음 등).


## 생성물 검수 — 글자·마크는 확대해야 보인다 (2026-08-30 «우주거울» G3)

**프롬프트에 `unbranded, no logos`를 넣어도 의사 브랜드 마크가 나온다.** 생성 모델이 "제품 사진에는 브랜드가 있다"는 관습을 따르기 때문이다. 실측: G3 무브랜드 냉장고 요청 → 문 상단에 「Rosarrt」류 가짜 글자 생성.

- **부정 지시보다 긍정 지시.** `no logos` 대신 **`blank plain door, no emblem, no nameplate`** 처럼 "무엇이 있어야 하는가"로 쓴다.
- **검수는 등배 이상으로 확대해서.** 축소 컨택트시트에선 마크가 문 질감에 묻혀 안 보인다. 생성 프레임은 로고가 붙을 만한 자리(제품 전면·상단·측면)를 크롭 확대해 훑는다.
- **숫자로 확인하는 법**: 의심 띠를 crop해서 프레임별 **명암폭(max−min)** 을 잰다. 글자가 있으면 100 이상, 평평한 표면이면 60 이하. 실측 — 원본 124~208 → delogo 후 36~62.
- **걸리면 재생성 말고 `delogo`.** 카메라가 움직이면 마크 위치도 움직이니 **궤도 이동 범위의 합집합**으로 영역을 잡는다. 크레딧 0, 원본 무수정.

## 표현을 구속하는 기술 사실 (2026-08-31 «우주택배»)

소싱·도해 때 **기사·1차 출처의 기술 사실이 색·형태 표현을 구속하는지** 확인하고, 걸리면 facts 해당 행에 표현 규칙으로 적는다.
- 실측: 스타폴 추진기 = **냉가스(질소)** → 분사를 주황 화염으로 그리면 사실 왜곡 → facts #19 에 "백색/청백 가스 제트" 규칙 추가. output 코드·MC 둘 다 이 행을 따른다.
- 같은 유형: 예측/시뮬레이션 라벨(3편), 켄번스≠움직임(2편). **그림 문법도 팩트 대상이다.**

## 외부 도해 도구 판정 기록 (Napkin, 2026-08-31 보류)

Napkin 류(노드마다 제목·설명·아이콘을 채우는 문법)는 '한 비트 한 표현·글자는 숫자·고유명사만' 규칙과 기본 결이 다르다 — 쓰려면 파생에서 덜어내는 작업이 전제. 4편에서 시안 8종 → 사용자 보류("정보를 과하게 시각화"). 워터마크 = free 플랜 표시라 임의 삭제 금지(약관), 유료 재export 가 정도. 기록 = `work/hani_starfall/02_production/external_assets/SOURCES.md` §10.
