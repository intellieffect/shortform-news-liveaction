// editorial proof 연락지(contact sheet)의 **계산 전부** — 페이지 나누기·페이지 치수·파일 이름·manifest·index.
//
// 왜 분리하나: 예전 editorial sheet 는 proof 263장을 Still 1장(1200x40944)에 **동시에 마운트**했다.
// 장면 263개가 한 페이지에서 같이 살아 있으니 브라우저가 10분 넘게 멎었다(2026-09-22 실측).
// 지금 경로는 ① proof 를 1장씩 bounded 로 렌더해 JPEG 로 떨어뜨리고 ② **그 JPEG 만** 격자에 얹어
// 페이지 PNG 를 만든다. 페이지에는 <Img> 밖에 없고, 원래 장면은 개별 JPEG 렌더의 제한된 워커에서만 산다.
//
// 이 파일은 Remotion·파일시스템을 모른다 — 숫자와 이름만 만든다. 그래서 테스트가 렌더 없이 돈다.

/** 페이지 격자. cols*rows = 페이지당 proof 수. 이 값이 페이지 치수의 단일 소스다. */
export const SHEET_LAYOUT = {
  cols: 4,
  rows: 6,
  tileW: 270,   // 1080 * 0.25
  tileH: 480,   // 1920 * 0.25
  gap: 16,
  labelH: 74,
  pad: 24,
  headerH: 56,
};

/** 페이지 픽셀 상한 — 한 장이 이보다 커지면 "거대 합성"으로 되돌아간 것이다. 계산 단계에서 막는다. */
export const MAX_PAGE_PX = 4096;

export const perPage = (layout = SHEET_LAYOUT) => layout.cols * layout.rows;

export const pageSize = (layout = SHEET_LAYOUT) => {
  const width = layout.pad * 2 + layout.cols * layout.tileW + (layout.cols - 1) * layout.gap;
  const height =
    layout.pad * 2 +
    layout.headerH +
    layout.rows * (layout.tileH + layout.labelH) +
    (layout.rows - 1) * layout.gap;
  if (width > MAX_PAGE_PX || height > MAX_PAGE_PX)
    throw new Error(`proof sheet 페이지 치수가 상한을 넘는다: ${width}x${height} > ${MAX_PAGE_PX}`);
  return { width, height };
};

/**
 * proof 이미지 파일 이름. **zero-pad 하지 않는다.**
 * build-slides.mjs 는 /^element-\d+\.jpe?g$/ 로 읽고 숫자로 정렬하며,
 * build-editorial-slides.mjs 는 `slides/element-<index>.jpeg` 를 그대로 참조한다.
 * 두 소비자를 동시에 만족시키는 이름은 pad 없는 쪽뿐이다.
 */
export const proofImageName = (index) => `element-${index}.jpeg`;

export const pageFileName = (page, pageCount, stem = "page") =>
  `${stem}-${String(page).padStart(Math.max(2, String(pageCount).length), "0")}.png`;

/**
 * proof 목록 → 페이지 계획(manifest). 순서는 proof 순서 그대로, 각 proof 는 정확히 한 페이지에 한 번.
 * @param {{pilotId:string, proofs:{id:string,frame:number,labels?:string[]}[], fps:number,
 *          layout?:typeof SHEET_LAYOUT, stem?:string, imageDir?:string, generatedAt?:string}} args
 */
export const buildSheetPlan = ({
  pilotId,
  proofs,
  fps,
  layout = SHEET_LAYOUT,
  stem = "page",
  imageDir = "slides",
  generatedAt = new Date().toISOString(),
}) => {
  if (!Array.isArray(proofs) || !proofs.length) throw new Error(`${pilotId}: proof_frames가 없다`);
  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`${pilotId}: fps가 없다`);
  const size = pageSize(layout);
  const chunk = perPage(layout);
  const pageCount = Math.ceil(proofs.length / chunk);
  const pages = [];
  for (let page = 1; page <= pageCount; page++) {
    const from = (page - 1) * chunk;
    const slice = proofs.slice(from, from + chunk);
    pages.push({
      page,
      file: pageFileName(page, pageCount, stem),
      from,
      to: from + slice.length - 1,
      tiles: slice.map((proof, offset) => {
        const index = from + offset;
        return {
          index,
          id: proof.id,
          frame: proof.frame,
          seconds: Number((proof.frame / fps).toFixed(3)),
          labels: proof.labels ?? [],
          image: proofImageName(index),
        };
      }),
    });
  }
  return {
    schema: "editorial-proof-sheet@1",
    pilot: pilotId,
    generated_at: generatedAt,
    fps,
    proof_count: proofs.length,
    page_count: pageCount,
    per_page: chunk,
    page: { width: size.width, height: size.height, cols: layout.cols, rows: layout.rows, tile: { w: layout.tileW, h: layout.tileH } },
    images: { dir: imageDir, name_pattern: "element-<index>.jpeg" },
    layout,
    pages,
  };
};

