/**
 * fetch-assets 회귀 — 동시 다운로드·실패 판정·경계 검사.
 * 인터넷에 나가지 않는다. 전부 localhost 서버와 임시 편 폴더로 실측한다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildUrlIndex,
  collectAssets,
  downloadAll,
  downloadOne,
  episodePath,
  parseArgs,
  planAssets,
  readManifest,
  resolveUrl,
} from "../scripts/lib/asset-download.mjs";

const CLI = new URL("../scripts/fetch-assets.mjs", import.meta.url).pathname;
const parts = dst => existsSync(dirname(dst)) ? readdirSync(dirname(dst)).filter(name => name.startsWith(basename(dst) + ".") && name.endsWith(".part")) : [];
const PAYLOAD = Buffer.alloc(4096, 7);

const put = (root, p, v) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(
    join(root, p),
    typeof v === "string" || Buffer.isBuffer(v) ? v : JSON.stringify(v),
  );
  return join(root, p);
};

const waitFor = async (cond, why, ms = 3000) => {
  for (let i = 0; i < ms / 10; i += 1) {
    if (cond()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail(why);
};

const episode = (t) => {
  const root = mkdtempSync(join(tmpdir(), "fetch-assets-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

/** 지연·실패 경로를 갖춘 로컬 서버. `state.max` 가 실제로 겹친 최대 요청 수다. */
async function server(t, { delayMs = 120 } = {}) {
  const state = { live: 0, max: 0, hits: [], release: null, started: null };
  let startedResolve;
  state.started = new Promise((r) => (startedResolve = r));
  const held = new Promise((r) => (state.release = r));
  const s = createServer(async (req, res) => {
    state.hits.push(req.url);
    const path = req.url.split("?")[0];
    if (path.startsWith("/slow")) {
      state.live += 1;
      state.max = Math.max(state.max, state.live);
      await new Promise((r) => setTimeout(r, delayMs));
      state.live -= 1;
      res.writeHead(200, { "content-type": "application/octet-stream" });
      return res.end(PAYLOAD);
    }
    if (path === "/ok") return res.writeHead(200).end(PAYLOAD);
    if (path === "/404")
      return res
        .writeHead(404, { "content-type": "text/html" })
        .end("<!doctype html><h1>404</h1>");
    if (path === "/500") return res.writeHead(500).end("nope");
    if (path === "/html200")
      return res
        .writeHead(200, { "content-type": "text/html; charset=utf-8" })
        .end("<!doctype html>" + "x".repeat(4096));
    if (path === "/html-sniff")
      return res
        .writeHead(200, { "content-type": "application/octet-stream" })
        .end(
          "<!DOCTYPE HTML><html><body>" + "y".repeat(4096) + "</body></html>",
        );
    if (path === "/tiny") return res.writeHead(200).end("too small");
    if (path === "/hang") {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.write(PAYLOAD.subarray(0, 100));
      return; // 끝내지 않는다 — 타임아웃 몫
    }
    if (path === "/reset") {
      res.writeHead(200, { "content-length": String(PAYLOAD.length * 2) });
      res.write(PAYLOAD);
      return req.socket.destroy();
    }
    if (path === "/hold") {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.write(PAYLOAD);
      startedResolve();
      await held;
      return res.end(PAYLOAD);
    }
    res.writeHead(404).end("no route");
  });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  // keep-alive 소켓과 끝내지 않은 `/hang` 응답이 남으면 close 가 영영 안 끝난다
  t.after(() => {
    s.closeAllConnections();
    s.close();
  });
  return { state, base: `http://127.0.0.1:${s.address().port}` };
}

