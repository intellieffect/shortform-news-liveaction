import { episodePrompt } from './prompt.mjs';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { ACTIONS, changedFiles, fileSnapshot, hash, json, recipe, validateOutput, workspace } from "./contracts.mjs";

import { productionContext } from "./context.mjs";
import { productionDelivery } from "./delivery.mjs";
import { buildReviewInput } from "./review-input.mjs";
import { executionIdentity } from "./environment.mjs";
import { productionCompletion, productionReviewTemplate, resolutionRecord, validateRender, validateReview } from "./review.mjs";

const empty = (w) => ({ schema_version: "1.0", pilot: w.id, engine: "editorial-concept@1", receipts: {}, attempts: [], impacts: {} });
const read = (w) => {
  if (!existsSync(w.runFile)) return empty(w);
  const state = json(w.runFile);
  if (state.schema_version !== "1.0" || state.pilot !== w.id || state.engine !== "editorial-concept@1" || !state.receipts || !state.impacts || !Array.isArray(state.attempts)) throw new Error("지원하지 않거나 깨진 run.json");
  return state;
};
const transaction = (w, mutate) => {
  const lock = w.runFile + ".lock";
  try { mkdirSync(lock); }
  catch { throw new Error("run.json 갱신 잠금이 있다: " + lock + " — 진행 중 쓰기를 확인한 뒤 복구"); }
  const temp = w.runFile + "." + randomUUID() + ".tmp";
  try {
    const state = read(w);
    const result = mutate(state);
    writeFileSync(temp, JSON.stringify(state, null, 2) + "\n");
    renameSync(temp, w.runFile);
    return result;
  } finally { rmSync(temp, { force: true }); rmSync(lock, { recursive: true, force: true }); }
};
const now = () => new Date().toISOString();
const fingerprint = (w, action, state, cache) => {
  const spec = recipe(w, action);
  const files = fileSnapshot(w, spec.inputs, cache);
  const dependencies = Object.fromEntries(spec.deps.map((dep) => [dep, state.receipts[dep]?.id ?? null]));
  const impact = state.impacts[action]?.id ?? null;
  return { files, dependencies, impact, sha256: hash(JSON.stringify({ files, dependencies, impact })) };
};
const inspect = (w, state) => {
  const result = {};
  const cache = new Map();
  for (const action of ACTIONS) {
    const spec = recipe(w, action);
    const current = fingerprint(w, action, state, cache);
    const receipt = state.receipts[action];
    const pending = state.attempts.findLast((a) => a.action === action && a.status === "running");
    const reasons = [];
    for (const dep of spec.deps) if (result[dep].status !== "current") reasons.push({ kind: "dependency", action: dep, status: result[dep].status });
    for (const path of spec.required) if (current.files[path] === null) reasons.push({ kind: "missing-input", path });
    if (receipt) {
      for (const path of changedFiles(receipt.inputs.files, current.files)) reasons.push({ kind: "changed-input", path });
      const outputs = fileSnapshot(w, Object.keys(receipt.outputs), cache);
      for (const path of changedFiles(receipt.outputs, outputs)) reasons.push({ kind: outputs[path] === null ? "missing-output" : "changed-output", path });
      if (JSON.stringify(receipt.inputs.dependencies) !== JSON.stringify(current.dependencies)) reasons.push({ kind: "upstream-rebuilt" });
      if (receipt.inputs.impact !== current.impact) reasons.push({ kind: "manual-impact", reason: state.impacts[action]?.reason });
    } else if (state.impacts[action]) reasons.push({ kind: "manual-impact", reason: state.impacts[action].reason });
    const status = pending ? "unfinished" : !receipt ? "unrecorded" : reasons.length ? "stale" : "current";
    result[action] = {
      status, reasons, receipt_id: receipt?.id ?? null, provenance: receipt?.provenance ?? null,
      outputs: receipt?.outputs ?? {}, pending: pending ? { token: pending.id, started_at: pending.started_at, outputs: pending.outputs, log: pending.log } : null,
      runnable: !pending && spec.deps.every((dep) => result[dep].status === "current") && !spec.required.some((file) => current.files[file] === null),
    };
  }
  return result;
};


export const productionStatus = (id, { repo, includeContext = false } = {}) => {
  const w = workspace(id, repo);
  const state = read(w);
  const actions = inspect(w, state);
  const completion = productionCompletion(w, state, actions);
  return {
    schema_version: state.schema_version, pilot: id, managed: existsSync(w.runFile), state_file: w.rel(w.runFile),
    actions, next: ACTIONS.filter((action) => actions[action].status !== "current" && actions[action].runnable),
    impacts: state.impacts,
    attempts: state.attempts.map(({ id, action, status, started_at, finished_at, elapsed_ms, log, error }) => ({ token: id, action, status, started_at, finished_at, elapsed_ms, log, error })),
    completion, delivery: productionDelivery(w),
    ...(includeContext ? { context: productionContext(w, state, actions, completion), execution: executionIdentity(w.repo) } : {}),
  };
};

