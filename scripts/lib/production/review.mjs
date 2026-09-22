import {visualReviewTargets} from '../visual-plan.mjs';
import {visualWork, validateExplanationReview} from './visual-work.mjs';
import { episodePrompt } from './prompt.mjs';
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { executionIdentity } from "./environment.mjs";
import { fileSnapshot, hash, json } from "./contracts.mjs";

const CONTRACT = "production-review@1";
const ROLES = { review_visual: "shot-judge", review_audio: "audio-reviewer", review_facts: "fact-check" };
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
const text = (value) => typeof value === "string" && value.trim().length > 0;
const probe = (file, entries) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", entries, "-of", "json", file], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));
const rate = (value) => { const [n, d = 1] = String(value).split("/").map(Number); return n / d; };
const timeline = (w) => json(join(w.production, "timeline.json"));
const target = (state) => {
  const render = state.receipts.render;
  requireValue(render?.validation?.contract === CONTRACT && render.validation.kind === "render", "기술 검증된 렌더 기록이 필요하다");
  return { ...render.validation.artifact, render_receipt: render.id };
};
const same = (a, b) => a?.path === b?.path && a?.sha256 === b?.sha256 && a?.render_receipt === b?.render_receipt;
const rangeValid = (range, total) => Array.isArray(range) && range.length === 2 && range.every(Number.isInteger) && range[0] >= 0 && range[0] < range[1] && range[1] <= total;
const covers = (ranges, [from, end]) => {
  let cursor = from;
  for (const [a, b] of [...ranges].sort((x, y) => x[0] - y[0])) {
    if (a > cursor) return false;
    cursor = Math.max(cursor, b);
    if (cursor >= end) return true;
  }
  return false;
};
const reviews = (state) => state.attempts.filter((a) => a.status === "succeeded" && a.validation?.contract === CONTRACT && a.validation.kind === "review");

// 관찰 원문은 성공한 검수 기록에 남고, 제작자 수정과 검수자 재확인은 별도 사건으로 붙는다.
export const productionIssues = (state) => reviews(state).flatMap((a) => a.validation.report.findings.map((finding) => ({
  ...finding, key: a.id + ":" + finding.id, action: a.action, artifact: a.validation.report.artifact,
  reviewer: a.validation.report.reviewer, report: a.validation.report_path,
})));

export const validateRender = (w, outputs) => {
  const files = Object.keys(outputs);
  requireValue(files.length === 1 && files[0].endsWith(".mp4"), "렌더 결과는 새 MP4 한 개여야 한다");
  const path = files[0], file = w.path(path), t = timeline(w);
  const { canvas } = json(join(w.repo, "config/production-profile.json"));
  const data = probe(file, "stream=codec_type,width,height,avg_frame_rate,nb_frames,duration:format=duration");
  const videos = data.streams?.filter((s) => s.codec_type === "video") ?? [];
  const audios = data.streams?.filter((s) => s.codec_type === "audio") ?? [];
  const video = videos[0], audio = audios[0], duration = t.total_frames / t.fps;
  if (w.request && (duration < w.request.duration_sec.min || duration > w.request.duration_sec.max)) throw new Error("영상 길이가 이번 편의 요청 범위를 벗어났다");
  requireValue(videos.length === 1 && audios.length === 1, "영상·최종 음향 스트림이 각각 하나 필요하다");
  requireValue(video.width === canvas.width && video.height === canvas.height && t.fps === canvas.fps && Math.abs(rate(video.avg_frame_rate) - t.fps) < 0.001, "렌더 해상도·FPS가 현재 프로필/시간축과 다르다");
  requireValue(Number(video.nb_frames) === t.total_frames && Math.abs(Number(video.duration) - duration) <= 1 / t.fps, "렌더 프레임 수·길이가 현재 시간축과 다르다");
  requireValue(Number.isFinite(Number(audio.duration)) && Math.abs(Number(audio.duration) - duration) <= 0.15 && Math.abs(Number(data.format?.duration) - duration) <= 0.15, "최종 음향·컨테이너 길이가 영상과 다르다");
  execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", file, "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
  requireValue(fileSnapshot(w, [path])[path] === outputs[path], "검증 도중 MP4가 바뀌었다");
  return { contract: CONTRACT, kind: "render", artifact: { path, sha256: outputs[path] }, media: { width: video.width, height: video.height, fps: t.fps, total_frames: t.total_frames, duration, audio_duration: Number(audio.duration) }, full_decode: true, limitation: "스트림·전체 디코드 검사. 실제 시청·청취와 내용 일치는 독립 검수 대상" };
};

