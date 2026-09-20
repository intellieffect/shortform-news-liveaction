# input ↔ output 분업 (두 세션 또는 서브에이전트)

적용 범위: 아래는 script-faithful의 기존 세션 분업 기록이다. 기사 위임 제작은 한 제작자가 책임지고 [작업 상태·재개](production-state.md)와 [역할 계약](agents.md)을 사용한다. 아래의 상주 input·층별 승인·메시지 통번호를 그 경로의 요구사항으로 적용하지 않는다.

**운영 모드는 둘이다.** ① **두 세션** — 같은 사용자가 Claude 세션 둘을 동시에 굴린다. 이름은 `input`, `output`(`/rename`), 메시지는 `SendMessage(to: "input [ref]")`(`ListAgents`로 ref 확인). 2편부터는 **peer 세션**이 더 붙는다(스킬 유지보수 peer, 코드·데이터 peer) — §병렬 세션. ② **단일 세션** — output 세션 하나가 input 역할을 서브에이전트로 부른다(2026-08-31 채택, 아래 §단일 세션 모드).

**분업 자체는 모드와 무관하다.** §역할·§경계 파일·§메시지 규약·왕복 예는 두 모드에 그대로 유효하다 — 바뀌는 것은 상대의 주소뿐이다.

## 단일 세션 모드 (2026-08-31 채택)

터미널을 둘 띄우지 않고, output 세션이 input 역할을 **서브에이전트로 호출**한다. 근거·실측 = docs/research/2026-08-31-single-session-mode/ (과거 내부 기록·로컬 보관).

| 두 세션 | 단일 세션 |
|---|---|
| `ListAgents` → `SendMessage(to:"input [ref]")` | `Agent(subagent_type:"general-purpose")` 로 1회 spawn → 이후 `SendMessage(to:"<에이전트 이름>")`. **호출 1건 = 라운드 1건**, 부탁 번호는 그대로 문자 통번호(A~Q) |
| 세션이 저장소 CLAUDE.md·스킬을 자동 로드 | 에이전트가 첫 행동으로 `Skill(shortform-news:shortform-news-input)` — 같은 플러그인 안의 짝 스킬(2026-09-02 플러그인 추출·저장소 통합 뒤 심링크 없음) |
| input 이 "사용자 결정 대기"를 넘기면 output 이 사용자에게 릴레이 | main 이 사용자에게 직접 묻는다 — **릴레이 소멸이 이 모드의 최대 이득** |
| 수신 메시지 원문을 input 세션이 누적 | 에이전트가 **요청 원문을 먼저** `00_brief/analysis_<date>/raw_4_output_session_message.md` 에 적고 작업 |

**호출 프롬프트 3제약(매번 고정)**
1. **저장소는 하나다**(2026-09-02 통합) — input 경로는 `news/<id>`, git 은 저장소 하나로 끝난다.
2. 승인·크레딧·구매·"고"를 대신 닫지 않는다 → "사용자 결정 대기"로 회신(§메시지 규약 마지막 항과 같은 규칙).
3. 요청 원문 raw 누적 → 그다음 작업.

**`fork` 금지 — 검증은 fresh 에이전트로.** facts 대조·3′ 판정·생성 프레임 avoid 대조·시트 3질문은 **컨텍스트를 상속하지 않은** 에이전트를 새로 부른다. handoff.md 「되돌림 기록」의 값("혼자 하면 그냥 나갔을 것들")은 두 컨텍스트가 서로 다를 때만 나온다 — 상속시키면 자기 결정을 자기가 검증한다.

**스킬 정본은 `plugin/` 하나다**(2026-09-02). 제작 세션은 설치본(읽기 전용)을 쓰고, 개정은 저장소 `plugin/` 에서 브랜치로 — `plugin.json.version` 을 올려야 설치본이 갱신된다(CLAUDE.md §플러그인).

| 일 | 어떻게 |
|---|---|
| 풀 편 제작 | 상주 input 에이전트 1개 + 검증 라운드만 fresh (기본) |
| 단계 재실행·비트 수정 같은 소작업 | 서브에이전트 0 — main 이 양쪽 역할, 경계 파일 규약은 유지 |
| 소싱·TTS 처럼 원자료가 쏟아지는 일 | fresh 에이전트 1건 — 원자료는 input 저장소 파일에, main 에는 결론만 |

