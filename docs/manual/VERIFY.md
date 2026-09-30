# HANI-MANUAL 검증 대조표 (내부용 — 고객 전달 아님)

| 항목 | 값 |
|---|---|
| 대상 문서 | `docs/manual/HANI-MANUAL.md` v0.11 (html·pdf는 이 md에서 생성). v0.11 압축 내역은 §8 |
| 기준 코드 | 브랜치 `yubeeeen/shortform-news-liveaction-int5833`, v0.9 기준 3e7d18f9 → v0.10은 공용 음원 단순화 커밋 포함, plugin 1.5.1 |
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
| ~~P06~~ | 2 | **v0.11 삭제**(대표 프롬프트 P04·P05만 남김) — `원고 세 번째 문장을 '<새 문장>'으로 고치고 다시 보여줘` | P/reference/production-entry.md:75-76 | 원고 수정(사실 범위 변경 시 editorial-judge 재호출) 후 같은 형식으로 다시 멈춤 | | ☐ |
| P07 | 3 | `<URL> 편 후킹 화면 문구를 '<새 문구>'로 바꿔줘. 음성은 그대로 둬` | P/reference/hook-overlay.md:9-13 (특히 13 "후킹만 수정하는 작업에서 승인된 음성·말자막을 재작성하지 않는다"), P/reference/production-entry.md:122 | concepts.text·rows·motion 앵커 수정 → check/compile/sync, 음성·말자막 불변 | | ☐ |
| P08 ★ | 3 | `<URL> 편 첫 문장을 '<새 문장>'으로 바꾸고 후킹 문구도 맞춰줘` | P/reference/hook-overlay.md:3,9,13; P/reference/production-state.md:69 | 원고·TTS 재생성 → 정렬·자막·timeline 재산출, 후킹 문구 일치 | | ☐ |
| P09 | 4 | `<URL> 편 보름달 장면이 너무 길어. 관련 사진 컷을 하나 더 넣어 두 컷으로 나눠줘` | P/reference/production-state.md:67-75 (장면 수 변경 권한 :75), P/reference/editorial-concept-track.md:31 (5 자료와 표현), :43 (11 수정) | 해당 편 장면 TSX·자료 수정, 음성 유지, 재검수 | | ☐ |
| P10 | 4 | `<URL> 편 행성 장면에 천천히 다가가는 카메라 움직임(줌인)을 넣어줘` | P/reference/motion-timing.md (곡선·시점), P/reference/production-state.md:72 (장면 코드 → proof/render 이후), V2 prompt:14 (카메라 움직임은 제작자 선택) | 해당 장면에만 줌인 적용 | | ☐ |
| ~~P11~~ | 4 | **v0.11 삭제**(4장 대표 P09·P10만 남김) — `<URL> 편에서 두 수치를 막대 비교 도식으로 보여줘` | P/reference/visual-expression.md:27 (비교 예), P/reference/visual-production.md:60-62 (수치는 기준에 붙임), P/reference/editorial-concept-track.md:31 | 같은 축 막대 비교 도식, 수치는 코드 합성 | | ☐ |
| P12 | 5 | 음원 파일을 입력창에 끌어다 놓거나 주소를 붙인 뒤 `이 음원 공용 음원 폴더에 넣어줘` | I/reference/music-library.md:9,14-15,38; scripts/lib/music-library.mjs `addTrack`; library/music/README.md | `npm run music -- add` → catalog.json에 출처·sha256·추가일 기록, `공용 음원: <id> 추가` 자동 커밋. 라이선스·사용 범위·크레딧 **되묻지 않음**, 출력에 "끝 크레딧 음악 줄: <파일 이름>" | | ☐ |
| P13 | 5 | `공용 음원 목록 보여줘` | I/reference/music-library.md:10; scripts/music.mjs list | `music list` 표(id·파일 이름=끝 크레딧 음악 줄·출처·추가일·라이선스(미기재 허용)·파일 있음) | | ☐ |
| P14 | 5 | `<URL> 편 배경음악으로 공용 음원 폴더의 '<파일 이름>' 써줘` | I/reference/music-library.md:11,20-28; scripts/lib/music-library.mjs `useTrack`·`creditLine` | 파일 복사·audio.json bgm(credit=파일 이름)·RIGHTS.md(라이선스 "미기재" 허용)·끝 크레딧 "음악" 줄=파일 이름(확장자 제외) → sync | | ☐ |
| P15 | 5 | `<URL> 편 배경음악을 조금 더 작게 해줘` | P/reference/production-state.md:71 (BGM 구성 → sync 이후), I/reference/music-library.md:28 | audio.json gain 조정, 음성 유지, 청취 확인 | | ☐ |
| P16 ★ | 6 | `<URL> 편에서 '6시'를 '여섯 시'로 읽게 고쳐줘` | I/reference/narration.md:17-23 (substitutions·낭독표기), P/reference/production-state.md:69 | 자막 표기 유지, 낭독 표기 변경 → TTS 재생성 → 재정렬 | | ☐ |
| P17 | 6 | `<URL> 편 자막에서 '<고유명사>'이 끊겼어. 음성은 그대로 두고 자막만 다시 나눠줘` | P/reference/caption-segmentation.md:9-30 (보호 구간·`narration:assemble --replace`), config/layout-rules.md:31-41, V2 prompt:33 | caption-segmentation.json 보호 구간 → 재조립, 음성 불변 | | ☐ |
| P18 | 7 | `<URL> 편 끝 크레딧에 '<출처 문구>' 사진 출처를 추가해줘` | config/layout-rules.md:43-47,51-58 | visual-system.json attribution.pages에 추가, 장당 3초 | | ☐ |
| ~~P19~~ | 7 | **v0.11 삭제**(7장 대표 P18만 남김) — `<URL> 편 출처 표기가 실제 화면에 나온 자료와 맞는지 확인해서 고쳐줘` | config/layout-rules.md:45,49,55-57 | sources 노출 구간·원자료 표기 대조 수정 | | ☐ |
| P20 | 8 | `<URL> 편 이대로 확정해줘` | P/reference/review-loop.md:150-156; docs/HANI-GUIDE.md:15-19 | closeout 기록 → `deliver --basis user` → vN·LATEST·videos.html·자동 커밋 `편 <id> vN 확정` | | ☐ |
| P21 | 8 | `<URL> 편을 v1로 돌려줘` | P/reference/review-loop.md:156 (`--from vK`); docs/HANI-GUIDE.md:11 | v1 영상을 새 버전으로 재확정, 이력 보존 | | ☐ |
| P22 | 8 | `완성 영상 목록 열어줘` / Claude 없이: 파일 탐색기 → shortform-news-liveaction → out → videos.html 더블클릭 | docs/HANI-GUIDE.md:21-27; docs/VIDEO-LIBRARY.md:7-9,15 | videos.html 열림, 확정본·이전 판·제작 중 표시 | | ☐ |
| P23 | 9 | `지금 기본값 보여줘` | P/SKILL.md:19, P/reference/global-defaults.md:5-11 | `npm run defaults` 표 그대로 표시 | | ☐ |
| P24 | 9 | `앞으로 모든 새 영상의 기본 보이스를 '<보이스 이름>'으로 바꿔줘` | P/reference/global-defaults.md:18,35,39,41-47; config/production-defaults.md:11 | voice_id 확인 → `defaults voice` → 자동 커밋 `기본값: …`, .env 우선 경고 시 그대로 전달, 소급 없음 안내 | | ☐ |
| P25 | 9 | `앞으로 모든 새 영상의 기본 제작 지시에 '<문장>'을 추가해줘` | P/reference/global-defaults.md:17,33-34,39,41-47 | 원문 그대로 가장 가까운 문단에 추가 → `prompt-bump --note` → `v2-original@N+1`·보관본·자동 커밋, 소급 없음 안내 | | ☐ |
| P26 | 10 | `<URL> 편 자막·출처·끝 크레딧·후킹이 기본 기준대로 들어갔는지 정지 화면으로 보여줘` | CLAUDE.md:11 (still/slides로 검토), P/reference/commands.md:15,57-59; config/layout-rules.md:19 | still/slides 정지 화면 제시, 렌더 없음 | | ☐ |
| ~~P27~~ | 부록 | **v0.11 삭제**(부록 A를 4행으로 줄이며 '자동 저장 멈춤' 행과 함께 뺌) — `자동 저장에 쓸 이름을 '<이름>', 메일을 '<메일>'로 설정해줘` | docs/HANI-GUIDE.md:29-36 | 저장소 git user.name/email 설정 → 이후 자동 커밋 동작 | | ☐ |
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

