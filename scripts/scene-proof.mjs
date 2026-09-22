#!/usr/bin/env node
// 음성·timeline·sync 이전에 실제 공통 자막과 실제 선택 자료로 짧은 합성 시안을 만든다.
// 렌더 전에 scene_proof 시도를 열고, 렌더 후 관찰 JSON 뼈대를 남긴 뒤 토큰을 열어 둔 채 끝낸다.
// 판정은 제작자·검수자가 실물을 본 뒤 직접 적는다. 이 스크립트는 "사용 가능"을 주장하지 않는다.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { REPO, assertPilotId } from "./lib/pilot.mjs";
import { repositoryPath } from "./lib/production/contracts.mjs";
import { productionProfileErrors } from "./lib/production-profile.mjs";

import {SCENE_PROOF_CONFIG_SCHEMA, SCENE_PROOF_REPORT_SCHEMA, SCENE_PROOF_RENDERING_KIND, SCENE_COMPONENT_ROOT, sceneProofConfigPath} from './lib/scene-proof-contract.mjs';
export {SCENE_PROOF_CONFIG_SCHEMA, SCENE_PROOF_REPORT_SCHEMA, SCENE_PROOF_RENDERING_KIND, SCENE_COMPONENT_ROOT, sceneProofConfigPath};
export const MAX_DURATION_SECONDS = 30;
export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

const WEIGHTS = [["extrabold", "800"], ["semibold", "600"], ["bold", "700"], ["medium", "500"], ["light", "300"], ["regular", "400"], ["thin", "100"]];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** 공백만 다른 인용을 같은 문장으로 본다. 그 밖의 글자는 원문 그대로여야 한다. */
export const normalizeExcerpt = (value) => String(value ?? "").replace(/\s+/g, " ").trim();


/** 저장소 안의 안전한 상대 경로인지 확인한다. 밖을 가리키면 null. */
export const safeRepoPath = (repo, rel) => {
  try {
    return repositoryPath(repo, rel);
  } catch {
    return null;
  }
};

/**
 * 현재 narration.txt의 순서에서 s01… 발화 줄을 읽는다. 가짜 narration.json을 쓰지 않는다.
 */
export const narrationLines = (production) => {
  const textFile = join(production, "narration.txt");
  if (!existsSync(textFile)) return [];
  return readFileSync(textFile, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: `s${String(index + 1).padStart(2, "0")}`, variants: [text], source: "narration.txt" }));
};

/** 현행 공통 제작 프로필과 바이트 해시. */
export const resolveProfile = (repo) => {
  const current = "config/production-profile.json";
  const rel = current;
  const bytes = readFileSync(join(repo, rel));
  return { path: rel, profile: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes) };
};

const weightOf = (fileName) => {
  const lowered = fileName.toLowerCase();
  const hit = WEIGHTS.find(([token]) => lowered.includes(token));
  return hit ? hit[1] : "400";
};

/** public/fonts에서 해당 서체 파일을 실제로 찾는다. 없으면 빈 배열 — 자막 폰트는 필수다. */
export const fontFaces = (repo, family) => {
  const dir = join(repo, "public", "fonts");
  if (!existsSync(dir)) return [];
  const key = family.toLowerCase().replace(/[^a-z0-9]/g, "");
  return readdirSync(dir)
    .filter((name) => /\.(ttf|otf|woff2?)$/i.test(name))
    .filter((name) => name.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(key))
    .sort()
    .map((name) => ({ family, file: `fonts/${name}`, weight: weightOf(name) }));
};

const assetKind = (ext) => (IMAGE_EXTENSIONS.includes(ext) ? "image" : VIDEO_EXTENSIONS.includes(ext) ? "video" : null);

/**
 * 설정·실제 편 자료·프로필을 대조한다. 파일을 만들지 않는 순수 검사이며 테스트가 직접 호출한다.
 * @returns {{errors: {code: string, message: string}[], plan: object|null}}
 */
