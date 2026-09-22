# decisions.jsonl — 사람 게이트 원장 스키마

`pilots/<id>/qa/decisions.jsonl`, append-only. 기록은 **main 이** 회신 받은 턴에 한다(사용자 타이핑 0). 원 행 수정 금지 — 번복은 `premise_fail` 새 행. **게이트 종료 = 이 파일 커밋.** 도구: `npm run gate:log`(present·decide·to-defects) · `npm run gate:metrics`.

## 행 2종

```json
{ "t": "present", "gate": "3", "round": 1, "card": "qa/gate3-card.md", "ts": "…" }
{ "t": "decide",  "gate": "3", "round": 1, "presented_at": "…", "decided_at": "…", "elapsed_min": 4.5,
  "async": false, "items": [ { "row_id": "b20", "decision": "reject", "reason": "같은 클립 뒤쪽 재탐색" } ],
  "verbatim": "사용자 발화 원문 그대로 — 의역 금지" }
```

- `gate`: `"1"`~`"7"`, 또는 `"-"` = **게이트 밖 발화**(임의 시점의 지시·발견도 원장에 들어간다).
- `present` 를 제시 시점에 먼저 찍어야 대기(`elapsed_min`)가 측정된다 — 안 찍으면 null.
- `decision` 어휘: `approve` `reject` `hold` `defer` `explicit_absorb`(⑦ 청산표 현상 확정) `free_find`(자유 발견) `premise_fail`(제시 전제가 틀렸음 — G10형, 틀린 쪽은 main 의 제시다) `direct`(지시).
- `verbatim` 빈 값은 도구가 거부한다.

## defects.json 연결

`reject` · `free_find` · `premise_fail` 행은 `gate:log to-defects <id> [--write] [--prefix pN]` 이
결함 장부 행(found_by:human, guard:null = 승격 대기, `decision_ref` 로 역참조)으로 변환한다.
변환 후 `npm run eval:defects` 로 재채점. 근거 설계: `docs/research/2026-09-04-eval-harness/gates-spec.md` (과거 내부 기록·로컬 보관).
