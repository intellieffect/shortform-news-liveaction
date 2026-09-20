#!/usr/bin/env node
/**
 * 사람 게이트 원장 — pilots/<id>/qa/decisions.jsonl (append-only).
 *
 * 왜(2026-09-04 gates-spec): 사람 판정이 라벨 공급원인데 7편은 원문이 2건만 남았다.
 * 기록은 main 이 회신 받은 턴에 한다(사용자 타이핑 0). 원 행은 고치지 않는다 — 번복은 새 행.
 *
 * 사용:
 *   gate-log.mjs present <편id> <게이트|-> [--card <경로>] [--round N]     제시 시점 선기록(대기 측정의 전제)
 *   gate-log.mjs decide  <편id> <게이트|-> --verbatim "<원문>"             회신 기록 — verbatim 비면 거부
 *                        [--item b20=reject[:사유]]… [--round N] [--async]
 *   gate-log.mjs to-defects <편id> [--write]                               reject·free_find·premise_fail 행 → defects.json 후보
 *
 * 게이트: 1~7. "-" = 게이트 밖 발화(임의 시점 지시·발견 — 이것도 원장에 들어간다).
 * decision 어휘: approve|reject|hold|defer|explicit_absorb|free_find|premise_fail|direct
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const DECISIONS = new Set(["approve", "reject", "hold", "defer", "explicit_absorb", "free_find", "premise_fail", "direct"]);
const argv = process.argv.slice(2);
const cmd = argv[0], id = argv[1];
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const die = (m) => { console.error(m); process.exit(2); };
if (!cmd || !id) die("사용: gate-log.mjs <present|decide|to-defects> <편id> …");

const qaDir = join(REPO, "pilots", id, "qa");
const file = join(qaDir, "decisions.jsonl");
const rows = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const append = (o) => { mkdirSync(qaDir, { recursive: true }); appendFileSync(file, JSON.stringify(o) + "\n"); };

if (cmd === "present") {
  const gate = argv[2];
  if (!gate) die("게이트(1~7 또는 -)가 필요하다");
  const round = Number(opt("--round") ?? (rows.filter((r) => r.t === "present" && r.gate === gate).length + 1));
  append({ t: "present", gate, round, card: opt("--card") ?? "", ts: new Date().toISOString() });
  console.log(`present 기록: gate ${gate} round ${round}`);
} else if (cmd === "decide") {
  const gate = argv[2];
  if (!gate) die("게이트(1~7 또는 -)가 필요하다");
  const verbatim = opt("--verbatim");
  if (!verbatim || !verbatim.trim()) die("--verbatim 이 비어 있다 — 사용자 발화 원문 그대로가 없으면 기록이 아니다 (의역 금지)");
  const items = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === "--item") {
    const m = (argv[i + 1] ?? "").match(/^([^=]+)=([a-z_]+)(?::(.*))?$/);
    if (!m) die(`--item 형식: row_id=decision[:사유] — 받은 값 "${argv[i + 1]}"`);
    if (!DECISIONS.has(m[2])) die(`decision "${m[2]}" 는 어휘 밖이다: ${[...DECISIONS].join("|")}`);
    items.push({ row_id: m[1], decision: m[2], reason: m[3] ?? "" });
  }
  if (!items.length) items.push({ row_id: "", decision: "free_find", reason: "" });
  // 같은 게이트의 마지막 미짝 present 와 짝지어 대기 시간을 계산
  const decided = new Date();
  const roundOpt = opt("--round");
  const lastPresent = [...rows].reverse().find((r) => r.t === "present" && r.gate === gate
    && (roundOpt == null || r.round === Number(roundOpt))
    && !rows.some((d) => d.t === "decide" && d.gate === gate && d.round === r.round));
  // 번복(미짝 present 없음)이면 그 게이트의 마지막 decide 라운드를 잇는다 — round 1 로 뭉개지 않는다(리뷰)
  const maxDecided = rows.filter((r) => r.t === "decide" && r.gate === gate).reduce((a, r) => Math.max(a, r.round), 0);
  const round = Number(roundOpt ?? lastPresent?.round ?? (maxDecided || 1));
  const presented_at = lastPresent?.ts ?? null;
  const elapsed_min = presented_at ? Math.round((decided - new Date(presented_at)) / 6000) / 10 : null;
  append({ t: "decide", gate, round, presented_at, decided_at: decided.toISOString(), elapsed_min, async: argv.includes("--async"), items, verbatim });
  console.log(`decide 기록: gate ${gate} round ${round} · 항목 ${items.length} · 대기 ${elapsed_min ?? "?"}분`);
} else if (cmd === "to-defects") {
  const LEDGER = join(REPO, "docs", "defects.json");
  const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : { defects: [] };
  const have = new Set(ledger.defects.map((d) => d.decision_ref).filter(Boolean));
  const epi = opt("--prefix") ?? (ledger.defects.find((d) => d.pilot === id)?.id ?? "p?-").split("-")[0];
  if (epi === "p?") {
    console.error("warn  이 편의 행이 장부에 없어 접두를 모른다 — 새 편이면 --prefix p<편번호> 를 줘라");
    if (argv.includes("--write")) die("--write 는 접두 없이 못 쓴다 — p?-NN 은 스키마 위반 id 다");
  }
  let seq = ledger.defects.filter((d) => d.pilot === id).length;
  const drafts = [];
  rows.forEach((r, li) => {
    if (r.t !== "decide") return;
    for (const it of r.items) {
      if (!["reject", "free_find", "premise_fail"].includes(it.decision)) continue;
      const ref = `${id}#L${li + 1}:${it.row_id || "free"}`;
      if (have.has(ref)) continue;
      drafts.push({
        id: `${epi}-${String(++seq).padStart(2, "0")}`, pilot: id,
        beat: /^b\d+/.test(it.row_id) ? it.row_id : "",
        summary: it.reason || r.verbatim.slice(0, 120),
        found_by: "human", found_at: `게이트${r.gate}`, should_catch_at: "", cause: it.decision === "premise_fail" ? "제시 전제 오류(G10형)" : "",
        guard: "", fixed_in: "open", evidence: r.verbatim.slice(0, 200),
        source: `pilots/${id}/qa/decisions.jsonl`, decision_ref: ref,
      });
    }
  });
  if (!drafts.length) { console.log("변환할 새 행 없음"); process.exit(0); }
  for (const d of drafts) console.log(`${argv.includes("--write") ? "추가" : "후보"}: ${d.id} [${d.found_at}] ${d.summary.slice(0, 80)}`);
  if (argv.includes("--write")) {
    ledger.defects.push(...drafts);
    writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + "\n");
    console.log(`defects.json 에 ${drafts.length}행 추가 — npm run eval:defects 로 재채점하라`);
  } else console.log("(--write 로 확정)");
} else die(`모르는 명령: ${cmd}`);
