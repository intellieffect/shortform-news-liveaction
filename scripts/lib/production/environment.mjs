import { existsSync, readdirSync, readFileSync, realpathSync, lstatSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { hash, json } from "./contracts.mjs";
import { REPO } from "../pilot.mjs";

export const ENTRY_API = "production-entry@2";
const inventory = (root) => {
  const files = {};
  const walk = (path) => {
    const st = lstatSync(path);
    if (st.isSymbolicLink()) throw new Error("플러그인 구성의 심링크를 확인해야 한다: " + path);
    if (st.isDirectory()) for (const name of readdirSync(path).sort()) walk(join(path, name));
    else if (st.isFile()) files[relative(root, path)] = hash(readFileSync(path));
  };
  walk(root);
  return hash(JSON.stringify(files));
};
const pluginInfo = (path) => {
  try {
    path = realpathSync(path);
    const manifest = json(join(path, ".claude-plugin/plugin.json"));
    if (manifest.name !== "shortform-news") throw new Error("shortform-news 플러그인이 아니다");
    const contract = existsSync(join(path, "production-contract.json")) ? json(join(path, "production-contract.json")) : null;
    return { path, version: manifest.version, sha256: inventory(path), contract, error: null };
  } catch (e) { return { path, error: e.message }; }
};

// 실행한 설치본의 정체만 기록한다. 디스크 설치와 호스트 세션 로드는 별도 관찰이다.
export const executionIdentity = (repo = REPO, pluginRoot = process.env.SHORTFORM_PLUGIN_ROOT) => {
  const engineFile = join(repo, "config/production-engine.json");
  const engine = existsSync(engineFile) ? { ...json(engineFile), path: realpathSync(repo), contract_sha256: hash(readFileSync(engineFile)), entry_sha256: hash(readFileSync(join(repo, "scripts/produce.mjs"))) } : null;
  const plugin = pluginRoot ? pluginInfo(pluginRoot) : null;
  const errors = [];
  if (process.env.SHORTFORM_PROJECT_ROOT && realpathSync(process.env.SHORTFORM_PROJECT_ROOT) !== realpathSync(repo)) errors.push("플러그인이 선택한 저장소와 실제 실행 코드의 저장소가 다르다");
  if (!engine || engine.id !== "editorial-concept@1" || engine.entry_api !== ENTRY_API) errors.push("지원하는 제작 엔진/진입 API를 확인할 수 없다");
  if (plugin && (plugin.error || plugin.contract?.engine !== engine?.id || plugin.contract?.entry_api !== engine?.entry_api)) errors.push("실행 플러그인과 엔진의 계약이 호환되지 않는다");
  return { engine, plugin, invocation: pluginRoot ? "plugin-entry" : "direct-engine", host_session_load: "unverified", errors };
};
export const assertExecution = (repo = REPO) => {
  const result = executionIdentity(repo);
  if (result.errors.length) throw new Error(result.errors.join("\n"));
  return result;
};
const command = (name, args) => {
  const r = spawnSync(name, args, { encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024 });
  return { status: r.status === 0 ? "detected" : "unavailable", version: r.status === 0 ? String(r.stdout || r.stderr).split("\n")[0] : null };
};

export const productionEnvironment = ({ repo = REPO, pluginRoot, capabilities, installed = false } = {}) => {
  const execution = executionIdentity(repo, pluginRoot);
  const source = pluginInfo(join(repo, "plugin"));
  const tools = { node: { status: "detected", version: process.version }, ffmpeg: command("ffmpeg", ["-version"]), ffprobe: command("ffprobe", ["-version"]) };
  const require = createRequire(join(repo, "package.json"));
  for (const name of ["remotion", "@remotion/renderer"]) {
    try { tools[name] = { status: "detected", version: require(name + "/package.json").version }; }
    catch { tools[name] = { status: "unavailable", version: null }; }
  }
  const fonts = join(repo, "public/fonts");
  tools.fonts = { status: existsSync(fonts) && readdirSync(fonts).some((x) => /\.(otf|ttf|woff2?)$/.test(x)) ? "detected" : "unavailable" };
  let sessionTools = { status: "unverified", host: null, tools: [], limitation: "현재 세션의 도구 목록을 전달하지 않았다. 이전 세션의 도구를 사용 가능으로 가져오지 않는다" };
  if (capabilities) {
    const c = json(capabilities);
    if (c.schema_version !== "1.0" || typeof c.host !== "string" || !c.host.trim() || !Array.isArray(c.tools) || c.tools.some((x) => typeof x.purpose !== "string" || typeof x.tool !== "string" || !x.tool.trim())) throw new Error("capabilities에는 schema_version 1.0, host, tools[{purpose,tool}]가 필요하다");
    sessionTools = { status: "reported", host: c.host, tools: c.tools.map(({ purpose, tool }) => ({ purpose, tool })), source_sha256: hash(readFileSync(capabilities)), limitation: "호스트 도구 목록을 제작자가 전달한 기록. 호출 성공·권한·청취 수행 증명은 아니다. 새 세션에서 다시 확인한다" };
  }
  let installations = { status: "unverified", entries: [] };
  if (installed) {
    const r = spawnSync("claude", ["plugin", "list", "--json"], { encoding: "utf8", timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
    if (r.status === 0) {
      try {
        const listed = JSON.parse(r.stdout);
        if (!Array.isArray(listed)) throw new Error("예상하지 않은 호스트 목록 형식");
        installations = { status: "inspected", entries: listed.filter((x) => x.id?.startsWith("shortform-news@")).map((x) => ({ id: x.id, version: x.version, enabled: x.enabled, scope: x.scope, installPath: x.installPath, same_as_source: x.installPath ? pluginInfo(x.installPath).sha256 === source.sha256 : false })) };
      } catch { installations = { status: "unverified", entries: [], reason: "호스트 설치 목록 해석 불가" }; }
    } else installations = { status: "unverified", entries: [], reason: "호스트 설치 목록 확인 불가" };
  }
  return { at: new Date().toISOString(), execution, plugin_source: source, installations, local_tools: tools, session_tools: sessionTools,
    warnings: [...execution.errors, ...(execution.plugin && execution.plugin.sha256 !== source.sha256 ? ["실행 플러그인이 저장소 소스와 다르다"] : []), ...(installations.entries.some((x) => !x.same_as_source) ? ["설치본과 저장소 소스가 다르다. 기존 설치본을 자동 교체하지 않는다"] : [])],
    limitation: "도구 탐지는 실제 기사 수집·생성·렌더·시청·청취 검증을 대신하지 않는다" };
};
