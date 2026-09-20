# 입력 게이트 — 자료 수령부터 권리 추적까지

기사 위임 제작은 [새 편 시작](../../shortform-news-pipeline/reference/production-entry.md)의 요청 원문·프로필·상태를 먼저 읽는다. URL 등록과 실제 기사 수령은 별개이며, 수집은 현재 저장소의 검색·브라우저 지침을 따른다.

정의서 §3.2 6항목: ① 기사 원문(제목·작성자·게재일·URL) ② 완성 대본 ③ 내레이션 WAV ④ 표현 기준 ⑤ 사진·영상 ⑥ 사용권. 공통: 브랜드 자산, Higgsfield/에이전트 계정.

## 0. 수령

- 메일: `gog gmail search '<발신자> newer_than:3d'` → `gog gmail get <id>` (본문 저장 `01_input/00_mail_raw/<id>.txt`) → `gog gmail attachment <id> <n> --use-indexed-attachment-ids --out <dir>/` → **파일명 원래대로 복원**, md5 기록.
- 폴더: `01_input/{00_mail_raw, 01_원문_기사, 02_완성_대본, 03_나레이션, 04_표현기준, 05_참고자료/docx_media}`.
- 추출(원본은 건드리지 않음): `textutil -convert txt`, `unzip -j 'word/media/*'`. docx 내 이미지 순서 = `word/_rels/document.xml.rels` rId 순.
- Linear 이슈에 수령 코멘트 (무엇을 받았고 무엇이 없는지, 확인 항목).

## 1. MANIFEST.md

`templates/MANIFEST.md` 복사. 6항목 + 공통 2항목의 상태(✅/🟡/❌)와 비고, 파일 목록(원본·파생 구분), 수령 절차 체크리스트(Fwd → 저장 → 추출 → facts → 클라이언트 확인 → 원본 고해상 확보).

## 2. 제공 자료의 원본·권리 추적 (입력 게이트에서 바로)

이유: 제공 사진은 거의 항상 2차본(웹 캡처·유튜브 링크). 사용권 미확인은 정의서 §7.2 게이트 발동 조건이라 shots 짜기 전에 닫아야 한다. 5~10분.

1. 캡션·출처 문구 → 원 기관(ESO·NASA·NOIRLab·커먼즈) 직행. 뉴스 재인용 제외(WebSearch `allowed_domains`).
2. URL 규칙으로 페이지 안 열고 조립: ESO `cdn.eso.org/images/publicationjpg/<id>.jpg` · `cdn.eso.org/videos/hd_1080p25_screen/<id>.mp4`, NASA EOL `eol.jsc.nasa.gov/DatabaseImages/ESC/large/<MISSION>/<ID>.JPG`, 커먼즈 API `imageinfo&iiprop=url|size|extmetadata`.
3. 라이선스는 정책/파일 페이지에서 **읽고** 기록 (ESO CC BY 4.0 + 크레딧 원문 의무·로고 금지·식별 인물 상업 금지 / NASA PD / 커먼즈 파일별).
4. `05_참고자료/INDEX.md`(자료↔문장 매핑, 해상도, 캡션 원문) · `RIGHTS.md`(권리자·라이선스·확인 상태) · `02_production/external_assets/SOURCES.md`(대장).

## 3. 즉시 판정할 것

- 해상도 < 1080×1920 풀프레임 → 원본 확보 대상.
- 캡션이 이미지에 구워져 있으면 크롭 필수 표기.
- 시뮬레이션·예측·지상시험 이미지 → 화면 라벨 필수 (facts C류).
- 내레이션 WAV 없음 → 사용 가능한 TTS·정렬 경로를 확인한다. 보이스가 위임됐으면 제작자가 선택하며, 제공 대본 경로에서 사용자가 직접 선택하기로 한 경우에만 선택 항목으로 남긴다.
- 표현 기준 문서 없음 → `facts.md`가 대체.

## 4. 이번 파일럿에서 배운 것

- Fwd 메일은 발신자 계정(bruce@)에만 있을 수 있다 — 먼저 `gog auth list`로 어느 계정인지 확인.
- `gog gmail attachment` 출력명은 `<id>_<n>_attachment.bin` → 원래 파일명으로 mv, 중복은 md5로 확인 후 삭제.
- 시각은 `date`로 찍고 적는다(추측 금지).
