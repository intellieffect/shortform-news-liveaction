#!/usr/bin/env node
// Explicit render command only; prepare/check never render videos.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readReferenceCollection } from "./lib/visual-references.mjs";
const root = fileURLToPath(new URL("../", import.meta.url)),
  id = process.argv[2];
const c = readReferenceCollection(root).cases.find((c) => c.id === id);
if (!c) throw new Error("사례 ID 필요: scale|observation|scattering");
execFileSync(
  process.execPath,
  [join(root, "scripts/prepare-references.mjs"), id],
  { cwd: root, stdio: "inherit" },
);
const dir = `out/references/${id}`,
  entry = `references/visual/cases/${id}/versions/${c.version}/source/entry.tsx`;
execFileSync(
  "npx",
  [
    "remotion",
    "render",
    entry,
    c.composition,
    `${dir}/render.mp4`,
    "--codec=h264",
    "--crf=17",
    "--concurrency=3",
  ],
  { cwd: root, stdio: "inherit" },
);
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    `${dir}/render.mp4`,
    "-c:v",
    "copy",
    "-af",
    `volume=${c.gain}dB`,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    `${dir}/rebuilt.mp4`,
  ],
  { cwd: root, stdio: "inherit" },
);
console.log("확정본을 보존하고 " + dir + "/rebuilt.mp4 생성");
