#!/usr/bin/env node
// 본편 composition의 실제 frame을 직접 렌더한다. 비선형 proof frame을 짧은 Slides composition 안에서
// 시간 이동하면 Remotion의 Sequence 등록이 프레임마다 달라져 요소가 간헐적으로 빠질 수 있다.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, compId, dirs } from "./lib/pilot.mjs";

const argv = process.argv.slice(2);
const at = argv.indexOf("--pilot");
const id = at >= 0 ? argv[at + 1] : argv[0];
if (!id) {
  console.error("usage: render-editorial-proof-frames.mjs --pilot <id>");
  process.exit(2);
}

const { data, out } = dirs(id);
const timeline = JSON.parse(readFileSync(join(data, "timeline.json"), "utf8"));
const proofs = timeline.proof_frames ?? [];
if (!proofs.length) throw new Error(`${id}: proof_frames가 없다`);
const slideDir = join(out, "qa", "slides");
mkdirSync(slideDir, { recursive: true });
const digits = Math.max(2, String(proofs.length - 1).length);
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
        output: join(slideDir, `element-${String(index).padStart(digits, "0")}.jpeg`),
        overwrite: true,
        logLevel: "warn",
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

console.log(`editorial proof frames → ${slideDir} (${proofs.length})`);
