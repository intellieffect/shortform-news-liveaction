#!/usr/bin/env node
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { REPO } from "./lib/pilot.mjs";
import { buildVideoLibrary } from "./lib/video-library.mjs";
const args = process.argv.slice(2);
const at = args.indexOf("--root");
if (at >= 0 && !args[at + 1])
  throw new Error("--root 뒤에 저장소 경로가 필요합니다.");
const root = at >= 0 ? resolve(args[at + 1]) : REPO;
const result = buildVideoLibrary({ root, outDir: join(root, "out") });
for (const warning of result.warnings) console.warn(`목록 확인: ${warning}`);
console.log(`제작 영상 ${result.videos.length}편 → ${result.file}`);
if (args.includes("--open")) execFileSync("open", [result.file]);
