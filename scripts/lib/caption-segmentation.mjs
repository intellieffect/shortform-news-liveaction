import { splitLegacyCaptionWords } from "./caption-segmentation-legacy.mjs";
import { captionTextWidth, measureCaptionText } from "./caption-metrics.mjs";

// Single-line caption segmentation.
//
// 1. Hard breaks: sentence/comma punctuation ends a caption (a thousands comma
//    inside a number is not punctuation), and a pause over GAP_SECONDS starts a
//    new caption. Each resulting run is one clause.
// 2. Inside a clause, every way of cutting at word boundaries whose lines fit
//    the measured text width is scored; the lowest score wins. Fewer captions
//    come first, then boundary quality, then balanced line widths.
//
// Boundary quality is a surface heuristic over the last syllable of the word
// before the cut and the word after it. It has no morphological analysis:
// 는 is ambiguous (topic/adnominal) and gets a continuity penalty; 은 can
// still be misclassified, and bare nouns are assumed to continue compounds. It only
// ranks cuts that already fit; it never forces a cut or a character limit.
export const GAP_SECONDS = 0.8;


const TRAILING = /[”’"')\]」』]*$/u;
const core = (text) => text.replace(TRAILING, "").replace(/[,.!?。！？，、:;…]+$/u, "").replace(TRAILING, "");
export const endsClause = (text) => /[,.!?。！？，、][”’"')\]」』]*$/u.test(text);

// Particles and endings after which Korean readers expect a pause.
const LOOSE_ENDINGS = ["에서는", "에서도", "으로는", "에게서", "에서", "에게", "으로", "까지", "부터", "보다", "처럼", "마다", "지만", "는데", "은데", "면서", "도록", "라고", "이라고", "하고", "고", "며", "면", "서", "니", "게", "다", "요", "은", "는", "이", "가", "을", "를", "에", "로", "와", "과", "도", "만"];
// Endings that bind to the next word: genitive, and adnominal forms (final ㄴ/ㄹ).
const GENITIVE = /의$/u;
const BOUND_NEXT = /^(?:것|수|때|등|중|듯|뿐|데|줄|바|만큼|채|대로|적|지)(?:[이가은는을를도만의에]|이다|입니다|이었다|였다)?$/u;

const hangulFinal = (char) => {
  const code = char.codePointAt(0) - 0xac00;
  return code >= 0 && code < 11172 ? code % 28 : -1;
};

export const boundaryPenalty = (before, after) => {
  const left = core(before.text), right = core(after.text);
  let penalty;
  if (GENITIVE.test(left)) penalty = 60;
  else if (/는$/u.test(left)) penalty = 40; // topic/adnominal ambiguity: do not reward this as a clean boundary
  else if (LOOSE_ENDINGS.some(ending => left.endsWith(ending) && left.length > ending.length)) penalty = 0;
  else if ([4, 8].includes(hangulFinal([...left].at(-1) ?? ""))) penalty = 40; // ㄴ/ㄹ adnominal
  else penalty = 70; // bare noun, number or Latin word: likely part of a longer unit
  if (BOUND_NEXT.test(right)) penalty += 80;
  return penalty;
};

const lineText = (words) => words.map(w => w.text).join(" ");

export const captionLineWidth = (text, profile) => {
  const { font_family: family, font_size: fontSize, weight, emphasis_weight: emphasis } = profile.caption;
  // Emphasis may be applied to any word after segmentation; measure the wider weight.
  return Math.max(...[weight, emphasis ?? weight].map(w => measureCaptionText(text, { family, weight: w, fontSize })));
};

const segmentClause = (words, maxWidth, profile) => {
  const n = words.length;
  const width = (i, j) => captionLineWidth(lineText(words.slice(i, j)), profile);
  const best = Array(n + 1).fill(null);
  best[0] = { score: [0, 0, 0], cut: -1 };
  for (let j = 1; j <= n; j++) {
    for (let i = j - 1; i >= 0; i--) {
      if (!best[i]) continue;
      const w = width(i, j);
      if (w > maxWidth) break; // longer spans only grow
      const slack = (maxWidth - w) / maxWidth;
      const single = j - i === 1 && n > 1 && [...core(words[i].text)].length <= 1 ? 40 : 0;
      const score = [best[i].score[0] + 1,
        best[i].score[1] + (i > 0 ? boundaryPenalty(words[i - 1], words[i]) : 0) + single,
        best[i].score[2] + slack * slack];
      // Lexicographic priority: boundary penalties must never create extra captions.
      const better = !best[j] || score.some((value, k) => value < best[j].score[k] && score.slice(0, k).every((v, x) => v === best[j].score[x]));
      if (better) best[j] = { score, cut: i };
    }
  }
  const chunks = [];
  for (let j = n; j > 0; j = best[j].cut) chunks.unshift(words.slice(best[j].cut, j));
  return chunks;
};

export const splitCaptionWords = (words, profile) => {
  if (!profile.caption.segmentation) return splitLegacyCaptionWords(words, profile);
  if (profile.caption.segmentation !== "font-semantic@1") throw new Error(`알 수 없는 자막 분절 계약: ${profile.caption.segmentation}`);
  const maxWidth = captionTextWidth(profile);
  if (!(maxWidth > 0 && profile.caption.font_size > 0)) throw new Error("유효한 자막 프로필이 필요하다");
  const clauses = [];
  let clause = [];
  for (const word of words) {
    if (/(?:[^0-9][,，、]|[,，、][^0-9\s”’"')])/.test(word.text.replace(/[,，、][”’"')]*$/, ""))) throw new Error(`쉼표 앞뒤 발화의 개별 단어 시각이 필요하다: ${word.text}`);
    if (captionLineWidth(word.text, profile) > maxWidth) throw new Error(`자막 토큰이 한 줄보다 길다: ${word.text}`);
    if (clause.length && word.start - clause.at(-1).end > GAP_SECONDS) { clauses.push(clause); clause = []; }
    clause.push(word);
    if (endsClause(word.text)) { clauses.push(clause); clause = []; }
  }
  if (clause.length) clauses.push(clause);
  return clauses.flatMap(c => segmentClause(c, maxWidth, profile))
    .map(chunk => ({ text: lineText(chunk), start: chunk[0].start, end: chunk.at(-1).end, words: chunk }));
};
