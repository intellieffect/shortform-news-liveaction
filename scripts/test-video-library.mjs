import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Script } from "node:vm";
import {
  collectVideos,
  buildVideoLibrary,
  readProductionPrompt,
} from "./lib/video-library.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "video-library-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, value) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), value);
  };
  const pilot = (id, changes = {}) => {
    const p = {
      id,
      title: id,
      status: "delivered",
      delivered: "2026-09-07",
      article: { url: "https://www.hani.co.kr/article" },
      versions: [
        {
          label: "final_v1",
          file: `out/pilots/${id}/deliver/v1/${id}.mp4`,
          duration_sec: 60,
        },
      ],
      ...changes,
    };
    put(`pilots/${id}/pilot.json`, JSON.stringify(p));
    return p;
  };
  return {
    root,
    put,
    pilot,
    collect: () => collectVideos({ root, roots: [root] }),
  };
}

test("완성 상태 + 대표 파일이 있는 영상만 표시하고 검토·실험 파일은 제외", (t) => {
  const f = fixture(t);
  for (const id of ["done", "review", "missing"])
    f.pilot(id, id === "review" ? { status: "review" } : {});
  for (const id of ["done", "review"])
    f.put(`out/pilots/${id}/deliver/v1/${id}.mp4`, "video");
  f.put("out/experiments/current.mp4", "experiment");
  assert.deepEqual(
    f.collect().videos.map((v) => v.id),
    ["done"],
  );
  assert.match(
    f.collect().warnings.join("\n"),
    /대표 완성 영상 파일이 없습니다/,
  );
});

test("LATEST 우선, 대표 파일 유실 시 이전 완성본으로 조용히 바꾸지 않음", (t) => {
  const f = fixture(t);
  const versions = [1, 2].map((n) => ({
    label: `final_v${n}`,
    file: `out/pilots/done/deliver/v${n}/done.mp4`,
  }));
  f.pilot("done", { versions });
  f.put(versions[0].file, "video");
  symlinkSync("v1", join(f.root, "out/pilots/done/deliver/LATEST"));
  assert.match(f.collect().videos[0].src, /v1/);
  rmSync(join(f.root, "out/pilots/done/deliver/LATEST"));
  symlinkSync("v2", join(f.root, "out/pilots/done/deliver/LATEST"));
  assert.equal(f.collect().videos.length, 0);
});

test("제작 완료일 미등록을 추정하지 않고 새 완성본의 명시적 날짜를 우선", (t) => {
  const f = fixture(t);
  f.pilot("unknown", { delivered: null, started: "2026-01-01" });
  const p = f.pilot("known");
  p.versions[0].completed_at = "2026-09-08T00:00:00Z";
  f.put("pilots/known/pilot.json", JSON.stringify(p));
  for (const id of ["unknown", "known"])
    f.put(`out/pilots/${id}/deliver/v1/${id}.mp4`, "video");
  assert.deepEqual(
    f.collect().videos.map((v) => v.completed),
    ["2026-09-08", null],
  );
});

test("다른 체크아웃의 실물을 찾아 인코딩한 상대 링크 생성, 원문 JSON 보존", (t) => {
  const f = fixture(t);
  f.pilot("done", { article: { url: "javascript:alert(1)" } });
  const other = join(f.root, "other checkout");
  f.put("other checkout/out/pilots/done/deliver/v1/done.mp4", "video");
  const article = JSON.stringify({
    title: "기사 원제",
    reporterList: '[{"name":"기자"}]',
    createDate: "2026-08-01",
  });
  f.put("news/done/01_input/01_원문_기사/source.article.json", article);
  const [v] = collectVideos({ root: f.root, roots: [f.root, other] }).videos;
  assert.equal(v.articleTitle, "기사 원제");
  assert.equal(v.author, "기자");
  assert.equal(v.articleUrl, null);
  assert.match(v.src, /other%20checkout/);
  assert.equal(
    readFileSync(
      join(f.root, "news/done/01_input/01_원문_기사/source.article.json"),
      "utf8",
    ),
    article,
  );
});

test("기사 URL 전체와 URL의 기사 번호를 검색 색인에 포함", (t) => {
  const f = fixture(t);
  const articleUrl =
    "https://www.hani.co.kr/arti/science/science_general/1273728.html";
  f.pilot("done", { article: { url: articleUrl } });
  f.put("out/pilots/done/deliver/v1/done.mp4", "video");
  const [video] = f.collect().videos;
  assert.equal(video.articleUrl, articleUrl);
  assert.ok(video.searchText.includes(articleUrl));
  assert.ok(video.searchText.includes("1273728"));
});

