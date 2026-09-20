#!/usr/bin/env node
/**
 * 원해상 크롭 생성 — 「읽히나」 판정용 (게이트 ④·⑥ 증거).
 *
 * 왜: 폭 300px 시트로 가독을 판정한 것(G8)이 7편 재작업의 직접 원인. 시트는 「무엇이 있나」,
 * 크롭은 「읽히나」 — 형식 자체를 가른다 (gates-spec 원칙 1).
 *
 * v1 고정 존 2개(전폭·원해상): caption = 세로 70~100% (자막 밴드 초과분 포함) · onscreen = 세로 20~70%.
 * layer43_plan 에 px 박스가 표준화되면 존을 계획값으로 바꾼다.
 *
 * 사용:
 *   node scripts/qa-crops.mjs <편id> [--beats b01,b05] [--from-stills <dir>] [--out <dir>]
 *   --from-stills <dir> : <dir>/<beat>.png 을 쓴다(렌더 생략). 없으면 비트마다 BeatStill 을 렌더한다(느림).
 * 출력: out/pilots/<id>/qa/crops/<beat>-caption.png · <beat>-onscreen.png
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const id = argv[0];
if (!id) { console.error("사용: qa-crops.mjs <편id> [--beats b01,b05] [--from-stills <dir>] [--out <dir>]"); process.exit(2); }
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const outDir = opt("--out") ?? join(REPO, "out", "pilots", id, "qa", "crops");
const stillsDir = opt("--from-stills");
mkdirSync(outDir, { recursive: true });

const beatsFile = join(REPO, "pilots", id, "beats.json");
if (!existsSync(beatsFile)) { console.error(`beats.json 없음: ${beatsFile}`); process.exit(2); }
const allBeats = JSON.parse(readFileSync(beatsFile, "utf8")).beats.map((b) => b.id);
const beats = opt("--beats") ? opt("--beats").split(",") : allBeats;

const sh = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" });
let made = 0, miss = 0;
for (const b of beats) {
  let src = stillsDir ? join(stillsDir, `${b}.png`) : join(outDir, `${b}.png`);
  if (!stillsDir) {
    // BeatStill 렌더(원해상). 미디어 캐시가 없으면 remotion 이 실패한다 — 그대로 알린다.
    const r = sh(process.execPath, [join(REPO, "scripts", "pilot-run.mjs"), "beat", id, src, `--props={"beatId":"${b}"}`]);
    if (r.status !== 0) { console.error(`ERROR ${b}: 렌더 실패 — ${(r.stderr ?? String(r.error ?? "")).split("\n").find(Boolean) ?? ""}`); miss++; continue; }
  }
  if (!existsSync(src)) { console.error(`ERROR ${b}: 스틸 없음 ${src}`); miss++; continue; }
  for (const [name, y0, y1] of [["caption", 0.70, 1.0], ["onscreen", 0.20, 0.70]]) {
    const dst = join(outDir, `${b}-${name}.png`);
    const r = sh("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-vf", `crop=iw:ih*${(y1 - y0).toFixed(2)}:0:ih*${y0.toFixed(2)}`, dst]);
    if (r.status !== 0) { console.error(`ERROR ${b}-${name}: ffmpeg — ${(r.stderr ?? String(r.error ?? "")).trim().split("\n")[0]}`); miss++; }
    else made++;
  }
}
console.log(`크롭 ${made}장 → ${outDir}${miss ? ` · 실패 ${miss}` : ""}`);
process.exit(miss ? 1 : 0);
