#!/usr/bin/env node
// 편 단위 작업시간 — 여러 세션을 합집합으로 잰다. session-time.mjs 를 다중 세션·구간용으로 확장.
// 사용: node episode-time.mjs [--from ISO] [--to ISO] [--mark ISO] <a.jsonl> [b.jsonl ...]
import { readFileSync } from "node:fs";
const A = process.argv.slice(2);
const opt = (k) => { const i = A.indexOf(k); return i >= 0 ? +new Date(A[i + 1]) : null; };
const FROM = opt("--from") ?? -Infinity, TO = opt("--to") ?? Infinity, MARK = opt("--mark");
const files = A.filter((x, i) => x.endsWith(".jsonl") && A[i - 1] !== "--from" && A[i - 1] !== "--to" && A[i - 1] !== "--mark");

const GATE = new Set(["AskUserQuestion", "ExitPlanMode"]);
const allSegs = [], allGates = [];
for (const p of files) {
  const evs = readFileSync(p, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((o) => o?.timestamp).map((o) => [+new Date(o.timestamp), o]).sort((a, b) => a[0] - b[0]);
  const con = (o) => o.message?.content;
  const isHuman = (o) => o.type === "user" && !(Array.isArray(con(o)) && con(o).some((x) => x?.type === "tool_result"));
  const asked = new Map();
  for (const [t, o] of evs) if (o.type === "assistant" && Array.isArray(con(o)))
    for (const c of con(o)) if (c?.type === "tool_use" && GATE.has(c.name)) asked.set(c.id, t);
  for (const [t, o] of evs) if (o.type === "user" && Array.isArray(con(o)))
    for (const c of con(o)) if (c?.type === "tool_result" && asked.has(c.tool_use_id) && t > asked.get(c.tool_use_id))
      allGates.push([asked.get(c.tool_use_id), t]);
  const idx = evs.map(([, o], i) => (isHuman(o) ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k], hi = k + 1 < idx.length ? idx[k + 1] : evs.length;
    let last = -1;
    for (let j = i; j < hi; j++) if (evs[j][1].type === "assistant") last = j;
    if (last >= 0) allSegs.push([evs[i][0], evs[last][0]]);
  }
}
const clip = (iv) => iv.map(([a, b]) => [Math.max(a, FROM), Math.min(b, TO)]).filter(([a, b]) => b > a);
const merge = (iv) => { const s = clip(iv).sort((a, b) => a[0] - b[0]), out = [];
  for (const [a, b] of s) { const L = out[out.length - 1]; if (L && a <= L[1]) L[1] = Math.max(L[1], b); else out.push([a, b]); } return out; };
const len = (iv) => iv.reduce((s, [a, b]) => s + b - a, 0) / 1000;
const inter = (x, y) => { const o = []; for (const [a, b] of x) for (const [c, d] of y) { const s = Math.max(a, c), e = Math.min(b, d); if (e > s) o.push([s, e]); } return merge(o); };

const tally = (from, to) => {
  const w = merge(allSegs).map(([a, b]) => [Math.max(a, from), Math.min(b, to)]).filter(([a, b]) => b > a);
  const g = inter(w, merge(allGates));
  let wait = 0; for (let i = 1; i < w.length; i++) wait += (w[i][0] - w[i - 1][1]) / 1000;
  const wall = w.length ? (w[w.length - 1][1] - w[0][0]) / 1000 : 0;
  return { work: len(w) - len(g), gate: len(g), wait, wall };
};
const m = (s) => `${(s / 60).toFixed(1)}분`;
const W = merge(allSegs), lo = W[0][0], hi = W[W.length - 1][1];
const show = (l, r) => console.log(`${l.padEnd(22)} 작업(순) ${m(r.work).padStart(8)} · 게이트 ${m(r.gate).padStart(7)} · 턴간대기 ${m(r.wait).padStart(8)} · 벽시계 ${m(r.wall).padStart(8)}`);
const kst = (t) => new Date(t).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
console.log(`창 ${kst(lo)} ~ ${kst(hi)}  (세션 ${files.length}개)`);
show("A (전체)", tally(lo, hi));
if (MARK) { show("  경계 전", tally(lo, MARK)); show("B (경계 후)", tally(MARK, hi)); }
