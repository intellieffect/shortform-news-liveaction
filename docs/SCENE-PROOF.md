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
