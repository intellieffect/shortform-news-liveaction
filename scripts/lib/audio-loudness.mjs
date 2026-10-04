// 소리 라우드니스 계약(audio-loudness@N) — 원본 측정·정규화 보정·렌더 stem 측정·판정을 한곳에 둔다.
// 왜 (2026-10-04, hani_1275504): BGM gain -11 · duck -9 가 「원본 기준 상대값」이라 곡 원본이 -22.9 dB 면 말하는 동안 BGM 이 내레이션보다 27 dB 낮았다.
// measured 는 전부 null 인 채 렌더됐고 아무도 재지 않았다. 이 모듈은 (1) gain 을 정규화 기준 상대값으로 읽게 하는 보정값,
// (2) 렌더 뒤 stem 실측, (3) 목표 범위 판정을 낸다. 판정 통과 = 측정 통과이며 청취 통과가 아니다.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./pilot.mjs";

export const LOUDNESS_CONFIG = "config/audio-loudness.json";
export const REPORT_REL = (id) => `news/${id}/02_production/reviews/audio-loudness.json`;
export const REPORT_SCHEMA = "audio-loudness-report@1";

export const loadContract = (name, repo = REPO) => {
  const all = JSON.parse(readFileSync(join(repo, LOUDNESS_CONFIG), "utf8")).contracts ?? {};
  if (!all[name]) throw new Error(`알 수 없는 loudness_contract: ${name} (${Object.keys(all).join(", ")})`);
  return all[name];
};

const num = (s) => (s === undefined || /inf/i.test(s) ? null : Number(s));
export const round = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

/** ebur128 요약 문자열 → { integrated_lufs, lra_lu, true_peak_dbtp }. 무음이면 integrated 는 null. */
// ebur128 은 완전 무음에 -inf 가 아니라 절대 게이트 바닥 -70.0 LUFS 를 낸다 — integrated 는 측정값 없음(null)으로 취급한다
export const parseEbur128 = (text) => {
  const summary = text.slice(Math.max(0, text.lastIndexOf("Summary:")));
  const pick = (re) => num(re.exec(summary)?.[1]);
  return {
    integrated_lufs: (() => { const v = pick(/^\s+I:\s+(-?[\d.]+|-?inf)\s+LUFS/m); return v !== null && v <= -69.9 ? null : v; })(),
    lra_lu: pick(/^\s+LRA:\s+(-?[\d.]+|-?inf)\s+LU/m),
    true_peak_dbtp: pick(/^\s+Peak:\s+(-?[\d.]+|-?inf)\s+dBFS/m),
  };
};
export const parseMaxVolume = (text) => num(/max_volume:\s+(-?[\d.]+|-?inf)\s+dB/.exec(text)?.[1]);

