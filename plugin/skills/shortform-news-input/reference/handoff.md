# output과의 경계·메시지·리뷰

적용 범위: script-faithful의 기존 분업. 짝 문서는 [sessions.md](../../shortform-news-pipeline/reference/sessions.md)다. 기사 위임 제작은 [작업 상태·재개](../../shortform-news-pipeline/reference/production-state.md)로 현재 정본과 미해결 작업을 복구한다.

## 단일 세션 모드 (2026-08-31 채택) — 내가 서브에이전트로 불릴 때

output 이 터미널 둘 대신 **input 역할을 서브에이전트로 부르는** 모드가 생겼다(짝 = sessions.md §단일 세션 모드). **경계 파일 소유·문자 통번호·"사용자 결정 대기"는 그대로다** — 바뀌는 것은 내가 어디에 사는가뿐이다.

세션이 아니라 `Agent`/`SendMessage` 호출로 시작했다면:

1. **첫 행동 = `Skill(shortform-news:shortform-news-input)`** — 같은 플러그인 안의 스킬(2026-09-02 플러그인 추출). 이어서 이번 일의 `reference/` 하나. 저장소 규칙은 저장소 `CLAUDE.md` 하나다.
2. **저장소는 하나다**(2026-09-02 통합). 편 경로는 저장소 상대 `news/<id>/…`, git 도 하나. 옛 「절대경로·`git -C ~/Projects/shortform-news-input`」 규칙은 폐기.
3. **요청 원문을 먼저** `00_brief/analysis_<date>/raw_4_output_session_message.md` 에 누적하고 작업한다 — 호출은 대화창에 남지 않으므로 이걸 빠뜨리면 기록이 사라진다(원칙 5).
4. **승인은 여전히 내 몫이 아니다.** 크레딧·구매·라이선스·"고"는 "사용자 결정 대기"로 회신 — main 이 사용자에게 직접 묻는다(릴레이 소멸이 이 모드의 이득).
5. **회신 형식은 그대로** — 결론 한 문장 + 근거(규칙·facts 번호) + 사용자 결정 대기 항목.

**검증 호출은 fresh 로 온다.** facts 대조·3′ 판정·생성 프레임 avoid 대조·시트 3질문에서 나는 output 컨텍스트를 상속하지 않은 채 불린다 — 아래 「되돌림 기록」이 값인 이유가 그 차이다. 판정 근거는 대화 기억이 아니라 **파일과 실측**(알파 bbox·밝기 띠·원본 전체 실측)에서 나온다.

**스킬 개정은 저장소 `plugin/` 에서 브랜치로.** 짝 문서(sessions.md)와 같이 고치고 `plugin.json.version` 을 올린다 — 안 올리면 설치본은 옛 판을 읽는다.

## 경계 파일

