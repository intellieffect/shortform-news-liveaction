// node --test tests/test-audio-loudness.mjs
// 소리 라우드니스 계약: 정규화 보정·구간 계산·판정·완료/확정 차단. ffmpeg 로 만든 합성음만 쓰고 렌더는 하지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { REPO } from "../scripts/lib/pilot.mjs";
import { defaultAudio, measureStems, buildNormalization, evaluateMix, loadContract, loudnessGate, measureAudio, measurementWindows, parseEbur128, predictStatic, REPORT_REL, subtract } from "../scripts/lib/audio-loudness.mjs";
import { deliverEpisode } from "../scripts/lib/production/finalize.mjs";

const contract = loadContract("audio-loudness@1");
const put = (file, body) => { mkdirSync(join(file, ".."), { recursive: true }); writeFileSync(file, typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2) + "\n"); };
const tmp = (t) => { const d = mkdtempSync(join(tmpdir(), "audio-loudness-")); t.after(() => rmSync(d, { recursive: true, force: true })); return d; };
const tone = (file, { db, sec = 6, freq = 440 }) => execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `sine=frequency=${freq}:duration=${sec}:sample_rate=44100`, "-af", `volume=${db}dB`, file]);

test("ebur128 요약 파서: 무음은 null, 값은 숫자", () => {
  const sample = "Summary:\n\n  Integrated loudness:\n    I:         -23.4 LUFS\n    Threshold: -33.4 LUFS\n\n  Loudness range:\n    LRA:         5.1 LU\n\n  True peak:\n    Peak:       -1.2 dBFS\n";
  assert.deepEqual(parseEbur128(sample), { integrated_lufs: -23.4, lra_lu: 5.1, true_peak_dbtp: -1.2 });
  assert.equal(parseEbur128(sample.replace("-23.4", "-inf")).integrated_lufs, null);
});

test("정규화 보정: 서로 다른 크기의 원본이 같은 기준 LUFS 에 맞는다", (t) => {
  const dir = tmp(t);
  const quiet = join(dir, "quiet.wav"), loud = join(dir, "loud.wav"), hit = join(dir, "hit.wav");
  tone(quiet, { db: -4 }); tone(loud, { db: 10 }); tone(hit, { db: -10, sec: 1 });
  const files = { "audio/quiet.wav": quiet, "audio/loud.wav": loud, "audio/hit.wav": hit };
  const run = (bgmFile) => buildNormalization({ contractName: "audio-loudness@1", contract, audio: { bgm: { file: bgmFile, gain_db: -12, duck_db: -6 }, master_gain_db: 0 }, sfxFiles: ["audio/hit.wav"], resolve: (f) => files[f] });
  const a = run("audio/quiet.wav"), b = run("audio/loud.wav");
  assert.deepEqual([a.errors, b.errors], [[], []]);
  // 같은 gain_db 면 정규화 뒤 두 곡의 실제 LUFS 가 같아야 한다(보정 적용 후 재측정)
  const after = (src, off) => { const out = join(dir, `after-${off}.wav`); execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", `volume=${off}dB`, out]); return measureAudio(out).integrated_lufs; };
  const la = after(quiet, a.normalization.bgm_offset_db), lb = after(loud, b.normalization.bgm_offset_db);
  assert.ok(Math.abs(la - contract.reference.bgm_lufs) < 0.3 && Math.abs(lb - contract.reference.bgm_lufs) < 0.3, `${la} ${lb}`);
  // SFX 는 sample peak 기준
  const off = a.normalization.sfx_offset_db_by_file["audio/hit.wav"];
  assert.ok(Math.abs(measureAudio(hit).sample_peak_dbfs + off - contract.reference.sfx_peak_dbfs) < 0.2);
});

test("정규화 후 최대 볼륨이 0 dB 를 넘으면(클램프) sync 가 실패하도록 error 를 돌려준다", (t) => {
  const dir = tmp(t), quiet = join(dir, "q.wav");
  tone(quiet, { db: -20 });
  const r = buildNormalization({ contractName: "audio-loudness@1", contract, audio: { bgm: { file: "q", gain_db: 0 }, master_gain_db: 0 }, sfxFiles: [], resolve: () => quiet });
  assert.match(r.errors.join(), /1 로 잘린다/);
});

test("무음 BGM 원본은 보정할 수 없다", (t) => {
  const dir = tmp(t), silent = join(dir, "s.wav");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "3", silent]);
  const r = buildNormalization({ contractName: "audio-loudness@1", contract, audio: { bgm: { file: "s", gain_db: -1 } }, sfxFiles: [], resolve: () => silent });
  assert.match(r.errors.join(), /잴 수 없다/);
});

