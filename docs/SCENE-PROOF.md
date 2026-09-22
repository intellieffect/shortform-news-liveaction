# 초기 장면 시안 — scene-proof

음성·timeline·sync 이전에 **실제 공통 자막 런타임과 실제로 선택한 자료**로 짧은 합성 시안을 만든다.
구도·미술·정보 위계를 먼저 확인하기 위한 것이며, 판정은 제작자·검수자가 실물을 본 뒤 직접 적는다.
절차와 기록 규칙의 정본은 [발화→화면 제작](../plugin/skills/shortform-news-pipeline/reference/visual-production.md)이다. 이 문서는 도구 사용법만 적는다.

```bash
node scripts/scene-proof.mjs <id> --phase still  --output out/pilots/<id>/qa/scene-a.png --frame 45
node scripts/scene-proof.mjs <id> --phase motion --output out/pilots/<id>/qa/scene-a-motion.mp4
```

`--frame`은 still에만 쓰며 기본값 0이다. 관찰 JSON은 `--output`의 확장자만 `.json`으로 바꾼 경로에 쓴다.

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
3. **렌더 전에** `produce`의 `scene_proof` 시도를 연다. 실패하면 그 시도를 fail로 닫는다.
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

제작자가 실물을 본 뒤 `verdict`/`observation`/`tool`을 고치고, 동작을 실제로 이어 봤을 때만 `continuous_viewing`과 실제 `viewed_seconds`를 더한다. 그다음 기존 절차로 닫는다.

```bash
npm run produce -- finish <id> <token>
```

스크립트는 "사용 가능"을 스스로 기록하지 않는다. 자동 렌더 기록은 시청 사실·품질·최종 독립 검수를 대신하지 않으며, 자막 시각은 음성 확정 후 다시 확인해야 한다.

## 검사

```bash
node --test scripts/tests/scene-proof.test.mjs
```

## 새 제작의 초기 독립 검수 — first-core-scene@2

`@2`로 시작한 편은 `usable`을 기록하기 전에 지정 `shot-judge`의 초견 관찰과 의도 대조를 연결한다. 기존 `@1` 편은 계약을 소급 변경하지 않는다. 렌더가 끝나 관찰 JSON과 실물이 있으면 **열린 토큰 상태에서도** 다음 입력을 받을 수 있다. 검수를 받으려고 먼저 usable/finish를 기록하지 않는다.

```bash
node scripts/produce.mjs review-input <id> --source scene --phase experience
# 지정 shot-judge에게 이 입력과 실제 확인 도구만 전달 → 초견 원문 보존
node scripts/produce.mjs review-input <id> --source scene --phase intent
# 같은 검수자에게 초견 원문 + intent 입력 전달 → 대조 원문 보존
# 실제 응답을 아래 review로 관찰 JSON에 연결한 뒤 finish
npm run produce -- finish <id> <token>
```

`experience`에는 시안 경로·해시·기술 정보만 제공한다. `intent`는 원고·사실·개념·자막 시점·자료 선택 기록과 공통 레퍼런스, 같은 장면·단계의 이전 revise를 제공한다. 같은 artifact 해시를 확인한다. 첫 응답은 다음 대조 응답으로 덮어쓰지 않는다. 같은 응답을 다른 파일명으로 복사해 두 단계 검수로 기록하지 않는다. 이미 제작 의도를 본 검수자라면 노출 사실을 원문에 밝힌다.

기존 `scene-proof@1` 관찰 JSON에 `review`를 더한다. 아래 문자열은 작성 예시이며 실제 관찰로 바꿔야 한다. 원문은 해당 편의 `02_production/reviews/` 아래 별도 파일에 보존한다. 경로는 저장소 상대 경로, 해시는 실제 파일의 SHA256이다.

```json
{
  "review": {
    "schema": "scene-review@1",
    "reviewer": {"id": "실제 shot-judge 세션 식별자", "independent": true},
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
- **정지 시안에서 motion_required인 moment는 unverified**다. 구도·재료·읽힘을 충분히 확인하면 still 자체는 usable일 수 있지만 동작 의미는 후속 motion에서 확인한다. 정적 비교에는 불필요한 동작 검수를 요구하지 않는다.
- 동작 전체를 실제 확인하지 못했으면 report.verdict는 unverified를 유지한다. 관측 수단 부재를 문서 작성으로 해결하지 않는다.
- 결함이 있으면 report.verdict를 revise로 기록하고 finish한다. 관찰에 문제를 구체적으로 남기고 가능한 검수 원문도 연결한다. 미검수·수정 필요 보고서는 usable용 review가 없어도 보존할 수 있다. 이때 아직 없는 원문 경로나 잘못된 해시는 근거로 결합하지 않으며, 그 자리 표시 때문에 결함 관찰 자체의 기록을 막지 않는다. usable로 바꿀 때는 원문을 실제로 확보해야 한다.
- 수정은 원고·재료·표현 수단·구도·동작 중 원인을 바꾸고, 새 파일명으로 다시 렌더한다. 같은 단계의 미해결 revise는 오래된 시안이어도 intent에 남는다. 이미 실제 재확인으로 닫힌 지적을 매번 다시 작성하지 않는다. 새 검수의 `rechecks`에 `{ "receipt_id": "이전 revise 토큰", "verdict": "fixed", "observation": "현재 실물에서 무엇이 달라져 문제가 해소됐는지" }`로 연결해야 usable로 기록할 수 있다. 과거 문제를 목록에서 지우거나 새 렌더 존재만으로 해결하지 않는다.
- 원문 파일은 finish 때 결과 해시에 함께 보존한다. 수정·유실되면 해당 검수는 stale이다. 첫 장면 검수는 최종 전체 영상·음향 검수와 별개다.

이 검사는 관찰과 실제 결과의 연결·미해결 상태를 확인한다. 독립성·시청 사실·미술 품질을 JSON으로 자동 증명하지 않는다.
