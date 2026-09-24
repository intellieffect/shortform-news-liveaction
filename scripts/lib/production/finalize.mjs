import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { buildVideoLibrary } from "../video-library.mjs";
import { episodeCommitPaths } from "./commit-scope.mjs";
import { hash, json, workspace } from "./contracts.mjs";

// 확정 = 새 버전 + 자동 커밋 + 완성 영상 목록 갱신.
// 한겨레 체크아웃은 main 하나에서 편을 쌓는다. 가장 마지막 버전이 그 편의 확정본이고,
// 완성 영상 파일은 git 밖(out/pilots/<id>/deliver/vN/)에, 해시와 기록만 커밋에 남는다.

const git = (repo, args, options = {}) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
const gitOk = (repo, args) => { try { git(repo, args); return true; } catch { return false; } };
const sha = (file) => hash(readFileSync(file));
const localTime = () => {
  const d = new Date(), off = -d.getTimezoneOffset(), pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return new Date(d.getTime() + off * 60000).toISOString().slice(0, 19) + (off >= 0 ? "+" : "-") + pad(off / 60) + ":" + pad(off % 60);
};

const currentRender = (w) => {
  const state = json(w.runFile);
  const artifact = state.receipts?.render?.validation?.artifact;
  if (!artifact?.path) throw new Error("확정할 현재 렌더가 없다 — 최종 렌더부터 기록한다: npm run produce -- run " + w.id + " render");
  const file = w.path(artifact.path);
  if (!existsSync(file) || sha(file) !== artifact.sha256) throw new Error("렌더 기록과 파일이 다르다: " + artifact.path);
  return { path: artifact.path, sha256: artifact.sha256, duration_sec: state.receipts.render.validation.media?.duration ?? null };
};

const safeName = (repo) => { try { return git(repo, ["config", "user.name"]).trim(); } catch { return ""; } };

const commitEpisode = (repo, id, message) => {
  const errors = [];
  if (!safeName(repo)) errors.push("git 사용자 이름이 없다 — git config user.name \"이름\" 으로 한 번 설정한다");
  if (!gitOk(repo, ["diff", "--cached", "--quiet"])) errors.push("이미 커밋 대기(staged) 중인 다른 변경이 있다 — 섞지 않도록 먼저 정리한다");
  if (errors.length) throw new Error("자동 커밋 중단: " + errors.join(" / "));
  const paths = episodeCommitPaths(repo, id);
  const scope = ["news/" + id, "pilots/" + id, "src/editorial/episodes/" + id, "src/editorial/episodes/" + id + ".tsx"];
  // 편 경로는 .gitignore 대상이다. 목록에 든 파일만 명시해 강제로 올리고, 사라진 추적 파일은 기록에서 뺀다.
  for (let i = 0; i < paths.length; i += 200) git(repo, ["add", "-f", "--", ...paths.slice(i, i + 200)]);
  const keep = new Set(paths);
  const gone = git(repo, ["ls-files", "--", ...scope]).split("\n").filter((p) => p && !keep.has(p));
  for (let i = 0; i < gone.length; i += 200) git(repo, ["rm", "-q", "--cached", "--", ...gone.slice(i, i + 200)]);
  if (gitOk(repo, ["diff", "--cached", "--quiet"])) return { committed: false, reason: "바뀐 파일 없음" };
  git(repo, ["commit", "-q", "-m", message]);
  return { committed: true, commit: git(repo, ["rev-parse", "--short", "HEAD"]).trim(), files: paths.length };
};

/**
 * @param {string} id
 * @param {{ repo?: string, basis?: "completion"|"user"|"restore", from?: string, note?: string, commit?: boolean }} options
 *   from: 이전 판(vK)을 새 버전으로 다시 확정한다 — "이전 버전으로 돌려줘".
 */
