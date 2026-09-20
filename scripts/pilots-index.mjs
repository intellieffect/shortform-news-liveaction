#!/usr/bin/env node
// pilots/active.json(활성 편 id 목록) → pilots/index.ts 생성. 엔진별 필수 데이터와 renderer를 같은 지점에서 확정한다.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { EDITORIAL_ENGINE, SCRIPT_ENGINE, manifestEngine } from "./lib/engine.mjs";

const here = resolve(new URL(".", import.meta.url).pathname, "..");
const dir = join(here, "pilots");
const active = JSON.parse(readFileSync(join(dir, "active.json"), "utf8"));
if (!Array.isArray(active) || active.some((id) => typeof id !== "string" || !/^[a-z0-9_]+$/.test(id))) {
  console.error("pilots/active.json 은 편 id(snake_case) 문자열 배열이어야 한다");
  process.exit(2);
}

const records = active.map((id, index) => ({ id, index, engine: manifestEngine(join(dir, id)) }));
const lines = [
  "// 생성 파일 — scripts/pilots-index.mjs 가 pilots/active.json 에서 만든다. 손으로 고치지 않는다.",
  'import type { PilotData } from "../src/pilot/pilot";',
  'import type { EditorialPilotData } from "../src/editorial/pilot";',
];
if (records.some((record) => record.engine === SCRIPT_ENGINE)) lines.push('import { buildPilot } from "../src/pilot/pilot";');
if (records.some((record) => record.engine === EDITORIAL_ENGINE)) lines.push('import { buildEditorialPilot } from "../src/editorial/pilot";');

const legacyEntries = [];
const editorialEntries = [];
for (const { id, index, engine } of records) {
  if (!engine) {
    console.error(`pilots/${id}/pilot.json이 없다`);
    process.exit(1);
  }
  if (engine === SCRIPT_ENGINE) {
    const files = ["beats", "overlays", "shots", "audio", "render.config", "pilot"];
    const missing = files.filter((file) => !existsSync(join(dir, id, `${file}.json`)));
    if (missing.length) {
      console.error(`pilots/${id}/: 없음 — ${missing.map((file) => file + ".json").join(", ")}`);
      process.exit(1);
    }
    for (const file of files) lines.push(`import ${file.replace(".", "_")}_${index} from "./${id}/${file}.json";`);
    legacyEntries.push(`  buildPilot({ id: "${id}", beats: beats_${index}, overlays: overlays_${index}, shots: shots_${index}, audio: audio_${index}, render: render_config_${index}, manifest: pilot_${index} }),`);
    continue;
  }

  const files = ["timeline", "narration", "story", "concepts", "visual-system", "audio", "pilot"];
  const missing = files.filter((file) => !existsSync(join(dir, id, `${file}.json`)));
  const episode = join(here, "src", "editorial", "episodes", `${id}.tsx`);
  if (!existsSync(episode)) missing.push(`src/editorial/episodes/${id}.tsx`);
  if (missing.length) {
    console.error(`pilots/${id}/: editorial renderer/data 없음 — ${missing.map((file) => file.endsWith(".tsx") ? file : file + ".json").join(", ")}`);
    process.exit(1);
  }
  if (readFileSync(episode, "utf8").includes("EDITORIAL_PLACEHOLDER = true")) {
    console.error(`src/editorial/episodes/${id}.tsx가 아직 placeholder다 — 개념 장면을 구현한 뒤 상수를 제거한다`);
    process.exit(1);
  }
  for (const file of files) lines.push(`import ${file.replace("-", "_")}_${index} from "./${id}/${file}.json";`);
  lines.push(`import { EditorialEpisode as editorial_episode_${index} } from "../src/editorial/episodes/${id}";`);
  editorialEntries.push(`  buildEditorialPilot({ id: "${id}", timeline: timeline_${index}, narration: narration_${index}, story: story_${index}, concepts: concepts_${index}, visualSystem: visual_system_${index}, audio: audio_${index}, manifest: pilot_${index}, component: editorial_episode_${index} }),`);
}

lines.push("", "export const PILOTS: PilotData[] = [", ...legacyEntries, "];", "", "export const EDITORIAL_PILOTS: EditorialPilotData[] = [", ...editorialEntries, "];", "");
writeFileSync(join(dir, "index.ts"), lines.join("\n"));
console.log(`pilots/index.ts: legacy ${legacyEntries.length}편 · editorial ${editorialEntries.length}편 — ${active.join(", ")}`);