## 3. 자동 기능·디자인 경계 근거 (v0.10: 11장 삭제 → 각 장 주의 / v0.11: 디자인 경계는 10장 주의 한 줄, 자동 기능 경계는 4장 주의 한 줄)

| 매뉴얼 표기 | 근거 |
|---|---|
| (v0.11 10장 주의) 글꼴·색·크기·배치 디자인은 요청·기본 제작 지시로 안 바뀜 — 후킹 장식·출처 스타일·로고·검사 계약은 개발 요청 | P/reference/global-defaults.md:21-23,27 |
| 4초·2컷·카메라·카운트업 등 자동 기본 기능 없음, 편마다 요청 | P/reference/global-defaults.md:29; INT-5814 승인 회신 (2026-09-29 발신본) "워크플로우 기능 추가 요청 — 별도 논의" |
| 상단 제목 바 편 요청도 맞지 않음 — **v0.11 매뉴얼에서 삭제**(규칙은 그대로, 요청 시 제작자가 안내) | V2 prompt:18 "영상 상단 고정 제목·장면명·설명 … 넣지 마" |
| 끝 크레딧 제거 불가 | config/layout-rules.md:58; config/production-defaults.md:13 |
| 기사→구성안 자동 생성 약속 안 함 | INT-5833 본문 "기사→구성안 자동 생성 기능을 새로 만드는 요청으로 확대하지 않고"; v0.11 매뉴얼 2장 결과 "평소 제작을 음성 직전에 멈추고" |
| "자막 크게"는 제작 지시로 안 바뀜 (v0.11 10장 주의 "기본 제작 지시로 바뀌지 않습니다") | P/reference/global-defaults.md:25 |

