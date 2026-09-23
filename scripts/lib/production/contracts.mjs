import {selectedSceneInputs} from './scene-inputs.mjs';
import { sourceInputs } from '../source-inputs.mjs';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { assertPilotId, REPO } from "../pilot.mjs";
import { audioSourceCandidates, editorialSources, jsonSources, syncStatus } from "../sync.mjs";
import { normalizeNarration, validateEditorialBundle } from "../editorial.mjs";

export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const json = (file) => JSON.parse(readFileSync(file, "utf8"));
export const ACTIONS = ["scene_proof", "narration", "timeline", "sync", "proof", "render", "review_visual", "review_audio", "review_facts"];

export const repositoryPath = (repo, rel) => {
  if (typeof rel !== "string" || !rel || rel.startsWith("/") || rel.split(/[\\/]/).includes("..") || rel.includes("\\")) throw new Error("저장소 상대 경로가 필요하다: " + rel);
  const file = resolve(repo, rel);
  let ancestor = file;
  while (!existsSync(ancestor)) {
    const parent = resolve(ancestor, "..");
    if (parent === ancestor) break;
    ancestor = parent;
  }
  const real = realpathSync(ancestor);
  if (real !== repo && !real.startsWith(repo + sep)) throw new Error("저장소 밖을 가리킨다: " + rel);
  return file;
};

// 현재 통합 저장소만 사용한다. 오래된 외부 input root 추정 규칙을 새 상태에 물려받지 않는다.
export const workspace = (id, repo = REPO) => {
  assertPilotId(id);
  repo = realpathSync(repo);
  const root = join(repo, "news", id);
  const production = join(root, "02_production");
  const path = (rel) => repositoryPath(repo, rel);
  path("news/" + id);
  const requestFile = join(root, "00_brief/request.json");
  const request = existsSync(requestFile) ? json(requestFile) : null;
  if (request && (request.schema_version !== "1.0" || request.pilot !== id || request.mode !== "editorial-concept")) throw new Error("시작 요청 계약이 다른 편/모드를 가리킨다");
  const storyFile = join(production, "story.json");
  if (!existsSync(storyFile) && !request) throw new Error("editorial-concept 편이 필요하다: " + id);
  if (existsSync(storyFile) && json(storyFile).mode !== "editorial-concept") throw new Error("editorial-concept 모드가 아니다: " + id);
  const rel = (file) => relative(repo, file).split(sep).join("/");
  return { id, repo, root, production, path, rel, request, runFile: join(production, "run.json") };
};

const walk = (path) => !existsSync(path) ? [] : statSync(path).isDirectory()
  ? readdirSync(path).sort().flatMap((name) => walk(join(path, name)))
  : [path];

