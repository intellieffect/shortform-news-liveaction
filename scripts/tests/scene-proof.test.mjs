// node --test scripts/tests/scene-proof.test.mjs
// 렌더는 여기서 하지 않는다. 설정·자료·자막 연결의 거절 조건과 준비 산출물만 검사한다.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  SCENE_PROOF_CONFIG_SCHEMA,
  draftOutputError,
  fontFaces,
  loadSceneProofPlan,
  narrationLines,
  normalizeExcerpt,
  parseSceneProofArgs,
  prepareSceneProofMedia,
  sceneProofReport,
  submittedOutputError,
  validateSceneProofPlan,
  writeSceneProofEntry,
} from "../scene-proof.mjs";

const REPO = realpathSync(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const ID = "fixture_episode";
const NARRATION = [
  "가스 구름 한가운데가 휑합니다. 누가 이렇게 비워 놓았을까요?",
  "중앙의 빈 공간은 가로 약 이백십 광년.",
].join("\n");

const write = (root, rel, body) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), typeof body === "string" ? body : JSON.stringify(body, null, 2));
};

const concepts = () => ({
  schema_version: "1.0",
  pilot: ID,
  concepts: [
    {
      id: "discovery",
      question: "누가 비웠는가?",
      takeaway: "중심이 비어 있다.",
      narration_lines: ["s01", "s02"],
      visual: {
        purpose: "explain",
        focus: "빈 중심",
        realization: { method: "hybrid", asset_ids: ["n44", "pan"], job_ids: [], code_role: "치수 연결" },
        moments: [],
      },
    },
  ],
});

const visualSystem = () => ({
  schema_version: "1.0",
  visual_contract: "visual-explanation@1",
  media: {
    assets: [
      { id: "n44", source: "02_production/media/n44.jpg", file: "editorial/n44.jpg" },
      { id: "pan", source: "02_production/media/pan.mp4", file: "editorial/pan.mp4" },
      { id: "project_logo", source: "02_production/brand/logo.png", file: "editorial/brand-logo.png" },
    ],
  },
  project_logo: { file: "editorial/brand-logo.png", x: 860, y: 100, width: 140, height: 140 },
});

const config = (overrides = {}) => ({
  schema: SCENE_PROOF_CONFIG_SCHEMA,
  pilot: ID,
  concept_id: "discovery",
  component: "src/editorial/scenes/fixture-scene.tsx",
  duration_seconds: 6,
  captions: [
    { narration_line: "s01", text: "가스 구름 한가운데가 휑합니다.", from: 0.4, end: 3 },
    { narration_line: "s02", text: "가로 약 이백십 광년.", from: 3.2, end: 5.8 },
  ],
  ...overrides,
});

const fixture = ({ media = true } = {}) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "scene-proof-")));
  cpSync(join(REPO, "config"), join(root, "config"), { recursive: true });
  cpSync(join(REPO, "public", "fonts"), join(root, "public", "fonts"), { recursive: true });
  write(root, "src/editorial/scenes/fixture-scene.tsx", "export default () => null;\n");
  write(root, `news/${ID}/02_production/concepts.json`, concepts());
  write(root, `news/${ID}/02_production/visual-system.json`, visualSystem());
  write(root, `news/${ID}/02_production/narration.txt`, NARRATION + "\n");
  write(root, `news/${ID}/02_production/scene-proof.json`, config());
  if (media) {
    write(root, `news/${ID}/02_production/media/n44.jpg`, "jpeg-bytes");
    write(root, `news/${ID}/02_production/media/pan.mp4`, "mp4-bytes");
    write(root, `news/${ID}/02_production/brand/logo.png`, "png-bytes");
  }
  return root;
};

const codes = (result) => result.errors.map((e) => e.code);
const check = (root, overrides) => validateSceneProofPlan({ repo: root, id: ID, config: config(overrides) });

