import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRanges, selectFrames } from "../scripts/review-packet.mjs";

const proof = [0, 100, 150, 299, 300, 500].map((frame, i) => ({ id: `p${i}`, frame, labels: [`l${i}`] }));

test("full scope keeps every proof frame inside the video", () => {
  assert.deepEqual(selectFrames([...proof, { frame: 900 }], 600, null).map(f => f.frame), [0, 100, 150, 299, 300, 500]);
});

test("recheck scope keeps proof frames in [from,end) and adds both range edges", () => {
  const frames = selectFrames(proof, 600, parseRanges("120-300,590-700"));
  assert.deepEqual(frames.map(f => f.frame), [120, 150, 299, 590, 599]);
  assert.deepEqual(frames[0].labels, ["range-edge"]);
  assert.deepEqual(frames[1].labels, ["l2"]);
});

test("rejects malformed or empty ranges", () => {
  for (const bad of ["300", "300-300", "a-b", "400-300"]) assert.throws(() => parseRanges(bad), /from-end/);
  assert.equal(parseRanges(undefined), null);
});
