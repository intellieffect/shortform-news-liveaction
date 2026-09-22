// 로컬 영상 보관함: 목록에 등록된 파일만 제공하고 재생 구간 요청·다운로드를 지원한다.
import { createServer } from "node:http";
import { createReadStream, statSync, readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join, extname, dirname, basename } from "node:path";
import { buildVideoLibrary } from "./video-library.mjs";
import { writeZip } from "./zip-stream.mjs";

const run = promisify(execFile);
// 압축 프로그램마다 한글 파일명 해석이 달라서, ZIP 안에서만 쓸 이름을 따로 정한다.
// 원본 파일은 건드리지 않고 이름만 붙여 보낸다.
function zipEntries(files, id) {
  let thumbnail = 0;
  const entries = [];
  const used = new Set();
  // 같은 이름이 두 번 들어가면 푸는 쪽이 조용히 하나를 덮어쓴다 — 서로 다른 폴더의
  // 확정 썸네일이 둘 다 cover.png 인 경우가 실제로 있다. 이름을 붙일 때마다 중복을 본다.
  const unique = (stem, ext) => {
    let name = stem + ext;
    for (let suffix = 1; used.has(name); suffix++) name = `${stem}_${suffix}${ext}`;
    used.add(name);
    return name;
  };
  for (const file of files) {
    const isVideo = extname(file).toLowerCase() === ".mp4";
    const ext = extname(file).toLowerCase();
    if (!isVideo) thumbnail++;
    if (/^[\x20-\x7e]+$/.test(basename(file))) {
      const plain = basename(file);
      entries.push({
        path: file,
        name: unique(plain.slice(0, plain.length - extname(plain).length), extname(plain)),
      });
      continue;
    }
    const stem = isVideo
      ? id
      : `${id}_thumbnail_${String(thumbnail).padStart(2, "0")}`;
    entries.push({ path: file, name: unique(stem, ext) });
  }
  return entries;
}

async function revealFolder(folder) {
  if (process.platform === "darwin") await run("open", [folder]);
  else if (process.platform === "win32") await run("explorer.exe", [folder]);
  else await run("xdg-open", [folder]);
}

export function createVideoLibraryServer({
  root,
  roots,
  openFolder = revealFolder,
}) {
  const outDir = join(root, "out");
  const assets = new Map();
  const entries = new Map();
  const filePath = (src) => resolve(outDir, decodeURIComponent(src));
  const sendJSON = (res, status, value) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  };
  function refresh() {
    const library = buildVideoLibrary({ root, roots, localTools: true });
    assets.clear();
    entries.clear();
    for (const video of library.videos) {
      entries.set(video.id, video);
      for (const src of [
        video.src,
        video.poster,
        ...video.thumbnails.map((t) => t.src),
      ].filter(Boolean)) {
        assets.set(
          new URL(src, "http://localhost/videos.html").pathname,
          resolve(outDir, decodeURIComponent(src)),
        );
      }
    }
    for (const item of library.referenceLibrary.cases) {
      for(const src of [item.src,item.poster,item.walkthrough,item.credits,item.sourceGuide]) {
        assets.set(new URL(src,"http://localhost/videos.html").pathname, filePath(src));
      }
    }
    return library;
  }
  refresh();
  return createServer(async (req, res) => {
    // DNS 재바인딩과 다른 웹사이트의 로컬 명령 호출을 차단한다.
    const host = req.headers.host ?? "";
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const url = new URL(req.url, `http://${host}`);
    const action =
      /^\/api\/videos\/([a-z0-9_]+)\/(bundle|thumbnails|location|open-folder)$/.exec(
        url.pathname,
      );
    if (action) {
      const [, id, kind] = action;
      const method = kind === "open-folder" ? "POST" : "GET";
      if (req.method !== method) {
        res.writeHead(405, { Allow: method });
        res.end();
        return;
      }
      if (
        ["location", "open-folder"].includes(kind) &&
        (req.headers["x-library-action"] !== "1" ||
          (req.headers.origin && req.headers.origin !== url.origin) ||
          req.headers["sec-fetch-site"] === "cross-site")
      ) {
        sendJSON(res, 403, { error: "이 영상 목록에서 실행해 주세요." });
        return;
      }
      try {
        refresh();
        const video = entries.get(id);
        if (!video) {
          sendJSON(res, 404, {
            error: "영상 파일을 찾을 수 없습니다. 목록을 새로고침해 주세요.",
          });
          return;
        }
        const file = filePath(video.src);
        if (kind === "location") {
          sendJSON(res, 200, { path: file });
          return;
        }
        if (kind === "open-folder") {
          await openFolder(dirname(file));
          sendJSON(res, 200, { ok: true });
          return;
        }
        if (!video.thumbnails.length) {
          sendJSON(res, 404, { error: "등록된 썸네일이 없습니다." });
          return;
        }
        const files = [
          ...(kind === "bundle" ? [file] : []),
          ...video.thumbnails.map((t) => filePath(t.src)),
        ];
        // MP4·이미지는 이미 압축되어 있으므로 저장 방식으로 그대로 흘려보낸다.
        // 외부 zip 명령을 쓰지 않는다 — Windows에는 없다.
        const prepared = zipEntries(files, video.id);
        for (const entry of prepared) statSync(entry.path); // 헤더를 쓰기 전에 전부 있는지 본다
        if (res.destroyed) return;
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(video.filename.replace(/\.mp4$/i, "") + (kind === "bundle" ? "_package.zip" : "_thumbnails.zip"))}`,
          "Cache-Control": "no-store",
        });
        try {
          await writeZip(res, prepared);
          res.end();
        } catch {
          if (!res.writableEnded) res.destroy();
        }
      } catch {
        sendJSON(res, 500, {
          error: "파일 작업을 완료하지 못했습니다. 파일 위치를 확인해 주세요.",
        });
      }
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    try {
      const url = new URL(req.url, "http://localhost");
      if (["/", "/videos.html", "/gallery.html"].includes(url.pathname)) {
        const library = refresh();
        const body = readFileSync(library.file);
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": body.length,
          "Cache-Control": "no-store",
        });
        res.end(req.method === "HEAD" ? undefined : body);
        return;
      }
      const file = assets.get(url.pathname);
      if (!file) {
        res.writeHead(404);
        res.end();
        return;
      }
      const { size } = statSync(file);
      const headers = {
        "Content-Type":
          {
            ".mp4": "video/mp4",
            ".md": "text/plain; charset=utf-8",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
          }[extname(file).toLowerCase()] ?? "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      };
      if (url.searchParams.has("download"))
        headers["Content-Disposition"] =
          `attachment; filename*=UTF-8''${encodeURIComponent(file.split("/").at(-1))}`;
      let start = 0,
        end = size - 1,
        status = 200;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (match && (match[1] || match[2])) {
          start = match[1]
            ? Number(match[1])
            : Math.max(0, size - Number(match[2]));
          end =
            match[1] && match[2]
              ? Math.min(size - 1, Number(match[2]))
              : size - 1;
        } else start = size;
        if (
          start >= size ||
          end < start ||
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end)
        ) {
          res.writeHead(416, { "Content-Range": `bytes */${size}` });
          res.end();
          return;
        }
        status = 206;
        headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      }
      headers["Content-Length"] = Math.max(0, end - start + 1);
      res.writeHead(status, headers);
      if (req.method === "HEAD" || !size) {
        res.end();
        return;
      }
      const stream = createReadStream(file, { start, end });
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      if (!res.headersSent) res.writeHead(error.code === "ENOENT" ? 404 : 500);
      res.end();
    }
  });
}
