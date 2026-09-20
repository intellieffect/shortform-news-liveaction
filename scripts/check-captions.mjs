#!/usr/bin/env node
/**
 * 4-2 텍스트 모션 검토 — **렌더 없이** 자막의 줄 나눔·노출을 잰다.
 *
 * 왜: 스킬 검토 질문에 「줄별 자/초·노출·팝 잘림」이 있는데 **그걸 돌리는 명령이 없었다.**
 * 7편은 네 층(motion·text_anim·graphics·transitions)을 한꺼번에 켜고 4-4 로 갔고,
 * 이 계산을 **최종 검토 뒤에야 처음** 했다 — 그러자 즉시 3건이 나왔다(G9).
 *   b17 「로먼은」 0.48초 · b19 「지구가」 0.40초 · b02·b17 자막 4줄
 * 층을 건너뛰어도 걸리게 하려고 `check:all` 안으로 들어왔다.
 *
 * 사용: node scripts/check-captions.mjs <root> [overlays.json] [--max-lines 3] [--min-hold 0.55] [--max-cps 9]
 * 기준값은 인자로 덮는다 — 편마다 다르면 그 편 pilot.json 이 아니라 명령에 남긴다.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { dirs, pilotIdFromRoot } from "./lib/pilot.mjs";

const root = process.argv[2] && resolve(process.argv[2]);
if (!root) { console.error("usage: check-captions.mjs <root> [overlays.json] [--max-lines N] [--min-hold S] [--max-cps N]"); process.exit(2); }
const argv = process.argv.slice(3);
const opt = (n, d) => (argv.indexOf(`--${n}`) >= 0 ? Number(argv[argv.indexOf(`--${n}`) + 1]) : d);
const MAX_LINES = opt("max-lines", 3);      // 4줄이면 한 줄이 짧게 스쳐 간다
const MIN_HOLD = opt("min-hold", 0.55);     // 줄 하나가 화면에 머무는 최소 시간(초)
const MAX_CPS = opt("max-cps", 9);          // 자/초 — 넘으면 읽기 전에 넘어간다

const id = pilotIdFromRoot(root);
const ovArg = argv.find((a) => !a.startsWith("--") && a.endsWith(".json"));
const ovPath = ovArg ? resolve(ovArg) : (() => {
  const repo = join(dirs(id).data, "overlays.json");
  return existsSync(repo) ? repo : join(root, "02_production/overlays.json");
})();
const beatsPath = (() => {
  const repo = join(dirs(id).data, "beats.json");
  return existsSync(repo) ? repo : join(root, "02_production/beats.json");
})();

const OV = JSON.parse(readFileSync(ovPath, "utf8"));
const B = JSON.parse(readFileSync(beatsPath, "utf8"));
const beats = new Map(B.beats.map((b) => [b.id, b]));
const MAX_CHARS = OV.style?.caption?.max_chars_per_line ?? 18;

const warns = [];
const rows = [];
for (const o of OV.overlays ?? []) {
  const cap = o.caption;
  const b = beats.get(o.beat);
  if (!cap || !b) continue;
  const dur = b.end - b.start;
  const n = cap.text.replace(/\s/g, "").length;
  const cps = n / Math.max(0.1, dur);
  const lens = (cap.lines ?? []).map((l) => l.replace(/["'“”‘’]/g, "").length);
  const flags = [];
  if (cps > MAX_CPS) flags.push(`빠름 ${cps.toFixed(1)}자/초`);
  if (lens.length > MAX_LINES) flags.push(`${lens.length}줄`);
  for (const [i, L] of lens.entries()) if (L > MAX_CHARS) flags.push(`L${i + 1} ${L}자 > ${MAX_CHARS}`);
  for (const [i, l] of (cap.lines_timed ?? []).entries()) {
    const hold = l.end - l.start;
    // 마지막 줄은 비트 끝까지 남으므로 짧아도 스치지 않는다 — 앞 줄만 본다
    if (i + 1 < (cap.lines_timed ?? []).length && hold < MIN_HOLD)
      flags.push(`L${i + 1} 노출 ${hold.toFixed(2)}s < ${MIN_HOLD}`);
  }
  rows.push({ beat: o.beat, dur, n, cps, lens, flags });
  if (flags.length) warns.push(`[caption] ${o.beat}: ${flags.join(" · ")}  «${cap.lines?.join(" / ")}»`);
}

const quiet = argv.includes("--quiet");
if (!quiet) {
  console.log(`captions: ${rows.length}비트 · 기준 max-lines ${MAX_LINES} · min-hold ${MIN_HOLD}s · max-cps ${MAX_CPS} · max-chars ${MAX_CHARS}`);
  for (const r of rows) {
    const f = r.flags.length ? "  ← " + r.flags.join(" · ") : "";
    console.log(`  ${r.beat} ${r.dur.toFixed(2)}s ${String(r.n).padStart(3)}자 ${r.cps.toFixed(1)}자/초 ${JSON.stringify(r.lens)}${f}`);
  }
}
for (const w of warns) console.log("warn  " + w);
console.log(`captions: warn ${warns.length} / ${rows.length}비트`);
process.exit(0); // 경고만 낸다 — 줄 나눔은 생성기 몫이고 편마다 허용치가 다르다
