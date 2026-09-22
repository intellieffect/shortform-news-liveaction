# 발화를 화면으로 만드는 제작 계약

새 start는 `visual-system.visual_contract`와 보존 요청에 `visual-explanation@1`을 연결한다. 기존 확정편에는 소급하지 않는다. 파일·필드·도구 사용은 품질 증명이 아니다. [데이터 계약](../../../../docs/specs/editorial-concept.schema.md)과 이 문서를 함께 적용한다.

## 먼저 보일 일을 정한다

전체 기사·자료와 원고를 왕복하며 각 개념의 `visual.purpose`를 explain/observe/quote/atmosphere 중 선택하고 `focus`에 먼저 보일 대상을 적는다. 핵심 설명은 `moments`에 발화 줄, 같은 대상, 작용 또는 비교 관계, 눈에 보이는 결과를 연결한다. 명사 라벨이나 화살표가 있다는 사실만으로 동사가 수행됐다고 판단하지 않는다. 수치 비교는 공통 기준과 차이가 결과이며 반드시 동작일 필요는 없다. 관측·인용·호흡 구간에 과정 도해를 강제하지 않는다.

`visual.realization`은 method(source/generated/code/hybrid), asset_ids, job_ids로 재료와 생성 계획에 연결한다. 코드가 설명에 적합하면 사용한다. 제작 편의만으로 단순 도형을 먼저 만든 뒤 남는 외형만 생성하지 않는다. 필요한 미술과 작용에서 출발해 수단을 정한다.

## 생성과 합성

Higgsfield는 배경·외형뿐 아니라 빛의 진행·산란, 유체·가스의 변형, 응집·붕괴 등 **동작 전체**를 만들 수 있는 선택지다. 실제 가능한 도구·모델을 확인한다. 연결된 MCP를 사용하라는 사용자 지시가 있으면 해당 경로를 우선한다. 코드로 수치·축·문구·배치·발화 타이밍을 제어하면서 생성 동작을 합성할 수 있다. 도구 호출 또는 정지 이미지 생성만으로 모션그래픽 제작을 완료했다고 하지 않는다.

`visual-system.generation_jobs`에 생성 예정/진행/실패/기각/채택 작업을 기록한다. id, kind(image/video/overlay-video), purpose, status는 계획부터 적는다. 호출 후 실제 provider/model, 편 상대 prompt_path, 가능한 job_id, output 원본, observation을 연결한다. 채택 자산에는 media.assets[].generation_job을 넣는다. 원본과 합성용 파생본은 구별한다. 생성 역할은 realization.generated_role, 코드 역할은 code_role에 짧게 적는다. 역할이 없으면 억지로 만들지 않는다.

실패하면 같은 목적에 맞게 입력 이미지·동작·구도·분리 생성·다른 자료 또는 코드를 재선택한다. 생성 영상이 반대 작용을 보이는데 라벨로 맞는 뜻을 씌우지 않는다. 계정·도구 실패는 그대로 기록하고 resume에 미해결 상태를 남긴다. 생성 횟수나 사용 비율은 통과 기준이 아니다.

## 초기 장면 시안 — 최종 음성 전에 가능

핵심 설명 구간부터 실제 배경과 프로젝트 자막 영역을 포함한 합성 이미지로 구도·미술·정보 위계를 확인한다. 움직임이 설명의 핵심이면 이미지 방향을 확인한 후 허용된 범위에서 짧은 동작 시안을 본다. 단일 이미지에 시작과 결과를 모두 넣을 의무는 없다. 사용자에게 이미지 확인 후 영상화를 요청받았으면 그 순서를 지킨다. 그 외에는 내부 판단으로 진행하며 새 승인 관문을 만들지 않는다.

새 start의 `first-core-scene@1`은 **첫 핵심 장면 한 개**의 확인을 음성 착수 조건으로 사용한다. 모든 장면을 먼저 완성하는 절차가 아니다. 제작자가 `02_production/scene-proof.json`의 `concept_id`를 선택한다. 설명 개념이 있으면 그 중 기사 이해에 핵심인 것을 고른다. 선택 방법·공통 합성 실행은 [초기 합성 시안](../../../../docs/SCENE-PROOF.md)을 따른다.

선택한 설명의 moments에는 `subject_ids`로 실제 비문자 elements를 연결하고, `subject`에는 구체적인 대상, `action`에는 화면에서 일어날 작용이나 비교 관계, `result`에는 눈에 보일 결과를 쓴다. 질문을 action에 복사하거나 ‘길쭉한’ 같은 형용사를 subject로 남기지 않는다. 이 기술 연결은 설명 성공의 자동 판정이 아니다.

생성 호출 전에 사용하는 개념의 realization.job_ids를 연결한다. 결과를 보면 채택·기각·실패 판단을 기록하고, 채택한 원본/파생본을 assets와 realization.asset_ids에 연결한다. 사용처 없는 진행 중 생성 작업이나 코드 방식으로 기록한 생성 합성은 초기 장면 확인을 끝낸 것으로 보지 않는다.

`scene_proof`는 narration/timeline/sync 없이 제작한다. `npm run scene:proof`는 실제 채택 자산과 재사용 가능한 장면 컴포넌트, **공통 EditorialCaptionTrack**으로 짧은 합성 시안을 만든다. 임시 자막 시점은 시안용이며 음성 정렬 파일을 꾸며 만들지 않는다. 별도 PIL 자막이나 대체 입자 그림을 그려 실제 생성 영상의 합성을 검증했다고 기록하지 않는다.