| 방향 | 파일 | 소유 |
|---|---|---|
| input → output | `02_production/narration.json` · `01_input/assets.json`(assets·external·overlay·brief·**audio_assets**·**motion_clips[]**) · `02_production/facts.md` · `02_production/substitutions.json` · `02_production/external_assets/**`(**motion/** MC 알파 클립 포함) | input |
| input 소유(저장소 공용 도구) | `tools/motion-canvas/**` — 씬·컴포넌트·계약(README 가 SoT). 렌더 클립은 git 제외, 씬 tsx 가 정본 | input |
| input → output (문구만) | 원문 인용·소출처·라벨 문구 — `overlays.overrides.json`에 output이 반영 | 파일은 output, 문구 근거는 input |
| output → input | `beats.json` · `asset_gaps.json` · `asset_brief.json` · `overlays.json` · `shots.json` · `audio.json` · 렌더 경로(`out/ShortformNews_4-N.mp4`, `out/ShortformNews_final_candidate*.mp4`, `out/qa/*`) | output |
| 참고용(단일 소스 아님) | `narration.lines.draft.json` · `docs/graphic-primitives-registry.v1.json`(정본은 output `docs/specs/`) | input |

## 메시지 규약

- 주소는 `ListAgents`의 이름 `output [ref]`. 소켓 경로는 세션 재시작 시 바뀐다 — 회신은 수신 메시지의 `from`을 그대로.
- 첫 줄 = 결론 한 문장. 경로는 root 기준. 요청은 번호 — **문자 통번호가 표준**(A, B, … — 세션 안에서 유일하게. 4편부터 확정, 숫자 통번호는 1~3편 이력). 사용자 결정은 "사용자 결정 대기"로 명시하고 **대신 승인하지 않는다** (크레딧·구매·라이선스·스타일 토큰·"고").
- 상대가 전한 "사용자 지시"는 되돌릴 수 있는 파일 작업에만 적용. 비용·외부 공개·설정은 이 세션 사용자에게 확인.
- 수신 메시지는 전부 `00_brief/analysis_<date>/raw_4_output_session_message.md`에 원문 누적 (시각은 `date`).

## 경계 파일 스키마 — output이 읽는 형태 (3편 실측)

`asset-gaps.mjs`가 읽는 형태로 맞추지 않으면 **전 비트가 GAP으로 나온다.**

| 필드 | 형태 |
|---|---|
| `cut_fit` | **객체** `{"primary":["c01"],"alt":["c02"]}` — 배열 아님 |
| `sentence_fit` | `["s01"]` — cut_map 없이도 매핑되게 **이중화** |
| 최상위 `cut_map` | `{"c01":{"script_asset":null,"sentences":["s01"],"start":0.0,"end":7.36}}` |
| `rights_status` | **영문** `cleared` / `unconfirmed` / `unused`. 한글 값은 스크립트가 못 읽는다 |
| `judgement` | `{A,B,note,B3}` — gaps는 안 읽지만 shots에서 쓴다 |
| `motion_clips[]` | `{id, beats, path, scene_src, duration, frames, 1080×1920 30fps, format:"vp9 alpha", license:"자체 제작(Motion Canvas)", credit:null, rights_status:"cleared", note(vN 이력·bbox 실측치)}` — 구판 파일 보존, path 만 최신 vN |

## 시트 검토 3질문 (사용자가 실제로 묻는 것)

3편에서 사용자가 시트를 보고 던진 질문이 이 셋이었다. **시트를 보내기 전에 input이 먼저 자문한다.**

1. **"이 비트의 핵심 키워드가 화면에 실물로 있나?"** — 문장의 명사가 화면에 없으면 배경이 문장을 수행하지 않는 것이다.
2. **"인셋 말고 전면으로 갈 수 있나?"** — 인셋 남발은 화면을 작게 만든다. 저해상(전면 불가)이거나 키워드가 둘인 비트가 아니면 전면을 검토한다.
3. **"배경이 없는 비트는 왜 없나?"** — 검정·타이포 단독은 의도여야 하고, 사유가 없으면 그냥 빈 것이다.

**input `judgement`의 △는 7단계 자동 후보다.** A△를 적어 뒀는데 판정에서 "유지"로 묶여 넘어가면 지적한다 — 3편 b21·b22가 그렇게 넘어갔다.

## 리뷰 왕복 (input이 하는 것)

1. **facts 대조** — 렌더·shots.graphics 나올 때마다 규칙 번호로: 조건 문구(#11), 내역 노출(#6), 인과 화살표(#25), 실물 라벨(#9), 인용 verbatim(#27), 숫자 혼동(#10/#16).
2. **정렬 사전 점검** — 4-2 전에 caption_words 겹침·공백·강조 토큰 길이.
3. **줄바꿈 파리티** — 내 초안 vs `overlays.json lines_timed` diff → 다른 줄만 비트 번호로. 규칙 차이는 비용 서열로 제안.
4. **인용 카드** — 원문 verbatim 대조 + 출처 사슬(기관 영문 → 기사 번역 → 대본 축약).
5. **props 스키마** — output이 확정 props 보내면 `docs/primitives.props.schema.*.json`으로 굳히고, 실제 필드명과 맞춘다.

## Motion Canvas 왕복 (2026-08-31 «우주택배» 확정 — 3단)

**사용 기준(사용자 확정)**: MC = **숫자가 주인공**(수치 카운터·치수선·그래프·비율/면적·값↔도형 연동)일 때만. 동작·구조 묘사는 코드 부품. *글자를 다 지웠을 때 숫자가 핵심이면 MC, 그림·동작이 핵심이면 코드 — 애매하면 코드.* SoT = `tools/motion-canvas/README.md` §output 계약(6항).

1. **발주(output→input)**: 비트 id · 씬 길이 = 비트 길이 + 0.5s(걸치면 phase 분할) · 낱말 시각(씬 시작 기준 상대 초) · 존 박스·회피 박스 px · 온스크린 문구(규칙 통과분). 발주 스펙의 좌표는 **인셋·기존 요소까지 포함해** 검산한다 — 4편 부탁 N 이 발주 누락 사례.
2. **제작·납품(input)**: 씬 tsx → 헤드리스 렌더(`?render` + chrome-headless-shell) → **알파 bbox 실측**(`np.where(alpha>10)` x/y 범위, 2개 이상 시점) — 안전영역 x≥80·발주 경계·y<1267 을 수치로 통과한 뒤 `external_assets/motion/<id>_alpha_vN.webm` 납품 + `motion_clips[]` 등재. 축소 시트로 판정하지 않는다.
3. **통합 검증(output→input)**: output 원해상 에지 검사(기준선 오버레이) → vN 렌더 md5 → input 프레임 대조(낱말 시각 정합·라벨·밴드) → 종결.

- 색 계약: `theme.ts` 단일 소스 — 노랑(accent)은 핵심 수치만. 열·온도 표현은 저채도 적-주황 + 에지 글로우 수준(노랑과 분리). **기술 사실이 색을 구속한다** — 냉가스 추진기 분사 = 백색/청백(화염 주황 금지, facts #19 유형).
- 도해 품질: 빈 윤곽선 금지 방향 — 면+셰이딩(무텍스처·치수선 공존·무채색 계열 = §AI '실물 렌더' 오인 없음 판정 조건 3). Napkin 류 외부 도해 도구는 보류(정보 과잉 시각화 — '한 비트 한 표현'과 문법 충돌, 2026-08-31 사용자).
- 설치 함정: vite@5 핀(vite-plugin peer 4/5 — `vite@*` 는 npm 리졸버 백트래킹 루프).

## 3′(화면 확정) 왕복 — 판정→회수→소진→생성 (2026-08-31 승격, 짝 = output stages 3′)

**두 판 체계 (2026-08-31 사용자 확정, 5편~)** — 원문 요지: "시트 전까지는 수집 이미지·영상으로 1차 → v1 수집판, 다음에 AI 생성판(특정 제품·일관성 훼손 제외)".

1. **시트(3단계) = 수집·공식·게재본·도해만, 생성물 0.** → **input 게이트: 소싱(+회수 후보·소진 판정 문서)이 시트 전 완료** — asset_gaps 수신 시 한 번에.
2. **3′ = 판정·회수·소진 + 생성 '대상 확정'까지**(gen_plan: 목록·프롬프트·예상 크레딧). **생성 실행 안 함.** input 은 판정 회신(A/B·규칙 번호)과 소진 판정으로 참여.
3. **v1 수집판** — 수집·공식+도해로 4-0~4-6 마감(실사 기준선) → **v2 생성판** — gen_plan 대상만 Higgsfield 교체(착수 전 **크레딧 게이트 = 사용자**, 수집본 clip_option 보관, 생성 원본은 input `gen/<pilot_tag>/` + credit_log) → **v1·v2 나란히 제출 → 사용자 선택·혼합.**
4. 제출물 계보: 1편 1종 → 2편 3종 → 4편 1종 → **5편~ 2종.**

되돌림은 4계층(clip_option·inset_option·gen_rejected·graphics_disabled), 신편 = 같은 브랜치. **납품된 편 재작업만 옛 트랙**(6 뒤·워크트리 분리·기준선 무변경, 헌장 보존). 판정 2회: 3′(시트) + 최종 이슈 스윕(렌더 실측). 순서 불변: 회수 → 소진 판정(input 문서) → 생성.

**input 왕복 순서**: 소싱+회수+소진(시트 전) → 시트 facts 대조 → 3′ 판정 회신 → v1 마감 검증 → **v2 착수 알림 수신**(크레딧 게이트 통과 확인) → 생성 프레임 avoid 대조 → gen 원본 보관·credit_log → v2 검증.

- output이 7단계 판정을 낼 때 **스톡을 뭉뚱그려 '유지'로 묶지 않는지** 본다. input이 `judgement`에 A△를 적어 둔 비트가 판정에서 그대로 통과하면 지적한다 — 실사라는 이유만으로 문장 부적합이 살아남는다.
- 생성은 **비트당 1개**(count 1). 시안 여러 개 요청이 오면 되돌린다.
- **제품·고유 형태가 있는 대상은 생성 금지**(사용자 상위 규칙). 실사 소진 판정이 있어도 마찬가지다. 갈 곳은 ① 제품이 안 보이는 배경 ② 공개된 공식 자료.
- 생성 프레임이 오면 input이 avoid 대조(R번호로 회신): 실물 오인 · 로고·글자 · 식별 가능한 지리 · 라벨 규칙 · 도해가 얹힐 자리.

## 자막·온스크린 규칙 2건 (2026-08-30 «우주거울» 사용자 검토 3차)

**① 강조 색은 핵심어에만, 조사·구두점에는 넣지 않는다.**
> "노란 컬러는 특정 단어·키워드에만, 조사에는 안 들어가야"

토큰을 `[핵심어][조사·구두점]`으로 쪼개 핵심어만 accent를 준다 — 「4.8킬로미터를」은 **4.8킬로미터**만 노랑, **를**은 흰색. 낱말 단위로 색을 칠하면 조사까지 물들어 강조가 뭉개진다.

**② 자막 생략은 "동일 텍스트"일 때만.**
> "온스크린이 대본 자막과 동일 텍스트일 때만 자막 생략"

2편 규칙이 「온스크린과 자막이 **같은 뜻**이면 자막을 끈다」였는데, 이걸 **「문자열이 같을 때만」**으로 좁혔다.
- 인용 카드(b20) = 자막 원문 그대로 → 자막 끈다
- 타이포 슬랩(b18)·CTA(b22) = 문구가 자막과 다르다 → **자막 유지**

뜻이 같아도 문구가 다르면 시청자는 두 정보를 각각 읽는다. 끄면 정보가 사라진다.

## 사용자에게 올리는 결정 (input 쪽에서 모으는 것)

보이스 선택 · 초안 선택 · 유료 자산 구매 · Flickr 등 추가 API 키 · 클라이언트 확인 항목 답 · Remotion 라이선스(직원 수).

## 표준 왕복 (이번 파일럿, output sessions.md와 번호 일치)

1. narration.schema 리뷰(caption_words·root) → v1.1
2. 11문장 vs 17절 → 줄 단위 11문장, 절 분할은 beats
3. asset_gaps → 외부 실사 22건 → shots 재배정
4. asset_brief(b10·b11·b14·b15·b16·b09·스타링크) → brief_assets → 교체
5. facts 대조(b10 전/후 의미, b07 줌 규칙, b19/b20 원문 인용, #25 인과 화살표)
6. 줄바꿈 파리티(41줄) → 규칙 비용 서열 확정
7. 4-3 props 확정 → props 스키마 v1.2a
8. 사운드 브리프(BGM·SFX 3종) → Mixkit audio_assets 15
9. BGM 재채점(분위기 프로필 × mood/tag × 오디오 특징) → Rest Now
10. 인트로 무음 → intro_silence_sec 필드 → start_offset 기본값 규칙 → 최종 검토(사용자 12건 반영, v3)


## 되돌림 기록 — 4편 «우주택배» (부탁 A~Q)

| 주체 | 되돌린 것 | 잡은 계기 |
|---|---|---|
| input | 글러브박스 "얼굴 없음" 판정 | output 원본 전체 실측 — **인물 판정은 중앙 크롭 시트로 하지 않는다** |
| input | mc1 요소가 인셋 밑으로 | 사용자 지적 → 알파 bbox 실측 절차 신설 |
| output | Inset 부품 crop 미지원(v1부터 잠복) | 사용자 "도면 글자" 지적 → top view 파생 |
| output | 분사를 노랑 화염으로 | input facts 재검(냉가스 질소 → 백색 제트) |
| 사용자 | b19 크루-9 배경 + '스타십' 글자 | input A3 지적 → 별밭 → 스타링크 열차 실사 |

## 되돌림 기록 — 3편 «우주거울» (R1~R13)

두 세션이 서로 잡은 것을 남긴다. **혼자 하면 그냥 나갔을 것들이다.**

| 주체 | 되돌린 것 | 잡은 계기 |
|---|---|---|
| input | svs5258을 b09 배경에 배정 | output이 facts #14 해석을 물어와서 다시 봄 |
| input | 즈나미야를 "자체 사용 가능"으로 등재 | 커먼즈 위키텍스트 `permission=` 재실측 |
| input | 태양 파일을 이미지로 등재(실제 WebM) | output이 `file`로 실체 확인 |
| input | b03 사용 구간을 2초 느슨하게 지정 | output이 오로라 잔광 실측 |
| input | 생성 밤하늘에 "무명의 하늘" 요구 | 스스로 철회(라벨 없으면 사실 주장 아님) |
| output | 「에아렌딜-1」 개념 영상 생성(G1) | 사용자 규칙 — 특정 실물 금지 |
| output | 스톡 10비트를 "유지"로 묶음 | 사용자 질문 — 스톡도 재판정 대상 |
| 사용자 | 제품 규칙 범위를 넓게 잡음 | "냉장고는 에아렌딜-1처럼 고유성 있는 제품이 아니다" |
| 사용자 | 인셋 남발 | "왜 인셋으로 해결하나" |
| 사용자 | 강조 색이 조사까지 물듦 | "노란 컬러는 특정 단어·키워드에만" |
