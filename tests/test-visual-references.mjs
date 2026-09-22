import { buildReviewInput } from "../scripts/lib/production/review-input.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  cpSync,
  symlinkSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  captureReferences,
  readReferenceCollection,
  referenceContext,
  collectReferences,
} from "../scripts/lib/visual-references.mjs";
import { referenceSharingErrors } from "../scripts/lib/visual-reference-sharing.mjs";
import { startProduction } from "../scripts/lib/production/start.mjs";
import { createVideoLibraryServer } from "../scripts/lib/video-library-server.mjs";
const project = new URL("../", import.meta.url).pathname;
const hash = (x) => createHash("sha256").update(x).digest("hex");
const put = (root, p, v) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(join(root, p), typeof v === "string" ? v : JSON.stringify(v));
};
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "visual-reference-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const real = JSON.parse(
    readFileSync(join(project, "references/visual/collection.json")),
  );
  put(root, "references/visual/collection.json", real);
  put(root, real.guide, "공통 기준");
  const selected = {
    schema: "shared-references@1",
    common: ["references/visual/collection.json", real.guide],
    cases: [],
  };
  for (const c of real.cases) {
    const item = JSON.parse(readFileSync(join(project, c.manifest))),
      dir = dirname(c.manifest);
    for (const p of Object.values(item.files))
      put(root, p, p.endsWith(".mp4") ? "fake-video-" + c.id : "fixture");
    for (const p of ["source/entry.tsx", "source/timing.json", "validation.md"])
      put(root, dir + "/" + p, "fixture");
    item.video_sha256 = hash("fake-video-" + c.id);
    item.inventory = [
      ...new Set([
        ...Object.values(item.files),
        ...["source/entry.tsx", "source/timing.json", "validation.md"].map(
          (p) => dir + "/" + p,
        ),
      ]),
    ].map((path) => ({ path, sha256: hash(readFileSync(join(root, path))) }));
    put(root, c.manifest, item);
    selected.cases.push({
      id: c.id,
      version: c.version,
      files: [c.manifest, ...item.inventory.map((f) => f.path)],
    });
  }
  put(root, "config/shared-references.json", selected);
  return root;
}
test("all three references are supplied without topic matching; missing chosen video never falls back", (t) => {
  const root = fixture(t);
  assert.equal(captureReferences(root).cases.length, 3);
  const p = readReferenceCollection(root).cases[2].files.src;
  rmSync(join(root, p));
  const c = collectReferences(root, join(root, "out"));
  assert.equal(c.status, "invalid");
  assert.deepEqual(c.cases, []);
});
test("snapshot pins versions and guide text; future collection changes do not substitute; changed case fails", (t) => {
  const root = fixture(t),
    snapshot = captureReferences(root),
    raw = JSON.stringify(snapshot),
    ep = join(root, "news/demo");
  put(root, "news/demo/00_brief/visual-references.json", raw);
  const w = {
    repo: root,
    root: ep,
    request: {
      visual_references: {
        path: "00_brief/visual-references.json",
        sha256: hash(raw),
      },
    },
    rel: (p) => relative(root, p),
  };
  const collection = JSON.parse(
    readFileSync(join(root, "references/visual/collection.json")),
  );
  collection.version = "new";
  put(root, "references/visual/collection.json", collection);
  put(root, snapshot.guide, "changed guide");
  assert.equal(referenceContext(w).version, snapshot.version);
  assert.equal(referenceContext(w).guide_text, "공통 기준");
  assert.equal(referenceContext(w).inspection, "not_performed");
  put(root, snapshot.cases[0].manifest, {});
  assert.equal(referenceContext(w).status, "invalid");
});
test("unrecorded episodes receive guidance without claiming prior inspection; no external symlinks", (t) => {
  const root = fixture(t),
    w = {
      repo: root,
      root: join(root, "news/old"),
      request: {},
      rel: (p) => relative(root, p),
    };
  assert.equal(referenceContext(w).status, "legacy-current-guidance");
  const file = readReferenceCollection(root).cases[0].files.poster;
  rmSync(join(root, file));
  symlinkSync("/etc/hosts", join(root, file));
  assert.throws(() => readReferenceCollection(root), /경계/);
});
test("new article start persists baseline before scene planning, without a requested case ID", (t) => {
  const root = fixture(t);
  for (const dir of ["scripts", "config", "plugin", "presets"])
    cpSync(join(project, dir), join(root, dir), { recursive: true });
  cpSync(join(project, "package.json"), join(root, "package.json"));
  put(
    root,
    "docs/PRODUCTION_PROMPT_V2_RESTORED.txt",
    readFileSync(
      join(project, "docs/PRODUCTION_PROMPT_V2_RESTORED.txt"),
      "utf8",
    ),
  );
  const s = startProduction({
    repo: root,
    id: "new_article",
    url: "https://example.invalid/economy",
    duration: [60, 90],
    request: "이 경제 기사로 숏폼 만들어줘.",
  });
  assert.equal(s.context.reference_library.status, "preserved");
  assert.equal(s.context.reference_library.cases.length, 3);
  assert.equal(s.context.reference_library.inspection, "not_performed");
  assert.equal(s.context.question, null);
});
test("shared package rejects unselected files, missing rebuild inputs and mismatched LFS objects", (t) => {
  const root = fixture(t),
    selection = JSON.parse(
      readFileSync(join(root, "config/shared-references.json")),
    );
  const names = [
    "config/shared-references.json",
    ...selection.common,
    ...selection.cases.flatMap((c) => c.files),
  ];
  const entries = names.map((path) => ({ path, mode: "100644" }));
  const read = (p) => {
    const b = readFileSync(join(root, p));
    return /\.(mp4|jpg)$/.test(p)
      ? `version https://git-lfs.github.com/spec/v1\noid sha256:${hash(b)}\nsize ${b.length}\n`
      : b.toString();
  };
  assert.deepEqual(referenceSharingErrors(entries, read), []);
  assert.ok(
    referenceSharingErrors(
      [...entries, { path: "references/visual/private.txt", mode: "100644" }],
      read,
    ).some((x) => x.includes("미선정")),
  );
  assert.ok(
    referenceSharingErrors(
      entries.filter(
        (e) => !e.path.endsWith("scale/versions/v1/source/entry.tsx"),
      ),
      read,
    ).some((x) => x.includes("누락")),
  );
  assert.ok(
    referenceSharingErrors(entries, (p) =>
      p.endsWith("final.mp4") ? "wrong" : read(p),
    ).some((x) => x.includes("LFS")),
  );
});
test("library server serves only registered reference media/docs, supports ranges, rejects arbitrary sources", async (t) => {
  const root = fixture(t),
    server = createVideoLibraryServer({ root, roots: [root] });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`,
    c = readReferenceCollection(root).cases[0];
  let r = await fetch(base + "/" + c.files.src, {
    headers: { Range: "bytes=0-3" },
  });
  assert.equal(r.status, 206);
  assert.equal(await r.text(), "fake");
  r = await fetch(base + "/" + c.files.credits);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/plain/);
  r = await fetch(base + "/" + dirname(c.manifest) + "/source/entry.tsx");
  assert.equal(r.status, 404);
  r = await fetch(base + "/videos.html");
  assert.match(await r.text(), /referenceLibrary/);
});

test("experience stays blind; intent receives the same preserved baseline without claiming viewing", (t) => {
  const root = fixture(t),
    ep = join(root, "news/demo"),
    snapshot = captureReferences(root),
    raw = JSON.stringify(snapshot);
  put(root, "news/demo/00_brief/visual-references.json", raw);
  put(root, "news/demo/02_production/timeline.json", {
    fps: 30,
    total_frames: 60,
  });
  const media = "out/pilots/demo/proof.jpg";
  mkdirSync(dirname(join(root, media)), { recursive: true });
  cpSync(
    join(project, "references/visual/cases/scale/versions/v1/poster.jpg"),
    join(root, media),
  );
  const w = {
    id: "demo",
    repo: root,
    root: ep,
    production: join(ep, "02_production"),
    request: {
      visual_references: {
        path: "00_brief/visual-references.json",
        sha256: hash(raw),
      },
    },
    rel: (p) => relative(root, p),
    path: (p) => join(root, p),
  };
  const receipt = {
    id: "proof-1",
    inputs: { sha256: "test" },
    outputs: { [media]: hash(readFileSync(join(root, media))) },
  };
  const state = { receipts: { proof: receipt }, attempts: [] };
  const actions = { proof: { status: "current" } };
  const experience = buildReviewInput(w, state, actions, {
    source: "preview",
    phase: "experience",
  });
  const intent = buildReviewInput(w, state, actions, {
    source: "preview",
    phase: "intent",
  });
  assert.equal(experience.context, undefined);
  assert.equal(intent.context.reference_library.version, snapshot.version);
  assert.equal(intent.context.reference_library.inspection, "not_performed");
  assert.deepEqual(intent.files, experience.files);
});