test("측정 구간: 발화는 안쪽만, 틈은 덕 앞뒤 여유 바깥만, 페이드·duck_ranges 는 뺀다", () => {
  const bgm = { fade_in_sec: 1, fade_out_sec: 2, duck_attack_sec: 0.25, duck_release_sec: 0.6, duck_ranges: [{ from: 40, to: 45, gain_db: -18, attack_sec: 0.5, release_sec: 1 }] };
  const w = measurementWindows({ speech: [[2, 10], [12, 20], [41, 44]], bgm, totalSec: 60 });
  assert.deepEqual(w.speech, [[2, 10], [12, 20]]);
  assert.ok(w.gaps.every(([a, b]) => b - a >= 0.4 && a >= 1 && b <= 58));
  assert.ok(!w.gaps.some(([a, b]) => a < 10.69 && b > 1.66 && b > a && a < 10.69 && b > 2), "덕 attack·release 안쪽은 틈이 아니다");
  assert.deepEqual(subtract([[0, 10]], [[2, 3], [5, 6]]), [[0, 2], [3, 5], [6, 10]]);
});

const measured = (over = {}) => ({ narration_speech_lufs: -16, narration_peak_dbfs: -1.5, bgm_speech_lufs: -29.5, bgm_gap_lufs: -23, gap_seconds: 20, sfx: [{ id: "a", peak_dbfs: -9 }], ...over });

test("판정: 목표 범위 안이면 pass, 안 쪽은 12~15 LU·SFX 피크 범위", () => {
  assert.equal(evaluateMix({ contract, measured: measured() }).status, "pass");
});

test("판정: 말하는 동안 BGM 이 27 LU 아래(hani_1275504 실측)면 out-of-range", () => {
  const v = evaluateMix({ contract, measured: measured({ bgm_speech_lufs: -42.9, narration_speech_lufs: -15.7, bgm_gap_lufs: -33.9, sfx: [{ id: "a", peak_dbfs: -24 }] }) });
  assert.equal(v.status, "out-of-range");
  assert.ok(v.checks.some((c) => c.id === "bgm_vs_narration_during_speech_lu" && c.status === "fail"));
});

test("판정: BGM 이 너무 커도(말을 덮음) 막는다", () => {
  assert.equal(evaluateMix({ contract, measured: measured({ bgm_speech_lufs: -20 }) }).status, "out-of-range");
});

test("판정: 측정값 null 은 통과가 아니라 unmeasured", () => {
  assert.equal(evaluateMix({ contract, measured: measured({ bgm_speech_lufs: null }) }).status, "unmeasured");
  assert.equal(evaluateMix({ contract, measured: measured({ sfx: [{ id: "a", peak_dbfs: null }] }) }).status, "unmeasured");
});

test("판정: 덕이 얕아 틈과 발화 레벨 차이가 3 LU 미만이면 막는다", () => {
  const v = evaluateMix({ contract, measured: measured({ bgm_speech_lufs: -29, bgm_gap_lufs: -28 }) });
  assert.ok(v.checks.some((c) => c.id === "gap_over_speech_lu" && c.status === "fail"));
});

test("판정: 말 없는 구간이 짧으면 틈 항목은 n/a 로 남고 막지 않는다", () => {
  const v = evaluateMix({ contract, measured: measured({ gap_seconds: 0.2, bgm_gap_lufs: null }) });
  assert.equal(v.status, "pass");
  assert.equal(v.checks.find((c) => c.id === "bgm_vs_narration_in_gaps_lu").status, "n/a");
});

