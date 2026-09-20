#!/usr/bin/env node
// narration.json (v1.1, input 세션 산출물) → beats.json (시간층).
// 규칙은 docs/specs/beats.schema.md 가 단일 소스. 여기서는 그 규칙을 코드로 옮긴 것.
//
// 사용: node scripts/make-beats.mjs <narration.json> [--fps 30] [--endcard 2.5] [--max 5.0] [--min 1.2] [--out <path>]

import { readFileSync, writeFileSync } from "node:fs";
import { readKeywords, attachKeywords } from "./lib/keywords.mjs";
import { resolve, dirname, join } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("--")) {
  console.error("usage: make-beats.mjs <narration.json> [--fps 30] [--endcard 2.5] [--max 5.0] [--min 1.2] [--out path]");
  process.exit(2);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const narrationPath = resolve(args[0]);
const FPS = Number(opt("fps", 30));
const ENDCARD_SEC = Number(opt("endcard", 2.5));
const MAX_SEC = Number(opt("max", 5.0));
const MIN_SEC = Number(opt("min", 1.2));
const outPath = opt("out", join(dirname(narrationPath), "beats.json"));

const n = JSON.parse(readFileSync(narrationPath, "utf8"));
if (n.schema_version !== "1.1") {
  console.error(`narration.json schema_version=${n.schema_version}, expected 1.1`);
  process.exit(1);
}

const CLAUSE_END = /[.?!]["'”’)]*$/;
const COMMA_END = /,["'”’)]*$/;
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---- 1. 문장 → 절 (구두점 토큰 경계) ----
function splitClauses(tokens) {
  const out = [];
  let cur = [];
  for (const t of tokens) {
    cur.push(t);
    if (CLAUSE_END.test(t.text)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur); // 구두점 없이 끝난 꼬리
  return out;
}

// ---- 2. 절이 MAX 초과면 쉼표 토큰에서 재분할 (양쪽 모두 MIN 이상, 최대 조각 최소화) ----
const dur = (toks) => toks[toks.length - 1].end - toks[0].start;
function splitLong(toks, warnings, where) {
  if (dur(toks) <= MAX_SEC) return [toks];
  let best = null;
  for (let i = 0; i < toks.length - 1; i++) {
    if (!COMMA_END.test(toks[i].text)) continue;
    const a = toks.slice(0, i + 1);
    const b = toks.slice(i + 1);
    if (dur(a) < MIN_SEC || dur(b) < MIN_SEC) continue;
    const score = Math.max(dur(a), dur(b));
    if (!best || score < best.score) best = { a, b, score };
  }
  if (!best) {
    warnings.push({ code: "over_max", where, seconds: r3(dur(toks)) });
    return [toks];
  }
  return [...splitLong(best.a, warnings, where), ...splitLong(best.b, warnings, where)];
}

// ---- 3. 비트 생성 ----
const warnings = [];
const raw = [];
for (const s of n.sentences) {
  const tokens = s.caption_words ?? s.words; // 자막표기 토큰 (없으면 words == 자막표기)
  const clauses = splitClauses(tokens);
  let clauseIdx = 0;
  for (const clause of clauses) {
    clauseIdx += 1;
    const pieces = splitLong(clause, warnings, `${s.id}#${clauseIdx}`);
    pieces.forEach((toks, pi) => {
      raw.push({
        scene: s.id,
        sentence_index: s.index,
        clause: clauseIdx,
        piece: pieces.length > 1 ? pi + 1 : null,
        text: toks.map((t) => t.text).join(" "),
        speech_start: toks[0].start,
        speech_end: toks[toks.length - 1].end,
        words: toks,
      });
    });
  }
}

// ---- 4. 타임라인 채우기: 앞 비트가 다음 발화 시작까지 화면을 유지. 첫 비트는 0부터. ----
const total = raw.length;
const beats = raw.map((b, i) => {
  const start = i === 0 ? 0 : raw[i - 1]._end;
  const end = i === total - 1 ? n.audio.duration : raw[i + 1].speech_start;
  b._end = end;
  const role = i === 0 ? "hook" : i === total - 1 && /\?["'”’)]*$/.test(b.text) ? "cta" : "body";
  return { id: `b${String(i + 1).padStart(2, "0")}`, role, ...b, start: r3(start), end: r3(end) };
});
beats.forEach((b) => {
  delete b._end;
  if (b.end - b.start < MIN_SEC) warnings.push({ code: "under_min", where: b.id, seconds: r3(b.end - b.start) });
});

// 엔드카드: 꼬리 무음이 0이므로 output 이 여유를 붙인다.
beats.push({
  id: `b${String(total + 1).padStart(2, "0")}`,
  role: "endcard",
  scene: null,
  sentence_index: null,
  clause: null,
  piece: null,
  text: "",
  speech_start: null,
  speech_end: null,
  words: [],
  start: r3(n.audio.duration),
  end: r3(n.audio.duration + ENDCARD_SEC),
});

// ---- 4b. 화제 키워드 → 비트에 건다 (facts.md 「화제 키워드」 절이 단일 소스) ----
// 사람이 화면을 고르면서 손으로 채우던 것을 여기로 옮긴다 — 그 자리에서 뽑으면 이미 배정된 화면이 기준이 된다(7편 R3).
// 절이 없으면 kw 를 붙이지 않는다(옛 편 호환). `kw_unspoken` = 기사 화제인데 내레이션이 한 번도 말하지 않는 낱말.
const keywords = readKeywords(dirname(narrationPath));
const { unspoken } = attachKeywords(beats, keywords);
for (const term of unspoken) warnings.push({ code: "kw_unspoken", where: term });

// ---- 5. 프레임 (연속성 보장: end_frame(i) == start_frame(i+1)) ----
for (const b of beats) {
  b.start_frame = Math.round(b.start * FPS);
  b.end_frame = Math.round(b.end * FPS);
  b.duration_frames = b.end_frame - b.start_frame;
  b.duration = r3(b.end - b.start);
}

const speech = beats.filter((b) => b.role !== "endcard");
const durations = speech.map((b) => b.duration);
const out = {
  schema_version: "1.0",
  pilot: n.pilot,
  root: n.root,
  generated_at: new Date().toISOString(),
  source: { narration: "02_production/narration.json", narration_sha256: n.source?.narration_sha256 ?? null },
  fps: FPS,
  rules: { max_sec: MAX_SEC, min_sec: MIN_SEC, endcard_sec: ENDCARD_SEC, gap_policy: "preceding" },
  audio: { path: n.audio.path, duration: n.audio.duration },
  total_frames: beats[beats.length - 1].end_frame,
  stats: {
    beats: speech.length,
    scenes: new Set(speech.map((b) => b.scene)).size,
    min: Math.min(...durations),
    max: Math.max(...durations),
    mean: r3(durations.reduce((a, b) => a + b, 0) / durations.length),
    kw: keywords.length ? { total: keywords.length, spoken: keywords.length - unspoken.length } : null,
  },
  warnings,
  beats,
};

writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`beats.json → ${outPath}`);
console.log(`${out.stats.beats} beats / ${out.stats.scenes} scenes, ${out.total_frames} frames @${FPS}fps, min ${out.stats.min}s max ${out.stats.max}s mean ${out.stats.mean}s`);
if (out.stats.kw) console.log(`화제 키워드 ${out.stats.kw.spoken}/${out.stats.kw.total} 이 내레이션에 등장`);
for (const w of warnings) console.log(`warn ${w.code} ${w.where}${w.seconds === undefined ? "" : ` ${w.seconds}s`}`);
for (const b of beats) console.log(`${b.id} ${b.role.padEnd(7)} ${b.scene ?? "--"} ${String(b.start).padStart(7)}–${String(b.end).padEnd(7)} ${b.duration_frames}f  ${b.text}`);
