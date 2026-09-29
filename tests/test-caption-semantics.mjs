#!/usr/bin/env node
// font-semantic@2 (profile 1.5): authored protected phrases / breaks, quoted
// names, predicate separation, exact word and timing preservation, and the real
// narration assembly path. Archived 1.4 (font-semantic@1) stays pinned in
// test-caption-segmentation.mjs.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { captionTextWidth } from "../scripts/lib/caption-metrics.mjs";
import { splitCaptionWords, captionLineWidth } from "../scripts/lib/caption-segmentation.mjs";
import { assembleNarration } from "../scripts/lib/narration-assembly.mjs";
import { productionProfileErrors, readProductionProfile } from "../scripts/lib/production-profile.mjs";

const profile = readProductionProfile();
const v14 = readProductionProfile({ id: "hani-shortform", version: "1.4.0" });

// Profile: 1.5 changes only version and segmentation contract. Same font, size, box.
assert.equal(profile.version, "1.5.0");
assert.equal(profile.caption.segmentation, "font-semantic@2");
assert.equal(v14.caption.segmentation, "font-semantic@1");
assert.deepEqual({ ...profile, version: "1.4.0", caption: { ...profile.caption, segmentation: "font-semantic@1" } }, v14);
assert.equal(captionTextWidth(profile), 756);
assert.deepEqual(productionProfileErrors(profile), []);
assert.deepEqual(productionProfileErrors(v14), []);
assert.ok(productionProfileErrors({ ...profile, caption: { ...profile.caption, segmentation: "font-semantic@3" } }).length);
// The archive is a byte copy of the last committed 1.4 profile.
const committed = execFileSync("git", ["show", "HEAD:config/production-profile.json"], { cwd: new URL("..", import.meta.url) }).toString();
if (JSON.parse(committed).version === "1.4.0") assert.equal(readFileSync(new URL("../config/production-profiles/hani-shortform-1.4.0.json", import.meta.url), "utf8"), committed);

const timed = (text, gapAfter = {}) => {
  let t = 0;
  return text.split(" ").map((word, i) => { const w = { text: word, start: t, end: t + 0.3 }; t += 0.32 + (gapAfter[i] ?? 0); return w; });
};
const split = (words, hints, config = profile) => splitCaptionWords(words, config, { hints, where: "s01 자막" });
const texts = (text, hints, gapAfter) => split(timed(text, gapAfter), hints).map(c => c.text);
const preserved = (words, captions) => {
  assert.equal(captions.flatMap(c => c.words).length, words.length);
  captions.flatMap(c => c.words).forEach((w, i) => assert.equal(w, words[i], "same word objects, same order"));
  for (const c of captions) {
    assert.equal(c.text, c.words.map(w => w.text).join(" "));
    assert.equal(c.start, c.words[0].start); assert.equal(c.end, c.words.at(-1).end);
    assert.ok(captionLineWidth(c.text, profile) <= captionTextWidth(profile), c.text);
  }
};

// 1. The requested example. The name token carries its copula, so
//    "국제 달 관측의 날이었습니다." (887px) cannot fit one 756px line: an
//    authored protected name fails with an actionable message instead of
//    shrinking, widening, compressing or splitting the name.
const moon = "전세계가 함께 달을 올려다 본 국제 달 관측의 날이었습니다.";
const name = { from: 5, to: 8, text: "국제 달 관측의 날" };
assert.ok(captionLineWidth("국제 달 관측의 날이었습니다.", profile) > captionTextWidth(profile));
assert.throws(() => texts(moon, { protected_phrases: [name] }), (error) =>
  /s01 자막 protected_phrases\[0\]/.test(error.message) && /887\.\dpx가 한 줄 756px/.test(error.message) && /글자 축소·폭 확대·문구 삭제로 맞추지 않는다/.test(error.message) && /해당 편의 승인 범위/.test(error.message));