export const deliverEpisode = (id, { repo, basis = "completion", from, note = null, commit = true } = {}) => {
  const w = workspace(id, repo);
  const manifestPath = w.path("pilots/" + id + "/pilot.json");
  if (!existsSync(manifestPath)) throw new Error("pilots/" + id + "/pilot.json이 없다 — npm run sync -- news/" + id + " 부터 실행한다");
  const pilot = json(manifestPath);
  pilot.versions ??= [];

  let source;
  if (from) {
    const prior = pilot.versions.find((v) => v.version === from);
    if (!prior?.file || !existsSync(w.path(prior.file))) throw new Error("되돌릴 판을 찾지 못했다: " + from);
    source = { path: prior.file, sha256: prior.file_sha256 ?? sha(w.path(prior.file)), duration_sec: prior.duration_sec ?? null, restored_from: from };
    basis = "restore";
  } else source = currentRender(w);

  const last = pilot.versions.at(-1);
  if (last && (last.file_sha256 === source.sha256 || last.sha256 === source.sha256)) {
    // 앞선 확정이 커밋 전에 멈췄다면 여기서 마저 커밋한다.
    const committed = commit ? commitEpisode(w.repo, id, `편 ${id} ${last.version} 확정`) : { committed: false, reason: "커밋 생략" };
    return { id, version: last.version, skipped: "이미 확정본과 같은 영상이다 — 새 버전을 만들지 않았다", file: last.file, commit: committed };
  }

  const n = pilot.versions.reduce((max, v) => Math.max(max, Number(/^v(\d+)/.exec(v.version ?? "")?.[1] ?? 0)), 0) + 1;
  const version = "v" + n;
  const deliverDir = w.path("out/pilots/" + id + "/deliver/" + version);
  const file = "out/pilots/" + id + "/deliver/" + version + "/" + id + "_" + version + ".mp4";
  mkdirSync(deliverDir, { recursive: true });
  copyFileSync(w.path(source.path), w.path(file));
  const fileSha = sha(w.path(file));
  if (fileSha !== source.sha256) throw new Error("복사본 해시 불일치: " + file);

  const request = existsSync(w.path("news/" + id + "/00_brief/request.json")) ? json(w.path("news/" + id + "/00_brief/request.json")) : {};
  pilot.article ??= {};
  pilot.article.url ??= request.source_url ?? null;
  const at = localTime();
  pilot.versions.push({
    version, label: "final_" + version, master: from ? null : source.path, sha256: source.sha256,
    file, file_sha256: fileSha, duration_sec: source.duration_sec,
    confirmed_by: basis === "completion" ? "production-completion" : "user", confirmed_at: at, basis,
    ...(source.restored_from ? { restored_from: source.restored_from } : {}), note,
  });
  pilot.status = "delivered";
  pilot.delivered = at.slice(0, 10);
  writeFileSync(manifestPath, JSON.stringify(pilot, null, 2) + "\n");

  writeFileSync(join(deliverDir, "MANIFEST.txt"), [
    `id            ${id}`, `version       ${version}  (확정본)`, `file          ${id}_${version}.mp4`, `sha256        ${fileSha}`,
    `confirmed_at  ${at}`, `basis         ${basis}${source.restored_from ? " · " + source.restored_from + "에서 복원" : ""}`,
    `article       ${pilot.article.url ?? "?"}`, "", "pilot.json에서 생성했다. 손으로 고치지 않는다.", "",
  ].join("\n"));
  const link = w.path("out/pilots/" + id + "/deliver/LATEST");
  if (lstatSync(link, { throwIfNoEntry: false })) unlinkSync(link);
  try { symlinkSync(version, link); } catch { writeFileSync(link, version + "\n"); }

  let library = null;
  try { library = buildVideoLibrary({ root: w.repo }); } catch (error) { library = { error: error.message }; }
  const committed = commit ? commitEpisode(w.repo, id, `편 ${id} ${version} 확정`) : { committed: false, reason: "커밋 생략" };
  return { id, version, file, sha256: fileSha, basis, commit: committed, videos: library?.file ?? null, library_error: library?.error };
};

