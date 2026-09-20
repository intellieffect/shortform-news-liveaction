#!/usr/bin/env node
// 파일럿 데이터(beats/overlays/shots/assets/audio JSON + 미디어)를 Remotion 이 읽는 편 폴더로 복사한다.
//   <root>/02_production/{beats,overlays,shots,audio}.json, <root>/01_input/assets.json → pilots/<id>/   (표 = lib/sync.mjs, 낡음 검사와 공유)
//   render.config.json 은 복사하지 않는다 — pilots/<id>/ 소유. 없을 때만 4-0 기본값을 만든다(2026-09-02, 6편에서 편집을 5번 덮어썼다).
//   assets.json 의 로컬 이미지·내레이션·BGM/SFX·오버레이 PNG → public/pilots/<id>/ (캐시 — 지워도 sync 로 복원)
//   편 id = <root> 폴더명. active.json 에 없으면 추가하고 pilots/index.ts 를 다시 생성. pilot.json 이 없으면 뼈대 생성.
//   JSON 의 미디어 경로는 편 상대경로로 저장한다(옛 "pilot/…" 접두 제거). 01_input(원문)은 건드리지 않는다 —
//   02_production 에는 audio.json 이 없을 때 기본값 하나만 만든다(소리층 소스는 input 쪽 소유라 거기 둔다).
//
// 사용: node scripts/sync-pilot.mjs <root>

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, join, extname, relative, dirname } from "node:path";
import { REPO, dirs, pilotIdFromRoot, relFile, addActive } from "./lib/pilot.mjs";
import { editorialSources, jsonSources, normalizeJson, audioSourceCandidates } from "./lib/sync.mjs";
import { engineMismatch, sourceEngine, EDITORIAL_ENGINE } from "./lib/engine.mjs";

const root = process.argv[2] && resolve(process.argv[2]);
if (!root) {
  console.error("usage: sync-pilot.mjs <pilot root>");
  process.exit(2);
}
const id = pilotIdFromRoot(root);
const { data: dataDir, pub: pubDir } = dirs(id);
mkdirSync(dataDir, { recursive: true });
mkdirSync(pubDir, { recursive: true });
const writeJson = (name, obj) => writeFileSync(join(dataDir, name), normalizeJson(obj));
const copyJson = (name, src) => writeJson(name, JSON.parse(readFileSync(src, "utf8")));

const engine = sourceEngine(root);
const isEditorial = engine === EDITORIAL_ENGINE;
const mismatch = engineMismatch(root, dataDir);
if (mismatch) {
  console.error(`engine 불일치: news/${id}=${mismatch.source}, pilots/${id}/pilot.json=${mismatch.manifest}`);
  process.exit(1);
}
const { "audio.json": audioCfg, ...baseFiles } = jsonSources(root);   // audio 는 아래서 기본값 생성 후 복사
const files = isEditorial
  ? { "assets.json": baseFiles["assets.json"], ...editorialSources(root) }
  : baseFiles;
const copied = [];
for (const [name, src] of Object.entries(files)) {
  if (existsSync(src)) {
    copyJson(name, src);
    copied.push(name);
  } else if (name === "shots.json") {
    // shots 미생성 시 빈 파일로 두어 import 가 깨지지 않게 한다
    writeJson(name, { schema_version: "0", shots: [] });
    copied.push(`${name} (empty)`);
  } else {
    console.error(`missing: ${src}`);
    process.exit(1);
  }
}
const sourceAudioConfig = existsSync(audioCfg) ? JSON.parse(readFileSync(audioCfg, "utf8")) : null;
if (!isEditorial) {
  const beatsPilot = JSON.parse(readFileSync(files["beats.json"], "utf8")).pilot;
  if (beatsPilot && beatsPilot !== id) console.warn(`경고: beats.json pilot="${beatsPilot}" ≠ 폴더명 "${id}" — 편 id 는 폴더명을 쓴다`);
}

