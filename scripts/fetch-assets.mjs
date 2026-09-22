#!/usr/bin/env node
/**
 * 수집 자산 복구·병렬 다운로드 — `assets.json` 이 가리키는 파일 중 **없는 것만** 받는다.
 *
 * 왜 (2026-09-03): ① 7편 소싱에서 클립 14개(1.1GB)를 직렬 curl 로 받다 10분 timeout 을 쳤다.
 * ② 그 뒤 `git worktree remove` 가 gitignore 된 자산·산출물을 통째로 지웠다 — 복구할 명령이 없었다.
 * `_search/*.json` 이 URL 원장이라는 건 3편 복구에서 이미 배운 것인데(2026-09-01) 도구가 없어 매번 손으로 했다.
 *
 * URL 을 찾는 순서
 *   1. `_search/nasaimg_assets.json`   { nasa_id: { chosen } }        ← NASA 이미지 라이브러리
 *   2. `_search/svs_item_<id>.json`    media_groups[].items[].instance ← SVS. 파일명이 `svs<id>__<원본파일명>` 이면 그 원본을 찾는다
 *   3. `01_원문_기사/*.article.json`   imageList[].url                 ← 한겨레 게재 사진
 *   4. 파일명 `mixkit-<곡명>-<id>.mp3`                                  ← Mixkit 음악. URL 은 `assets.mixkit.co/music/<id>/<id>.mp3`
 *   5. `asset.derive`                  { from, ffmpeg }                ← 다른 자산에서 파생(크롭 정지컷)
 *
 * 사용: node scripts/fetch-assets.mjs <root> [--jobs 4] [--dry] [--force]
 */
import { FFMPEG } from "./lib/tools.mjs";
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.argv[2] && resolve(process.argv[2]);
if (!root) { console.error("usage: fetch-assets.mjs <root> [--jobs 4] [--dry] [--force]"); process.exit(2); }
const argv = process.argv.slice(3);
const JOBS = Math.max(1, Number(argv[argv.indexOf("--jobs") + 1]) || 4);
const DRY = argv.includes("--dry");
const FORCE = argv.includes("--force");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";


const A = JSON.parse(readFileSync(join(root, "01_input/assets.json"), "utf8"));
const searchDir = join(root, "02_production/external_assets/_search");
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

// ── URL 색인 세 갈래 ─────────────────────────────────────────────────────────
const byNasaId = (() => {
  const d = readJson(join(searchDir, "nasaimg_assets.json"));
  return d ? new Map(Object.entries(d).map(([k, v]) => [k, v.chosen])) : new Map();
})();

const byFilename = new Map(); // SVS: 원본 파일명 → URL
if (existsSync(searchDir)) {
  for (const f of readdirSync(searchDir).filter((x) => x.startsWith("svs_item_"))) {
    const d = readJson(join(searchDir, f));
    for (const g of d?.media_groups ?? [])
      for (const it of g.items ?? []) {
        const u = it.instance?.url;
        if (u) byFilename.set(basename(u), u);
      }
  }
}

const byHaniCaption = (() => {
  const dir = join(root, "01_input/01_원문_기사");
  if (!existsSync(dir)) return [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".article.json"))) {
    const d = readJson(join(dir, f));
    if (d?.imageList) return d.imageList.map((im) => im.url);
  }
  return [];
})();

