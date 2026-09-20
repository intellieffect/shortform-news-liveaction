import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirs, inputRoot } from "./pilot.mjs";
import { EDITORIAL_ENGINE, engineMismatch, manifestEngine } from "./engine.mjs";
import { validateEditorialBundle } from "./editorial.mjs";
import { syncStatus } from "./sync.mjs";
import { productionRenderErrors } from "./production/state.mjs";

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const editorialPreflight = (id, root = inputRoot(id)) => {
  const { data, pub } = dirs(id);
  const engine = manifestEngine(data);
  if (engine !== EDITORIAL_ENGINE) return { editorial: false, errors: [], warnings: [], timeline: null };

  const errors = [];
  if (existsSync(join(root, "02_production", "run.json"))) {
    try { errors.push(...productionRenderErrors(id)); }
    catch (error) { errors.push("production state: " + error.message); }
  }
  const mismatch = engineMismatch(root, data);
  if (mismatch) errors.push(`engine 불일치: source=${mismatch.source}, manifest=${mismatch.manifest}`);

  let checked;
  try { checked = validateEditorialBundle(root); }
  catch (error) {
    errors.push(`editorial bundle을 읽지 못함: ${error.message}`);
    return { editorial: true, errors, warnings: [], timeline: null };
  }
  for (const row of checked.errors) errors.push(`[${row.code}] ${row.where}: ${row.message}`);

  const snapshot = syncStatus(id, root);
  for (const name of snapshot.missing) errors.push(`sync snapshot 파일이 없다: ${name}`);
  for (const name of snapshot.stale) errors.push(`sync snapshot이 정본보다 낡았다: ${name}`);

  const sourceTimeline = join(root, "02_production", "timeline.json");
  const renderTimeline = join(data, "timeline.json");
  for (const [label, path] of [["source", sourceTimeline], ["render", renderTimeline]]) {
    if (!existsSync(path)) { errors.push(`${label} timeline.json이 없다: ${path}`); continue; }
    try {
      if (!sameJson(JSON.parse(readFileSync(path, "utf8")), checked.timeline)) errors.push(`${label} timeline.json이 현재 정본과 다르다 — editorial:compile/sync가 필요하다`);
    } catch (error) { errors.push(`${label} timeline.json을 읽지 못함: ${error.message}`); }
  }
  try {
    const audio = JSON.parse(readFileSync(join(data, "audio.json"), "utf8"));
    const visual = JSON.parse(readFileSync(join(data, "visual-system.json"), "utf8"));
    const media = [audio.narration?.file, ...(!audio.master_mix ? [audio.bgm?.file, ...(checked.timeline.audio_cues ?? []).map((cue) => cue.asset)] : []), ...(visual.media?.assets ?? []).map((asset) => asset.file)].filter(Boolean);
    for (const file of media) if (!existsSync(join(pub, file))) errors.push(`렌더 미디어가 없다: public/pilots/${id}/${file}`);
  } catch (error) { errors.push(`sync audio/visual-system을 읽지 못함: ${error.message}`); }
  return { editorial: true, errors, warnings: checked.warnings, timeline: checked.timeline };
};