/** 계획이 "모든 proof 를 한 번씩, 경계 안에서" 담고 있는지. 반환이 빈 배열이어야 렌더를 시작한다. */
export const sheetCoverageErrors = (plan, proofs) => {
  const errors = [];
  const seen = new Map();
  let tiles = 0;
  for (const page of plan.pages) {
    if (page.tiles.length > plan.per_page) errors.push(`page ${page.page}: 타일 ${page.tiles.length} > ${plan.per_page}`);
    for (const tile of page.tiles) {
      tiles++;
      if (seen.has(tile.index)) errors.push(`proof index ${tile.index}가 page ${seen.get(tile.index)}와 ${page.page}에 중복된다`);
      seen.set(tile.index, page.page);
    }
  }
  if (tiles !== plan.proof_count) errors.push(`타일 수 ${tiles} ≠ proof 수 ${plan.proof_count}`);
  if (plan.page.width > MAX_PAGE_PX || plan.page.height > MAX_PAGE_PX)
    errors.push(`페이지 치수 ${plan.page.width}x${plan.page.height}가 상한 ${MAX_PAGE_PX}를 넘는다`);
  if (Array.isArray(proofs)) {
    if (proofs.length !== plan.proof_count) errors.push(`계획의 proof 수 ${plan.proof_count} ≠ 입력 ${proofs.length}`);
    for (let index = 0; index < proofs.length; index++) {
      const page = plan.pages[Math.floor(index / plan.per_page)];
      const tile = page?.tiles?.find((candidate) => candidate.index === index);
      if (!tile) { errors.push(`proof index ${index}가 어느 페이지에도 없다`); continue; }
      if (tile.id !== proofs[index].id) errors.push(`proof index ${index}의 id가 다르다: ${tile.id} ≠ ${proofs[index].id}`);
      if (tile.frame !== proofs[index].frame) errors.push(`proof index ${index}의 frame이 다르다: ${tile.frame} ≠ ${proofs[index].frame}`);
    }
  }
  return errors;
};

/** 페이지 PNG 를 넘겨 보는 index. 원본 proof JPEG 경로도 같이 적어 어디를 봐야 하는지 남긴다. */
export const sheetIndexHtml = (plan) => {
  const rows = plan.pages
    .map(
      (page) =>
        `<li><a href="${page.file}">${page.file}</a> — proof ${page.from + 1}–${page.to + 1} (${page.tiles.length}장) · ${page.tiles[0]?.id ?? "?"} … ${page.tiles[page.tiles.length - 1]?.id ?? "?"}</li>`,
    )
    .join("\n");
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${plan.pilot} editorial proof sheet</title>
<style>body{margin:0;padding:24px;background:#101522;color:#eef2f7;font-family:Pretendard,system-ui,sans-serif}h1{font-size:22px;margin:0 0 6px}p{color:#bac7d5;margin:4px 0 16px;font-size:14px}ol{line-height:1.8;font-size:15px}a{color:#8ec5ff}img{display:block;width:100%;max-width:${plan.page.width}px;margin:18px 0;border-radius:10px;background:#030911}</style>
<h1>${plan.pilot} — proof ${plan.proof_count}장 / 페이지 ${plan.page_count}장</h1>
<p>페이지 1장 = ${plan.page.cols}×${plan.page.rows} = 최대 ${plan.per_page} proof · ${plan.page.width}×${plan.page.height}px · 만든 시각 ${plan.generated_at}</p>
<ol>
${rows}
</ol>
${plan.pages.map((page) => `<img src="${page.file}" alt="${page.file}" loading="lazy">`).join("\n")}
</html>`;
};