export const recipe = (w, action) => {
  if (!ACTIONS.includes(action)) throw new Error("알 수 없는 작업: " + action);
  const p = (name) => join(w.production, name);
  const n = existsSync(p("narration.json")) ? json(p("narration.json")) : {};
  const v = existsSync(p("visual-system.json")) ? json(p("visual-system.json")) : {};
  const a = existsSync(p("audio.json")) ? json(p("audio.json")) : {};
  const m = existsSync(p("motion.json")) ? json(p("motion.json")) : {};
  const inEpisode = (value) => w.path("news/" + w.id + "/" + value);
  const narrationText = inEpisode(n.source?.narration_txt ?? "02_production/narration.txt");
  const wav = inEpisode(n.audio?.path ?? "02_production/audio/narration.wav");
  const data = join(w.repo, "pilots", w.id);
  const pub = join(w.repo, "public", "pilots", w.id);
  const snapshots = { "assets.json": jsonSources(w.root)["assets.json"], "audio.json": p("audio.json"), ...editorialSources(w.root) };
  const audioFiles = [a.bgm?.file, ...(a.sfx ?? []).map((x) => x.file), ...(!a.master_mix ? (m.audio_cues ?? []).map((x) => x.asset) : [])].filter(Boolean);
  const audioSources = audioFiles.map((file) => audioSourceCandidates(w.root, file).find(existsSync) ?? audioSourceCandidates(w.root, file)[0]);
  const media = v.media?.assets ?? [];
  const assetFile = join(w.root, "01_input/assets.json");
  const assets = existsSync(assetFile) ? json(assetFile).assets ?? [] : [];
  const collected = assets.filter((x) => x.path).map((x) => inEpisode(x.path));
  const commonCode = [
    ...sourceInputs(w.repo, ["src/index.ts", "src/editorial/episodes/" + w.id + ".tsx", "src/editorial/episodes/" + w.id + "/index.tsx"]),
    ...(!existsSync(join(w.repo, "src/index.ts")) ? walk(join(w.repo, "src")) : []),
    ...walk(join(w.repo, "public/fonts")),
  ];
  const renderInputs = [...(w.request ? [join(w.root, "00_brief/request.json")] : []), ...commonCode, ...["package-lock.json", "remotion.config.ts", "scripts/pilot-run.mjs"].map((file) => join(w.repo, file)), join(data, "pilot.json")];
  const generationFiles = (Array.isArray(v.generation_jobs) ? v.generation_jobs : []).flatMap(j => [j.prompt_path, j.output].filter(Boolean).flatMap(path => {try { return [inEpisode(path)]; } catch { return []; }})); // Invalid paths are exposed by visual-plan; do not make resume unusable.
  const sceneConfig = p('scene-proof.json');
  const selectedScene = selectedSceneInputs(w);
  const spec = {
    scene_proof: { deps: [], semantic: selectedScene?.semantic ?? null, inputs: selectedScene?.inputs ?? [...["facts.md", "concepts.json", "narration.txt", "visual-system.json"].map(p), ...commonCode, sceneConfig, ...generationFiles, ...media.map(x => inEpisode(x.source))], required: [p("concepts.json"), p("narration.txt"), p("visual-system.json")], outputs: [] },
    narration: {
      deps: [],
      inputs: [narrationText, ...(n.source?.script ? [inEpisode(n.source.script)] : walk(p("narration_drafts"))),
        ...["substitutions.json", "voice.json"].map(p),
        ...walk(p("scripts"))],
      required: [narrationText],
      outputs: [p("narration.json"), wav],
    },
    timeline: {
      deps: ["narration"],
      inputs: ["story.json", "concepts.json", "motion.json", "visual-system.json"].map(p).concat(
        ["config/production-profile.json", "scripts/lib/editorial.mjs", "scripts/lib/screen-text-policy.mjs", "scripts/lib/visual-plan.mjs", "scripts/lib/production-profile.mjs", "scripts/compile-editorial-timeline.mjs"].map((x) => join(w.repo, x)), walk(join(w.repo, "config/production-profiles"))),
      required: ["story.json", "concepts.json", "motion.json", "visual-system.json"].map(p),
      outputs: [p("timeline.json")],
    },
    sync: {
      deps: ["timeline"],
      inputs: [...Object.values(snapshots), wav, ...audioSources, ...media.map((x) => inEpisode(x.source)), ...collected,
        ...["scripts/sync-pilot.mjs", "scripts/lib/sync.mjs", "scripts/lib/pilot.mjs", "scripts/lib/engine.mjs"].map((x) => join(w.repo, x))],
      required: [...Object.values(snapshots), wav, ...audioSources, ...media.map((x) => inEpisode(x.source)), ...collected],
      outputs: [...Object.keys(snapshots).map((name) => join(data, name)),
        join(pub, a.narration?.file ?? "audio/narration.wav"),
        ...audioFiles.map((file) => join(pub, file)),
        ...media.map((x) => join(pub, x.file)),
        ...assets.filter((x) => x.path).map((x) => join(pub, x.id + x.path.slice(x.path.lastIndexOf("."))))],
    },
    proof: { deps: ["sync"], inputs: renderInputs, required: [], outputs: [] },
    render: { deps: ["sync"], inputs: renderInputs, required: [], outputs: [] },
    review_visual: { deps: ["render"], inputs: [p("facts.md"), p("concepts.json")], required: [], outputs: [] },
    review_audio: { deps: ["render"], inputs: [], required: [], outputs: [] },
    review_facts: { deps: ["render"], inputs: [p("facts.md"), p("story.json"), p("concepts.json"), assetFile], required: [p("facts.md")], outputs: [] },
  }[action];
  return Object.fromEntries(Object.entries(spec).map(([key, values]) =>
    [key, ["deps", "semantic"].includes(key) ? values : [...new Set(values.map(w.rel))].sort()]));
};

