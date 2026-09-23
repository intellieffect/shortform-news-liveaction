// editorial proof 연락지 — 계산(페이지 나누기·치수·이름)과 실제 합성 둘 다 본다.
//
// 지키는 것
//   ① proof 는 전부, 정확히 한 번, 순서대로 어느 페이지엔가 들어간다 (한 장이라도 빠지면 검수가 거짓이 된다)
//   ② 페이지 치수는 유한하고 모든 페이지가 같다 (옛 1200x40944 거대 합성으로 되돌아가지 않는다)
//   ③ 파일 이름은 기존 소비자(build-slides.mjs 정규식, build-editorial-slides.mjs 템플릿)와 그대로 맞는다
//   ④ 실패는 조용히 통과하지 않는다 — 이미지가 없으면 throw, 스크립트는 nonzero
//   ⑤ 실제 fixture 이미지로 작은 페이지를 합성해 PNG 가 계획한 치수로 나온다 (ffmpeg 없으면 건너뜀)
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  MAX_PAGE_PX,
  SHEET_LAYOUT,
  buildSheetPlan,
  pageFileName,
  pageSize,
  perPage,
  proofImageName,
  sheetCoverageErrors,
  sheetIndexHtml,
} from "../scripts/lib/proof-sheet.mjs";
import { renderProofPages } from "../scripts/lib/proof-sheet-render.mjs";

