import { sha256 } from "./editorial.mjs";

const key = (text) => text.normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");
const tokens = (text) => text.trim().split(/\s+/).filter(Boolean);

export const timedWords = (raw, duration) => {
  const source = raw.words ?? raw.word_segments ?? raw.segments?.flatMap(s => s.words ?? []);
  if (!Array.isArray(source) || !source.length) throw new Error("words 또는 segments[].words의 실제 단어 시각이 필요하다");
  let previousEnd = 0;
  return source.map((word, index) => {
    const text = word.text ?? word.word;
    if (typeof text !== "string" || !text.trim()) throw new Error(`word ${index}: 빈 단어`);
    const { start, end } = word;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration || start < previousEnd - 1e-6)
      throw new Error(`word ${index} (${text}): 0길이·겹침·음성 범위 밖 시각. 실제 정렬을 수정한다`);
    previousEnd = end;
    return { text: text.trim(), start, end };
  }).filter(word => key(word.text));
};

// Forced alignment to the script: map ASR characters onto script characters with
// a longest-common-subsequence match. A script token takes the time span of its
// matched characters. A token with no matched character fails with its location
// instead of receiving an interpolated time.
const asrWords = (raw, duration) => {
  const source = raw.words ?? raw.word_segments ?? raw.segments?.flatMap(s => s.words ?? []);
  if (!Array.isArray(source) || !source.length) throw new Error("words 또는 segments[].words의 실제 단어 시각이 필요하다");
  let previousEnd = 0, adjusted = 0, dropped = 0;
  const words = [];
  for (const word of source) {
    const text = (word.text ?? word.word ?? "").trim();
    if (!key(text) || !Number.isFinite(word.start) || !Number.isFinite(word.end)) { dropped++; continue; }
    const start = Math.max(word.start, previousEnd), end = Math.min(word.end, duration);
    if (start !== word.start || end !== word.end) adjusted++;
    if (end <= start) { dropped++; continue; }
    words.push({ text, start, end });
    previousEnd = end;
  }
  return { words, adjusted, dropped };
};

const lcsPairs = (a, b) => {
  const n = a.length, m = b.length, width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    table[i * width + j] = a[i] === b[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
    else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
    else j++;
  }
  return pairs;
};

// ASR writes numbers and Latin names as they appear on screen ("49광년", "LHS").
// The episode's substitutions table already maps those written forms to the
// spoken script, so apply it to the transcript before matching.
const spokenForm = (text, pairs) => {
  let value = key(text);
  for (const pair of pairs) if (pair.from && value.includes(pair.from)) value = value.split(pair.from).join(pair.to);
  return value;
};

