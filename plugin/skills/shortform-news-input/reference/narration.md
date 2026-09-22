# 원고 → narration.json

파일 계약은 아래 `narration.json v1.1`과 제작 저장소의 editorial 스키마를 함께 읽는다. Typecast 생성기를 선택했다면 이 스킬의 `scripts/make_narration.py`를 편별 `02_production/scripts/`에 복사한 뒤 실행 기록을 시작한다. 다른 음성·정렬 도구도 같은 결과 계약으로 연결할 수 있다.

## 기사 위임 제작에 적용할 범위

원고·보이스가 위임됐으면 제작자가 선택한다. 아래의 초안 후보와 샘플 선택은 방법이며 사용자 승인을 추가하는 조건이 아니다. 원고 수정 뒤에는 [작업 상태](../../shortform-news-pipeline/reference/production-state.md)에 새 음성과 정렬 결과를 기록한다. `--reuse`는 원고와 음성이 같은 경우의 재조립만을 뜻한다.

editorial-concept의 자막은 `narration.captions`와 공통 프로필, 타이밍은 `motion/timeline`을 사용한다. 아래 beats/overlays 분업은 script-faithful에만 적용한다.

## 1. 원고 확정

- 클라이언트 대본이 "원고 단일 소스"면 그대로. 새로 쓰면 필요한 초안을 `narration_drafts/`에서 비교한다. 기사 위임 제작의 초안 수와 채택은 제작자가 정하고, 사용자 선택을 명시한 제공 대본 경로에서만 사용자에게 선택을 받는다. 각 초안은 **facts.md 항목 안에서만** 쓴다. 인용은 원문 그대로.
- **길이 기준 = 450자/분** (Typecast 실측 2편 452 · 3편 446). 일반 낭독 기준 345자/분을 쓰면 **40% 틀린다** — 3편에서 102초로 계획했다가 실측 73.8초가 나왔다. 60~90초 목표면 **450~680자**.
- **추정은 추정으로만 적고, 컷 경계는 녹음 뒤에 잡는다.** 문서에 예상 러닝타임을 쓸 때 근거 속도를 병기할 것(예: "336자/분 기준" ← 이렇게 쓰면 나중에 뭐가 틀렸는지 보인다).

## 2. 치환표 `substitutions.json`

자막표기(text) 토큰 → 낭독표기(spoken) 토큰(1개 이상). 숫자·영문 약어·기호. 따옴표는 표 없이 자동 제거. **단일 소스** — captions/overlays는 이 파일을 참조.

## 3. narration.txt

1줄 = 1문장(절이 여러 개여도 한 줄). 낭독표기. 초안 .md와 줄 수 동일해야 생성기가 통과.

## 4. 보이스

- Typecast(키체인 `typecast-api-key`, `POST /v1/text-to-speech/with-timestamps` → 단어 타임스탬프 무료 동봉) — `GET /v1/voices/recommendations?query=…`로 후보 → 필요하면 짧은 샘플 비교 → `voice_samples/`에 근거를 보존한다. 위임받은 보이스는 제작자가 고른다. **기본값으로 특정 보이스를 가정하지 않는다** (직전 편 보이스는 참고일 뿐).
- 대안: [생성 제공자](../../shortform-news-pipeline/reference/generation-provider.md)에 따라 Higgsfield 오디오를 확인한다(타임스탬프 없음 → whisperx). 사람 WAV면 whisperx 강제정렬(`spoken_text` 프롬프트).

## 5. narration.json v1.1 (경계 파일)

- `root` 저장소 상대경로(`news/<id>`), 모든 path는 root 기준. 초 단위 float 3자리.
- `sentences[]` = {id s01…, text(자막), spoken_text(낭독), start, end, words[{text,start,end}], caption_words[](text≠spoken일 때만)}.
- 토큰 수 불일치 = 생성 실패(하드). `--reuse`로 저장된 타임스탬프 재조립(무과금).
- 훅·비트·강조 필드 없음. 절 분할은 output(beats).
- 사전 점검: 단어 겹침 0, 0.8s 초과 공백 0, 강조 토큰 길이(팝 7f=0.23s 이상). 연속 강조("1만 6천")는 묶음 처리 요청.

## 6. 자막 분할의 적용 경로

기사 위임 제작은 `narration.captions`와 공통 프로필을 사용한다. 다음 overlays 방식은 script-faithful에만 적용한다.

`narration.lines.draft.json`은 참고용. 단일 소스는 output `overlays.json caption.lines_timed[]`. 규칙 합의본: 18자 이내 최소 줄 수 → 최장 줄 짧은 쪽 → 편차 작은 쪽 / 보호 = 숫자+단위·박사·용언+의존명사·관형절 내부 / 절 우선(구두점 분할 → 6자 미만 병합). 검토는 "비트 번호 기준"으로.

## 7. credit_log.md

TTS 문자 과금·API 호출·생성 크레딧을 행으로. 재조립은 무과금 표기.

## 새 기사 제작의 음성 착수

새 start의 first-core-scene@2은 첫 핵심 장면의 실제 합성 확인을 요구한다. `produce resume`의 `context.work.first_scene`를 확인하고 [초기 합성 시안](../../../../docs/SCENE-PROOF.md)을 먼저 수행한다. `produce begin <id> narration`이 성공한 경우에만 외부 TTS를 호출한다. 반환 오류를 무시하거나 begin과 TTS를 무조건 연속 실행하지 않는다. 연속으로 보지 못한 동작을 usable로 바꾸지 않는다. 실제 프레임 표본과 독립 검수를 갖춘 provisional은 음성 착수만 허용하며 연속 동작 품질은 미검수로 남는다.