test("정적 예측: 옛 해석 hani_1275504 값은 범위 이탈, 같은 gain 을 정규화 기준으로 읽으면 BGM 은 통과 근처", () => {
  const audio = { bgm: { gain_db: -11, duck_db: -9 }, master_gain_db: -0.5, narration: { gain_db: 0 }, sfx: [{ id: "d", file: "d", gain_db: -26 }] };
  const old = predictStatic({ audio, contract, bgmSource: { integrated_lufs: -21 }, sfxSources: { d: { sample_peak_dbfs: -7 } }, normalized: false });
  assert.equal(old.status, "out-of-range");
  const fixed = predictStatic({ audio: { ...audio, bgm: { gain_db: -1, duck_db: -6 }, sfx: [{ id: "d", file: "d", gain_db: -5 }] }, contract, bgmSource: { integrated_lufs: -21 }, sfxSources: {}, normalized: true });
  assert.equal(fixed.status, "pass");
});

test("stem 실측: 합성 stem 에서 발화 구간 BGM−내레이션 격차와 SFX 피크를 읽는다", (t) => {
  const dir = tmp(t);
  const stems = { narration: join(dir, "n.wav"), bgm: join(dir, "b.wav"), sfx: join(dir, "s.wav") };
  tone(stems.narration, { db: 0, sec: 24, freq: 300 });
  tone(stems.bgm, { db: -13, sec: 24, freq: 700 });
  tone(stems.sfx, { db: -9, sec: 24, freq: 2000 });
  const bgm = { fade_in_sec: 1, fade_out_sec: 2, duck_attack_sec: 0.25, duck_release_sec: 0.6 };
  const m = measureStems({ stems, speech: [[2, 8], [12, 18]], bgm, totalSec: 24, cues: [{ id: "c1", at_sec: 5 }], contract });
  assert.ok(Math.abs(m.bgm_speech_lufs - m.narration_speech_lufs + 13) < 0.6, `${m.bgm_speech_lufs} ${m.narration_speech_lufs}`);
  assert.ok(m.speech_seconds >= 11.9 && m.gap_seconds > 3);
  assert.ok(Math.abs(m.sfx[0].peak_dbfs - m.narration_peak_dbfs + 9) < 0.5);
});

// ---- 가드: 완료·확정 차단 -------------------------------------------------
const ID = "hani_1299998";
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" });
const fixture = (t, audio, { delivered = false } = {}) => {
  const repo = tmp(t);
  copyFileSync(join(REPO, ".gitignore"), join(repo, ".gitignore"));
  mkdirSync(join(repo, "config"), { recursive: true });
  copyFileSync(join(REPO, "config/audio-loudness.json"), join(repo, "config/audio-loudness.json"));
  git(repo, "init", "-q", "-b", "main"); git(repo, "config", "user.name", "테스트"); git(repo, "config", "user.email", "t@example.invalid");
  git(repo, "add", ".gitignore"); git(repo, "commit", "-q", "-m", "init");
  put(join(repo, "news", ID, "00_brief/request.json"), { schema_version: "1.0", pilot: ID, mode: "editorial-concept", source_url: "https://example.invalid/a" });
  put(join(repo, "news", ID, "02_production/story.json"), { mode: "editorial-concept" });
  put(join(repo, "news", ID, "02_production/audio.json"), audio);
  put(join(repo, "pilots", ID, "pilot.json"), { id: ID, status: "drafting", article: { url: null }, versions: delivered ? [{ version: "v1", file: null, sha256: "x" }] : [] });
  const path = `out/pilots/${ID}/qa/production.mp4`;
  put(join(repo, path), Buffer.alloc(128, 7));
  const renderSha = sha(join(repo, path));
  put(join(repo, "news", ID, "02_production/run.json"), { receipts: { render: { validation: { artifact: { path, sha256: renderSha }, media: { duration: 60 } } } } });
  return { repo, renderSha };
};
const report = (repo, over) => put(join(repo, REPORT_REL(ID)), { schema_version: "audio-loudness-report@1", contract: "audio-loudness@1", verdict: { status: "pass", checks: [] }, ...over });