const ffmpeg = (args) => {
  const r = spawnSync(process.env.FFMPEG_PATH ?? "ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error("ffmpeg 실행 실패: " + r.error.message);
  return `${r.stdout ?? ""}${r.stderr ?? ""}`;
};

const between = (windows) => windows.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join("+");
const selectChain = (windows) => (windows ? [`aselect='${between(windows)}'`, "asetpts=N/SR/TB"] : []);
export const totalSeconds = (windows) => windows.reduce((sum, [a, b]) => sum + Math.max(0, b - a), 0);

/** 파일(또는 구간 집합)의 통합 LUFS·LRA·true peak·sample peak. from: 시작 초(트림), windows: [[s,e]…] 이어붙여 잰다. */
export const measureAudio = (file, { from = 0, windows = null } = {}) => {
  if (!existsSync(file)) throw new Error("측정할 파일이 없다: " + file);
  if (windows && !windows.length) return { integrated_lufs: null, lra_lu: null, true_peak_dbtp: null, sample_peak_dbfs: null, seconds: 0 };
  const pre = from ? ["-ss", String(from)] : [];
  const chain = (tail) => [...selectChain(windows), tail].join(",");
  const loud = parseEbur128(ffmpeg([...pre, "-i", file, "-af", chain("ebur128=peak=true"), "-f", "null", "-"]));
  const peak = parseMaxVolume(ffmpeg([...pre, "-i", file, "-af", chain("volumedetect"), "-f", "null", "-"]));
  return { ...loud, sample_peak_dbfs: peak, seconds: windows ? round(totalSeconds(windows)) : null };
};

export const duration = (file) => Number(execFileSync(process.env.FFPROBE_PATH ?? "ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());

/**
 * 정규화 보정값. gain_db 가 계약 기준 상대값이 되도록 sync 가 pilot.json audio_normalization 에 기록한다.
 * BGM = 기준 LUFS - 원본(start_offset 이후) LUFS, SFX = 기준 sample peak - 원본 sample peak. 무음 원본은 보정할 수 없어 error.
 * 정규화 후 최대 볼륨이 0 dB 를 넘으면 렌더가 볼륨을 1 로 잘라 정규화가 깨진다 — errors 로 돌려준다.
 */
export const buildNormalization = ({ contractName, contract, audio, sfxFiles, measure = measureAudio, resolve }) => {
  const errors = [], sources = {};
  const norm = { contract: contractName, reference: contract.reference, bgm_offset_db: 0, sfx_offset_db_by_file: {}, sources };
  const master = audio.master_gain_db ?? 0, bgm = audio.bgm;
  if (bgm?.file) {
    const path = resolve(bgm.file), m = path ? measure(path, { from: bgm.start_offset_sec ?? 0 }) : null;
    if (!m || m.integrated_lufs === null) errors.push(`BGM 원본을 잴 수 없다: ${bgm.file}`);
    else {
      sources[bgm.file] = { integrated_lufs: round(m.integrated_lufs), true_peak_dbtp: round(m.true_peak_dbtp), lra_lu: round(m.lra_lu), from_sec: bgm.start_offset_sec ?? 0 };
      norm.bgm_offset_db = round(contract.reference.bgm_lufs - m.integrated_lufs);
      const top = norm.bgm_offset_db + bgm.gain_db + master;
      if (top > 0) errors.push(`BGM 정규화 후 최대 볼륨이 ${round(top)} dB(>0)라 1 로 잘린다 — gain_db 를 ${round(bgm.gain_db - top)} 이하로 낮추거나 더 큰 원본을 쓴다`);
    }
  }
  for (const file of sfxFiles) {
    const path = resolve(file), m = path ? measure(path) : null;
    if (!m || m.sample_peak_dbfs === null) { errors.push(`SFX 원본을 잴 수 없다: ${file}`); continue; }
    sources[file] = { sample_peak_dbfs: round(m.sample_peak_dbfs), integrated_lufs: round(m.integrated_lufs), true_peak_dbtp: round(m.true_peak_dbtp) };
    norm.sfx_offset_db_by_file[file] = round(contract.reference.sfx_peak_dbfs - m.sample_peak_dbfs);
  }
  return { normalization: norm, errors };
};

const clip = (windows, lo, hi) => windows.map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)]).filter(([a, b]) => b - a > 0.05);
const merge = (windows) => {
  const out = [];
  for (const w of [...windows].sort((x, y) => x[0] - y[0])) {
    if (out.length && w[0] <= out.at(-1)[1]) out.at(-1)[1] = Math.max(out.at(-1)[1], w[1]);
    else out.push([...w]);
  }
  return out;
};
export const subtract = (base, cut) => {
  let out = merge(base);
  for (const [c0, c1] of merge(cut)) {
    out = out.flatMap(([a, b]) => (c1 <= a || c0 >= b ? [[a, b]] : [[a, Math.min(b, c0)], [Math.max(a, c1), b]].filter(([x, y]) => y - x > 0.05)));
  }
  return out;
};

/**
 * 측정 구간. 발화 = narration 줄 [start,end]. 덕은 attack 전부터 release 까지 움직이므로 틈은 그 바깥(+0.1s)에서만,
 * 발화는 [start,end] 안에서만 잰다. duck_ranges(구간 지시로 일부러 낮춘 곳)·페이드 구간은 둘 다 뺀다.
 */
export const measurementWindows = ({ speech, bgm, totalSec, minPiece = 0.4 }) => {
  const fadeIn = bgm.fade_in_sec ?? 0, fadeOut = bgm.fade_out_sec ?? 0;
  const live = [[fadeIn, Math.max(fadeIn, totalSec - fadeOut)]];
  const ranges = (bgm.duck_ranges ?? []).map((r) => [r.from - (r.attack_sec ?? 0.5), r.to + (r.release_sec ?? 1)]);
  const attack = bgm.duck_attack_sec ?? 0.25, release = bgm.duck_release_sec ?? 0.6;
  const speechWide = speech.map(([a, b]) => [a - attack - 0.1, b + release + 0.1]);
  const keep = (list) => list.filter(([a, b]) => b - a >= minPiece);
  return {
    speech: keep(subtract(clip(speech, live[0][0], live[0][1]), ranges)),
    gaps: keep(subtract(subtract(live, speechWide), ranges)),
  };
};

