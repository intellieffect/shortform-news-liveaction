#!/usr/bin/env node
/**
 * 수집 자산 복구·동시 다운로드 — manifest 가 가리키는 파일 중 **없는 것만** 받는다.
 *
 * 왜 (2026-09-03): ① 7편 소싱에서 클립 14개(1.1GB)를 직렬 curl 로 받다 10분 timeout 을 쳤다.
 * ② 그 뒤 `git worktree remove` 가 gitignore 된 자산·산출물을 통째로 지웠다 — 복구할 명령이 없었다.
 * `_search/*.json` 이 URL 원장이라는 건 3편 복구에서 이미 배운 것인데(2026-09-01) 도구가 없어 매번 손으로 했다.
 * (2026-09-22) 워커 안의 `spawnSync curl` 이 실제로는 직렬이었다 — 판단·다운로드는
 * `scripts/lib/asset-download.mjs` 로 옮겼고 여기는 읽고·찍고·ffmpeg 파생만 한다.
 *
 * URL 을 찾는 순서
 *   0. `asset.source_url` / `asset.url`                            ← 명시된 것이 먼저다
 *   1. `_search/svs_item_<id>.json`    media_groups[].items[].instance ← SVS(`source_file` 우선)
 *   2. `_search/nasaimg_assets.json`   { nasa_id: { chosen } }        ← NASA 이미지 라이브러리
 *   3. `01_원문_기사/*.article.json`   imageList[].url                 ← 한겨레 게재 사진
 *   4. 파일명 `mixkit-<곡명>-<id>.mp3`                                  ← `assets.mixkit.co/music/<id>/<id>.mp3`
 *   5. `asset.derive`                  { from, ffmpeg }                ← 다른 자산에서 파생(크롭 정지컷)
 *
 * 사용: node scripts/fetch-assets.mjs <root> [--jobs 4] [--dry] [--force] [--manifest <편 상대경로>]
 */
import { FFMPEG } from "./lib/tools.mjs";
import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_MANIFEST,
  buildUrlIndex,
  downloadAll,
  parseArgs,
  planAssets,
  readManifest,
} from "./lib/asset-download.mjs";


let opts, assets;
try {
  opts = parseArgs(process.argv.slice(2));
  if (!existsSync(opts.root)) throw new Error(`편 폴더 없음: ${opts.root}`);
  assets = readManifest(opts.root, opts.manifest ?? DEFAULT_MANIFEST);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

const { root, jobs: JOBS, dry: DRY, force: FORCE } = opts;
const plan = planAssets({
  root,
  assets,
  index: buildUrlIndex(root),
  force: FORCE,
});
const { downloads, derived, unknown, reused, refused } = plan;

console.log(
  `fetch-assets ${basename(root)}: 받을 것 ${downloads.length} · 파생 ${derived.length}` +
    ` · 재사용 ${reused.length} · 거부 ${refused.length} · URL 못 찾음 ${unknown.length}` +
    `${opts.manifest ? `  (manifest ${opts.manifest})` : ""}${DRY ? "  (예행)" : ""}`,
);
for (const u of unknown) console.log(`  ? ${u.id ?? ""} ${u.path}`);
for (const r of refused) console.log(`  ✗ ${r.a.id ?? r.a.path} — ${r.reason}`);
for (const r of reused) console.log(`  = ${r.a.id ?? r.a.path} — ${r.reason}`);
if (FORCE && reused.length)
  console.log(
    `  (다시 받으려면 그 파일을 직접 지운 뒤 실행한다 — --force 는 원본을 덮지 않는다)`,
  );

if (DRY) {
  for (const j of downloads) console.log(`  + ${j.a.id ?? j.a.path}  ${j.url}`);
  for (const d of derived)
    console.log(`  + ${d.a.id ?? d.a.path} (파생) ← ${d.a.derive.from}`);
  process.exit(refused.length || unknown.length ? 1 : 0);
}

// ── 동시 다운로드 ───────────────────────────────────────────────────────────
const t0 = Date.now();
let ok = 0,
  fail = refused.length + unknown.length;
const results = await downloadAll(downloads, {
  jobs: JOBS,
  onResult: (r, done, total) => {
    const at = `[${done}/${total}]`;
    if (r.ok)
      console.log(
        `  ✓ ${at} ${r.job.a.id ?? r.job.a.path}  ${(r.size / 1e6).toFixed(1)}MB`,
      );
    else
      console.log(
        `  ✗ ${at} ${r.job.a.id ?? r.job.a.path}  ${r.error}  ${r.job.url}`,
      );
  },
});
for (const r of results) {
  if (r.ok) ok += 1;
  else fail += 1;
}

// ── 파생물(크롭 정지컷) ──────────────────────────────────────────────────────
let step = 0;
for (const { a, dst, src } of derived) {
  step += 1;
  const at = `[${step}/${derived.length}]`;
  if (!existsSync(src)) {
    console.log(
      `  ✗ ${at} ${a.id ?? a.path} (파생) — 원본 ${a.derive.from} 없음`,
    );
    fail += 1;
    continue;
  }
  mkdirSync(dirname(dst), { recursive: true });
  const args = [
    "-v",
    "error",
    "-y",
    ...String(a.derive.ffmpeg).split(" ").filter(Boolean),
  ];
  const i = args.indexOf("-i");
  const full =
    i >= 0
      ? [...args.slice(0, i + 1), src, ...args.slice(i + 1), dst]
      : [...args, "-i", src, dst];
  const r = spawnSync(FFMPEG, full, { encoding: "utf8" });
  if (r.status === 0 && existsSync(dst)) {
    ok += 1;
    console.log(`  ✓ ${at} ${a.id ?? a.path} (파생)`);
  } else {
    fail += 1;
    console.log(
      `  ✗ ${at} ${a.id ?? a.path} (파생) ${r.stderr?.slice(0, 120) ?? r.error?.message}`,
    );
  }
}

console.log(
  `fetch-assets: ok ${ok} · fail ${fail} · 재사용 ${reused.length} · ` +
    `${((Date.now() - t0) / 1000).toFixed(0)}초 (jobs=${JOBS})`,
);
process.exit(fail ? 1 : 0);