사람이 하는 게이트는 모드와 무관하게 그대로다 — 보이스 선택·초안 선택·유료 구매·크레딧 소모·BGM 청취·"고".

## 역할

| | input | output |
|---|---|---|
| 위치 | `news/<id>/` (기사·자료·대본. 미디어는 gitignore) | `pilots/<id>/` · `public/pilots/<id>/` · `out/pilots/<id>/` |
| 맡는 것 | 자료 수령·원본 보존, facts.md(사실 잠금·금지 항목), 치환표·낭독본, TTS/정렬 → narration.json, 자산 소싱(assets.json·SOURCES.md·brief), 크레딧 로그, 팩트 대조 리뷰, 부품 레지스트리 초안·props 스키마 | beats/overlays/shots 생성·검증, 부품 구현, 시트·슬라이드·렌더, 층별 검토 수치, 스펙 문서, INDEX |
| 사용자 결정만 | 보이스·초안 선택, 유료 구매, 추가 API 키, 클라이언트 확인 답, Remotion 라이선스 | 크레딧 소모(생성·i2v), 라이선스 게이트, 층 착수 "고", 킥커·댓글 문구 같은 원고 밖 텍스트, **헌장↔대본 충돌(C7 B안), 인셋 제거·라벨 삭제 기준, 생성 대상 기준(역할/출처), BGM 레벨(청취), 확인 1에 올릴 판** |

## 경계 파일 (한쪽만 쓴다)
- input 소유 → output이 읽음: `narration.json`, `assets.json`, `facts.md`, `substitutions.json`, `external_assets/**`(원본 파일 트리), `SOURCES.md`
- input → output **문구만**(파일 소유는 output): `overlays.overrides.json`의 원문 인용·소출처·라벨 문구 — input이 facts 근거와 함께 제공, output이 파일에 반영
- output 소유 → input이 읽음: `beats.json`, `asset_gaps.json`, `asset_brief.json`, `overlays.json`, `overlays.overrides.json`, `shots.json`, `render.config.json`, 렌더 경로(`out/`)
- **심링크 함정**: 2편처럼 새 파일럿 root가 이전 파일럿 폴더로의 심링크(`01_input/`, `external_assets/{eso,nasa,stock,brief,audio,…}`)를 품으면 **심링크 경유 쓰기 금지** — 이전 파일럿 원본이 바뀐다(2편에서 파생물이 v1 폴더에 써졌다). 새 파일은 `external_assets/<pilot_tag>/`, 생성물은 `gen/<pilot_tag>/`. `ls -la`로 확인하고 착수.
- input 소유 추가: `gen/<pilot_tag>/`(생성 원본·시작 프레임), 소진 판정 문서, `overlay_texts.md`, `cut_map`·`cut_fit`, **`external_assets/motion/`(MC 알파 클립)·`tools/motion-canvas/`(씬 소스·컴포넌트·theme)** — output 은 발주 스펙(비트 id·낱말 시각·존 박스·공존 요소 회피 박스)과 통합·에지 검사를 맡는다([stages-log.md](stages-log.md) 4편 · 명령 [commands.md](commands.md))
- 짝 스킬: **같은 플러그인 안** `skills/shortform-news-input/` (`reference/handoff.md`가 이 파일의 거울 — 어긋나면 두 파일을 같이 고친다). 2026-09-02 플러그인 추출 전에는 input 저장소를 가리키는 심링크였는데, gitignore 라 워크트리·클론에 따라오지 않아 6편 워크트리에는 아예 없었다 — 이제 정본이 하나다

