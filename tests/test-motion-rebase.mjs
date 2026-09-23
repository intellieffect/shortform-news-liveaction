import assert from "node:assert/strict";
import { test } from "node:test";
import { rebaseAnchors } from "../scripts/motion-rebase.mjs";
import { narrationWordHash, normalizeNarration } from "../scripts/lib/editorial.mjs";

const narration = { sentences: [
  { id: "s01", text: "새 문장이 먼저 온다, 헬륨이 샌다.", words: [
    { text: "새", start: 0, end: 0.2 }, { text: "문장이", start: 0.2, end: 0.5 }, { text: "먼저", start: 0.5, end: 0.7 },
    { text: "온다,", start: 0.7, end: 1 }, { text: "헬륨이", start: 1.1, end: 1.5 }, { text: "샌다.", start: 1.5, end: 2 } ] },
  { id: "s02", text: "선 선 선.", words: [{ text: "선", start: 2.1, end: 2.3 }, { text: "선", start: 2.3, end: 2.5 }, { text: "선.", start: 2.5, end: 2.8 }] },
] };
const at = (line, word, token_index) => ({ anchor: { line, word, ...(token_index === undefined ? {} : { token_index }), edge: "start", offset_frames: -2 } });

test("re-points shifted and index-less anchors, normalizes string dependencies, refreshes the hash", () => {
  const motion = { narration_word_sha256: "old", events: [
    { id: "a", timing: { from: at("s01", "헬륨이", 0), settled: at("s01", "샌다"), to: at("s01", "샌다.", 5), end: at("s01", "샌다.", 5) }, depends_on: ["b"] },
  ] };
  const concepts = { concepts: [{ id: "c", range: { from: at("s01", "새", 0) } }] };
  const { changes, errors } = rebaseAnchors({ motion, concepts, narration });
  assert.deepEqual(errors, []);
  assert.equal(motion.events[0].timing.from.anchor.token_index, 4);
  assert.equal(motion.events[0].timing.settled.anchor.word, "샌다.");
  assert.equal(motion.events[0].timing.from.anchor.offset_frames, -2);
  assert.deepEqual(motion.events[0].depends_on, [{ event_id: "b" }]);
  assert.equal(motion.narration_word_sha256, narrationWordHash(normalizeNarration(narration)));
  assert.deepEqual(changes.map(c => c.match).sort(), ["exact", "hash", "punctuation", "shape"]);
});

test("refuses to guess between repeated or missing words", () => {
  const motion = { events: [{ id: "a", timing: { from: at("s02", "선"), settled: at("s01", "없는말"), to: at("s09", "x"), end: at("s02", "선", 1) } }] };
  const { errors } = rebaseAnchors({ motion, concepts: { concepts: [] }, narration });
  assert.equal(errors.length, 3);
  assert.match(errors[0].message, /2번 있다/);
  assert.match(errors[1].message, /없다/);
  assert.equal(motion.events[0].timing.end.anchor.token_index, 1);
});