test("생성 HTML은 독립 실행 가능하며 제목의 script 탈출 방지, 기존 주소 연결", (t) => {
  const f = fixture(t);
  f.pilot("done", { title: "</script><script>alert(1)</script>" });
  f.put("out/pilots/done/deliver/v1/done.mp4", "video");
  const { file } = buildVideoLibrary({ root: f.root, roots: [f.root] });
  const html = readFileSync(file, "utf8");
  const data = html.match(
    /<script id="library-data" type="application\/json">([\s\S]*?)<\/script>/,
  )[1];
  assert.equal(
    JSON.parse(data).videos[0].title,
    "</script><script>alert(1)</script>",
  );
  assert.ok(!data.includes("<"));
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  assert.ok(!html.includes("/* LIBRARY_"));
  assert.match(
    readFileSync(join(f.root, "out/gallery.html"), "utf8"),
    /url=videos.html/,
  );
});

test("로컬 서버: 다운로드 헤더·탐색 재생·등록되지 않은 파일 차단·새 완료 등록 갱신", async (t) => {
  const { createVideoLibraryServer } =
    await import("./lib/video-library-server.mjs");
  const f = fixture(t);
  f.pilot("done");
  f.put("out/pilots/done/deliver/v1/done.mp4", "0123456789");
  f.put("out/private.txt", "not public");
  const server = createVideoLibraryServer({ root: f.root, roots: [f.root] });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const file = `${base}/pilots/done/deliver/v1/done.mp4`;
  const download = await fetch(file + "?download=1");
  assert.match(download.headers.get("content-disposition"), /attachment/);
  assert.equal(await download.text(), "0123456789");
  const partial = await fetch(file, { headers: { range: "bytes=2-5" } });
  assert.equal(partial.status, 206);
  assert.equal(await partial.text(), "2345");
  assert.equal(
    (await fetch(file, { headers: { range: "bytes=99-" } })).status,
    416,
  );
  assert.equal((await fetch(base + "/private.txt")).status, 404);
  f.pilot("new_done");
  f.put("out/pilots/new_done/deliver/v1/new_done.mp4", "new");
  assert.match(await (await fetch(base + "/videos.html")).text(), /new_done/);
  assert.equal(
    await (
      await fetch(base + "/pilots/new_done/deliver/v1/new_done.mp4")
    ).text(),
    "new",
  );
});

test("썸네일은 현재 완성본 폴더의 지정 파일만 수집하고 후보·검토 이미지는 제외", (t) => {
  const f = fixture(t);
  f.pilot("done");
  f.put("out/pilots/done/deliver/v1/done.mp4", "video");
  for (const name of [
    "A.png",
    "B.png",
    "cover.jpg",
    "review.png",
    "썸네일_A.png",
    "썸네일_B.png",
    "커버_최종.png",
  ])
    f.put(`out/pilots/done/deliver/v1/${name}`, "image");
  f.put("out/pilots/done/thumbnails/v2/C.png", "draft");
  assert.deepEqual(
    f.collect().videos[0].thumbnails.map((t) => t.filename),
    [
      "A.png",
      "B.png",
      "cover.jpg",
      "썸네일_A.png",
      "썸네일_B.png",
      "커버_최종.png",
    ],
  );
});

test("확정 썸네일은 완성본 밖에 있어도 예전 커버보다 우선하고 미확정 후보는 제외", (t) => {
  const f = fixture(t);
  const approved = "out/pilots/done/thumbnails/v1/A.png";
  const draft = "out/pilots/done/thumbnails/v1/B.png";
  f.pilot("done", {
    thumbnails: {
      candidates: [
        { id: "B", file: draft, status: "reviewed" },
        { id: "A", file: approved, status: "approved" },
      ],
    },
  });
  f.put("out/pilots/done/deliver/v1/done.mp4", "video");
  f.put("out/pilots/done/deliver/v1/cover.png", "old-cover");
  f.put(approved, "approved-cover");
  f.put(draft, "draft-cover");
  const [video] = f.collect().videos;
  assert.equal(video.poster, "pilots/done/thumbnails/v1/A.png");
  assert.deepEqual(
    video.thumbnails.map((t) => t.src),
    [video.poster],
  );
});

