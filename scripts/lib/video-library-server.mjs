// 로컬 영상 보관함: 목록에 등록된 파일만 제공하고 재생 구간 요청·다운로드를 지원한다.
import { createServer } from "node:http";
import { createReadStream, statSync, readFileSync } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, extname, dirname, basename } from "node:path";
import { buildVideoLibrary } from "./video-library.mjs";

const run = promisify(execFile);
// 시스템 zip의 한글 파일명 호환 차이를 피한다. 원본은 두고 ZIP 안의 이름만 정한다.
async function zipPaths(files, id) {
  const temp = await mkdtemp(join(tmpdir(), "video-library-zip-"));
  const cleanup = () =>
    rm(temp, { recursive: true, force: true }).catch(() => {});
  try {
    let thumbnail = 0;
    const paths = [];
    const used = new Set(
      files
        .map((file) => basename(file))
        .filter((name) => /^[\x20-\x7e]+$/.test(name)),
    );
    for (const file of files) {
      const isVideo = extname(file).toLowerCase() === ".mp4";
      if (!isVideo) thumbnail++;
      if (/^[\x20-\x7e]+$/.test(basename(file))) {
        paths.push(file);
        continue;
      }
      const stem = isVideo
        ? id
        : `${id}_thumbnail_${String(thumbnail).padStart(2, "0")}`;
      let name = stem + extname(file).toLowerCase(),
        suffix = 1;
      while (used.has(name))
        name = `${stem}_${suffix++}${extname(file).toLowerCase()}`;
      used.add(name);
      const target = join(temp, name);
      await copyFile(file, target);
      paths.push(target);
    }
    return { paths, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
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
        // MP4·이미지는 이미 압축되어 있으므로 재압축 없이 스트리밍한다. 셸을 거치지 않는다.
        const prepared = await zipPaths(files, video.id);
        if (res.destroyed) {
          await prepared.cleanup();
          return;
        }
        const zip = spawn("zip", ["-j", "-0", "-q", "-", ...prepared.paths], {
          stdio: ["ignore", "pipe", "ignore"],
        });
        zip.once("error", () => {
          if (!res.headersSent)
            sendJSON(res, 500, {
              error:
                "묶음 다운로드를 준비하지 못했습니다. 개별 파일을 받아 주세요.",
            });
          else res.destroy();
        });
        zip.once("spawn", () => {
          res.writeHead(200, {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(video.filename.replace(/\.mp4$/i, "") + (kind === "bundle" ? "_package.zip" : "_thumbnails.zip"))}`,
            "Cache-Control": "no-store",
          });
          zip.stdout.pipe(res, { end: false });
        });
        zip.once("close", (code) => {
          void prepared.cleanup();
          if (code === 0) res.end();
          else if (!res.writableEnded) res.destroy();
        });
        res.once("close", () => {
          if (zip.exitCode === null) zip.kill();
        });
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
