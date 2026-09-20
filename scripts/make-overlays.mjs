#!/usr/bin/env node
// beats.json → overlays.json (텍스트/그래픽층). 규칙: docs/specs/overlays.schema.md
//
// 사용: node scripts/make-overlays.mjs <beats.json> [--subs <substitutions.json>] [--terms 스타링크,우주거울] [--max-chars 17] [--out path]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("--")) {
  console.error("usage: make-overlays.mjs <beats.json> [--subs substitutions.json] [--terms a,b] [--max-chars 17] [--out path]");
  process.exit(2);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const beatsPath = resolve(args[0]);
const beatsDir = dirname(beatsPath);
const subsPath = resolve(opt("subs", join(beatsDir, "substitutions.json")));
const TERMS = opt("terms", "스타링크,우주거울,유럽남방천문대").split(",").filter(Boolean);
const outPath = opt("out", join(beatsDir, "overlays.json"));
const overridesPath = resolve(opt("overrides", join(beatsDir, "overlays.overrides.json")));
const GLUE = opt("glue", "").split(",").map((g) => g.trim()).filter(Boolean).map((g) => g.split(/\s+/)); // 다어절 고유명사("리플렉트 오비탈") — 줄 사이에서 끊지 않는다 (3편 2026-08-30)

const B = JSON.parse(readFileSync(beatsPath, "utf8"));
if (B.schema_version !== "1.0") {
  console.error(`beats.json schema_version=${B.schema_version}, expected 1.0`);
  process.exit(1);
}
const subs = existsSync(subsPath) ? JSON.parse(readFileSync(subsPath, "utf8")).pairs.map((p) => p.text) : [];

