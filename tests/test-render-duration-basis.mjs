import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { requestedLength, validateRender } from "../scripts/lib/production/review.mjs";
import { hash } from "../scripts/lib/production/contracts.mjs";

const repo = resolve(import.meta.dirname, "..");
const fps = 30, content = 210, total = 360; // 본문 7초 + 끝 크레딧 5초
const pages = [{ from: content, end: 300 }, { from: 300, end: total }];
const timeline = (extra = {}) => ({ fps, total_frames: total, attribution: { pages }, ...extra });

test("content 기준은 첫 크레딧 페이지 앞까지, 미지정은 전체", () => {
  assert.deepEqual(requestedLength(timeline(), "content"), { basis: "content", seconds: 7 });
  assert.deepEqual(requestedLength(timeline()), { basis: "total", seconds: 12 });
  assert.deepEqual(requestedLength({ fps, total_frames: total }, "content"), { basis: "content", seconds: 12 });
  assert.throws(() => requestedLength(timeline(), "credits"), /basis/);
});

test("잘못된 크레딧 페이지로 본문 길이를 줄일 수 없다", () => {
  const bad = [
    [{ from: 30, end: 300 }, { from: 310, end: total }], // 빈틈
    [{ from: 30, end: 300 }],                            // 끝까지 안 감
    [{ from: 0, end: total }],                           // 본문 0
    [{ from: 210.5, end: total }],                       // 정수 아님
    [{ from: 300, end: 200 }],                           // 역순
    [],
    "x",
  ];
  for (const p of bad) assert.throws(() => requestedLength(timeline({ attribution: { pages: p } }), "content"), /크레딧/, JSON.stringify(p));
});

test("validateRender: 실제 MP4에 요청 기준 적용, 전체 검증 유지", { skip: !hasFfmpeg() }, () => {
  const dir = mkdtempSync(join(tmpdir(), "review-")), mp4 = join(dir, "out.mp4");
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `color=black:s=1080x1920:r=${fps}:d=12`, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "12", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", mp4]);
  writeFileSync(join(dir, "timeline.json"), JSON.stringify(timeline()));
  const outputs = { "out.mp4": hash(readFileSync(mp4)) };
  const w = (duration_sec) => ({ repo, production: dir, path: (f) => join(dir, f), request: { duration_sec } });

  const ok = validateRender(w({ min: 6, max: 8, basis: "content" }), outputs);
  assert.equal(ok.media.content_duration, 7);
  assert.equal(ok.media.duration, 12);
  assert.equal(ok.media.duration_basis, "content");
  assert.equal(ok.full_decode, true);
  assert.throws(() => validateRender(w({ min: 6, max: 8 }), outputs), /요청 범위/);
  assert.equal(validateRender(w({ min: 11, max: 13 }), outputs).media.duration_basis, "total");
  assert.throws(() => validateRender(w({ min: 8, max: 10, basis: "content" }), outputs), /요청 범위/);
  writeFileSync(join(dir, "timeline.json"), JSON.stringify(timeline({ attribution: { pages: [{ from: 180, end: 300 }] } })));
  assert.throws(() => validateRender(w({ min: 5, max: 8, basis: "content" }), outputs), /크레딧/);
});

function hasFfmpeg() {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; }
}
