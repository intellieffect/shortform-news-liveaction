# 선택적 표현 시험과 기존 초기 시안 — scene-proof

음성·timeline·sync 없이도 **실제 공통 자막 런타임과 실제로 선택한 자료**로 짧은 합성 시안을 만들 수 있다.
새 `first-core-scene@5` 편에서는 특정 불확실성에 답할 때만 사용하는 선택적 도구다. 판정은 제작자·검수자가 실제로 확인한 시험 범위에 한정한다.
절차와 기록 규칙의 정본은 [발화→화면 제작](../plugin/skills/shortform-news-pipeline/reference/visual-production.md)이다. 이 문서는 도구 사용법만 적는다.

## 새 편의 선택적 시험 — first-core-scene@5

필수 첫 장면·필수 독립 검수·음성 착수 조건이 없다. 불확실한 질문, 진행 판단에 필요한 관찰, 실패 시 대안과 시험 후 선택은 기존 direction.md/decisions.md에 짧게 남긴다. 시험 범위·반복 종료·시청 맥락은 [선택적 표현 시험 정본](../plugin/skills/shortform-news-pipeline/reference/visual-production.md#선택적-표현-시험--first-core-scene5)을 따른다.

필요한 경우 아래 draft/submit 도구를 재사용한다. 관찰 JSON의 `verdict`는 기존 usable/revise/unverified를 쓰되 **시험한 질문의 관찰**만 뜻한다. 채택·표현 변경·판단 보류는 제작 노트에 남기며 장면 전체 pass를 만들지 않는다. 동작을 실제 이어 보지 못했다면 unverified로 기록하고 표본에서 확인한 사실만 observation에 적는다. @5에는 provisional이나 scene-admission이 필요하지 않다.

외형·합성 시험은 제작자가 확인한다. 독립적인 의미·오독 관찰이 필요한 경우에만 `review-input --source scene --phase experience`를 사용한다. 의도 대조가 필요할 때만 `--phase intent`를 이어간다. @5의 입력 계약은 `scene-trial-input@1`이며 모든 moments의 합격·원문 두 건을 요구하지 않는다. `scene-proof.json`에 선택적으로 `viewer_context` 문자열을 넣어 실제 시청자가 받는 앞뒤 장면·발화·자막 맥락을 제공할 수 있다. 제작 정답·성공 조건·구현 처방은 이 문자열에 넣지 않고 intent의 제작 노트에서 제공한다. 렌더 후 viewer_context만 추가·변경해도 같은 시안을 재사용한다. 실제 자막·시간·장면 코드 변경은 여전히 시안을 stale로 만든다. 맥락을 제공하지 않으면 viewer_context_status:not-provided로 표시하며 검수자는 맥락 부족과 실제 오독을 구분한다.

독립 관찰이나 표본을 받았다면 해당 편 `02_production/reviews/`에 보존하고 관찰 JSON의 선택적 `evidence: [{path, sha256}]`로 연결한다. path는 저장소 상대 경로다. 실제 검수자·확인 수단·시안 경로/해시·본 범위는 원문에 기록한다. `finish`는 이 파일의 해시도 보존한다. 별도의 두 단계 원문이나 장면 승인 서식을 만들지 않는다. 자료와 입력이 바뀌면 시험은 stale로 표시되지만 음성 착수를 차단하지 않는다.

`resume`의 `visual.scene_proofs`에서 실행한 시험과 관찰을 확인한다. `first_scene.required:false`, `admission_kind:optional-trials`는 초기 시험이 음성 선행조건이 아니라는 뜻이며 화면의 완성 판정이 아니다. `next`에 scene_proof를 필수 다음 작업으로 제시하지 않으며 직접 실행은 가능하다. 이월 사항은 전체 시안의 제작 노트·최종 검수 입력에서 회수한다. 최종 시각·음성·사실 검수는 그대로 수행한다.

아래 도구 사용법은 공통이며 **기존 @1~@4 착수 게이트·두 단계 검수·provisional·사용자 조건부 착수는 하단의 구형 계약 절에서만 적용**한다. 기존 요청과 검수 기록은 소급 변경하지 않는다.

```bash
node scripts/scene-proof.mjs <id> --mode draft --phase still --output out/pilots/<id>/qa/drafts/scene-a.png --frame 45
node scripts/scene-proof.mjs <id> --mode submit --phase still --output out/pilots/<id>/qa/scene-a.png --frame 45
node scripts/scene-proof.mjs <id> --mode submit --phase motion --output out/pilots/<id>/qa/scene-a-motion.mp4
```

`--frame`은 still에만 쓰며 기본값 0이다. `--mode` 기본값은 기존 명령과 호환되는 `submit`이다. 탐색 중에는 `draft`로 같은 자료·장면·공통 자막을 렌더한다. 출력은 해당 편 `qa/drafts/` 아래로 제한되며 제작 시도·관찰 JSON·독립 검수 입력을 만들지 않는다. 프레임·배치·밝기를 제작자가 묶어 확인하고 후보가 정해지면 `submit`으로 새로 렌더한다. 제출본의 관찰 JSON은 `--output`의 확장자만 `.json`으로 바꾼 경로에 쓴다. 탐색 파일을 정식 proof나 검수 근거로 수입하지 않으며, submit 출력은 drafts/ 아래에 둘 수 없다.

## 설정 — `news/<id>/02_production/scene-proof.json`

```json
{
  "schema": "scene-proof-config@1",
  "pilot": "<id>",
  "concept_id": "discovery",
  "component": "src/editorial/scenes/<장면>.tsx",
  "duration_seconds": 6,
  "captions": [
    { "narration_line": "s03", "text": "중앙의 빈 공간은 가로 약 210광년.", "from": 0.4, "end": 3.2 }
  ]
}
```

| 항목 | 규칙 |
|---|---|
| `component` | `src/editorial/scenes/` 아래의 실제 `.tsx`. 저장소 밖을 가리키면 거절한다. 고정 미술 템플릿이 아니라 매번 고르는 **재사용 장면 컴포넌트**다. |
| `duration_seconds` | 0 초과 30 이하. 초기 시안은 짧게 본다. |
| `captions[].narration_line` | 실제 발화 줄 id. 현재 `narration.txt` 순서의 `s01…`이며 선택한 개념의 narration_lines에도 있어야 한다. |
| `captions[].text` | 그 줄의 인용이어야 한다. 공백만 다르면 같은 문구로 본다. 그 밖의 글자가 다르면 거절한다. |
| `captions[].from`/`end` | **전부 임시값이다.** 음성이 없으므로 실제 발화 시각이 아니다. 겹치거나 시안 길이를 넘으면 거절한다. |

순수 코드 도해는 asset_ids를 빈 배열로 둘 수 있다. 사진·영상·생성 재료를 사용하는 장면은 실제 사용 자산을 연결한다.

자료는 설정에 적지 않는다. **선택된 concept의 `visual.realization.asset_ids`** 만 쓰며, 각 id는 `visual-system.media.assets`에 선언돼 있어야 하고 원본 파일이 실제로 있어야 한다(이미지 `.png/.jpg/.jpeg/.webp`, 영상 `.mp4/.mov/.webm`).
원본은 건드리지 않고 무시되는 `public/scene-proofs/<id>/`로 복사한다. `project_logo`와 현행 프로필(`config/production-profile.json`)은 본편과 같은 규칙을 그대로 쓴다.

## 장면 컴포넌트 계약

`src/editorial/scenes/<장면>.tsx`는 `SceneProofSceneProps`를 받는 컴포넌트를 **default export** 한다. 최종 합성에서도 같은 컴포넌트를 쓴다.

```tsx
import { SceneProofMedia, type SceneProofSceneProps } from "../SceneProof";

const Scene: React.FC<SceneProofSceneProps> = ({ asset }) => {
  const n44 = asset("n44"); // 계획에 없는 id는 던진다
  return <SceneProofMedia asset={n44} />;
};
export default Scene;
```

`asset(id)`는 `{id, kind, src, source, file}`을 준다(`src`는 `staticFile` 해석 완료). 애니메이션은 Remotion 규칙대로 `frame`/`interpolate()`로만 만든다.
공통 자막(`EditorialCaptionTrack`)·로고·배경은 `SceneProofFrame`이 감싼다. 장면 컴포넌트가 자막을 다시 그리지 않는다.

## 렌더와 기록

1. 설정·자료·자막·서체를 검사한다. 하나라도 어긋나면 렌더하지 않는다.
2. 자료를 `public/scene-proofs/<id>/`로 복사하고, 등록부·본편 전체를 거치지 않는 독립 entry를 `out/pilots/<id>/scene-proof/entry.tsx`에 만든다(매 실행 덮어씀).
3. **submit 렌더 전에만** `produce`의 `scene_proof` 시도를 연다. 실패하면 그 시도를 fail로 닫는다. draft 실패는 기존 정식 proof를 무효화하지 않는다.
4. 렌더 후 관찰 JSON을 쓴다. `verdict`는 항상 `unverified`, `observation`/`tool`은 채워야 할 자리 표시다.
5. 시도는 **열린 채로 둔다.** 스크립트가 토큰과 경로를 출력한다.

```json
{
  "schema": "scene-proof@1", "phase": "still", "scope": "composite", "verdict": "unverified",
  "rendering": {
    "kind": "shared-scene-proof@1",
    "config": "news/<id>/02_production/scene-proof.json",
    "component": "src/editorial/scenes/<장면>.tsx",
    "asset_ids": ["n44", "pan"],
    "profile_sha256": "<실제 프로필 바이트 해시>"
  }
}
```

제작자가 실물을 본 뒤 `verdict`/`observation`/`tool`을 고치고, 동작을 실제로 이어 봤을 때만 `continuous_viewing`과 실제 `viewed_seconds`를 더한다. 프레임 표본만 확인한 새 제작은 아래 provisional 계약을 사용한다. 그다음 기존 절차로 닫는다.

```bash
npm run produce -- finish <id> <token>
```

스크립트는 "사용 가능"을 스스로 기록하지 않는다. 자동 렌더 기록은 시청 사실·품질·최종 독립 검수를 대신하지 않으며, 자막 시각은 음성 확정 후 다시 확인해야 한다.

## 검사

```bash
node --test scripts/tests/scene-proof.test.mjs
```

## 기존 편의 초기 독립 검수 — first-core-scene@1~4

`@4`로 시작한 편은 동작 설명의 **제출 motion 한 편**으로 구도·재료·작용·결과를 함께 확인한다. still draft는 필요하면 제작자가 보되 정식 제출·독립 검수의 필수 단계가 아니다. 정적 설명에는 제출 still을 쓴다. 기존 `@2`·`@3` 기록은 그대로 보존한다. 초기 검수는 음성 착수에 필요한 핵심 이해와 명백한 오독만 짧게 판정한다. 실제 연속 재생이 가능하면 이어서 보고, 불가능하면 시작·작용 전후·결과 표본을 확인하고 미확인 범위를 밝힌다. 애매한 구간만 추가 확인한다. 임시 자막의 프레임 전수 타이밍 측정은 음성 확정 후에 한다.

`@3`으로 시작한 편은 동작이 필요한 설명의 **정지 시안**에서 제작자가 구도·재료·자막·모바일 읽힘을 확인하고 기록한다. 동작의 방향·과정·인과는 정지 이미지의 결함으로 판정하지 않고 이어지는 **제출 동작 시안**에서 검수한다. 움직임이 필요 없는 장면은 제출 정지 시안이 독립 검수 대상이다. `@2` 편은 기존 단계별 독립 검수 계약을 그대로 적용하고, `@1` 편도 소급 변경하지 않는다. 독립 검수 대상의 렌더가 끝나 관찰 JSON과 실물이 있으면 **열린 토큰 상태에서도** 다음 입력을 받을 수 있다. 검수를 받으려고 먼저 usable/finish를 기록하지 않는다.

탐색 판본마다 검수자를 호출하지 않는다. 제작자가 동일한 문제의 작은 조정은 draft에서 묶어 확인하고, 선택한 제출 시안에만 아래 experience → intent를 수행한다. 수정 후에는 이전 지적의 영향을 받는 범위만 새 실물에서 재확인한다. 실제 결함이 남으면 판본 수와 무관하게 revise다. 신규 `@3` 편에서 motion_required 정지 시안을 `usable`로 기록할 때는 동작 의미를 관찰했다고 쓰지 않으며, 정식 revise 기록이 있다면 관찰 JSON 최상위 `rechecks`에 `{ "receipt_id": "이전 revise 토큰", "verdict": "fixed", "observation": "현재 이미지에서 확인한 변화" }`를 적는다. 독립 검수를 수행한 시안의 재확인은 기존처럼 `review.rechecks`에 적는다.

```bash
node scripts/produce.mjs review-input <id> --source scene --phase experience
# 지정 scene-judge에게 이 입력과 실제 확인 도구만 전달 → 초견 원문 보존
node scripts/produce.mjs review-input <id> --source scene --phase intent
# 같은 검수자에게 초견 원문 + intent 입력 전달 → 대조 원문 보존
# 실제 응답을 아래 review로 관찰 JSON에 연결한 뒤 finish
npm run produce -- finish <id> <token>
```

`experience`에는 시안 경로·해시·기술 정보만 제공한다. `intent`는 원고·사실·개념·자막 시점·자료 선택 기록과 공통 레퍼런스, 같은 장면·단계의 이전 revise를 제공한다. 같은 artifact 해시를 확인한다. 첫 응답은 다음 대조 응답으로 덮어쓰지 않는다. 같은 응답을 다른 파일명으로 복사해 두 단계 검수로 기록하지 않는다. 다른 시안의 원문을 현재 시안 해시만 바꿔 재사용하지 않는다. 이미 제작 의도를 본 검수자라면 노출 사실을 원문에 밝힌다.

기존 `scene-proof@1` 관찰 JSON에 `review`를 더한다. 아래 문자열은 작성 예시이며 실제 관찰로 바꿔야 한다. 원문은 해당 편의 `02_production/reviews/` 아래 별도 파일에 보존한다. 경로는 저장소 상대 경로, 해시는 실제 파일의 SHA256이다.

```json
{
  "review": {
    "schema": "scene-review@1",
    "reviewer": {"id": "실제 scene-judge 세션 식별자", "independent": true},
    "experience": {
      "artifact_sha256": "시안 해시",
      "raw_report": {"path": "news/<id>/02_production/reviews/scene-a-experience.md", "sha256": "원문 해시"},
      "observation": "실물에서 먼저 읽힌 대상·관계·변화와 확인하지 못한 범위",
      "tool": "실제로 사용한 관찰 도구"
    },
    "intent": {
      "artifact_sha256": "같은 시안 해시",
      "raw_report": {"path": "news/<id>/02_production/reviews/scene-a-intent.md", "sha256": "원문 해시"},
      "observation": "초견과 발화·사실·계획의 일치 또는 차이",
      "tool": "실제로 사용한 관찰 도구",
      "verdict": "pass",
      "reference_observation": "이번 장면에 적용한 설명·합성·미술 기준과 실제 차이",
      "text_observation": "고정 자막의 분절 및 추가 문구 의존·읽기 부담",
      "explanations": [{
        "moment_id": "해당 moment id",
        "observed_subject": "실제로 식별된 대상",
        "observed_action": "화면에서 읽힌 작용 또는 비교 관계",
        "observed_result": "실제로 보인 결과",
        "text_dependency": "설명을 글자로 대신 읽어야 했는지",
        "basis": "observed",
        "verdict": "pass"
      }]
    },
    "rechecks": []
  }
}
```

- `intent.verdict`: pass / changes_requested / unverified. 핵심 설명이나 미술·읽힘에 미해결 결함이 있으면 pass로 하지 않는다.
- `explanations`: 선택한 개념의 모든 moments를 대조한다. 각 verdict는 pass / changes_requested / unverified, basis는 observed / code_inference / unverified다. 코드 추론으로 pass를 쓰지 않는다.
- **정지 시안에서 motion_required인 moment는 unverified**다. 구도·재료·읽힘을 충분히 확인하면 still 자체는 usable일 수 있지만 동작 의미는 후속 motion에서 확인한다. `@3`에서 이 still은 제작자가 확인하며 독립 검수 원문을 요구하지 않는다. 정적 비교에는 불필요한 동작 검수를 요구하지 않는다.
- 동작 전체를 실제 확인하지 못했으면 usable로 쓰지 않는다. 표본도 보지 못했다면 unverified를 유지한다. 실제 표본과 독립 검수가 있으면 아래 provisional을 쓸 수 있다. 관측 수단 부재를 문서 작성으로 해결하지 않는다.
- 결함이 있으면 report.verdict를 revise로 기록하고 finish한다. 관찰에 문제를 구체적으로 남기고 가능한 검수 원문도 연결한다. 미검수·수정 필요 보고서는 usable용 review가 없어도 보존할 수 있다. 이때 아직 없는 원문 경로나 잘못된 해시는 근거로 결합하지 않으며, 그 자리 표시 때문에 결함 관찰 자체의 기록을 막지 않는다. usable로 바꿀 때는 원문을 실제로 확보해야 한다.
- 수정은 원고·재료·표현 수단·구도·동작 중 원인을 바꾸고, 새 파일명으로 다시 렌더한다. 같은 단계의 미해결 revise는 오래된 시안이어도 intent에 남는다. 이미 실제 재확인으로 닫힌 지적을 매번 다시 작성하지 않는다. 새 검수의 `rechecks`에 `{ "receipt_id": "이전 revise 토큰", "verdict": "fixed", "observation": "현재 실물에서 무엇이 달라져 문제가 해소됐는지" }`로 연결해야 usable로 기록할 수 있다. 과거 문제를 목록에서 지우거나 새 렌더 존재만으로 해결하지 않는다.
- 원문 파일은 finish 때 결과 해시에 함께 보존한다. 수정·유실되면 해당 검수는 stale이다. 첫 장면 검수는 최종 전체 영상·음향 검수와 별개다.

이 검사는 관찰과 실제 결과의 연결·미해결 상태를 확인한다. 독립성·시청 사실·미술 품질을 JSON으로 자동 증명하지 않는다.

## 미해결 지적을 보존한 음성 착수

독립 검수에서 미해결 지적이 나와 `revise` 또는 `unverified`로 **이미 기록된 동작 합성 시안**이라도, 사용자가 그 문제를 알고 이 시안으로 음성 제작을 명시적으로 지시하면 `news/<id>/02_production/scene-admission.json`을 별도로 만든다. 렌더된 영상·관찰 JSON·검수 원문을 고치거나 같은 MP4를 새 버전으로 재등록하지 않는다. 이 예외는 `@2`·`@3`·`@4` 동작 장면에만 적용하고, 시안과 독립 검수 원문의 실제 해시를 대조한다. 엔진 갱신으로 `scripts/scene-proof.mjs`만 바뀐 과거 시안은 그 차이만 허용하며, 장면 컴포넌트·자료·설계·자막·실물·검수 근거가 달라지면 다시 차단한다. 정지 장면이나 단지 렌더만 끝난 미관찰 영상에는 적용하지 않는다.

```json
{
  "schema": "scene-admission@1",
  "decision": "narration-ready-with-issues",
  "phase": "motion",
  "concept_id": "<선택 concept id>",
  "proof_receipt_id": "<현재 scene_proof 영수증 id>",
  "artifact": "out/pilots/<id>/qa/<시안>.mp4",
  "artifact_sha256": "<실제 영상 해시>",
  "report_sha256": "<그 영수증의 관찰 JSON 해시>",
  "authority": "user",
  "instruction_quote": "<사용자의 실제 착수 지시 원문>",
  "known_issues": [
    {"moment_id": "<미해결 moment id>", "finding": "<검수에서 실제 지적한 문제>", "followup_stage": "P5"}
  ]
}
```

모든 미해결 moment를 `known_issues`에 연결하고, P5 또는 P7의 후속 확인 단계를 적는다. `produce resume`의 `context.work.first_scene`는 `admission_kind: narration-ready-with-issues`, `motion_continuity: incomplete`, `open_issues`를 노출한다. 이 기록은 **음성 begin만 허용**하고 시안의 `usable`·독립 검수의 `pass`·최종 화면 완료를 뜻하지 않는다. 후속 화면 검수에서 문제를 고치고, 최종 `review_visual` pass에는 각 문제의 `moment_id`·`finding`·`verdict: fixed`·실제 관찰·현재 화면 `evidence`를 `scene_admission_rechecks`에 연결해야 한다. P5에서 먼저 수정해도 최종 화면에서 다시 확인한다. 사용자 지시가 없거나 지적·원문·현재 시안 연결이 불완전하면 기존 차단을 유지한다.

## 연속 시청이 불가능한 동작 시안 — provisional

`first-core-scene@2`·`@3`·`@4` 편의 composite motion에만 적용한다. 생성된 MP4를 실제로 만들고, 그 MP4에서 시작·중간·끝 프레임을 PNG로 추출해 **실제로 확인**한다. 이미지만 자동 추출한 사실은 관찰이 아니다. 각 이미지는 해당 편 `news/<id>/02_production/reviews/` 아래에 보존하고 시각·저장소 상대 경로·SHA256을 `sampling.frames`에 기록한다. 크기·색을 가공하지 않은 PNG의 바이트를 현재 MP4의 해당 시각에서 다시 추출해 대조한다. 첫 표본은 시작에서 0.5초 이내, 마지막은 끝에서 0.5초 이내이며 중간 표본도 있어야 한다. 실제로 확인하지 못한 프레임 사이 연속성은 `sampling.unobserved`에 쓴다.

추출할 때는 `-ss`를 입력 MP4 앞에 두고 크기·색 변환 없이 PNG로 저장한다. 예를 들어 중간 표본은 다음과 같이 만든다. 시작·끝도 시각과 파일명을 바꿔 같은 방식으로 만든 뒤 `shasum -a 256`으로 각각의 해시를 기록한다.

```bash
mkdir -p news/<id>/02_production/reviews
ffmpeg -v error -y -ss 3.5 -i out/pilots/<id>/qa/core-motion.mp4 -frames:v 1 news/<id>/02_production/reviews/motion-3_5.png
```

```json
{
  "phase": "motion", "scope": "composite", "verdict": "provisional",
  "sampling": {
    "kind": "frames",
    "unobserved": "프레임 사이의 실제 연속 움직임과 매끄러움은 확인하지 못함",
    "frames": [
      {"second": 0, "path": "news/<id>/02_production/reviews/motion-0.png", "sha256": "실제 해시"},
      {"second": 3.5, "path": "news/<id>/02_production/reviews/motion-3_5.png", "sha256": "실제 해시"},
      {"second": 5.8, "path": "news/<id>/02_production/reviews/motion-5_8.png", "sha256": "실제 해시"}
    ]
  }
}
```

이 값은 기존 scene-proof 관찰 JSON에 포함한다. `review`의 experience·intent 원문과 해시도 usable과 같은 규칙으로 연결한다. 동작이 필요한 각 explanation은 `verdict: "unverified"`로 두고, `intent.verdict`도 `unverified`다. 보이는 표본에서 원인·변화·결과가 어긋나거나 이전 revise가 해결되지 않았다면 provisional로 넘기지 말고 revise로 기록하고 수정한다. `continuous_viewing: true`나 `viewed_seconds`를 함께 적지 않는다.

이 기록이 현재 상태면 `first_scene.ready`가 음성 착수에 대해 true가 되고 `motion_continuity: "incomplete"`와 `provisional_phases: ["motion"]`이 함께 남는다. `context.work.visual`에도 동작 확인 작업이 계속 표시된다. **최종 영상의 동작 검수 pass나 전체 영상 완료를 의미하지 않는다.** 실제 연속 시청 수단을 확보한 뒤 동일한 영상의 현재 판본을 확인하고 검수한다. 사용자에게 별도 확인을 요청하는 단계는 아니다.
