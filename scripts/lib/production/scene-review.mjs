import {readFileSync, realpathSync} from 'node:fs';
import {join, sep} from 'node:path';
import {fileSnapshot, hash, json, recipe} from './contracts.mjs';
import {execFileSync} from 'node:child_process';

export const FIRST_SCENE_GATE = 'first-core-scene@2';
export const LEGACY_FIRST_SCENE_GATE = 'first-core-scene@1';
export const requiresSceneReview = (w, state = {}) => (state.scene_gate ?? w.request?.scene_gate) === FIRST_SCENE_GATE;
const text = value => typeof value === 'string' && value.trim().length > 0;

// A rendered, still-open attempt is reviewable before a verdict is recorded.
// This does not finish the attempt or claim that its media has been watched.
export function sceneReviewCandidate(w, state) {
  const attempt = state.attempts.findLast(a => a.action === 'scene_proof' && ['running', 'succeeded'].includes(a.status));
  if (!attempt) throw new Error('검토할 초기 장면 시안이 없다');
  const spec = recipe(w, 'scene_proof');
  const current = fileSnapshot(w, spec.inputs);
  if (JSON.stringify(current) !== JSON.stringify(attempt.inputs.files) || (spec.semantic ?? null) !== (attempt.inputs.semantic ?? null) || (state.impacts?.scene_proof?.id ?? null) !== attempt.inputs.impact) throw new Error('초기 장면 입력이 바뀌었다. 현재 시안부터 만든다');
  const paths = attempt.outputs.filter(p => p.endsWith('.json'));
  if (paths.length !== 1) throw new Error('초기 장면 관찰 JSON이 필요하다');
  const report = json(w.path(paths[0]));
  if (report.schema !== 'scene-proof@1' || !attempt.outputs.includes(report.artifact)) throw new Error('초기 장면 artifact 연결이 잘못됐다');
  const outputs = fileSnapshot(w, attempt.outputs);
  if (Object.values(outputs).some(v => !v)) throw new Error('시안 렌더가 아직 끝나지 않았다');
  if (attempt.status === 'succeeded' && Object.entries(attempt.outputs_sha256).some(([p, h]) => fileSnapshot(w, [p])[p] !== h)) throw new Error('기록된 시안·검수 근거가 바뀌었다');
  return {attempt, report, outputs};
}

// Re-rendering does not resolve an observation. Only a later recorded usable
// review with an explicit recheck closes it; already closed issues stay closed.
export function priorSceneRevisions(state, report) {
  const open = new Map();
  for (const attempt of state.attempts ?? []) {
    const previous = attempt.validation?.report;
    if (attempt.status !== 'succeeded' || attempt.validation?.kind !== 'scene-proof' || previous.concept_id !== report.concept_id || previous.phase !== report.phase || previous.scope !== report.scope) continue;
    if (previous.verdict === 'revise') open.set(attempt.id, {receipt_id: attempt.id, artifact: previous.artifact, observation: previous.observation, review: previous.review ?? null});
    if (previous.verdict === 'usable') for (const check of previous.review?.rechecks ?? []) {
      if (check.verdict === 'fixed' && text(check.observation)) open.delete(check.receipt_id);
    }
  }
  return [...open.values()];
}

const validRawEvidence = (w, raw) => {
  try {
    return text(raw?.path) && w.path(raw.path).startsWith(join(w.production, 'reviews') + sep) && realpathSync(w.path(raw.path)).startsWith(join(w.production, 'reviews') + sep) && text(raw.sha256) && hash(readFileSync(w.path(raw.path))) === raw.sha256;
  } catch { return false; }
};

