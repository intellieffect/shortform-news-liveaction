#!/usr/bin/env node
/**
 * public/pilots/<id>/{ext,video}/ 복원.
 *
 * 왜 필요한가: `npm run sync` 는 데이터 JSON·photo·overlay·audio 만 옮긴다.
 * 실사/영상 자산(ext/·video/)은 shots.json 의 origin_path·clip 으로 만들어진 파생물이라
 * sync 로는 돌아오지 않는다. public/ 을 날리면 이 스크립트가 유일한 복구 경로다.
 *
 * 사용: node scripts/restore-media.mjs [<편 id> ...]   (인자 없으면 active 전부)
 *      --dry  실행 없이 계획만
 */
import { existsSync, mkdirSync, copyFileSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { inputRoot, readActive } from "./lib/pilot.mjs";

const REPO = resolve(new URL("..", import.meta.url).pathname);
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const dry = process.argv.includes("--dry");
const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const list = ids.length ? ids : readActive();

const isVideo = (p) => /\.(mp4|webm|mov|mkv)$/i.test(p);

// shots.json 이 원본을 안 적어둔 참조의 명시 별칭. 근거는 그 객체의 note 필드.
// (예: "원본 eso2607c 30.0s~" — 파일명이 달라 자동 매칭이 안 된다)
const ALIAS = {
  "hani_satellite_pollution/video/b03_vlt_timelapse.mp4":
    "02_production/external_assets/eso/eso2607c_VLT_timelapse_ultra_hd.mp4",
  "hani_satellite_pollution/video/b04_elt_timelapse.mp4":
    "02_production/external_assets/eso/eso2607b_ELT_timelapse_1080p.mp4",
};
let made = 0, skipped = 0, missing = [];

for (const id of list) {
  const shotsPath = join(REPO, "pilots", id, "shots.json");
  if (!existsSync(shotsPath)) continue;
  const root = inputRoot(id);
  const pub = join(REPO, "public", "pilots", id);
  const shots = JSON.parse(readFileSync(shotsPath, "utf8")).shots ?? [];

  // 1) shots.json 의 모든 객체를 훑되, 원본은 **그 객체 자신의 필드**에서만 찾는다.
  //    (조상에서 물려받으면 엉뚱한 원본이 붙는다 — 2026-08-31 실측으로 확인)
  //    origin 우선순위: origin_path/video_file → assets.json 레지스트리의 asset id
  const registry = new Map();
  const assetsPath = join(REPO, "pilots", id, "assets.json");
  if (existsSync(assetsPath)) {
    const w = (o) => {
      if (Array.isArray(o)) return o.forEach(w);
      if (!o || typeof o !== "object") return;
      if (o.id && typeof o.path === "string" && !registry.has(o.id)) registry.set(o.id, o.path);
      Object.values(o).forEach(w);
    };
    w(JSON.parse(readFileSync(assetsPath, "utf8")));
  }
  const originOf = (o) => o.origin_path || o.video_file || (o.asset ? registry.get(o.asset) : null);

  // origin 을 못 찾는 참조(Motion Canvas 산출물 등)를 위한 파일명 정확 일치 폴백.
  // input 저장소 02_production 아래를 한 번만 훑어 basename → 상대경로 색인을 만든다.
  const byName = new Map();
  const indexDir = (dir) => {
    let ents = [];
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const full = join(dir, e.name);
      if (e.isDirectory()) indexDir(full);
      else if (!byName.has(e.name)) byName.set(e.name, relative(root, full));
    }
  };
  indexDir(join(root, "02_production"));
  const originOrName = (o, ref) => originOf(o) || ALIAS[`${id}/${ref}`] || byName.get(ref.slice(ref.lastIndexOf("/") + 1)) || null;

  const imgs = new Map(), vids = new Map();
  const collect = (o) => {
    if (Array.isArray(o)) return o.forEach(collect);
    if (!o || typeof o !== "object") return;
    if (typeof o.file === "string" && o.file.startsWith("ext/") && !imgs.has(o.file)) {
      const org = originOrName(o, o.file);
      if (org) imgs.set(o.file, { origin: org, posterAt: o.clip?.from_sec ?? o.from_sec ?? 0 });
    }
    if (typeof o.file === "string" && o.file.startsWith("video/") && !vids.has(o.file)) {
      const org = originOrName(o, o.file);
      // 이름이 정확히 같으면 트림 없이 그대로 쓴다(이미 파생물)
      if (org) vids.set(o.file, { origin: org, from: o.from_sec ?? 0, len: o.len_sec, asis: org.endsWith("/" + o.file.slice(o.file.lastIndexOf("/") + 1)) });
    }
    if (o.clip && typeof o.clip.file === "string" && !vids.has(o.clip.file)) {
      const org = originOrName(o, o.clip.file);
      if (org) vids.set(o.clip.file, { origin: org, from: o.clip.from_sec ?? 0, len: o.clip.len_sec, asis: org.endsWith("/" + o.clip.file.slice(o.clip.file.lastIndexOf("/") + 1)) });
    }
    Object.values(o).forEach(collect);
  };
  collect(shots);

  for (const [rel, { origin, posterAt }] of imgs) {
    const src = join(root, origin), dst = join(pub, rel);
    if (!existsSync(src)) { missing.push(`${id} ${rel} ← ${origin}`); continue; }
    if (existsSync(dst)) { skipped++; continue; }
    if (dry) { console.log(`+ ${id}/${rel}`); made++; continue; }
    mkdirSync(dirname(dst), { recursive: true });
    if (isVideo(src)) {
      execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", String(posterAt), "-i", src, "-frames:v", "1", "-q:v", "2", dst]);
    } else if (/\.(png|webp)$/i.test(dst) !== /\.(png|webp)$/i.test(src)) {
      // 확장자가 다르면 변환 (예: .webp 원본 → .png 참조)
      execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", src, dst]);
    } else {
      copyFileSync(src, dst);
    }
    made++;
  }

  for (const [rel, { origin, from, len, asis }] of vids) {
    const src = join(root, origin), dst = join(pub, rel);
    if (!existsSync(src)) { missing.push(`${id} ${rel} ← ${origin}`); continue; }
    if (existsSync(dst)) { skipped++; continue; }
    if (dry) { console.log(`+ ${id}/${rel} (${from}s +${len}s)`); made++; continue; }
    mkdirSync(dirname(dst), { recursive: true });
    if (asis) { copyFileSync(src, dst); made++; continue; }
    const args = ["-y", "-loglevel", "error", "-ss", String(from), "-i", src];
    if (len != null) args.push("-t", String(len));
    if (/\.webm$/i.test(dst)) args.push("-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", "-pix_fmt", "yuva420p", "-an");
    else args.push("-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-an");
    args.push(dst);
    execFileSync(FFMPEG, args);
    made++;
  }

  // 2) 자산 레지스트리(assets.json) 의 이미지 전부 → ext/<id>.<확장자>
  //    shots.json 이 안 쓰는 후보도 복원한다 — 썸네일·검토용으로 참조되기 때문
  let reg = 0;
  for (const [aid, apath] of registry) {
    if (!/\.(jpg|jpeg|png|webp)$/i.test(apath)) continue;
    const src = join(root, apath);
    const dst = join(pub, "ext", `${aid}${apath.slice(apath.lastIndexOf("."))}`);
    if (!existsSync(src)) continue;
    if (existsSync(dst)) { skipped++; continue; }
    if (dry) { console.log(`+ ${id}/ext/${aid}`); reg++; continue; }
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    reg++;
  }
  made += reg;
  console.log(`${id}: ext ${imgs.size} · video ${vids.size} · 레지스트리 ${reg}`);
}

console.log(`\n${dry ? "[예행] " : ""}생성 ${made} · 이미 있음 ${skipped} · 원본 없음 ${missing.length}`);
for (const m of missing) console.log(`  원본 없음: ${m}`);
if (missing.length) console.log("\n원본이 없는 편은 news/<id>/02_production/external_assets 를 복구해야 한다 — SOURCES.md·_search/*.json 의 dest→url, 생성물은 gen 히스토리(3편 복구: docs/research/2026-09-01-space-mirror-recovery).");
