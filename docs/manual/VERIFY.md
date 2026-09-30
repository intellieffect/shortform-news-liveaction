# HANI-MANUAL 검증 대조표 (내부용 — 고객 전달 아님)

| 항목 | 값 |
|---|---|
| 대상 문서 | `docs/manual/HANI-MANUAL.md` v0.9 (html·pdf는 이 md에서 생성) |
| 기준 코드 | 브랜치 `yubeeeen/shortform-news-liveaction-int5833`, 기준 커밋 3e7d18f9, plugin 1.5.0 |
| 작성일 | 2026-09-30 |
| 근거 | 각 프롬프트가 실제로 처리되는 스킬·문서 위치(파일:줄). 경로 약어 `P/` = `plugin/skills/shortform-news-pipeline/`, `I/` = `plugin/skills/shortform-news-input/` |
| 상태 | **문서 대조만 완료. Windows·Claude 데스크톱 Code 탭 실측 없음** — 아래 "실제 결과·통과" 칸은 비어 있음 |

INT-5833 완료 조건의 "절차별 입력·실행·결과 대조표" 양식이다. Windows 설치본(INT-5834와 같은 버전)에서 Code 탭으로 위에서부터 따라 하며 채운다. 유료 호출(TTS·Higgsfield)이 드는 항목은 ★ 표시.

## 실측 환경 기록 (검증자가 채움)

| 항목 | 값 |
|---|---|
| 수행자 / 일시 | |
| OS / Claude 데스크톱 앱 버전 | |
| 설치 플러그인 버전 (`doctor --installed`) | |
| 제작 저장소 커밋 | |
| 사용 기사 URL (새 편) | |
| 미확인 항목 | |

## 1. 프롬프트별 대조표

