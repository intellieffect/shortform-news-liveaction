#!/usr/bin/env node
// 편별 Remotion 명령 러너 — 컴포지션 id(ShortformNews-<compId> …)와 산출 경로(out/pilots/<id>/…)를 편 id 에서 만든다.
//   node scripts/pilot-run.mjs <still|render|sheet|beat|slides> [id] [출력경로] [remotion 인자…]
//   node scripts/pilot-run.mjs sheets            → 활성 편 전부 비트시트(회귀 고정 명령, npm run still:all)
//   id 생략 = --pilot <id> | env PILOT | active.json 이 1편일 때 그 편. 출력경로는 .mp4/.png/.jpg 로 끝나는 위치 인자.
//   예) npm run still -- hani_space_mirror           → out/pilots/hani_space_mirror/qa/still.png (frame 30)
//       npm run render -- hani_space_mirror out/pilots/hani_space_mirror/ShortformNews_4-1.mp4
//       npm run still:beat -- --props='{"beatId":"b07","guides":true}'
import { fileURLToPath } from "node:url";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { REPO, compId, dirs, resolvePilotId } from "./lib/pilot.mjs";
import { editorialPreflight } from "./lib/editorial-preflight.mjs";

const [task, ...argv] = process.argv.slice(2);
const TASKS = ["still", "render", "sheet", "beat", "slides", "sheets"];
if (!TASKS.includes(task)) {
  console.error(`usage: pilot-run.mjs <${TASKS.join("|")}> [id] [출력경로] [remotion 인자…]`);
  process.exit(2);
}
if (task === "sheets") {
  // 회귀: 활성 편 전부의 비트시트를 out/pilots/<id>/qa/beatsheet.png 로. 엔진(부품) 변경 뒤 옛 편이 깨졌는지 여기서 본다
  const { readActive } = await import("./lib/pilot.mjs");
  for (const pid of readActive()) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "sheet", pid, ...argv], { stdio: "inherit", cwd: REPO });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  process.exit(0);
}
let id, rest;
try {
  ({ id, rest } = resolvePilotId(argv));
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const c = compId(id);
const { out } = dirs(id);
const k = rest.findIndex((a) => !a.startsWith("-") && /\.(mp4|mov|webm|png|jpe?g)$/i.test(a));
const outArg = k >= 0 ? resolve(rest[k]) : null;
if (k >= 0) rest.splice(k, 1);

// .bin/remotion 은 sh 스크립트라 Windows 에서 spawn 이 ENOENT 로 조용히 실패했다 — CLI 의 JS 진입점을 node 로 직접 부른다
const remotion = join(REPO, "node_modules", "@remotion", "cli", "remotion-cli.js");
const run = (args) => {
  const r = spawnSync(process.execPath, [remotion, ...args], { stdio: "inherit", cwd: REPO });
  if (r.error) console.error(r.error);
  if (r.status !== 0) process.exit(r.status ?? 1);
};
// Remotion CLI 는 경로의 첫 "." 뒤를 확장자로 보므로(.claude/worktrees/… 에서 이미지 시퀀스 출력 실패) 저장소 상대경로로 넘긴다
const rel = (p) => (p.startsWith(REPO + sep) ? relative(REPO, p) : p);
const ensure = (p) => (mkdirSync(dirname(p), { recursive: true }), rel(p));
const hasFrame = rest.some((a) => a.startsWith("--frame"));

const prepare = spawnSync(process.execPath, [join(REPO, "scripts/pilots-index.mjs")], { cwd: REPO, stdio: "inherit" });
if (prepare.status !== 0) process.exit(prepare.status ?? 1);
const editorial = editorialPreflight(id);
if (editorial.editorial) {
  if (editorial.errors.length) {
    console.error(`editorial-concept@1 렌더 전 검사 실패 ${editorial.errors.length}건`);
    for (const error of editorial.errors) console.error(`ERROR ${error}`);
    process.exit(2);
  }
}

switch (task) {
  case "still":
    run(["still", `ShortformNews-${c}`, ensure(outArg ?? join(out, "qa", "still.png")), ...(hasFrame ? [] : ["--frame=30"]), ...rest]);
    break;
  case "render":
    run(["render", `ShortformNews-${c}`, ensure(outArg ?? join(out, "ShortformNews.mp4")), ...rest]);
    break;
  case "sheet": {
    // editorial-concept 편의 연락지는 Still 1장(proof 전체 동시 마운트)이 아니라 페이지 PNG 여러 장이다.
    // proof 263장을 1200x40944 한 장에 얹던 옛 경로는 10분 넘게 멎었다(2026-09-22). legacy 편은 그대로 둔다.
    if (editorial.editorial) {
      if (rest.length) console.log(`editorial 연락지는 remotion CLI 인자를 쓰지 않는다 — 무시: ${rest.join(" ")}`);
      const sheet = spawnSync(
        process.execPath,
        [join(REPO, "scripts", "render-editorial-proof-frames.mjs"), "--pilot", id, "--sheet", ...(outArg ? ["--out", outArg] : [])],
        { stdio: "inherit", cwd: REPO },
      );
      if (sheet.status !== 0) process.exit(sheet.status ?? 1);
      break;
    }
    run(["still", `BeatSheet-${c}`, ensure(outArg ?? join(out, "qa", "beatsheet.png")), ...rest]);
    break;
  }
  case "beat":
    run(["still", `BeatStill-${c}`, ensure(outArg ?? join(out, "qa", "beat.png")), ...rest]);
    break;
  case "slides": {
    const dir = join(out, "qa", "slides");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    if (editorial.editorial) {
      const proof = spawnSync(process.execPath, [join(REPO, "scripts", "render-editorial-proof-frames.mjs"), "--pilot", id], { stdio: "inherit", cwd: REPO });
      if (proof.status !== 0) process.exit(proof.status ?? 1);
    } else {
      run(["render", `Slides-${c}`, rel(dir), "--sequence", "--image-format=jpeg", "--jpeg-quality=88", ...rest]);
    }
    const builder = editorial.editorial ? "build-editorial-slides.mjs" : "build-slides.mjs";
    const r = spawnSync(process.execPath, [join(REPO, "scripts", builder), "--pilot", id], { stdio: "inherit", cwd: REPO });
    process.exit(r.status ?? 1);
  }
}