export const fileSnapshot = (w, files, cache = new Map()) => Object.fromEntries(files.map((file) => {
  if (!cache.has(file)) {
    const path = w.path(file);
    cache.set(file, existsSync(path) && statSync(path).isFile() ? hash(readFileSync(path)) : null);
  }
  return [file, cache.get(file)];
}));
export const changedFiles = (old, current) => [...new Set([...Object.keys(old), ...Object.keys(current)])].filter((file) => old[file] !== current[file]);

export const validateOutput = (w, action) => {
  if (action === "narration") {
    const n = json(join(w.production, "narration.json"));
    if (n.pilot !== w.id) throw new Error("내레이션 편 id가 현재 작업과 다르다");
    const source = n.source?.narration_txt;
    if (!source) throw new Error("narration.source.narration_txt가 없다");
    const text = readFileSync(w.path("news/" + w.id + "/" + source), "utf8");
    if (n.source.narration_sha256 !== hash(Buffer.from(text))) throw new Error("원고와 내레이션 source 해시가 다르다");
    const spoken = text.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.trim());
    const lines = normalizeNarration(n);
    const compact = (value) => value.replace(/\s+/g, "");
    if (!lines.length || lines.length !== spoken.length || lines.some((line, i) => compact(line.words.map((x) => x.text).join(" ")) !== compact(spoken[i]))) throw new Error("원고와 실제 정렬 토큰이 다르다");
    if (!Number.isFinite(n.audio?.duration) || n.audio.duration <= 0) throw new Error("음성 길이가 유효하지 않다");
    const audioPath = w.path("news/" + w.id + "/" + n.audio.path);
    const measured = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", audioPath], { encoding: "utf8" }));
    if (!measured.streams?.some((s) => s.codec_type === "audio") || Math.abs(Number(measured.format?.duration) - n.audio.duration) > 0.15) throw new Error("실제 음성 파일과 기록된 길이가 다르다");
    for (const line of lines) for (const word of line.words) {
      if (!Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.end <= word.start || word.end > n.audio.duration + 0.1) throw new Error("어절 시각이 음성 범위를 벗어났다");
    }
    return "원고 해시·정렬 토큰·실제 음성 길이·기록된 시간 범위 확인. 실제 청취 판정 아님";
  }
  if (action === "timeline" || action === "sync") {
    const checked = validateEditorialBundle(w.root);
    if (checked.errors.length) throw new Error(checked.errors.map((e) => "[" + e.code + "] " + e.message).join("\n"));
    const actual = json(join(w.production, "timeline.json"));
    if (JSON.stringify(actual) !== JSON.stringify(checked.timeline)) throw new Error("timeline이 현재 정본과 다르다");
    if (action === "sync") {
      const status = syncStatus(w.id, w.root, join(w.repo, "pilots", w.id));
      if (!status.ok) throw new Error("sync가 낡았다: " + [...status.stale, ...status.missing].join(", "));
    }
    return "기존 editorial 컴파일·sync 계약 대조";
  }
  return "입력 버전·파일 해시 기록. 내용·품질·통과 판정 아님";
};