test("가드: 미확정 신규 편에 loudness_contract 가 없으면 막는다(경고가 아니라 차단)", (t) => {
  const { repo, renderSha } = fixture(t, { schema_version: "1.0", bgm: {}, sfx: [] });
  const gate = loudnessGate({ repo, id: ID, renderSha256: renderSha });
  assert.equal(gate.blocking, true);
  assert.equal(gate.blockers[0].code, "audio-loudness-contract-missing");
  assert.throws(() => deliverEpisode(ID, { repo }), /audio-loudness-contract-missing/);
  assert.throws(() => deliverEpisode(ID, { repo, basis: "user" }), /audio-loudness-contract-missing/);
});

test("start 가 새 편 audio.json 에 loudness_contract 를 넣는다", () => {
  const a = defaultAudio();
  assert.equal(a.loudness_contract, "audio-loudness@1");
  assert.ok(Object.keys(loadContract(a.loudness_contract).targets).length);
});

test("가드: 이미 확정된 편의 다음 판과 --from 복원은 계약 없이도 통과한다", (t) => {
  const { repo, renderSha } = fixture(t, { schema_version: "1.0", bgm: {}, sfx: [] }, { delivered: true });
  const gate = loudnessGate({ repo, id: ID, renderSha256: renderSha });
  assert.equal(gate.status, "legacy"); assert.equal(gate.blocking, false);
  assert.equal(deliverEpisode(ID, { repo }).version, "v2");
});

test("가드: 계약 편은 측정 기록이 없으면 complete·deliver 가 막힌다", (t) => {
  const { repo, renderSha } = fixture(t, { schema_version: "1.0", loudness_contract: "audio-loudness@1", bgm: {}, sfx: [] });
  const gate = loudnessGate({ repo, id: ID, renderSha256: renderSha });
  assert.equal(gate.blocking, true);
  assert.equal(gate.blockers[0].code, "audio-loudness-unmeasured");
  assert.equal(gate.listening, "청취 미확인");
  assert.throws(() => deliverEpisode(ID, { repo }), /소리 라우드니스 가드/);
  assert.throws(() => deliverEpisode(ID, { repo, basis: "user" }), /--audio-waiver/);
});

test("가드: 다른 렌더를 잰 기록(stale)과 범위 이탈 기록은 막힌다", (t) => {
  const { repo, renderSha } = fixture(t, { schema_version: "1.0", loudness_contract: "audio-loudness@1", bgm: {}, sfx: [] });
  report(repo, { render_sha256: "0".repeat(64) });
  assert.ok(loudnessGate({ repo, id: ID, renderSha256: renderSha }).blockers.some((b) => b.code === "audio-loudness-stale"));
  report(repo, { render_sha256: renderSha, verdict: { status: "out-of-range", checks: [{ id: "bgm_vs_narration_during_speech_lu", value: -27, status: "fail" }] } });
  assert.ok(loudnessGate({ repo, id: ID, renderSha256: renderSha }).blockers.some((b) => b.code === "audio-loudness-out-of-range"));
});

test("가드: 같은 렌더의 통과 기록이면 확정되고 버전에 측정 통과·청취 미확인이 함께 남는다", (t) => {
  const { repo, renderSha } = fixture(t, { schema_version: "1.0", loudness_contract: "audio-loudness@1", bgm: {}, sfx: [] });
  report(repo, { render_sha256: renderSha });
  const result = deliverEpisode(ID, { repo });
  assert.equal(result.version, "v1");
  const v = JSON.parse(readFileSync(join(repo, "pilots", ID, "pilot.json"))).versions[0];
  assert.equal(v.audio_loudness.status, "pass");
  assert.equal(v.audio_loudness.listening, "청취 미확인");
});

test("가드: 사용자 확정만 --audio-waiver 로 넘길 수 있고 사유가 기록에 남는다", (t) => {
  const { repo } = fixture(t, { schema_version: "1.0", loudness_contract: "audio-loudness@1", bgm: {}, sfx: [] });
  assert.throws(() => deliverEpisode(ID, { repo, basis: "completion", audioWaiver: "무시" }), /소리 라우드니스 가드/);
  deliverEpisode(ID, { repo, basis: "user", audioWaiver: "사용자가 청취 후 이 레벨로 확정" });
  const v = JSON.parse(readFileSync(join(repo, "pilots", ID, "pilot.json"))).versions[0];
  assert.equal(v.audio_loudness.waived, true);
  assert.match(v.audio_loudness.waiver, /청취 후/);
});
