#!/usr/bin/env node
// 4-3 레이아웃 적용 — shots.json layer43_plan.layout(존·크기 단계·위계)에서 각 비트의 인셋/그래픽 좌표를 파생한다.
// 계획이 단일 소스: 사람은 존 이름·크기 단계·위계만 정하고, px 는 이 스크립트가 쓴다.
// 사용: node scripts/layout-43.mjs <root>   (검사만: --check)
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { onscreenIds } from "./lib/primitives.mjs";

const root = process.argv[2] && resolve(process.argv[2]);
const checkOnly = process.argv.includes("--check");
if (!root) { console.error("usage: layout-43.mjs <root> [--check]"); process.exit(2); }
const p = join(root, "02_production", "shots.json");
const S = JSON.parse(readFileSync(p, "utf8"));
const L = S.layer43_plan?.layout;
if (!L) { console.error("layer43_plan.layout 없음"); process.exit(1); }

// 온스크린 카드 집합은 Onscreen.tsx 의 ONSCREEN_IDS 가 정본 — 여기 하드코딩하면 사본이 갈라진다(감사 2026-09-02)
const ONSCREEN = onscreenIds();
const problems = [];
let changed = 0;
const setIf = (obj, k, v) => { if (obj[k] !== v) { obj[k] = v; changed += 1; } };

for (const s of S.shots) {
  const plan = S.layer43_plan[s.beat];
  if (!plan?.layout) continue;
  const lay = plan.layout;
  // 인셋: zone + size → x,y,w (가로 중앙)
  if (lay.inset) {
    const parts = lay.inset.split("-"); const size = parts.pop(); const zone = parts.join("-");
    const z = L.zones[zone]; const w = L.inset_sizes[size];
    if (!z || !w) { problems.push(`${s.beat}: inset ${lay.inset} — 존/크기 미정의`); continue; }
    const ins = s.insets?.[0];
    if (!ins) { problems.push(`${s.beat}: 계획엔 inset 있는데 shots.insets 없음`); continue; }
    const h = ins.src_size ? Math.round((w * ins.src_size[1]) / ins.src_size[0]) : 0;
    if (z.center_y != null) {
      // 세로 중앙 기준 존(center-inset·side): 패널 중심을 center_y 에, 라벨 높이만큼 위로
      setIf(ins, "y", Math.round(z.center_y * 1920 - h / 2 - (z.label_lift ?? 30)));
      setIf(ins, "x", z.side === "L" ? 80 : z.side === "R" ? 1080 - 80 - w : Math.round((1080 - w) / 2));
    } else {
      setIf(ins, "x", Math.round((1080 - w) / 2)); setIf(ins, "y", z.y);
    }
    setIf(ins, "w", w);
    ins.layout = lay.inset;
  } else if (s.insets?.length) problems.push(`${s.beat}: 계획에 inset 없는데 shots.insets 있음`);
  // 온스크린/그래픽 카드: zone → center_y (y ratio)
  for (const g of s.graphics ?? []) {
    const key = ONSCREEN.has(g.id) ? "card" : "graphic";
    const zoneName = lay[key];
    if (!zoneName) { problems.push(`${s.beat}: ${g.id} 에 ${key} 존 미지정`); continue; }
    const z = L.zones[zoneName];
    if (!z) { problems.push(`${s.beat}: ${key} 존 ${zoneName} 미정의`); continue; }
    if (z.align && ONSCREEN.has(g.id)) setIf(g.props, "align", z.align);
    if (z.center_y != null) {
      if (g.id === "counter@1") { g.props.center = g.props.center ?? {}; setIf(g.props.center, "y", Math.round(z.center_y * 1920)); }
      else if (g.id === "dot@1" || g.id === "veil@1") { /* content/full: 좌표는 그림 내용에 묶임 — 계획의 why 로 정당화 */ }
      else setIf(g.props, "y", z.center_y);
    }
    g.layout = zoneName;
    // 위계: 한 비트에 H1 은 하나
    if (lay.hierarchy) g.hierarchy = lay.hierarchy;
  }
  // 겹 수: 배경 + 인셋 + 텍스트/그래픽 ≤ 3
  const layers = 1 + (s.insets?.length ? 1 : 0) + Math.min(1, (s.graphics ?? []).length);
  if (layers > L.max_layers) problems.push(`${s.beat}: ${layers}겹 > ${L.max_layers}`);
  // 존 충돌: 인셋 top 과 카드 center 는 공존 가능, 인셋 top 과 카드 upper 는 금지
  if (lay.inset && lay.card === "upper") problems.push(`${s.beat}: inset(top)과 card(upper) 충돌 — upper 는 인셋 없는 비트만`);
  if (lay.inset?.startsWith("center-inset") && lay.card) problems.push(`${s.beat}: center-inset(주인공)과 카드 동시 금지`);
  if (lay.inset?.startsWith("side") && lay.card && !L.zones[lay.card]?.align) problems.push(`${s.beat}: side 인셋과 공존하는 카드는 반대쪽 정렬 존(lower-L 등)이어야 함`);
}
if (problems.length) { console.error(problems.map((x) => "problem  " + x).join("\n")); }
if (!checkOnly) { writeFileSync(p, JSON.stringify(S, null, 2) + "\n"); console.log(`layout-43: ${changed}개 값 갱신, 문제 ${problems.length}`); }
else console.log(`layout-43 --check: 문제 ${problems.length}`);
process.exit(problems.length ? 1 : 0);
