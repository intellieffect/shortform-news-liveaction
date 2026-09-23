// 이미 렌더된 proof JPEG → 페이지 PNG. 장면은 한 장도 여기서 마운트하지 않는다(ONLY <Img>).
//
// 전용 번들(src/proof-sheet-entry.tsx)을 쓰는 이유: 이 번들의 public 디렉터리를 편의 proof JPEG 폴더로
// 바꿔 붙여야 staticFile 로 그림을 읽을 수 있고, 그 과정에서 Root.tsx(편별 composition 등록)를 건드리지 않는다.
//
// 실패는 전부 throw 로 올린다 — 페이지가 한 장이라도 안 나오면 manifest·index 를 쓰지 않는다.
// 그래야 "만들어졌다 = 실제로 나왔다" 가 유지된다.
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./pilot.mjs";
import { sheetCoverageErrors, sheetIndexHtml } from "./proof-sheet.mjs";

export const SHEET_ENTRY = join(REPO, "src", "proof-sheet-entry.tsx");
export const SHEET_COMPOSITION = "ProofSheetPage";

const pageProps = (plan, page, imageBase) => ({
  title: `${plan.pilot} editorial proof`,
  page: page.page,
  pageCount: plan.page_count,
  width: plan.page.width,
  height: plan.page.height,
  imageBase,
  tiles: page.tiles,
  layout: plan.layout,
});

/**
 * @param {{plan:object, imageDir:string, outDir:string, imageBase?:string, entryPoint?:string,
 *          manifestName?:string, indexName?:string, timeoutInMilliseconds?:number,
 *          onProgress?:(done:number,total:number,file:string)=>void}} args
 * @returns {Promise<{pagePaths:string[], manifestPath:string, indexPath:string}>}
 */
export async function renderProofPages({
  plan,
  imageDir,
  outDir,
  imageBase = "",
  entryPoint = SHEET_ENTRY,
  manifestName = "manifest.json",
  indexName = "index.html",
  timeoutInMilliseconds = 60_000,
  onProgress,
}) {
  for (const name of [manifestName, indexName]) rmSync(join(outDir, name), { force: true });
  const planErrors = sheetCoverageErrors(plan);
  if (planErrors.length) throw new Error(`proof sheet 계획이 잘못됐다:\n${planErrors.map((e) => `  ${e}`).join("\n")}`);

  const missing = [];
  for (const page of plan.pages)
    for (const tile of page.tiles)
      if (!existsSync(join(imageDir, imageBase, tile.image))) missing.push(tile.image);
  if (missing.length)
    throw new Error(`proof 이미지 ${missing.length}장이 없다 (${imageDir}): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}`);

  mkdirSync(outDir, { recursive: true });

  const serveUrl = await bundle({
    entryPoint,
    publicDir: imageDir,
    onProgress: () => undefined,
  });
  const browser = await openBrowser("chrome", { chromeMode: "headless-shell", logLevel: "warn" });
  const pagePaths = [];
  try {
    const composition = await selectComposition({
      serveUrl,
      id: SHEET_COMPOSITION,
      inputProps: pageProps(plan, plan.pages[0], imageBase),
      puppeteerInstance: browser,
      logLevel: "warn",
      timeoutInMilliseconds,
    });
    if (composition.width !== plan.page.width || composition.height !== plan.page.height)
      throw new Error(`페이지 치수가 계획과 다르다: ${composition.width}x${composition.height} ≠ ${plan.page.width}x${plan.page.height}`);
    for (const page of plan.pages) {
      const output = join(outDir, page.file);
      await renderStill({
        serveUrl,
        composition,
        inputProps: pageProps(plan, page, imageBase),
        puppeteerInstance: browser,
        frame: 0,
        imageFormat: "png",
        output,
        overwrite: true,
        logLevel: "warn",
        timeoutInMilliseconds,
      });
      if (!existsSync(output)) throw new Error(`페이지가 안 나왔다: ${output}`);
      pagePaths.push(output);
      onProgress?.(pagePaths.length, plan.page_count, page.file);
    }
  } finally {
    await browser.close({ silent: false });
    rmSync(serveUrl, { recursive: true, force: true });
  }

  // 전부 나온 뒤에만 색인을 쓴다 — 색인이 있으면 페이지도 다 있다.
  const manifestPath = join(outDir, manifestName);
  const indexPath = join(outDir, indexName);
  writeFileSync(manifestPath, JSON.stringify(plan, null, 2) + "\n");
  writeFileSync(indexPath, sheetIndexHtml(plan));
  return { pagePaths, manifestPath, indexPath };
}