const within = (value, range, tol) => value >= range.min - tol && value <= range.max + tol;

/** 실측 → 판정. 측정 못 한 항목은 "unmeasured" 로 남기고 통과로 치지 않는다(틈이 없거나 SFX 가 없는 것만 n/a). */
export const evaluateMix = ({ contract, measured }) => {
  const t = contract.targets, tol = contract.tolerance_lu ?? 0, checks = [];
  const add = (id, value, range, ok) => checks.push({ id, value: round(value), range: plain(range), status: value === null || value === undefined ? "unmeasured" : ok ? "pass" : "fail" });
  const plain = (r) => (r ? { min: r.min, ...(r.max === undefined ? {} : { max: r.max }) } : r);
  const narr = measured.narration_speech_lufs ?? null;
  const gapOf = (v) => (v !== null && v !== undefined && narr !== null ? v - narr : null);
  const speechGap = gapOf(measured.bgm_speech_lufs);
  add("bgm_vs_narration_during_speech_lu", speechGap, t.bgm_vs_narration_during_speech_lu, speechGap !== null && within(speechGap, t.bgm_vs_narration_during_speech_lu, tol));
  if ((measured.gap_seconds ?? 0) >= contract.min_gap_seconds) {
    const g = gapOf(measured.bgm_gap_lufs);
    add("bgm_vs_narration_in_gaps_lu", g, t.bgm_vs_narration_in_gaps_lu, g !== null && within(g, t.bgm_vs_narration_in_gaps_lu, tol));
    const over = g !== null && speechGap !== null ? g - speechGap : null;
    add("gap_over_speech_lu", over, { min: t.gap_over_speech_min_lu }, over !== null && over >= t.gap_over_speech_min_lu - tol);
  } else checks.push({ id: "bgm_vs_narration_in_gaps_lu", value: null, range: plain(t.bgm_vs_narration_in_gaps_lu), status: "n/a", note: `말 없는 구간 ${round(measured.gap_seconds ?? 0)}s < ${contract.min_gap_seconds}s` });
  const sfx = measured.sfx ?? [];
  for (const cue of sfx) {
    const d = cue.peak_dbfs !== null && cue.peak_dbfs !== undefined && measured.narration_peak_dbfs != null ? cue.peak_dbfs - measured.narration_peak_dbfs : null;
    add(`sfx_peak_vs_narration_peak_db:${cue.id}`, d, t.sfx_peak_vs_narration_peak_db, d !== null && within(d, t.sfx_peak_vs_narration_peak_db, tol));
  }
  if (!sfx.length) checks.push({ id: "sfx_peak_vs_narration_peak_db", value: null, range: plain(t.sfx_peak_vs_narration_peak_db), status: "n/a", note: "SFX 없음" });
  const fail = checks.some((c) => c.status === "fail"), unmeasured = checks.some((c) => c.status === "unmeasured");
  return { status: fail ? "out-of-range" : unmeasured ? "unmeasured" : "pass", checks };
};

/** stem wav 3개 → measured. cues = [{id, at_sec}], speech = [[s,e]…](초). */
export const measureStems = ({ stems, speech, bgm, totalSec, cues, contract, measure = measureAudio }) => {
  const w = measurementWindows({ speech, bgm, totalSec });
  const speechSec = totalSeconds(w.speech), gapSec = totalSeconds(w.gaps);
  const narr = speechSec >= (contract.min_speech_seconds ?? 0) ? measure(stems.narration, { windows: w.speech }) : null;
  const narrAll = measure(stems.narration);
  const bgmSpeech = narr ? measure(stems.bgm, { windows: w.speech }) : null;
  const bgmGap = gapSec >= contract.min_gap_seconds ? measure(stems.bgm, { windows: w.gaps }) : null;
  const sfx = cues.map((cue) => {
    const m = measure(stems.sfx, { windows: [[cue.at_sec, cue.at_sec + (cue.window_sec ?? 3)]] });
    return { id: cue.id, at_sec: round(cue.at_sec), peak_dbfs: round(m.sample_peak_dbfs) };
  });
  return {
    narration_speech_lufs: round(narr?.integrated_lufs ?? null), narration_integrated_lufs: round(narrAll.integrated_lufs),
    narration_peak_dbfs: round(narrAll.sample_peak_dbfs), narration_true_peak_dbtp: round(narrAll.true_peak_dbtp),
    bgm_speech_lufs: round(bgmSpeech?.integrated_lufs ?? null), bgm_gap_lufs: round(bgmGap?.integrated_lufs ?? null),
    speech_seconds: round(speechSec), gap_seconds: round(gapSec),
    windows: { speech: w.speech.map((x) => x.map((v) => round(v, 3))), gaps: w.gaps.map((x) => x.map((v) => round(v, 3))) }, sfx,
  };
};

