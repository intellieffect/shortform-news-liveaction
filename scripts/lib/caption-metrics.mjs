import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Actual advance widths from the TTF files the renderer loads. No browser or
// network: opentype.js parses public/fonts once per weight and the parsed font
// is cached for the process.
const FONT_FILES = {
  GmarketSans: { 500: "GmarketSansTTFMedium.ttf", 700: "GmarketSansTTFBold.ttf" },
};
const cache = new Map();

export const captionFont = (family = "GmarketSans", weight = 500) => {
  const file = FONT_FILES[family]?.[weight];
  if (!file) throw new Error(`자막 폭 실측 폰트가 없다: ${family} ${weight}`);
  if (!cache.has(file)) {
    const bytes = readFileSync(new URL(`../../public/fonts/${file}`, import.meta.url));
    // CLI intake/resume can inspect contracts without loading the font parser.
    const { parse } = require("opentype.js");
    cache.set(file, parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  }
  return cache.get(file);
};

// Width in px of one caption line at the given size. Kerning is applied as the
// browser does by default; GmarketSans has no kern pairs for Hangul, so this
// matches the rendered advance within rounding.
export const measureCaptionText = (text, { family = "GmarketSans", weight = 500, fontSize }) => {
  if (!(fontSize > 0)) throw new Error("fontSize가 필요하다");
  return captionFont(family, weight).getAdvanceWidth(text, fontSize, { kerning: true });
};

// Text area inside the caption box: canvas minus both side insets and paddings.
export const captionTextWidth = (profile) => profile.canvas.width - 2 * (profile.caption.side_inset + profile.caption.padding_x);
