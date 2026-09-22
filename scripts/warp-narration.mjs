#!/usr/bin/env node
/**
 * 내레이션 타임워프 — 재생성한 TTS 를 **원본 격자**에 맞춘다.
 *
 * 왜: TTS 에 `seed` 가 없으면 같은 원고라도 길이가 달라진다. 내레이션은 마스터 클록이라
 * 길이가 바뀌면 beats·shots·audio 가 전부 어긋난다 — 3편이 원본 73.8s 격자에 맞춰 되살린 그 방법을
 * 도구로 굳혔다(7편에서 `git worktree remove` 가 wav 를 지웠다, 2026-09-03).
 *
 * 조건: **단어열이 같아야 한다.** 원고가 그대로면 Typecast 는 같은 토큰을 낸다 — 길이만 다르다.
 * 문장 단위로 `atempo` 를 걸고 원본 시작 시각에 배치한다(단어 단위는 이음매가 들린다).
 *
 * 사용: node scripts/warp-narration.mjs <root> [--orig <ORIGINAL.json>] [--dry]
 */
import { FFMPEG, FFPROBE } from "./lib/tools.mjs";
import { readFileSync, existsSync, renameSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.argv[2] && resolve(process.argv[2]);
if (!root) { console.error("usage: warp-narration.mjs <root> [--orig <json>] [--dry]"); process.exit(2); }
const argv = process.argv.slice(3);
const DRY = argv.includes("--dry");

const P = (x) => join(root, "02_production", x);

const origPath = argv.indexOf("--orig") >= 0 ? resolve(argv[argv.indexOf("--orig") + 1]) : P("audio/narration.timestamps.ORIGINAL.json");
const O = JSON.parse(readFileSync(origPath, "utf8"));
const N = JSON.parse(readFileSync(P("audio/narration.typecast.timestamps.json"), "utf8"));
const spoken = readFileSync(P("narration.txt"), "utf8").split("\n").filter((l) => l.trim());

const ow = O.words, nw = N.words;
if (ow.length !== nw.length) { console.error(`단어 수가 다르다 ${ow.length} ≠ ${nw.length} — 원고가 바뀌었다면 타임워프가 아니라 재작업이다`); process.exit(1); }
for (let i = 0; i < ow.length; i++)
  if (ow[i].text !== nw[i].text) { console.error(`단어 ${i} 가 다르다: "${ow[i].text}" ≠ "${nw[i].text}"`); process.exit(1); }

// 문장 경계 = narration.txt 줄별 토큰 수 누적
const segs = [];
let k = 0;
for (const [i, line] of spoken.entries()) {
  const n = line.split(/\s+/).filter(Boolean).length;
  const o0 = ow[k].start, o1 = ow[k + n - 1].end;
  const n0 = nw[k].start, n1 = nw[k + n - 1].end;
  segs.push({ i: i + 1, o0, o1, n0, n1, tempo: (n1 - n0) / (o1 - o0) });
  k += n;
}
if (k !== ow.length) { console.error(`토큰 미소진 ${k}/${ow.length} — narration.txt 와 응답이 안 맞는다`); process.exit(1); }

const bad = segs.filter((s) => s.tempo < 0.5 || s.tempo > 2.0);
console.log(`warp: 문장 ${segs.length} · 원본 ${O.audio_duration}s ← 재생성 ${N.audio_duration}s`);
for (const s of segs)
  console.log(`  s${String(s.i).padStart(2, "0")} ${s.o0.toFixed(2)}–${s.o1.toFixed(2)} ← ${s.n0.toFixed(2)}–${s.n1.toFixed(2)}  tempo ${s.tempo.toFixed(4)}`);
if (bad.length) { console.error(`atempo 범위(0.5~2.0) 밖 ${bad.length}건 — 이 방법으로 못 맞춘다`); process.exit(1); }
if (DRY) process.exit(0);

// 문장마다 잘라 배속 → 원본 시작 시각으로 지연 → 합성. 전체 길이는 원본에 맞춘다.
const src = P("audio/narration.wav");
if (!existsSync(src)) { console.error(`없다: ${src}`); process.exit(1); }
const parts = segs.map((s, j) =>
  `[0:a]atrim=start=${s.n0.toFixed(3)}:end=${s.n1.toFixed(3)},asetpts=PTS-STARTPTS,` +
  `atempo=${s.tempo.toFixed(6)},adelay=${Math.round(s.o0 * 1000)}|${Math.round(s.o0 * 1000)}[s${j}]`
);
const mix = `${segs.map((_, j) => `[s${j}]`).join("")}amix=inputs=${segs.length}:normalize=0:dropout_transition=0[out]`;
const dst = P("audio/narration.warped.wav");
const r = spawnSync(FFMPEG, ["-v", "error", "-y", "-i", src,
  "-filter_complex", `${parts.join(";")};${mix}`,
  "-map", "[out]", "-t", String(O.audio_duration), "-ar", "44100", "-ac", "1", dst], { encoding: "utf8" });
if (r.status !== 0) { console.error(r.stderr?.slice(0, 600)); process.exit(1); }

const probe = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dst], { encoding: "utf8" }).stdout.trim();
console.log(`warp → ${dst.replace(root + "/", "")}  ${Number(probe).toFixed(3)}s (목표 ${O.audio_duration}s)`);
renameSync(src, P("audio/narration.regen.wav"));
renameSync(dst, src);
console.log("narration.wav = 워프본 · 재생성 원본은 narration.regen.wav 로 남긴다");