test("확정 썸네일이 없거나 잘못된 경로면 예전 커버로 되돌리지 않고 경고", (t) => {
  const f = fixture(t);
  f.put("out/pilots/done/deliver/v1/done.mp4", "video");
  f.put("out/pilots/done/deliver/v1/cover.png", "old-cover");
  for (const file of [
    "out/pilots/done/thumbnails/v1/missing.png",
    "out/pilots/done/../../private.png",
    "out/pilots/another/cover.png",
    "out/pilots/done/private.txt",
  ]) {
    f.pilot("done", {
      thumbnails: { candidates: [{ id: "A", file, status: "approved" }] },
    });
    const { videos, warnings } = f.collect();
    assert.equal(videos[0].poster, null);
    assert.deepEqual(videos[0].thumbnails, []);
    assert.match(warnings.join("\n"), /확정 썸네일/);
  }
});

test("미확정 기록은 기존 커버를 유지하고 확정 파일은 다른 체크아웃에서도 찾음", (t) => {
  const f = fixture(t);
  const file = "out/pilots/done/thumbnails/v1/A.png";
  const pilot = f.pilot("done", {
    thumbnails: { candidates: [{ id: "A", file, status: "reviewed" }] },
  });
  f.put("out/pilots/done/deliver/v1/done.mp4", "video");
  f.put("out/pilots/done/deliver/v1/cover.png", "old-cover");
  f.put(`other checkout/${file}`, "approved-cover");
  const collect = () =>
    collectVideos({
      root: f.root,
      roots: [f.root, join(f.root, "other checkout")],
    }).videos[0];
  assert.equal(collect().poster, "pilots/done/deliver/v1/cover.png");
  pilot.thumbnails.candidates[0].status = "approved";
  f.put("pilots/done/pilot.json", JSON.stringify(pilot));
  assert.equal(
    collect().poster,
    "../other%20checkout/out/pilots/done/thumbnails/v1/A.png",
  );
  assert.equal(collect().thumbnails.length, 1);
});

test("썸네일 확정 후 목록 새로고침·이미지 다운로드·영상 ZIP이 함께 갱신", async (t) => {
  const { execFileSync } = await import("node:child_process");
  const { createVideoLibraryServer } =
    await import("./lib/video-library-server.mjs");
  const f = fixture(t);
  const pilot = f.pilot("done");
  f.put("out/pilots/done/deliver/v1/done.mp4", "video-original");
  f.put("out/pilots/done/deliver/v1/cover.png", "old-cover");
  const server = createVideoLibraryServer({ root: f.root, roots: [f.root] });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const file = "out/pilots/done/thumbnails/v1/A.png";
  f.put(file, "approved-cover");
  pilot.thumbnails = { candidates: [{ id: "A", file, status: "approved" }] };
  f.put("pilots/done/pilot.json", JSON.stringify(pilot));
  const html = await (await fetch(base + "/videos.html")).text();
  const data = JSON.parse(
    html.match(
      /<script id="library-data" type="application\/json">([\s\S]*?)<\/script>/,
    )[1],
  );
  assert.equal(data.videos[0].poster, "pilots/done/thumbnails/v1/A.png");
  const image = await fetch(base + "/" + data.videos[0].poster + "?download=1");
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-disposition"), /A.png/);
  assert.equal(await image.text(), "approved-cover");
  assert.equal(
    (await fetch(base + "/pilots/done/deliver/v1/cover.png")).status,
    404,
  );
  const response = await fetch(base + "/api/videos/done/bundle");
  assert.equal(response.status, 200);
  const zip = join(f.root, "approved-bundle.zip");
  writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
  assert.deepEqual(
    execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
      .trim()
      .split("\n"),
    ["done.mp4", "A.png"],
  );
  assert.equal(
    execFileSync("unzip", ["-p", zip, "A.png"], { encoding: "utf8" }),
    "approved-cover",
  );
});