/**
 * 정적(렌더 전) 예측. audio.json·원본 측정만으로 말하는 동안/틈의 BGM - 내레이션 격차를 계산한다. 렌더·청취를 대체하지 않는다.
 * normalized=false 면 gain_db 를 원본 기준 상대값(옛 해석)으로 읽는다 — 옛 편에 새 가드를 읽기 전용으로 대 보는 용도.
 */
export const predictStatic = ({ audio, contract, bgmSource, sfxSources, normalized }) => {
  const master = audio.master_gain_db ?? 0;
  const narrLufs = contract.narration.target_lufs + (audio.narration?.gain_db ?? 0) + master;
  const gap = (normalized ? contract.reference.bgm_lufs : bgmSource.integrated_lufs) + audio.bgm.gain_db + master;
  const sfx = [...(audio.sfx ?? [])].filter((s) => s.file).map((s) => {
    const base = normalized ? contract.reference.sfx_peak_dbfs : sfxSources[s.file]?.sample_peak_dbfs ?? null;
    return { id: s.id, peak_dbfs: base === null ? null : base + s.gain_db + master };
  });
  return evaluateMix({ contract, measured: {
    narration_speech_lufs: narrLufs, narration_peak_dbfs: contract.narration.true_peak_dbtp + master,
    bgm_speech_lufs: gap + audio.bgm.duck_db, bgm_gap_lufs: gap, gap_seconds: contract.min_gap_seconds, sfx } });
};

/**
 * 완료·확정 가드. 계약이 없는 옛 편은 legacy(막지 않음), 계약이 있으면 현재 렌더 sha256 과 일치하는 통과 보고서가 있어야 한다.
 * listening 은 항상 별도 필드다 — 측정 통과를 청취 통과로 쓰지 않는다.
 */
export const loudnessGate = ({ repo, id, renderSha256 }) => {
  const audioFile = join(repo, "news", id, "02_production", "audio.json");
  const audio = existsSync(audioFile) ? JSON.parse(readFileSync(audioFile, "utf8")) : null;
  const contractName = audio?.loudness_contract ?? null;
  if (!contractName) return { status: "legacy", blocking: false, contract: null, blockers: [], listening: "청취 미확인", note: "loudness_contract 없음 — 옛 해석(원본 기준 gain)·측정 가드 미적용" };
  const blockers = [], add = (code, detail) => blockers.push({ code, detail });
  try { loadContract(contractName, repo); } catch (e) { add("audio-loudness-contract", e.message); }
  if (audio.master_mix) add("audio-loudness-master-mix", "master_mix 편은 stem 을 나눌 수 없어 측정할 수 없다");
  const reportFile = join(repo, REPORT_REL(id));
  let report = null;
  if (existsSync(reportFile)) { try { report = JSON.parse(readFileSync(reportFile, "utf8")); } catch { add("audio-loudness-report-broken", REPORT_REL(id)); } }
  if (!report) add("audio-loudness-unmeasured", `렌더 후 stem 측정 기록이 없다 — npm run audio:loudness -- measure ${id}`);
  else {
    if (report.render_sha256 !== renderSha256) add("audio-loudness-stale", "측정한 렌더와 현재 렌더가 다르다 — 다시 측정한다");
    if (report.contract !== contractName) add("audio-loudness-contract", `보고서 계약 ${report.contract} ≠ ${contractName}`);
    if (report.verdict?.status === "out-of-range") add("audio-loudness-out-of-range", report.verdict.checks.filter((c) => c.status === "fail").map((c) => `${c.id}=${c.value}`).join(", "));
    else if (report.verdict?.status !== "pass") add("audio-loudness-unmeasured", report.verdict?.checks?.filter((c) => c.status === "unmeasured").map((c) => c.id).join(", ") || "측정값 null");
  }
  return { status: blockers.length ? "blocked" : "pass", blocking: blockers.length > 0, contract: contractName, blockers, report: report ? REPORT_REL(id) : null, verdict: report?.verdict?.status ?? null, listening: "청취 미확인", note: "측정 통과는 청취 통과가 아니다 — 청취는 review_audio 보고서의 listened_ranges 가 따로 증명한다" };
};
