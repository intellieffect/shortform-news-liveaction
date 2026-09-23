import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {join, sep} from 'node:path';
import {fileSnapshot, hash, json, recipe} from './contracts.mjs';

const filled = value => typeof value === 'string' && value.trim().length > 0;
const runner = 'scripts/scene-proof.mjs';

function visuallyCurrent(w, state, proof) {
  if (proof?.status === 'current') return true;
  const attempt = state.attempts?.find(a => a.id === proof?.receipt_id && a.status === 'succeeded');
  if (!attempt) return false;
  const spec = recipe(w, 'scene_proof'), files = fileSnapshot(w, spec.inputs);
  const old = attempt.inputs.files;
  return (attempt.inputs.semantic ?? null) === (spec.semantic ?? null)
    && attempt.inputs.impact === (state.impacts?.scene_proof?.id ?? null)
    && JSON.stringify(Object.keys(old).sort()) === JSON.stringify(Object.keys(files).sort())
    && Object.keys(old).every(path => path === runner || old[path] === files[path])
    && Object.entries(attempt.outputs_sha256 ?? {}).every(([path, digest]) => fileSnapshot(w, [path])[path] === digest);
}

// This is an admission to start narration, not a scene-proof verdict or final
// visual approval. Keep it outside the immutable rendered proof receipt.
export function sceneAdmission(w, state, proof, concept) {
  const path = join(w.production, 'scene-admission.json');
  if (!existsSync(path)) return null;
  let record;
  try { record = json(path); } catch (error) { return {errors: [`scene-admission.json JSON 오류: ${error.message}`]}; }
  const errors = [], add = message => errors.push(message);
  if (record.schema !== 'scene-admission@1' || record.decision !== 'narration-ready-with-issues' || record.phase !== 'motion') add('조건부 착수 계약·결정·단계가 잘못됐다');
  if (!proof || !visuallyCurrent(w, state, proof) || proof.phase !== 'motion' || proof.scope !== 'composite' || proof.concept_id !== concept.id) add('현재 선택된 동작 합성 시안이 필요하다');
  if (!concept.visual?.moments?.some(m => m.motion_required)) add('정적 설명에는 조건부 동작 착수를 적용하지 않는다');
  if (proof && (record.concept_id !== proof.concept_id || record.proof_receipt_id !== proof.receipt_id || record.artifact !== proof.artifact)) add('조건부 착수 대상이 현재 시안과 다르다');
  if (proof && !['revise', 'unverified'].includes(proof.verdict)) add('조건부 착수는 미해결 동작 시안에만 사용한다');
  try {
    if (!proof || record.artifact_sha256 !== hash(readFileSync(w.path(proof.artifact))) || record.report_sha256 !== hash(readFileSync(w.path(proof.report_path)))) add('시안·관찰 보고서 해시가 현재 제출본과 다르다');
  } catch { add('시안·관찰 보고서 실물이 없다'); }
  if (record.authority !== 'user' || !filled(record.instruction_quote)) add('사용자의 명시적 착수 지시 원문이 필요하다');
  const review = proof?.review, artifactHash = record.artifact_sha256;
  if (review?.schema !== 'scene-review@1' || review.reviewer?.independent !== true || !filled(review.reviewer?.id)) add('독립 검수의 실제 관찰 기록이 필요하다');
  for (const phase of ['experience', 'intent']) {
    const part = review?.[phase], raw = part?.raw_report;
    if (part?.artifact_sha256 !== artifactHash || !filled(part?.observation) || !filled(part?.tool)) add(`${phase}: 현재 실물 관찰 연결이 필요하다`);
    try {
      const file = w.path(raw?.path);
      if (!filled(raw?.path) || !file.startsWith(join(w.production, 'reviews') + sep) || !realpathSync(file).startsWith(join(w.production, 'reviews') + sep) || hash(readFileSync(file)) !== raw.sha256) add(`${phase}: 검수 원문·해시가 유효하지 않다`);
    } catch { add(`${phase}: 검수 원문이 없다`); }
    const reused = (state.attempts ?? []).some(a => a.status === 'succeeded' && a.validation?.kind === 'scene-proof' && a.outputs_sha256?.[a.validation.report.artifact] !== artifactHash && ['experience', 'intent'].some(p => a.validation.report.review?.[p]?.raw_report?.sha256 === raw?.sha256));
    if (raw?.sha256 && reused) add(`${phase}: 다른 영상의 검수 원문을 재사용할 수 없다`);
  }
  if (review?.experience?.raw_report?.sha256 === review?.intent?.raw_report?.sha256) add('초견과 의도 대조는 서로 다른 실제 원문이어야 한다');
  const rows = review?.intent?.explanations, moments = concept.visual?.moments ?? [];
  if (!Array.isArray(rows) || rows.length !== moments.length || new Set(rows.map(r => r.moment_id)).size !== rows.length || rows.some(r => !moments.some(m => m.id === r.moment_id)) || moments.some(m => !rows.some(r => r.moment_id === m.id && filled(r.observed_subject) && filled(r.observed_action) && filled(r.observed_result) && filled(r.text_dependency)))) add('모든 설명 구간의 고유한 관찰이 필요하다');
  if (Array.isArray(rows) && rows.some(r => !['pass', 'changes_requested', 'unverified'].includes(r.verdict) || (r.verdict === 'pass' && r.basis !== 'observed'))) add('설명 구간의 실제 판정과 관찰 근거가 필요하다');
  const unresolved = Array.isArray(rows) ? rows.filter(r => r.verdict !== 'pass') : [];
  if (!unresolved.length || !['changes_requested', 'unverified'].includes(review?.intent?.verdict)) add('실제 미해결 결함이 있는 독립 검수에만 조건부 착수를 쓴다');
  if (!Array.isArray(record.known_issues) || !record.known_issues.length || record.known_issues.some(i => !filled(i.moment_id) || !filled(i.finding) || !['P5', 'P7'].includes(i.followup_stage)) || unresolved.some(r => !record.known_issues.some(i => i.moment_id === r.moment_id))) add('미해결 설명마다 관찰 내용과 후속 검수 단계를 남긴다');
  return {errors, record};
}
