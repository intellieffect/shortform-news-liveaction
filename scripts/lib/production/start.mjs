import { prepareProductionPrompt } from './prompt.mjs';
import { readProjectDefaults } from "./defaults.mjs";
import { existsSync, mkdirSync, realpathSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertPilotId, REPO } from "../pilot.mjs";
import { hash, json, repositoryPath } from "./contracts.mjs";
import { initializeProduction, productionStatus } from "./state.mjs";
import { assertExecution } from "./environment.mjs";
import { productionProfileErrors } from "../production-profile.mjs";

// 설명·원고·장면을 미리 결정하지 않는 기사 위임 진입점. 네트워크·생성 호출은 제작자가 선택한다.
export const startProduction = ({ id, url, duration, request, repo = REPO } = {}) => {
  repo = realpathSync(repo);
  assertExecution(repo);
  let source;
  try { source = new URL(url); } catch { throw new Error("유효한 기사 URL이 필요하다"); }
  if (!["https:", "http:"].includes(source.protocol) || source.username || source.password) throw new Error("인증정보 없는 HTTP(S) 기사 URL이 필요하다");
  if (!Array.isArray(duration) || duration.length !== 2 || duration.some((x) => !Number.isFinite(x) || x <= 0) || duration[1] < duration[0]) throw new Error("분량은 양수 범위 min:max 초로 입력한다");
  if (typeof request !== "string" || !request.trim()) throw new Error("사용자 요청 원문이 필요하다");
  id ??= "article_" + hash(source.href).slice(0, 10);
  assertPilotId(id);
  const profilePath = "config/production-profile.json", profileBytes = readFileSync(join(repo, profilePath));
  const profile = JSON.parse(profileBytes);
  const errors = productionProfileErrors(profile);
  if (errors.length) throw new Error(errors.join("\n"));
  for (const path of ["news/" + id, "pilots/" + id, "public/pilots/" + id, "out/pilots/" + id, "src/editorial/episodes/" + id, "src/editorial/episodes/" + id + ".tsx"]) {
    repositoryPath(repo, path);
    if (existsSync(join(repo, path))) throw new Error("이 편의 경로가 이미 있다. resume하거나 다른 id를 사용한다: " + path);
  }
  const visual = json(join(repo, "plugin/skills/shortform-news-pipeline/templates/visual-system.json"));
  visual.production_profile = { id: profile.id, version: profile.version };
  visual.canvas = profile.canvas;
  visual.caption = { preset: profile.caption.preset };
  const defaults = readProjectDefaults(repo, profile);
  const prompt = prepareProductionPrompt(repo, url);
  const root = join(repo, "news", id);
  mkdirSync(join(repo, "news"), { recursive: true });
  mkdirSync(root); // 기존 폴더를 덮어쓰지 않는다. 동시에 같은 id를 시작해도 한 번만 성공한다.
  for (const dir of ["00_brief", "01_input/01_원문_기사", "01_input/05_참고자료", "02_production"]) mkdirSync(join(root, dir), { recursive: true });
  const put = (path, body) => writeFileSync(join(root, path), typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n", { flag: "wx" });
  put("00_brief/user-request.txt", request);
  put("00_brief/request.json", {
    schema_version: "1.0", pilot: id, mode: "editorial-concept", created_at: new Date().toISOString(),
    source_url: url, duration_sec: { min: duration[0], max: duration[1] }, raw_request: "00_brief/user-request.txt",
    raw_request_sha256: hash(request), production_prompt: prompt.record, creative_scope: { script: "delegated", assets: "delegated", diagrams: "delegated", audio: "delegated" },
    profile: { path: profilePath, id: profile.id, version: profile.version, sha256: hash(profileBytes) },
  });
  put(prompt.record.template, prompt.template);
  put(prompt.record.applied, prompt.applied);
  if (defaults) {
    put("00_brief/production-defaults.md", defaults.guide);
    put("00_brief/production-defaults.json", defaults.snapshot);
    mkdirSync(join(root, "02_production/brand"));
    writeFileSync(join(root, "02_production/brand/logo.png"), defaults.bytes, { flag: "wx" });
    visual.project_logo = defaults.snapshot.logo;
    visual.media ??= {};
    visual.media.assets ??= [];
    visual.media.assets.push({ id: "project_logo", source: "02_production/brand/logo.png", file: "editorial/brand-logo.png" });
  }
  put("02_production/visual-system.json", visual);
  initializeProduction(id, { repo });
  return productionStatus(id, { repo, includeContext: true });
};