export const validateSceneProofPlan = ({ repo = REPO, id, config, phase = "still" }) => {
  assertPilotId(id);
  const errors = [];
  const add = (code, message) => errors.push({ code, message });
  const production = join(repo, "news", id, "02_production");

  if (!["still", "motion"].includes(phase)) add("phase", "phase는 still 또는 motion이다");
  if (!isObject(config)) {
    add("config-shape", "설정은 객체여야 한다");
    return { errors, plan: null };
  }
  if (config.schema !== SCENE_PROOF_CONFIG_SCHEMA) add("config-schema", `schema는 ${SCENE_PROOF_CONFIG_SCHEMA}여야 한다`);
  if (config.pilot != null && config.pilot !== id) add("config-pilot", "설정의 pilot이 이 편과 다르다");

  const conceptsFile = join(production, "concepts.json");
  const visualFile = join(production, "visual-system.json");
  if (!existsSync(conceptsFile)) add("concepts-missing", "concepts.json이 없다");
  if (!existsSync(visualFile)) add("visual-system-missing", "visual-system.json이 없다");
  if (errors.some((e) => e.code.endsWith("-missing"))) return { errors, plan: null };

  const concepts = readJson(conceptsFile).concepts ?? [];
  const visualSystem = readJson(visualFile);
  const concept = concepts.find((c) => c.id === config.concept_id);
  if (!concept) add("concept-missing", `concepts.json에 없는 concept_id: ${config.concept_id}`);

  // 장면 컴포넌트 — 고정 미술 템플릿이 아니라 설정이 고르는 재사용 컴포넌트다.
  let componentAbs = null;
  const component = config.component;
  if (typeof component !== "string" || !component.startsWith(SCENE_COMPONENT_ROOT) || !component.endsWith(".tsx")) {
    add("component-path", `component는 ${SCENE_COMPONENT_ROOT} 아래의 .tsx 저장소 상대 경로여야 한다`);
  } else {
    componentAbs = safeRepoPath(repo, component);
    if (!componentAbs) add("component-unsafe", `저장소 밖을 가리키는 component: ${component}`);
    else if (!existsSync(componentAbs) || !statSync(componentAbs).isFile()) add("component-missing", `장면 컴포넌트가 없다: ${component}`);
  }

  const duration = config.duration_seconds;
  if (!isFiniteNumber(duration) || duration <= 0 || duration > MAX_DURATION_SECONDS) {
    add("duration", `duration_seconds는 0 초과 ${MAX_DURATION_SECONDS} 이하의 수여야 한다`);
  }

  const { path: profilePath, profile, sha256: profileSha256 } = resolveProfile(repo);
  for (const message of productionProfileErrors(profile)) add("profile", message);
  const fonts = [
    ...fontFaces(repo, profile.caption?.font_family ?? ""),
    ...fontFaces(repo, "Pretendard").filter(() => (profile.caption?.font_family ?? "") !== "Pretendard"),
  ];
  if (!fontFaces(repo, profile.caption?.font_family ?? "").length) {
    add("font-missing", `자막 서체 파일을 public/fonts에서 찾을 수 없다: ${profile.caption?.font_family}`);
  }

  // 자료는 선택된 concept의 visual.realization.asset_ids만 쓴다.
  const assetIds = concept?.visual?.realization?.asset_ids;
  const declared = visualSystem.media?.assets ?? [];
  const assets = [];
  if (!Array.isArray(assetIds)) {
    add("asset-ids", "선택된 concept의 visual.realization.asset_ids가 필요하다");
  } else {
    for (const assetId of assetIds) {
      if (!/^[a-z][a-z0-9_-]*$/.test(assetId)) {add('asset-id', '자료 id는 안전한 식별자여야 한다');continue;}
      const declaredAsset = declared.find((a) => a.id === assetId);
      if (!declaredAsset) {
        add("asset-undeclared", `visual-system.media.assets에 없는 자료: ${assetId}`);
        continue;
      }
      const rel = `news/${id}/${declaredAsset.source}`;
      const abs = safeRepoPath(repo, rel);
      if (!abs) {
        add("asset-unsafe", `저장소 밖을 가리키는 자료 경로: ${assetId}`);
        continue;
      }
      if (!existsSync(abs) || !statSync(abs).isFile()) {
        add("asset-source-missing", `실제 자료 파일이 없다: ${rel}`);
        continue;
      }
      const ext = extname(abs).toLowerCase();
      const kind = assetKind(ext);
      if (!kind) {
        add("asset-kind", `이미지·영상 자료가 아니다: ${rel}`);
        continue;
      }
      assets.push({ id: assetId, kind, source: rel, file: `scene-proofs/${id}/${assetId}${ext}` });
    }
  }

  // 자막은 실제 발화 줄에 연결하고, 문구는 그 줄의 인용(공백 정규화 일치)이어야 한다.
  const lines = narrationLines(production);
  if (!lines.length) add("narration-missing", "narration.txt 또는 narration.json의 발화 줄이 필요하다");
  const captions = [];
  if (!Array.isArray(config.captions) || !config.captions.length) {
    add("captions", "captions 배열이 필요하다");
  } else {
    let previousEnd = 0;
    for (const [index, caption] of config.captions.entries()) {
      const where = `captions[${index}]`;
      const line = lines.find((l) => l.id === caption?.narration_line);
      if (line && !(concept?.narration_lines ?? []).includes(line.id)) add('caption-concept', `${where}: 선택한 개념의 발화 줄이 아니다`);
      if (!line) {
        add("caption-line", `${where}: 실제 발화 줄이 아니다 — ${caption?.narration_line}`);
      } else if (typeof caption.text !== "string" || !caption.text.trim()) {
        add("caption-text", `${where}: 화면에 띄울 문구가 필요하다`);
      } else if (!line.variants.some((variant) => normalizeExcerpt(variant).includes(normalizeExcerpt(caption.text)))) {
        add("caption-excerpt", `${where}: ${line.id} 발화 줄에 없는 문구다 — ${caption.text}`);
      }
      const from = caption?.from;
      const end = caption?.end;
      if (!isFiniteNumber(from) || !isFiniteNumber(end) || from < 0 || end <= from) {
        add("caption-time", `${where}: 0 이상의 from과 from보다 큰 end가 필요하다`);
      } else {
        if (isFiniteNumber(duration) && end > duration + 1e-9) add("caption-range", `${where}: 시안 길이(${duration}s)를 넘는다`);
        if (from + 1e-9 < previousEnd) add("caption-order", `${where}: 앞 자막과 겹치거나 순서가 뒤집혔다`);
        previousEnd = end;
      }
      if (line && typeof caption.text === "string") {
        captions.push({ id: line.id, text: caption.text, start: from, end });
      }
    }
  }

  if (errors.length) return { errors, plan: null };

  const fps = profile.canvas.fps;
  const logoSpec = visualSystem.project_logo;
  const logoDeclared = logoSpec ? declared.find((a) => a.file === logoSpec.file || a.id === "project_logo") : null;
  let logo = null;
  if (logoSpec && logoDeclared) {
    const rel = `news/${id}/${logoDeclared.source}`;
    const abs = safeRepoPath(repo, rel);
    if (abs && existsSync(abs)) {
      const file = `scene-proofs/${id}/logo${extname(abs).toLowerCase()}`;
      logo = { file, x: logoSpec.x, y: logoSpec.y, width: logoSpec.width, height: logoSpec.height, source: rel };
    }
  }

  return {
    errors,
    plan: {
      id,
      phase,
      concept_id: concept.id,
      concept: { id: concept.id, question: concept.question, takeaway: concept.takeaway, focus: concept.visual?.focus, purpose: concept.visual?.purpose },
      component,
      component_path: componentAbs,
      config_path: sceneProofConfigPath(id),
      duration_seconds: duration,
      fps,
      width: profile.canvas.width,
      height: profile.canvas.height,
      duration_in_frames: Math.max(1, Math.round(duration * fps)),
      assets,
      asset_ids: assets.map((a) => a.id),
      captions,
      caption_times: "provisional",
      logo,
      fonts,
      profile,
      profile_path: profilePath,
      profile_sha256: profileSha256,
      public_dir: `public/scene-proofs/${id}`,
    },
  };
};