```bash
npm run scene:proof -- <id> --phase still --output out/pilots/<id>/qa/core-still.png --frame 60
# 실제 이미지 확인 → 반환된 관찰 JSON을 사실대로 작성 → 반환 token으로 finish
npm run produce -- finish <id> <token>
npm run scene:proof -- <id> --phase motion --output out/pilots/<id>/qa/core-motion.mp4
# 실제 동작 확인 → 관찰 JSON 작성 → finish. 확인 불가면 unverified를 유지한다.
npm run produce -- finish <id> <token>
npm run produce -- resume <id> --json
```

시안 렌더는 자동으로 usable 판정을 쓰지 않는다. 선택 장면의 최신 composite still이 usable이어야 하고, motion_required면 composite motion의 실제 전체 연속 확인도 필요하다. revise/unverified/stale 상태에서는 narration begin과 adopt가 거절된다. 관측 수단이 없으면 미확인 결과를 보여주고 한계를 알린다. 스키마를 만족하려고 시청 기록을 꾸미거나 gate 필드를 제거하지 않는다. 외부 TTS는 **begin 성공 후에만** 호출한다 (`begin && TTS`; 무조건 다음 줄 실행 금지). 나중에 다른 컷의 미술을 수정했다고 이미 생성한 음성이 자동 무효화되지는 않는다.

관찰 JSON 형식:

```json
{
  "schema": "scene-proof@1",
  "concept_id": "process",
  "phase": "still",
  "scope": "composite",
  "artifact": "out/pilots/<id>/qa/scene-a.png",
  "verdict": "unverified",
  "observation": "실제 확인 범위를 기록",
  "tool": "실제로 사용한 확인 도구"
}
```

phase는 still/motion, scope는 asset/composite, verdict는 usable/revise/unverified다. 동작을 관찰했다면 continuous_viewing:true와 실제 viewed_seconds:[시작,끝]을 기록한다. 프레임만 확인했다면 motion usable로 기록하지 않는다. 자산만 확인한 asset 시안은 배경·자막과의 composite 확인을 대신하지 않는다. 입력 변경 시 기존 시안은 stale이며, 음성 확정 후에는 기존 proof로 실제 발화 결합을 다시 확인한다. 초기 시안은 최종 독립 검수를 대체하지 않는다.

## 화면 글자

고정 나레이션 자막은 기존 공통 런타임을 유지한다. 추가 문구는 concepts.elements에서 kind:text인 요소의 text에 정확히 적는다. 이름·수치·단위·귀속·의미를 바꾸는 조건을 우선하고, 같은 설명을 자막 위에서 다시 읽게 하지 않는다. 인용·표의 본문은 내용에 필요한 만큼 설계한다. 일률적 글자 수·라벨 수로 품질을 판정하지 않는다.

신규 장면의 추가 텍스트는 `src/editorial/ScreenText.tsx`의 EditorialScreenText를 사용한다. elementId와 eventId를 연결하며 좌표·색·서체·크기는 style로 자유롭게 지정한다. 컴포넌트는 concepts의 정확한 문구를 읽고 timeline 등장/퇴장을 적용한다. globalFrame은 필수이며 Sequence 바깥에서 얻은 전역 프레임을 전달한다. 지역 프레임을 자동 추정하지 않는다. 장식·라벨 스타일 템플릿이 아니다.

resume과 intent의 screen_text는 선언 문구·동시 자막·시점 누락을 보여주며 render_text_audit는 JSX 직접 문구를 진단한다. 동적 문자열·이미지 속 글자까지 자동 검출했다고 해석하지 않는다. 실제 합성 화면에서 자막과 함께 확인하고, 읽기 부담이 크면 대상·구도·동작·재료 변경부터 검토한다.

## 재개와 검수

`context.work.visual`의 tasks에서 미작성 설명, 미확인 합성 시안, 생성 실패/미채택, 문구 중복과 직접 JSX를 확인한다. 기술 단계 production은 화면 설계 완료라는 뜻이 아니다. 필요한 작업을 먼저 해결하고 코드 구현을 이어간다.

experience에는 제작 의도와 해결 문구를 먼저 주지 않는다. intent에는 같은 시안과 발화별 대상·작용·결과를 연결한다. 최종 visual 검수의 explanations에는 concept_id/moment_id, 실제 observed_subject/action/result, text_dependency, evidence, basis(observed/code_inference/unverified), verdict(pass/changes_requested/unverified)를 기록한다. 코드의 계산이 맞는다는 이유로 시각적 이해 실패를 철회하지 않는다. 사실 오류를 철회해도 남는 설명 문제는 별도로 남긴다.

동작 설명의 pass는 해당 개념의 실제 연속 확인 범위를 요구한다. 정지 이미지 관찰과 코드 추론은 모션 검수 완료가 아니다. 핵심 설명 실패는 blocking, 확인 수단 부재는 incomplete로 다룬다. 라벨 추가 전에 대상·구도·행동·재료를 바꿔 해결할 수 있는지 판단한다. 전체 영상의 이야기·호흡·음향 검수는 계속 별도로 수행한다.

최종 visual 보고서의 text_review는 verdict, observation, evidence로 실제 추가 문구와 고정 자막의 읽기 부담을 기록한다. JSX·중복 경고는 개수만으로 차단하지 않고 이 실물 검수에서 판단한다. 초기 첫 장면 착수 조건과 최종 독립 검수는 별개다. 기존 편에는 새 착수 조건을 소급하지 않는다.