test("부속 파일: ZIP 내용·개별 이미지·미등록 처리·파일 위치·폴더 열기와 외부 호출 차단", async (t) => {
  const { execFileSync } = await import("node:child_process");
  const { createVideoLibraryServer } =
    await import("./lib/video-library-server.mjs");
  const f = fixture(t);
  f.pilot("done");
  f.pilot("no_thumb");
  f.put("out/pilots/done/deliver/v1/done.mp4", "video-original");
  f.put("out/pilots/no_thumb/deliver/v1/no_thumb.mp4", "video");
  f.put("out/pilots/done/deliver/v1/A.png", "image-a");
  f.put("out/pilots/done/deliver/v1/B.png", "image-b");
  f.put("out/pilots/done/deliver/v1/썸네일_C.png", "image-c");
  f.put("out/pilots/done/deliver/v1/private.txt", "private");
  const opened = [];
  const server = createVideoLibraryServer({
    root: f.root,
    roots: [f.root],
    openFolder: async (folder) => opened.push(folder),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`,
    api = base + "/api/videos/done/";
  for (const kind of ["bundle", "thumbnails"]) {
    const response = await fetch(api + kind);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/zip");
    const zip = join(f.root, kind + ".zip");
    writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
    const names = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
      .trim()
      .split("\n");
    assert.deepEqual(
      names,
      kind === "bundle"
        ? ["done.mp4", "A.png", "B.png", "done_thumbnail_03.png"]
        : ["A.png", "B.png", "done_thumbnail_03.png"],
    );
    assert.equal(
      execFileSync("unzip", ["-p", zip, "B.png"], { encoding: "utf8" }),
      "image-b",
    );
    assert.equal(
      execFileSync("unzip", ["-p", zip, "done_thumbnail_03.png"], {
        encoding: "utf8",
      }),
      "image-c",
    );
    if (kind === "bundle")
      assert.equal(
        execFileSync("unzip", ["-p", zip, "done.mp4"], { encoding: "utf8" }),
        "video-original",
      );
  }
  const thumb = await fetch(base + "/pilots/done/deliver/v1/B.png?download=1");
  assert.match(thumb.headers.get("content-disposition"), /B.png/);
  assert.equal(await thumb.text(), "image-b");
  assert.equal((await fetch(base + "/api/videos/no_thumb/bundle")).status, 404);
  assert.equal((await fetch(api + "location")).status, 403);
  const headers = { "X-Library-Action": "1", Origin: base };
  const location = await (await fetch(api + "location", { headers })).json();
  assert.equal(
    location.path,
    join(f.root, "out/pilots/done/deliver/v1/done.mp4"),
  );
  assert.equal((await fetch(api + "open-folder")).status, 405);
  assert.equal(
    (
      await fetch(api + "open-folder", {
        method: "POST",
        headers: { ...headers, Origin: "https://example.com" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(api + "open-folder", { method: "POST" })).status,
    403,
  );
  const { request } = await import("node:http");
  const badHostStatus = await new Promise((resolve, reject) => {
    const req = request(
      api + "open-folder",
      { method: "POST", headers: { ...headers, Host: "evil.example" } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(badHostStatus, 403);
  assert.equal(opened.length, 0);
  assert.equal(
    (await fetch(api + "open-folder", { method: "POST", headers })).status,
    200,
  );
  assert.deepEqual(opened, [join(f.root, "out/pilots/done/deliver/v1")]);
  f.pilot("done", { status: "review" });
  assert.equal((await fetch(api + "bundle")).status, 404);
  assert.equal(
    (await fetch(base + "/pilots/done/deliver/v1/done.mp4")).status,
    404,
  );
});

test("제작 프롬프트: 실제 V2 텍스트 정본을 그대로 싣고 없으면 사유를 남긴다", (t) => {
  const f = fixture(t);
  f.pilot("done");
  f.put("out/pilots/done/deliver/v1/done.mp4", "video");
  const missing = readProductionPrompt(f.root);
  assert.equal(missing.text, "");
  assert.match(missing.error, /docs\/PRODUCTION_PROMPT_V2_RESTORED\.txt/);
  assert.ok(
    buildVideoLibrary({ root: f.root, roots: [f.root] }).warnings.some((w) =>
      w.startsWith("제작 프롬프트:"),
    ),
  );
  f.put(
    "docs/PRODUCTION_PROMPT_V2_RESTORED.txt",
    "아래 기사를 제작해줘.\n\n기사: [URL]\n",
  );
  const prompt = readProductionPrompt(f.root);
  assert.equal(prompt.text, "아래 기사를 제작해줘.\n\n기사: [URL]\n");
  assert.equal(prompt.note, "");
  assert.equal(prompt.error, "");
  const { file } = buildVideoLibrary({ root: f.root, roots: [f.root] });
  const html = readFileSync(file, "utf8");
  const data = JSON.parse(
    html.match(
      /<script id="library-data" type="application\/json">([\s\S]*?)<\/script>/,
    )[1],
  );
  assert.equal(data.prompt.text, prompt.text);
  assert.equal(data.prompt.source, "docs/PRODUCTION_PROMPT_V2_RESTORED.txt");
  // 탭 두 개와 프롬프트 화면이 한 파일 안에 함께 실린다.
  assert.match(html, /id="tab-prompt"/);
  assert.match(html, /id="view-prompt"/);
  assert.match(html, /id="prompt-copy"/);
});
