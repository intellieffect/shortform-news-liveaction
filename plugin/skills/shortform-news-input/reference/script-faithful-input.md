적용 범위: 제공 완성 대본 준수·기존 input/output 분업의 참고 절차다. 기사 위임 제작의 기본 경로는 상위 SKILL.md를 따른다. 아래는 기존 운영 지침과 그 근거를 보존한 문서다.

# shortform-news-input

## 먼저 적용 경로를 확인한다

기사 기반의 위임 제작은 짝 스킬의 [표현 선택 권한](../../shortform-news-pipeline/reference/creative-authority.md)과 [editorial-concept 경로](../../shortform-news-pipeline/reference/editorial-concept-track.md)를 따른다. 원고·자료·표현은 제작자가 함께 선택하고 바꿀 수 있다. 이미 위임된 TTS·자료·세부 연출을 다시 승인받지 않는다. 아래의 기존 비트 경계·수집판/생성판 분리·클라이언트 확인 절차는 script-faithful 또는 해당 범위가 실제로 위임되지 않은 작업에만 적용한다.

한겨레 «위성공해» 파일럿에서 출발한 input 절차다. **이 스킬은 라우터** — 필요한 세부는 `reference/`와 저장소 `docs/`를 읽는다. 짝 스킬은 같은 플러그인의 `shortform-news-pipeline`이며 현재 모드의 정본·자료·근거를 함께 사용한다.

## 한 줄 원칙

1. **원문 보존.** 클라이언트 자료는 `news/<id>/01_input/`에 그대로. 파생물은 `02_production/`에만. 제공 완성 대본을 잠근 `script-faithful` 편은 고쳐 쓰지 않는다. 기사 기반 `editorial-concept` 편은 `facts.md` 안에서 대본을 편집하고 모든 판을 보존한다.
2. **근거 없는 숫자·고유명사·인용은 화면에 없다.** 모든 항목은 기사 문단 번호(¶)로 추적된다 (`facts.md`).
3. **자료 역할과 적합성을 먼저 정하고, 권리는 자산마다 읽고 기록한다.** 증거는 사실을 직접 보여주는 공식·라이선스 자료, 비유와 톤은 실사·생성·도해 중 설명력이 높은 수단을 고른다. `license · license_url · credit(원문) · origin_url` 없으면 외부 자료는 미확보다.
4. **현재 정본과 선택 근거를 연결한다.** `narration.json`(시간·텍스트), `assets.json`(자산), `facts.md`(근거)를 사용한다. editorial-concept는 story/concepts·자료 선택·현재 검수도 함께 읽고 원고와 표현을 왕복한다.
5. **모든 결정은 파일에.** raw → summary → index. 상대 세션 메시지도 `00_brief/analysis_*/raw_*.md`에 원문 누적.
6. **도구는 표현과 수정 비용으로 고른다.** React/SVG·3D·Motion Canvas·실사 중 관계를 가장 정확히 보여주고 발화 수정에 대응하기 쉬운 것을 쓴다. 외부 알파 클립은 납품 전 bbox를 실측한다.

## 어디를 읽나

| 하려는 일 | 읽을 것 |
|---|---|
| 자료 도착 → 입력 게이트(원본 저장·추출·MANIFEST·권리 추적) | [reference/intake.md](intake.md) |
| 사실 잠금 facts.md (문단 번호·대조·표기표·금지 항목) | [reference/facts.md](facts.md) |
| 치환표 → narration.txt → TTS → narration.json v1.1 | [reference/narration.md](narration.md) + `docs/../work/<pilot>/02_production/narration.schema.md` |
| 외부 자산 소싱(배경·오버레이·브리프 대응)과 라이선스 대장 | [reference/sourcing.md](sourcing.md) + `docs/asset-sourcing-workflow.md` |
| 그래픽 부품 소스·라이선스 게이트 | `docs/graphic-primitives-sourcing.md` · `docs/graphic-primitives-registry.md` · `docs/primitives.props.schema.v1.2.json` |
| output과의 경계·메시지·팩트 대조 리뷰 · **Motion Canvas 3단 왕복** | [reference/handoff.md](handoff.md) |
| 시작용 파일 뼈대·스크립트 | [templates/](../templates/) · [scripts/](../scripts/) |

## 두 경로 — 클라이언트가 무엇을 줬나

