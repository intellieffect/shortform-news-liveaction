#!/usr/bin/env node
/**
 * 게이트 지표 — pilots/<편>/qa/decisions.jsonl 집계. 대기·왕복·premise_fail.
 * 초과·왕복 2회는 사람이 아니라 **제시 형식의 결함 신호**다 — 편 종료 후 개정 안건 (gates-spec).
 * 사용: node scripts/gate-metrics.mjs [편id …]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(join(REPO, "pilots"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
let any = false;
console.log("편 / 게이트         판정  평균대기  최대대기  최대왕복  전제오류");
for (const id of ids) {
  const f = join(REPO, "pilots", id, "qa", "decisions.jsonl");
  if (!existsSync(f)) continue;
  any = true;
  const rows = readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.t === "decide");
  const gates = {};
  for (const r of rows) {
    const g = (gates[r.gate] ??= { n: 0, waits: [], round: 0, pf: 0 });
    g.n += r.items.length;
    if (r.elapsed_min != null) g.waits.push(r.elapsed_min);
    g.round = Math.max(g.round, r.round);
    g.pf += r.items.filter((i) => i.decision === "premise_fail").length;
  }
  for (const [gate, g] of Object.entries(gates)) {
    const avg = g.waits.length ? (g.waits.reduce((a, b) => a + b, 0) / g.waits.length).toFixed(1) : "—";
    const max = g.waits.length ? Math.max(...g.waits) : "—";
    const flag = g.round >= 2 ? " ← 왕복 2+ = 형식 결함 신호" : "";
    console.log(`${(id + " / " + gate).padEnd(20)} ${String(g.n).padStart(3)} ${String(avg).padStart(8)} ${String(max).padStart(8)} ${String(g.round).padStart(8)} ${String(g.pf).padStart(8)}${flag}`);
  }
}
if (!any) console.log("decisions.jsonl 이 아직 없다 — 다음 편 게이트부터 쌓인다 (npm run gate:log)");