export const forceAlignTokens = (lines, raw, duration, { minMatch = 0.85, substitutions = [], allowEstimated = false } = {}) => {
  const { words, adjusted, dropped } = asrWords(raw, duration);
  const rewrites = substitutions.map(pair => ({ from: key(pair.text), to: key(pair.spoken) })).filter(pair => pair.from && pair.from !== pair.to).sort((a, b) => b.from.length - a.from.length);
  const asrChars = words.flatMap(word => {
    const chars = [...spokenForm(word.text, rewrites)], span = (word.end - word.start) / chars.length;
    return chars.map((char, i) => ({ char, start: word.start + span * i, end: word.start + span * (i + 1) }));
  });
  const scriptTokens = lines.flatMap((line, lineIndex) => tokens(line).map((text, tokenIndex) => ({ text, lineIndex, tokenIndex })));
  const scriptChars = scriptTokens.flatMap((token, index) => [...key(token.text)].map(char => ({ char, index })));
  if (scriptTokens.some(token => !key(token.text))) throw new Error("낭독 문자 없는 원고 토큰이 있다");
  const pairs = lcsPairs(asrChars.map(c => c.char), scriptChars.map(c => c.char));
  const spans = scriptTokens.map(() => ({ start: null, end: null, matched: 0 }));
  for (const [i, j] of pairs) {
    const span = spans[scriptChars[j].index];
    span.start ??= asrChars[i].start; span.end = asrChars[i].end; span.matched++;
  }
  const where = token => `s${String(token.lineIndex + 1).padStart(2, "0")}[${token.tokenIndex}] "${token.text}"`;
  const missing = scriptTokens.filter((_, i) => !spans[i].matched);
  if (missing.length && !allowEstimated) throw new Error(`강제정렬: 음성에서 찾지 못한 원고 토큰 ${missing.length}개 — ${missing.slice(0, 8).map(where).join(", ")}. 시각을 추정해 채우지 않는다. 치환표(substitutions.json)에 전사 표기를 추가하거나, 해당 위치를 청취 확인할 것을 전제로 --allow-estimated를 쓴다`);
  // Explicit opt-in only: an unmatched token takes the silence-free gap between
  // its matched neighbours and is listed in the report as estimated.
  // When matched neighbours touch (no gap), the window widens to include them and
  // they are re-split and listed as estimated too.
  const estimatedIndex = new Set();
  for (let i = 0; i < scriptTokens.length; i++) {
    if (spans[i].matched || estimatedIndex.has(i)) continue;
    let first = i, last = i;
    while (last + 1 < spans.length && !spans[last + 1].matched) last++;
    let from = first - 1 >= 0 ? spans[first - 1].end : 0, to = last + 1 < spans.length ? spans[last + 1].start : duration;
    if (!(to - from >= 0.04 * (last - first + 1))) {
      if (first > 0) { first--; from = first - 1 >= 0 ? spans[first - 1].end : 0; }
      if (last + 1 < spans.length) { last++; to = last + 1 < spans.length ? spans[last + 1].start : duration; }
    }
    const count = last - first + 1, step = (to - from) / count;
    if (!(step > 0)) throw new Error(`강제정렬: ${where(scriptTokens[i])}의 추정 구간이 0이다. 음성·원고를 확인한다`);
    for (let k = first; k <= last; k++) { spans[k] = { start: from + step * (k - first), end: from + step * (k - first + 1), matched: 0 }; estimatedIndex.add(k); }
    i = last;
  }
  const estimated = [...estimatedIndex].sort((a, b) => a - b).map(k => ({ line: `s${String(scriptTokens[k].lineIndex + 1).padStart(2, "0")}`, token_index: scriptTokens[k].tokenIndex, text: scriptTokens[k].text, start: spans[k].start, end: spans[k].end }));
  const ratio = pairs.length / scriptChars.length;
  if (ratio < minMatch) throw new Error(`강제정렬: 원고 문자 일치율 ${ratio.toFixed(3)} < ${minMatch}. 다른 음성이나 원고일 수 있다`);
  const partial = scriptTokens.map((token, i) => ({ token, total: [...key(token.text)].length, matched: spans[i].matched })).filter(t => t.matched > 0 && t.matched < t.total)
    .map(t => ({ line: `s${String(t.token.lineIndex + 1).padStart(2, "0")}`, token_index: t.token.tokenIndex, text: t.token.text, matched_chars: t.matched, total_chars: t.total }));
  const aligned = lines.map(() => []);
  scriptTokens.forEach((token, i) => aligned[token.lineIndex].push({ text: token.text, start: spans[i].start, end: spans[i].end }));
  return { aligned, report: { char_match_ratio: Number(ratio.toFixed(4)), asr_words: words.length, asr_words_adjusted: adjusted, asr_words_dropped: dropped, partial_tokens: partial, estimated_tokens: estimated, ...(estimated.length ? { estimated_note: "estimated_tokens의 시각은 이웃 일치 문자 사이의 균등 분할 추정이다. 해당 위치를 청취로 확인하고 모션 앵커를 가능하면 추정 토큰에 묶지 않는다" } : {}) } };
};

// Merge aligner tokens only when their exact characters match a canonical word.
// Never invent timings for an omitted word or split one timestamp by duration.
const consume = (expected, words, cursor, where) => {
  const target = key(expected);
  if (!target) throw new Error(`${where}: 낭독 문자 없는 토큰 ${expected}`);
  let matched = "", end = cursor;
  while (end < words.length && matched.length < target.length) matched += key(words[end++].text);
  if (matched !== target) throw new Error(`${where}: 정렬 불일치 "${expected}" ↔ "${words.slice(cursor, end).map(w => w.text).join(" ")}". 원고 기반 강제정렬 결과를 입력한다`);
  return { word: { text: expected, start: words[cursor].start, end: words[end - 1].end }, next: end };
};

// Conservative width estimate for draft segmentation only. Actual GmarketSans
// width and mobile readability remain checked by the renderer/review.
const estimatedWidth = (text, fontSize) => [...text].reduce((sum, char) => sum + (/\s/u.test(char) ? 0.35 : /[\x20-\x7e]/.test(char) ? 0.7 : 1), 0) * fontSize;

