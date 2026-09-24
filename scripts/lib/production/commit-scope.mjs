import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// 확정 커밋에 담는 편 파일. 편 경로는 .gitignore에 남겨 두고 이 목록만 명시해서 커밋한다 —
// 그래서 제작 중 파일·다른 편·미디어는 git status에 나타나지 않는다.
// 미디어(영상·음성·이미지)는 담지 않는다. 완성본은 out/pilots/<id>/deliver/에 두고 해시만 pilot.json에 남는다.
export const TEXT_EXTENSIONS = new Set([".json", ".md", ".txt", ".tsx", ".ts", ".csv", ".srt", ".vtt", ".yaml", ".yml", ".html"]);
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SKIP_NAMES = [/\.lock$/, /\.tmp$/, /^\.DS_Store$/];

const walk = (repo, dir, out) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) { walk(repo, path, out); continue; }
    if (!entry.isFile() || SKIP_NAMES.some((re) => re.test(entry.name))) continue;
    const dot = entry.name.lastIndexOf(".");
    if (dot < 0 || !TEXT_EXTENSIONS.has(entry.name.slice(dot).toLowerCase())) continue;
    if (statSync(path).size > MAX_FILE_BYTES) continue;
    out.push(relative(repo, path).split(sep).join("/"));
  }
  return out;
};

export const episodeCommitPaths = (repo, id) => {
  const files = [];
  walk(repo, join(repo, "news", id), files);
  walk(repo, join(repo, "pilots", id), files);
  walk(repo, join(repo, "src/editorial/episodes", id), files);
  const component = join(repo, "src/editorial/episodes", id + ".tsx");
  if (existsSync(component)) files.push("src/editorial/episodes/" + id + ".tsx");
  return files.sort();
};
