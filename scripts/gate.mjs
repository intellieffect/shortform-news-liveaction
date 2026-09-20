#!/usr/bin/env node
/**
 * 착수 게이트 — 층에 들어가기 **전에** 데이터가 착수 조건을 갖췄는지 본다.
 *
 * 왜 사후 가드로는 부족한가(5편 2026-09-01 실측): 되돌아간 5건 중 가드가 막을 수 있었던 건 2건뿐이고,
 * 나머지는 규칙 위반이 아니라 **순서를 건너뛴 것**이었다. rules §5c 가 스스로 쓴다 —
 * "순서가 규칙이다. ①을 건너뛰고 ②③부터 시작하면 되돌리기가 비싸져 숫자만 조정하며 버티게 된다."
 * stages.md 「4-3 착수 절차」 6단계 중 **착수 시점에 확인되던 것은 0개**였다.
 *
 * 사용: node scripts/gate.mjs <편 id> 4-3 [--shots <path>] [--force]
 *   --shots  검사할 shots.json 을 직접 지정(과거 커밋 데이터로 게이트를 검증할 때)
 *   --force  납품 확정 편에도 돌린다
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { REPO, dirs, inputRoot } from "./lib/pilot.mjs";
import { syncStatus, syncHint } from "./lib/sync.mjs";
import { onscreenIds, readRegistry } from "./lib/primitives.mjs";
import { readKeywords } from "./lib/keywords.mjs";

const argv = process.argv.slice(2);
const id = argv[0];
const stage = argv[1];
const shotsArg = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
const rootArg = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : null;
const force = argv.includes("--force");
if (!id || stage !== "4-3") {
  console.error("usage: gate.mjs <편 id> 4-3 [--shots <path>] [--root <path>] [--force]");
  process.exit(2);
}

const dataDir = dirs(id).data;
const pilotJson = join(dataDir, "pilot.json");
const P = existsSync(pilotJson) ? JSON.parse(readFileSync(pilotJson, "utf8")) : {};
const root = rootArg ? resolve(rootArg) : inputRoot(id);

if (P.status === "delivered" && !force && !shotsArg) {
  console.log(`gate 4-3 ${id}: 납품 확정 편 — 착수 게이트 대상이 아니다 (N/A). 과거 데이터 검증은 --shots`);
  process.exit(0);
}

const shotsPath = shotsArg ? resolve(shotsArg) : join(dataDir, "shots.json");
if (!existsSync(shotsPath)) { console.error(`shots.json 없음: ${shotsPath}`); process.exit(2); }
// E0 판정 대상이 낡은 스냅샷이면 나머지 판정은 거짓이다 — 6편: 13 비트를 썼는데 12 비트로 판정했다. --shots/--root 로 과거 데이터를 볼 때는 묻지 않는다.
if (!rootArg && !shotsArg) {
  const ss = syncStatus(id, root);
  if (!ss.ok) { console.error(`gate 4-3 ${id}: E0 pilots/${id}/ 가 news/${id} 보다 낡았다 (${[...ss.stale, ...ss.missing].join(", ")}) — ${syncHint(id)} 뒤 다시`); process.exit(1); }
}
const S = JSON.parse(readFileSync(shotsPath, "utf8"));
const PLAN = S.layer43_plan ?? {};
const beats = Object.keys(PLAN).filter((k) => /^b\d+$/.test(k));

// 부품 id 는 소스·레지스트리가 정본(scripts/lib/primitives.mjs)
const { reg, byId: regIds } = readRegistry();
const ONSCREEN = onscreenIds();
const TIERS = new Set(["1", "2", "3a", "3b", "3c"]);
// 코드로 그리기로 한 경로(1 기하 · 3b 기하 환원)는 레퍼런스를 먼저 본다 — 5편 도해 제작에 참조 흔적 0건이었다
const NEEDS_REF = new Set(["1", "3b"]);

const errors = [], notes = [];

// E1 계획이 있나 — 서술형 계획(graphics 키 없음)은 4-3 착수 조건이 아니다
if (!beats.length) {
  console.log(`gate 4-3 ${id}: layer43_plan 없음 — 규약 이전 편이면 N/A, 새 편이면 계획부터 쓴다`);
  process.exit(0);
}
const noGraphicsKey = beats.filter((b) => PLAN[b].graphics == null);
if (noGraphicsKey.length === beats.length) {
  console.log(`gate 4-3 ${id}: 서술형 계획(plan.graphics 키 없음) — 규약 이전 편. N/A`);
  process.exit(0);
}
for (const b of noGraphicsKey) errors.push(`E1 ${b}: layer43_plan 에 graphics 키가 없다 — 계획이 부품을 지명해야 착수한다`);

for (const b of beats) {
  const e = PLAN[b];
  const g = e.graphics ?? [];
  const lay = e.layout ?? {};

  // E2 카드 약속 ↔ 부품 지명 (5편: 9비트 약속 · 온스크린 0개)
  if (lay.card && !g.some((x) => ONSCREEN.has(x)))
    errors.push(`E2 ${b}: 계획이 card=${lay.card} 를 약속했는데 plan.graphics 에 온스크린 부품이 없다 — 무엇으로 그릴지 지명한다`);

  for (const gid of g) {
    const r = regIds.get(gid);
    // E3 등기 — registry 에 있고, 이 자리(shots.graphics)에 걸리는 부품인가
    if (!r) { errors.push(`E3 ${b}: ${gid} 가 registry 에 없다 — 등록은 구현 전에`); continue; }
    if (r.bind && r.bind !== "graphics")
      errors.push(`E3 ${b}: ${gid} 는 bind=${r.bind} 부품이다 — shots.graphics 로는 안 그려진다`);
    if (r.status === "deprecated") errors.push(`E3 ${b}: ${gid} 는 deprecated`);
    // E4 계약 완비 — impl 만 예외(아직 구현 전이라 비는 게 정상). 이게 착수 게이트와 검증의 차이다
    const miss = reg.required_fields.filter((f) => f !== "impl" && (r[f] == null || r[f] === "" || (Array.isArray(r[f]) && !r[f].length)));
    if (miss.length) errors.push(`E4 ${b}: registry ${gid} 필수 필드 ${miss.join("·")} 가 비었다 — 계약을 먼저 쓴다`);
  }

  // E5 3단 판정을 값으로 (문자열 "3단 판정" grep 은 넉 자 적으면 통과했다).
  //    묻는 대상은 **도해**다 — 온스크린 카드(draw_tier=text)는 §5c 판정 대상이 아니다.
  //    부품을 아직 안 정했는데 그래픽 존만 잡아 뒀으면 그것도 물어야 한다.
  const drawn = g.filter((x) => regIds.get(x) && regIds.get(x).draw_tier !== "text");
  const needTier = drawn.length > 0 || (!!lay.graphic && !g.length);
  if (needTier && !TIERS.has(String(e.tier ?? "")))
    errors.push(`E5 ${b}: plan.tier 가 없다 — 1(자·컴퍼스) | 2(실사) | 3a(은유) | 3b(기하 환원) | 3c(자막) 중 하나 (rules §5c)`);

  // E6 레퍼런스 — 코드로 그리기로 한 경로만
  if (NEEDS_REF.has(String(e.tier ?? "")) && !e.ref)
    errors.push(`E6 ${b}: tier=${e.tier} 인데 plan.ref 가 없다 — 그 현상을 세상은 어떻게 그리나(기관 도판·교과서 도상)를 먼저 본다`);

  // E7 MC 씬 계약은 씬 tsx 보다 먼저
  if (g.includes("motion_clip@1") && !existsSync(join(root, "02_production", "mc_spec.md")))
    errors.push(`E7 ${b}: motion_clip@1 을 계획했는데 ${root}/02_production/mc_spec.md 가 없다 — 씬 계약이 먼저다`);
}

// E8 화제 키워드 — 내레이션이 말하는데 화면에 수행자가 없는 것 (facts.md 「화제 키워드」 절이 있는 편만).
//   **실물 ✅ 는 오류, 실물 ❌ 는 note.** 실물이 있고 말까지 하는데 화면에 없으면 그건 판단이 아니라 빠진 것이다.
//   실물 ❌ 는 도해로 갈지 자막에 맡길지(3b vs 3c)가 설계라 막지 않는다 — 목록만 눈앞에 놓는다.
{
  const KW = readKeywords(join(root, "02_production"));
  const beatsPath = join(root, "02_production", "beats.json");
  if (KW.length && existsSync(beatsPath)) {
    const BB = JSON.parse(readFileSync(beatsPath, "utf8"));
    const spoken = new Set();
    for (const b of BB.beats ?? []) for (const t of b.kw ?? []) spoken.add(t);
    const served = new Set();
    for (const s of S.shots ?? []) {
      for (const t of s.visual?.kw_served ?? []) served.add(t);
      for (const g of s.graphics ?? []) for (const t of g.kw_served ?? []) served.add(t);
      for (const i of s.insets ?? []) for (const t of i.kw_served ?? []) served.add(t);
      for (const k of s.stickers ?? []) for (const t of k.kw_served ?? []) served.add(t);
    }
    for (const p of Object.values(PLAN)) for (const t of p.kw_served ?? []) served.add(t);
    const missing = KW.filter((k) => spoken.has(k.term) && !served.has(k.term));
    for (const k of missing.filter((k) => k.real === true))
      errors.push(`E8 화제 「${k.term}」: 실물이 있고 내레이션이 말하는데 수행하는 화면이 없다 — 배경·인셋으로 지명하고 kw_served 에 적는다`);
    const soft = missing.filter((k) => k.real !== true);
    if (soft.length) {
      notes.push(`실물 없는 화제 ${soft.length}건이 화면에 없다 — 도해(3b)로 갈지 자막(3c)에 맡길지 정하고 넘어간다:`);
      for (const k of soft) notes.push(`    ${k.term}${k.why ? ` — ${k.why}` : ""}`);
    }
  }
}

// E9 스티커 — tier 3a(은유)의 자리. 계약이 프롬프트보다 **먼저** 서야 착수한다(E7 이 mc_spec 에 하는 것과 같다).
{
  const contract = join(root, "02_production", "sticker_contract.md");
  const hasContract = existsSync(contract);
  for (const b of beats) {
    const p = PLAN[b] ?? {};
    const sh = (S.shots ?? []).find((x) => x.beat === b);
    const stickers = sh?.stickers ?? [];
    // ① 3a 판정을 내려 놓고 화면을 안 정한 것 — 「은유로 간다」는 판정이지 화면이 아니다
    if (String(p.tier) === "3a" && !stickers.length && sh?.visual?.source !== "generated")
      errors.push(`E9 ${b}: tier=3a 인데 스티커도 배경 생성도 없다 — 「은유로 갈아탄다」는 판정이지 화면이 아니다. 무엇으로 갈지 지명한다`);
    if (!stickers.length) continue;
    // ② 계약 없이 프롬프트부터
    if (!hasContract)
      errors.push(`E9 ${b}: 스티커를 계획했는데 ${root}/02_production/sticker_contract.md 가 없다 — §6 목록(비트·맡는 낱말·대상)을 먼저 채운다. §1~§5 는 고정값이다(템플릿 plugin/…/templates/sticker_contract.md)`);
    for (const k of stickers) {
      if (!k.gen?.prompt) errors.push(`E9 ${b}: 스티커 ${k.id ?? "?"} 에 gen.prompt 가 없다 — 계획 단계에서 무엇을 그릴지 문장으로 적는다`);
      if (!(k.kw_served ?? []).length) errors.push(`E9 ${b}: 스티커 ${k.id ?? "?"} 가 맡는 낱말이 없다(kw_served) — 스티커는 장식으로 붙이지 않는다`);
    }
  }
}

// I1 들이밀기 — 수집해 놓고 안 쓴 자산. "없어서 그린 게 아니라 찾아보지 않고 그렸다"(5편 NASA SDO 52~61초)
const assetsPath = join(root, "01_input", "assets.json");
if (existsSync(assetsPath)) {
  const A = JSON.parse(readFileSync(assetsPath, "utf8"));
  const all = [...(A.assets ?? []), ...(A.external_assets ?? []), ...(A.overlay_assets ?? []), ...(A.brief_assets?.free ?? [])];
  const used = new Set();
  for (const s of S.shots ?? []) {
    if (s.visual?.asset) used.add(s.visual.asset);
    for (const i of s.insets ?? []) if (i.asset) used.add(i.asset);
  }
  const unused = all.filter((a) => a.id && !used.has(a.id) && a.rights_status !== "rejected");
  if (unused.length) {
    notes.push(`수집해 놓고 shots 에 안 쓴 자산 ${unused.length}건 — 도해를 그리기 전에 여기부터 본다(rules §5c 2단):`);
    for (const a of unused.slice(0, 20)) notes.push(`    ${a.id}${a.label ? ` — ${a.label}` : ""}`);
    if (unused.length > 20) notes.push(`    … 외 ${unused.length - 20}건`);
  }
}

console.log(`gate 4-3 ${id}: 계획 비트 ${beats.length} · 부품을 지명한 비트 ${beats.filter((b) => (PLAN[b].graphics ?? []).length).length}`);
for (const n of notes) console.log(`note  ${n}`);
for (const e of errors) console.log(`GATE  ${e}`);
console.log(errors.length ? `\n착수 불가 — ${errors.length}건. 계획을 고치고 다시 돌린다.` : `\n착수 가능.`);
process.exit(errors.length ? 1 : 0);