## 4. 불일치·확인 필요 (스킬 수정하지 않음 — 보고만)

| # | 구분 | 내용 | 근거 | 매뉴얼 처리 |
|---|---|---|---|---|
| D1 | 불일치 | 기본 보이스: `narration.md`는 "기본값으로 특정 보이스를 가정하지 않는다"인데 config·전역 기본값 절차는 `narration.voice`(Sanghyun)를 새 편 기본 보이스로 둔다 | I/reference/narration.md:27 vs config/production-defaults.md:11, P/reference/global-defaults.md:18 | 9장은 global-defaults 기준으로 씀. narration.md 문구 정리 필요 |
| D2 | 불일치(약속 대비) | #5 숫자 낭독은 승인 회신에서 "기본값 반영" 항목인데, 스킬에는 편별 치환표(substitutions)만 있고 공통 숫자 읽기 규칙·전역 발음 사전이 없다 — 제작자 판단에 의존 | 승인 회신 #5; I/reference/narration.md:17-23 | v0.11: 6장 주의 "다시 만든 음성은 직접 들어 확인 / 그 편에만 적용", 10장 표 숫자 읽기 → 6장. "공통 발음 사전 없음" 문장은 압축으로 삭제 |
| D3 | 확인 필요 | 매뉴얼은 Claude 데스크톱 **Code 탭** 전제인데 설치 절차는 Claude Code **CLI** 기준(`claude plugin install`). Code 탭이 같은 플러그인·스킬·검수 에이전트를 로드하는지 미확인 | README.md:23,41-51; P/reference/production-entry.md:13,25 | 0장 전제로 둠. Windows 실측 1순위 |
| D4 | 확인 필요 | 자막 가로 폭 780/756은 모바일 실측 전 잠정값, 안전영역 최종 좌표 미확정 — INT-5833 완료 조건 "최종 공용 좌표/검증 기기 안내"를 아직 충족 못 함 | config/layout-rules.md:11,19,26 | v0.11: 잠정값 문장 삭제, 10장 안전영역 행 "가림이 보이면 알려 주세요"만 남김 |
| D5 | 확인 필요 | P27(이름 설정)을 Claude가 대신 `git config` 하는 절차는 스킬에 없음 — HANI-GUIDE는 사람이 명령을 직접 치는 것으로 씀 | docs/HANI-GUIDE.md:29-36 | 부록 A에 자연어 프롬프트로 실음. 실측 필요 |
| D6 | 확인 필요 | "완성 영상 목록 열어줘"가 `videos`(file://)와 `videos:serve` 중 무엇을 쓸지 지침에 없음. file://에서는 다운로드 버튼이 브라우저에 따라 저장 대신 재생 | docs/HANI-GUIDE.md:23; docs/VIDEO-LIBRARY.md:7-9 | 8장은 결과만 기술. serve 권장 한 줄을 HANI-GUIDE에 넣을지 판단 필요 |
| D7 | 기준 차이 | INT-5833 본문의 작성 기준(b0605f3b / hook-overlay@3 / plugin 1.3.0)과 이 브랜치(3e7d18f9 / hook-overlay@4·screen-text@2·attribution@2 / plugin 1.5.0)가 다름 | INT-5833 본문 "최신 인계"; P/reference/production-entry.md:120 | 매뉴얼은 이 브랜치 기준. 한겨레 설치본(INT-5834)을 1.5.0에 맞춰야 매뉴얼과 일치 |
| D8 | 확인 필요 | 이 맥의 설치 플러그인이 레포보다 낡아 있었음(조사 시점 1.0.0). 설치본 버전이 낡으면 매뉴얼의 멈춤·공용 음원·기본값 경로가 안 뜸 | control-map 보고서 (5); P/reference/production-entry.md:116 | 실측 전 `doctor --installed`로 1.5.1 확인(v0.10 기준) |

## 5. 산출물 생성 방법

- HTML: `docs/manual/HANI-MANUAL.md`에서 단일 HTML로 변환(v0.9와 같은 인라인 CSS·복사 버튼·A4 인쇄 스타일, 장 번호 배지·단계 칩). 변환 스크립트는 작업 세션 임시 폴더에 있었고 저장소에 넣지 않았다 — md를 고치면 HTML도 같이 고친다.
- PDF: HTML을 로컬 headless Chrome `--print-to-pdf --no-pdf-header-footer`로 인쇄(v0.10: A4 15쪽 → v0.11: A4 8쪽, 인쇄 CSS의 강제 쪽나눔으로 장이 쪽 중간에서 잘리지 않음). 영상 렌더 아님. 저장소 관례(추적 PDF 없음·LFS 규칙 없음)에 따라 **커밋하지 않고** 전달용으로만 둔다.

## 6. v0.10 변경 내역 (2026-09-30)

사용자 지시 원문(2026-09-30, 그대로 보존):

> 운영 매뉴얼에서 11번은 없애고, 한겨레에서 그대로 따라할 수 있는 수준으로 작성해줘. 예를 들어, 0 시작 전에에서 1. 반드시 code 탭에서 요청합니다. claude 앱 -> 상단 code -> local -> 숏폼 제작 폴더(shortform-liveacation) 과 같이. 그리고 현재 내용이 충돌되거나 분산되는 등 명확하지 않은 부분을 수정해. 예를 들어, 5 배경음악에서 이럴때 1에 음원 관련내용인데 알아서 라이선스는 신경쓰시겠지. 우리가 되묻지 않게하고, 끝 크레딧 문구도 넣지마. 음원 파일 명으로 끝 크레딧에 들어가게 설정하고 매뉴얼에 설명을 넣어줘. 라이선스나 끝 크레딧, 사용범위까지 언급되어 있어. 이 음원 공용 음원 폴더에 넣어줘. 만 들어가도 될 거잖아.

### 6-1. 삭제

| # | 삭제한 것 | 옮긴 곳 |
|---|---|---|
| X1 | 11장 "인텔리이펙트에 요청할 것" 전체 | 디자인 변경 불가 → 3·7·9장 주의 각 한 줄 / 모든 영상 자동 기능 5종 "별도 논의"(INT-5814 승인 회신 경계) → 4장 주의 한 줄 / 상단 고정 제목 불가 → 4장 주의 한 줄 |
| X2 | 목차·3·4·9장의 "11장" 교차 참조 4곳 | 해당 장 안의 설명으로 대체 |
| X3 | 5장 입력 문장의 `라이선스: …, 끝 크레딧: …, 사용 범위: …` | 한 문장 `이 음원 공용 음원 폴더에 넣어줘` (부록 B도 같게) |
| X4 | 5장 주의 "라이선스는 반드시 적어 주세요 / 없으면 되묻습니다", "끝 크레딧 문구를 안 적으면 되묻습니다" | "라이선스·사용 범위 확인은 한겨레가 맡습니다" 한 줄 |
| X5 | 0장 "꼭 지킬 네 가지" 1번(Code 탭) | 0장 "요청 화면 열기" 클릭 경로 1~6단계로 확장 → 나머지 세 가지만 남김 |

### 6-2. 추가 (따라 할 수 있게)

| # | 추가한 것 | 위치 |
|---|---|---|
| A1 | Claude 앱 → Code 탭 → Local → 폴더 shortform-news-liveaction → worktree 끔 → Enter 클릭 경로, 확인 창 "허용" 안내 | 0장 |
| A2 | 음원 첨부 경로(입력창에 끌어다 놓기 / + → 파일 첨부 / 주소 붙이기) | 5장 ① |
| A3 | "파일 이름 = 끝 크레딧 음악 줄" 설명과 예시, 사용 불가 기호 | 5장 첫머리·7장 |
| A4 | 완성 영상 목록 여는 클릭 경로(파일 탐색기 → 폴더 → out → videos.html) + 새로고침 | 8장 ③ |
| A5 | 백업할 폴더 표(out/pilots, library/music/files)와 탐색기 경로 | 8장 주의 |
| A6 | API 키 등록.cmd·환경 점검.cmd 탐색기 경로, "Local 아님"·"worktree 켬" 막힘 두 줄 | 부록 A |
| A7 | 10장 표에 "고칠 때" 열(3·6·7장 참조) | 10장 |

### 6-3. 병합·충돌 정리

| # | 주제 | v0.9 상태 | v0.10 |
|---|---|---|---|
| M1 | 백업 | 5장·8장에 각각 "이 컴퓨터에만" 경고 | 8장 한 곳(백업 폴더 표), 5장은 "백업은 8장" |
| M2 | 끝 크레딧 규칙 | 7장 본문 + 10장 표 + 5장(음악 줄)에 분산 | 7장을 기준으로 명시("이 장이 기준"), 5·10장은 7장 참조 |
| M3 | 같은 URL 재요청 | 0장 3번과 1장 주의에 중복 | 0장만 남김 |
| M4 | 숫자 읽기 한계 | 6장·10장 주의 둘 다 "틀리면 6장" | 10장 표 "고칠 때 6장"으로, 주의는 한 줄 |
| M5 | 완성 영상 목록 | 0장 표 "8장", 8장에 "열어줘"만 | 8장 ③에 여는 법 모음, 0장은 참조 |
| M6 | 2장 표 "배경음악 후보·예상 분량" 빈 칸 | 한 행에 두 항목, 내용 비어 있음 | 두 행으로 나눠 내용 채움(production-entry.md:64 기준) |
| M7 | 5장 "이럴 때 ③"에 배경음악 교체와 음량 조절이 섞임 | 한 항목 | ③ 이 편에 쓰기 / ④ 음량으로 분리 |
| M8 | 8장 제목·이럴 때가 확정·되돌리기뿐인데 "목록 열기"가 섞임 | 입력 3개 한 덩어리 | 제목 "확정·되돌리기·완성 영상 보기", 이럴 때 ①②③으로 분리 |
| M9 | 9장 "자막 크게 → 11장", 공용 음원이 기본값인지 모호 | 11장 참조 | 바꿀 수 있는 기본값 = 보이스·제작 지시로 명시, 공용 음원은 5장 |
| M10 | 1장 자동 확정 | 8장 주의에만 | 1장 결과에 한 줄(8장 참조) |

### 6-4. 공용 음원 흐름 변경 (코드 — plugin 1.5.0 → 1.5.1)

| 단계 | 입력 | 결과 |
|---|---|---|
| 넣기 | 파일 첨부/주소 + `이 음원 공용 음원 폴더에 넣어줘` | `music add <파일|URL>` — 라이선스 없어도 거절·경고 없음. catalog.json에 id·파일·출처(보유/URL)·sha256·bytes·추가일 자동 기록, license·usage_scope는 선택 필드(null). 출력 "끝 크레딧 음악 줄: <파일 이름>". catalog.json만 자동 커밋 |
| 목록 | `공용 음원 목록 보여줘` | 표: id · 파일 이름(=끝 크레딧 음악 줄) · 출처 · 추가일 · 라이선스(미기재) · 파일 있음 |
| 쓰기 | `<URL> 편 배경음악으로 공용 음원 폴더의 '<파일 이름>' 써줘` | `music use` — bgm 복사, audio.json `bgm.credit`=파일 이름(확장자 제외), RIGHTS.md 절(라이선스 "미기재" 허용, "라이선스 확인은 넣은 쪽 책임" 문구), visual-system 끝 크레딧 "음악" 줄=파일 이름 |

- `--credit` 옵션 제거. `--license`·`--usage`는 사용자가 스스로 적었을 때만 쓰는 선택값.
- `checkLibrary`·`trackErrors`는 license를 필수로 보지 않는다.
- 수정 파일: scripts/music.mjs, scripts/lib/music-library.mjs, tests/test-music-library.mjs, library/music/README.md, I/reference/music-library.md, P/reference/commands.md:98, plugin/agents/sourcing.md:52, plugin/.claude-plugin/plugin.json(1.5.1).
- 해소(2026-09-30 사용자 결정 "5 진행"): `scripts/endcard-credits.mjs`(`npm run credits`)는 공용 음원(`bgm.asset = "library:…"`)이면 `audio.bgm.credit`(파일 이름)을 접두어 없이 그대로 쓴다. 공용 음원이 아닌 기존 편은 예전대로 `Music: ` 접두 — 확정본 소급 변경 없음. 증거: `tests/test-music-library.mjs` "npm run credits" 테스트.

## 7. Windows 실측 시 확인 — 앱 메뉴 명칭

공식 문서(code.claude.com/docs/en/desktop, 2026-09-30 조회)로 확인한 명칭: 상단 탭 **Chat / Cowork / Code**, 환경 **Local**·Cloud, 입력창 **+** 버튼(파일 첨부), 입력창에 끌어다 놓기, 사이드바 **+ New session**, 파일 우클릭 **Show in Explorer**, 권한 모드 이름(Manual·Accept edits·Plan·Auto·Bypass permissions), 브랜치 옆 **worktree** 선택.

| # | 매뉴얼 표기 | 확인 못 한 점 |
|---|---|---|
| U1 | 0장 2(v0.10의 3): "입력창 아래의 실행 위치에서 Local" | 문서는 "prompt area의 Environment 드롭다운"이라고만 함. 한국어 UI 표기·정확한 위치 |
| U2 | 0장 3(v0.10의 4): "폴더 선택 → 다른 폴더 열기" | 문서는 "Project folder: select the folder"만 기술. 폴더 선택 버튼·"다른 폴더 열기" 메뉴의 실제 이름 |
| U3 | 0장 4(v0.10의 5): "worktree 선택이 있으면 켜지 않음" | 문서상 Git 저장소에서 브랜치 이름 옆 옵션. 기본값(꺼짐/켜짐)과 한국어 표기 |
| U4 | 0장 5 확인 창 "허용" | 권한 확인 창 버튼 이름, 제작에 맞는 기본 권한 모드(매뉴얼은 모드를 지정하지 않음) |
| U5 | 5장 "+ → 파일 첨부" | + 메뉴 안의 첨부 항목 이름. 음원(mp3·wav) 첨부가 허용되는지, 첨부 파일 경로를 Claude가 music add에 넘길 수 있는지 |
| U6 | ~~부록 A "Claude 앱 설정의 커넥터"~~ (v0.11 부록 A에서 Higgsfield 행 삭제 — 실측 목록에는 남김) | 데스크톱 앱에서 Higgsfield 커넥터 연결 메뉴 경로 |
| U7 | 0장 3·8장·부록 A·B 폴더 이름 `shortform-news-liveaction` | README에 clone 명령·설치 위치가 명시돼 있지 않음 — 저장소 이름(origin `intellieffect/shortform-news-liveaction`)의 기본 clone 폴더명으로 적음. 한겨레 PC의 실제 폴더 이름·위치 |
| U8 | 부록 A "worktree 켠 채 요청 → 목록에 안 보임" | 추정(확정 커밋이 main이 아닌 작업 복사본 브랜치에 쌓임). 실측 필요 |

## 8. v0.11 압축 내역 (2026-09-30)

사용자 지시 원문(2026-09-30, 그대로 보존):

> 한겨레 운영 매뉴얼에 불필요하거나 지나치게 설명적인 텍스트는 걷어내고 전달하기 좋은 장수로 만들어봐

원칙: 각 장 = 이럴 때 → 입력 → 결과 한두 줄 → 주의 최대 1개. 의미를 바꾸는 새 약속은 추가하지 않음(기존 문장 삭제·병합만).

### 8-1. 분량

| | v0.10 | v0.11 |
|---|---|---|
| PDF | A4 15쪽 | A4 8쪽 (1 표지+목차 · 2 0·1장 · 3 2·3장 · 4 4·5장 · 5 6·7장 · 6 8·9장 · 7 10장·부록 A · 8 부록 B) |
| 본문 글자 수(공백 제외, md) | 8,252 | 4,742 (−43%) |
| 복사용 프롬프트(부록 B 제외) | 28 | 24 |
| 인쇄 본문 크기 | 11pt | 10.5pt (표 10pt) |

장별 글자 수(공백 제외, 대략): 표지 236→119 · 0장 765→426 · 1장 432→231 · 2장 585→274 · 3장 533→264 · 4장 549→308 · 5장 971→427 · 6장 404→260 · 7장 460→186 · 8장 787→378 · 9장 565→273 · 10장 509→326 · 부록 A 634→299 · 부록 B 822→971(시작 경로·묶음 머리 추가).

### 8-2. 삭제

| # | 삭제한 것 | 이유 |
|---|---|---|
| C1 | 표지 "대상 설치본(플러그인 1.5.1)", 표지 안내 중 "명령어는 몰라도 됩니다·각 장은 … 순서" | 내부 버전·반복 설명. 버전은 이 문서 §4 D8에 남음 |
| C2 | 0장 괄호 설명(Cloud 이유, worktree 이유), "이미 연 대화 이어 쓰기" | 이유 설명 |
| C3 | 1장 "긴 지시문 필요 없음", 단계 나열(기사 확인 → … → 완성본), "10장 기본 항목 자동", 주의 "시간·크레딧 사용" | 반복·배경 |
| C4 | 2장 보여 주는 것 표(5행) → 결과 한 줄로, 주의 "멈춤 조건 없으면 끝까지"·"구성안 자동 생성 기능 아님" | 표→문장, 경계는 결과 문장("평소 제작을 음성 직전에 멈추고")에 흡수 |
| C5 | 2장 프롬프트 P06(원고 문장 고치고 다시 보여줘) | 중복 프롬프트 — 대표 2개(P04·P05) |
| C6 | 3장 비교 표 "언제" 행, 주의 "후킹 한 번만"·"디자인은 안 바뀜" | 주의 1개로 제한. 디자인 경계는 10장 주의 |
| C7 | 4장 프롬프트 P11(막대 비교 도식), 주의 "알맞은 자료 없으면 알려 줌"·"상단 고정 제목 불가" | 중복 프롬프트·과도한 주의 |
| C8 | 5장 도입 "직접 복사하지 말고", 사용 불가 기호 안내, 목록 결과 설명, 주의 "표기 바꾸려면 다시 넣기"·"일부 이름이면 되물음"·"이 컴퓨터에만(8장)" | 구현 설명·과도한 주의 |
| C9 | 6장 "표기와 읽는 말을 따로 관리" 설명, "공통 발음 사전 없음" | 이유 설명 |
| C10 | 7장 "이 장이 기준" 문장, 프롬프트 P19(출처 대조), 컷 출처 표시 규칙 설명, 주의 "원자료 표기 그대로"·"디자인 안 바뀜" | 중복 프롬프트·내부 규칙 |
| C11 | 8장 목록 기능 표(4행) → 한 문장, 주의 "자동 확정" | 1장 결과와 반복 |
| C12 | 9장 결과 "기본값 표 항목 나열·새 버전 기록", 주의 "Typecast 계정별 보이스·.env 안내"·"바꿀 수 있는 것은 보이스와 지시 문장"·"공용 음원은 5장" | 내부 구현·과도한 주의 |
| C13 | 10장 "확인하는 법" 열, 확인 결과 설명, 주의 "숫자 읽기 드물게 틀림"·"자막 폭 잠정값" | 반복(6장 주의)·내부 수치 |
| C14 | 부록 A 7행 → 4행: "창이 작업 표시줄 뒤에 숨음"·"Higgsfield 연결"·"자동 저장 멈춤(이름 설정, P27)" 삭제, "원인" 열 삭제 | 설치 직후 1회성 — 실제로 자주 막히는 4개만 |

### 8-3. 병합·강화

| # | 내용 |
|---|---|
| G1 | 0장 클릭 경로 6단계 → 5단계(Enter와 "허용"을 한 단계로), "편을 가리키는 법"을 "꼭 지킬 네 가지" 3번으로 병합 |
| G2 | 5장 "이럴 때 ①~④" 네 머리 → 한 입력 묶음(첨부 한 문장 + 프롬프트 4개). "파일 이름이 끝 크레딧에 그대로" 안내는 장 첫머리 굵은 글씨로 유지 |
| G3 | 8장 "방법 A/B" → 프롬프트 + "Claude 없이 보려면" 한 줄. 백업 표 → 주의 한 문장(폴더 두 곳 유지) |
| G4 | 부록 B: 맨 위에 0장 시작 경로 한 줄, 표를 만들기·고치기·음악·확정·보기·기본값·막힐 때로 묶고, 음악 묶음 머리에 "파일 이름 = 끝 크레딧 음악 줄", 기본값 묶음 머리에 "새 영상부터, 기존 영상 소급 없음"을 넣음. 삭제된 프롬프트(P06·P11·P19·P27)는 B에서도 뺌 |
| G5 | 인쇄 CSS: 표지+목차 1쪽, 장 짝(0·1 / 2·3 / 4·5 / 6·7 / 8·9 / 10·A)마다 강제 쪽나눔, 카드 안 잘림, 부록 B 단독 1쪽 |

### 8-4. 그대로 둔 경계

- INT-5814 승인 회신 범위: 4장 주의 한 줄("모든 영상에 자동 적용하는 기능은 아직 없습니다(별도 논의 항목)").
- 기본값 비소급: 9장 주의 + 부록 B 기본값 묶음 머리.
- 음원 라이선스 확인 주체: 5장 주의.
- 끝 크레딧 제거 불가: 7장 주의.
