import test from "node:test";
import assert from "node:assert/strict";
import { factCoverageCarry } from "../scripts/lib/production/review.mjs";

// 낭독 n1 위에 렌더 r1(사실 전체 검수) → 화면만 고친 r2(수정 구간만 사실 재검수).
const FILES = { "facts.md": "f1", "story.json": "s1" };
const ok = (id, action, dependencies, extra = {}) => ({ id, action, status: "succeeded", inputs: { dependencies, files: {} }, ...extra });
const render = (id, sync, frames = 2400) => ok(id, "render", { sync }, { validation: { media: { total_frames: frames } } });
const artifact = (renderId) => ({ path: `out/${renderId}.mp4`, sha256: renderId.padEnd(64, "0"), render_receipt: renderId });
const factReview = (id, renderId, ranges, files = FILES) => ({
  id, action: "review_facts", status: "succeeded", inputs: { files, dependencies: { render: renderId } },
  validation: { report_path: `reviews/${id}.json`, report: { artifact: artifact(renderId), reviewer: { independent: true }, coverage: { fact_ranges: ranges } } },
});
const base = (overrides = {}) => {
  const attempts = [
    ok("n1", "narration", {}), ok("t1", "timeline", { narration: "n1" }), ok("s1", "sync", { timeline: "t1" }),
    ok("t2", "timeline", { narration: "n1" }), ok("s2", "sync", { timeline: "t2" }),
    render("r1", "s1"), render("r2", "s2", overrides.frames),
    factReview("f1", "r1", [[0, 2400]]), factReview("f2", "r2", [[300, 360]], overrides.files),
  ];
  const state = {
    attempts,
    receipts: { review_facts: attempts.at(-1) },
    resolutions: overrides.resolutions ?? [{ id: "x", issue: "v1:N7", range: [300, 360], artifact: artifact("r2") }],
  };
  const history = attempts.filter((a) => a.action === "review_facts");
  return { state, history };
};

test("화면만 고친 재렌더는 이전 렌더의 사실 대조 범위를 잇는다", () => {
  const { state, history } = base();
  assert.deepEqual(factCoverageCarry(state, history, artifact("r2"), [[300, 360]]).map((a) => a.id), ["f1"]);
});

test("새 사실 검수가 수정 구간을 덮지 않으면 잇지 않는다", () => {
  const { state, history } = base();
  assert.deepEqual(factCoverageCarry(state, history, artifact("r2"), [[300, 330]]), []);
});

test("현재 렌더에 제작자 수정 기록이 없으면 잇지 않는다", () => {
  const { state, history } = base({ resolutions: [] });
  assert.deepEqual(factCoverageCarry(state, history, artifact("r2"), [[300, 360]]), []);
});

test("사실 입력이 바뀌면 잇지 않는다", () => {
  const { state, history } = base({ files: { ...FILES, "facts.md": "f2" } });
  assert.deepEqual(factCoverageCarry(state, history, artifact("r2"), [[300, 360]]), []);
});

test("총 프레임이 달라지면 잇지 않는다", () => {
  const { state, history } = base({ frames: 2410 });
  assert.deepEqual(factCoverageCarry(state, history, artifact("r2"), [[300, 360]]), []);
});

test("낭독을 다시 녹음하면 잇지 않는다", () => {
  const { state, history } = base();
  state.attempts.push(ok("n2", "narration", {}));
  state.attempts.find((a) => a.id === "t2").inputs.dependencies.narration = "n2";
  assert.deepEqual(factCoverageCarry(state, history, artifact("r2"), [[300, 360]]), []);
});