export const splitCaptionWords = (words, profile) => {
  const maxWidth = profile.canvas.width - 2 * (profile.caption.side_inset + profile.caption.padding_x);
  const fontSize = profile.caption.font_size;
  if (!(maxWidth > 0 && fontSize > 0)) throw new Error("유효한 자막 프로필이 필요하다");
  const chunks = [];
  let chunk = [];
  const flush = () => { if (chunk.length) chunks.push(chunk); chunk = []; };
  for (const word of words) {
    if (estimatedWidth(word.text, fontSize) > maxWidth) throw new Error(`자막 토큰이 한 줄보다 길다: ${word.text}`);
    const candidate = [...chunk, word].map(w => w.text).join(" ");
    if (chunk.length && (estimatedWidth(candidate, fontSize) > maxWidth || word.start - chunk.at(-1).end > 0.8)) flush();
    chunk.push(word);
    if (/[.!?。！？]$/.test(word.text)) flush();
  }
  flush();
  return chunks.map(chunk => ({ text: chunk.map(w => w.text).join(" "), start: chunk[0].start, end: chunk.at(-1).end, words: chunk }));
};

export const assembleNarration = ({ pilot, narrationText, alignment, audio, profile, captionText, substitutions = { pairs: [] }, voice = null, forceAlign = false, minMatch, allowEstimated = false }) => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) throw new Error("실제 음성 길이가 필요하다");
  const lines = narrationText.split(/\r?\n/).filter(line => line.trim()).map(line => line.trim());
  if (!lines.length) throw new Error("원고가 비어 있다");
  const displayLines = captionText === undefined ? lines : captionText.split(/\r?\n/).filter(line => line.trim()).map(line => line.trim());
  if (displayLines.length !== lines.length) throw new Error("자막 원고와 낭독 원고 줄 수가 다르다");
  if (!Array.isArray(substitutions.pairs)) throw new Error("substitutions.pairs 배열이 필요하다");
  const replacements = new Map();
  for (const pair of substitutions.pairs) {
    if (typeof pair.text !== "string" || typeof pair.spoken !== "string" || !pair.spoken.trim() || replacements.has(pair.text)) throw new Error("유효하고 중복 없는 치환표가 필요하다");
    replacements.set(pair.text, pair.spoken);
  }
  if (allowEstimated && !forceAlign) throw new Error("--allow-estimated는 --force-align과 함께만 쓴다");
  const forced = forceAlign ? forceAlignTokens(lines, alignment, audio.duration, { substitutions: substitutions.pairs, allowEstimated, ...(minMatch === undefined ? {} : { minMatch }) }) : null;
  const words = forced ? [] : timedWords(alignment, audio.duration);
  let cursor = 0;
  const sentences = lines.map((line, index) => {
    const id = `s${String(index + 1).padStart(2, "0")}`;
    const aligned = forced ? forced.aligned[index] : tokens(line).map(text => {
      const match = consume(text, words, cursor, id);
      cursor = match.next;
      return match.word;
    });
    let captionCursor = 0;
    const display = tokens(displayLines[index]).map(text => {
      const match = consume(replacements.get(text) ?? text, aligned, captionCursor, `${id} 자막`);
      captionCursor = match.next;
      return { ...match.word, text };
    });
    if (captionCursor !== aligned.length) throw new Error(`${id}: 자막 치환 뒤 남은 낭독 단어가 있다`);
    return { id, index, text: displayLines[index], spoken_text: line, start: aligned[0].start, end: aligned.at(-1).end, words: aligned, caption_words: display };
  });
  if (cursor !== words.length) throw new Error(`원고 뒤에 정렬 단어 ${words.length - cursor}개가 남았다`);
  const captions = sentences.flatMap(line => splitCaptionWords(line.caption_words, profile)).map((caption, i) => ({ id: `c${String(i + 1).padStart(2, "0")}`, ...caption }));
  return {
    schema_version: "1.1", pilot, root: `news/${pilot}`,
    source: { narration_txt: "02_production/narration.txt", narration_sha256: sha256(Buffer.from(narrationText)) },
    audio: { ...audio, ...(voice ? { tts: voice } : {}) },
    alignment: forced
      ? { method: "forced-char-lcs-to-script", unit: "word", ...forced.report, caption_width: "estimated; render and listening review required" }
      : { method: "imported-word-timestamps-exact-text", unit: "word", caption_width: "estimated; render and listening review required" },
    sentences, captions,
  };
};
