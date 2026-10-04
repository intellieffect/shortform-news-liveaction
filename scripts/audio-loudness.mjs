#!/usr/bin/env node
/**
 * 소리 라우드니스 측정·가드 — BGM·SFX 가 내레이션 아래에서 정말 들리는 크기인지 숫자로 잰다.
 *
 *   npm run audio:loudness -- static  <id> [--repo <경로>]   렌더 전 예측(읽기 전용). audio.json + 원본 측정만 쓴다. 범위 밖이면 exit 1.
 *   npm run audio:loudness -- measure <id>                    현재 렌더 기준 내레이션·BGM·SFX stem 을 따로 렌더해 실측하고
 *                                                             news/<id>/02_production/reviews/audio-loudness.json 에 기록한다. 범위 밖/미측정이면 exit 1.
 *   npm run audio:loudness -- gate    <id> [--repo <경로>]   produce complete/deliver 가 보는 판정만 출력한다(읽기 전용).
 *
 * 계약: audio.json 의 loudness_contract (config/audio-loudness.json). 계약이 없는 옛 편은 gate 가 legacy 로 통과시키고
 * measure 는 거절한다. static 은 옛 편에도 쓸 수 있다 — 그때는 gain_db 를 옛 해석(원본 기준 상대값)으로 읽는다.
 * 측정 통과는 청취 통과가 아니다. 보고서의 listening 은 항상 "청취 미확인"이고, 청취는 review_audio 가 따로 증명한다.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { REPO, compId } from "./lib/pilot.mjs";
import { audioSourceCandidates, syncStatus } from "./lib/sync.mjs";
import { REPORT_REL, REPORT_SCHEMA, duration, evaluateMix, loadContract, loudnessGate, measureAudio, measureStems, predictStatic, round } from "./lib/audio-loudness.mjs";

const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

export const narrationSpeech = (narration) => (narration.sentences ?? narration.lines ?? []).map((line) => [Number(line.start), Number(line.end)]);

const staticCheck = (id, repo) => {
  const root = join(repo, "news", id), audioFile = join(root, "02_production", "audio.json");
  if (!existsSync(audioFile)) throw new Error(`audio.json 이 없다: ${audioFile}`);
  const audio = json(audioFile), normalized = Boolean(audio.loudness_contract);
  const contractName = audio.loudness_contract ?? "audio-loudness@1", contract = loadContract(contractName, REPO);
  const find = (file) => {
    const rel = file.replace(/^pilot\//, "");
    return [...audioSourceCandidates(root, rel), join(repo, "public", "pilots", id, rel)].find((p) => existsSync(p)) ?? null;
  };
  const bgmPath = audio.bgm?.file ? find(audio.bgm.file) : null;
  if (!bgmPath) throw new Error("BGM 원본을 찾지 못했다: " + audio.bgm?.file);
  const bgmSource = measureAudio(bgmPath, { from: audio.bgm.start_offset_sec ?? 0 });
  const cueFiles = existsSync(join(root, "02_production", "motion.json")) ? (json(join(root, "02_production", "motion.json")).audio_cues ?? []) : [];
  // audio.json sfx[] 와 motion audio_cues 중 실제 렌더에 쓰이는 것(editorial 은 cues)을 합쳐 본다.
  const sfxList = [...(audio.sfx ?? []).filter((s) => s.file), ...cueFiles.map((c) => ({ id: c.id, file: c.asset, gain_db: c.gain_db }))];
  const seen = new Set(), unique = sfxList.filter((s) => { const k = s.id + "|" + s.file; if (seen.has(k)) return false; seen.add(k); return true; });
  const sfxSources = {};
  for (const s of unique) { const p = find(s.file); if (p) sfxSources[s.file] = measureAudio(p); }
  const narrPath = find(audio.narration?.file ?? "audio/narration.wav");
  const narrationChannels = narrPath ? Number(execFileSync(process.env.FFPROBE_PATH ?? "ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", narrPath], { encoding: "utf8" }).trim()) : 2;
  const verdict = predictStatic({ audio: { ...audio, sfx: unique }, contract, bgmSource, sfxSources, normalized, narrationChannels });
  return { id, contract: contractName, interpretation: normalized ? "normalized(신규)" : "원본 기준 상대값(옛 해석, 계약 없음)", bgm_source: { integrated_lufs: round(bgmSource.integrated_lufs), from_sec: audio.bgm.start_offset_sec ?? 0 }, verdict, note: "렌더 전 예측이다. 렌더 후 stem 실측(measure)과 청취를 대체하지 않는다." };
};

const stemRender = (id, stem, outFile) => {
  mkdirSync(dirname(outFile), { recursive: true });
  const cli = join(REPO, "node_modules", "@remotion", "cli", "remotion-cli.js");
  const rel = relative(REPO, outFile).split(sep).join("/");
  const r = spawnSync(process.execPath, [cli, "render", `ShortformNews-${compId(id)}`, rel, "--codec=wav", `--props=${JSON.stringify({ pilotId: id, stem })}`], { cwd: REPO, stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`stem 렌더 실패(${stem})`);
};

const measure = (id) => {
  const w = join(REPO, "news", id, "02_production");
  const audio = json(join(w, "audio.json"));
  if (!audio.loudness_contract) throw new Error("audio.json 에 loudness_contract 가 없다 — 옛 편은 측정 기록 대상이 아니다. 렌더 전 예측은 static 명령을 쓴다");
  if (audio.master_mix) throw new Error("master_mix 편은 stem 을 나눌 수 없다");
  const contract = loadContract(audio.loudness_contract, REPO);
  const state = json(join(w, "run.json"));
  const artifact = state.receipts?.render?.validation?.artifact;
  if (!artifact?.path) throw new Error("현재 렌더 기록이 없다 — 최종 렌더부터: npm run produce -- run " + id + " render");
  const mp4 = join(REPO, artifact.path);
  if (!existsSync(mp4) || sha(mp4) !== artifact.sha256) throw new Error("렌더 기록과 파일이 다르다: " + artifact.path);
  const sync = syncStatus(id);
  if (!sync.ok) throw new Error(`pilots/${id} 가 낡았다(${[...sync.stale, ...sync.missing].join(", ")}) — npm run sync -- news/${id}`);
  const meta = json(join(REPO, "pilots", id, "pilot.json"));
  if (meta.audio_normalization?.contract !== audio.loudness_contract) throw new Error("pilot.json audio_normalization 이 없다 — npm run sync 를 다시 실행한다");
  const timeline = json(join(REPO, "pilots", id, "timeline.json")), fps = timeline.fps, totalSec = timeline.total_frames / fps;
  const stemDir = join(REPO, "out", "pilots", id, "qa", "audio-stems");
  const stems = {};
  for (const stem of ["narration", "bgm", "sfx"]) {
    stems[stem] = join(stemDir, `${stem}.wav`);
    stemRender(id, stem, stems[stem]);
    const d = duration(stems[stem]);
    if (Math.abs(d - totalSec) > 0.25) throw new Error(`${stem} stem 길이 ${round(d)}s ≠ 영상 ${round(totalSec)}s`);
  }
  const cues = (timeline.audio_cues ?? []).map((c) => ({ id: c.id, at_sec: c.frame / fps }));
  const measured = measureStems({ stems, speech: narrationSpeech(json(join(REPO, "pilots", id, "narration.json"))), bgm: audio.bgm, totalSec, cues, contract });
  const verdict = evaluateMix({ contract, measured });
  const full = measureAudio(mp4);
  const report = {
    schema_version: REPORT_SCHEMA, pilot: id, contract: audio.loudness_contract, measured_at: new Date().toISOString(),
    render: { path: artifact.path }, render_sha256: artifact.sha256,
    gains: { bgm_gain_db: audio.bgm.gain_db, duck_db: audio.bgm.duck_db, master_gain_db: audio.master_gain_db ?? 0, normalization: meta.audio_normalization },
    stems: Object.fromEntries(Object.entries(stems).map(([k, p]) => [k, { path: relative(REPO, p).split(sep).join("/"), sha256: sha(p) }])),
    measured, mix_full: { integrated_lufs: round(full.integrated_lufs), lra_lu: round(full.lra_lu), true_peak_dbtp: round(full.true_peak_dbtp) },
    verdict, listening: "청취 미확인", note: "측정 통과는 청취 통과가 아니다. 청취 확인은 review_audio 보고서(listened_ranges)가 증명한다.",
  };
  const out = join(REPO, REPORT_REL(id));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  return { report: REPORT_REL(id), verdict, measured };
};

const main = () => {
  const [command, id, ...rest] = process.argv.slice(2);
  const repoIndex = rest.indexOf("--repo");
  const repo = repoIndex >= 0 ? rest[repoIndex + 1] : REPO;
  if (!["static", "measure", "gate"].includes(command) || !id) { console.error("usage: audio-loudness.mjs <static|measure|gate> <id> [--repo <경로>]"); process.exit(2); }
  try {
    if (command === "static") {
      const result = staticCheck(id, repo);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.verdict.status === "pass" ? 0 : 1);
    }
    if (command === "measure") {
      const result = measure(id);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.verdict.status === "pass" ? 0 : 1);
    }
    const state = existsSync(join(repo, "news", id, "02_production", "run.json")) ? json(join(repo, "news", id, "02_production", "run.json")) : {};
    const gate = loudnessGate({ repo, id, renderSha256: state.receipts?.render?.validation?.artifact?.sha256 ?? null });
    console.log(JSON.stringify(gate, null, 2));
    process.exit(gate.blocking ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