// 내레이션 오디오 → public/pilots/<id>/audio/ (narration.json 의 audio.path 기준)
const narrationJson = join(root, "02_production", "narration.json");
if (existsSync(narrationJson)) {
  const n = JSON.parse(readFileSync(narrationJson, "utf8"));
  const src = join(root, n.audio.path);
  if (existsSync(src)) {
    mkdirSync(join(pubDir, "audio"), { recursive: true });
    if (isEditorial && sourceAudioConfig?.master_mix) {
      const name = sourceAudioConfig.narration?.file?.split("/").pop() ?? "editorial-master.wav";
      copyFileSync(src, join(pubDir, "audio", name));
      copied.push(`audio/${name} (editorial master mix)`);
    } else {
      copyFileSync(src, join(pubDir, "audio", "narration_raw.wav"));
      // 4-5: 내레이션 라우드니스 정규화 (−16 LUFS, TP −1.5). 길이·타이밍 불변(loudnorm linear)
      try {
        execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:linear=true", "-ar", "44100", join(pubDir, "audio", "narration.wav")], { stdio: "inherit" });
        copied.push("audio/narration.wav (loudnorm -16 LUFS)");
      } catch {
        copyFileSync(src, join(pubDir, "audio", "narration.wav"));
        copied.push("audio/narration.wav (raw, ffmpeg 실패)");
      }
    }
  }
}

// 렌더 층 토글 — pilots/<id>/ 소유. 없으면 4-0(정지 조립) 기본값 생성, 있으면 손대지 않는다.
const renderCfg = join(dataDir, "render.config.json");
if (existsSync(join(root, "02_production", "render.config.json")))
  console.warn(`경고: ${relative(REPO, join(root, "02_production", "render.config.json"))} 은 읽지 않는다 — render.config 는 pilots/${id}/ 가 소유한다. 지워도 된다`);
if (!isEditorial && !existsSync(renderCfg)) {
  writeFileSync(
    renderCfg,
    JSON.stringify(
      {
        _comment: "영상 조립 층 토글. 4-0 정지 조립부터 한 층씩 켠다. 켜는 순서: motion → text_anim → graphics → transitions → sound",
        layers: { motion: false, text_anim: false, graphics: false, transitions: false, sound: false },
        narration_gain_db: 0,
      },
      null,
      2,
    ) + "\n",
  );
  copied.push("render.config.json (기본값 생성)");
}

// 소리층 audio.json — 없으면 내레이션만 있는 기본값 생성 (docs/specs/audio.schema.md). 경로는 편 상대(audio/…)
if (!existsSync(audioCfg)) {
  writeFileSync(
    audioCfg,
    JSON.stringify(
      {
        schema_version: "1.0",
        master_mix: false,
        _comment: "소리층. bgm.file/sfx[].file 이 null 이면 그 트랙은 건너뛴다. 경로는 편 상대(audio/<name>). dB 값은 렌더에서 선형으로 변환.",
        narration: { file: "audio/narration.wav", normalized: { target_lufs: -16, true_peak: -1.5 }, gain_db: 0 },
        bgm: { asset: null, file: null, gain_db: -22, duck_db: -12, duck_attack_sec: 0.25, duck_release_sec: 0.6, fade_in_sec: 1.0, fade_out_sec: 2.0, start_offset_sec: 0, loop: true, credit: null },
        sfx: [],
        master_gain_db: 0,
        measured: { integrated_lufs: null, true_peak_dbtp: null, measured_at: null },
      },
      null,
      2,
    ) + "\n",
  );
}
copyJson("audio.json", audioCfg);
copied.push("audio.json");
// 오디오 자산(BGM·SFX) → public/pilots/<id>/audio/ : file 이 audio/<name>(옛 pilot/audio/<name>) 이면 <root>/02_production/external_assets/…/audio/ 에서 basename 탐색
const A = JSON.parse(readFileSync(audioCfg, "utf8"));
const motionCues = isEditorial && !sourceAudioConfig?.master_mix
  ? (JSON.parse(readFileSync(files["motion.json"], "utf8")).audio_cues ?? []).map((cue) => cue.asset)
  : [];
const audioFiles = [A.bgm?.file, ...(A.sfx ?? []).map((x) => x.file), ...motionCues].filter(Boolean).map(relFile);
for (const f of audioFiles) {
  const name = f.split("/").pop();
  // external_assets/audio/{derived,bgm,sfx}/ 순으로 basename 탐색 (derived = 트림·페이드 파생물)
  // 파일럿별 새 소싱 폴더(external_assets/<sub>/audio/…)도 같은 순서로 탐색 — 대본 준수판은 script_v1/ 아래에만 새 파일을 둔다
  const cand = audioSourceCandidates(root, f);
  const src = cand.find((c) => existsSync(c));
  if (src) {
    mkdirSync(join(pubDir, "audio"), { recursive: true });
    copyFileSync(src, join(pubDir, "audio", name));
  } else console.error(`audio asset missing: ${name}`);
}

