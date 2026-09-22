# 그래픽 프리미티브 레지스트리 v1 (제안 → 2026-08-28 output 채택·구현 중)

> **정본 이관**: 기계값은 output 저장소 `shortform-news-workflow/docs/specs/primitives.registry.v1.json`, 구현은 `src/lib/primitives/` (2026-08-28 4-3 ①). 이 문서와 옆의 .v1.json은 초안 보관본.

작성: 2026-08-28 10:20 KST, 세션 "input". 기계값: `graphic-primitives-registry.v1.json`. 구현·승격 관리: output.

## 왜

화살표·카운터·태그·와이프 같은 **부품**이 지금 세 곳에 흩어져 편마다 다시 태어난다:
- 직전 파일럿 `claude-remotion/src/Overlays.tsx` — badge·card·measure·arrow·path·ellipse·dot·link·compare·text (10종, 코드)
- `reel-news/docs/patterns/` — SF-P01~P16 의미 패턴 23키 (부품이 아니라 조합). **이관 전 다른 저장소의 원본이며 이 저장소에는 없다.**
- 이번 파일럿 `overlays.json`·`shots.json` — caption·emphasis·headline·card·credit·label_overlay·split·wipe (인라인)

## 3층

```
episode (overlays.json / shots.json)  ──참조──▶  primitive id ("counter@1")
pattern (SF-P 레지스트리)               ──참조──▶  primitives: ["counter@1","headline@1"]
primitive (src/lib/primitives/*.tsx)   ◀── style 토큰 주입 (font·colors·sizes·safe)
```

- **프리미티브는 props만.** 텍스트·숫자·좌표는 episode 데이터에서, 폰트·색·크기·안전영역은 style 토큰에서. 컴포넌트 안에 하드코딩 금지.
- **id = name@version.** props 호환이 깨지면 version+1, 옛 id는 deprecated로 남긴다 (패턴 레지스트리의 exact key 규칙과 동일).
- **승격은 기존 루프 재사용.** candidate(1편 승인) → provisional(다른 편 exact 재사용) → standard(3편). W4 재사용 검색 → W10 심사 그대로.

## 초안 등록 26개

| 카테고리 | id | 상태 | 출처 |
|---|---|---|---|
| text | caption@1 · emphasis@1 · badge@1 · text@1 | provisional | moon32 |
| text | headline@1 · quote_card@1 · cta_card@1 · label_tag@1 · credit_tag@1 | candidate | 위성공해 |
| number | compare@1 · measure@1 | provisional | moon32 |
| number | counter@1 | candidate (미구현) | 위성공해 b06 |
| pointer | arrow@1 · path@1 · ellipse@1 · dot@1 · link@1 | provisional | moon32 |
| frame | crop_frame@1 · breath@1 | provisional | 위성공해 / reel04 |
| frame | split@1 · endcard@1 | candidate | 위성공해 |
| motion | kenburns@1 | provisional | moon32→위성공해 |
| motion | wipe@1 | candidate | 위성공해 b10 |
| effect · transition | dim_gradient@1 · fade@1 | candidate | 위성공해 |