const outputPaths = (w, action, custom) => {
  const fixed = recipe(w, action).outputs;
  const paths = fixed.length ? fixed : custom ?? [];
  if (!paths.length) throw new Error(action + ": 새 결과 파일을 --output으로 지정해야 한다");
  for (const file of paths) {
    w.path(file);
    if (!fixed.length) {
      const prefix = action.startsWith("review_") ? "news/" + w.id + "/02_production/reviews/" : "out/pilots/" + w.id + "/";
      if (!file.startsWith(prefix) || file.includes("/deliver/")) throw new Error("작업 출력 경로가 아니다: " + file);
      if (existsSync(w.path(file))) throw new Error("이전 결과를 덮어쓸 수 없다: " + file);
    }
  }
  return [...new Set(paths)].sort();
};

export const beginProductionAction = (id, action, { repo, outputs, command = null } = {}) => {
  const w = workspace(id, repo);
  return transaction(w, (state) => {
    const statuses = inspect(w, state);
    if (!statuses[action]) throw new Error("알 수 없는 작업: " + action);
    if (!statuses[action].runnable) throw new Error(action + " 실행 불가: " + JSON.stringify(statuses[action]));
    const token = randomUUID();
    let commit = null;
    try { commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: w.repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* 테스트·미커밋 저장소 */ }
    const attempt = {
      id: token, action, status: "running", started_at: now(),
      inputs: fingerprint(w, action, state), outputs: outputPaths(w, action, outputs),
      source_commit: commit, execution: executionIdentity(w.repo), command,
      log: "out/pilots/" + id + "/production/" + token + ".log",
    };
    state.attempts.push(attempt);
    return attempt;
  });
};

export const finishProductionAction = (id, token, { repo } = {}) => {
  const w = workspace(id, repo);
  return transaction(w, (state) => {
    const attempt = state.attempts.find((a) => a.id === token && a.status === "running");
    if (!attempt) throw new Error("열린 작업 토큰이 없다: " + token);
    const current = fingerprint(w, attempt.action, state);
    if (current.sha256 !== attempt.inputs.sha256) throw new Error("작업 도중 입력·상위 결과·의미 영향이 바뀌었다. 기존 결과를 최신으로 기록하지 않는다");
    const expectedOutputs = recipe(w, attempt.action).outputs;
    if (expectedOutputs.length && JSON.stringify(expectedOutputs) !== JSON.stringify(attempt.outputs)) throw new Error("작업 도중 출력 경로 계약이 바뀌었다");
    const statuses = inspect(w, state);
    for (const dep of recipe(w, attempt.action).deps) if (statuses[dep].status !== "current") throw new Error("상위 결과가 최신이 아니다: " + dep);
    let outputs = fileSnapshot(w, attempt.outputs);
    if (Object.values(outputs).some((value) => value === null)) throw new Error("필수 결과 파일이 없다");
    const prior = state.receipts[attempt.action];
    if (attempt.action === "narration" && prior) {
      const script = "news/" + id + "/" + json(join(w.production, "narration.json")).source.narration_txt;
      const audio = attempt.outputs.find((file) => file !== "news/" + id + "/02_production/narration.json");
      if (script && prior.inputs.files[script] !== current.files[script] && prior.outputs[audio] === outputs[audio]) throw new Error("낭독 원고가 바뀌었는데 음성 파일이 이전과 같다");
    }
    let validation;
    if (attempt.action === "render") validation = validateRender(w, outputs);
    else if (attempt.action.startsWith("review_")) ({ validation, outputs } = validateReview(w, state, attempt, outputs));
    else validation = validateOutput(w, attempt.action);
    // 디코드·증거 대조 중 입력이나 실물이 변해도 최신으로 기록하지 않는다.
    if (fingerprint(w, attempt.action, state).sha256 !== attempt.inputs.sha256 || changedFiles(outputs, fileSnapshot(w, Object.keys(outputs))).length) throw new Error("검증 도중 입력·결과·증거가 바뀌었다");
    const after = inspect(w, state);
    for (const dep of recipe(w, attempt.action).deps) if (after[dep].status !== "current") throw new Error("검증 도중 상위 결과가 바뀌었다: " + dep);
    const finished = now();
    state.receipts[attempt.action] = {
      id: attempt.id, action: attempt.action, inputs: attempt.inputs, outputs, validation,
      source_commit: attempt.source_commit, execution: attempt.execution, finished_at: finished, provenance: "executed",
    };
    Object.assign(attempt, { status: "succeeded", outputs_sha256: outputs, validation, finished_at: finished, elapsed_ms: Date.parse(finished) - Date.parse(attempt.started_at) });
    return state.receipts[attempt.action];
  });
};

export const failProductionAction = (id, token, error, { repo } = {}) => {
  const w = workspace(id, repo);
  return transaction(w, (state) => {
    const attempt = state.attempts.find((a) => a.id === token && a.status === "running");
    if (!attempt) throw new Error("열린 작업 토큰이 없다: " + token);
    const finished = now();
    Object.assign(attempt, { status: "failed", error: String(error), finished_at: finished, elapsed_ms: Date.parse(finished) - Date.parse(attempt.started_at) });
    // 실패 이전 산출물의 입력이 같더라도 실패 시도 결과를 최신으로 오인하지 않는다.
    state.impacts[attempt.action] = { id: randomUUID(), reason: "실행 실패: " + error, at: finished };
    return attempt;
  });
};