// Without authored metadata the heuristic cannot know it is a name; it still keeps every word.
const moonWords = timed(moon);
preserved(moonWords, split(moonWords));

// 2. When the predicate is its own timed word, the name stays whole and the
//    predicate separates: the wanted shape.
const moonSeparate = "전세계가 함께 달을 올려다 본 국제 달 관측의 날이 열렸습니다.";
assert.deepEqual(texts(moonSeparate, { protected_phrases: [name] }), ["전세계가 함께", "달을 올려다 본", "국제 달 관측의 날이", "열렸습니다."]);
// Unhinted, the same line splits the unknown name (documented limitation).
assert.ok(texts(moonSeparate).every(line => line !== "국제 달 관측의 날이"));

// 3. A short quoted name groups without authored hints (soft rule).
assert.deepEqual(texts("전세계가 함께 달을 올려다 본 ‘국제 달 관측의 날’이 열렸습니다."), ["전세계가 함께", "달을 올려다 본", "‘국제 달 관측의 날’이", "열렸습니다."]);
// A quoted sentence is not protected: it may split, and it never errors for width.
const quotedSentence = "그는 “우리는 오늘 밤 전세계 사람들과 함께 달을 올려다보았다”고 말했습니다.";
const quotedWords = timed(quotedSentence), quoted = split(quotedWords);
preserved(quotedWords, quoted);
assert.ok(quoted.some(c => c.text.includes("“") && !c.text.includes("”")), "quoted sentence is split inside");

// 4. Explicit break_before is a hard boundary; its text guards against index drift.
assert.deepEqual(texts("은하가 도는 방향이 처음부터 다른 이유를 찾아냈습니다.", { break_before: [{ token: 2, text: "방향이" }] })[0], "은하가 도는");
assert.throws(() => texts("은하가 도는 방향이", { break_before: [{ token: 2, text: "방향" }] }), /토큰 2은 "방향이"/);

// 5. Temporal gaps and clauses: a pause over 0.8s still breaks ordinary text, but
//    not an authored name; clause punctuation still breaks; a name may not cross it.
assert.deepEqual(texts("잠시 멈춘 뒤 다시", undefined, { 1: 0.9 }), ["잠시 멈춘", "뒤 다시"]);
const paused = timed("국제 달 관측의 날 행사가 열렸습니다.", { 1: 1.0 });
const pausedCaptions = split(paused, { protected_phrases: [{ from: 0, to: 3, text: "국제 달 관측의 날" }] });
assert.equal(pausedCaptions[0].text.startsWith("국제 달 관측의 날"), true);
assert.equal(pausedCaptions[0].end - pausedCaptions[0].start > 1.0, true, "caption spans the real pause; no timing invented");
preserved(paused, pausedCaptions);
assert.deepEqual(texts("은하가 도는 방향이, 연구진은 은하의 씨앗인 암흑물질 덩어리를 비튼, 결과였습니다."), ["은하가 도는 방향이,", "연구진은 은하의 씨앗인", "암흑물질 덩어리를 비튼,", "결과였습니다."]);
assert.throws(() => texts("서울, 부산 공동선언이 나왔다.", { protected_phrases: [{ from: 0, to: 2, text: "서울, 부산 공동선언" }] }), /절 경계를 넘는다/);

// 6. Predicate separation and semantic cuts on existing cases (all fit, nothing dropped).
assert.deepEqual(texts("국제 공동 연구진은 태양계 바깥 행성의 대기 성분을 처음으로 직접 측정했습니다."), ["국제 공동 연구진은", "태양계 바깥 행성의", "대기 성분을 처음으로", "직접 측정했습니다."]);
assert.deepEqual(texts("과학자들은 이 현상이 앞으로 수십 년 동안 반복될 수 있다고 경고했습니다."), ["과학자들은 이 현상이", "앞으로 수십 년 동안", "반복될 수 있다고", "경고했습니다."]);
assert.deepEqual(texts("관측값은 1,000배였다. 이후 줄었다!"), ["관측값은 1,000배였다.", "이후 줄었다!"]);