// ── 인자 검사 ────────────────────────────────────────────────────────────────
test("--jobs 는 1..16 정수만 받는다", () => {
  assert.equal(parseArgs(["news/x"]).jobs, 4);
  assert.equal(parseArgs(["news/x", "--jobs", "8"]).jobs, 8);
  assert.equal(parseArgs(["news/x", "--jobs=2"]).jobs, 2);
  for (const bad of ["abc", "0", "-1", "2.5", "1e2", "", "99"])
    assert.throws(
      () => parseArgs(["news/x", "--jobs", bad]),
      /--jobs 값 오류/,
      `허용됨: ${bad}`,
    );
  assert.throws(() => parseArgs(["news/x", "--jobs"]), /--jobs 값 오류/);
  assert.throws(() => parseArgs(["news/x", "--nope"]), /알 수 없는 인자/);
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(["--jobs", "2"]), /usage/);
});

test("--dry·--force·--manifest 를 함께 읽는다", () => {
  const o = parseArgs([
    "news/x",
    "--dry",
    "--force",
    "--manifest",
    "00_brief/w1.json",
  ]);
  assert.equal(o.dry, true);
  assert.equal(o.force, true);
  assert.equal(o.manifest, "00_brief/w1.json");
  assert.equal(
    parseArgs(["news/x", "--manifest=a/b.json"]).manifest,
    "a/b.json",
  );
  assert.throws(() => parseArgs(["news/x", "--manifest"]), /값 없음/);
  assert.throws(() => parseArgs(["news/x", "--manifest", "--dry"]), /값 없음/);
});