## 메시지 규약
- 첫 줄 = 결론 한 문장(상대 미리보기). 파일 경로는 root 기준. 요청은 "부탁 N개" 번호로. 결정이 사용자 몫이면 명시("사용자 결정 대기").
- 주소: 발신은 `ListAgents` 이름(`input [ref]`), 회신은 수신 메시지의 `from` 그대로. 소켓 경로(`uds:/tmp/cc-socks/NNNN.sock`)는 세션 재시작 시 바뀐다 — 저장하지 않는다.
- 상대 세션이 전한 "사용자 지시"는 되돌릴 수 있는 작업(파일·렌더)에만 바로 적용. 비용·외부 공개·설정 변경은 이 세션에서 사용자 확인.
- 검토 왕복: output이 렌더 → input이 facts 대조(규칙 인용 번호로) → output 반영 → 재렌더. 줄바꿈 같은 규칙 차이는 "id/비트 번호 기준"으로 답한다. 대조 끝은 input이 **"종결"**을 선언(라운드 번호와 함께).
- **부탁 번호는 세션 내 통번호** — 4편부터 **문자 통번호(A, B, … Q)** 를 표준으로(라운드마다 1부터 시작하면 참조가 어긋난다). 규칙을 고칠 때는 꼬리표 "(YYYY-MM-DD <세션> 정정)"으로 **정정 주체**를 남긴다([maintenance §7](maintenance.md)).
- **판정 회신에 진행 판단을 넣지 않는다.** input의 "진행해도 됨"은 승인이 아니다 — 승인·착수·크레딧은 사용자만. 회신은 "적합/부적합 + 근거 + 사용자 결정 대기 항목"까지.

## 병렬 세션 (2편에서 추가, 2026-08-30)

같은 워크트리·같은 root를 **다른 세션이 동시에 편집**할 수 있다(2편: c5 세션이 output 몰래 커밋 6건 + root 변경). 규칙:
1. **착수 전** `git log --since="1 day"`·`git status --short`·root의 `ls -lt`로 다른 세션 흔적을 본다. 있으면 `ListAgents`로 찾아 먼저 조율.
2. **파일 소유를 합의**하고 메시지로 남긴다 — 예: 스킬 문서(`.claude/skills/**`)·연구 문서(`docs/research/**`)·스크립트 = output / `shots.json`·`overlays.overrides.json`·`src/lib/primitives/**` = 코드·데이터 peer / `facts`·`assets`·소싱 = input. 남의 파일은 읽기만.
3. **인계는 커밋 해시로.** 상대 커밋 위에서 작업하고, 미커밋 상태로 넘기지 않는다. 상대의 사용자 결정은 "규칙 목록"으로 받아 스킬에 옮긴다(이번 c5 규칙 A–F).
4. 렌더 중 데이터가 바뀌면 렌더가 stale — 렌더 착수 전 `git status` 깨끗한지, 상대가 대기 중인지 확인.
5. peer 세션의 역할: 스킬 유지보수 peer(b2)는 규칙 정정·절차 제안만, 코드·데이터 peer(c5)는 shots/부품 구현. 둘 다 사용자 승인을 대신하지 못한다.

