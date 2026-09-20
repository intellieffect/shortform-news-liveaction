#!/usr/bin/env node
// 설치 위치와 작업 저장소를 분리한다. 호스트의 훅 없이도 같은 엔진 검사를 거친다.
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

try {
  const args = process.argv.slice(2), at = args.indexOf("--project");
  const chosen = at >= 0 ? args[at + 1] : process.env.CLAUDE_PROJECT_DIR;
  if (!chosen || chosen.startsWith("--")) throw new Error("--project <제작 저장소> 또는 CLAUDE_PROJECT_DIR이 필요하다");
  if (at >= 0) args.splice(at, 2);
  const project = realpathSync(resolve(chosen));
  const plugin = realpathSync(join(dirname(fileURLToPath(import.meta.url)), ".."));
  const wanted = JSON.parse(readFileSync(join(plugin, "production-contract.json"), "utf8"));
  const actual = JSON.parse(readFileSync(join(project, "config/production-engine.json"), "utf8"));
  if (wanted.engine !== actual.id || wanted.entry_api !== actual.entry_api) throw new Error("플러그인·제작 엔진 계약이 다르다. 현재 프로젝트와 플러그인 경로를 확인한다");
  const result = spawnSync(process.execPath, [join(project, "scripts/produce.mjs"), ...args], {
    cwd: project, stdio: "inherit", env: { ...process.env, SHORTFORM_PLUGIN_ROOT: plugin, SHORTFORM_PROJECT_ROOT: project },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error("제작 진입 실패: " + error.message);
  process.exitCode = 1;
}
