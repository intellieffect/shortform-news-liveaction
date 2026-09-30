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

export const SEGMENTATION_CONTRACTS = ["font-semantic@1", "font-semantic@2"];

const hasHints = (hints) => Boolean(hints && ((hints.protected_phrases ?? []).length || (hints.break_before ?? []).length));

export const splitCaptionWords = (words, profile, { hints, where = "자막" } = {}) => {
  const contract = profile.caption.segmentation;
  if (contract && !SEGMENTATION_CONTRACTS.includes(contract)) throw new Error(`알 수 없는 자막 분절 계약: ${contract}`);
  if (contract !== "font-semantic@2" && hasHints(hints)) throw new Error(`${where}: caption_segmentation 힌트는 font-semantic@2 프로필에서만 쓴다 (현재 ${contract ?? "보관 추정 폭"})`);
  if (!contract) return splitLegacyCaptionWords(words, profile);
  if (contract === "font-semantic@2") return splitSemanticCaptionWords(words, profile, hints, where);
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

// font-semantic@2 (profile 1.5+). Same measured width, font and hard breaks as
// @1; the text is never compressed, the font never shrinks and the box never
// widens. What changes:
//
// 1. Authored hints per narration line (`caption_segmentation`), indexed by the
//    line's caption tokens (0-based, whitespace-split display text):
//      protected_phrases: [{ from, to, text }] — no caption boundary between
//        tokens from..to (inclusive). `text` must start inside token `from` and
//        end inside token `to`, so a name may end inside a token that carries
//        its particle or copula ("날이"). A protected span wider than one line
//        or crossing clause punctuation is an error, not a silent split. It
//        overrides the pause break: a name stays on one caption across a pause.
//      break_before: [{ token, text }] — a caption boundary before `token`;
//        `text` must equal that token. It may not fall inside a protected span.
// 2. Short quoted spans (up to QUOTE_GROUP_MAX_TOKENS tokens, no punctuation or
//    sentence ending inside) are kept together by a soft penalty. Quoted
//    sentences are not grouped. Unquoted names need authored protection.
// 3. Caption count is no longer strictly first. Each caption costs CAPTION_COST,
//    so one poor cut (genitive, bare-noun compound, adnominal, adverb, quoted
//    name) is traded for an extra caption; clean particle/ending cuts are not.
//    A cut between a particle and the clause-final predicate costs nothing.
export const CAPTION_COST = 50;
export const QUOTE_GROUP_MAX_TOKENS = 4;
const QUOTE_PENALTY = 150;
const SHORT_CAPTION_SECONDS = 0.5;

const CLAUSE_ENDINGS = ["면서", "지만", "는데", "은데", "도록", "라고", "다고", "니까", "아서", "어서", "해서", "고", "며", "면", "니"];
const PARTICLES = ["에서는", "에서도", "으로는", "에게서", "에서", "에게", "으로", "까지", "부터", "보다", "처럼", "마다", "을", "를", "에", "로", "와", "과", "도", "만", "이", "가", "은"];
const ADVERBS = new Set(["함께", "모두", "다시", "가장", "서로", "이미", "아직", "또", "더", "매우", "아주", "곧", "특히", "바로", "결국", "직접", "같이", "제일", "잘"]);
const PREDICATE = /(?:다|요|까|죠)$/u;
const QUOTES = { "“": "”", "‘": "’", "「": "」", "『": "』", "《": "》", "〈": "〉", "\"": "\"", "'": "'" };
const ends = (text, list) => list.some(ending => text.endsWith(ending) && text.length > ending.length);

export const boundaryPenaltyV2 = (before, after, { afterIsPredicate = false } = {}) => {
  const left = core(before.text).replace(/^[“‘「『《〈"']+/u, ""), right = core(after.text);
  let penalty;
  if (GENITIVE.test(left)) penalty = 60;
  else if (/(?:에서|으로|에게|에|와|과|로)는$/u.test(left)) penalty = afterIsPredicate ? 0 : 10;
  else if (/는$/u.test(left)) penalty = 40; // topic/adnominal ambiguity, as in @1
  // Unpunctuated 다 is usually a connective (올려다 본), not a sentence end.
  else if (ends(left, CLAUSE_ENDINGS)) penalty = 0;
  else if (ends(left, PARTICLES)) penalty = afterIsPredicate ? 0 : 10;
  else if (ends(left, ["게"])) penalty = 5;
  else if (ADVERBS.has(left)) penalty = 10; // the adverb modifies the whole following predicate phrase
  else if ([4, 8].includes(hangulFinal([...left].at(-1) ?? ""))) penalty = 40;
  else penalty = 70;
  if (BOUND_NEXT.test(right)) penalty += 80;
  return penalty;
};

const validateHints = (words, hints, maxWidth, profile, where) => {
  const n = words.length, protectedSpans = [], breaks = new Set();
  if (hints == null) return { protectedSpans, breaks };
  if (typeof hints !== "object" || Array.isArray(hints)) throw new Error(`${where}: caption_segmentation은 객체여야 한다`);
  const unknown = Object.keys(hints).filter(key => !["protected_phrases", "break_before"].includes(key));
  if (unknown.length) throw new Error(`${where}: caption_segmentation의 알 수 없는 키 ${unknown.join(", ")}`);
  for (const key of ["protected_phrases", "break_before"]) if (hints[key] !== undefined && !Array.isArray(hints[key])) throw new Error(`${where}: caption_segmentation.${key}는 배열이어야 한다`);
  const joined = (from, to) => lineText(words.slice(from, to + 1));
  for (const [index, phrase] of (hints.protected_phrases ?? []).entries()) {
    const label = `${where} protected_phrases[${index}]`;
    const { from, to, text } = phrase ?? {};
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to >= n || typeof text !== "string" || !text.trim())
      throw new Error(`${label}: 0 ≤ from ≤ to < ${n}인 정수 토큰 색인과 text가 필요하다`);
    const span = joined(from, to), firstEnd = words[from].text.length, lastStart = span.length - words[to].text.length;
    let found = false;
    for (let at = span.indexOf(text); at >= 0 && !found; at = span.indexOf(text, at + 1)) found = at < firstEnd && at + text.length > lastStart;
    if (!found) throw new Error(`${label}: "${text}"가 토큰 ${from}–${to} "${span}"의 첫 토큰에서 시작해 끝 토큰에서 끝나지 않는다. 원고가 바뀌었으면 색인을 다시 쓴다`);
    for (let k = from + 1; k <= to; k++) if (endsClause(words[k - 1].text)) throw new Error(`${label}: 보호 구간 "${span}"이 문장부호 "${words[k - 1].text}" 뒤 절 경계를 넘는다. 보호 범위나 원고를 고친다`);
    const width = captionLineWidth(span, profile);
    if (width > maxWidth) throw new Error(`${label}: 보호 구간 "${text}"(토큰 ${from}–${to} "${span}")의 실측 폭 ${width.toFixed(1)}px가 한 줄 ${maxWidth}px를 넘는다. 글자 축소·폭 확대·문구 삭제로 맞추지 않는다. 붙은 서술어 때문이면 실제 발화의 내부 경계를 확인한다. 시각을 추정하거나 원문을 바꾸지 않는다. 원고·음성 변경이 필요하면 해당 편의 승인 범위 안에서 별도로 판단한다`);
    const overlap = protectedSpans.find(other => from <= other.to && other.from <= to);
    if (overlap) throw new Error(`${label}: 토큰 ${from}–${to}가 다른 보호 구간 ${overlap.from}–${overlap.to}와 겹친다`);
    protectedSpans.push({ from, to, text });
  }
  for (const [index, entry] of (hints.break_before ?? []).entries()) {
    const label = `${where} break_before[${index}]`;
    const { token, text } = entry ?? {};
    if (!Number.isInteger(token) || token < 1 || token >= n) throw new Error(`${label}: 1 ≤ token < ${n}인 정수 색인이 필요하다`);
    if (words[token].text !== text) throw new Error(`${label}: 토큰 ${token}은 "${words[token].text}"다 ("${text}" 아님). 원고가 바뀌었으면 색인을 다시 쓴다`);
    const inside = protectedSpans.find(span => span.from < token && token <= span.to);
    if (inside) throw new Error(`${label}: "${text}" 앞 경계가 보호 구간 ${inside.from}–${inside.to} "${inside.text}" 안에 있다`);
    if (breaks.has(token)) throw new Error(`${label}: 토큰 ${token} 중복`);
    breaks.add(token);
  }
  return { protectedSpans, breaks };
};

// Soft grouping of short quoted names: ‘국제 달 관측의 날’ stays together when it
// fits; “달을 함께 봤다” (a quoted sentence) is not grouped.
const quotedGroups = (words, maxWidth, profile) => {
  const groups = [];
  for (let i = 0; i < words.length; i++) {
    const open = [...words[i].text][0], close = QUOTES[open];
    if (!close) continue;
    let j = words[i].text.indexOf(close, 1) > 0 ? i : -1;
    for (let k = i + 1; j < 0 && k < words.length && k - i < QUOTE_GROUP_MAX_TOKENS; k++) if (words[k].text.includes(close)) j = k;
    if (j <= i) continue;
    const span = lineText(words.slice(i, j + 1)), inner = span.slice(1, span.indexOf(close, 1));
    if (!/[.!?。！？,，、…]/u.test(inner) && !PREDICATE.test(inner) && captionLineWidth(span, profile) <= maxWidth) groups.push({ from: i, to: j });
    i = j;
  }
  return groups;
};

const splitSemanticCaptionWords = (words, profile, hints, where) => {
  const maxWidth = captionTextWidth(profile);
  if (!(maxWidth > 0 && profile.caption.font_size > 0)) throw new Error("유효한 자막 프로필이 필요하다");
  const n = words.length;
  for (const word of words) {
    if (/(?:[^0-9][,，、]|[,，、][^0-9\s”’"')])/.test(word.text.replace(/[,，、][”’"')]*$/, ""))) throw new Error(`쉼표 앞뒤 발화의 개별 단어 시각이 필요하다: ${word.text}`);
    if (captionLineWidth(word.text, profile) > maxWidth) throw new Error(`자막 토큰이 한 줄보다 길다: ${word.text}`);
  }
  const { protectedSpans, breaks } = validateHints(words, hints, maxWidth, profile, where);
  // boundary k sits between words[k-1] and words[k].
  const forbidden = new Set(protectedSpans.flatMap(({ from, to }) => Array.from({ length: to - from }, (_, x) => from + 1 + x)));
  const hard = new Set([...breaks]);
  for (let k = 1; k < n; k++) {
    if (endsClause(words[k - 1].text)) hard.add(k);
    else if (words[k].start - words[k - 1].end > GAP_SECONDS && !forbidden.has(k)) hard.add(k);
  }
  const soft = new Map();
  for (const { from, to } of quotedGroups(words, maxWidth, profile)) for (let k = from + 1; k <= to; k++) soft.set(k, (soft.get(k) ?? 0) + QUOTE_PENALTY);
  const cuts = [0, ...[...hard].sort((a, b) => a - b), n];
  const chunks = [];
  for (let c = 0; c + 1 < cuts.length; c++) {
    const a = cuts[c], b = cuts[c + 1];
    const penalty = (k) => boundaryPenaltyV2(words[k - 1], words[k], { afterIsPredicate: k === b - 1 && PREDICATE.test(core(words[k].text)) }) + (soft.get(k) ?? 0);
    const best = Array(b - a + 1).fill(null);
    best[0] = { score: [0, 0], cut: -1 };
    for (let j = 1; j <= b - a; j++) {
      for (let i = j - 1; i >= 0; i--) {
        const w = captionLineWidth(lineText(words.slice(a + i, a + j)), profile);
        if (w > maxWidth) break; // longer spans only grow
        if (!best[i] || (i > 0 && forbidden.has(a + i))) continue;
        const first = words[a + i], last = words[a + j - 1];
        const single = j - i === 1 && b - a > 1 && [...core(first.text)].length <= 1 ? 40 : 0;
        const brief = last.end - first.start < SHORT_CAPTION_SECONDS && b - a > 1 ? 40 : 0;
        const score = [best[i].score[0] + CAPTION_COST + (i > 0 ? penalty(a + i) : 0) + single + brief, best[i].score[1] + ((maxWidth - w) / maxWidth) ** 2];
        if (!best[j] || score[0] < best[j].score[0] || (score[0] === best[j].score[0] && score[1] < best[j].score[1])) best[j] = { score, cut: i };
      }
    }
    if (!best[b - a]) throw new Error(`${where}: "${lineText(words.slice(a, b))}"를 보호 구간을 지키며 한 줄 ${maxWidth}px 안으로 나눌 수 없다`);
    const clause = [];
    for (let j = b - a; j > 0; j = best[j].cut) clause.unshift(words.slice(a + best[j].cut, a + j));
    chunks.push(...clause);
  }
  const flat = chunks.flat();
  if (flat.length !== n || flat.some((word, i) => word !== words[i])) throw new Error(`${where}: 자막 분절이 단어를 바꾸거나 빠뜨렸다`);
  return chunks.map(chunk => ({ text: lineText(chunk), start: chunk[0].start, end: chunk.at(-1).end, words: chunk }));
};
