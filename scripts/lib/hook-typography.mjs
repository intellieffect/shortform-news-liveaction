import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

// Authored hook rows (hook-overlay@3): advance widths from the exact public/fonts files the
// renderer registers. No browser or network. The browser DOM preflight remains the final check;
// this is the honest pre-render gate (no auto shrink, no wrap).
export const HOOK_FONT_FILES = Object.freeze({
  GmarketSans: Object.freeze({500: 'GmarketSansTTFMedium.ttf', 700: 'GmarketSansTTFBold.ttf'}),
  Pretendard: Object.freeze({400: 'Pretendard-Regular.otf', 700: 'Pretendard-Bold.otf', 800: 'Pretendard-ExtraBold.otf'}),
});
const cache = new Map();

export const hookFontSupported = (family, weight) =>
  typeof weight === 'number' && Number.isInteger(weight) && typeof family === 'string' && Object.hasOwn(HOOK_FONT_FILES, family) && Object.hasOwn(HOOK_FONT_FILES[family], String(weight));

// {font} or {error}; parse failures are cached as errors and never thrown.
export const loadHookFont = (family, weight) => {
  if (!hookFontSupported(family, weight)) return {error: `지원하지 않는 후킹 폰트: ${family} ${weight}`};
  const file = HOOK_FONT_FILES[family][weight];
  if (!cache.has(file)) {
    try {
      const bytes = readFileSync(new URL(`../../public/fonts/${file}`, import.meta.url));
      const {parse} = require('opentype.js');
      cache.set(file, {font: parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))});
    } catch (error) {
      cache.set(file, {error: `${file} 폰트를 읽을 수 없다: ${error?.message ?? error}`});
    }
  }
  return cache.get(file);
};

// CSS letter-spacing adds its value after every character, including the last.
export const measureHookRun = ({text, font_family, font_weight, font_size, letter_spacing}) => {
  const loaded = loadHookFont(font_family, font_weight);
  if (loaded.error) return {width: NaN, missing: [], error: loaded.error};
  const chars = [...text];
  const missing = [...new Set(chars.filter(ch => loaded.font.charToGlyphIndex(ch) === 0))];
  try {
    const width = loaded.font.getAdvanceWidth(text, font_size, {kerning: true}) + letter_spacing * chars.length;
    return {width, missing, error: null};
  } catch (error) {
    return {width: NaN, missing, error: `실측 실패: ${error?.message ?? error}`};
  }
};

// Validated rows only. Returns issues; never throws.
export const hookRowWidthIssues = (rows, width, where) => rows.flatMap((row, index) => {
  const at = `${where}.rows[${index}]`;
  const errors = [];
  let total = 0;
  for (const run of row.runs) {
    const measured = measureHookRun(run);
    if (measured.error) { errors.push({code: 'hook-font', where: at, message: measured.error}); continue; }
    if (measured.missing.length) errors.push({code: 'hook-glyph', where: at, message: `${run.font_family} ${run.font_weight}에 없는 글자: ${measured.missing.join(' ')}`});
    total += measured.width;
  }
  if (!errors.length && total > width)
    errors.push({code: 'hook-width', where: at, message: `줄 실측 ${total.toFixed(2)}px가 문구 폭 ${width}px를 넘는다. 줄·배치를 조정하고 자동 축소·줄바꿈하지 않는다`});
  return errors;
});
