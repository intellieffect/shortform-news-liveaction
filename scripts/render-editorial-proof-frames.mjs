#!/usr/bin/env node
// 본편 composition의 실제 frame을 직접 렌더한다. 비선형 proof frame을 짧은 Slides composition 안에서
// 시간 이동하면 Remotion의 Sequence 등록이 프레임마다 달라져 요소가 간헐적으로 빠질 수 있다.
//
// --sheet 를 붙이면 그렇게 나온 JPEG 만 모아 **페이지형 연락지**(page-01.png …)를 만든다.
// 옛 BeatSheet-<편> Still 은 proof 를 한 장(1200x40944)에 동시에 마운트해 263장에서 10분 넘게 멎었다.
// 그 거대 합성은 이 경로에서 쓰지 않는다 — 페이지는 <Img> 만 얹는다(scripts/lib/proof-sheet-render.mjs).
//
//   node scripts/render-editorial-proof-frames.mjs --pilot <id>                  # proof JPEG 만
//   node scripts/render-editorial-proof-frames.mjs --pilot <id> --sheet          # + 연락지 페이지
//   node scripts/render-editorial-proof-frames.mjs --pilot <id> --sheet --out <경로.png>
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { basename, dirname, join, resolve, relative } from "node:path";
import { REPO, compId, dirs } from "./lib/pilot.mjs";
import { buildSheetPlan, proofImageName, sheetCoverageErrors } from "./lib/proof-sheet.mjs";
import { renderProofPages } from "./lib/proof-sheet-render.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : null;
};
const id = flag("--pilot") ?? argv.find((a) => !a.startsWith("--"));
if (!id) {
  console.error("usage: render-editorial-proof-frames.mjs --pilot <id> [--sheet] [--out <경로.png>]");
  process.exit(2);
}
const wantSheet = argv.includes("--sheet");
const outArg = flag("--out");
const target = outArg ? resolve(outArg) : join(dirs(id).out, "qa", "beatsheet", "page.png");
const sheetDir = dirname(target);
const stem = basename(target).replace(/\.png$/i, "") || "page";
const manifestName = outArg ? `${stem}-manifest.json` : "manifest.json";
const indexName = outArg ? `${stem}-index.html` : "index.html";
// A failed rerun must not leave an old successful manifest/index pointing at
// replaced proof images. Keep page images for inspection, invalidate the receipt.
if (wantSheet) for (const name of [manifestName, indexName]) rmSync(join(sheetDir, name), { force: true });

const { data, out } = dirs(id);
const timeline = JSON.parse(readFileSync(join(data, "timeline.json"), "utf8"));
const proofs = timeline.proof_frames ?? [];
if (!proofs.length) throw new Error(`${id}: proof_frames가 없다`);
const slideDir = join(out, "qa", "slides");
mkdirSync(slideDir, { recursive: true });

// 지난 세대의 element-*.jpeg 가 남아 있으면 이번 proof 목록과 섞인다. narration.mp3 등 다른 파일은 건드리지 않는다.
const STALE = /^element-\d+\.jpe?g$/;
const stale = readdirSync(slideDir).filter((f) => STALE.test(f));
for (const file of stale) unlinkSync(join(slideDir, file));
if (stale.length) console.log(`이전 proof JPEG ${stale.length}장 정리`);

const startedAt = Date.now();
const serveUrl = await bundle({
  entryPoint: join(REPO, "src", "index.ts"),
  onProgress: () => undefined,
});
const browser = await openBrowser("chrome", { chromeMode: "headless-shell", logLevel: "warn" });

try {
  const inputProps = { pilotId: id };
  const composition = await selectComposition({
    serveUrl,
    id: `ShortformNews-${compId(id)}`,
    inputProps,
    puppeteerInstance: browser,
    logLevel: "warn",
  });
  let cursor = 0;
  let completed = 0;
  const worker = async () => {
    while (cursor < proofs.length) {
      const index = cursor++;
      await renderStill({
        serveUrl,
        composition,
        inputProps,
        puppeteerInstance: browser,
        frame: proofs[index].frame,
        imageFormat: "jpeg",
        jpegQuality: 88,
        output: join(slideDir, proofImageName(index)),
        overwrite: true,
        logLevel: "warn",
        timeoutInMilliseconds: 60_000,
      });
      completed++;
      if (completed % 10 === 0 || completed === proofs.length) {
        console.log(`proof frame ${completed}/${proofs.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, proofs.length) }, worker));
} finally {
  await browser.close({ silent: false });
  rmSync(serveUrl, { recursive: true, force: true });
}

const missing = proofs.map((_, index) => proofImageName(index)).filter((name) => !existsSync(join(slideDir, name)));
if (missing.length) {
  console.error(`proof JPEG ${missing.length}장이 안 나왔다: ${missing.slice(0, 5).join(", ")}`);
  process.exit(1);
}
console.log(`editorial proof frames → ${slideDir} (${proofs.length}장, ${((Date.now() - startedAt) / 1000).toFixed(1)}초)`);

if (!wantSheet) process.exit(0);

// ── 연락지 ────────────────────────────────────────────────────────────────────
const plan = buildSheetPlan({ pilotId: id, proofs, fps: timeline.fps, stem, imageDir: relative(sheetDir, slideDir) });
const planErrors = sheetCoverageErrors(plan, proofs);
if (planErrors.length) {
  for (const error of planErrors) console.error(`ERROR ${error}`);
  process.exit(1);
}

// 지난 세대의 페이지가 남아 있으면 proof 수가 줄었을 때 없는 proof 를 보게 된다.
if (existsSync(sheetDir)) {
  const old = readdirSync(sheetDir).filter((f) => f.startsWith(stem + "-") && /^\d+\.png$/.test(f.slice(stem.length + 1)));
  for (const file of old) unlinkSync(join(sheetDir, file));
  if (old.length) console.log(`이전 연락지 페이지 ${old.length}장 정리`);
}

const sheetStartedAt = Date.now();
const { pagePaths, manifestPath, indexPath } = await renderProofPages({
  plan,
  imageDir: slideDir,
  outDir: sheetDir,
  manifestName, indexName,
  onProgress: (done, total, file) => console.log(`sheet page ${done}/${total} · ${file}`),
});

const legacy = join(out, "qa", "beatsheet.png");
console.log(`\neditorial proof sheet — 한 장짜리 beatsheet.png 를 만들지 않는다(263장 동시 마운트가 멎은 경로).`);
console.log(`  index    : ${indexPath}`);
console.log(`  page 1   : ${pagePaths[0]}`);
console.log(`  pages    : ${pagePaths.length}장 · 각 ${plan.page.width}x${plan.page.height}px · 페이지당 최대 ${plan.per_page}장`);
console.log(`  manifest : ${manifestPath}`);
console.log(`  proofs   : ${plan.proof_count}장 전부 수록 · 원본 JPEG ${slideDir}`);
console.log(`  걸린 시간: 연락지 ${((Date.now() - sheetStartedAt) / 1000).toFixed(1)}초 · 전체 ${((Date.now() - startedAt) / 1000).toFixed(1)}초`);
if (existsSync(legacy)) console.log(`  ⚠ 옛 ${legacy} 은 이번 실행이 갱신하지 않았다(구형 단일 합성).`);