// ── 경로 경계 ────────────────────────────────────────────────────────────────
test("편 밖을 가리키는 경로는 거부한다", (t) => {
  const root = episode(t);
  const outside = mkdtempSync(join(tmpdir(), "fetch-assets-out-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, "secret.txt"), "건드리지 말 것");
  symlinkSync(outside, join(root, "escape"));
  symlinkSync(join(outside, "secret.txt"), join(root, "link.txt"));

  assert.equal(
    episodePath(root, "02_production/a.mp4"),
    join(realpathSync(root), "02_production/a.mp4"),
  );
  for (const bad of [
    "../evil.txt",
    "02_production/../../evil.txt",
    join(outside, "secret.txt"),
    "escape/secret.txt",
    "link.txt",
    "a\\b.txt",
    "",
  ])
    assert.throws(() => episodePath(root, bad), /거부|없음/, `통과됨: ${bad}`);
});

// ── URL 색인 ────────────────────────────────────────────────────────────────
test("기존 URL 색인 네 갈래가 그대로 동작한다", (t) => {
  const root = episode(t);
  put(root, "02_production/external_assets/_search/nasaimg_assets.json", {
    PIA12345: {
      chosen: "https://images-assets.nasa.gov/image/PIA12345/orig.jpg",
    },
  });
  put(root, "02_production/external_assets/_search/svs_item_20246.json", {
    media_groups: [
      {
        items: [
          {
            instance: {
              url: "https://svs.gsfc.nasa.gov/vis/a/bubble_1080.mp4",
            },
          },
        ],
      },
    ],
  });
  put(root, "01_input/01_원문_기사/kbs.article.json", {
    imageList: [
      { url: "https://flexible.img.hani.co.kr/one.jpg" },
      { url: "https://flexible.img.hani.co.kr/two.jpg" },
    ],
  });
  const index = buildUrlIndex(root);

  const at = (asset) => resolveUrl(asset, index);
  assert.equal(
    at({ path: "02_production/external_assets/svs/svs20246__bubble_1080.mp4" })
      .url,
    "https://svs.gsfc.nasa.gov/vis/a/bubble_1080.mp4",
  );
  assert.equal(
    at({
      path: "02_production/external_assets/svs/renamed.mp4",
      source_file: "bubble_1080.mp4",
    }).url,
    "https://svs.gsfc.nasa.gov/vis/a/bubble_1080.mp4",
  );
  assert.equal(
    at({ path: "02_production/external_assets/nasa/x.jpg", ref: "PIA12345" })
      .url,
    "https://images-assets.nasa.gov/image/PIA12345/orig.jpg",
  );
  assert.equal(
    at({ path: "01_input/05_참고자료/hani_published/img2_caption.jpg" }).url,
    "https://flexible.img.hani.co.kr/two.jpg",
  );
  assert.equal(
    at({ path: "02_production/audio/mixkit-deep-urban-570.mp3" }).url,
    "https://assets.mixkit.co/music/570/570.mp3",
  );
  assert.equal(
    at({ path: "02_production/external_assets/unknown.mp4" }).url,
    null,
  );
});

test("명시된 source_url·url 이 색인보다 먼저다", (t) => {
  const root = episode(t);
  put(root, "02_production/external_assets/_search/nasaimg_assets.json", {
    PIA1: { chosen: "https://images-assets.nasa.gov/PIA1.jpg" },
  });
  const index = buildUrlIndex(root);
  assert.equal(
    resolveUrl(
      {
        path: "02_production/a.jpg",
        ref: "PIA1",
        source_url: "https://example.org/a.jpg",
      },
      index,
    ).url,
    "https://example.org/a.jpg",
  );
  assert.equal(
    resolveUrl(
      { path: "02_production/a.jpg", url: "http://example.org/b.jpg" },
      index,
    ).url,
    "http://example.org/b.jpg",
  );
  for (const bad of [
    "ftp://example.org/a.jpg",
    "file:///etc/passwd",
    "example.org/a.jpg",
    42,
    "",
  ])
    assert.match(
      resolveUrl({ path: "02_production/a.jpg", source_url: bad }, index)
        .error ?? "",
      /source_url 형식 오류/,
    );
});

// ── 계획 ────────────────────────────────────────────────────────────────────
test("이미 있는 원본은 --force 라도 덮어쓰지 않는다", (t) => {
  const root = episode(t);
  const dst = put(
    root,
    "02_production/external_assets/svs/keep.mp4",
    "받아 둔 원본",
  );
  const assets = [
    {
      id: "keep",
      path: "02_production/external_assets/svs/keep.mp4",
      source_url: "https://example.org/x.mp4",
    },
  ];
  for (const force of [false, true]) {
    const plan = planAssets({
      root,
      assets,
      index: buildUrlIndex(root),
      force,
    });
    assert.equal(plan.downloads.length, 0);
    assert.equal(plan.reused.length, 1);
    assert.equal(readFileSync(dst, "utf8"), "받아 둔 원본");
  }
});

test("경로 탈출·파생 위치 위반은 거부로 쌓인다", (t) => {
  const root = episode(t);
  put(root, "02_production/external_assets/src.mp4", "원본");
  const plan = planAssets({
    root,
    index: buildUrlIndex(root),
    assets: [
      {
        id: "escape",
        path: "../evil.mp4",
        source_url: "https://example.org/x.mp4",
      },
      {
        id: "abs",
        path: "/tmp/evil.mp4",
        source_url: "https://example.org/x.mp4",
      },
      {
        id: "bad-derive",
        path: "01_input/05_참고자료/crop.jpg",
        derive: {
          from: "02_production/external_assets/src.mp4",
          ffmpeg: "-frames:v 1",
        },
      },
      {
        id: "derive-escape",
        path: "02_production/crop.jpg",
        derive: { from: "../../etc/passwd", ffmpeg: "-frames:v 1" },
      },
      {
        id: "ok-derive",
        path: "02_production/ok.jpg",
        derive: {
          from: "02_production/external_assets/src.mp4",
          ffmpeg: "-frames:v 1",
        },
      },
    ],
  });
  assert.deepEqual(
    plan.refused.map((r) => r.a.id),
    ["escape", "abs", "bad-derive", "derive-escape"],
  );
  assert.deepEqual(
    plan.derived.map((d) => d.a.id),
    ["ok-derive"],
  );
  assert.equal(existsSync(join(dirname(root), "evil.mp4")), false);
});

// ── 실제 동시성 ──────────────────────────────────────────────────────────────
test("워커가 실제로 겹쳐 받는다 — 1 < 동시 <= jobs", async (t) => {
  const root = episode(t);
  const { state, base } = await server(t, { delayMs: 120 });
  const downloads = Array.from({ length: 9 }, (_, i) => ({
    a: { id: `c${i}` },
    dst: join(root, `02_production/external_assets/c${i}.mp4`),
    url: `${base}/slow?i=${i}`,
  }));
  const results = await downloadAll(downloads, { jobs: 3 });

  assert.equal(results.filter((r) => r.ok).length, 9);
  assert.ok(state.max > 1, `동시 실행이 없다 (max=${state.max})`);
  assert.ok(state.max <= 3, `jobs 초과 (max=${state.max})`);
  // Server-observed concurrent requests prove overlap without a machine-speed threshold.
  for (const d of downloads)
    assert.equal(readFileSync(d.dst).length, PAYLOAD.length);
});

test("jobs=1 이면 한 번에 하나만 연다", async (t) => {
  const root = episode(t);
  const { state, base } = await server(t, { delayMs: 40 });
  await downloadAll(
    Array.from({ length: 4 }, (_, i) => ({
      a: { id: `s${i}` },
      dst: join(root, `02_production/s${i}.mp4`),
      url: `${base}/slow?i=${i}`,
    })),
    { jobs: 1 },
  );
  assert.equal(state.max, 1);
});

// ── 실패 판정 ────────────────────────────────────────────────────────────────
test("HTTP 실패·HTML·소용량·끊김·타임아웃을 성공으로 적지 않는다", async (t) => {
  const root = episode(t);
  const { base } = await server(t);
  const cases = [
    ["404", `${base}/404`, /HTTP 404/],
    ["500", `${base}/500`, /HTTP 500/],
    ["html200", `${base}/html200`, /HTML 응답/],
    ["htmlsniff", `${base}/html-sniff`, /HTML 응답/],
    ["tiny", `${base}/tiny`, /바이트/],
    ["reset", `${base}/reset`, /.+/],
    ["dns", "http://127.0.0.1:1/nothing", /.+/],
  ];
  for (const [id, url, why] of cases) {
    const dst = join(root, `02_production/external_assets/${id}.bin`);
    const r = await downloadOne({ a: { id }, dst, url }, { timeoutMs: 3000 });
    assert.equal(r.ok, false, `${id} 이 성공으로 잡혔다`);
    assert.match(r.error, why);
    assert.equal(existsSync(dst), false, `${id}: 실패인데 파일이 남았다`);
    assert.equal(parts(dst).length > 0, false, `${id}: .part 가 남았다`);
  }
});

test("응답이 멈추면 타임아웃으로 실패하고 .part 를 치운다", async (t) => {
  const root = episode(t);
  const { base } = await server(t);
  const dst = join(root, "02_production/external_assets/hang.mp4");
  const r = await downloadOne(
    { a: { id: "hang" }, dst, url: `${base}/hang` },
    { timeoutMs: 300 },
  );
  assert.equal(r.ok, false);
  assert.equal(existsSync(dst), false);
  assert.equal(parts(dst).length > 0, false);
});

test("받는 동안에는 .part 만 있고 끝나야 제자리로 옮긴다", async (t) => {
  const root = episode(t);
  const { state, base } = await server(t);
  const dst = join(root, "02_production/external_assets/hold.mp4");
  const running = downloadOne(
    { a: { id: "hold" }, dst, url: `${base}/hold` },
    { timeoutMs: 9000 },
  );
  await state.started;
  await waitFor(() => parts(dst).length > 0, ".part 로 받지 않았다");
  assert.equal(existsSync(dst), false, "다 받기 전에 최종 파일이 생겼다");
  state.release();
  const r = await running;
  assert.equal(r.ok, true);
  assert.equal(r.size, PAYLOAD.length * 2);
  assert.equal(parts(dst).length > 0, false);
});

// ── manifest ────────────────────────────────────────────────────────────────
test("readManifest 는 편 안의 파일만 읽고 기존 키를 모두 모은다", (t) => {
  const root = episode(t);
  put(root, "01_input/assets.json", {
    assets: [{ id: "a", path: "02_production/a.mp4" }],
    external_assets: [{ id: "b", path: "02_production/b.mp4" }],
    overlay_assets: [{ id: "c", path: "02_production/c.png" }],
    audio_assets: [{ id: "d", path: "02_production/d.mp3" }],
    brief_assets: { free: [{ id: "e", path: "02_production/e.mp4" }] },
  });
  put(root, "00_brief/worker-video.json", {
    assets: [{ id: "w1", path: "02_production/w1.mp4" }],
  });
  assert.deepEqual(
    readManifest(root).map((a) => a.id),
    ["a", "b", "c", "d", "e"],
  );
  assert.deepEqual(
    readManifest(root, "00_brief/worker-video.json").map((a) => a.id),
    ["w1"],
  );
  assert.deepEqual(
    collectAssets([{ id: "bare" }]).map((a) => a.id),
    ["bare"],
  );
  assert.throws(() => readManifest(root, "../../etc/hosts"), /거부/);
  assert.throws(
    () => readManifest(root, "00_brief/none.json"),
    /manifest 없음/,
  );
});

// ── CLI ─────────────────────────────────────────────────────────────────────
/** 같은 프로세스에서 서버가 돌고 있다 — spawnSync 로 막으면 응답을 못 해 서로 굶는다. */
const run = (args) =>
  new Promise((done) => {
    const p = spawn(process.execPath, [CLI, ...args], { encoding: "utf8" });
    let stdout = "",
      stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (status) => done({ status, stdout, stderr }));
  });

test("CLI: 진행 [done/total] 을 찍고 성공하면 0 으로 끝난다", async (t) => {
  const root = episode(t);
  const { base } = await server(t, { delayMs: 30 });
  put(root, "01_input/assets.json", {
    assets: [0, 1, 2, 3].map((i) => ({
      id: `clip${i}`,
      path: `02_production/external_assets/clip${i}.mp4`,
      source_url: `${base}/slow?i=${i}`,
    })),
  });
  const r = await run([root, "--jobs", "3"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\[4\/4\]/);
  assert.match(r.stdout, /fetch-assets: ok 4 · fail 0/);
  for (const i of [0, 1, 2, 3])
    assert.equal(
      existsSync(join(root, `02_production/external_assets/clip${i}.mp4`)),
      true,
    );
});

test("CLI: 실패가 하나라도 있으면 0 이 아니다", async (t) => {
  const root = episode(t);
  const { base } = await server(t);
  put(root, "01_input/assets.json", {
    assets: [
      { id: "good", path: "02_production/good.mp4", source_url: `${base}/ok` },
      { id: "gone", path: "02_production/gone.mp4", source_url: `${base}/404` },
    ],
  });
  const r = await run([root]);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /fetch-assets: ok 1 · fail 1/);
  assert.equal(existsSync(join(root, "02_production/gone.mp4")), false);
});

test("CLI: --dry 는 아무것도 바꾸지 않는다", async (t) => {
  const root = episode(t);
  const { state, base } = await server(t);
  put(root, "01_input/assets.json", {
    assets: [
      { id: "clip", path: "02_production/clip.mp4", source_url: `${base}/ok` },
    ],
  });
  const r = await run([root, "--dry"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\(예행\)/);
  assert.equal(existsSync(join(root, "02_production/clip.mp4")), false);
  assert.equal(state.hits.length, 0, "예행인데 서버를 찔렀다");
});

test("CLI: --manifest 는 그 파일만 쓰고 공용 assets.json 은 읽지 않는다", async (t) => {
  const root = episode(t);
  const { state, base } = await server(t);
  put(root, "01_input/assets.json", {
    assets: [
      {
        id: "shared",
        path: "02_production/shared.mp4",
        source_url: `${base}/404`,
      },
    ],
  });
  put(root, "00_brief/worker-video.json", {
    assets: [
      { id: "mine", path: "02_production/mine.mp4", source_url: `${base}/ok` },
    ],
  });
  const r = await run([root, "--manifest", "00_brief/worker-video.json"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(existsSync(join(root, "02_production/mine.mp4")), true);
  assert.equal(existsSync(join(root, "02_production/shared.mp4")), false);
  assert.deepEqual(state.hits, ["/ok"]);
});

test("CLI: 잘못된 --jobs·편 밖 manifest 는 2 로 멈춘다", async (t) => {
  const root = episode(t);
  put(root, "01_input/assets.json", { assets: [] });
  assert.equal((await run([root, "--jobs", "0"])).status, 2);
  assert.equal((await run([root, "--jobs", "abc"])).status, 2);
  assert.equal((await run([root, "--manifest", "../../etc/hosts"])).status, 2);
  assert.equal((await run([join(root, "없는편")])).status, 2);
});

test("CLI: 편 밖 자산 경로는 거부하고 그 파일을 만들지 않는다", async (t) => {
  const root = episode(t);
  const { base } = await server(t);
  put(root, "01_input/assets.json", {
    assets: [{ id: "escape", path: "../evil.mp4", source_url: `${base}/ok` }],
  });
  const r = await run([root]);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /거부/);
  assert.equal(existsSync(join(dirname(root), "evil.mp4")), false);
});

test("CLI: --force 도 받아 둔 원본을 덮지 않는다", async (t) => {
  const root = episode(t);
  const { state, base } = await server(t);
  const dst = put(root, "02_production/keep.mp4", "받아 둔 원본");
  put(root, "01_input/assets.json", {
    assets: [
      { id: "keep", path: "02_production/keep.mp4", source_url: `${base}/ok` },
    ],
  });
  const r = await run([root, "--force"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(dst, "utf8"), "받아 둔 원본");
  assert.equal(state.hits.length, 0);
  assert.match(r.stdout, /--force 는 원본을 덮지 않는다/);
});


test("internal symlink cannot route a derivative into originals", t => {
  const root = episode(t);
  put(root, "01_input/original.jpg", "preserved");
  mkdirSync(join(root, "02_production"));
  symlinkSync(join(root, "01_input"), join(root, "02_production/alias"));
  const plan = planAssets({root, force: true, assets: [{path: "02_production/alias/original.jpg", derive: {from: "01_input/original.jpg", ffmpeg: "-frames:v 1"}}]});
  assert.equal(plan.derived.length, 0);
  assert.match(plan.refused[0].reason, /심링크/);
});

test("concurrent writers use private partials and cannot overwrite a completed original", async t => {
  const root = episode(t);
  const {state, base} = await server(t);
  const dst = join(root, "02_production/race.mp4");
  const job = {dst, url: `${base}/hold`, a: {id: "race"}};
  const running = Promise.all([downloadOne(job), downloadOne(job)]);
  await state.started;
  await waitFor(() => parts(dst).length === 2, "two private temporary files expected");
  writeFileSync(dst, "original received meanwhile");
  state.release();
  const results = await running;
  assert.ok(results.every(r => !r.ok));
  assert.equal(readFileSync(dst, "utf8"), "original received meanwhile");
  assert.deepEqual(parts(dst), []);
  const plan = planAssets({root, assets: [{path: "02_production/new.mp4",url: `${base}/ok`},{path: "02_production/new.mp4",url: `${base}/ok`}]});
  assert.equal(plan.downloads.length, 1);
  assert.match(plan.refused[0].reason, /중복/);
});

test("CLI missing URL is not reported as prepared", async t => {
  const root = episode(t);
  put(root, "01_input/assets.json", {assets:[{path:"02_production/missing.mp4"}]});
  const result = await run([root]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /URL 못 찾음 1/);
});
