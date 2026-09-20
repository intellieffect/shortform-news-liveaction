#!/usr/bin/env node
// beats 확정 시점의 "자료 없는 비트" 목록 — 외부 소스 확보(②시점)의 트리거.
// assets.json(assets + external_assets)의 sentence_fit 에 씬이 없으면 needs_asset. shots.json 이 있으면 실제 배정도 대조.
// 사용: node scripts/asset-gaps.mjs <root> [--dry]   → <root>/02_production/asset_gaps.json (--dry 는 쓰지 않고 출력만)
//
// 2026-09-02 (6편 G4): `is_real_observation:false` 를 「자산 아님」으로 읽어 시뮬레이션·상상도가 1차 자산인 편에서
// 레지스트리가 통째로 비었다(gaps 27 = 전 비트). 실사 여부는 **라벨의 문제**(rules §5b)이지 확보의 문제가 아니다 —
// 이제 비실사도 후보로 세고, 후보가 전부 비실사인 비트는 `non_real_only` 로 따로 표시한다(가드레일 라벨 대상).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const root = argv.find((a) => !a.startsWith("--")) && resolve(argv.find((a) => !a.startsWith("--")));
if (!root) {
  console.error("usage: asset-gaps.mjs <pilot root>");
  process.exit(2);
}
const J = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const B = J("02_production/beats.json");
const A = J("01_input/assets.json");
const shotsPath = join(root, "02_production/shots.json");
const S = existsSync(shotsPath) ? JSON.parse(readFileSync(shotsPath, "utf8")) : null;

const registry = [...(A.assets ?? []), ...(A.external_assets ?? []), ...(A.brief_assets?.free ?? [])].filter((a) => a.rights_status !== "rejected" && a.rights_status !== "unused"); // 기각·미사용분만 제외 — 비실사는 후보다(라벨로 다룬다)
const isReal = (a) => a.is_real_observation !== false;
const realById = new Map(registry.map((a) => [a.id, isReal(a)]));
// 적합 매핑 두 경로(둘 다 지원, v1.2 추가 필드): ① sentence_fit: ["s01", …] ② cut_fit: {primary:["C1"], alt:["C2"]} + 상단 cut_map[C].sentences
const cutScenes = (c) => A.cut_map?.[c]?.sentences ?? [];
const fitByScene = new Map(); // sid → [{id, tier}]
const add = (sid, id, tier) => fitByScene.set(sid, [...(fitByScene.get(sid) ?? []), { id, tier }]);
for (const a of registry) {
  for (const sid of a.sentence_fit ?? []) add(sid, a.id, "fit");
  for (const c of a.cut_fit?.primary ?? []) for (const sid of cutScenes(c)) add(sid, a.id, "primary");
  for (const c of a.cut_fit?.alt ?? []) for (const sid of cutScenes(c)) add(sid, a.id, "alt");
}
const shotByBeat = new Map((S?.shots ?? []).map((s) => [s.beat, s]));

// ── 자료 종류 판정 (2026-09-03) — 소싱을 3갈래로 나누려면 gaps 가 종류를 말해야 한다.
// 지금까지는 사람이 눈으로 갈랐다. 근거는 **비트 문장**이지 취향이 아니다:
//   ① 이미 배정이 있으면 그 종류를 따른다(재소싱은 같은 자리를 채운다)
//   ② 문장이 **동사·변화**를 말하면 영상 — 정지 이미지로는 그 동사를 수행하지 못한다(rules §10)
//   ③ 수치·비율·구조를 말하면 도해 — 실사가 없어서가 아니라 형태로 그려지는 것(3단 판정 tier 1)
//   ④ 나머지는 **영상**(기본) — rules §10 「배경은 그 비트의 키워드를 수행한다(동사 포함)」.
//      7편 실측 영상 20 / 사진 4. 사진이 기본이면 16건이 사진으로 떨어져 분배가 거꾸로 된다.
//      **이건 판정이 아니라 분배 힌트다** — shots 가 생기면 그 배정이 이긴다.
// CTA·전환처럼 payload 가 없는 비트는 null — 소싱 대상이 아니다.
const MOTION = /움직|돌|회전|흐르|퍼지|번지|늘어|줄어|자라|기울|쏘|날|떠오|가라앉|터지|폭발|충돌|지나|통과|가리|드러나|열리|닫히|밀려|빨려|발사|이륙|착륙|전개|펼쳐|접히|가는 중|다가|멀어/;
const DIAGRAM_WORD = /배[ ]?|퍼센트|%|비율|지름|반지름|크기|넓이|면적|거리|개수|몇 개|분포|구조|단면|비교|같[다습]|차이/;
const NUMBER = /\d/;
const kindOf = (b, shot) => {
  if (b.role === "endcard") return null;
  if (shot?.visual?.type === "video") return "video";
  if (shot?.visual?.type === "image") return "photo";
  const t = b.text ?? "";
  if (!t.trim()) return null;
  if (MOTION.test(t)) return "video";
  if (NUMBER.test(t) && DIAGRAM_WORD.test(t)) return "diagram";
  if (DIAGRAM_WORD.test(t)) return "diagram";
  if (/^(여러분|댓글|이 |그리고 |그런데 )/.test(t.trim())) return "photo"; // CTA·전환은 정지로 충분
  return "video";
};

