#!/usr/bin/env node
import { resolve } from "node:path";
import { REPO } from "./lib/pilot.mjs";
import { createVideoLibraryServer } from "./lib/video-library-server.mjs";
const at = process.argv.indexOf("--root");
if (at >= 0 && !process.argv[at + 1])
  throw new Error("--root 뒤에 저장소 경로가 필요합니다.");
const root = at >= 0 ? resolve(process.argv[at + 1]) : REPO;
const server = createVideoLibraryServer({ root });
const port = Number(process.env.VIDEO_LIBRARY_PORT ?? 4381);
server.on("error", (error) => {
  console.error(`제작 영상 서버를 열지 못했습니다: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `제작 영상 → http://127.0.0.1:${server.address().port}/videos.html`,
  ),
);