// 7. Invalid or unsafe input fails with its location.
assert.throws(() => split(timed("가".repeat(12))), /한 줄보다 길다/);
assert.throws(() => texts(moonSeparate, { protected_phrases: [{ from: 5, to: 8, text: "국제 우주의 날" }] }), /색인을 다시 쓴다/);
assert.throws(() => texts(moonSeparate, { protected_phrases: [{ from: 6, to: 8, text: "국제 달 관측의 날" }] }), /첫 토큰에서 시작/);
assert.throws(() => texts(moonSeparate, { protected_phrases: [name, { from: 8, to: 9, text: "날이 열렸습니다." }] }), /겹친다/);
assert.throws(() => texts(moonSeparate, { protected_phrases: [{ from: 5, to: 12, text: "x" }] }), /정수 토큰 색인/);
assert.throws(() => texts(moonSeparate, { protected_phrases: [name], break_before: [{ token: 7, text: "관측의" }] }), /보호 구간 5–8/);
assert.throws(() => texts(moonSeparate, { protect: [] }), /알 수 없는 키/);
assert.throws(() => split(timed(moonSeparate), { protected_phrases: [name] }, v14), /font-semantic@2 프로필에서만/);

// 8. Real narration assembly: hints keyed by line id reach segmentation, are
//    recorded on the sentence, and captions keep the aligner's exact times.
const script = "전세계가 함께 달을 올려다 본 국제 달 관측의 날이 열렸습니다.\n다음 관측은 내년입니다.\n";
const aligned = timed(script.replace(/\n/g, " ").trim()).map(w => ({ word: w.text, start: w.start + 0.1, end: w.end + 0.1 }));
const base = { pilot: "test", narrationText: script, profile, alignment: { words: aligned }, audio: { path: "02_production/audio/narration.wav", duration: 10 } };
const doc = assembleNarration({ ...base, captionSegmentation: { schema_version: "1.0", lines: { s01: { protected_phrases: [name] } } } });
assert.deepEqual(doc.captions.map(c => c.text), ["전세계가 함께", "달을 올려다 본", "국제 달 관측의 날이", "열렸습니다.", "다음 관측은 내년입니다."]);
assert.deepEqual(doc.sentences[0].caption_segmentation, { protected_phrases: [name] });
assert.equal(doc.sentences[1].caption_segmentation, undefined);
assert.deepEqual(doc.captions.flatMap(c => c.words), doc.sentences.flatMap(s => s.caption_words));
assert.deepEqual(doc.captions.flatMap(c => c.words).map(w => [w.start, w.end]), aligned.map(w => [w.start, w.end]));
assert.throws(() => assembleNarration({ ...base, captionSegmentation: { schema_version: "1.0", lines: { s09: {} } } }), /원고에 없는 줄 s09/);
assert.throws(() => assembleNarration({ ...base, captionSegmentation: { lines: {} } }), /schema_version/);
assert.throws(() => assembleNarration({ ...base, captionSegmentation: { schema_version: "1.0", lines: { s01: { protected_phrases: [{ ...name, to: 9, text: "국제 달 관측의 날이 열렸습니다." }] } } } }), /s01 자막 protected_phrases\[0\].*px가 한 줄 756px/);
assert.throws(() => assembleNarration({ ...base, profile: v14, captionSegmentation: { schema_version: "1.0", lines: { s01: { protected_phrases: [name] } } } }), /font-semantic@2/);
// No hints: assembly unchanged apart from the profile's contract.
assert.equal(assembleNarration(base).captions.flatMap(c => c.words).length, aligned.length);

console.log("caption semantics: PASS — 1.5 font-semantic@2·보관 1.4 고정·보호 구간/강제 경계·인용 이름·서술어 분리·쉼/절·폭 초과 실패·단어/시각 보존·내레이션 조립 연동");