// Validates bindings, not aesthetic quality or the truth of claimed viewing.
export function sceneReviewErrors(w, state, report, artifactHash) {
  if (!requiresSceneReview(w, state) || report.scope !== 'composite' || !['usable', 'provisional'].includes(report.verdict)) return [];
  const errors = [], add = message => errors.push(message), r = report.review;
  const provisional = report.phase === 'motion' && report.verdict === 'provisional';
  if (provisional) {
    const samples = report.sampling?.frames, duration = Number(json(join(w.production, 'scene-proof.json')).duration_seconds);
    if (report.sampling?.kind !== 'frames' || !text(report.sampling?.unobserved) || !Array.isArray(samples) || samples.length < 3 || !Number.isFinite(duration)) add('provisional 동작에는 시작·중간·끝 프레임과 연속 미확인 범위가 필요하다');
    else {
      const seconds = samples.map(s => s.second);
      if (seconds.some((second, index) => !Number.isFinite(second) || second < 0 || second >= duration || (index && second <= seconds[index - 1])) || seconds[0] > Math.min(0.5, duration / 4) || seconds.at(-1) < duration - Math.min(0.5, duration / 4) || !seconds.some(s => s >= duration * 0.2 && s <= duration * 0.8)) add('표본 시각은 시안의 시작·중간·끝을 포함해 오름차순이어야 한다');
      if (new Set(samples.map(s => s.path)).size !== samples.length || new Set(samples.map(s => s.sha256)).size < 2) add('서로 다른 표본 파일과 눈에 보이는 변화가 필요하다');
      if (samples.some(s => !/\.png$/i.test(s.path ?? '') || !validRawEvidence(w, s))) add('표본 PNG는 해당 편 reviews/ 아래의 실제 파일·해시에 연결한다');
    }
  }
  if (!r || r.schema !== 'scene-review@1') return [...errors, '실물 관찰→의도 대조 검수 review(scene-review@1)가 필요하다'];
  if (!text(r.reviewer?.id) || r.reviewer?.independent !== true) add('제작과 분리된 실제 검수자 id/independent를 기록한다');
  for (const phase of ['experience', 'intent']) {
    const part = r[phase];
    if (part?.artifact_sha256 !== artifactHash) add(`${phase}: 현재 합성 시안 해시와 검수 대상이 다르다`);
    if (!text(part?.observation) || !text(part?.tool)) add(`${phase}: 실제 관찰과 확인 도구가 필요하다`);
    const raw = part?.raw_report;
    if (!validRawEvidence(w, raw)) add(`${phase}: 해당 편 reviews/ 아래 검수 원문 파일·해시가 필요하다`);
    const reused = (state.attempts ?? []).some(a => a.status === 'succeeded' && a.validation?.kind === 'scene-proof' && a.outputs_sha256?.[a.validation.report.artifact] !== artifactHash && ['experience', 'intent'].some(p => a.validation.report.review?.[p]?.raw_report?.sha256 === raw?.sha256));
    if (raw?.sha256 && reused) add(`${phase}: 다른 시안의 검수 원문을 재사용할 수 없다. 현재 실물을 새로 확인한다`);
  }
  if (r.experience?.raw_report?.path === r.intent?.raw_report?.path || r.experience?.raw_report?.sha256 === r.intent?.raw_report?.sha256) add('초견 관찰 원문을 의도 대조 응답으로 덮어쓰지 않는다');
  const concept = json(join(w.production, 'concepts.json')).concepts.find(c => c.id === report.concept_id);
  const targets = concept?.visual?.moments ?? [], rows = r.intent?.explanations;
  if (!Array.isArray(rows)) add('intent.explanations에 실제로 읽힌 대상·작용·결과를 기록한다');
  else {
    if (new Set(rows.map(x => x.moment_id)).size !== rows.length || rows.some(x => !targets.some(t => t.id === x.moment_id))) add('없는 설명 구간 또는 중복 설명 검수다');
    for (const target of targets) {
      const row = rows.find(x => x.moment_id === target.id);
      if (!row || ['observed_subject', 'observed_action', 'observed_result', 'text_dependency'].some(k => !text(row[k]))) { add(`${target.id}: 실제 대상·작용·결과·문자 의존 관찰이 필요하다`); continue; }
      const deferredMotion = target.motion_required && (report.phase === 'still' || provisional);
      if (row.verdict !== 'pass' && !(deferredMotion && row.verdict === 'unverified')) add(`${target.id}: 미해결 설명 결함·미확인은 usable로 기록할 수 없다`);
      if (row.verdict === 'pass' && row.basis !== 'observed') add(`${target.id}: 코드 추론으로 설명을 통과시키지 않는다`);
      if (!['observed', 'code_inference', 'unverified'].includes(row.basis)) add(`${target.id}: 관찰 근거 basis가 필요하다`);
      if (deferredMotion && row.verdict === 'pass') add(`${target.id}: ${report.phase === 'still' ? '정지 시안으로' : '연속 동작을 확인하기 전에는'} 동작 설명을 통과시키지 않는다`);
    }
  }
  if (!text(r.intent?.reference_observation) || !text(r.intent?.text_observation)) add('레퍼런스의 설명·미술 기준 대조와 실제 자막·추가 문구 관찰이 필요하다');
  if (r.intent?.verdict !== (provisional ? 'unverified' : 'pass')) add('의도 대조 결과는 실제 확인 범위와 일치해야 한다. 미해결 결함은 revise로 기록한다');
  for (const previous of priorSceneRevisions(state, report)) {
    const check = r.rechecks?.find(x => x.receipt_id === previous.receipt_id);
    if (!check || check.verdict !== 'fixed' || !text(check.observation)) add(`이전 revise ${previous.receipt_id}의 실제 재확인이 필요하다`);
  }
  return errors;
}

export function provisionalFrameErrors(w, report) {
  if (report.verdict !== 'provisional') return [];
  const errors = [];
  for (const sample of report.sampling?.frames ?? []) {
    try {
      const bytes = execFileSync('ffmpeg', ['-v', 'error', '-nostdin', '-ss', String(sample.second), '-i', w.path(report.artifact), '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], {timeout: 30000, maxBuffer: 32 * 1024 * 1024});
      if (hash(bytes) !== sample.sha256) errors.push(`${sample.path}: 현재 동작 시안의 ${sample.second}초 프레임과 다르다`);
    } catch { errors.push(`${sample.path}: 현재 동작 시안에서 표본 프레임을 추출할 수 없다`); }
  }
  return errors;
}

export function sceneReviewEvidence(w, state, report) {
  if (!requiresSceneReview(w, state)) return [];
  return [...['experience', 'intent'].flatMap(phase => {
    const raw = report.review?.[phase]?.raw_report;
    return validRawEvidence(w, raw) ? [raw] : [];
  }), ...(report.verdict === 'provisional' ? (report.sampling?.frames ?? []).filter(s => validRawEvidence(w, s)) : [])];
}