// 기본값은 전부 미검수다. 도구를 실행하지 않고 시청·청취 기록을 채우지 않는다.
export const productionReviewTemplate = (w, state, action) => {
  requireValue(ROLES[action], "review_visual|review_audio|review_facts 중 하나가 필요하다");
  return {
    schema_version: "1.0", action, artifact: target(state), source_commit: state.receipts.render.source_commit,
    reviewer: { id: "", role: ROLES[action], independent: false, tool: "" },
    verdict: "incomplete", raw_report: { path: "", sha256: "" }, evidence: [],
    coverage: { original_frames: [], mobile_frames: [], playback_ranges: [], listened_ranges: [], fact_ranges: [], audio_measurement: null },
    findings: [], rechecks: [],
    ...(action === 'review_visual' ? {text_review: {verdict: 'unverified', observation: '', evidence: []}, explanations: visualReviewTargets(existsSync(join(w.production, 'concepts.json')) ? json(join(w.production, 'concepts.json')) : {}).map(t => ({concept_id: t.concept_id, moment_id: t.id, verdict: 'unverified', basis: 'unverified', observed_subject: '', observed_action: '', observed_result: '', text_dependency: '', evidence: []}))} : {}),
  };
};

const coverageGaps = (report, t) => {
  const c = report.coverage, gaps = [], all = [0, t.total_frames];
  if (!report.reviewer.independent) gaps.push("독립 검수 미확인");
  if (report.action === "review_visual") {
    for (const kind of ["original_frames", "mobile_frames"]) {
      for (const concept of t.concepts) if (!c[kind].some((s) => s.frame >= concept.from && s.frame < concept.end)) gaps.push(kind + ": " + concept.id + " 표본 없음");
    }
    if (!covers(c.playback_ranges, all)) gaps.push("영상 전체 연속 시청 미완료");
  }
  if (report.action === "review_audio") {
    if (!covers(c.listened_ranges, all)) gaps.push("최종 음향 전체 청취 미완료");
    if (!c.audio_measurement) gaps.push("음향 구간 측정 근거 없음");
  }
  if (report.action === "review_facts" && !covers(c.fact_ranges, all)) gaps.push("최종 영상 시간축의 사실 대조 미완료");
  return gaps;
};