| # | 장 | 입력 (매뉴얼 그대로) | 처리 근거 (파일:줄) | 기대 결과 | 실제 결과 | 통과 |
|---|---|---|---|---|---|---|
| P01 ★ | 1 | `<URL> 이 기사로 숏폼 만들어줘` | CLAUDE.md:17-25 (첫 진입·V2 자동 적용), P/reference/production-entry.md:37-49 (start·같은 URL 거절), docs/HANI-GUIDE.md:9, P/SKILL.md:14 (썸네일 3장), docs/PRODUCTION_PROMPT_V2_RESTORED.txt:1,4 | 새 편 `hani_<번호>` 생성, 중간 승인 없이 완성 시안·썸네일·한계 보고, 완료 시 자동 확정 | | ☐ |
| P02 ★ | 1 | `<URL> 이 기사로 숏폼 만들어줘. 끝 크레딧 시간은 빼고 본문만 60초 안팎으로 해줘` | P/reference/production-entry.md:118 (`--duration-basis content`), config/layout-rules.md:62 | request.json에 duration 본문 기준 기록, 크레딧은 별도 가산 | | ☐ |
| P03 | 2 | `<URL> … 음성 만들기 전에 구성안·원고·후킹 문구를 보여주고 멈춰줘` | P/SKILL.md:18, P/reference/production-entry.md:53-67, P/reference/editorial-concept-track.md:38 (6단계) | TTS·Higgsfield 호출 전 멈춤, 구성안·원고 전문·후킹·BGM 후보·분량 표시, 제작 노트에 대기 기록 | | ☐ |
| P04 ★ | 2 | `진행해줘` | P/reference/production-entry.md:69,73,78 | 회신 원문이 `00_brief/plan-review-reply-1.txt`로 보존, 음성부터 끝까지 진행 | | ☐ |
| P05 ★ | 2 | `후킹 문구를 '<새 문구>'로 바꾸고 진행해줘` | P/reference/production-entry.md:74; P/reference/hook-overlay.md:9-13 | concepts.text → rows 수정, 첫 문장과 어긋나면 첫 문장 수정, 음성부터 진행 | | ☐ |
| P06 | 2 | `원고 세 번째 문장을 '<새 문장>'으로 고치고 다시 보여줘` | P/reference/production-entry.md:75-76 | 원고 수정(사실 범위 변경 시 editorial-judge 재호출) 후 같은 형식으로 다시 멈춤 | | ☐ |
| P07 | 3 | `<URL> 편 후킹 화면 문구를 '<새 문구>'로 바꿔줘. 음성은 그대로 둬` | P/reference/hook-overlay.md:9-13 (특히 13 "후킹만 수정하는 작업에서 승인된 음성·말자막을 재작성하지 않는다"), P/reference/production-entry.md:122 | concepts.text·rows·motion 앵커 수정 → check/compile/sync, 음성·말자막 불변 | | ☐ |
| P08 ★ | 3 | `<URL> 편 첫 문장을 '<새 문장>'으로 바꾸고 후킹 문구도 맞춰줘` | P/reference/hook-overlay.md:3,9,13; P/reference/production-state.md:69 | 원고·TTS 재생성 → 정렬·자막·timeline 재산출, 후킹 문구 일치 | | ☐ |
| P09 | 4 | `<URL> 편 보름달 장면이 너무 길어. 관련 사진 컷을 하나 더 넣어 두 컷으로 나눠줘` | P/reference/production-state.md:67-75 (장면 수 변경 권한 :75), P/reference/editorial-concept-track.md:31 (5 자료와 표현), :43 (11 수정) | 해당 편 장면 TSX·자료 수정, 음성 유지, 재검수 | | ☐ |
| P10 | 4 | `<URL> 편 행성 장면에 천천히 다가가는 카메라 움직임(줌인)을 넣어줘` | P/reference/motion-timing.md (곡선·시점), P/reference/production-state.md:72 (장면 코드 → proof/render 이후), V2 prompt:14 (카메라 움직임은 제작자 선택) | 해당 장면에만 줌인 적용 | | ☐ |
| P11 | 4 | `<URL> 편에서 두 수치를 막대 비교 도식으로 보여줘` | P/reference/visual-expression.md:27 (비교 예), P/reference/visual-production.md:60-62 (수치는 기준에 붙임), P/reference/editorial-concept-track.md:31 | 같은 축 막대 비교 도식, 수치는 코드 합성 | | ☐ |
| P12 | 5 | `이 음원 공용 음원 폴더에 넣어줘. 라이선스: …, 끝 크레딧: …, 사용 범위: …` (+파일 첨부 또는 URL) | P/SKILL.md:20, I/reference/music-library.md:9,14-17,38; library/music/README.md:3-17 | `npm run music -- add` → catalog.json 기록·`공용 음원: <id> 추가` 자동 커밋, 라이선스 없으면 거절·되물음 | | ☐ |
| P13 | 5 | `공용 음원 목록 보여줘` | I/reference/music-library.md:10 | `music list` 표(곡·라이선스·범위·크레딧·파일 있음) | | ☐ |
| P14 | 5 | `<URL> 편 배경음악을 공용 폴더의 '<곡 이름>'으로 바꿔줘` | I/reference/music-library.md:11,17,21-28 | 파일 복사·audio.json bgm·RIGHTS.md·끝 크레딧 "음악" 줄 연결 → sync | | ☐ |
| P15 | 5 | `<URL> 편 배경음악을 조금 더 작게 해줘` | P/reference/production-state.md:71 (BGM 구성 → sync 이후), I/reference/music-library.md:28 | audio.json gain 조정, 음성 유지, 청취 확인 | | ☐ |
| P16 ★ | 6 | `<URL> 편에서 '6시'를 '여섯 시'로 읽게 고쳐줘` | I/reference/narration.md:17-23 (substitutions·낭독표기), P/reference/production-state.md:69 | 자막 표기 유지, 낭독 표기 변경 → TTS 재생성 → 재정렬 | | ☐ |
| P17 | 6 | `<URL> 편 자막에서 '<고유명사>'이 끊겼어. 음성은 그대로 두고 자막만 다시 나눠줘` | P/reference/caption-segmentation.md:9-30 (보호 구간·`narration:assemble --replace`), config/layout-rules.md:31-41, V2 prompt:33 | caption-segmentation.json 보호 구간 → 재조립, 음성 불변 | | ☐ |
| P18 | 7 | `<URL> 편 끝 크레딧에 '<출처 문구>' 사진 출처를 추가해줘` | config/layout-rules.md:43-47,51-58 | visual-system.json attribution.pages에 추가, 장당 3초 | | ☐ |
| P19 | 7 | `<URL> 편 출처 표기가 실제 화면에 나온 자료와 맞는지 확인해서 고쳐줘` | config/layout-rules.md:45,49,55-57 | sources 노출 구간·원자료 표기 대조 수정 | | ☐ |
| P20 | 8 | `<URL> 편 이대로 확정해줘` | P/reference/review-loop.md:150-156; docs/HANI-GUIDE.md:15-19 | closeout 기록 → `deliver --basis user` → vN·LATEST·videos.html·자동 커밋 `편 <id> vN 확정` | | ☐ |
| P21 | 8 | `<URL> 편을 v1로 돌려줘` | P/reference/review-loop.md:156 (`--from vK`); docs/HANI-GUIDE.md:11 | v1 영상을 새 버전으로 재확정, 이력 보존 | | ☐ |
| P22 | 8 | `완성 영상 목록 열어줘` | docs/HANI-GUIDE.md:21-27; docs/VIDEO-LIBRARY.md:7-9,15 | videos.html 열림(권장 `videos:serve`), 확정본·이전 판·제작 중 표시 | | ☐ |
| P23 | 9 | `지금 기본값 보여줘` | P/SKILL.md:19, P/reference/global-defaults.md:5-11 | `npm run defaults` 표 그대로 표시 | | ☐ |
| P24 | 9 | `앞으로 모든 새 영상의 기본 보이스를 '<보이스 이름>'으로 바꿔줘` | P/reference/global-defaults.md:18,35,39,41-47; config/production-defaults.md:11 | voice_id 확인 → `defaults voice` → 자동 커밋 `기본값: …`, .env 우선 경고 시 그대로 전달, 소급 없음 안내 | | ☐ |
| P25 | 9 | `앞으로 모든 새 영상의 기본 제작 지시에 '<문장>'을 추가해줘` | P/reference/global-defaults.md:17,33-34,39,41-47 | 원문 그대로 가장 가까운 문단에 추가 → `prompt-bump --note` → `v2-original@N+1`·보관본·자동 커밋, 소급 없음 안내 | | ☐ |
| P26 | 10 | `<URL> 편 자막·출처·끝 크레딧·후킹이 기본 기준대로 들어갔는지 정지 화면으로 보여줘` | CLAUDE.md:11 (still/slides로 검토), P/reference/commands.md:15,57-59; config/layout-rules.md:19 | still/slides 정지 화면 제시, 렌더 없음 | | ☐ |
| P27 | 부록 | `자동 저장에 쓸 이름을 '<이름>', 메일을 '<메일>'로 설정해줘` | docs/HANI-GUIDE.md:29-36 | 저장소 git user.name/email 설정 → 이후 자동 커밋 동작 | | ☐ |
| P28 | 부록 | `제작 환경 점검해줘` | README.md:70-76; P/reference/production-entry.md:15-31 | `doctor --installed` 결과(프로그램·키 이름·플러그인 버전) 보고 | | ☐ |

