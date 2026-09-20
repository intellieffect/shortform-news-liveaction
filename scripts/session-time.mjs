#!/usr/bin/env node
// 세션 작업시간 측정 — 사람 응답 대기 시간 제외.
// 사용: node session-time.mjs <sessionId.jsonl> [--mark <ISO 시각>]
//
// 구간 = (사람 user 메시지) → (그 턴의 마지막 assistant 이벤트). 그 사이 공백은 전부 내 작업이다.
// 빼는 것 두 가지:
//   ① 턴 사이 대기 — 마지막 assistant → 다음 사람 메시지
//   ② **턴 안의 사람 게이트** — AskUserQuestion 은 회신이 tool_result 로 오므로 ①로는 안 잡힌다.
//      질문을 던진 assistant 이벤트 → 그 tool_result 이벤트 사이가 통째로 「작업」으로 계산됐다.
//      이걸 빼지 않으면 확인 1 같은 사람 게이트에서 「대장 독서시간」이 우리 노동으로 얹힌다.
// --mark 를 주면 그 시각을 경계로 앞뒤(A 전체 / B 경계 이후)를 나눠 낸다.
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const p = argv[0];
const markArg = argv.indexOf("--mark") >= 0 ? new Date(argv[argv.indexOf("--mark") + 1]) : null;

const evs = readFileSync(p, "utf8").split("\n").filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter((o) => o?.timestamp)
  .map((o) => [new Date(o.timestamp), o])
  .sort((a, b) => a[0] - b[0]);

const content = (o) => o.message?.content;
const isHuman = (o) => o.type === "user" &&
  !(Array.isArray(content(o)) && content(o).some((x) => x?.type === "tool_result"));

// 사람 게이트 도구: 회신이 사람 손을 거친다
const GATE_TOOLS = new Set(["AskUserQuestion", "ExitPlanMode"]);
// tool_use_id → 질문을 던진 시각
const gateAsked = new Map();
for (const [t, o] of evs) {
  if (o.type !== "assistant" || !Array.isArray(content(o))) continue;
  for (const c of content(o)) if (c?.type === "tool_use" && GATE_TOOLS.has(c.name)) gateAsked.set(c.id, t);
}
// tool_result 시각과 짝지어 대기 구간을 만든다
const gateWaits = [];
for (const [t, o] of evs) {
  if (o.type !== "user" || !Array.isArray(content(o))) continue;
  for (const c of content(o)) {
    if (c?.type !== "tool_result" || !gateAsked.has(c.tool_use_id)) continue;
    const a = gateAsked.get(c.tool_use_id);
    if (t > a) gateWaits.push([a, t]);
  }
}
const overlap = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));

const idx = evs.map(([, o], i) => (isHuman(o) ? i : -1)).filter((i) => i >= 0);
const segs = [];
for (let k = 0; k < idx.length; k++) {
  const i = idx[k], hi = k + 1 < idx.length ? idx[k + 1] : evs.length;
  let last = -1;
  for (let j = i; j < hi; j++) if (evs[j][1].type === "assistant") last = j;
  if (last < 0) continue;
  segs.push([evs[i][0], evs[last][0]]);
}

/** [from,to) 구간의 작업·대기(턴간)·게이트 대기를 초로 낸다 */
const tally = (from, to) => {
  let work = 0, gate = 0, turnWait = 0, prevEnd = null;
  for (const [a, b] of segs) {
    const s = Math.max(+a, +from), e = Math.min(+b, +to);
    if (e > s) {
      work += (e - s) / 1000;
      for (const [ga, gb] of gateWaits) gate += overlap(s, e, +ga, +gb) / 1000;
    }
    if (prevEnd && +a > prevEnd) turnWait += overlap(prevEnd, +a, +from, +to) / 1000;
    prevEnd = Math.max(prevEnd ?? 0, +b);
  }
  return { work: work - gate, gate, turnWait };
};

const m = (s) => `${(s / 60).toFixed(2)}분`;
const start = segs[0][0], end = segs[segs.length - 1][1];
const show = (label, r) =>
  console.log(`${label}  작업(순) ${m(r.work)} · 사람 게이트 ${m(r.gate)} · 턴간 대기 ${m(r.turnWait)}`);

show("전체(A)", tally(start, end));
if (markArg) {
  show(`경계 전 `, tally(start, markArg));
  show(`경계 후(B)`, tally(markArg, end));
} else {
  console.log("(--mark <ISO> 를 주면 확인 1 경계로 A/B 를 나눈다)");
}