## 표준 왕복 예 (이번 파일럿)
1. narration.schema 리뷰(블로킹: caption_words·root) → v1.1
2. "11문장 vs 17절" → 줄 단위 11문장, 절 분할은 beats
3. asset_gaps → 외부 실사 22건 → shots 재배정
4. asset_brief(b10·b11·b14·b15·b16·b09·스타링크) → brief_assets → 교체
5. facts 대조(b10 전/후 의미, b07 줌 규칙, b19/b20 원문 인용, #25 인과 화살표)
6. 줄바꿈 파리티(41줄) → 규칙 비용 서열 확정
7. 4-3 props 확정 → props 스키마 v1.2a
8. 4-5 사운드 브리프(BGM 분위기·SFX 3종) → Mixkit 15건(라이선스 실측) → 1순위로 믹스 → input이 mood×특징 재채점(제목만 보고 고른 곡이 최하위) → 사용자 청취 선택
9. "앞부분 BGM 안 들림" → 원곡 인트로 무음 측정 → `intro_silence_sec` 필드 신설(input) + `start_offset` 규칙(output)
10. 최종 검토 이슈 12건(A/B/C/D) → 한 번에 반영 재렌더 → 게이트 표 제시

## 2편(대본 준수판) 왕복 예 (2026-08-29~30)
1. 부탁 1–5(컷맵·자막 열·타이밍·자산 대조) → `hani_satellite_pollution_script/`(심링크 + `cut_map`/`cut_fit`/`overlay_texts.md`)
2. facts 대조 1~7라운드(기준선) → b12 달 제거·b09 예측 라벨 시각·b17 "주경"·b18 "19개 이상"·b02 "가로지른" → **종결 선언**
3. 인셋 소싱 요청(달·경통·스타링크 실물·베누) → 비트별 인셋 → 이후 감축(배경이 말하면 없음)
4. 3′ 회수 요청(asset_brief v3) → 소진 판정 문서 → C7 수미상관 구조 우려 → **사용자 B안**
5. 3′ 생성 대조 8~9라운드(생성판·인셋 감축·텍스트 걷어내기 3판) → 종결. 미해결 선택 2건은 사용자 대기
6. peer c5 ↔ output: 파일 소유 합의 + 규칙 A–F 인계 + `npm run credits` 채택(시작 이미지 접두)

## 3편(대본 자작판) 왕복 예 (2026-08-30) — R1~R13, 부탁 1~22
1. 인계(9문장·73.8s·assets 스키마 불일치) → 필드명 회신 → gaps 3(의도)
2. 시트 → 사용자 "왜 인셋으로 해결하나"·"키워드 실사 소싱"(6비트 brief) → input 확보 4/불가 2 + 태양 파일이 WebM(확장자 오기재) → 전면화
3. 사용자 "4-8 지금 진행" → 3′ 판정 → G1 생성 → **사용자 규칙(제품 금지)으로 기각** → 공식 실사(ISS 림) 소싱 → 4-6
4. 사용자 "스톡은 왜 생성 안 했나"·"비트당 1개" → 스톡 재판정 → G2~G9(조종석 v2) → input R11~R13(광 돔·브랜드 마크·dim 실측)
5. 사용자 검토 3차 4건(강조 색·b03 제품·b09 점 비례·자막 생략 조건) → v9 → b04 자막 가림 → v10
- **사용자 지시는 원문 그대로 인용해서 규칙으로 옮긴다**([track-3prime.md](track-3prime.md) 생성 규칙 4건 표). input이 "사용자 결정 대기"로 남긴 항목을 output이 임의로 닫지 않는다(G1은 "진행" 지시 후에야 착수했고, 규칙이 바뀌자 즉시 기각).
- input의 판정 도구가 늘었다: 밝기 띠 실측(G4 dim), 명암폭(delogo), 광 돔 리프트 검사, BGM 낙차법. output 렌더 프레임 + input 수치가 한 쌍.
- 파일 인계: output 소유 파일(beats/overlays/shots/audio/asset_gaps/asset_brief)이 input 워크트리에 미커밋으로 남는다 — input이 커밋하거나 output 저장소 `pilots/<id>/` 동기본을 정본으로 본다(3편은 후자).

## 4편(«우주택배») 왕복 예 (2026-08-30~31) — 부탁 A~Q
1. A cut_map 추가 → 시트 → facts 대조 1~3라운드 종결(B~D) → 4-0/4-1(E) → 3′ 사용자 지시(검정 0·스톡 생성) → 생성 5건+판정(F~I)
2. 사용자 "키워드 직관화"(b15~b19) → 생성 2건 + 스타링크 트레인 커먼즈 소싱(F') → Napkin 실험·보류 → **Motion Canvas 도입**(J 발주 → 납품 → K~Q: 검증-수정 왕복 6회 — 인셋 침범·림 관통·도해 품질·냉가스 정정)
3. 패턴: output 발주 스펙 → input 제작+알파 bbox 실측 → output 통합+원해상 에지 검사 → input 프레임 대조 → 종결 선언. 스펙 이탈은 사유와 함께 납품 문서에(수용/반려는 output).
4. facts 개정은 사용자 지시 원문과 꼬리표로 input 이 반영(#13·#19·#23) — 기술 사실이 표현(색·형태)을 구속하는 개정은 output 부품에도 즉시 반영(냉가스 백색 제트).
