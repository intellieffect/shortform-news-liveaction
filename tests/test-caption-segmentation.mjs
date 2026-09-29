#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { captionTextWidth, measureCaptionText, captionFont } from "../scripts/lib/caption-metrics.mjs";
import { splitCaptionWords, boundaryPenalty } from "../scripts/lib/caption-segmentation.mjs";
import { readProductionProfile } from "../scripts/lib/production-profile.mjs";

// Pinned to the archived 1.4 profile (font-semantic@1). Current-profile
// behaviour (font-semantic@2) is covered by test-caption-semantics.mjs.
const profile = readProductionProfile({ id: "hani-shortform", version: "1.4.0" });
const archived = (version) => JSON.parse(readFileSync(new URL(`../config/production-profiles/hani-shortform-${version}.json`, import.meta.url)));

// Profile geometry: 1.4 box780/text756, archived 1.3 keeps box672/text648.
assert.equal(profile.version, "1.4.0");
assert.equal(profile.caption.segmentation, "font-semantic@1");
assert.equal(profile.canvas.width - 2 * profile.caption.side_inset, 780);
assert.equal(captionTextWidth(profile), 756);
assert.equal(profile.caption.font_size, 70);
const v13 = readProductionProfile({ id: "hani-shortform", version: "1.3.0" });
assert.equal(v13.version, "1.3.0");
assert.equal(v13.caption.side_inset, 204);
assert.equal(captionTextWidth(v13), 648);
for (const version of ["1.0.0", "1.1.0", "1.2.0"]) assert.deepEqual(readProductionProfile({ id: "hani-shortform", version }), archived(version));

// Actual font widths (GmarketSans Medium/Bold, 70px).
const medium = (t) => measureCaptionText(t, { weight: 500, fontSize: 70 });
const bold = (t) => measureCaptionText(t, { weight: 700, fontSize: 70 });
for (const [text, width] of [["은하가 도는 방향이,", 594.88], ["연구진은 은하의 씨앗인", 712.62], ["암흑물질 덩어리를 비튼,", 729.56]])
  assert.ok(Math.abs(medium(text) - width) < 0.05, `${text}: ${medium(text)}`);
assert.ok(bold("암흑물질 덩어리를 비튼,") > medium("암흑물질 덩어리를 비튼,"), "bold is wider");
assert.ok(Math.abs(bold("암흑물질 덩어리를 비튼,") - 733.11) < 0.05);
assert.equal(captionFont("GmarketSans", 500), captionFont("GmarketSans", 500), "parsed font is cached");
assert.throws(() => measureCaptionText("x", { weight: 300, fontSize: 70 }), /폰트가 없다/);

// Timed words: one word per 0.3s unless given.
const timed = (text, { gapAfter = {} } = {}) => {
  let t = 0;
  return text.split(" ").map((word, i) => { const w = { text: word, start: t, end: t + 0.3 }; t += 0.3 + (gapAfter[i] ?? 0.02); return w; });
};
const texts = (text, config = profile, options) => splitCaptionWords(timed(text, options), config).map(c => c.text);

// Required sequences.
assert.deepEqual(texts("은하가 도는 방향이,"), ["은하가 도는 방향이,"]);
assert.deepEqual(texts("연구진은 은하의 씨앗인 암흑물질 덩어리를 비튼,"), ["연구진은 은하의 씨앗인", "암흑물질 덩어리를 비튼,"]);
assert.deepEqual(texts("은하가 도는 방향이, 연구진은 은하의 씨앗인 암흑물질 덩어리를 비튼, 결과였습니다."),
  ["은하가 도는 방향이,", "연구진은 은하의 씨앗인", "암흑물질 덩어리를 비튼,", "결과였습니다."]);

// Additional Korean cases: genitive and bare-noun compounds stay with their head,
// bound nouns are not isolated, every line fits the measured width.
const fits = (lines, config = profile) => lines.forEach(line => assert.ok(Math.max(medium(line), bold(line)) <= captionTextWidth(config), line));
const genitive = texts("국제 공동 연구진은 태양계 바깥 행성의 대기 성분을 처음으로 직접 측정했습니다.");
fits(genitive);
// Every 4-line cut here breaks either 행성의|대기 or 대기|성분; the bare-noun compound outranks the genitive.
assert.deepEqual(genitive, ["국제 공동 연구진은", "태양계 바깥 행성의", "대기 성분을 처음으로", "직접 측정했습니다."]);
const bound = texts("과학자들은 이 현상이 앞으로 수십 년 동안 반복될 수 있다고 경고했습니다.");
fits(bound);
assert.ok(bound.every(line => !/^수 /.test(line) && !/^(것|수)$/.test(line)), `bound noun isolated: ${bound}`);
assert.ok(boundaryPenalty({ text: "은하의" }, { text: "씨앗인" }) > boundaryPenalty({ text: "연구진은" }, { text: "은하의" }));
assert.ok(boundaryPenalty({ text: "암흑물질" }, { text: "덩어리를" }) > boundaryPenalty({ text: "씨앗인" }, { text: "암흑물질" }) - 1);
assert.ok(boundaryPenalty({ text: "될" }, { text: "수" }) >= 80);

// Punctuation and numbers: a thousands comma never splits; sentence punctuation does.
assert.deepEqual(texts("관측값은 1,000배였다. 이후 줄었다!"), ["관측값은 1,000배였다.", "이후 줄었다!"]);
assert.deepEqual(texts("“왜 그랬을까?” 그는 물었다."), ["“왜 그랬을까?”", "그는 물었다."]);
assert.throws(() => splitCaptionWords(timed("방향이,그리고 끝"), profile), /개별 단어 시각/);

// Pauses over 0.8s start a new caption even inside a clause.
assert.deepEqual(texts("잠시 멈춘 뒤 다시", profile, { gapAfter: { 1: 0.9 } }), ["잠시 멈춘", "뒤 다시"]);

// Impossible single word errors instead of shrinking.
assert.throws(() => splitCaptionWords(timed("가".repeat(12)), profile), /한 줄보다 길다/);

// Timestamps: captions keep exact word objects and span first start → last end.
const words = timed("연구진은 은하의 씨앗인 암흑물질 덩어리를 비튼,");
const captions = splitCaptionWords(words, profile);
assert.deepEqual(captions.flatMap(c => c.words), words);
for (const c of captions) { assert.equal(c.start, c.words[0].start); assert.equal(c.end, c.words.at(-1).end); }

// Archived 1.3 geometry segments to its own narrower width.
const old = texts("연구진은 은하의 씨앗인 암흑물질 덩어리를 비튼,", v13);
fits(old, v13);
assert.ok(old.length >= 3, `1.3 width 648: ${old}`);

assert.deepEqual(texts("은하가 도는 방향이,", v13), ["은하가 도는", "방향이,"]);
assert.equal(readProductionProfile({id:profile.id,version:profile.version}).version, "1.4.0");
assert.deepEqual(texts("은하가 도는 방향이 처음부터 다른 이유를 찾아냈습니다."), ["은하가 도는 방향이", "처음부터 다른 이유를", "찾아냈습니다."]);
assert.ok(boundaryPenalty({text:"도는"},{text:"방향이"}) >= 40);
console.log("caption segmentation: PASS — 실측 폭(Medium/Bold)·1.4 폭756·보관 프로필·의미 단위 분절·쉼표/숫자/쉼·시각 보존");