## 2. 기본 적용 항목(10장) 확인 — INT-5833 #3~6

P01로 만든 새 편에서 확인한다. 요청 없이 적용되어야 한다.

| 항목 | 근거 | 확인 방법 | 실제 결과 | 통과 |
|---|---|---|---|---|
| #3 안전영역 | config/layout-rules.md:7-19 | 원해상 정지 화면 + 휴대폰 YouTube 앱 재생, 상단·우측·하단 UI 겹침 | | ☐ |
| #4 끝 크레딧 좌측·카테고리 줄바꿈·장당 3초 | config/layout-rules.md:13,51-58; config/production-defaults.md:13 | 마지막 구간 정지 화면·시간 | | ☐ |
| #5 숫자 낭독 | I/reference/narration.md:17-23 | 숫자 포함 문장 직접 청취 | | ☐ |
| #5 쉼표 자막·한 줄·고유명사 묶음 | config/layout-rules.md:21-41; P/reference/caption-segmentation.md | 쉼표·기관명 문장 정지 화면 | | ☐ |
| #6 후킹 강조(초반 1회·노란 밑줄) | P/reference/hook-overlay.md:3,35-43; config/production-defaults.md:7 | 첫 5초 연속 재생 | | ☐ |

## 3. 11장(인텔리이펙트 요청) 경계 근거

| 매뉴얼 표기 | 근거 |
|---|---|
| 후킹 장식·출처 스타일·로고·검사 계약은 개발 요청 | P/reference/global-defaults.md:21-23,27 |
| 4초·2컷·카메라·카운트업 등 자동 기본 기능 없음, 편마다 요청 | P/reference/global-defaults.md:29; INT-5814 승인 회신 (2026-09-29 발신본) "워크플로우 기능 추가 요청 — 별도 논의" |
| 상단 제목 바 편 요청도 맞지 않음 | V2 prompt:18 "영상 상단 고정 제목·장면명·설명 … 넣지 마" |
| 끝 크레딧 제거 불가 | config/layout-rules.md:58; config/production-defaults.md:13 |
| 기사→구성안 자동 생성 약속 안 함 | INT-5833 본문 "기사→구성안 자동 생성 기능을 새로 만드는 요청으로 확대하지 않고"; 매뉴얼 2장 주의 |
| "자막 크게"는 제작 지시로 안 바뀜 | P/reference/global-defaults.md:25 |

