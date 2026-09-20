# overlays.json 스키마 v1.0 — 텍스트/그래픽층 (beats → overlays)

작성: 2026-08-27, 세션 "output". 입력: `beats.json` v1.0 + `substitutions.json`(input). 생성기: `scripts/make-overlays.mjs`.
비트마다 화면에 얹을 텍스트를 정한다: 자막 줄바꿈, 강조 토큰, 훅 헤드라인, 인용/CTA/엔드카드 카드, 출처 슬롯. 비주얼은 shots 몫.

원칙 3개
- **자막은 자막표기(`beats[].text`)를 그대로 쓴다.** 원고를 고치지 않는다 — 줄바꿈과 강조만 붙인다.
- **무음으로 읽어도 뜻이 통해야 한다.** 훅·인용·CTA 비트는 자막 대신 카드(큰 글자)가 텍스트를 담는다.
- **스타일 토큰은 이 파일의 `style`이 단일 소스.** 브랜드 자산 전까지 임시안(Pretendard, 남색 배경, 노랑 강조). 렌더 코드는 값을 하드코딩하지 않는다.

## 규칙

| # | 규칙 | 값 |
|---|---|---|
| 1 | 자막 줄바꿈 = **절 우선**: 구두점(`. , ? !` + 닫는 따옴표)으로 절 분할 → 6자 미만 절은 이웃과 병합 | min 6 |
| 2 | 18자 초과 절은 **의미 단위**로 분할(사용자 규칙 2026-08-28). 비용 = 줄 수×1000 + 짧은 줄(<6자)×100 + 구 중간 경계×150 + 최장 줄×2 + 편차×0.5 → 최소. 폭 계산에서 따옴표는 제외 | max 18 |
| 3b | **화면엔 한 번에 한 줄, 중앙 정렬.** 줄 in = 첫 단어 발화 −3f. 폭 상한은 크기별로 — 자막 18자(56px) · 인용 카드 17자(54px) · **CTA 13자(70px)** | — |
| 3c | 사용자 확정 줄바꿈 예시(회귀 케이스): "지금 지구 궤도를 도는 위성은 / 1만 6천 기" · "그런데 이 위성들이 / 밤하늘의 별을 지우고 있습니다" · "스페이스X가 띄운 / 인터넷 위성입니다" · "저궤도는 현대인의 생활에 / 엄청난 가치를 제공하는 / 천상의 해변과 같다" | — |
| 3 | 경계 비용 서열: **절대 안 끊음** = 속격+명사("밤하늘의 별을") / 관형형+의존명사("지우고 있다는 거", "유지해야 할 의무") / 부사어+관형동사("하늘에 남는") / 연결어미+보조용언("지우고 있습니다") / 숫자+숫자·"기" / 이름+"박사" / 용언+의존명사("유지해야 할"). **150** = 관형절 내부 주어+관형동사("스페이스X가 띄운")·구 중간·**목적어+동사**("별을 / 지우고" — 2026-08-29 사용자 개정: 절대 금지에서 완화, 의존명사 고립·3줄 같은 더 나쁜 대안이 있으면 여기서 끊는다). **120** = 관형형+명사("도는 위성은", "이끈 에노") — 조사 뒤 경계가 없을 때만 쓰인다. **0** = 주어·주제·부사어 조사(이/가/은/는/도/에서/에/로/만)·연결어미(면/고/며)·쉼표 뒤. 짧은 줄(<6자) 벌점 100 | — |
| 4 | 화면엔 **한 번에 한 줄, 중앙 정렬**. `caption.lines_timed[]` = `{text, token_start, token_count, start, end}` — in = 줄 첫 단어 `caption_words.start` − 3f, out = 다음 줄 in(마지막 줄은 비트 end). 슬라이드/시트는 전체 줄 정지 표시 | — |
| 5 | 강조 `emphasis[]`: 숫자 포함 토큰(`number`) / `substitutions.json`의 `text` 키로 시작하는 토큰(`number`) / `--terms` 용어로 시작하는 토큰(`term`). **`pop`은 핵심 수치(숫자 포함, 연도 제외)만 true** — 나머지는 색만(사용자 피드백 2026-08-28: 팝 전부 주면 과함) | 기본 terms: 스타링크, 우주거울, 유럽남방천문대 |
| 6 | 카드: `role=hook` → `headline`(text = 비트 텍스트, `kicker` null = 사용자 결정) / 따옴표로 시작·끝나는 비트 → `card.quote`(귀속은 같은 씬 앞 비트의 "○○ 박사") / `role=cta` → `card.cta` / `endcard` → `card.endcard`(text 비움) | — |
| 6b | **인용 카드는 카드로**(사용자 규칙 2026-08-28, "자막 방식이 아니라 잘 읽히게"): 같은 씬의 연속 인용 비트는 `card.block` **한 블록** — 앞 문장은 남고 이 비트 문장이 아래에 추가(`own_sentence`), 뒤 문장은 자리만 잡아 레이아웃 고정. 줄바꿈은 의미 단위 규칙(카드 54px → 17자), 중앙 정렬, 세로 중앙(`card.center_y` 0.5), 줄은 0.13s 간격 순차 등장, 귀속은 마지막 문장 비트에서 | — |
| 7 | `credit`는 슬롯만. shots.json이 에셋 출처를 채우고, 렌더는 `shot.credit ?? overlay.credit` | null |
| 8 | 편집 덮어쓰기 `overlays.overrides.json`(비트별 `card`/`headline`/`credit`). `caption` 덮어쓰기는 금지(원고). 예: b19·b20 인용 카드 = 기사 원문 문장 + "올리비에 에노 박사(연구 주도)" (facts #26·#27) | — |

## 형태

```json
{
  "schema_version": "1.0",
  "pilot": "hani_satellite_pollution",
  "root": "/…",
  "source": { "beats": "02_production/beats.json", "beats_generated_at": "…", "substitutions": "02_production/substitutions.json" },
  "style": {
    "font_family": "Pretendard",
    "colors": { "bg": "#0B0F1A", "text": "#FFFFFF", "muted": "#9AA4B2", "accent": "#FFD166", "quote": "#CFE3FF" },
    "sizes": { "headline": 84, "caption": 56, "card": 64, "attribution": 44, "credit": 32 },
    "safe": { "x": 80, "y": 100 },
    "caption": { "anchor_y": 0.66, "max_chars_per_line": 18, "min_chars_per_line": 6, "max_lines": 1, "line_height": 1.35, "rule": "clause-first" }
  },
  "overlays": [
    {
      "beat": "b04", "role": "body", "scene": "s03", "start_frame": 260, "duration_frames": 156,
      "caption": {
        "text": "2019년 스타링크가 시작된 뒤, 지금 지구 궤도를 도는 위성은 1만 6천 기.",
        "lines": ["2019년 스타링크가 시작된 뒤,", "지금 지구 궤도를 도는", "위성은 1만 6천 기."],
        "lines_timed": [ { "text": "2019년 스타링크가 시작된 뒤,", "token_start": 0, "token_count": 4, "start": 8.66, "end": 10.88 }, … ],
        "speech_start": 8.66, "speech_end": 13.5, "words": [ … ]
      },
      "headline": null,
      "emphasis": [ { "index": 0, "text": "2019년", "kind": "number" }, { "index": 1, "text": "스타링크가", "kind": "term" }, … ],
      "card": null,
      "credit": null
    }
  ]
}
```

## 렌더가 읽는 방식 (`src/pilot/Beat.tsx`)

| 요소 | 위치 | 크기 |
|---|---|---|
| 훅 헤드라인 | 상단 safe.y + 120 | `sizes.headline` 84, ExtraBold |
| 자막 | `1920 × caption.anchor_y` (≈1267px) | `sizes.caption` 56, Bold, 강조 토큰 = `colors.accent` |
| 인용 카드 | 세로 중앙 블록(두 문장 합산 높이 기준) | `sizes.card` 54, `colors.quote`, 중앙 정렬 + 귀속 38 |
| CTA 카드 | 중앙 | 84, 가운데 정렬 |
| 출처 | 좌하단 safe | 32, muted |

## 실행

```bash
node scripts/make-overlays.mjs <root>/02_production/beats.json     # → <root>/02_production/overlays.json
npm run sync -- <root>                                   # → pilots/<id>/, public/pilots/<id>/
npm run still:sheet -- <id>                                                  # → out/pilots/<id>/qa/beatsheet.png (전체 비트 격자)
npm run still:beat -- <id> --props='{"beatId":"b04","guides":true}'       # → out/pilots/<id>/qa/beat.png (1080×1920)
```