export const validateReview = (w, state, attempt, outputs) => {
  const files = Object.keys(outputs);
  requireValue(files.length === 1 && files[0].endsWith(".json"), "검수 결과는 구조화 JSON 한 개여야 한다. 원문은 raw_report로 연결한다");
  const report = json(w.path(files[0])), t = timeline(w), total = t.total_frames;
  requireValue(report.schema_version === "1.0" && report.action === attempt.action, "검수 schema/action 불일치");
  requireValue(same(report.artifact, target(state)), "검수 대상이 현재 렌더의 파일·해시·기록과 다르다");
  requireValue(report.source_commit === state.receipts.render.source_commit, "검수 source_commit이 렌더 시작 HEAD와 다르다");
  requireValue(text(report.reviewer?.id) && text(report.reviewer?.tool) && report.reviewer?.role === ROLES[attempt.action] && typeof report.reviewer.independent === "boolean", "검수자·역할·실제 사용 도구·독립 여부가 필요하다");
  requireValue(["pass", "changes_requested", "incomplete"].includes(report.verdict), "검수 verdict가 유효하지 않다");
  requireValue(Array.isArray(report.evidence) && Array.isArray(report.findings) && Array.isArray(report.rechecks), "evidence/findings/rechecks 배열이 필요하다");
  const refs = [report.raw_report, ...report.evidence], hashes = {};
  for (const ref of refs) {
    requireValue(text(ref?.path) && /^[a-f0-9]{64}$/.test(ref?.sha256), "증거의 저장소 경로·SHA256이 필요하다");
    requireValue(ref.path !== files[0], "검수 JSON을 자기 원문/증거로 참조할 수 없다");
    const actual = fileSnapshot(w, [ref.path])[ref.path];
    requireValue(actual && actual === ref.sha256, "검수 증거가 없거나 해시가 다르다: " + ref.path);
    hashes[ref.path] = actual;
  }
  requireValue(text(readFileSync(w.path(report.raw_report.path), "utf8")), "빈 검수 원문은 기록할 수 없다");
  const c = report.coverage;
  requireValue(c && ["original_frames", "mobile_frames", "playback_ranges", "listened_ranges", "fact_ranges"].every((key) => Array.isArray(c[key])), "확인 범위를 배열로 기록해야 한다");
  for (const key of ["playback_ranges", "listened_ranges", "fact_ranges"]) for (const range of c[key]) requireValue(rangeValid(range, total), key + ": 범위를 벗어난 프레임 구간");
  const dimensions = new Map();
  const { width, height } = state.receipts.render.validation.media;
  for (const kind of ["original_frames", "mobile_frames"]) for (const sample of c[kind]) {
    requireValue(Number.isInteger(sample.frame) && sample.frame >= 0 && sample.frame < total && hashes[sample.evidence], "프레임 번호와 연결된 표본 증거가 필요하다");
    if (!dimensions.has(sample.evidence)) dimensions.set(sample.evidence, probe(w.path(sample.evidence), "stream=codec_type,width,height").streams?.find((s) => s.codec_type === "video"));
    const image = dimensions.get(sample.evidence);
    requireValue(image && (kind === "original_frames" ? image.width === width && image.height === height : image.width === Math.round(width / 3) && image.height === Math.round(height / 3)), kind + ": 실제 표본 해상도가 다르다");
  }
  requireValue(c.audio_measurement === null || Boolean(hashes[c.audio_measurement]), "음향 측정은 연결된 증거 파일이어야 한다");
  if (attempt.action === "review_facts") requireValue(Boolean(hashes[w.rel(join(w.production, "facts.md"))]), "사실 검수에는 현재 facts.md 증거가 필요하다");
  const ids = new Set();
  for (const finding of report.findings) {
    requireValue(text(finding.id) && !finding.id.includes(":") && !ids.has(finding.id) && ["blocking", "minor"].includes(finding.severity) && rangeValid(finding.range, total) && text(finding.observation), "결함 ID·심각도·구간·관찰 원문이 유효하지 않다");
    ids.add(finding.id);
  }
  const prior = productionIssues(state), rechecked = new Set();
  for (const recheck of report.rechecks) {
    const issue = prior.find((i) => i.key === recheck.issue);
    const resolution = (state.resolutions ?? []).findLast((r) => r.issue === recheck.issue);
    requireValue(issue?.action === attempt.action && !rechecked.has(recheck.issue), "같은 분야의 기존 이슈를 한 번만 재검수할 수 있다");
    requireValue(resolution?.id === recheck.resolution_id && same(resolution.artifact, report.artifact), "현재 렌더에 연결된 최신 제작자 수정 기록이 필요하다");
    requireValue(rangeValid(recheck.range, total) && text(recheck.observation) && ["fixed", "open"].includes(recheck.verdict), "재검수 범위·관찰 원문·판정이 필요하다");
    // 편집으로 옛 시각이 이동할 수 있다. 현재 수정 구간을 제작자가 명시하고 검수자는 그 전체를 다시 본다.
    requireValue(covers([recheck.range], resolution.range), "재검수 범위가 수정 대상 구간을 덮지 않는다");
    const viewed = attempt.action === "review_audio" ? c.listened_ranges : attempt.action === "review_facts" ? c.fact_ranges : c.playback_ranges;
    requireValue(covers(viewed, recheck.range), "재검수 구간의 실제 확인 기록이 없다");
    rechecked.add(recheck.issue);
  }
  if (attempt.action === "review_visual") validateExplanationReview(w, report, t);
  const gaps = coverageGaps(report, t);
  requireValue(report.verdict !== "pass" || !report.findings.some((f) => f.severity === "blocking"), "차단 결함이 있는 보고서를 pass로 기록할 수 없다");
  return { validation: { contract: CONTRACT, kind: "review", report_path: files[0], report, gaps }, outputs: { ...outputs, ...hashes } };
};

export const resolutionRecord = (w, state, issueKey, description, range) => {
  const issue = productionIssues(state).find((i) => i.key === issueKey);
  requireValue(issue && text(description), "기존 이슈 ID와 제작자 수정 설명이 필요하다");
  requireValue(rangeValid(range, timeline(w).total_frames), "현재 영상의 수정 대상 범위 [from,end)가 필요하다");
  return { issue: issueKey, description, range, artifact: target(state) };
};