export const invalidateProductionAction = (id, action, reason, { repo } = {}) => {
  const w = workspace(id, repo);
  if (!ACTIONS.includes(action) || !reason?.trim()) throw new Error("유효한 작업과 의미 변경 이유가 필요하다");
  return transaction(w, (state) => (state.impacts[action] = { id: randomUUID(), reason, at: now() }));
};

// 기존 음성만 명시적으로 수입한다. 파일의 존재나 옛 P7 문구로 렌더·검수를 완료 처리하지 않는다.
export const adoptNarration = (id, { repo } = {}) => {
  const w = workspace(id, repo);
  return transaction(w, (state) => {
    if (state.receipts.narration || state.attempts.some((a) => a.action === "narration")) throw new Error("이미 추적 중인 음성은 adopt로 갱신할 수 없다. begin/finish를 사용한다");
    const validation = validateOutput(w, "narration");
    const outputs = fileSnapshot(w, recipe(w, "narration").outputs);
    if (Object.values(outputs).some((v) => !v)) throw new Error("수입할 음성·정렬 파일이 없다");
    state.receipts.narration = {
      id: randomUUID(), action: "narration", inputs: fingerprint(w, "narration", state), outputs,
      finished_at: now(), source_commit: null, validation, provenance: "adopted",
      limitation: "현재 원고·어절 기록·파일을 대조한 기존 결과 수입. 최초 생성 입력 전체와 청취를 소급 증명하지 않는다",
    };
    state.attempts.push({ ...state.receipts.narration, status: "adopted", outputs: Object.keys(outputs), outputs_sha256: outputs, started_at: state.receipts.narration.finished_at, elapsed_ms: null, log: null });
    return state.receipts.narration;
  });
};

// 표준 렌더 명령에서도 관리 중인 편의 입력→음성→컴파일→sync를 대조한다.
export const productionRenderErrors = (id, options = {}) => {
  const w = workspace(id, options.repo);
  if (!existsSync(w.runFile)) return [];
  const status = productionStatus(id, options);
  const environmentErrors = w.request ? executionIdentity(w.repo).errors.map((error) => "[production-stale] environment: " + error) : [];
  const prompt = episodePrompt(w);
  return [...(prompt.status === "invalid" ? ["[production-prompt] " + prompt.error] : []), ...environmentErrors, ...["narration", "timeline", "sync"].filter((a) => status.actions[a].status !== "current").map((a) =>
    "[production-stale] " + a + ": " + status.actions[a].status + " — npm run produce -- resume " + id)];
};

export const productionReviewInput = (id, { repo, source, phase } = {}) => {
  const w = workspace(id, repo), state = read(w), actions = inspect(w, state);
  const result = buildReviewInput(w, state, actions, { source, phase });
  const latest = read(w), action = source === "render" ? "render" : "proof";
  if (latest.receipts[action]?.id !== result.receipt_id || inspect(w, latest)[action].status !== "current") throw new Error("입력 구성 중 시안의 입력·기록이 바뀌었다");
  return result;
};

export const reviewTemplate = (id, action, { repo } = {}) => {
  const w = workspace(id, repo), state = read(w);
  if (inspect(w, state).render.status !== "current") throw new Error("현재 렌더부터 기록해야 한다");
  return productionReviewTemplate(w, state, action);
};

export const resolveProductionIssue = (id, issue, description, range, { repo } = {}) => {
  const w = workspace(id, repo);
  return transaction(w, (state) => {
    if (inspect(w, state).render.status !== "current") throw new Error("수정 결과의 현재 렌더부터 기록해야 한다");
    const record = { id: randomUUID(), at: now(), ...resolutionRecord(w, state, issue, description, range) };
    (state.resolutions ??= []).push(record);
    return record;
  });
};

// 사용자 승인 단계가 아니다. 위임받은 제작자가 실물 검수와 수정 후 완료 근거를 확정한다.
export const completeProduction = (id, { repo } = {}) => {
  const w = workspace(id, repo);
  return transaction(w, (state) => {
    const result = productionCompletion(w, state, inspect(w, state));
    if (result.status === "incomplete") throw new Error("제작 미완료: " + JSON.stringify(result.blockers));
    if (result.confirmation) return result.confirmation;
    const record = { id: randomUUID(), at: now(), basis: result.basis, artifact: result.artifact, reviews: Object.fromEntries(["review_visual", "review_audio", "review_facts"].map((a) => [a, state.receipts[a].id])), remaining_minor_issues: result.issues.filter((i) => i.severity === "minor" && i.status !== "fixed").map((i) => ({ key: i.key, observation: i.observation })) };
    (state.completions ??= []).push(record);
    return record;
  });
};

export const initializeProduction = (id, { repo } = {}) => {
  const w = workspace(id, repo);
  if (existsSync(w.runFile)) throw new Error("이미 제작 기록이 있다");
  return transaction(w, (state) => {
    state.started_at = now();
    state.initial_execution = executionIdentity(w.repo);
    return state;
  });
};
