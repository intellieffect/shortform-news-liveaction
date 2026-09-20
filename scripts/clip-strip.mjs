#!/usr/bin/env node
/**
 * 클립 다중 프레임 샘플 — 「이 클립에 그 장면이 있나」 판정용 (게이트 ③ 증거).
 *
 * 왜: 60초 클립을 중간 1프레임으로 판정해 답이 있는 뒤쪽(t=50~58)을 놓쳤다(G7).
 * 규칙: 클립당 4~6장 균등, 30초 초과는 필수 (SKILL 원칙 14).
 *
 * 사용: node scripts/clip-strip.mjs <video> [--n 4~6] [--out <dir>] [--excerpt <초>]
 *   --excerpt <t> : t초부터 4초 발췌 mp4 도 만든다(움직임 판정 보완)
 * 출력: <out>/<이름>-fN-<t>s.png (원해상), 기본 out 은 영상 옆 _strip/
 */
import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const video = argv[0];
if (!video || !existsSync(video)) { console.error("사용: clip-strip.mjs <video> [--n 5] [--out <dir>] [--excerpt <초>]"); process.exit(2); }
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" });
const dur = parseFloat(probe.stdout);
if (!dur) { console.error(`길이를 못 읽었다: ${video}`); process.exit(2); }
let n = Number(opt("--n") ?? (dur > 30 ? 6 : 5));
if (!Number.isFinite(n)) n = dur > 30 ? 6 : 5;      // --n 비숫자 → 기본값(리뷰: NaN 이 클램프를 통과해 0장 성공 보고)
n = Math.max(4, Math.min(6, n));                       // 4~6장 균등 — 규칙이 상한·하한이다
const out = opt("--out") ?? join(dirname(video), "_strip");
mkdirSync(out, { recursive: true });
const stem = basename(video, extname(video));
const ts = Array.from({ length: n }, (_, i) => +(dur * (0.02 + (0.96 * i) / (n - 1))).toFixed(2));
let err = 0;
for (let i = 0; i < n; i++) {
  const dst = join(out, `${stem}-f${i + 1}-${ts[i]}s.png`);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(ts[i]), "-i", video, "-frames:v", "1", dst], { encoding: "utf8" });
  if (r.status !== 0) { console.error(`ERROR f${i + 1}@${ts[i]}s: ${(r.stderr ?? String(r.error ?? "")).trim().split("\n")[0]}`); err++; }
}
const ex = opt("--excerpt");
if (ex != null) {
  const dst = join(out, `${stem}-excerpt-${ex}s.mp4`);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(ex), "-t", "4", "-i", video, "-c:v", "libx264", "-crf", "20", "-an", dst], { encoding: "utf8" });
  if (r.status !== 0) { console.error(`ERROR excerpt: ${(r.stderr ?? String(r.error ?? "")).trim().split("\n")[0]}`); err++; }
}
console.log(`${stem}: ${dur.toFixed(1)}s → ${n}장${ex != null ? " + 발췌 4s" : ""} → ${out}`);
process.exit(err ? 1 : 0);
