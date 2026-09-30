import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// 전역 설정값(기본 보이스·기본 프롬프트·자막 프로필·후킹 디자인·크레딧 디자인·공용 음원 목록) 변경을 그 파일만 명시해 커밋한다.
// 편 확정 커밋(finalize.mjs)과 같은 방식이다 — 다른 변경이 섞이지 않게 이미 staged된 것이 있으면 멈춘다.
// 코드·지침 변경은 이 경로가 아니라 개발 브랜치에서 한다(CLAUDE.md).
const git = (repo, args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const gitOk = (repo, args) => { try { git(repo, args); return true; } catch { return false; } };

export const commitSettings = (repo, paths, message) => {
  if (!paths.length) return { committed: false, reason: "바뀐 파일 없음" };
  if (!existsSync(join(repo, ".git")) && !gitOk(repo, ["rev-parse", "--git-dir"])) return { committed: false, reason: "git 저장소가 아니다 — 커밋하지 않았다" };
  const errors = [];
  let name = "";
  try { name = git(repo, ["config", "user.name"]).trim(); } catch { /* 없음 */ }
  if (!name) errors.push("git 사용자 이름이 없다 — git config user.name \"이름\" 으로 한 번 설정한다");
  if (!gitOk(repo, ["diff", "--cached", "--quiet"])) errors.push("이미 커밋 대기(staged) 중인 다른 변경이 있다 — 섞지 않도록 먼저 정리한다");
  if (errors.length) return { committed: false, reason: "자동 커밋 중단: " + errors.join(" / ") + ". 파일 변경은 그대로 남아 있다" };
  git(repo, ["add", "--", ...paths]);
  if (gitOk(repo, ["diff", "--cached", "--quiet"])) return { committed: false, reason: "바뀐 파일 없음" };
  git(repo, ["commit", "-q", "-m", message, "--", ...paths]);
  return { committed: true, commit: git(repo, ["rev-parse", "--short", "HEAD"]).trim(), files: paths };
};
