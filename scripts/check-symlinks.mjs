#!/usr/bin/env node
/**
 * 커밋된 심링크 검사 — **저장소 안에서 상대경로로 해소되는 것만 허용한다.**
 *
 * 왜 (2026-09-03 사고 2차): 워크트리에서 main 의 자산을 보려고
 * `news/hani_roman_eye/02_production/external_assets` 에 **절대경로 심링크**를 만들었는데,
 * 그 경로는 `public/pilots`(gitignore)와 달리 **부분 추적 디렉터리**였다 —
 * `_search/*.json` 원장은 추적, 바이너리는 미추적. `git add -A` 가 심링크를 커밋하면서
 * **추적 파일 38개가 삭제**됐고(Graphics.tsx 분리 커밋의 -1765줄에 묻혔다),
 * main 머지가 그 심링크를 실제 폴더 위에 덮으면서 **gitignore 된 수집 원본이 사라졌다.**
 *
 * 무엇이 갈렸나 — 2편의 심링크는 정상이다(`_search -> ../../../hani_satellite_pollution/…`,
 * 대본 준수판이 원본편 자료를 공유). 사고 난 것은 **절대경로 + 자기 자신**이었다.
 *
 * 판정
 *   ERROR  절대경로 심링크            — 클론·워크트리에서 거짓이 된다(JSON 의 root 규약과 같은 이유)
 *   ERROR  해소 안 되는 심링크        — 자기참조 루프 포함
 *   ERROR  저장소 밖을 가리킴
 *
 * 사용: node scripts/check-symlinks.mjs        (check:all 이 편 루프 앞에서 한 번 돌린다)
 */
import { execFileSync } from "node:child_process";
import { existsSync, realpathSync, lstatSync, readlinkSync } from "node:fs";
import { resolve, dirname, isAbsolute, sep, relative } from "node:path";
import { REPO } from "./lib/pilot.mjs";

// -z 로 받는다 — 기본 출력은 비ASCII 경로를 8진 이스케이프로 감싸서 한글 폴더명이 깨진다
const links = execFileSync("git", ["-C", REPO, "ls-files", "-s", "-z"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
  .split("\0")
  .filter((l) => l.startsWith("120000"))
  .map((l) => l.slice(l.indexOf("\t") + 1))
  .filter(Boolean);

const errors = [];
for (const rel of links) {
  const abs = resolve(REPO, rel);
  if (!existsSync(abs) && !lstatSync(abs, { throwIfNoEntry: false })) continue;   // 체크아웃 안 된 경로는 건너뛴다
  let target;
  try { target = readlinkSync(abs); } catch { continue; }

  if (isAbsolute(target)) {
    errors.push(`[symlink-absolute] ${rel} → ${target} — 커밋되는 심링크는 상대경로여야 한다(클론·워크트리에서 거짓이 된다)`);
    continue;
  }
  let real;
  try { real = realpathSync(abs); } catch (e) {
    errors.push(`[symlink-broken] ${rel} → ${target} — 해소되지 않는다(${e.code === "ELOOP" ? "자기참조 루프" : e.code})`);
    continue;
  }
  if (real !== REPO && !real.startsWith(REPO + sep)) {
    errors.push(`[symlink-outside] ${rel} → ${relative(REPO, real)} — 저장소 밖을 가리킨다`);
  }
}

console.log(`symlinks: 커밋된 심링크 ${links.length}개 · ERROR ${errors.length}`);
for (const e of errors) console.log(`ERROR ${e}`);
if (errors.length) {
  console.log(`\n워크트리에서 main 의 자산을 보려면 **gitignore 된 경로에만** 심링크를 만든다(public/pilots/…).`);
  console.log(`news/ 아래는 추적 트리다 — 거기 심링크를 놓으면 추적 파일이 삭제되고, 머지가 그것을 실제 폴더 위에 덮는다.`);
  console.log(`자산이 필요하면 워크트리에서 node scripts/fetch-assets.mjs news/<id> 로 받는다.`);
}
process.exit(errors.length ? 1 : 0);
