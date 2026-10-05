// node --test tests/test-sfx-gain-source.mjs
// SFX 음량 정본 = motion.json audio_cues[].gain_db. audio.json sfx[].gain_db 가 다르면 조용히 무시하지 않고 compile/check 가 알린다.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO } from "../scripts/lib/pilot.mjs";
import { validateEditorialBundle } from "../scripts/lib/editorial.mjs";
import { sfxGainConflicts } from "../scripts/lib/audio-loudness.mjs";

const DELIVERED = ["hani_1269147", "hani_1278583", "hani_1279867"];   // pilot.json 에 확정 버전이 있는 편
// 편 자료는 제작사 로컬에만 있다(납품 저장소엔 없음) — 없으면 실제 편 대조는 건너뛴다
const has = (id) => existsSync(join(REPO, "pilots", id, "story.json"));
const need = (id) => (has(id) ? {} : { skip: `${id} 편 자료 없음(로컬 전용)` });
const clone = (t, id) => {
  const dir = mkdtempSync(join(tmpdir(), "sfx-gain-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(join(REPO, "pilots", id), dir, { recursive: true });
  return dir;
};
// 폰트가 LFS 포인터인 체크아웃에서는 hook-font 오류가 따로 나므로 이 검사와 관계있는 audio-* 오류만 본다
const audioIssues = (list) => list.filter((e) => /audio-/.test(typeof e === "string" ? e : `${e.code}`));
const edit = (file, fn) => { const j = JSON.parse(readFileSync(file, "utf8")); fn(j); writeFileSync(file, JSON.stringify(j, null, 2) + "\n"); };

test("순수 함수: 같은 id 의 gain 이 다르면 충돌, cue 에 없는 file 항목은 unplayed", () => {
  const cues = [{ id: "a", gain_db: -5 }, { id: "b", gain_db: -3 }];
  const r = sfxGainConflicts([{ id: "a", file: "x", gain_db: -22 }, { id: "b", file: "y", gain_db: -3 }, { id: "c", file: "z", gain_db: -1 }, { id: "d", file: null }], cues);
  assert.deepEqual(r.conflicts, [{ id: "a", audio_json_gain_db: -22, motion_gain_db: -5 }]);
  assert.deepEqual(r.unplayed, ["c"]);
  assert.deepEqual(sfxGainConflicts([{ id: "a", file: "x" }], cues).conflicts, [], "gain_db 를 쓰지 않으면 충돌이 아니다");
});

for (const id of DELIVERED) test(`확정 편 ${id}: 새 검사를 오류 없이 통과하고 컴파일 결과(audio_cues)가 그대로다`, need(id), () => {
  const result = validateEditorialBundle(join(REPO, "pilots", id));
  assert.deepEqual(audioIssues(result.errors), []);
  const committed = JSON.parse(readFileSync(join(REPO, "pilots", id, "timeline.json"), "utf8"));
  assert.deepEqual(result.timeline.audio_cues, committed.audio_cues);
});

test("계약 편: audio.json 만 다른 값이면 audio-sfx-gain-conflict 오류(조용히 무시하지 않는다)", need("hani_1278583"), (t) => {
  const dir = clone(t, "hani_1278583");
  edit(join(dir, "audio.json"), (a) => { a.loudness_contract = "audio-loudness@1"; a.sfx[0].gain_db = -5; });
  const result = validateEditorialBundle(dir);
  assert.match(JSON.stringify(result.errors), /audio-sfx-gain-conflict/);
  assert.match(JSON.stringify(result.errors), /sfx_model_air/);
});

test("계약 편: 두 값이 같거나 audio.json 에 gain_db 가 없으면 통과", need("hani_1278583"), (t) => {
  const dir = clone(t, "hani_1278583");
  edit(join(dir, "audio.json"), (a) => { a.loudness_contract = "audio-loudness@1"; });
  assert.deepEqual(audioIssues(validateEditorialBundle(dir).errors), []);
  edit(join(dir, "audio.json"), (a) => { for (const s of a.sfx) delete s.gain_db; });
  assert.deepEqual(audioIssues(validateEditorialBundle(dir).errors), []);
});

test("확정됐고 계약 없는 옛 편은 불일치여도 오류가 아니라 경고 — 렌더가 안 바뀌므로 확정 편을 막지 않는다", need("hani_1278583"), (t) => {
  const dir = clone(t, "hani_1278583");
  edit(join(dir, "audio.json"), (a) => { a.sfx[0].gain_db = -5; });
  const result = validateEditorialBundle(dir);
  assert.deepEqual(audioIssues(result.errors), []);
  assert.match(JSON.stringify(result.warnings), /audio-sfx-gain-conflict/);
});

test("motion.json 을 고치면 timeline.audio_cues 가 바뀐다(= 렌더가 반영하는 경로)", need("hani_1278583"), (t) => {
  const dir = clone(t, "hani_1278583");
  edit(join(dir, "motion.json"), (m) => { m.audio_cues[0].gain_db = -9; });
  assert.equal(validateEditorialBundle(dir).timeline.audio_cues[0].gain_db, -9);
});