/** 설정 파일을 읽고 검사한다. 잘못된 설정은 렌더까지 가지 않는다. */
export const loadSceneProofPlan = ({ repo = REPO, id, phase = "still" }) => {
  const rel = sceneProofConfigPath(id);
  const file = safeRepoPath(repo, rel);
  if (!file || !existsSync(file)) {
    return { errors: [{ code: "config-missing", message: `${rel}이 없다` }], plan: null };
  }
  let config;
  try {
    config = readJson(file);
  } catch (error) {
    return { errors: [{ code: "config-parse", message: `${rel} JSON을 읽을 수 없다: ${error.message}` }], plan: null };
  }
  return { ...validateSceneProofPlan({ repo, id, config, phase }), config };
};

/** 실제 편 자료를 무시되는 public/scene-proofs/<id>/로 복사한다. 원본은 건드리지 않는다. */
export const prepareSceneProofMedia = (plan, { repo = REPO } = {}) => {
  const dir = join(repo, plan.public_dir);
  mkdirSync(dir, { recursive: true });
  // 파생 사본은 저장소에 담지 않는다.
  writeFileSync(join(repo, "public", "scene-proofs", ".gitignore"), "*\n");
  const copied = [];
  for (const item of [...plan.assets, ...(plan.logo ? [plan.logo] : [])]) {
    const target = join(repo, "public", item.file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(repo, item.source), target);
    copied.push(item.file);
  }
  return copied;
};