const rows = B.beats
  .filter((b) => b.role !== "endcard")
  .map((b) => {
    const fits = fitByScene.get(b.scene) ?? [];
    const candidates = [...new Set(fits.map((f) => f.id))]; // sentence_fit + cut_fit 이중 등재 시 중복 제거
    const primary = [...new Set(fits.filter((f) => f.tier === "primary").map((f) => f.id))];
    const shot = shotByBeat.get(b.id);
    const assigned = shot ? `${shot.visual.type}/${shot.visual.source}${shot.visual.asset ? ":" + shot.visual.asset : ""}` : null;
    const realAssigned = shot ? ["provided", "external", "stock"].includes(shot.visual.source) : false;
    return {
      beat: b.id,
      scene: b.scene,
      text: b.text,
      kind: kindOf(b, shot),   // video | photo | diagram | null — sourcing 3갈래 분배의 기준
      kw: b.kw ?? [],          // 이 비트에 걸린 화제 키워드(facts.md 「화제 키워드」 절 → beats.json). **검색어는 여기서 나온다**
      duration: b.duration,
      candidates,
      primary,
      assigned,
      needs_asset: !realAssigned && candidates.length === 0,
      needs_primary: !realAssigned && candidates.length > 0 && primary.length === 0, // alt 후보만 있음(cut_fit 판정 대기)
      non_real_only: candidates.length > 0 && candidates.every((id) => realById.get(id) === false), // 후보가 전부 시뮬레이션·상상도 → 종류별 첫 등장에 가드레일 라벨(rules R5b-05)
      note: shot && !realAssigned ? (shot.visual.source === "none" ? "의도적 텍스트만" : shot.visual.source) : null,
    };
  });

const out = {
  schema_version: "1.0",
  pilot: B.pilot,
  generated_at: new Date().toISOString(),
  source: { beats: "02_production/beats.json", assets: "01_input/assets.json", shots: S ? "02_production/shots.json" : null },
  registry_size: registry.length,
  gaps: rows.filter((r) => r.needs_asset).map((r) => r.beat),
  // 종류별 공백 — `@agent-shortform-news:sourcing` 세 개에 그대로 나눠 준다(도해는 소싱 대상이 아니다)
  gaps_by_kind: ["video", "photo", "diagram"].reduce((a, k) => ({ ...a, [k]: rows.filter((r) => r.needs_asset && r.kind === k).map((r) => r.beat) }), {}),
  alt_only: rows.filter((r) => r.needs_primary).map((r) => r.beat),
  // 화제 키워드 → 그 낱말이 걸린 비트. 소싱은 비트가 아니라 **낱말 단위**로 받는 편이 검색어가 흔들리지 않는다.
  kw_beats: rows.reduce((a, r) => { for (const k of r.kw) (a[k] ??= []).push(r.beat); return a; }, {}),
  non_real_only: rows.filter((r) => r.non_real_only).map((r) => r.beat),
  beats: rows,
};
if (!DRY) writeFileSync(join(root, "02_production/asset_gaps.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`${DRY ? "[dry] " : ""}asset_gaps.json → registry ${registry.length} (비실사 ${registry.filter((a) => !isReal(a)).length}), gaps ${out.gaps.length}: ${out.gaps.join(", ") || "(none)"}${out.non_real_only.length ? ` · 비실사만 ${out.non_real_only.length}: ${out.non_real_only.join(", ")}` : ""}`);
if (out.alt_only.length) console.log(`alt만 있음(primary 없음) ${out.alt_only.length}: ${out.alt_only.join(", ")}`);
for (const r of rows) console.log(`${r.beat} ${r.scene} ${(r.kind ?? "-").padEnd(7)} ${r.needs_asset ? "GAP " : r.needs_primary ? "ALT " : "    "} ${(r.assigned ?? "-").padEnd(34)} ${r.primary.length ? "★" + r.primary.join(",") + (r.candidates.length > r.primary.length ? " +" + (r.candidates.length - r.primary.length) : "") : r.candidates.join(",") || "-"}${r.kw.length ? "  kw:" + r.kw.join("·") : ""}`);
