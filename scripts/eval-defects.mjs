#!/usr/bin/env node
/**
 * 결함 장부 채점기 — docs/defects.json 을 읽어 「무엇이 자동으로 잡히고 무엇이 사람 몫으로 남았나」를 센다.
 *
 * 왜(2026-09-04 eval harness): 개선 1회의 효과를 확인하려면 다음 편(227분)을 만들어야 했다.
 * 이 러너는 그 확인을 장부 재채점(초 단위)으로 바꾼다. 세 가지를 본다:
 *   ① 스키마 — 필수 필드가 빈 행은 장부가 아니라 메모다.
 *   ② 선언-실체 대조 — guard 필드의 코드가 scripts/ 에 실제로 존재하는지 grep.
 *      (감사 2026-09-01: 등록≠렌더됨. 장부의 guard 가 유령이면 커버리지 수치 전체가 거짓이 된다.)
 *   ③ 집계 — 편별 「사람 최초 발견 수」(품질 지표) · guard:null 승격 백로그 · 하류 유출(발견이 정위치보다 뒤).
 *
 * 사용: node scripts/eval-defects.mjs [--json]
 * v2 예정: fixed_in 커밋의 부모(결함이 살아있던 상태)에 가드를 재생하는 동적 리플레이.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = join(REPO, "docs", "defects.json");
const wantJson = process.argv.includes("--json");

if (!existsSync(LEDGER)) {
  console.error("docs/defects.json 없음 — 장부가 아직 없다. 채굴 결과를 먼저 확정하라.");
  process.exit(2);
}
const rows = JSON.parse(readFileSync(LEDGER, "utf8")).defects;

// ① 스키마
const REQUIRED = ["id", "pilot", "summary", "found_by", "found_at", "evidence", "source"];
const schemaErrs = [];
const ids = new Set();
for (const r of rows) {
  for (const k of REQUIRED) if (!r[k]) schemaErrs.push(`${r.id ?? "(id 없음)"}: ${k} 비어 있음`);
  if (ids.has(r.id)) schemaErrs.push(`${r.id}: id 중복`);
  ids.add(r.id);
}

// ② 선언-실체 대조 — guard 코드는 scripts/*.mjs 안에 [code] 리터럴로 존재해야 한다
const scriptSrc = readdirSync(join(REPO, "scripts"))
  .filter((f) => f.endsWith(".mjs"))
  .map((f) => readFileSync(join(REPO, "scripts", f), "utf8"))
  .join("\n");
const ghostGuards = [], pendingGuards = [];
for (const r of rows) {
  if (!r.guard) continue;
  if (scriptSrc.includes(`[${r.guard}]`)) continue;
  // source 의 " @<branch>" 접미 = 아직 머지 안 된 편 — 가드 코드도 그 브랜치에 있다. 오류가 아니라 머지 대기.
  if (/ @\S+$/.test(r.source ?? "")) pendingGuards.push(`${r.id}: guard "${r.guard}" — 미머지 브랜치 선언(${r.source.match(/ @(\S+)$/)[1]}), 머지 후 재검`);
  else ghostGuards.push(`${r.id}: guard "${r.guard}" 가 scripts/ 에 없다 (유령 선언)`);
}

// ③ 집계 — 발견 단계 서열 (별칭 흡수). 서열을 모르는 문자열은 유출 판정에서 제외한다.
const STAGE = { P0: 0, P1: 1, P2: 2, P3: 3, "3′": 4, P4: 4, "4-3": 5, "4-3R": 5, P5: 5, P6: 6,
  v1검토: 7, 최종검토: 7, 최종: 7, P7: 7, P8: 8, 납품: 8, v2검토: 9, v3검토: 9, 납품후: 10, 소급실측: 10,
  // 사람 게이트(gate-log to-defects 가 쓰는 어휘) — gates.md ①~⑦ 의 파이프라인 위치
  게이트1: 0, 게이트2: 1, 게이트3: 4, 게이트4: 5, 게이트5: 6, 게이트6: 7, 게이트7: 8 };
// 접미 변형("P7 R1"·"P0 실측")을 접두 최장일치로 잇는다 — 리뷰 실측: 정확일치만으로는 73%가 서열 없음이었다
const STAGE_KEYS = Object.entries(STAGE).sort((a, b) => b[0].length - a[0].length);
const ord = (s) => {
  const t = String(s).replace(/\s/g, "").replace(/\(.*\)/, "");
  return STAGE[t] ?? STAGE_KEYS.find(([k]) => t.startsWith(k))?.[1] ?? null;
};

const byPilot = {};
for (const r of rows) {
  const p = (byPilot[r.pilot] ??= { total: 0, human: 0, agent: 0, guardCovered: 0, backlog: 0, leaked: 0 });
  p.total++;
  if (/^(human|user|사용자)/.test(r.found_by)) p.human++;
  if (/^agent:/.test(r.found_by)) p.agent++;
  if (r.guard) p.guardCovered++; else p.backlog++;
  const f = ord(r.found_at), s = ord(r.should_catch_at);
  if (f != null && s != null && f > s) p.leaked++;
}

const out = { rows: rows.length, schemaErrs, ghostGuards, pendingGuards, byPilot };
if (wantJson) { console.log(JSON.stringify(out, null, 2)); process.exit(schemaErrs.length || ghostGuards.length ? 1 : 0); }

console.log(`defects.json ${rows.length}행`);
console.log(`스키마 오류 ${schemaErrs.length} · 유령 guard ${ghostGuards.length} · 미머지 대기 ${pendingGuards.length}`);
for (const e of [...schemaErrs, ...ghostGuards]) console.log(`  ERROR ${e}`);
for (const e of pendingGuards) console.log(`  warn  ${e}`);
console.log("\n편별   전체  사람최초  에이전트  가드커버  승격대기  하류유출");
for (const [id, p] of Object.entries(byPilot))
  console.log(`${id.padEnd(34)} ${String(p.total).padStart(3)} ${String(p.human).padStart(6)} ${String(p.agent).padStart(8)} ${String(p.guardCovered).padStart(8)} ${String(p.backlog).padStart(8)} ${String(p.leaked).padStart(8)}`);
const t = Object.values(byPilot).reduce((a, p) => { for (const k in p) a[k] = (a[k] ?? 0) + p[k]; return a; }, {});
console.log(`${"합".padEnd(35)}${String(t.total).padStart(3)} ${String(t.human).padStart(6)} ${String(t.agent).padStart(8)} ${String(t.guardCovered).padStart(8)} ${String(t.backlog).padStart(8)} ${String(t.leaked).padStart(8)}`);
console.log("\n지표: 「사람최초」가 편이 갈수록 줄어야 개선이 실재한 것이다. 「승격대기」는 편 종료 후 가드 승격 백로그다.");
process.exit(schemaErrs.length || ghostGuards.length ? 1 : 0);