## 4. 불일치·확인 필요 (스킬 수정하지 않음 — 보고만)

| # | 구분 | 내용 | 근거 | 매뉴얼 처리 |
|---|---|---|---|---|
| D1 | 불일치 | 기본 보이스: `narration.md`는 "기본값으로 특정 보이스를 가정하지 않는다"인데 config·전역 기본값 절차는 `narration.voice`(Sanghyun)를 새 편 기본 보이스로 둔다 | I/reference/narration.md:27 vs config/production-defaults.md:11, P/reference/global-defaults.md:18 | 9장은 global-defaults 기준으로 씀. narration.md 문구 정리 필요 |
| D2 | 불일치(약속 대비) | #5 숫자 낭독은 승인 회신에서 "기본값 반영" 항목인데, 스킬에는 편별 치환표(substitutions)만 있고 공통 숫자 읽기 규칙·전역 발음 사전이 없다 — 제작자 판단에 의존 | 승인 회신 #5; I/reference/narration.md:17-23 | 10장에 "원고 쓸 때마다 적용, 드물게 틀림 → 들어 보고 6장" 한계 명시, 6장에 "공통 발음 사전 없음" 명시 |
| D3 | 확인 필요 | 매뉴얼은 Claude 데스크톱 **Code 탭** 전제인데 설치 절차는 Claude Code **CLI** 기준(`claude plugin install`). Code 탭이 같은 플러그인·스킬·검수 에이전트를 로드하는지 미확인 | README.md:23,41-51; P/reference/production-entry.md:13,25 | 0장 전제로 둠. Windows 실측 1순위 |
| D4 | 확인 필요 | 자막 가로 폭 780/756은 모바일 실측 전 잠정값, 안전영역 최종 좌표 미확정 — INT-5833 완료 조건 "최종 공용 좌표/검증 기기 안내"를 아직 충족 못 함 | config/layout-rules.md:11,19,26 | 10장 주의에 잠정값 명시 |
| D5 | 확인 필요 | P27(이름 설정)을 Claude가 대신 `git config` 하는 절차는 스킬에 없음 — HANI-GUIDE는 사람이 명령을 직접 치는 것으로 씀 | docs/HANI-GUIDE.md:29-36 | 부록 A에 자연어 프롬프트로 실음. 실측 필요 |
| D6 | 확인 필요 | "완성 영상 목록 열어줘"가 `videos`(file://)와 `videos:serve` 중 무엇을 쓸지 지침에 없음. file://에서는 다운로드 버튼이 브라우저에 따라 저장 대신 재생 | docs/HANI-GUIDE.md:23; docs/VIDEO-LIBRARY.md:7-9 | 8장은 결과만 기술. serve 권장 한 줄을 HANI-GUIDE에 넣을지 판단 필요 |
| D7 | 기준 차이 | INT-5833 본문의 작성 기준(b0605f3b / hook-overlay@3 / plugin 1.3.0)과 이 브랜치(3e7d18f9 / hook-overlay@4·screen-text@2·attribution@2 / plugin 1.5.0)가 다름 | INT-5833 본문 "최신 인계"; P/reference/production-entry.md:120 | 매뉴얼은 이 브랜치 기준. 한겨레 설치본(INT-5834)을 1.5.0에 맞춰야 매뉴얼과 일치 |
| D8 | 확인 필요 | 이 맥의 설치 플러그인이 레포보다 낡아 있었음(조사 시점 1.0.0). 설치본 버전이 낡으면 매뉴얼의 멈춤·공용 음원·기본값 경로가 안 뜸 | control-map 보고서 (5); P/reference/production-entry.md:116 | 실측 전 `doctor --installed`로 1.5.0 확인 |

## 5. 산출물 생성 방법

- HTML: `docs/manual/HANI-MANUAL.md`에서 단일 HTML로 변환(인라인 CSS·복사 버튼·A4 인쇄 스타일). 변환 스크립트는 작업 세션 임시 폴더에 있었고 저장소에 넣지 않았다 — md를 고치면 HTML도 같이 고친다.
- PDF: HTML을 로컬 headless Chrome `--print-to-pdf --no-pdf-header-footer`로 인쇄. 영상 렌더 아님. 저장소 관례(추적 PDF 없음·LFS 규칙 없음)에 따라 **커밋하지 않고** 전달용으로만 둔다.