const QUOTES = /["'“”‘’]/g;
const PUNCT_TAIL = /[.,?!"'“”‘’)]+$/;
const strip = (t) => t.replace(PUNCT_TAIL, "");

// ---- 강조: 숫자 토큰 / 치환표 키 / 지정 용어 ----
function emphasisFor(tokens) {
  const out = [];
  tokens.forEach((w, i) => {
    const core = strip(w.text).replace(QUOTES, "");
    // pop: 핵심 수치(숫자 포함, 연도 제외)만. 용어·연도는 색만 (사용자 피드백 2026-08-28: 팝 과함)
    if (/\d/.test(core)) out.push({ index: i, text: w.text, kind: "number", pop: !/년$/.test(core) });
    else if (subs.some((k) => core === k || core.startsWith(k))) out.push({ index: i, text: w.text, kind: "number", pop: false });
    else if (TERMS.some((k) => core.startsWith(k))) out.push({ index: i, text: w.text, kind: "term", pop: false });
  });
  return out;
}

// ---- 자막 줄바꿈 (절 우선, input 규칙 2026-08-28): 구두점 뒤 절 분할 → 6자 미만 절은 이웃과 병합 → 18자 초과는 균형 분할(각 ≥6자)
//      보호: 숫자+숫자("1만 6천"), 숫자+단위("6천 기."), 이름+직함("에노 박사의"). 한 번에 한 줄만 보이므로 줄 수 제한 없음.
const MIN_CHARS = 6;
const MAX_CHARS = Number(opt("max-chars", 18));
const clauseEnd = (w) => /[.,?!]["'”’)]*$/.test(w);
const isNum = (w) => /\d/.test(w);
// strip: 위에서 선언됨
// 의미 단위 보호(사용자 규칙 2026-08-28): 다음 경계는 끊지 않는다
//   속격+명사("밤하늘의 별을") / 목적어+동사("궤도를 도는", "별을 지우고") / 관형형+명사("도는 위성은", "가능한 상태로", "밝은 위성")
//   연결어미+보조용언("지우고 있습니다") / 숫자+숫자·단위 / 이름+직함 / 용언+의존명사("유지해야 할")
const ADNOMINAL_VERB = /(하는|되는|있는|없는|이는|오는|가는|도는|나는|주는|내는|지는|치는|보는|남는|넘는|쓰는|듣는|드는|사는)$/;
const ADNOMINAL_END = /(한|된|될|할|던|둔|본|간|온|쓴|린|친|낀|난|준|긴|큰|운|끈|뜬)$/; // 위성은/연구는(주제 조사)과 겹치는 '은'은 제외, 형용사만 아래 목록으로
const PHRASE_END = /(이|가|은|는|도|에서|에선|에|로|으로|면|고|며|만)$/;
const ADJ_EUN = /(밝은|작은|많은|높은|좋은|어두운|같은|넓은|깊은|적은|짧은|낮은|굵은|가벼운|무거운)$/;
// 경계 비용: Infinity = 절대 안 끊음, 0 = 끊기 좋음, 그 사이 = 피할수록 좋음
const isAdnominal = (w) => ADNOMINAL_VERB.test(w) || ADNOMINAL_END.test(w) || ADJ_EUN.test(w);
const boundaryCost = (a, b) => {
  const A = strip(a), B = strip(b);
  if (GLUE.some((g) => g.length === 2 && strip(A) === g[0] && strip(B).startsWith(g[1]))) return Infinity; // --glue 다어절 고유명사
  // 숫자+숫자·단위: A가 맨 숫자("1만"·"6천")이거나 연도("2028년"·"2035년엔")일 때만. 단위·조사가 붙은 숫자("625킬로미터에서")는 다음 숫자와 무관 (3편 b04 정정 2026-08-30)
  const bareNum = /^[\d,.]+(만|천|백|억)?$/.test(A) || /년(엔|에|까지|의|은|는)?$/.test(A);
  if (isNum(A) && bareNum && isNum(B)) return Infinity;
  if (isNum(A) && /^기(가|를|는|도|까지|만|에|로|의|와|과|들)?[.,!?'"”’)]*$/.test(B)) return Infinity; // 숫자+"기"(조사 붙은 "기까지"·"기가" 포함 — 4-0 검토 b08)
  if (/^(수|것|거|줄|리|적|만큼|뿐)$/.test(A) && /^(있|없)/.test(B)) return Infinity;
  if (isNum(B) && !/,$/.test(a) && !PHRASE_END.test(A) && !isNum(A)) return Infinity; // 명사+수량("보름달 100개를", "고도 625킬로미터", "시간당 5000달러") — 3편 b10 정정 2026-08-30 // 의존명사+있다/없다("바꿔놓을 수 있다는") — 3편 b20 정정 2026-08-30
  if (/^(미래|현재|과거|전체|모든|최대|최소)$/.test(A)) return Infinity; // 관형 명사+명사 ("미래 세대") — 4-0 검토 b22
  if (/박사/.test(B)) return Infinity; // 이름+직함
  if (/의$/.test(A) && A.length >= 2) return Infinity; // 속격+명사
  // 관형형 + 의존명사("지우고 있다는 거", "유지해야 할 의무") — 절대 안 끊음. 의존명사만 남는 줄을 막는다 (사용자 2026-08-29)
  if (/(는|은|던|ㄹ|을)$/.test(A) && /^(거|것|수|때|줄|데|바|리|만큼|뿐|적|편|중)/.test(B)) return Infinity;
  if (/(을|를)$/.test(A)) return 150; // 목적어+동사 — 피하되 절대는 아니다. 더 나쁜 대안(의존명사 고립·3줄)이 있으면 여기서 끊는다 (사용자 2026-08-29: "밤하늘의 별을 / 지우고 있다는 거 아세요?")
  if (/(고|며|서)$/.test(A) && /^(있|없|싶|버|주|보|계|두|둔)/.test(B)) return Infinity; // 연결어미+보조용언
  if (/(해야|할)$/.test(A) && /^(할|수|것|때|의무)/.test(B)) return Infinity; // 용언+의존명사
  if (/(에|에서|로|으로)$/.test(A) && ADNOMINAL_VERB.test(B)) return Infinity; // 부사어+관형동사 ("하늘에 남는") — 형용사 관형형("엄청난")은 뒤 명사에 붙으므로 제외
  if (/(이|가)$/.test(A) && isAdnominal(B)) return 150; // 관형절 내부: 주어+관형동사 ("스페이스X가 띄운") — 최후 수단
  if (isAdnominal(A)) return 120; // 관형형+명사 ("도는 위성은") — 조사 뒤 경계가 있으면 그쪽을 쓴다
  if (/,$/.test(a) || PHRASE_END.test(A)) return 0; // 주어·주제·부사어 조사, 연결어미, 쉼표 뒤
  return 150; // 구 중간
};
const glued = (a, b) => boundaryCost(a, b) === Infinity;
const len = (toks) => toks.join(" ").replace(/["'“”‘’]/g, "").length; // 따옴표는 폭에 안 세는다
// 18자 이내에서 최소 줄 수, 그 안에서 가장 긴 줄이 짧은 분할(균형). 보호 경계는 끊지 않는다.
function balancedSplit(toks, maxChars = MAX_CHARS, relax = false) {
  if (len(toks) <= maxChars || toks.length < 2) return [toks];
  const n = toks.length;
  let best = null;
  const bcostOf = (x, y) => { const c = boundaryCost(x, y); return relax && c === Infinity ? 400 : c; }; // relax: 보호 경계를 400으로 — 보호 때문에 maxChars 안에 못 넣을 때만 (3편 b20, 2026-08-30)
  const evaluate = (parts, bounds) => {
    const k = parts.length, lens = parts.map(len), mx = Math.max(...lens);
    const mean = lens.reduce((a, b) => a + b, 0) / k;
    const varc = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / k;
    const short = lens.filter((l) => l < MIN_CHARS).length;
    const bcost = bounds.reduce((a, i) => a + bcostOf(toks[i - 1], toks[i]), 0);
    return k * 1000 + short * 100 + bcost + mx * 2 + varc * 0.5;
  };
  const search = (i, parts, bounds) => {
    if (i === n) {
      const cost = evaluate(parts, bounds);
      if (!best || cost < best.cost) best = { cost, parts: parts.map((p) => p.slice()) };
      return;
    }
    if (best && (parts.length + 1) * 1000 > best.cost) return;
    for (let j = i + 1; j <= n; j++) {
      const part = toks.slice(i, j);
      if (len(part) > maxChars) break;
      if (j < n && !relax && glued(toks[j - 1], toks[j])) continue; // 의미 단위 보호는 절대 (relax 재시도 제외)
      parts.push(part); bounds.push(j);
      search(j, parts, j < n ? bounds : bounds.slice(0, -1));
      parts.pop(); bounds.pop();
    }
  };
  search(0, [], []);
  if (!best && !relax) return balancedSplit(toks, maxChars, true);
  return best ? best.parts : [toks];
}

function captionLines(tokens, maxChars = MAX_CHARS) {
  const words = tokens.map((t) => t.text);
  // 1. 절 분할
  const clauses = [];
  let cur = [];
  words.forEach((w) => {
    cur.push(w);
    if (clauseEnd(w)) { clauses.push(cur); cur = []; }
  });
  if (cur.length) clauses.push(cur);
  // 2. 짧은 절 병합 (앞 절 우선, 첫 절이면 뒤와)
  const merged = [];
  clauses.forEach((c) => {
    if (merged.length && (len(c) < MIN_CHARS || len(merged[merged.length - 1]) < MIN_CHARS)) merged[merged.length - 1] = merged[merged.length - 1].concat(c);
    else merged.push(c);
  });
  // 3. 긴 절 균형 분할
  return merged.flatMap((c) => balancedSplit(c, maxChars)).map((l) => l.join(" "));
}

// ---- 인용 귀속: 같은 씬 앞 비트에서 "○○ 박사" 추출 ----
function attributionFor(beat) {
  const prev = B.beats.filter((b) => b.scene === beat.scene && b.clause < beat.clause);
  for (const p of prev) {
    const m = p.text.match(/(\S+ 박사)/);
    if (m) return m[1];
  }
  return null;
}

const overlays = B.beats.map((b) => {
  const tokens = b.words;
  const base = { beat: b.id, role: b.role, scene: b.scene, start_frame: b.start_frame, duration_frames: b.duration_frames };
  if (b.role === "endcard") {
    return { ...base, caption: null, headline: null, emphasis: [], card: { type: "endcard", text: "", attribution: null }, credit: null };
  }
  const isQuote = QUOTES.test(b.text) && b.text.replace(QUOTES, "").length > 0 && /^["“‘']|["”’']$/.test(b.text.trim());
  QUOTES.lastIndex = 0;
  const lines = captionLines(tokens);
  // 줄별 타이밍: in = 그 줄 첫 단어 start, out = 다음 줄 in (마지막 줄은 비트 end). 렌더는 in 3f 전에 띄운다. 화면엔 한 줄만.
  let cursor = 0;
  const lines_timed = lines.map((line, li) => {
    const n = line.split(" ").length;
    const first = tokens[cursor];
    const entry = { text: line, token_start: cursor, token_count: n, start: first ? first.start : b.speech_start, end: null };
    cursor += n;
    return entry;
  });
  lines_timed.forEach((l, li) => {
    l.end = li + 1 < lines_timed.length ? lines_timed[li + 1].start : b.end;
  });
  const caption = {
    text: b.text,
    lines,
    lines_timed,
    speech_start: b.speech_start,
    speech_end: b.speech_end,
    words: tokens,
  };
  let card = null;
  if (b.role === "cta") {
    const CTA_MAX = 13; // 70px × 13자 ≈ 910px ("별을 본 건 언제인가요?" 13자)
    card = { type: "cta", text: b.text, attribution: null, lines: captionLines(tokens, CTA_MAX), emphasis: tokens.map((t) => t.text).filter((w) => /별/.test(w)) };
  }
  else if (isQuote) card = { type: "quote", text: b.text.replace(/^["“‘']\s*|\s*["”’']$/g, ""), attribution: attributionFor(b) };
  return {
    ...base,
    caption,
    headline: b.role === "hook" ? { text: b.text, kicker: null } : null,
    emphasis: emphasisFor(tokens),
    card,
    credit: null,
  };
});

// ---- 편집 덮어쓰기 (overlays.overrides.json): 비트별 card/headline/credit/emphasis. caption 은 원고라 금지 ----
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};
const applied = [];
for (const o of overlays) {
  const patch = overrides[o.beat];
  if (!patch) continue;
  for (const k of Object.keys(patch)) {
    if (k.startsWith("_")) continue;
    if (k === "caption") {
      console.error(`${o.beat}: caption override 금지 (원고)`);
      process.exit(1);
    }
    o[k] = patch[k];
  }
  applied.push(o.beat);
}

// ---- 인용 카드(사용자 규칙 2026-08-28): 카드는 한 덩어리로 읽힌다. 같은 씬의 연속 인용 비트는 **한 블록** —
//      앞 문장은 남고 뒤 문장이 아래에 추가된다. 줄바꿈은 자막과 같은 의미 단위 규칙(카드 글자 60px → 16자), 중앙 정렬, 세로 중앙.
//      줄은 비트 시작에서 순차 등장(stagger). 레이아웃은 블록 전체 기준으로 고정해 비트가 바뀌어도 튀지 않는다.
const CARD_MAX_CHARS = 17; // 카드 54px × 17자 ≈ 920px 안전폭
const beatById = new Map(B.beats.map((b) => [b.id, b]));
const quoteGroups = [];
for (const o of overlays) {
  if (o.card?.type !== "quote") continue;
  const g = quoteGroups[quoteGroups.length - 1];
  if (g && g.scene === o.scene && g.items[g.items.length - 1].beat === prevBeatId(o.beat)) g.items.push(o);
  else quoteGroups.push({ scene: o.scene, items: [o] });
}
function prevBeatId(id) {
  const n = Number(id.slice(1));
  return `b${String(n - 1).padStart(2, "0")}`;
}
for (const g of quoteGroups) {
  const sentences = g.items.map((o, si) => ({ beat: o.beat, index: si, lines: captionLines(o.card.text.split(" ").map((t) => ({ text: t })), CARD_MAX_CHARS) }));
  const blockLines = sentences.flatMap((s) => s.lines.map((text) => ({ text, sentence: s.index, beat: s.beat })));
  const attribution = g.items.find((o) => o.card.attribution)?.card.attribution ?? null;
  g.items.forEach((o, si) => {
    o.card.block = {
      lines: blockLines,
      own_sentence: si,
      sentence_count: sentences.length,
      attribution,
      stagger_sec: 0.13,
      chars_per_sec: Math.round((sentences[si].lines.join("").replace(/\s/g, "").length / Math.max(0.1, beatById.get(o.beat).duration)) * 10) / 10,
    };
  });
}

// 엔드카드: CTA 질문을 상단에 유지(반응할 시간 확보). overrides 가 card 를 통째로 바꿔도 질문은 여기서 붙인다
const ctaOv = overlays.find((o) => o.card?.type === "cta");
for (const o of overlays) if (o.card?.type === "endcard" && ctaOv) o.card.question = { lines: ctaOv.card.lines, emphasis: ctaOv.card.emphasis };

const out = {
  schema_version: "1.0",
  pilot: B.pilot,
  root: B.root,
  generated_at: new Date().toISOString(),
  source: { beats: "02_production/beats.json", beats_generated_at: B.generated_at, substitutions: existsSync(subsPath) ? "02_production/substitutions.json" : null, overrides: applied.length ? "02_production/overlays.overrides.json" : null, overridden_beats: applied },
  style: {
    _comment: "임시 스타일 토큰 (브랜드 자산 없음). 사용자 승인 전까지 가안.",
    font_family: "Pretendard",
    colors: { bg: "#0B0F1A", text: "#FFFFFF", muted: "#9AA4B2", accent: "#FFD166", quote: "#CFE3FF" },
    sizes: { headline: 84, caption: 56, card: 54, attribution: 38, credit: 32, cta: 70, endcard_question: 52 },
    safe: { x: 80, y: 100 },
    caption: { anchor_y: 0.66, max_chars_per_line: MAX_CHARS, min_chars_per_line: MIN_CHARS, max_lines: 1, line_height: 1.35, rule: "clause-first", backdrop: true },
    card: { center_y: 0.5, max_chars_per_line: CARD_MAX_CHARS, line_height: 1.45, rule: "clause-first, 한 블록, 줄 순차 등장" },
    headline: { top_y: 0.26, frame0: true, rule: "프레임 0에 노출, 킥커 없음(사용자 결정 2026-08-28)" },
    cta: { center_y: 0.45, max_chars_per_line: 13, keep_on_endcard: true, comment_prompt: null },
    // 온스크린(대본 '자막(온스크린 텍스트)') — 내레이션 자막과 위계를 분리한다(사용자 결정 2026-08-29).
    // 주인공: 화면 중앙 상단, 큰 글자, 가로 전체 스크림. 보조: 하단 자막은 작고 밴드형.
    onscreen: { center_y: 0.40, size: 88, sub_size: 40, weight: 800, scrim: 0.55, scrim_span: 0.34, rise_px: 14, in_frames: 10, line_height: 1.22 },
  },
  rules: { emphasis_terms: TERMS, emphasis_from_substitutions: subs },
  overlays,
};

writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`overlays.json → ${outPath}${applied.length ? `  (overrides: ${applied.join(",")})` : ""}`);
for (const o of overlays) {
  const em = o.emphasis.map((e) => e.text).join(" ");
  const card = o.card ? `[${o.card.type}${o.card.attribution ? ":" + o.card.attribution : ""}]` : "";
  console.log(`${o.beat} ${o.role.padEnd(7)} ${card.padEnd(14)} ${o.caption ? o.caption.lines.join(" / ") : "(endcard)"}${em ? "   ★ " + em : ""}`);
}
