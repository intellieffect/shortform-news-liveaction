import {collectReferences} from './visual-references.mjs';
// 제작 영상 목록: 완성 상태와 실제 파일을 함께 확인한다. 실험 원장은 읽지 않는다.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../templates/video-library",
);
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const directories = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];
const regularFile = (file) => {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
};
const urlPath = (path) => path.split("/").map(encodeURIComponent).join("/");
const httpUrl = (value) => {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
};
const dateOnly = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
  !Number.isNaN(Date.parse(value))
    ? value.slice(0, 10)
    : null;

function collectThumbnails(pilot, homes, video, outDir, warnings) {
  const describe = (file) => ({
    filename: basename(file),
    src: urlPath(relative(outDir, file)),
    sizeMB: +(statSync(file).size / 1024 / 1024).toFixed(1),
  });
  const candidates = pilot.thumbnails?.candidates;
  const approved = Array.isArray(candidates)
    ? candidates.filter((c) => c?.status === "approved")
    : [];
  if (approved.length) {
    const files = [];
    for (const candidate of approved) {
      const path = candidate.file;
      if (
        typeof path !== "string" ||
        !path.startsWith(`out/pilots/${pilot.id}/`) ||
        path.split("/").includes("..") ||
        path.includes("\\") ||
        !/\.(png|jpe?g|webp)$/i.test(path)
      ) {
        warnings.push(`${pilot.id}: 확정 썸네일 경로가 올바르지 않습니다.`);
        continue;
      }
      const file = homes.map((home) => join(home, path)).find(regularFile);
      if (!file) {
        warnings.push(`${pilot.id}: 확정 썸네일 파일이 없습니다 (${path}).`);
        continue;
      }
      if (!files.includes(file)) files.push(file);
    }
    const thumbnails = files.map(describe);
    // 확정 파일이 유실되어도 과거 커버를 확정본처럼 다시 표시하지 않는다.
    return { thumbnails, poster: thumbnails[0]?.src ?? null };
  }
  // 확정 기록이 없는 이전 편은 기존 완성본 폴더의 이미지를 사용한다.
  const images = readdirSync(dirname(video))
    .filter((n) => /\.(png|jpe?g|webp)$/i.test(n))
    .sort();
  const thumbnails = images
    .filter((name) =>
      /^(?:(?:cover|thumbnail|커버|썸네일)(?:[-_][\p{L}\p{N}_-]+)?|[A-Z](?:-r\d+)?)\.(png|jpe?g|webp)$/iu.test(
        name.normalize("NFC"),
      ),
    )
    .map((name) => describe(join(dirname(video), name)));
  const cover =
    images.find((n) => /^(cover|thumbnail)\./i.test(n)) ?? images[0];
  return {
    thumbnails,
    poster: cover
      ? urlPath(relative(outDir, join(dirname(video), cover)))
      : null,
  };
}