test("유효한 설정은 실제 자료·자막·프로필을 담은 계획이 된다", () => {
  const root = fixture();
  try {
    const { errors, plan } = check(root, {});
    assert.deepEqual(errors, []);
    assert.equal(plan.concept_id, "discovery");
    assert.deepEqual(plan.asset_ids, ["n44", "pan"]);
    assert.deepEqual(plan.assets.map((a) => a.kind), ["image", "video"]);
    assert.equal(plan.assets[0].source, `news/${ID}/02_production/media/n44.jpg`);
    assert.equal(plan.duration_in_frames, 6 * plan.fps);
    assert.equal(plan.caption_times, "provisional");
    assert.deepEqual(plan.captions.map((c) => c.id), ["s01", "s02"]);
    assert.equal(plan.logo.width, 140);
    assert.ok(plan.fonts.some((f) => f.family === plan.profile.caption.font_family));
    assert.equal(plan.profile_sha256, createHash("sha256").update(readFileSync(join(root, plan.profile_path))).digest("hex"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("설정 파일이 없으면 렌더 준비 자체가 거절된다", () => {
  const root = fixture();
  try {
    rmSync(join(root, `news/${ID}/02_production/scene-proof.json`));
    const result = loadSceneProofPlan({ repo: root, id: ID });
    assert.deepEqual(codes(result), ["config-missing"]);
    assert.equal(result.plan, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("schema·concept_id·길이가 틀리면 각각 거절된다", () => {
  const root = fixture();
  try {
    assert.ok(codes(check(root, { schema: "scene-proof-config@0" })).includes("config-schema"));
    assert.ok(codes(check(root, { concept_id: "없는개념" })).includes("concept-missing"));
    assert.ok(codes(check(root, { duration_seconds: 31 })).includes("duration"));
    assert.ok(codes(check(root, { duration_seconds: 0 })).includes("duration"));
    assert.ok(codes(check(root, { pilot: "other_episode" })).includes("config-pilot"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("장면 컴포넌트는 src/editorial/scenes 아래의 실제 파일이어야 한다", () => {
  const root = fixture();
  try {
    assert.ok(codes(check(root, { component: "src/editorial/Proof.tsx" })).includes("component-path"));
    assert.ok(codes(check(root, { component: "/etc/passwd.tsx" })).includes("component-path"));
    assert.ok(codes(check(root, { component: "src/editorial/scenes/../../../../etc/passwd.tsx" })).includes("component-unsafe"));
    assert.ok(codes(check(root, { component: "src/editorial/scenes/none.tsx" })).includes("component-missing"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("실제로 없는 자료·선택되지 않은 자료는 통과하지 못한다", () => {
  const root = fixture({ media: false });
  try {
    assert.deepEqual(codes(check(root, {})), ["asset-source-missing", "asset-source-missing"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const declared = fixture();
  try {
    const plan = concepts();
    plan.concepts[0].visual.realization.asset_ids = ["missing_asset"];
    write(declared, `news/${ID}/02_production/concepts.json`, plan);
    assert.ok(codes(check(declared, {})).includes("asset-undeclared"));

    const empty = concepts();
    empty.concepts[0].visual.realization.asset_ids = [];
    write(declared, `news/${ID}/02_production/concepts.json`, empty);
    assert.equal(check(declared, {}).errors.length, 0);

    const outside = visualSystem();
    outside.media.assets[0].source = "../../../etc/passwd.jpg";
    write(declared, `news/${ID}/02_production/visual-system.json`, outside);
    write(declared, `news/${ID}/02_production/concepts.json`, concepts());
    assert.ok(codes(check(declared, {})).includes("asset-unsafe"));

    const wrongKind = visualSystem();
    wrongKind.media.assets[0].source = "02_production/media/n44.txt";
    write(declared, `news/${ID}/02_production/visual-system.json`, wrongKind);
    write(declared, `news/${ID}/02_production/media/n44.txt`, "not media");
    assert.ok(codes(check(declared, {})).includes("asset-kind"));
  } finally {
    rmSync(declared, { recursive: true, force: true });
  }
});

test("자막은 실제 발화 줄의 인용이어야 하고 시각은 겹치지 않는다", () => {
  const root = fixture();
  try {
    const mismatch = [{ narration_line: "s01", text: "기사에 없는 문장입니다.", from: 0, end: 2 }];
    assert.ok(codes(check(root, { captions: mismatch })).includes("caption-excerpt"));

    const unknownLine = [{ narration_line: "s99", text: "가스 구름", from: 0, end: 2 }];
    assert.ok(codes(check(root, { captions: unknownLine })).includes("caption-line"));

    const spaced = [{ narration_line: "s01", text: "  가스   구름 한가운데가\n휑합니다. ", from: 0, end: 2 }];
    assert.deepEqual(codes(check(root, { captions: spaced })), []);

    const overlap = [
      { narration_line: "s01", text: "가스 구름 한가운데가 휑합니다.", from: 0, end: 4 },
      { narration_line: "s02", text: "가로 약 이백십 광년.", from: 3, end: 5 },
    ];
    assert.ok(codes(check(root, { captions: overlap })).includes("caption-order"));

    const past = [{ narration_line: "s01", text: "가스 구름 한가운데가 휑합니다.", from: 0, end: 9 }];
    assert.ok(codes(check(root, { captions: past })).includes("caption-range"));

    assert.ok(codes(check(root, { captions: [] })).includes("captions"));
    assert.ok(codes(check(root, { captions: [{ narration_line: "s01", text: "가스 구름", from: -1, end: 0 }] })).includes("caption-time"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("자막 서체 파일이 없으면 렌더 전에 막는다", () => {
  const root = fixture();
  try {
    rmSync(join(root, "public", "fonts"), { recursive: true, force: true });
    assert.ok(codes(check(root, {})).includes("font-missing"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("발화 줄 id는 실제 narration.txt 순서에서 나온다", () => {
  const root = fixture();
  try {
    const lines = narrationLines(join(root, "news", ID, "02_production"));
    assert.deepEqual(lines.map((l) => l.id), ["s01", "s02"]);
    assert.equal(lines[0].source, "narration.txt");
    assert.equal(normalizeExcerpt(" 가  나\n다 "), "가 나 다");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("준비 단계는 실제 자료를 무시되는 public/scene-proofs로 복사한다", () => {
  const root = fixture();
  try {
    const { plan } = check(root, {});
    const copied = prepareSceneProofMedia(plan, { repo: root });
    assert.deepEqual(copied, [`scene-proofs/${ID}/n44.jpg`, `scene-proofs/${ID}/pan.mp4`, `scene-proofs/${ID}/logo.png`]);
    assert.equal(readFileSync(join(root, "public", copied[0]), "utf8"), "jpeg-bytes");
    assert.equal(readFileSync(join(root, "public/scene-proofs/.gitignore"), "utf8"), "*\n");
    assert.equal(readFileSync(join(root, `news/${ID}/02_production/media/n44.jpg`), "utf8"), "jpeg-bytes");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("생성 entry는 등록부 없이 장면 컴포넌트 하나만 담는다", () => {
  const root = fixture();
  try {
    const { plan } = check(root, {});
    const entry = writeSceneProofEntry(plan, { repo: root });
    assert.ok(existsSync(entry));
    const source = readFileSync(entry, "utf8");
    assert.ok(source.includes("../../../../src/editorial/SceneProof"));
    assert.ok(source.includes("../../../../src/editorial/scenes/fixture-scene"));
    assert.ok(source.includes(`durationInFrames={${plan.duration_in_frames}}`));
    assert.ok(source.includes("loadSceneProofFonts"));
    assert.ok(!source.includes("registry"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("관찰 보고서는 unverified로 시작하고 실제 렌더 근거를 기록한다", () => {
  const root = fixture();
  try {
    const { plan } = check(root, {});
    const report = sceneProofReport(plan, { artifact: `out/pilots/${ID}/qa/scene-a.png` });
    assert.equal(report.schema, "scene-proof@1");
    assert.equal(report.verdict, "unverified");
    assert.equal(report.scope, "composite");
    assert.equal(report.caption_times, "provisional");
    assert.ok(!("continuous_viewing" in report));
    assert.deepEqual(report.rendering, {
      kind: "shared-scene-proof@1",
      config: `news/${ID}/02_production/scene-proof.json`,
      component: "src/editorial/scenes/fixture-scene.tsx",
      asset_ids: ["n44", "pan"],
      profile_sha256: plan.profile_sha256,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI 인자는 id/phase/output/frame으로 갈린다", () => {
  assert.deepEqual(parseSceneProofArgs(["ep", "--phase", "motion", "--output", "out/a.mp4"]), {
    id: "ep", phase: "motion", output: "out/a.mp4", frame: 0, mode: "submit",
  });
  assert.deepEqual(parseSceneProofArgs(["--phase", "still", "ep", "--output", "out/a.png", "--frame", "12", "--mode", "draft"]), {
    id: "ep", phase: "still", output: "out/a.png", frame: 12, mode: "draft",
  });
  assert.equal(draftOutputError("ep", "out/pilots/ep/qa/drafts/scene.png"), null);
  assert.match(draftOutputError("ep", "out/pilots/ep/qa/scene.png"), /draft 출력/);
  assert.match(draftOutputError("ep", "out/pilots/other/qa/drafts/scene.png"), /draft 출력/);
  assert.match(draftOutputError("ep", "out/pilots/ep/qa/drafts/../scene.png"), /draft 출력/);
  assert.match(submittedOutputError("ep", "out/pilots/ep/qa/drafts/scene.png"), /submit 출력/);
  assert.equal(submittedOutputError("ep", "out/pilots/ep/qa/scene.png"), null);
});

test("실제 저장소의 자막 서체는 가중치와 함께 잡힌다", () => {
  const faces = fontFaces(REPO, "GmarketSans");
  assert.ok(faces.length >= 2);
  assert.ok(faces.some((f) => f.weight === "500"));
  assert.ok(faces.every((f) => f.file.startsWith("fonts/")));
});