| 받은 것 | 경로 | 실측 |
|---|---|---|
| 기사 + **완성 대본** + 참고자료 | 대본 준수. **우리가 고쳐 쓰지 않는다.** 대본의 자막 열·화면 구성 제안·참고자료를 `cut_map`으로 옮긴다 | 1·2편 «위성공해» |
| **기사 URL 하나** | **대본·참고자료를 우리가 만든다.** `editorial-concept@1` 후보에서는 story/concepts와 자료 후보를 함께 설계하고 TTS 전에 독립 검수한다 | 3편 이후 자작 경로 · 2026-09-05 개선 기준편 4개 |

### 대본 자작 경로 (3편에서 확정)

클라이언트 대본이 없으면 "대본을 고쳐 쓰지 않는다"는 전제가 사라지고, **`facts.md`가 대본의 유일한 근거 장치**가 된다.

`editorial-concept@1`에서는 초안 A/B/C 택1과 중간 시트 승인을 의무로 두지 않는다. `creative_scope.script=delegated`이면 추천 원고 하나를 story/concepts·자료 후보와 왕복해 완성하고 `editorial-judge` 이슈를 내부 수정한다. 원고 잠금 뒤에만 TTS를 만들며, 이후 원고 수정은 새 WAV·자막·motion hash·SFX/ducking 갱신을 동반한다.

자산 요청은 문장별 빈칸 대신 `concept_id`, 전달할 관계, `representation.role`, 실사/도해/은유 후보와 기각 조건을 포함한다. 같은 자료가 여러 문장에 걸쳐 기준 대상으로 유지될 수 있다.

1. **제작용 문서를 우리가 쓴다.** 양식은 클라이언트가 줬던 것과 같게 — 썸네일 문구 / 타임라인 표(시간·내레이션·화면 구성·온스크린) / 러닝타임 / 제작 참고 메모 / 참고 자료 목록 / 클라이언트 확인 항목.
2. **컷마다 facts 항목 번호를 단다**(`#N`·`C`·`Q`). 대본이 우리 것이라 근거가 화면에 붙어 있어야 검증이 된다.
3. **러닝타임은 추정하지 말고 녹음 뒤에 잡는다** (450자/분, `reference/narration.md`).
4. **1차 출처를 먼저 찾는다.** 기사가 인용한 연구·기관의 보도자료가 CC BY면 게재 사진보다 먼저다 — 3편에서 ESO 보도자료가 통째로 CC BY 4.0이라 클라이언트 사진 의존이 4장 → 1장으로 줄었다.
5. **문서는 조립 단계마다 갱신한다.** 화면이 바뀌면 문서도 바뀐다 — 3편은 v1 → v3.3까지 갔고, 중간에 md만 고치고 html을 안 고쳐 두 벌이 어긋난 적이 있다.

## 최소 실행 경로 (파일럿 1편, input 쪽)

```
0. 자료 수령  gog gmail → 01_input/ 원본 저장 → textutil/unzip 추출 → MANIFEST.md (6항목 상태)
1. 입력 게이트 제공 자료의 원본·권리 추적(캡션 기관 직행) → 05_참고자료/INDEX.md · RIGHTS.md
2. 사실 잠금  facts.md — 문단 번호표, 사실 N항목(근거¶·대본 대조·화면 규칙), 표기·발음표, 대본 불일치, AI 금지
3. 원고       (클라이언트 대본 or 초안 A/B/C 선택) → substitutions.json(치환표) → narration.txt(낭독표기)
4. 내레이션   보이스 후보 샘플 → 선택 → scripts/make_narration.py → audio/narration.wav + narration.json v1.1
              (사람 WAV면 whisperx 강제정렬로 같은 형태)
5. 자산 1차   제공 자료 등록 → 01_input/assets.json (assets[] 6항목 + overlay_assets[])
   ── output: beats.json → npm run gaps → asset_gaps.json / asset_brief.json ──
6. 자산 2차   gaps·brief 대응 → 5단계 소싱 **+ 회수 후보·소진 판정 문서까지 이때 한 번에 — 시트 전 완료가 게이트**(두 판 체계: 시트·v1 = 수집판, 생성은 3′ 대상 확정 후 v2 에서만, 2026-08-31) → external_assets/<source>/ + SOURCES.md + assets.json
7. 리뷰       output 렌더마다 facts 대조(규칙 번호로 회신), 줄바꿈·인용·크레딧 파리티
8. 기록       credit_log.md(생성·API 과금), raw_*.md(세션 메시지), Linear 이슈 코멘트(수령·확인 항목)
```

## 클라이언트 확인 항목 (통화·메일로 닫는 것)

기사 메타(기자·게재일·URL) · 내레이션 WAV 없을 때 TTS 허용 · 자료 사용권·크레딧 형식 · 브랜드 자산 · 담당자 5역. `MANIFEST.md` 절차 5에 누적하고 Linear 이슈 코멘트로 올린다.
