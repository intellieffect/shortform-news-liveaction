# Editorial concept 데이터 계약 v1.0

후보 엔진 `editorial-concept@1`의 정본은 `story.json`, `concepts.json`, `motion.json`, `visual-system.json`이다. `timeline.json`은 네 정본과 `narration.json`, 선택한 제작 프로필에서 컴파일한 파생물이며 손으로 고치지 않는다.

## 파일과 소유권

| 파일 | 역할 | 직접 수정 |
|---|---|---|
| `story.json` | 영상 전체 질문·결론·대본 정책·창작 위임 범위·개념 순서 | 예 |
| `concepts.json` | 여러 내레이션 줄을 묶는 개념 장면, 표현 선택, 유지/추가/제거 상태, 모바일 정보 예산 | 예 |
| `motion.json` | `line + token_index + word`에 묶은 요소·SFX 생명주기 | 예 |
| `visual-system.json` | 제작 프로필 참조·텍스트·풀블리드·모션 기본값 | 예 |
| `config/production-profile.json` | 버전 있는 자막·출력 설정 | 예, 채널 설정을 바꿀 때 |
| `timeline.json` | 실제 프레임으로 해결된 개념 범위·요소 이벤트·SFX·event proof와 입력 해시·프로필 snapshot | 아니요 |

네 정본의 `schema_version`은 `1.0`, `story.mode`는 `editorial-concept`다. `story.script_policy`는 제공 대본을 잠그는 `script-faithful` 또는 사실 제약 안에서 편집을 위임하는 `editorial-owned`다. 원문과 이전 출력은 두 모드 모두 불변이다.

`creative_scope.script/assets/diagrams/audio`는 각각 `delegated`, `locked`, `approval-required` 중 하나다. 이미 `delegated`인 결정을 중간 단계마다 다시 묻지 않는다. 사용자 고정 조건과 기존 위임 범위를 바꾸는 일만 확인 대상으로 남긴다. 유료 도구도 기존에 승인된 범위를 먼저 확인한다.

`narration.json`은 표준 Typecast 출력인 `sentences[]`와 이관 기준편의 `lines[]`를 모두 받는다. 런타임은 둘을 같은 내부 줄 형식으로 정규화한다. `story.credits[]`는 엔드카드 출처 문구다.

## 개념

`concepts[].narration_lines`는 `narration.json`의 연속된 줄 ID를 한 번씩 소유한다. 한 문장을 여러 개념이 나눠 갖거나 어느 개념에도 배정하지 않지 않는다. `prerequisites`는 현재 개념보다 앞선 개념만 가리킨다.

`representation`은 다음을 기록한다.

- `kind`: `footage | image | diagram | hybrid | text`
- `role`: `evidence | metaphor | tone`
- `why`: 이 표현이 관계나 현상을 가장 정확히 전달하는 이유
- 영상·이미지가 포함되면 `full_bleed:true`. 예외는 `layout_exception`에 핵심 피사체와 자막을 위해 필요한 이유를 적는다.