export function checkoutRoots(root) {
  try {
    const raw = execFileSync("git", ["worktree", "list", "--porcelain", "-z"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return [
      ...new Set([
        resolve(root),
        ...raw
          .split("\0")
          .filter((s) => s.startsWith("worktree "))
          .map((s) => s.slice(9)),
      ]),
    ];
  } catch {
    return [resolve(root)];
  }
}

export function collectVideos({
  root,
  outDir = join(root, "out"),
  roots = checkoutRoots(root),
}) {
  const pilots = new Map();
  const warnings = [];
  for (const home of roots) {
    for (const id of directories(join(home, "pilots"))) {
      const file = join(home, "pilots", id, "pilot.json");
      if (!regularFile(file) || pilots.has(id)) continue;
      try {
        const pilot = json(file);
        if (pilot.id !== id || !/^[a-z0-9_]+$/.test(id)) continue;
        pilots.set(id, { ...pilot, home });
      } catch {
        warnings.push(`${id}: 편 정보 파일을 읽지 못했습니다.`);
      }
    }
  }
  const videos = [];
  const drafts = [];
  for (const p of pilots.values()) {
    // 제작 중인 편 — 확정본이 아직 없다. 목록 하단에 "제작 중"으로만 알린다.
    if (p.status !== "delivered") {
      if (p.status === "drafting" || p.status === "review")
        drafts.push({ id: p.id, title: p.title || p.id, started: dateOnly(p.started), articleUrl: httpUrl(p.article?.url) });
      continue;
    }
    // 같은 기사의 최근본으로 대체된 편은 목록에 싣지 않는다. 파일과 기록은 그대로 남는다.
    if (p.superseded_by) {
      warnings.push(
        `${p.id}: 최근본 ${p.superseded_by} 로 대체되어 목록에서 제외.`,
      );
      continue;
    }
    const homes = [...new Set([p.home, ...roots])];
    let latest = null;
    for (const home of homes) {
      try {
        latest = readlinkSync(
          join(home, "out/pilots", p.id, "deliver/LATEST"),
        ).replace(/\/$/, "");
        break;
      } catch {
        /* 이전 편은 LATEST가 없을 수 있다. */
      }
    }
    const versions = (p.versions ?? []).filter(
      (v) => typeof v.file === "string" && v.file,
    );
    const version =
      (latest &&
        versions.find((v) => v.file.includes(`/deliver/${latest}/`))) ||
      versions.at(-1);
    if (
      !version ||
      !/^out\//.test(version.file) ||
      version.file.split("/").includes("..")
    ) {
      warnings.push(`${p.id}: 완성 영상 경로가 없습니다.`);
      continue;
    }
    const video = homes
      .map((home) => join(home, version.file))
      .find(regularFile);
    if (!video) {
      warnings.push(
        `${p.id}: 대표 완성 영상 파일이 없습니다 (${version.file}).`,
      );
      continue;
    }
    let article = {};
    for (const home of homes) {
      const dir = join(home, "news", p.id, "01_input/01_원문_기사");
      if (!existsSync(dir)) continue;
      const name = readdirSync(dir)
        .sort()
        .find((n) => n.endsWith(".article.json"));
      if (name) {
        try {
          article = json(join(dir, name));
          break;
        } catch {
          /* 다음 체크아웃 확인 */
        }
      }
    }
    let reporters = article.reporterList;
    if (typeof reporters === "string") {
      try {
        reporters = JSON.parse(reporters);
      } catch {
        reporters = [];
      }
    }
    const author =
      (Array.isArray(reporters)
        ? reporters
            .map((r) => r?.name)
            .filter(Boolean)
            .join(", ")
        : "") ||
      p.article?.author ||
      "";
    const { thumbnails, poster } = collectThumbnails(
      p,
      homes,
      video,
      outDir,
      warnings,
    );
    const completed = dateOnly(version.completed_at ?? version.confirmed_at) ?? dateOnly(p.delivered);
    const episodeTitle = p.title || p.id;
    // 표시 제목은 기사 제목을 우선한다. 편 제목은 부제로 함께 싣는다.
    const sourceTitle = article.title || p.article?.title || "";
    const title = sourceTitle || episodeTitle;
    const articleTitle = sourceTitle || "기사 제목 미등록";
    const articleUrl = httpUrl(p.article?.url);
    if (!completed)
      warnings.push(
        `${p.id}: 제작 완료일 미등록 (착수일·파일 수정일로 추정하지 않음).`,
      );
    videos.push({
      id: p.id,
      title,
      episodeTitle,
      articleTitle,
      articleUrl,
      searchText: [title, episodeTitle, articleTitle, author, articleUrl]
        .filter(Boolean)
        .join(" "),
      author,
      articleDate: dateOnly(article.createDate) ?? dateOnly(p.article?.date),
      completed,
      seconds: Number.isFinite(version.duration_sec)
        ? version.duration_sec
        : null,
      sizeMB: +(statSync(video).size / 1024 / 1024).toFixed(1),
      src: urlPath(relative(outDir, video)),
      thumbnails,
      poster,
      filename: video.split("/").at(-1),
      // 가장 마지막 판이 확정본이다. 이전 판은 파일이 남아 있는 것만 내려받기로 싣는다.
      version: version.version ?? null,
      previous: versions
        .filter((v) => v !== version)
        .map((v) => ({ v, file: homes.map((home) => join(home, v.file)).find(regularFile) }))
        .filter((x) => x.file)
        .map(({ v, file }) => ({
          version: v.version ?? null,
          completed: dateOnly(v.completed_at ?? v.confirmed_at),
          src: urlPath(relative(outDir, file)),
          filename: file.split("/").at(-1),
          sizeMB: +(statSync(file).size / 1024 / 1024).toFixed(1),
        }))
        .reverse(),
    });
  }
  videos.sort(
    (a, b) =>
      (b.completed ?? "").localeCompare(a.completed ?? "") ||
      a.title.localeCompare(b.title, "ko"),
  );
  drafts.sort((a, b) => (b.started ?? "").localeCompare(a.started ?? ""));
  return { videos, drafts, warnings };
}

// 제작 요청 프롬프트는 docs/PRODUCTION_PROMPT_V2_RESTORED.txt 가 정본이다. 여기서는 읽기만 한다.
export const PROMPT_SOURCE = "docs/PRODUCTION_PROMPT_V2_RESTORED.txt";

export function readProductionPrompt(root, roots = [root]) {
  for (const home of [...new Set(roots.map((r) => resolve(r)))]) {
    let markdown;
    try {
      markdown = readFileSync(join(home, PROMPT_SOURCE), "utf8");
    } catch {
      continue;
    }
    if (!markdown.trim()) return {
      source: PROMPT_SOURCE, text: "", note: "",
      error: `${PROMPT_SOURCE} 프롬프트 본문이 비어 있습니다.`,
    };
    return { source: PROMPT_SOURCE, text: markdown, note: "", error: "" };
  }
  return {
    source: PROMPT_SOURCE,
    text: "",
    note: "",
    error: `${PROMPT_SOURCE} 파일을 찾지 못했습니다.`,
  };
}

export function buildVideoLibrary({
  root,
  outDir = join(root, "out"),
  roots = checkoutRoots(root),
  localTools = false,
} = {}) {
  const { videos, drafts, warnings } = collectVideos({ root, outDir, roots });
  const referenceLibrary = collectReferences(root, outDir);
  if(referenceLibrary.status === "invalid") warnings.push(...referenceLibrary.warnings);
  const prompt = readProductionPrompt(root, roots);
  if (prompt.error) warnings.push(`제작 프롬프트: ${prompt.error}`);
  const generatedAt = new Date().toISOString();
  // HTML 안에 JSON을 담되 기사 제목이 script 태그를 닫지 못하게 한다.
  const icons = Object.fromEntries(
    readdirSync(join(TEMPLATE, "icons"))
      .filter((name) => name.endsWith(".svg"))
      .map((name) => [
        name.replace(".svg", ""),
        readFileSync(join(TEMPLATE, "icons", name), "utf8").replace(
          "<svg ",
          '<svg class="icon" aria-hidden="true" focusable="false" ',
        ),
      ]),
  );
  const data = JSON.stringify({
    videos,
    drafts,
    referenceLibrary,
    prompt,
    generatedAt,
    icons,
    localTools,
  }).replace(/</g, "\\u003c");
  const html = readFileSync(join(TEMPLATE, "index.html"), "utf8")
    .replace("/* LIBRARY_CSS */", () =>
      readFileSync(join(TEMPLATE, "style.css"), "utf8"),
    )
    .replace("/* LIBRARY_DATA */", () => data)
    .replace("/* LIBRARY_JS */", () =>
      readFileSync(join(TEMPLATE, "app.js"), "utf8"),
    );
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "videos.html"), html);
  writeFileSync(
    join(outDir, "gallery.html"),
    '<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=videos.html"><title>제작 영상</title><a href="videos.html">제작 영상 목록 열기</a></html>\n',
  );
  return { videos, drafts, referenceLibrary, warnings, file: join(outDir, "videos.html") };
}
