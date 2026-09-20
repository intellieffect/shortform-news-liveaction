#!/usr/bin/env node
/**
 * 레지스트리 ↔ 소스 대조 — **편과 무관한** 등기 검사. `check-all` 이 편 루프 밖에서 한 번 돌린다.
 *
 * 왜(감사 2026-09-02): 기존 「등록 ≠ 렌더됨」 가드는 `shots.graphics` 에 **쓰인 id 만** 봤다.
 * 안 쓰이면 거짓 등기가 그대로 남는다 — 실측으로 `impl: implemented` 인데 렌더러 case 가 없는 항목이 2건
 * (`field_twist@1`·`reconnect@1`, 61612f1 에서 `field_line@1` 로 통합되며 코드만 지워졌다).
 * 완비성 가드도 `impl_at` 을 required_fields 에 안 넣어 못 잡았다.
 *
 * 등기처 넷을 대조한다 (scripts/lib/primitives.mjs 주석 참조):
 *   R1 bind=graphics · impl=implemented 인데 렌더러 case 없음        → ERROR (거짓 등기)
 *   R2 bind=graphics · 렌더러 case 는 있는데 impl≠implemented        → ERROR (미등기 구현)
 *   R3 bind≠graphics · impl=implemented 인데 impl_at 이 없거나 헛참조 → ERROR (가리키는 자리가 없다)
 *   R4 렌더러 case 는 있는데 registry 에 없음                        → ERROR
 *   R5 ONSCREEN_IDS ≠ Onscreen.tsx 의 case 집합                      → ERROR (라우팅과 구현이 갈렸다)
 *   R6 ONSCREEN_IDS 원소가 registry 에 없거나 bind≠graphics          → ERROR
 *   R7 ONSCREEN_IDS 에 deprecated 가 남아 있다                       → warn
 *   R8 motion:true 인데 렌더러 case 없음 / props 스키마 미기재        → warn
 *
 * 사용: node scripts/check-registry.mjs [--json]
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./lib/pilot.mjs";
import { renderedIds, onscreenIds, readRegistry, motionIds, ONSCREEN_SRC, PROPS_SCHEMA_PATH } from "./lib/primitives.mjs";

const wantJson = process.argv.includes("--json");
const errors = [], warns = [];

const rendered = renderedIds();                 // id → 렌더러 파일
const onscreen = onscreenIds();
const { reg, byId } = readRegistry();
if (!reg) { console.error("registry 없음"); process.exit(2); }

// src/ 안의 파일을 basename 으로 찾는다 (impl_at 은 "Cards.tsx Headline" 꼴)
const srcFiles = (() => {
  const out = new Map();
  const walk = (d) => { for (const e of readdirSync(d)) { const f = join(d, e); if (statSync(f).isDirectory()) walk(f); else if (!out.has(e)) out.set(e, f); } };
  walk(join(REPO, "src"));
  return out;
})();

for (const p of reg.primitives ?? []) {
  const hasCase = rendered.has(p.id);
  const impl = p.impl;
  if (p.bind === "graphics") {
    if (impl === "implemented" && !hasCase)
      errors.push(`R1 ${p.id}: impl=implemented 인데 GraphicByType/OnscreenByType 에 case 가 없다 — 거짓 등기(렌더에서 조용히 null)`);
    if (impl !== "implemented" && hasCase)
      errors.push(`R2 ${p.id}: 렌더러에 case 가 있는데 impl=${JSON.stringify(impl)} — 구현이 등기되지 않았다`);
  } else if (impl === "implemented") {
    // R3 — 코드 자리를 가리키는 문자열이 실재하는가
    const at = p.impl_at;
    if (!at) errors.push(`R3 ${p.id}: bind=${p.bind} · impl=implemented 인데 impl_at 이 없다 — 어느 파일의 무엇인지 적는다`);
    else {
      const [file, ...restw] = String(at).split(/\s+/);
      const path = srcFiles.get(file);
      if (!path) errors.push(`R3 ${p.id}: impl_at "${at}" — src/ 에 ${file} 이 없다`);
      else {
        const sym = (restw.join(" ").match(/[A-Za-z_][A-Za-z0-9_]*/) ?? [])[0];
        if (sym && !readFileSync(path, "utf8").includes(sym))
          errors.push(`R3 ${p.id}: impl_at "${at}" — ${file} 안에 ${sym} 이 없다`);
      }
    }
  }
}
// R4 — 소스에만 있는 id
for (const [id, f] of rendered) if (!byId.has(id)) errors.push(`R4 ${id}: ${f} 에 case 가 있는데 registry 에 없다 — 계약 없이 구현됐다`);

// R5·R6·R7 — 라우팅 집합
const onscreenCases = new Set([...rendered].filter(([, f]) => f === ONSCREEN_SRC).map(([id]) => id));
for (const id of onscreen) if (!onscreenCases.has(id)) errors.push(`R5 ${id}: ONSCREEN_IDS 에 있는데 OnscreenByType 에 case 가 없다`);
for (const id of onscreenCases) if (!onscreen.has(id)) errors.push(`R5 ${id}: OnscreenByType 에 case 가 있는데 ONSCREEN_IDS 에 없다 — 카드로 라우팅되지 않는다`);
for (const id of onscreen) {
  const r = byId.get(id);
  if (!r) { errors.push(`R6 ${id}: ONSCREEN_IDS 인데 registry 에 없다`); continue; }
  if (r.bind && r.bind !== "graphics") errors.push(`R6 ${id}: ONSCREEN_IDS 인데 bind=${r.bind} — shots.graphics 로 안 걸린다`);
  if (r.status === "deprecated") warns.push(`R7 ${id}: 폐기 부품이 ONSCREEN_IDS 라우팅에 남아 있다 (${r.superseded_by ? `대체 ${r.superseded_by}` : "대체 미지정"})`);
}

// R8 — motion:true 는 실제로 그려지는 부품이어야 한다 + props 스키마 등재
const motion = motionIds(reg);
const defs = existsSync(join(REPO, PROPS_SCHEMA_PATH))
  ? new Set(Object.keys(JSON.parse(readFileSync(join(REPO, PROPS_SCHEMA_PATH), "utf8")).$defs ?? {}))
  : null;
for (const id of motion) {
  if (!rendered.has(id)) warns.push(`R8 ${id}: motion:true 인데 렌더러 case 가 없다 — B3 면제가 헛돈다`);
  if (defs && !defs.has(`${id.replace("@", "_v")}`)) warns.push(`R8 ${id}: props 스키마 $defs 에 없다 (${id.replace("@", "_v")})`);
}

console.log(`registry: 부품 ${reg.primitives.length} · 렌더러 case ${rendered.size} · ONSCREEN ${onscreen.size} · motion ${motion.size}`);
for (const w of warns) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
if (wantJson) console.log(JSON.stringify({ errors, warns }, null, 2));
process.exit(errors.length ? 1 : 0);
