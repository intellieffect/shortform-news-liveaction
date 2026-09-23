#!/usr/bin/env node
// Prepare everything a P5/P7 reviewer needs from one MP4, so reviewers judge
// instead of hunting for tools: timeline proof frames at original and 1/3 mobile
// size, numbered contact sheets, the audio measurement log, and an optional
// transcript the producer already made. Samples and measurements are evidence,
// not viewing or listening; the index says so.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const PER_SHEET = 12, COLUMNS = 4;

export const parseRanges = (text) => (text ? text.split(",").map((part) => {
  const m = /^(\d+)-(\d+)$/.exec(part.trim());
  if (!m || Number(m[2]) <= Number(m[1])) throw new Error(`--ranges는 from-end 프레임([from,end)) 목록이다: ${part}`);
  return [Number(m[1]), Number(m[2])];
}) : null);

// Pick proof frames, restricted to changed ranges on a recheck. Each range also
// gets its first and last frame so a short fix is never unsampled.
export const selectFrames = (proofFrames, totalFrames, ranges) => {
  const inside = (f) => !ranges || ranges.some(([a, b]) => f >= a && f < b);
  const picked = new Map();
  for (const p of proofFrames) if (p.frame >= 0 && p.frame < totalFrames && inside(p.frame)) picked.set(p.frame, { frame: p.frame, labels: p.labels ?? [] });
  for (const [a, b] of ranges ?? []) for (const f of [a, Math.min(b, totalFrames) - 1]) if (f >= 0 && f < totalFrames && !picked.has(f)) picked.set(f, { frame: f, labels: ["range-edge"] });
  return [...picked.values()].sort((x, y) => x.frame - y.frame);
};

