#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { startProduction } from "../scripts/lib/production/start.mjs";
import { beginProductionAction, finishProductionAction, failProductionAction, productionStatus, productionRenderErrors } from "../scripts/lib/production/state.mjs";
import { productionEnvironment, executionIdentity } from "../scripts/lib/production/environment.mjs";
import { sourceEngine } from "../scripts/lib/engine.mjs";

const project = fileURLToPath(new URL("..", import.meta.url));
const fixtureRoot = realpathSync(mkdtempSync(join(tmpdir(), "production-entry-"))), repo = join(fixtureRoot, "project"), installed = join(fixtureRoot, "candidate-plugin"), other = join(fixtureRoot, "other");
const put = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + "\n"); };
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const params = { repo, url: "https://example.invalid/new-article", duration: [60, 90], request: "  테스트용 기사로 60~90초 영상을 만들어줘.\n새 도해와 자료 선택은 맡길게.\n" };
let cases = 0;
const check = (name, work) => { work(); cases++; console.log("ok " + name); };
const cli = (args, { bridge = false, env = {}, expected = 0 } = {}) => {
  const file = bridge ? join(installed, "scripts/produce.mjs") : join(repo, "scripts/produce.mjs");
  const r = spawnSync(process.execPath, [file, ...(bridge ? ["--project", repo] : []), ...args], { cwd: other, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(r.status, expected, r.stderr + r.stdout);
  return r;
};
try {
  mkdirSync(repo); mkdirSync(other);
  for (const dir of ["scripts", "config", "plugin", "presets"]) cpSync(join(project, dir), join(repo, dir), { recursive: true });
  cpSync(join(project, "package.json"), join(repo, "package.json"));
  put(join(repo, "docs/specs/editorial-concept.schema.md"), readFileSync(join(project, "docs/specs/editorial-concept.schema.md")));
  put(join(repo, "docs/PRODUCTION_PROMPT_V2_RESTORED.txt"), readFileSync(join(project, "docs/PRODUCTION_PROMPT_V2_RESTORED.txt")));
  cpSync(join(project, "plugin"), installed, { recursive: true });
  check("잘못된 시작 입력은 편을 만들기 전에 거절", () => {
    for (const change of [{ id: "../escape" }, { url: "file:///tmp/article" }, { url: "https://user:pass@example.invalid" }, { duration: [90, 60] }, { duration: [0, 90] }, { request: "" }]) assert.throws(() => startProduction({ ...params, id: "invalid", ...change }));
    assert.equal(existsSync(join(repo, "news/invalid")), false);
  });
  check("손상된 로고는 편 생성 전에 거절", () => {
    const logoPath = join(repo, "presets/hani/brand-assets/v1/assets/logo.png");
    const original = readFileSync(logoPath);
    writeFileSync(logoPath, "broken");
    assert.throws(() => startProduction({ ...params, id: "broken_logo" }), /로고/);
    assert.equal(existsSync(join(repo, "news/broken_logo")), false);
    writeFileSync(logoPath, original);
  });
  check("기본값 누락은 임의 스타일로 진행하지 않고 시작 전에 거절", () => {
    const path = join(repo, "config/production-defaults.json"), original = readFileSync(path);
    rmSync(path);
    assert.throws(() => startProduction({ ...params, id: "missing_defaults" }), /기본값/);
    assert.equal(existsSync(join(repo, "news/missing_defaults")), false);
    writeFileSync(path, original);
  });
  let id;
  check("URL·분량·원문만으로 시작, 설명·장면은 미작성", () => {
    const s = startProduction(params); id = s.pilot;
    assert.equal(s.managed, true);
    assert.equal(s.context.raw_request, params.request);
    assert.equal(s.context.request_preserved, true);
    assert.deepEqual(s.context.request.duration_sec, { min: 60, max: 90 });
    assert.equal(s.context.creative_scope.diagrams, "delegated");
    assert.equal(s.context.question, null);
    assert.equal(s.context.production_defaults.snapshot.baseline_commit, "59a2af79");
    const newVisual = json(join(repo, "news", id, "02_production/visual-system.json"));
    assert.equal(newVisual.production_profile.version, "1.2.0");
    assert.equal(newVisual.project_logo.width, 140);
    assert.equal(newVisual.media.assets.find(a => a.id === "project_logo").file, "editorial/brand-logo.png");
    assert.equal(createHash("sha256").update(readFileSync(join(repo, "news", id, "02_production/brand/logo.png"))).digest("hex"), newVisual.project_logo.sha256);
    const guide = join(repo, "config/production-defaults.md"), originalGuide = readFileSync(guide);
    writeFileSync(guide, "새 전역 기본값");
    assert.equal(productionStatus(id, { repo, includeContext: true }).context.production_defaults.text, s.context.production_defaults.text);
    writeFileSync(guide, originalGuide);
    assert.equal(s.context.stage, "research");
    assert.equal(s.completion.status, "incomplete");
    assert.deepEqual(s.next, []);
    for (const file of ["story.json", "concepts.json", "narration.txt", "motion.json", "facts.md"]) assert.equal(existsSync(join(repo, "news", id, "02_production", file)), false, file);
    assert.equal(existsSync(join(repo, "src/editorial/episodes", id + ".tsx")), false);
    assert.equal(sourceEngine(join(repo, "news", id)), "editorial-concept@1");
    assert.equal(s.context.profile.current.caption.preset, "betelgeuse-v1");
    assert.equal(s.context.profile.current.caption.max_lines, 1);
    const visual = json(join(repo, "news", id, "02_production/visual-system.json"));
    assert.deepEqual(visual.production_profile, { id: s.context.profile.current.id, version: s.context.profile.current.version });
  });
  const production = join(repo, "news", id, "02_production"), options = { repo };
  check("새 세션은 사용자 마감과 자동 검수를 구별하고 확정 파일 변경을 탐지", () => {
    const digest = (text) => createHash("sha256").update(text).digest("hex");
    const raw = `news/${id}/00_brief/closeout-request.txt`, video = `out/pilots/${id}/deliver/v1/test.mp4`;
    put(join(repo, raw), "테스트 사용자: 확인했고 마무리해줘"); put(join(repo, video), "합성 테스트 파일");
    put(join(production, "closeout.json"), { schema_version: "1.0", pilot: id, status: "closed", basis: "user-confirmed",
      raw_request: { path: raw, sha256: digest("테스트 사용자: 확인했고 마무리해줘") }, artifacts: [{ path: video, sha256: digest("합성 테스트 파일") }] });
    const closed = JSON.parse(cli(["resume", id, "--json"]).stdout);
    assert.equal(closed.delivery.status, "closed");
    assert.equal(closed.completion.status, "incomplete");
    put(join(repo, video), "다른 파일");
    assert.equal(JSON.parse(cli(["status", id, "--json"]).stdout).delivery.status, "changed");
    put(join(repo, video), "합성 테스트 파일"); put(join(repo, raw), "다른 요청");
    assert.equal(productionStatus(id, options).delivery.status, "changed");
    rmSync(join(production, "closeout.json")); rmSync(join(repo, raw)); rmSync(join(repo, "out/pilots", id), { recursive: true });
    assert.equal(productionStatus(id, options).delivery.status, "unrecorded");
  });
  check("새 프로세스·다른 cwd에서 요청과 미작성 상태 복구", () => {
    const s = JSON.parse(cli(["resume", id, "--json"]).stdout);
    assert.equal(s.context.raw_request, params.request);
    assert.equal(s.context.stage, "research");
    assert.equal(s.execution.engine.path, repo);
    assert.ok(s.context.instructions.every((file) => existsSync(file)));
  });
  check("반복 시작·다른 층의 이전 결과를 덮어쓰지 않음", () => {
    assert.throws(() => startProduction(params), /이미 있다/);
    put(join(repo, "out/pilots/collision/deliver/v1/original.mp4"), "보존할 이전 결과");
    assert.throws(() => startProduction({ ...params, id: "collision" }), /이미 있다/);
    assert.equal(existsSync(join(repo, "news/collision")), false);
  });
  check("자유롭게 작성한 설명·새 도해 선택으로 작업 문맥 전환", () => {
    put(join(production, "facts.md"), "합성 테스트 근거\n");
    assert.equal(productionStatus(id, { ...options, includeContext: true }).context.stage, "design");
    put(join(production, "story.json"), { mode: "editorial-concept", question: "두 현상은 어떻게 연결되는가?", takeaway: "관계의 변화", creative_scope: { diagrams: "delegated" } });
    put(join(production, "concepts.json"), { concepts: [{ id: "own_diagram", representation: { kind: "diagram", why: "이 기사에 맞는 새 공간" } }] });
    put(join(production, "narration.txt"), "테스트 원고\n");
    put(join(production, "decisions.md"), "기존 장면을 복사하지 않고 두 현상을 한 공간에서 설명한다.\n");
    const s = JSON.parse(cli(["resume", id, "--json"], { bridge: true }).stdout);
    assert.equal(s.context.stage, "production");
    assert.match(s.context.decisions[0].text, /한 공간/);
    assert.ok(s.context.instructions.every((path) => path.startsWith(join(repo, "plugin"))));
    assert.equal(s.execution.plugin.path, installed);
    assert.equal(s.execution.invocation, "plugin-entry");
    assert.equal(s.context.repository.root, repo);
    assert.ok(existsSync(s.context.repository.editorial_schema));
    assert.equal(s.execution.host_session_load, "unverified");
  });
  check("중단 토큰·실패·입력 변경을 새 시작 경로에서도 유지", () => {
    const token = JSON.parse(cli(["begin", id, "narration", "--tool", "synthetic-tts-not-called"], { bridge: true }).stdout);
    assert.equal(token.execution.plugin.path, installed);
    assert.equal(token.command.tool, "synthetic-tts-not-called");
    const resumed = JSON.parse(cli(["resume", id, "--json"], { bridge: true }).stdout);
    assert.equal(resumed.actions.narration.pending.token, token.id);
    put(join(production, "narration.txt"), "바뀐 테스트 원고\n");
    assert.throws(() => finishProductionAction(id, token.id, options), /도중 입력/);
    failProductionAction(id, token.id, "테스트 중단", options);
    assert.equal(productionStatus(id, options).attempts.at(-1).status, "failed");
  });
  check("다른 설치 경로의 실제 플러그인 입구로 새 편 시작", () => {
    const raw = join(fixtureRoot, "request.txt"); put(raw, params.request);
    const s = JSON.parse(cli(["start", "bridge_started", "--url", params.url, "--duration", "60:90", "--request-file", raw], { bridge: true }).stdout);
    assert.equal(s.pilot, "bridge_started");
    assert.equal(json(join(repo, "news/bridge_started/02_production/run.json")).initial_execution.plugin.path, installed);
    assert.equal(existsSync(join(other, "news")), false);
  });
  check("엔진 API 불일치는 실행·새 편 생성을 차단", () => {
    const path = join(repo, "config/production-engine.json"), original = readFileSync(path);
    put(path, { id: "editorial-concept@1", entry_api: "future@2" });
    assert.match(cli(["resume", id], { bridge: true, expected: 1 }).stderr, /계약이 다르다/);
    assert.match(cli(["resume", id], { expected: 1 }).stderr, /진입 API/);
    assert.ok(productionRenderErrors(id, options).some((e) => e.includes("environment")));
    assert.ok(productionStatus(id, options).completion.blockers.some((b) => b.code === "incompatible-environment"));
    put(path, original);
  });
  check("새 명령 없는 이전 계약 엔진은 플러그인 입구에서 차단", () => {
    const path = join(repo, "config/production-engine.json"), original = readFileSync(path);
    put(path, { id: "editorial-concept@1", entry_api: "production-entry@1" });
    assert.match(cli(["review-input", id, "--source", "preview", "--phase", "experience"], { bridge: true, expected: 1 }).stderr, /계약이 다르다/);
    put(path, original);
  });
  check("플러그인 입구는 새 조회 명령을 같은 엔진에 연결하고 없는 시안은 만들지 않음", () => {
    const before = readFileSync(join(production, "run.json"));
    assert.match(cli(["review-input", id, "--source", "preview", "--phase", "experience"], { bridge: true, expected: 1 }).stderr, /현재 proof 기록/);
    assert.deepEqual(readFileSync(join(production, "run.json")), before);
    const resumed = JSON.parse(cli(["resume", id, "--json"], { bridge: true }).stdout);
    assert.equal(resumed.context.work.review_inputs.preview.status, "unrecorded");
    assert.equal(resumed.context.work.review_inputs.render.status, "unrecorded");
    assert.equal(JSON.stringify(resumed.context).includes("editorial-examples"), false);
    assert.equal(resumed.execution.engine.entry_api, "production-entry@2");
  });
  check("선택 프로젝트와 실제 실행 코드가 다르면 거절", () => {
    assert.match(cli(["resume", id], { env: { SHORTFORM_PROJECT_ROOT: other }, expected: 1 }).stderr, /저장소가 다르다/);
  });
  check("디스크 소스·실행 설치본의 동일 버전 내용 변경도 탐지", () => {
    const file = join(installed, "skills/shortform-news-pipeline/SKILL.md"), old = readFileSync(file);
    put(file, Buffer.concat([old, Buffer.from("\n합성 변경\n")]));
    const env = productionEnvironment({ repo, pluginRoot: installed });
    assert.ok(env.warnings.some((x) => x.includes("소스와 다르다")));
    assert.equal(env.execution.errors.length, 0); // 같은 API의 차이는 기록하며 표현 작업을 임의로 막지 않는다.
    put(file, old);
    assert.equal(executionIdentity(repo, installed).plugin.sha256, productionEnvironment({ repo }).plugin_source.sha256);
  });
  check("도구 탐지와 실제 수행을 구분하고 옛 도구 목록은 자동 재사용하지 않음", () => {
    const inventory = join(fixtureRoot, "capabilities.json");
    put(inventory, { schema_version: "1.0", host: "synthetic-test-host", tools: [{ purpose: "audio_listening", tool: "synthetic-only" }] });
    const result = JSON.parse(cli(["doctor", "--capabilities", inventory], { bridge: true }).stdout);
    assert.equal(result.session_tools.status, "reported");
    assert.equal(result.local_tools.remotion.status, "unavailable");
    const fresh = JSON.parse(cli(["doctor"], { bridge: true }).stdout);
    assert.equal(fresh.session_tools.status, "unverified");
    assert.deepEqual(fresh.session_tools.tools, []);
    assert.equal(productionStatus(id, options).actions.review_audio.status, "unrecorded");
  });
  check("옛 editorial 생성기는 예시 장면을 복사하지 않고 새 진입점으로 안내", () => {
    const r = spawnSync(process.execPath, [join(repo, "scripts/new-pilot.mjs"), "old_entry", "--mode", "editorial-concept"], { encoding: "utf8", cwd: other });
    assert.equal(r.status, 2); assert.match(r.stderr, /produce start/);
    assert.equal(existsSync(join(repo, "news/old_entry")), false);
  });
  check("접수 원문 변조는 복구 정보와 완료 판정에 드러남", () => {
    const raw = join(repo, "news", id, "00_brief/user-request.txt"), old = readFileSync(raw);
    put(raw, "바꾼 원문");
    const s = productionStatus(id, { ...options, includeContext: true });
    assert.equal(s.context.request_preserved, false);
    assert.ok(s.completion.blockers.some((x) => x.code === "changed-request-original"));
    put(raw, old);
  });
  check("저장소 밖을 가리키는 news 경로로 새 편을 쓰지 않음", () => {
    const isolated = join(fixtureRoot, "escaped-project"); mkdirSync(isolated);
    cpSync(join(repo, "config"), join(isolated, "config"), { recursive: true });
    cpSync(join(repo, "scripts"), join(isolated, "scripts"), { recursive: true });
    symlinkSync(other, join(isolated, "news"));
    assert.throws(() => startProduction({ ...params, repo: isolated, id: "outside" }), /밖/);
    assert.equal(existsSync(join(other, "outside")), false);
  });
  console.log("production entry: PASS — " + cases + "개 시작·재개·플러그인 연결 사례 (외부 생성·기사 수집·청취 없음)");
} finally { rmSync(fixtureRoot, { recursive: true, force: true }); }