const REPO = new URL("../", import.meta.url).pathname;
const FPS = 30;
const proofsOf = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${String(index + 1).padStart(3, "0")}`,
    frame: index * 7,
    labels: [`concept:c${index % 5}:from`],
  }));
const planOf = (count, extra = {}) => buildSheetPlan({ pilotId: "fixture", proofs: proofsOf(count), fps: FPS, ...extra });

const pngSize = (file) => {
  const buf = readFileSync(file);
  assert.equal(buf.subarray(1, 4).toString("ascii"), "PNG", `${file}: PNG 가 아니다`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};

const ffmpeg = () => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

test("263 proof가 모든 페이지에 정확히 한 번씩, 순서대로 들어간다", () => {
  const proofs = proofsOf(263);
  const plan = buildSheetPlan({ pilotId: "fixture", proofs, fps: FPS });
  assert.equal(plan.proof_count, 263);
  assert.equal(plan.per_page, perPage(SHEET_LAYOUT));
  assert.equal(plan.page_count, Math.ceil(263 / plan.per_page));
  assert.deepEqual(sheetCoverageErrors(plan, proofs), []);

  const flat = plan.pages.flatMap((page) => page.tiles);
  assert.equal(flat.length, 263);
  assert.deepEqual(
    flat.map((tile) => tile.index),
    proofs.map((_, index) => index),
  );
  assert.deepEqual(
    flat.map((tile) => tile.id),
    proofs.map((proof) => proof.id),
  );
  assert.equal(new Set(flat.map((tile) => tile.id)).size, 263);
  assert.equal(flat[0].seconds, 0);
  assert.equal(flat[8].seconds, Number((8 * 7 / FPS).toFixed(3)));
});

test("페이지 치수는 유한하고 모든 페이지가 같다", () => {
  for (const count of [1, 24, 25, 112, 263, 1000]) {
    const plan = planOf(count);
    assert.ok(plan.page.width > 0 && plan.page.width <= MAX_PAGE_PX, `width ${plan.page.width}`);
    assert.ok(plan.page.height > 0 && plan.page.height <= MAX_PAGE_PX, `height ${plan.page.height}`);
    assert.deepEqual({ width: plan.page.width, height: plan.page.height }, pageSize(SHEET_LAYOUT));
    assert.equal(plan.pages.length, Math.ceil(count / plan.per_page));
    for (const page of plan.pages) assert.ok(page.tiles.length <= plan.per_page);
  }
  // 옛 거대 합성(263장 1열 4칸 = 40944px)은 계산 단계에서 막힌다
  assert.throws(() => pageSize({ ...SHEET_LAYOUT, rows: 66 }), /상한을 넘는다/);
});

test("파일 이름이 기존 소비자와 그대로 맞는다 (legacy mapping)", () => {
  const plan = planOf(112);
  const names = plan.pages.flatMap((page) => page.tiles.map((tile) => tile.image));
  // build-slides.mjs: /^element-\d+\.jpe?g$/ 로 걸러 숫자로 정렬한다
  const LEGACY = /^element-\d+\.jpe?g$/;
  for (const name of names) assert.match(name, LEGACY);
  const sorted = [...names].sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  assert.deepEqual(sorted, names, "숫자 정렬이 proof 순서와 같아야 한다");
  // build-editorial-slides.mjs: `slides/element-${index}.jpeg`
  plan.pages.forEach((page) =>
    page.tiles.forEach((tile) => assert.equal(`slides/${tile.image}`, `slides/element-${tile.index}.jpeg`)),
  );
  assert.equal(proofImageName(0), "element-0.jpeg");
  assert.equal(pageFileName(1, 11), "page-01.png");
  assert.equal(pageFileName(11, 11), "page-11.png");
  assert.equal(pageFileName(3, 120, "sheet"), "sheet-003.png");
});

test("계획이 깨지면 coverage 검사가 잡는다", () => {
  const proofs = proofsOf(50);
  const plan = buildSheetPlan({ pilotId: "fixture", proofs, fps: FPS });

  const dropped = structuredClone(plan);
  dropped.pages[0].tiles.pop();
  assert.ok(sheetCoverageErrors(dropped, proofs).length, "빠진 proof를 잡아야 한다");

  const duped = structuredClone(plan);
  duped.pages[1].tiles[0] = structuredClone(plan.pages[0].tiles[0]);
  assert.ok(sheetCoverageErrors(duped, proofs).some((e) => /중복/.test(e)));

  const huge = structuredClone(plan);
  huge.page.height = MAX_PAGE_PX + 1;
  assert.ok(sheetCoverageErrors(huge, proofs).some((e) => /상한/.test(e)));

  const reordered = structuredClone(plan);
  reordered.pages[0].tiles[0].id = "pXXX";
  assert.ok(sheetCoverageErrors(reordered, proofs).some((e) => /id가 다르다/.test(e)));

  assert.throws(() => buildSheetPlan({ pilotId: "fixture", proofs: [], fps: FPS }), /proof_frames가 없다/);
});

test("index.html이 모든 페이지를 건다", () => {
  const plan = planOf(263);
  const html = sheetIndexHtml(plan);
  for (const page of plan.pages) assert.ok(html.includes(page.file), `${page.file} 링크가 없다`);
  assert.ok(html.includes(`proof ${plan.proof_count}장`));
});

test("이미지가 없으면 합성은 실패한다", async () => {
  const dir = mkdtempSync(join(tmpdir(), "proof-sheet-missing-"));
  try {
    await assert.rejects(
      renderProofPages({ plan: planOf(3), imageDir: dir, outDir: join(dir, "sheet") }),
      /proof 이미지 3장이 없다/,
    );
    assert.equal(existsSync(join(dir, "sheet", "page-01.png")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("개별 proof 렌더가 실패하면 스크립트가 nonzero로 끝난다", () => {
  const r = spawnSync(process.execPath, [join(REPO, "scripts", "render-editorial-proof-frames.mjs"), "--pilot", "no_such_pilot_xyz"], {
    cwd: REPO,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.notEqual(r.status, 0, "없는 편인데 0으로 끝났다");
  assert.equal(spawnSync(process.execPath, [join(REPO, "scripts", "render-editorial-proof-frames.mjs")], { cwd: REPO, encoding: "utf8" }).status, 2);
});

test("fixture 이미지로 작은 페이지를 실제로 합성한다", { skip: ffmpeg() ? false : "ffmpeg 없음" }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), "proof-sheet-render-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const imageDir = join(root, "slides");
  const outDir = join(root, "sheet");
  mkdirSync(imageDir, { recursive: true });

  const COUNT = 5;
  const layout = { cols: 2, rows: 2, tileW: 90, tileH: 160, gap: 8, labelH: 40, pad: 12, headerH: 30 };
  const colors = ["red", "green", "blue", "yellow", "magenta"];
  for (let index = 0; index < COUNT; index++) {
    execFileSync("ffmpeg", [
      "-v", "error", "-y",
      "-f", "lavfi", "-i", `color=c=${colors[index]}:s=108x192`,
      "-frames:v", "1",
      join(imageDir, proofImageName(index)),
    ]);
  }

  const proofs = proofsOf(COUNT);
  const plan = buildSheetPlan({ pilotId: "fixture", proofs, fps: FPS, layout });
  assert.deepEqual(sheetCoverageErrors(plan, proofs), []);
  assert.equal(plan.page_count, 2);

  const { pagePaths, manifestPath, indexPath } = await renderProofPages({ plan, imageDir, outDir });
  assert.equal(pagePaths.length, 2);
  for (const page of pagePaths) {
    assert.ok(existsSync(page), `${page} 가 없다`);
    assert.deepEqual(pngSize(page), { width: plan.page.width, height: plan.page.height });
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schema, "editorial-proof-sheet@1");
  assert.equal(manifest.proof_count, COUNT);
  assert.deepEqual(
    manifest.pages.flatMap((page) => page.tiles.map((tile) => tile.id)),
    proofs.map((proof) => proof.id),
  );
  assert.ok(readFileSync(indexPath, "utf8").includes(manifest.pages[1].file));

  // 페이지 PNG 가 실제로 그림을 담았는지 — 빈 배경만 나왔으면 파일이 비정상적으로 작다
  for (const page of pagePaths) assert.ok(readFileSync(page).length > 2000, `${page} 가 너무 작다`);
  // A failed rerun must invalidate the preceding completion markers.
  rmSync(join(imageDir, proofImageName(0)));
  await assert.rejects(renderProofPages({ plan, imageDir, outDir }), /proof 이미지/);
  assert.equal(existsSync(manifestPath), false);
  assert.equal(existsSync(indexPath), false);
});

test("이미지 1장이 비면 그 페이지에서 멈춘다", { skip: ffmpeg() ? false : "ffmpeg 없음" }, async (t) => {
  const root = mkdtempSync(join(tmpdir(), "proof-sheet-broken-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const imageDir = join(root, "slides");
  mkdirSync(imageDir, { recursive: true });
  for (let index = 0; index < 2; index++) {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=108x192", "-frames:v", "1", join(imageDir, proofImageName(index))]);
  }
  writeFileSync(join(imageDir, proofImageName(2)), "");   // 깨진 파일
  const proofs = proofsOf(3);
  const plan = buildSheetPlan({ pilotId: "fixture", proofs, fps: FPS, layout: { cols: 3, rows: 1, tileW: 90, tileH: 160, gap: 8, labelH: 40, pad: 12, headerH: 30 } });
  await assert.rejects(renderProofPages({ plan, imageDir, outDir: join(root, "sheet"), timeoutInMilliseconds: 20_000 }));
  assert.equal(existsSync(join(root, "sheet", "manifest.json")), false, "실패했는데 manifest를 썼다");
});