export const buildPacket = ({ repo = process.cwd(), id, mp4, round, ranges = null, transcript = null, force = false }) => {
  if (!id || !mp4 || !/^r\d+$/.test(round ?? "")) throw new Error("usage: review-packet.mjs <id> --mp4 <path> --round r<N> [--ranges 300-360,900-960] [--transcript <json|txt>] [--force]");
  const production = join(repo, "news", id, "02_production");
  const timeline = JSON.parse(readFileSync(join(production, "timeline.json"), "utf8"));
  const video = resolve(repo, mp4);
  if (!existsSync(video)) throw new Error(`MP4가 없다: ${mp4}`);
  const out = join(repo, "out/pilots", id, "review", round, "packet");
  if (existsSync(out)) { if (!force) throw new Error(`${relative(repo, out)}가 이미 있다. 같은 라운드를 다시 만들 때만 --force`); rmSync(out, { recursive: true }); }
  for (const dir of ["orig", "mobile", "sheets"]) mkdirSync(join(out, dir), { recursive: true });

  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=width,height,nb_read_packets,avg_frame_rate", "-of", "json", video], { encoding: "utf8" })).streams[0];
  const totalFrames = Number(probe.nb_read_packets);
  if (totalFrames !== timeline.total_frames) throw new Error(`MP4 프레임 수 ${totalFrames} ≠ timeline.total_frames ${timeline.total_frames}. 현재 timeline으로 렌더한 MP4인지 확인한다`);
  const frames = selectFrames(timeline.proof_frames ?? [], totalFrames, ranges);
  if (!frames.length) throw new Error("선택된 프레임이 없다. --ranges를 확인한다");

  // Exact frame-number selection, in batches (ffmpeg caps expression length).
  const fps = timeline.fps, BATCH = 30;
  for (let b = 0; b < frames.length; b += BATCH) {
    const batch = frames.slice(b, b + BATCH), tmp = join(out, "orig", `.batch${b}`);
    mkdirSync(tmp);
    const select = batch.map((f) => `eq(n\\,${f.frame})`).join("+");
    execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vf", `select='${select}'`, "-fps_mode", "passthrough", join(tmp, "%04d.png")]);
    const extracted = readdirSync(tmp).filter((n) => n.endsWith(".png")).sort();
    if (extracted.length !== batch.length) throw new Error(`추출 ${extracted.length}장 ≠ 선택 ${batch.length}장 (${batch[0].frame}~)`);
    batch.forEach((f, i) => renameSync(join(tmp, extracted[i]), join(out, "orig", `f${String(f.frame).padStart(5, "0")}.png`)));
    rmSync(tmp, { recursive: true });
  }
  frames.forEach((f) => {
    const name = `f${String(f.frame).padStart(5, "0")}`;
    execFileSync("ffmpeg", ["-v", "error", "-i", join(out, "orig", `${name}.png`), "-vf", `scale=${Math.round(probe.width / 3)}:-2`, join(out, "mobile", `${name}.png`)]);
    Object.assign(f, { time: Number((f.frame / fps).toFixed(3)), original: `orig/${name}.png`, mobile: `mobile/${name}.png` });
  });

  // Numbered contact sheets of the mobile frames, left to right, top to bottom.
  const sheets = [];
  for (let s = 0; s * PER_SHEET < frames.length; s++) {
    const group = frames.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
    const list = join(out, "sheets", `.list${s}.txt`);
    writeFileSync(list, group.map((f) => `file '${join(out, f.mobile)}'\nduration 1\n`).join(""));
    const rows = Math.ceil(group.length / COLUMNS);
    const path = `sheets/sheet-${String(s + 1).padStart(2, "0")}.jpg`;
    execFileSync("ffmpeg", ["-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", `tile=${COLUMNS}x${rows}:padding=8:color=white`, "-frames:v", "1", "-q:v", "3", join(out, path)]);
    rmSync(list);
    group.forEach((f, i) => { f.sheet = path; f.sheet_position = i + 1; });
    sheets.push({ path, frames: group.map((f) => f.frame), layout: `${COLUMNS} columns, left→right then top→bottom` });
  }

  const audioLog = join(out, "audio-measure.txt");
  writeFileSync(audioLog, execFileSync("bash", [join(repo, "scripts/audio-measure.sh"), video, ...(existsSync(join(production, "audio/narration.wav")) ? ["--narr", join(production, "audio/narration.wav")] : [])], { encoding: "utf8" }));

  let transcriptEntry = { status: "not-provided", note: "전사가 필요하면 제작자가 만들어 --transcript로 넘긴다. 검수자는 전사 도구·모델을 찾지 않는다" };
  if (transcript) {
    const src = resolve(repo, transcript);
    const dest = join(out, "transcript" + (src.endsWith(".json") ? ".json" : ".txt"));
    copyFileSync(src, dest);
    transcriptEntry = { status: "provided", path: relative(out, dest), sha256: sha(dest), source: relative(repo, src), note: "이 MP4 음향의 자동 전사다. 청취가 아니다" };
  }

  const index = {
    contract: "review-packet@1", pilot: id, round,
    artifact: { path: relative(repo, video), sha256: sha(video), total_frames: totalFrames, fps, width: probe.width, height: probe.height },
    scope: ranges ? { kind: "recheck", ranges } : { kind: "full", ranges: [[0, totalFrames]] },
    frames: frames.map((f) => ({ ...f, original_sha256: sha(join(out, f.original)), mobile_sha256: sha(join(out, f.mobile)) })),
    sheets, audio_measure: { path: "audio-measure.txt", sha256: sha(audioLog) }, transcript: transcriptEntry,
    reviewer_instructions: "시트로 전체를 먼저 훑고, 판단이 필요한 프레임만 orig/mobile 원본을 연다. 이 폴더에 없는 도구·모델·파일을 찾지 않는다. 필요한 것이 없으면 그 범위를 미검수로 적고 회신한다. 프레임 표본·측정·전사는 연속 시청·청취가 아니다.",
  };
  writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 2) + "\n");
  return { packet: relative(repo, join(out, "index.json")), frames: frames.length, sheets: sheets.length, transcript: transcriptEntry.status, scope: index.scope.kind };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, ...args] = process.argv.slice(2);
  const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  try {
    console.log(JSON.stringify(buildPacket({ id, mp4: value("--mp4"), round: value("--round"), ranges: parseRanges(value("--ranges")), transcript: value("--transcript"), force: args.includes("--force") }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
