# beats.json 스키마 v1.0 — 시간층 (output 내부, narration → beats)

작성: 2026-08-27, 세션 "output". 입력: `narration.json` v1.1 (input 세션, `narration.schema.md`). 생성기: `scripts/make-beats.mjs`.
비트 = 컷의 최소 단위. overlays/shots/audio는 이 파일의 `beats[]`만 참조한다. narration.json이 바뀌면(sha256) 재생성.

원칙 3개
- **시간은 narration.json의 초를 그대로 쓰고, 프레임은 여기서 처음 붙는다** (`fps` 필드). `end_frame(i) == start_frame(i+1)` 연속성 보장.
- **비트 텍스트는 자막표기**(`caption_words` 우선, 없으면 `words`). 낭독표기는 쓰지 않는다.
- **훅·CTA·엔드카드 역할은 여기서 정한다.** 강조·자막 줄바꿈은 overlays 몫, 비주얼 선택은 shots 몫.

## 분할 규칙

| # | 규칙 | 값 |
|---|---|---|
| 1 | 문장 → 절: 토큰이 `. ? !`(닫는 따옴표 허용)로 끝나면 절 경계 | — |
| 2 | 절이 `max_sec` 초과면 쉼표 토큰에서 재분할. 양쪽 모두 `min_sec` 이상, 최대 조각이 가장 짧아지는 쉼표 선택, 재귀 | max 5.0 / min 1.2 |
| 3 | 쉼표가 없어 못 나누면 그대로 두고 `warnings[]`에 `over_max` | — |
| 4 | 타임라인: `start` = 앞 비트의 `end`(첫 비트 0), `end` = 다음 비트의 `speech_start`. 문장 사이 무음은 **앞 비트가 화면을 유지**(`gap_policy: preceding`) | — |
| 5 | 마지막 발화 비트 `end` = `audio.duration`, 그 뒤 `endcard` 비트 `endcard_sec` 추가 | 2.5 |
| 6 | 역할: 첫 비트 `hook`, 마지막 발화 비트가 `?`로 끝나면 `cta`, 나머지 `body`, 꼬리 `endcard` | — |
| 7 | `duration < min_sec`면 `under_min` 경고 (합치지 않는다 — shots에서 판단) | — |
| 8 | 규칙 2·3의 초과 판정은 **발화 구간** 기준. 무음 포함 화면 점유(`duration`)가 5초를 넘는 비트(예: b04 5.22s)는 경고 없음 — 3~5초 화면 변화 규칙은 shots가 켄번스로 처리 | — |

## 형태

```json
{
  "schema_version": "1.0",
  "pilot": "hani_satellite_pollution",
  "root": "/…/work/hani_satellite_pollution",
  "generated_at": "…",
  "source": { "narration": "02_production/narration.json", "narration_sha256": "…" },
  "fps": 30,
  "rules": { "max_sec": 5.0, "min_sec": 1.2, "endcard_sec": 2.5, "gap_policy": "preceding" },
  "audio": { "path": "02_production/audio/narration.wav", "duration": 64.3 },
  "total_frames": 2004,
  "stats": { "beats": 21, "scenes": 11, "min": 1.56, "max": 5.22, "mean": 3.062 },
  "warnings": [],
  "beats": [
    {
      "id": "b01", "role": "hook",
      "scene": "s01", "sentence_index": 0, "clause": 1, "piece": null,
      "text": "스타링크, 들어보셨죠?",
      "speech_start": 0.36, "speech_end": 1.8,
      "start": 0, "end": 2.04, "duration": 2.04,
      "start_frame": 0, "end_frame": 61, "duration_frames": 61,
      "words": [ { "text": "스타링크,", "start": 0.36, "end": 1.0 }, … ]
    }
  ]
}
```

## 필드 규칙

| 필드 | 규칙 |
|---|---|
| `id` | `b01`… 순서 기반. 재생성 시 바뀔 수 있으므로 다른 층은 `scene`+`clause`+`piece`로도 참조 가능하게 둔다 |
| `role` | `hook` \| `body` \| `cta` \| `endcard` |
| `scene` | 원 문장 id(`s01`…). 씬 = 문장. shots는 같은 `scene` 안에서 비주얼 연속성을 우선 |
| `clause`, `piece` | 문장 내 절 번호(1부터), 절 내 쉼표 분할 조각 번호(분할 없으면 `null`) |
| `text` | 자막표기 토큰을 공백 join. overlays의 자막 원문 |
| `speech_start/end` | 실제 발화 구간. 자막 표시 타이밍은 이걸 쓴다 |
| `start/end` | 화면 점유 구간(무음 포함). shots의 컷 구간은 이걸 쓴다 |
| `*_frame` | `Math.round(sec × fps)`. `<Sequence from={start_frame} durationInFrames={duration_frames}>` 에 1:1 |
| `words` | 해당 비트의 자막표기 토큰 슬라이스(타임스탬프 포함). overlays의 단어 강조용 |
| `kw[]` | 이 비트 문장에 등장하는 **화제 키워드**. `facts.md` 「화제 키워드」 절의 `낱말`+`표기 변이`로 부분 문자열 매칭해 `make-beats` 가 붙인다. 절이 없는 편에는 필드 자체가 없다(옛 편 호환) |
| `stats.kw` | `{total, spoken}` — 표의 낱말 수와 그중 내레이션에 한 번이라도 나온 수. 절이 없으면 `null` |
| `warnings[]` | `over_max` / `under_min` / **`kw_unspoken`**(기사 화제인데 내레이션이 한 번도 말하지 않는 낱말 — 원고에서 뺀 판단인지 확인). 렌더를 막지 않는다 — shots에서 켄번스·인서트로 보정할지 결정 |

## 실행

```bash
node scripts/make-beats.mjs <root>/02_production/narration.json            # → <root>/02_production/beats.json
node scripts/make-beats.mjs … --fps 30 --endcard 2.5 --max 5.0 --min 1.2 --out path
```

## 다음 층이 받는 것

- overlays.json: `beats[].text`, `words`, `speech_start/end`, `role` (hook → 헤드라인, cta → 질문 카드)
- shots.json: `beats[].start_frame/duration_frames`, `scene`, `warnings`(over_max면 모션 필요)
- audio.json: `beats[].start`(컷 지점 SFX), `role=endcard` 구간(BGM 페이드아웃)

## 자료 공백 (②시점 트리거)

beats 확정 직후 `node scripts/asset-gaps.mjs <root>` → `<root>/02_production/asset_gaps.json`. `assets.json`(assets + external_assets)의 `sentence_fit`에 씬(s01…)이 한 번도 안 나오는 비트를 `needs_asset: true`로 표시한다. input은 이 목록으로 외부 소스 확보(asset-sourcing-workflow §②)를 시작하고, output은 shots.json에서 그 비트만 `generated`/`remotion`/`none`으로 채운다. shots.json이 이미 있으면 실제 배정도 함께 대조한다.