`state.keep/add/remove`는 문장이 바뀌어도 남을 기준과 새로 더하거나 정리할 요소를 **`elements[].id`로만** 기록한다. 이전 개념의 활성 요소는 다음 개념에서 빠짐없이 keep 또는 remove로 처리하고, 현재 개념이 정의한 요소는 add에 둔다. `elements`는 화면 요소의 전역 고유 ID를 정의한다. 텍스트 요소의 `role`은 `necessary-label`, `condition`, `provenance`만 허용한다. `screen-text@1` 편은 `provenance`를 쓰지 않고, 출처·재구성 표기와 나레이션을 다시 적는 설명 문구를 넣지 않는다([화면 글자](../../plugin/skills/shortform-news-pipeline/reference/visual-production.md#화면-글자)). 제작 과정 설명, 장식용 상단 제목, “설명용” 같은 도해 주석은 넣지 않는다.

개념 경계에 정확한 전환 시점이 필요하면 `range.from/end`를 motion과 같은 발화 앵커 형식으로 적는다. 없으면 인접 내레이션의 무음 중간점으로 컴파일한다. 경계에도 절대 프레임을 적지 않는다.

`semantic_pairs`는 조건과 값을 묶는다. 예를 들어 “향후 양산되면”과 “최대 1톤”은 두 요소의 완전 표시 구간이 실제 시간축에서 겹쳐야 한다.

## 모션과 파생 시간표

`mobile.max_simultaneous_labels`는 양의 정수로 정하는 계획 예산이다. 개념 예산은 전역 계획 예산 안에 두되 전역값 자체의 상한은 강제하지 않는다. 실제 동시 라벨이 예산을 넘으면 `mobile-label-overflow` 경고를 남기고 실물 검수한다. 상태 배열·부품 수만으로 실제 위계와 객체 지속을 증명하지 않는다.

신규 템플릿의 `visual-system.production_profile`는 `config/production-profile.json`의 id/version을 참조한다. 프로필을 사용하는 편은 `caption`에 `preset`만 두고 숫자 스타일을 중복 작성하지 않는다. 출력 규격과 motion의 fps도 프로필과 일치해야 한다. 이전 프로필은 `config/production-profiles/`에 보존하고 해당 참조대로 읽는다.

현재 프로필의 `caption.max_lines: 1`은 한 번에 한 줄을 뜻한다. 긴 문장은 `narration.json.captions[]`에 실제 발화 시각을 가진 별도 구간으로 작성한다. `caption_text ?? text`에 줄바꿈을 넣거나 구간을 겹치게 쓰면 컴파일 오류다. `captions`가 없으면 실제 표시하는 내레이션 줄도 같은 검사를 받는다. 프루프·렌더에서는 모든 구간을 로드된 폰트·강조 굵기로 측정해 가용 폭 초과를 차단한다. 자동 축소·잘림은 하지 않으며 분절과 읽을 시간은 제작자가 판단한다. 이전 프로필에는 이 조건을 소급하지 않는다.

컴파일러는 `timeline.production_profile`에 실제 설정을 복사하고 `timeline.source.production_profile_sha256`에 내용 해시를 기록한다. renderer는 이 snapshot을 소비한다. 파일 내용이 바뀌면 표준 실행의 timeline 대조가 낡은 결과를 차단하므로 compile/sync와 관련 화면 검수가 필요하다. 배포할 설정 변경은 프로필 버전도 갱신한다.

프로필 참조가 없는 이전 편은 기존 입력·해시 구조를 유지한다. 현재 동일한 자막 기본값을 제공하며 이전 완성본과 소스 커밋을 보존한다. 설정 파일은 스타일·출력만 소유하고 장면 수·좌표·자료 선택을 정하지 않는다.

`motion.events[]`의 `from`, `settled`, `to`, `end`는 모두 아래 앵커를 쓴다.

```json
{"anchor":{"line":"s04","token_index":3,"word":"열여덟","edge":"start","offset_frames":-3}}
```

같은 단어가 반복돼도 token index로 구분한다. `word`는 사람이 읽는 안전장치이며 실제 토큰과 다르면 컴파일을 막는다. 절대 `frame` 값은 정본에 적지 않는다. `narration_word_sha256`가 바뀌면 모든 발화 연출을 다시 맞춘 뒤 해시를 갱신한다.

시간 순서는 `from ≤ settled ≤ to ≤ end`다. easing은 `ease-out`, `ease-in-out`, `ease-in`, `linear`, `cubic-in`, `cubic-out`, `quad-in` 또는 cubic-bezier 배열 `[x1,y1,x2,y2]`다. 배열의 모든 값은 유한하며 x1/x2는 0~1이다. 동작 의미에 맞게 선택하고 정량 표현의 반동·왜곡은 실물에서 검수한다.

`eventInConcept(timeline, conceptId, eventId)`는 사건의 네 시점을 개념 지역 프레임으로 변환한다. `eventProgress(frame, event, phase)`는 enter/move의 from→settled 또는 exit의 to→end 구간과 해당 곡선을 읽는다. 동일 시작·종료 시각은 즉시 변화다. `eventOpacity`는 등장과 퇴장을 연결한다. 도해 좌표·거리·공간 궤적은 편별 코드에 남긴다.

SFX는 `audio_cues[].bind.event_id + point`로 같은 사건에 묶고 `asset`은 `audio/`로 시작하는 편 상대경로를 쓴다. 장면과 별도로 초를 다시 적지 않는다. 품질 확인을 받은 완성 믹스를 이관한 경우 `audio.json.master_mix:true`로 두어 BGM·SFX를 중복 재생하지 않는다.

`visual-system.media.assets[]`는 편 renderer가 쓰는 미디어를 `id`, 편 루트 상대 `source`, `editorial/` 아래의 렌더 `file`로 등기한다. 영상 일부만 필요하면 `trim{from_sec,duration_sec}`를 적고 sync가 편별 파생 클립을 만든다. renderer는 실험 폴더나 공용 임시 캐시를 직접 읽지 않는다.

컴파일러는 모든 개념 경계와 motion 이벤트의 `from/settled/to/end`를 중복 제거해 `timeline.proof_frames[]`로 만든다. `BeatSheet`, `BeatStill`, `Slides`는 이 목록을 사용하므로 별도 프레임 번호표를 손으로 관리하지 않는다.

프로필을 사용하는 편에는 사건 직전·등장 중간·퇴장 중간 프레임을 추가한다. 이름은 `event:<id>:before/enter-mid/exit-mid`이며 사건 이동과 함께 다시 계산한다. SFX의 `point`는 from/settled/to/end, `offset_frames`는 정수이며 해결된 시점은 영상의 유효 프레임 안에 있어야 한다.

## 검사

```console
npm run editorial:check -- news/<id>
npm run editorial:compile -- news/<id>
npm run editorial:test
npm run production:test
```

검사기는 구조, 입력·프로필 해시, sync snapshot 전체, 렌더 미디어, 앵커, 이벤트 순서, 조건/값 동시 노출, 상단 고정 문구와 풀블리드 기본값을 판정하고 모바일 라벨 예산 초과는 경고한다. 화면 위계·크롭의 의미·속도감은 원해상 스틸, 1/3 모바일 표본, 연속 구간 재생으로 별도 판정한다.

## 복원본의 새 편 로고 연결

`visual-system.project_logo`는 start가 수령 패키지에서 복사한 `{file,sha256,version,x,y,width,height}`다. 새 편 기본 로고는 `media.assets`에도 선언하여 기존 sync·미디어 누락 검사에 포함한다. 원본은 `02_production/brand/logo.png`, 렌더 파일은 `editorial/brand-logo.png`다. 공통 EditorialFrame이 합성하므로 편별 장면에 중복 로고를 넣지 않는다. 필드가 없는 과거 편은 로고를 추가하지 않는다. 새 시작의 해시·PNG·배치 검증은 production/defaults.mjs가 수행하며 임의로 손편집한 로고의 적합성을 기존 데이터 스키마가 전부 보증하지는 않는다.

## 신규 화면 제작 계약 `visual-explanation@1`

새 start는 `request.visual_contract`와 `visual-system.visual_contract`를 함께 기록한다. 새 편이 visual-system의 선언만 삭제해 검사에서 빠질 수 없다. 이전 편은 opt-in하지 않는 한 기존 계약을 유지한다. 창작 판단은 [발화→화면 제작](../../plugin/skills/shortform-news-pipeline/reference/visual-production.md)이 정본이다.

`concepts[].visual`:

- `purpose`: `explain | observe | quote | atmosphere`, `focus`: 먼저 보일 대상/관계.
- `moments`: 핵심 설명 구간 배열. explain이면 한 개 이상; 다른 목적은 빈 배열 가능. 각 항목은 고유 `id`, 해당 개념의 `narration_lines`, `subject`, `action`(비교·구조의 관계도 가능), `result`, `motion_required` boolean. 모든 발화에 별도 항목을 강제하지 않는다.
- `realization`: `method: source | generated | code | hybrid`, `asset_ids`, `job_ids`. media.assets와 generation_jobs의 실제 id를 참조한다. 생성 작업이 있으면 `generated_role`, code/hybrid이면 `code_role`로 담당 부분을 적는다. hybrid는 실사+코드도 가능하고 생성 사용을 강제하지 않는다.
- text 요소는 기존 elements 안에 표시 원문 `text`를 가진다. 신규 추가 문구는 `EditorialScreenText`로 elementId/eventId를 연결한다. 배치와 미술은 자유롭게 지정한다. 사건은 전역 시각이며 globalFrame을 반드시 명시하며 Sequence 바깥에서 얻은 전역 프레임을 전달한다.

`visual-system.generation_jobs[]`: `id`, `kind: image | video | overlay-video`, `purpose`, `status: planned | running | failed | rejected | accepted`. planned 이후 실제 `provider`, `model`, 편 상대 `prompt_path`; 출력이 있는 accepted/rejected는 편 상대 `output`; failed/rejected/accepted는 `observation`. 제공되는 job_id·비용 등 실제 생성 정보도 보존한다. 채택한 렌더 자산은 `media.assets[].generation_job`으로 accepted 작업을 참조한다. 원본과 파생본의 경로는 달라도 된다.

`scene_proof`는 final narration에 의존하지 않는 초기 시안 기록이다. `begin` 전 현재 원고/개념/자료/장면 코드를 준비하고 새로운 시안과 `scene-proof@1` 관찰 JSON을 `--output`으로 지정한다. `finish`는 실제 미디어와 입력 해시를 검사한다. 계획·코드·자산 변경은 시안을 stale로 만든다. 결과 형식과 실제 확인 범위는 visual-production.md를 따른다. 초기 시안이 최종 rendering/review 상태를 current로 만들지 않는다.

`context.work.visual`과 intent 입력에는 작업 목록, 생성 상태, 시안 관찰, 설명 검수 대상, 선언 문구와 동시 자막, JSX 문구 진단이 제공된다. experience에는 제작 의도를 넣지 않는다. 최종 `review_visual.explanations[]`는 moment를 관찰 원문·증거·basis·verdict에 연결한다. 핵심 설명을 누락하거나 코드 추론만으로 pass할 수 없다. 동작이 필요한 설명은 해당 개념의 연속 확인 범위를 요구한다. 기계 검사는 기록의 연결만 확인하며 진짜 이해·미술·관찰의 진실을 증명하지 않는다.

최종 visual pass에는 `text_review: {verdict, observation, evidence}`로 추가 문구와 고정 자막의 실제 읽기 부담을 화면 표본에 연결한다. 초기에 동결된 접수 해시는 run.json에도 보존하므로 request와 visual-system의 계약을 함께 삭제해 legacy로 바꿀 수 없다. 한 프레임 MP4는 motion 시안으로 인정하지 않는다. 프레임 수가 복수라는 조건도 실제 움직임·시청의 증명은 아니다.

## 선택적 표현 시험 — first-core-scene@5

새 start는 request/run에 `scene_gate: "first-core-scene@5"`를 보존한다. 필수 첫 장면 시안 없이 narration begin/adopt를 사용할 수 있다. 저장된 접수 무결성 검사는 유지한다. `first_scene`은 `required:false`, `ready`(접수 무결성), `proof_ids:[]`, `admission_kind:"optional-trials"`, `motion_continuity:"unverified"`를 반환한다. 음성 착수 가능은 시험·최종 시청 완료 판정이 아니다.

시험은 선택적 scene_proof 액션이며 `next`의 필수 제작 안내에서 제외한다. 설정·관찰의 기존 schema와 실제 미디어 검사·입출력 해시 기록은 유지한다. `scene-proof-config@1.viewer_context`는 선택적 문자열로 실제 시청 맥락만 제공하며 @5의 렌더 입력 해시에서 제외한다. 다른 설정값은 의미 해시로 검사한다. 입력의 viewer_context_status는 provided/not-provided다. 질문·진행 판단·실패 대안·채택/표현 변경/판단 보류는 기존 제작 노트에 둔다. `scene-proof@1.evidence`는 선택적 `{path,sha256}[]`로 해당 편 reviews/ 아래의 실제 관찰 원문·표본을 연결하며 finish가 보존한다. 동작의 usable/revise에는 실제 연속 확인 범위를 적고 미확인은 unverified다. usable은 시험한 범위만 뜻한다.

`scene-trial-input@1`은 experience에 실물과 viewer_context, 필요한 intent에 사실·원고·제작 노트를 제공한다. 독립 검수와 두 단계 호출을 모든 시험에 요구하지 않으며 all-moments pass·레퍼런스 전체 미술 심사·이전 revise 전부 닫기를 시험 종료 조건으로 삼지 않는다. 시험과 실패·미확인·stale 기록은 `context.work.visual.scene_proofs`에 남지만 narration을 차단하지 않는다. 실제 표현 실패는 수정·교체하고 이월 사항은 전체 시안에서 회수한다. 최종 설명·연속 시청·음향·사실 검수 계약은 바뀌지 않는다.

## 기존 첫 핵심 장면 착수 — first-core-scene@1~4

아래는 @1~@4로 보존된 편에만 적용한다. 새 계약을 구형 접수·시안에 소급 적용하지 않는다.

구형 start의 request/run에 scene_gate를 보존한다. legacy 편은 소급하지 않는다. 제작자는 `02_production/scene-proof.json`에서 concept_id를 고르며 실제 자산·장면 컴포넌트·임시 자막 시간은 [초기 합성 시안](../SCENE-PROOF.md)을 따른다. 선택한 explain concept의 moments.subject_ids는 해당 concept의 비문자 elements id 배열이다. subject/action/result는 구체적인 대상/작용 또는 비교/눈에 보일 결과이며, action에 질문을 그대로 복사하지 않는다. 의미 적합성은 실제 시안으로 검수한다.

realization.asset_ids에 생성 자산이 있으면 그 generation_job도 job_ids에 연결한다. code method에 실제 미디어/생성이 있으면 source/generated/hybrid로 역할을 정확히 고친다. 계획·진행·채택 생성 작업에는 사용 개념이 있어야 한다. 필요 없어지면 기각/실패와 관찰을 기록한다.

탐색 draft는 시도·관찰 JSON·검수 입력을 만들지 않으며 착수 근거가 아니다. @4로 시작한 편은 동작 설명의 제출 motion 한 편에 구도·재료·작용·결과의 독립 초견·의도 대조를 연결하고, 정적 설명은 제출 still을 검수한다. 기존 @2·@3 편의 단계별 기록과 @1 편의 계약은 소급 변경하지 않는다. 독립 검수 대상의 열린 렌더 완료 시도는 review-input --source scene으로 확인할 수 있다. 초기 검수는 핵심 이해·명백한 오독에 집중하며, 음성 전 임시 자막의 프레임 전수 측정은 요구하지 않는다. 정확한 형식은 [초기 합성 시안](../SCENE-PROOF.md)을 따른다.

@4의 동작 설명은 현재 composite motion 한 편, 정적 설명은 composite still이 음성 착수 근거다. @2·@3·@4 편의 motion은 전체 연속 확인 usable 또는 시작·중간·끝의 이미지 증거와 독립 검수를 연결한 provisional을 허용한다. 사용자 지시로 미해결 문제를 안고 착수할 때는 현재 시안·독립 검수·사용자 원문·후속 문제를 해시로 묶는 `scene-admission@1`을 별도로 기록한다. 이것은 proof verdict나 최종 화면 pass를 바꾸지 않으며 열린 문제를 남긴다. 다른 explain 개념마다 초기 scene-proof를 강제하지 않으며, 전체 영상의 설명은 최종 visual 검수에서 확인한다. 공통 합성 provenance가 없는 별도 임시 그림은 이 착수 조건을 충족하지 않는다.
