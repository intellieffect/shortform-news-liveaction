import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleNarration } from "../scripts/lib/narration-assembly.mjs";
import { importNarration } from "../scripts/assemble-narration.mjs";
import { validateOutput, workspace } from "../scripts/lib/production/contracts.mjs";
import { readProductionProfile } from "../scripts/lib/production-profile.mjs";

const profile = readProductionProfile();
const options = {
  pilot: "test", narrationText: "솜사탕 입니다.\n열 배입니다.\n", profile,
  alignment: { segments: [{ words: [
    { word: "솜사탕", start: 0.1, end: 0.5 }, { word: "입니다.", start: 0.5, end: 1 },
    { word: "열", start: 1.1, end: 1.4 }, { word: "배입니다.", start: 1.4, end: 2 },
  ] }] }, audio: { path: "02_production/audio/narration.wav", duration: 2.5 },
};

test("reuses actual alignment, maps explicit caption substitutions, and keeps source exact", () => {
  const result = assembleNarration({ ...options, captionText: "솜사탕 입니다.\n10배입니다.\n", substitutions: { pairs: [{ text: "10배입니다.", spoken: "열 배입니다." }] } });
  assert.deepEqual(result.sentences[1].words, [{ text: "열", start: 1.1, end: 1.4 }, { text: "배입니다.", start: 1.4, end: 2 }]);
  assert.equal(result.sentences[1].caption_words[0].text, "10배입니다.");
  assert.equal(result.captions.at(-1).start, 1.1);
  assert.equal(result.captions.at(-1).end, 2);
  assert.match(result.source.narration_sha256, /^[0-9a-f]{64}$/);
  const merged = assembleNarration({ ...options, narrationText: "솜사탕입니다.\n열 배입니다.\n" });
  assert.deepEqual(merged.sentences[0].words, [{ text: "솜사탕입니다.", start: 0.1, end: 1 }]);
});

test("rejects missing words, zero spans, overlapping or out-of-range times without invention", () => {
  for (const change of [w => { w[0].end = w[0].start; }, w => { w[1].start = 0.2; }, w => { w[3].end = 3; }, w => { w[0].word = "다른"; }, w => { w.splice(2, 1); }]) {
    const alignment = structuredClone(options.alignment);
    change(alignment.segments[0].words);
    assert.throws(() => assembleNarration({ ...options, alignment }), /시각|불일치/);
  }
  assert.throws(() => assembleNarration({ ...options, alignment: { segments: [{ text: "솜사탕 입니다.", start: 0, end: 2 }] } }), /실제 단어/);
  assert.throws(() => assembleNarration({ ...options, captionText: "솜사탕 입니다.\n백 배입니다." }), /불일치/);
});