// ── 자산마다 URL 결정 ────────────────────────────────────────────────────────
const all = [...(A.assets ?? []), ...(A.external_assets ?? []), ...(A.overlay_assets ?? []), ...(A.audio_assets ?? []), ...(A.brief_assets?.free ?? [])];
const jobs = [], derived = [], unknown = [];
for (const a of all) {
  if (!a.path) continue;
  const dst = join(root, a.path);
  if (existsSync(dst) && !FORCE) continue;
  if (a.derive?.from && a.derive?.ffmpeg) { derived.push({ a, dst }); continue; }
  const name = basename(a.path);
  let url = null;
  // 1) SVS — 파일명이 `svs<id>__<원본>` 이면 `__` 뒤가 원본 파일명
  // `source_file` 이 있으면 그게 정본이다 — 내려받을 때 이름을 바꿨으면 `__` 뒤가 원본과 다르다(7편 svs20246)
  const svs = a.source_file ?? (name.includes("__") ? name.split("__").slice(1).join("__") : null);
  if (svs && byFilename.has(svs)) url = byFilename.get(svs);
  // 2) NASA 이미지 — ref 가 nasa_id
  if (!url && a.ref && byNasaId.has(a.ref)) url = byNasaId.get(a.ref);
  // 3) 한겨레 게재 사진 — 파일명 앞의 imgN 순번
  if (!url && /hani_published/.test(a.path)) {
    const m = /img(\d+)/.exec(name);
    if (m && byHaniCaption[Number(m[1]) - 1]) url = byHaniCaption[Number(m[1]) - 1];
  }
  // 4) Mixkit 음악 — 파일명 끝의 숫자가 곡 id 다. 원장(`_search`)이 없어도 파일명만으로 되찾는다.
  // 규칙은 mixkit_scrape.py 가 적어 둔 것(`assets.mixkit.co/music/<id>/<id>.mp3`). 2026-09-03 실측:
  // 7편 BGM 4곡 전부 200 이고, 사용 곡 570 은 생존본과 **md5 동일**(151b1f2a…).
  // `music/preview/<파일명>.mp3` 는 403 이다 — 그쪽으로 적어 두지 않는다.
  if (!url) {
    const mk = /^mixkit-.*-(\d+)\.mp3$/.exec(name);
    if (mk) url = `https://assets.mixkit.co/music/${mk[1]}/${mk[1]}.mp3`;
  }
  if (url) jobs.push({ a, dst, url }); else unknown.push(a);
}

console.log(`fetch-assets ${basename(root)}: 받을 것 ${jobs.length} · 파생 ${derived.length} · URL 못 찾음 ${unknown.length}${DRY ? "  (예행)" : ""}`);
for (const u of unknown) console.log(`  ? ${u.id} ${u.path}`);
if (DRY) { for (const j of jobs) console.log(`  + ${j.a.id}  ${j.url}`); process.exit(0); }

// ── 병렬 다운로드 ────────────────────────────────────────────────────────────
const t0 = Date.now();
let ok = 0, fail = 0;
const queue = [...jobs];
const worker = async () => {
  for (;;) {
    const j = queue.shift();
    if (!j) return;
    mkdirSync(dirname(j.dst), { recursive: true });
    const r = spawnSync("curl", ["-sL", "-m", "900", "-A", UA, "-e", "https://www.hani.co.kr/", "-o", j.dst, j.url], { encoding: "utf8" });
    const size = existsSync(j.dst) ? statSync(j.dst).size : 0;
    if (r.status === 0 && size > 1024) { ok += 1; console.log(`  ✓ ${j.a.id}  ${(size / 1e6).toFixed(1)}MB`); }
    else { fail += 1; console.log(`  ✗ ${j.a.id}  ${j.url}`); }
  }
};
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, worker));

// ── 파생물(크롭 정지컷) ──────────────────────────────────────────────────────
for (const { a, dst } of derived) {
  const src = join(root, a.derive.from);
  if (!existsSync(src)) { console.log(`  ✗ ${a.id} — 원본 ${a.derive.from} 없음`); fail += 1; continue; }
  mkdirSync(dirname(dst), { recursive: true });
  const args = ["-v", "error", "-y", ...String(a.derive.ffmpeg).split(" ").filter(Boolean)];
  const i = args.indexOf("-i");
  const full = i >= 0 ? [...args.slice(0, i + 1), src, ...args.slice(i + 1), dst] : [...args, "-i", src, dst];
  const r = spawnSync(FFMPEG, full, { encoding: "utf8" });
  if (r.status === 0 && existsSync(dst)) { ok += 1; console.log(`  ✓ ${a.id} (파생)`); }
  else { fail += 1; console.log(`  ✗ ${a.id} (파생) ${r.stderr?.slice(0, 120)}`); }
}

console.log(`fetch-assets: ok ${ok} · fail ${fail} · ${((Date.now() - t0) / 1000).toFixed(0)}초 (jobs=${JOBS})`);
process.exit(fail ? 1 : 0);