if (isEditorial) {
  const visual = JSON.parse(readFileSync(files["visual-system.json"], "utf8"));
  for (const media of visual.media?.assets ?? []) {
    const src = join(root, media.source);
    const dest = join(pubDir, media.file);
    if (!existsSync(src)) {
      console.error(`editorial media missing: ${media.source}`);
      process.exit(1);
    }
    mkdirSync(dirname(dest), { recursive: true });
    if (media.trim) {
      execFileSync("ffmpeg", [
        "-v", "error", "-y", "-i", src,
        "-ss", String(media.trim.from_sec), "-t", String(media.trim.duration_sec),
        "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dest,
      ], { stdio: "inherit" });
      copied.push(`${media.file} (editorial trim)`);
    } else {
      copyFileSync(src, dest);
      copied.push(media.file);
    }
  }
}

const assets = JSON.parse(readFileSync(files["assets.json"], "utf8")).assets;
const imgs = [];
for (const a of assets) {
  if (!a.path) continue;
  const src = join(root, a.path);
  if (!existsSync(src)) {
    console.error(`asset missing: ${src}`);
    continue;
  }
  const dest = join(pubDir, `${a.id}${extname(a.path)}`);
  copyFileSync(src, dest);
  imgs.push(`${a.id}${extname(a.path)}`);
}
// 오버레이 자산(컷아웃·증거 PNG) → public/pilots/<id>/overlay/ (파생 없이 그대로; 알파 PNG)
const overlayMap = {
  "moon_alpha.png": "02_production/external_assets/overlay/cutouts/moon_full_alpha.png",
  "earth_alpha.png": "02_production/external_assets/overlay/cutouts/earth_bluemarble_alpha.png",
  "bennu_alpha.png": "02_production/external_assets/overlay/cutouts/bennu_alpha.png",
  "evidence_arxiv_p1.png": "02_production/external_assets/overlay/evidence/arXiv_2604.09427_Hainaut_ESO_constellations.pdf.png",
};
mkdirSync(join(pubDir, "overlay"), { recursive: true });
for (const [name, rel] of Object.entries(overlayMap)) {
  const src = join(root, rel);
  if (existsSync(src)) copyFileSync(src, join(pubDir, "overlay", name));
}

// 편 매니페스트 뼈대 (있으면 손대지 않는다 — 상태·버전·게이트는 사람이 적는다)
const manifest = join(dataDir, "pilot.json");
if (!existsSync(manifest)) {
  const today = new Date().toISOString().slice(0, 10);
  const inputCommit = (() => { try { return execFileSync("git", ["-C", root, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { return null; } })();
  const engineCommit = (() => { try { return execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { return null; } })();
  writeFileSync(
    manifest,
    JSON.stringify(
      {
        _comment: "편 매니페스트 — 대장(docs/PILOTS.md)·index.json 은 이 파일들에서 생성한다. id = news/<id> 폴더명. 순서는 started 로 파생, 폴더명에 번호 없음.",
        id,
        title: null,
        client: id.split("_")[0],
        article: { id: null, url: null, author: null, date: null },
        parent: null,
        status: "drafting",
        started: today,
        delivered: null,
        input: { path: relative(REPO, root), commit: inputCommit },   // 통합 후 같은 저장소 — 저장소 상대 경로(news/<id>) + 착수 시점 커밋
        engine,
        engine_commit: engineCommit,
        versions: [],
        gates_open: [],
        docs: null,
        linear: null,
      },
      null,
      2,
    ) + "\n",
  );
  copied.push("pilot.json (뼈대 — title·article·linear 채울 것)");
}

// 활성 편 등록 + index.ts 재생성
const added = addActive(id);
execFileSync(process.execPath, [join(REPO, "scripts", "pilots-index.mjs")], { stdio: "inherit" });
console.log(`pilots/${id}/: ${copied.join(", ")}${added ? " · active.json 에 추가" : ""}`);
console.log(`public/pilots/${id}/: ${imgs.join(", ") || "(none)"}`);