test("CLI assembly measures a real WAV, writes only derived JSON, and preserves failed output", async () => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "narration-assembly-")));
  const production = join(repo, "news/test/02_production");
  const put = (name, body) => writeFileSync(join(production, name), typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  try {
    mkdirSync(join(production, "audio"), { recursive: true }); mkdirSync(join(repo, "config"));
    writeFileSync(join(repo, "config/production-profile.json"), JSON.stringify(profile));
    put("story.json", { mode: "editorial-concept" }); put("visual-system.json", { production_profile: { id: profile.id, version: profile.version } });
    put("voice.json", { provider: "test", voice: "synthetic" }); put("narration.txt", options.narrationText); put("audio/alignment.json", options.alignment);
    const samples = 8000 * options.audio.duration, wav = Buffer.alloc(44 + samples * 2);
    wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(samples * 2, 40);
    put("audio/narration.wav", wav);
    const args = { repo, alignment: "02_production/audio/alignment.json" };
    const result = await importNarration("test", args);
    assert.equal(result.duration, 2.5);
    assert.match(validateOutput(workspace("test", repo), "narration"), /실제 청취 판정 아님/);
    const before = readFileSync(join(production, "narration.json"));
    await assert.rejects(importNarration("test", args), /이미 있다/);
    put("audio/alignment.json", { words: [{ text: "잘못된", start: 0, end: 0 }] });
    await assert.rejects(importNarration("test", { ...args, replace: true }), /시각/);
    assert.deepEqual(readFileSync(join(production, "narration.json")), before);
    assert.deepEqual(readFileSync(join(production, "audio/narration.wav")), wav);
    await assert.rejects(importNarration("test", { ...args, output: "01_input/narration.json" }), /02_production/);
    mkdirSync(join(repo, "news/test/01_input")); symlinkSync(join(repo, "news/test/01_input"), join(production, "escape"));
    await assert.rejects(importNarration("test", { ...args, output: "02_production/escape/narration.json" }), /밖/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("force-align maps ASR spelling differences onto script tokens and records partial matches", () => {
  const alignment = { words: [
    { word: "솜사탕입니다", start: 0.1, end: 1.0 },          // merged by ASR
    { word: "열", start: 1.1, end: 1.4 }, { word: "배 입니다", start: 1.35, end: 2.0 }, // overlap + split
  ] };
  const result = assembleNarration({ ...options, alignment, forceAlign: true });
  assert.equal(result.alignment.method, "forced-char-lcs-to-script");
  assert.deepEqual(result.sentences[0].words.map(w => w.text), ["솜사탕", "입니다."]);
  assert.ok(result.sentences[0].words[0].end <= result.sentences[0].words[1].start);
  assert.equal(result.sentences[1].words[1].start, 1.4); // overlap clamped, not invented
  assert.equal(result.alignment.asr_words_adjusted, 1);
  const partial = assembleNarration({ ...options, alignment: { words: [
    { word: "솜사탕", start: 0.1, end: 0.5 }, { word: "입니다", start: 0.5, end: 1 },
    { word: "열", start: 1.1, end: 1.4 }, { word: "배임니다", start: 1.4, end: 2 },
  ] }, forceAlign: true, minMatch: 0.5 });
  assert.deepEqual(partial.alignment.partial_tokens, [{ line: "s02", token_index: 1, text: "배입니다.", matched_chars: 3, total_chars: 4 }]);
});

test("force-align fails on a token absent from the audio or a low overall match", () => {
  const missing = { words: [{ word: "솜사탕", start: 0.1, end: 0.5 }, { word: "입니다", start: 0.5, end: 1 }, { word: "배입니다", start: 1.4, end: 2 }] };
  assert.throws(() => assembleNarration({ ...options, alignment: missing, forceAlign: true }), /찾지 못한 원고 토큰 1개 — s02\[0\] "열"/);
  const other = { words: [{ word: "솜 전혀 다른 말 열 배", start: 0.1, end: 2 }] };
  assert.throws(() => assembleNarration({ ...options, alignment: other, forceAlign: true }), /찾지 못한|일치율/);
});

test("force-align applies the substitutions table to ASR text and lists estimated tokens only on opt-in", () => {
  const base = { ...options, narrationText: "사십구 광년 밖\n열 배입니다.\n", captionText: "49광년 밖\n10배입니다.\n",
    substitutions: { pairs: [{ text: "49광년", spoken: "사십구 광년" }, { text: "10배입니다.", spoken: "열 배입니다." }] } };
  const alignment = { words: [{ word: "49광년", start: 0.1, end: 0.8 }, { word: "박", start: 0.8, end: 1.0 }, { word: "열", start: 1.1, end: 1.4 }, { word: "배입니다", start: 1.4, end: 2 }] };
  assert.throws(() => assembleNarration({ ...base, alignment, forceAlign: true }), /s01\[2\] "밖"/);
  const result = assembleNarration({ ...base, alignment, forceAlign: true, allowEstimated: true });
  assert.deepEqual(result.sentences[0].words.slice(0, 2).map(w => w.text), ["사십구", "광년"]);
  assert.ok(result.sentences[0].words[1].end <= 0.8 + 1e-9);
  assert.deepEqual(result.alignment.estimated_tokens.map(t => t.text), ["밖"]);
  assert.match(result.alignment.estimated_note, /청취/);
  assert.throws(() => assembleNarration({ ...base, alignment, allowEstimated: true }), /force-align/);
});