각 항목의 props·style_tokens·rules·evidence는 JSON. 규칙 예: `arrow@1`은 위치·방향 지시 전용, 기사에 없는 인과 표현 금지(facts #25). `counter@1`은 중간값이 사실로 읽히지 않게(내역 노출 금지, facts #6). `label_tag@1`은 시뮬레이션·예측 이미지에 필수.

## 등록 필수 필드

`id · category · status · born_in · props · style_tokens · rules · evidence` (+ `replaces`). evidence = 렌더 산출물 경로(비트 시트·QA 리뷰). evidence 없는 항목은 등록 불가.

## 위치 제안

- 코드: output 저장소 `src/lib/primitives/<name>.tsx` (Overlays.tsx 10종 이관 + 신규 12종)
- 레지스트리: `docs/specs/primitives.registry.v1.json` (이 파일을 옮김)
- 패턴 링크: reel-news 패턴 레지스트리에 `primitives[]` 필드 추가 (JSON `pattern_link` 참조)
- 검증: check-shots/check-overlays가 "참조한 primitive id가 레지스트리에 있고 status ≠ deprecated"를 확인

## 순서 (이번 편에서)

1. 이번 파일럿 overlays/shots가 쓰는 8종(caption·emphasis·headline·quote_card·credit_tag·label_tag·split·wipe)을 먼저 컴포넌트로 분리 — 렌더 전, 인라인일 때가 제일 싸다
2. Overlays.tsx 10종 이관 (moon32 evidence 그대로)
3. counter@1·endcard@1 구현 (b06·b22)
4. 다음 편부터 새 부품은 레지스트리 등록 없이는 못 쓴다

## 파일 기반 효과 자산 (kind: asset) — 2026-08-28 추가

> 소스 지도·라이선스 실측은 `graphic-primitives-sourcing.md` (2026-08-28) — 부품 카테고리별 1·2순위 소스, 소스별 약관 실측, 참고 전용 목록, 가져오기 절차.

프리렌더 VFX(알파 MOV 화살표·버스트·라인·트랜지션)는 코드 부품이 아니라 **파일**이다. 레지스트리엔 `category: effect, kind: asset, layer: shots`로 두고, shots.json의 visual과 같은 경로(file · license · credit · origin_url)로 검증기가 읽는다 (output 합의).

### 라이선스 게이트 — FootageCrate / ProductionCrate (terms.html 2026-08-28 실측)

| 항목 | 내용 |
|---|---|
| 상업 사용 | 허용 (필름·광고·유튜브·SNS·"video contract work") |
| 크레딧 | **의무 아님** ("We do not require attribution in Productions, although we may request attribution from users with free accounts where feasible") |
| 무료 계정 | 5 다운로드/일, 기본 라이브러리만(별표 = PRO 전용), 해상도 제한 |
| **법인·클라이언트 작업** | **"Use of a Free, Personal, or Pro-tier account to perform work for, on behalf of, or in furtherance of the objectives … of any corporation, enterprise, institutional entity, or employer constitutes a material breach. Corporate or institutional use requires a valid Enterprise License."** |
| 금지 | 재배포·스톡 재판매·템플릿 포함·AI 학습. 자산 소유권은 ProductionCrate (CC 아님) |

→ **한겨레 용역(인텔리이펙트 법인 작업)에는 Free/Pro 계정으로 쓸 수 없다. Enterprise License 없이는 불가.** 개인 실험·스타일 탐색엔 Free 가능.

### 대안 (법인 작업 가능)

| 소스 | 라이선스 | 비고 |
|---|---|---|
| **Remotion 코드 부품** (arrow@1·path@1·burst 신규) | 자체 | 파라메트릭·스타일 토큰 일치·무제한. 화살표·라인·강조 버스트는 이쪽이 정답 |
| Mixkit (Envato) | Mixkit License — 상업·법인 OK, 크레딧 불요 | 알파 없는 오버레이 영상 위주 |
| Pixabay 영상 | Content License | 파티클·라이트릭 등 오버레이용 있음(알파 없음, 스크린 블렌드) |
| LottieFiles 무료 | Lottie Simple License — 상업 OK | 벡터 애니메이션(화살표·아이콘). Remotion에서 `@remotion/lottie`로 재생, 색·크기 토큰 주입 가능 |
| ProductionCrate Enterprise | 별도 계약 | 필요해지면 견적 |

원칙: **선을 긋고 가리키는 것(화살표·브래킷·경로)은 코드**, **질감·입자·빛(버스트·먼지·플레어)은 파일**. 파일 자산은 `external_assets/vfx/` + SOURCES.md 등록, 레지스트리에 id (`burst_soft@1` 등)로 올려야 shots에서 참조 가능.
