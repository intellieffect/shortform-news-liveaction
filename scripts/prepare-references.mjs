#!/usr/bin/env node
import { PYTHON } from "./lib/tools.mjs";
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readReferenceCollection } from "./lib/visual-references.mjs";
const root = fileURLToPath(new URL("../", import.meta.url)),
  id = process.argv[2];
const cases = readReferenceCollection(root).cases.filter(
  (c) => !id || c.id === id,
);
if (!cases.length) throw new Error("알 수 없는 사례: " + id);
for (const c of cases) {
  const dir = join(
      root,
      "references/visual/cases",
      c.id,
      "versions",
      c.version,
    ),
    cache = join(root, "public/references", c.id, c.version);
  mkdirSync(cache, { recursive: true });
  cpSync(join(dir, "assets"), cache, { recursive: true });
  if (c.id === "scattering") {
    execFileSync(PYTHON, ["-c", "import numpy; from PIL import Image"], {
      stdio: "inherit",
    });
    mkdirSync(join(cache, "decoded"), { recursive: true });
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        join(cache, "original.mp4"),
        "-vf",
        "fps=30",
        join(cache, "decoded/%04d.png"),
      ],
      { stdio: "inherit" },
    );
    execFileSync(PYTHON, [join(dir, "source/key-overlay.py"), cache], {
      stdio: "inherit",
    });
  }
  mkdirSync(join(root, "out/references", c.id), { recursive: true });
  console.log(c.id + ": 재현 자산 복원 완료");
}