export const productionCompletion = (w, state, actions) => {
  const blockers = [], add = (code, detail, action) => blockers.push({ code, detail, ...(action ? { action } : {}) });
  const prompt = episodePrompt(w);
  if (prompt.status === "invalid") add("invalid-production-prompt", prompt.error);
  if (state.intake_sha256) {
    const requestPath = join(w.root, '00_brief/request.json');
    if (!existsSync(requestPath) || hash(readFileSync(requestPath)) !== state.intake_sha256) add('changed-intake-contract', '새 제작 접수 계약이 시작 기록과 다르다');
  }
  const visual = visualWork(w, state);
  if (visual.status === 'invalid') add('visual-plan-invalid', '화면 설계 계약 누락·불일치');
  for (const task of visual.tasks ?? []) if (task.kind === 'generation') add('visual-generation-unresolved', task.job_id + ': ' + task.status);
  const history = reviews(state), reviewSummary = {}, evidenceCache = new Map();
  if (w.request) {
    for (const error of executionIdentity(w.repo).errors) add("incompatible-environment", error);
    try {
      const raw = readFileSync(w.path("news/" + w.id + "/" + w.request.raw_request));
      if (hash(raw) !== w.request.raw_request_sha256) add("changed-request-original", "접수 요청 원문이 바뀌었다");
    } catch { add("missing-request-original", "접수 요청 원문을 확인할 수 없다"); }
  }
  for (const action of ["render", ...Object.keys(ROLES)]) if (actions[action].status !== "current") add("action-not-current", actions[action].status, action);
  let artifact = null;
  try { artifact = target(state); } catch (e) { add("render-unverified", e.message, "render"); }
  for (const action of Object.keys(ROLES)) {
    const v = state.receipts[action]?.validation;
    if (v?.contract !== CONTRACT || v.kind !== "review") { add("review-unverified", "구조화 실물 검수 없음", action); continue; }
    if (!same(v.report.artifact, artifact)) add("review-wrong-artifact", "다른 영상의 검수", action);
    if (v.report.verdict !== "pass") add("review-not-passed", v.report.verdict, action);
    // 같은 실물·입력의 독립 검수 범위만 합친다. 부분 재검수 때문에 이미 본 범위를 반복하지 않는다.
    const eligible = history.filter((a) => a.action === action && a.inputs.sha256 === state.receipts[action].inputs.sha256 && same(a.validation.report.artifact, artifact) && a.validation.report.reviewer.independent);
    const coverage = { original_frames: [], mobile_frames: [], playback_ranges: [], listened_ranges: [], fact_ranges: [], audio_measurement: null };
    for (const a of eligible) {
      const actual = fileSnapshot(w, Object.keys(a.outputs_sha256), evidenceCache);
      if (Object.keys(actual).some((path) => actual[path] !== a.outputs_sha256[path])) { add("changed-coverage-evidence", a.validation.report_path, action); continue; }
      for (const key of ["original_frames", "mobile_frames", "playback_ranges", "listened_ranges", "fact_ranges"]) coverage[key].push(...a.validation.report.coverage[key]);
      coverage.audio_measurement = a.validation.report.coverage.audio_measurement ?? coverage.audio_measurement;
    }
    reviewSummary[action] = { reports: eligible.map((a) => a.validation.report_path), coverage, reviewer: v.report.reviewer };
    for (const gap of coverageGaps({ ...v.report, coverage }, timeline(w))) add("coverage-gap", gap, action);
  }
  const issues = productionIssues(state).map((issue) => {
    const resolution = (state.resolutions ?? []).findLast((r) => r.issue === issue.key);
    const recheck = history.flatMap((a) => a.validation.report.rechecks.map((r) => ({ ...r, review: a }))).findLast((r) => r.issue === issue.key);
    const currentReview = recheck?.review && actions[issue.action].status === "current" && state.receipts[issue.action]?.inputs.sha256 === recheck.review.inputs.sha256 && same(recheck.review.validation.report.artifact, artifact);
    const fixed = Boolean(currentReview && resolution && recheck.resolution_id === resolution.id && same(resolution.artifact, artifact) && recheck.verdict === "fixed" && recheck.review.validation.report.reviewer.independent);
    return { ...issue, status: fixed ? "fixed" : currentReview && recheck.resolution_id === resolution?.id && recheck.verdict === "open" ? "open" : resolution ? "awaiting-recheck" : "open", resolution: resolution ?? null, recheck: recheck ? { verdict: recheck.verdict, observation: recheck.observation, receipt_id: recheck.review.id } : null };
  });
  for (const issue of issues) if (issue.severity === "blocking" && issue.status !== "fixed") add("unresolved-issue", issue.key, issue.action);
  // 이전 이슈 원문도 지워지거나 바뀌면 조용히 잊지 않는다. 과거 MP4 전체 보존 여부는 이 검사와 별개다.
  for (const a of history) {
    const v = a.validation, paths = [v.report_path, v.report.raw_report.path];
    const actual = fileSnapshot(w, paths, evidenceCache);
    for (const path of paths) if (actual[path] !== a.outputs_sha256[path]) add("changed-review-history", path, a.action);
  }
  const basis = hash(JSON.stringify({ receipts: ["render", ...Object.keys(ROLES)].map((a) => state.receipts[a]?.id), resolutions: state.resolutions ?? [], issues: issues.map((i) => [i.key, i.status]) }));
  const confirmation = (state.completions ?? []).findLast((c) => c.basis === basis) ?? null;
  return { status: blockers.length ? "incomplete" : confirmation ? "complete" : "ready", artifact, blockers, reviews: reviewSummary, issues, basis, confirmation,
    limitation: "완료는 현재 파일과 기록된 독립 검수 범위의 일치를 뜻한다. 선언된 시청·청취·독립성의 진실이나 표현 품질을 코드가 증명하지 않는다" };
};
