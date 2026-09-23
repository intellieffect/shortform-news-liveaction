import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { editorialContract, narrationWordHash, normalizeNarration, validateEditorialBundle } from "../editorial.mjs";
import { readProductionProfile } from "../production-profile.mjs";
import { hash, json, recipe, validateOutput, workspace } from "./contracts.mjs";
import { productionStatus } from "./state.mjs";

const stages = ["narration", "alignment", "timeline", "sync"];

// Read-only, generated from the real profile/validator/templates. Never copies
// a prior episode's creative choices or records a review as passed.
export const productionSpecification = (id, { repo } = {}) => {
  const w = workspace(id, repo);
  const visualPath = join(w.production, "visual-system.json");
  const reference = existsSync(visualPath) ? json(visualPath).production_profile : null;
  const profile = readProductionProfile(reference, w.repo);
  if (reference && (reference.id !== profile.id || reference.version !== profile.version)) throw new Error("요청한 production profile 버전이 없다");
  const templates = ["story", "concepts", "motion", "audio", "visual-system"].map(name => `plugin/skills/shortform-news-pipeline/templates/${name}.json`).filter(path => existsSync(w.path(path)));
  const narrationPath = join(w.production, "narration.json");
  let timing = null;
  if (existsSync(narrationPath)) {
    const narration = json(narrationPath), lines = normalizeNarration(narration);
    timing = {
      narration_word_sha256: narrationWordHash(lines),
      audio_duration: narration.audio?.duration ?? null,
      minimum_frames: Number.isFinite(narration.audio?.duration) ? Math.ceil(narration.audio.duration * profile.canvas.fps) : null,
      anchors: lines.map(line => ({ line: line.id, words: line.words.map((word, token_index) => ({ token_index, ...word })) })),
    };
  }
  return {
    pilot: id, profile, vocabulary: editorialContract(), templates,
    schema: "docs/specs/editorial-concept.schema.md", timing,
    note: "현재 규격·앵커 조회. 예시의 장면·원고를 복사하지 않는다. 해시 조회는 음성 정렬이나 검수 통과를 증명하지 않는다.",
  };
};

export const productionPreflight = (id, stage, { repo } = {}) => {
  if (!stages.includes(stage)) throw new Error(`preflight 단계: ${stages.join("|")}`);
  const w = workspace(id, repo);
  const errors = [], warnings = [], inputs = [];
  const checkFile = (path, { parse = false, nonempty = true, metadataOnly = false } = {}) => {
    try {
      const file = w.path(path);
      if (!existsSync(file) || !statSync(file).isFile()) throw new Error("필수 파일이 없다");
      if (metadataOnly) {
        const size = statSync(file).size;
        if (nonempty && size === 0) throw new Error("파일이 비어 있다");
        inputs.push({ path, size });
        return null;
      }
      const bytes = readFileSync(file);
      if (nonempty && !bytes.toString("utf8").trim()) throw new Error("파일이 비어 있다");
      const value = parse ? JSON.parse(bytes) : null;
      inputs.push({ path, sha256: hash(bytes) });
      return value;
    } catch (error) { errors.push({ path, message: error.message }); return null; }
  };
  const p = (name) => w.rel(join(w.production, name));
  if (stage === "narration") {
    checkFile(p("narration.txt"));
    const voice = checkFile(p("voice.json"), { parse: true });
    if (!voice || typeof voice !== "object" || Array.isArray(voice) || !Object.keys(voice).length) errors.push({ path: p("voice.json"), message: "선택한 음성 제공자·보이스 설정을 비어 있지 않은 객체로 기록한다" });
    if (existsSync(join(w.production, "substitutions.json"))) checkFile(p("substitutions.json"), { parse: true });
    try {
      const status = productionStatus(id, { repo: w.repo });
      if (!status.actions.narration.runnable) errors.push({ path: "narration", message: "진행 토큰·입력·이 편의 음성 착수 조건을 확인한다", details: status.actions.narration });
    } catch (error) { errors.push({ path: "production-state", message: error.message }); }
    warnings.push("begin 후 voice·원고·치환표를 변경하면 finish에서 입력 변경으로 거절된다. 이 검사는 editorial-judge나 실제 음성·청취 검수를 대체하지 않는다.");
  } else if (stage === "alignment") {
    try { validateOutput(w, "narration"); }
    catch (error) { errors.push({ path: p("narration.json"), message: error.message }); }
    warnings.push("실제 청취와 자막의 모바일 읽기 검수는 별도다.");
  } else {
    try {
      const checked = validateEditorialBundle(w.root);
      errors.push(...checked.errors);
      warnings.push(...checked.warnings);
    } catch (error) { errors.push({ path: w.rel(w.production), message: error.message }); }
    if (stage === "sync") {
      try {
        for (const file of recipe(w, "sync").required) checkFile(file, { metadataOnly: true });
      } catch (error) { errors.push({ path: "sync-inputs", message: error.message }); }
    }
  }
  return { pilot: id, stage, ready: errors.length === 0, errors, warnings, inputs,
    note: "읽기 전용 사전 검사다. 파일·실행 기록을 만들거나 기존 입력을 수정하지 않는다. begin/finish와 독립 검수는 그대로 수행한다." };
};