const relativeImport = (fromDir, repo, rel) => {
  const path = join(repo, rel);
  let prefix = "";
  let dir = fromDir;
  while (dir !== repo && dir !== dirname(dir)) {
    prefix += "../";
    dir = dirname(dir);
  }
  return (prefix + path.slice(repo.length + 1)).replace(/\.tsx$/, "");
};

/** 등록부·본편 전체를 거치지 않는 독립 entry를 만든다. 시안 하나만 들어 있다. */
export const writeSceneProofEntry = (plan, { repo = REPO, dir } = {}) => {
  const entryDir = dir ?? join(repo, "out", "pilots", plan.id, "scene-proof");
  mkdirSync(entryDir, { recursive: true });
  const entry = join(entryDir, "entry.tsx");
  const props = {
    captions: plan.captions,
    assets: plan.assets.map(({ id, kind, file, source }) => ({ id, kind, file, source })),
    concept: plan.concept,
    profile: plan.profile,
    logo: plan.logo ? { file: plan.logo.file, x: plan.logo.x, y: plan.logo.y, width: plan.logo.width, height: plan.logo.height } : null,
  };
  const source = `// 생성 파일 — scripts/scene-proof.mjs가 매 실행마다 덮어쓴다. 직접 고치지 않는다.
import React from "react";
import { Composition, registerRoot } from "remotion";
import { SceneProofFrame, loadSceneProofFonts } from "${relativeImport(entryDir, repo, "src/editorial/SceneProof.tsx")}";
import Scene from "${relativeImport(entryDir, repo, plan.component)}";

const props = ${JSON.stringify(props, null, 2)};
const fonts = ${JSON.stringify(plan.fonts, null, 2)};

loadSceneProofFonts(fonts);

const Frame: React.FC = () => <SceneProofFrame {...props} Scene={Scene} />;

registerRoot(() => (
  <Composition
    id="SceneProof"
    component={Frame}
    durationInFrames={${plan.duration_in_frames}}
    fps={${plan.fps}}
    width={${plan.width}}
    height={${plan.height}}
  />
));
`;
  writeFileSync(entry, source);
  return entry;
};

/** 렌더 뒤 남기는 관찰 뼈대. verdict는 unverified — 실제로 본 사람이 고친다. */
export const sceneProofReport = (plan, { artifact }) => ({
  schema: SCENE_PROOF_REPORT_SCHEMA,
  concept_id: plan.concept_id,
  phase: plan.phase,
  scope: "composite",
  artifact,
  verdict: "unverified",
  observation: "아직 실물 관찰을 기록하지 않았다. 실제로 확인한 범위를 이 자리에 직접 적는다.",
  tool: "미기록 — 실제로 사용한 확인 도구를 적는다",
  caption_times: "provisional",
  captions: plan.captions.map((c) => ({ narration_line: c.id, text: c.text, from: c.start, end: c.end })),
  rendering: {
    kind: SCENE_PROOF_RENDERING_KIND,
    config: plan.config_path,
    component: plan.component,
    asset_ids: plan.asset_ids,
    profile_sha256: plan.profile_sha256,
  },
  review: null,
  limitation: "자동 렌더 기록이다. 시청 사실·품질·최종 검수를 대신하지 않는다. 자막 시각은 임시값이며 음성 확정 후 다시 확인한다.",
});

export const reportPathFor = (output) => output.replace(/\.[^./]+$/, "") + ".json";

const USAGE = "usage: node scripts/scene-proof.mjs <id> --phase still|motion --output <저장소 상대 경로> [--frame N]";

export const parseSceneProofArgs = (argv) => {
  const flags = {};
  let id;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) flags[token] = argv[++i];
    else if (id === undefined) id = token;
  }
  return { id, phase: flags["--phase"] ?? "still", output: flags["--output"], frame: flags["--frame"] === undefined ? 0 : Number(flags["--frame"]) };
};

const main = async (argv) => {
  const { id, phase, output, frame } = parseSceneProofArgs(argv);
  if (!id || !output || !["still", "motion"].includes(phase)) throw new Error(USAGE);
  if (!Number.isInteger(frame) || frame < 0) throw new Error("--frame은 0 이상의 정수여야 한다");
  const outputPath = safeRepoPath(REPO, output);
  if (!outputPath) throw new Error(`출력은 저장소 안의 상대 경로여야 한다: ${output}`);
  const wantedExt = extname(output).toLowerCase();
  if (phase === "still" && ![".png", ".jpeg", ".jpg"].includes(wantedExt)) throw new Error("still 시안은 .png 또는 .jpeg로 저장한다");
  if (phase === "motion" && wantedExt !== ".mp4") throw new Error("motion 시안은 .mp4로 저장한다");

  const { errors, plan } = loadSceneProofPlan({ repo: REPO, id, phase });
  if (errors.length) throw new Error("설정 검사 실패\n" + errors.map((e) => `  [${e.code}] ${e.message}`).join("\n"));
  if (phase === "still" && frame >= plan.duration_in_frames) throw new Error(`--frame은 ${plan.duration_in_frames} 미만이어야 한다`);


  const [{ bundle }, { openBrowser, renderMedia, renderStill, selectComposition }, { enableTailwind }, { beginProductionAction, failProductionAction }] = await Promise.all([
    import("@remotion/bundler"),
    import("@remotion/renderer"),
    import("@remotion/tailwind-v4"),
    import("./lib/production/state.mjs"),
  ]);

  const reportRel = reportPathFor(output);
  if (reportRel === output) throw new Error("관찰 JSON 경로가 시안 파일과 같다");
  // 렌더 전에 시도를 연다 — 입력 판본이 결과보다 먼저 고정돼야 한다.
  const attempt = beginProductionAction(id, "scene_proof", {
    outputs: [output, reportRel],
    command: { executable: "node", args: ["scripts/scene-proof.mjs", id, "--phase", phase, "--output", output, ...(phase === "still" ? ["--frame", String(frame)] : [])] },
  });

  let serveUrl = null;
  let browser = null;
  try {
    prepareSceneProofMedia(plan, { repo: REPO });
    const entry = writeSceneProofEntry(plan, { repo: REPO });
    serveUrl = await bundle({ entryPoint: entry, publicDir: join(REPO, "public"), webpackOverride: enableTailwind, onProgress: () => undefined });
    browser = await openBrowser("chrome", { chromeMode: "headless-shell", logLevel: "warn", gl: "angle" });
    const composition = await selectComposition({ serveUrl, id: "SceneProof", puppeteerInstance: browser, logLevel: "warn" });
    mkdirSync(dirname(outputPath), { recursive: true });
    if (phase === "still") {
      await renderStill({ serveUrl, composition, frame, output: outputPath, overwrite: true, puppeteerInstance: browser, imageFormat: wantedExt === ".png" ? "png" : "jpeg", logLevel: "warn" });
    } else {
      await renderMedia({ serveUrl, composition, codec: "h264", imageFormat: "jpeg", outputLocation: outputPath, overwrite: true, puppeteerInstance: browser, chromiumOptions: { gl: "angle" }, logLevel: "warn" });
    }
    writeFileSync(join(REPO, reportRel), JSON.stringify(sceneProofReport(plan, { artifact: output }), null, 2) + "\n");
  } catch (error) {
    failProductionAction(id, attempt.id, error.message);
    throw error;
  } finally {
    if (browser) await browser.close({ silent: true });
    if (serveUrl) rmSync(serveUrl, { recursive: true, force: true });
  }

  console.log(`시안 ${phase} → ${output}`);
  console.log(`관찰 JSON  → ${reportRel}`);
  console.log(`열린 토큰  → ${attempt.id}`);
  console.log(`초기 검수 → node scripts/produce.mjs review-input ${id} --source scene --phase experience (초견 응답 후 intent). docs/SCENE-PROOF.md 참조`);
  if (phase === 'motion') console.log('연속 시청이 불가능하면 현재 MP4의 시작·중간·끝 PNG를 실제 확인하고 sampling + provisional을 기록한다. docs/SCENE-PROOF.md 참조');
  console.log("실물을 직접 보고 review와 verdict/observation/tool을 고친 뒤(연속 동작을 실제로 봤을 때만 continuous_viewing·viewed_seconds) " +
    `npm run produce -- finish ${id} ${attempt.id}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
