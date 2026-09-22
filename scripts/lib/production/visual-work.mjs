import {recipe} from './contracts.mjs';
import {auditScreenText} from '../screen-text-audit.mjs';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {VISUAL_CONTRACT, validateVisualPlan, visualReviewTargets, screenTextInventory} from '../visual-plan.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = (w, name, fallback = {}) => existsSync(join(w.production, name)) ? JSON.parse(readFileSync(join(w.production, name), 'utf8')) : fallback;
const requireValue = (value, message) => { if (!value) throw new Error(message); };
const changed = (w, files) => Object.entries(files).some(([p, h]) => {
  const f = w.path(p);
  return (existsSync(f) ? hash(readFileSync(f)) : null) !== h;
});

export function validateSceneProof(w, attempt, outputs) {
  const reports = Object.keys(outputs).filter(p => p.endsWith('.json'));
  requireValue(reports.length === 1, 'scene_proof에는 관찰 JSON 한 개와 실제 시안 파일이 필요하다');
  const report = JSON.parse(readFileSync(w.path(reports[0]), 'utf8'));
  const concepts = read(w, 'concepts.json').concepts ?? [];
  requireValue(report.schema === 'scene-proof@1' && concepts.some(c => c.id === report.concept_id), 'scene-proof@1과 현재 concept_id가 필요하다');
  requireValue(['still', 'motion'].includes(report.phase) && ['asset', 'composite'].includes(report.scope), 'phase still/motion, scope asset/composite가 필요하다');
  requireValue(['usable', 'revise', 'unverified'].includes(report.verdict), '시안 verdict usable/revise/unverified가 필요하다');
  requireValue(typeof report.observation === 'string' && report.observation.trim() && typeof report.tool === 'string' && report.tool.trim(), '실제 관찰과 확인 도구를 기록한다');
  requireValue(outputs[report.artifact] && report.artifact !== reports[0], '관찰한 artifact를 --output으로 함께 등록한다');
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,width,height,duration,nb_frames,nb_read_frames:format=format_name,duration', '-of', 'json', w.path(report.artifact)], {encoding: 'utf8', timeout: 15000}));
  const stream = probe.streams?.find(s => s.codec_type === 'video');
  requireValue(stream, '화면 시안에는 실제 이미지 또는 영상이 필요하다');
  const still = /image2|(?:png|jpeg|webp|tiff|bmp)_pipe/.test(probe.format?.format_name ?? '');
  if (report.phase === 'motion') {
    const duration = Number(stream.duration ?? probe.format?.duration);
    requireValue(!still && duration > 0 && Number(stream.nb_read_frames ?? stream.nb_frames) > 1, '정지 이미지 또는 한 프레임 영상을 동작 시안으로 기록할 수 없다');
    requireValue(report.verdict === 'unverified' || (report.continuous_viewing === true && Array.isArray(report.viewed_seconds) && report.viewed_seconds.length === 2 && report.viewed_seconds[0] >= 0 && report.viewed_seconds[1] > report.viewed_seconds[0] && report.viewed_seconds[1] <= duration + 0.05), '동작 판단에는 실제 연속 확인 범위를 적는다. 미확인은 unverified');
  }
  return {kind: 'scene-proof', report_path: reports[0], report, media: {width: stream.width, height: stream.height, kind: still ? 'image' : 'video'}, limitation: '관찰 기록이며 독립 최종 검수·시청 사실의 자동 증명은 아니다'};
}

export function visualWork(w, state = {attempts: []}) {
  const concepts = read(w, 'concepts.json'), visualSystem = read(w, 'visual-system.json');
  const required = state.visual_contract === VISUAL_CONTRACT || w.request?.visual_contract === VISUAL_CONTRACT;
  const check = validateVisualPlan({concepts, visualSystem, required});
  if (!check.active) return {status: 'legacy', contract: null, note: '기존 편에 새 설계·검수 완료를 소급하지 않는다'};
  const tasks = check.errors.map(e => ({kind: 'plan', ...e}));
  const currentInputs = recipe(w, 'scene_proof').inputs;
  const proofs = (state.attempts ?? []).filter(a => a.status === 'succeeded' && a.validation?.kind === 'scene-proof').map(a => ({
    receipt_id: a.id, ...a.validation.report, report_path: a.validation.report_path,
    status: JSON.stringify(Object.keys(a.inputs.files).sort()) !== JSON.stringify(currentInputs) || changed(w, a.inputs.files) || changed(w, a.outputs_sha256) || a.inputs.impact !== (state.impacts?.scene_proof?.id ?? null) ? 'stale' : 'current',
  }));
  for (const c of concepts.concepts ?? []) {
    if (c.visual?.purpose !== 'explain') continue;
    for (const phase of ['still', ...((c.visual.moments ?? []).some(m => m.motion_required) ? ['motion'] : [])]) {
      const proof = proofs.findLast(p => p.concept_id === c.id && p.phase === phase && p.scope === 'composite');
      if (!proof || proof.status !== 'current' || proof.verdict !== 'usable') tasks.push({kind: 'scene-proof', concept_id: c.id, phase, status: proof?.status ?? 'unrecorded', verdict: proof?.verdict ?? 'unverified'});
    }
  }
  const jobs = (Array.isArray(visualSystem.generation_jobs) ? visualSystem.generation_jobs : []).map(j => {
    const errors = [];
    for (const key of ['prompt_path', 'output']) if (j[key]) {
      try { if (!existsSync(w.path(`news/${w.id}/${j[key]}`))) errors.push(`missing ${key}`); }
      catch (e) { errors.push(e.message); }
    }
    const linked = (concepts.concepts ?? []).filter(c => c.visual?.realization?.job_ids?.includes(j.id)).map(c => c.id);
    if (linked.length && (j.status !== 'accepted' || errors.length)) tasks.push({kind: 'generation', job_id: j.id, concepts: linked, status: j.status, errors});
    return {...j, concepts: linked, errors};
  });
  const text = screenTextInventory(concepts, read(w, 'timeline.json'), read(w, 'narration.json'));
  for (const t of text) if (t.repeated_in_caption || t.timing_status === 'unlinked') tasks.push({kind: 'screen-text', element_id: t.element_id, repeated_in_caption: t.repeated_in_caption, timing_status: t.timing_status});
  const textAudit = auditScreenText(w.repo, w.id, text);
  tasks.push(...textAudit.warnings.map(w => ({kind: 'screen-text-source', ...w})));
  return {render_text_audit: textAudit, contract: VISUAL_CONTRACT, status: check.errors.length ? 'invalid' : tasks.length ? 'needs-attention' : 'recorded',
    tasks, generation_jobs: jobs, scene_proofs: proofs, review_targets: visualReviewTargets(concepts), screen_text: text, warnings: check.warnings,
    note: '기록 최신성과 미확인 작업이다. usable·필드 충족은 최종 설명력 통과가 아니다. 생성/코드 사용량을 점수로 삼지 않는다'};
}

export function validateExplanationReview(w, report, timeline) {
  if (w.request?.visual_contract !== VISUAL_CONTRACT && read(w, 'visual-system.json').visual_contract !== VISUAL_CONTRACT) return;
  const targets = visualReviewTargets(read(w, 'concepts.json'));
  const seen = new Set();
  requireValue(Array.isArray(report.explanations), '새 제작의 visual 검수에는 explanations 배열이 필요하다');
  for (const item of report.explanations) {
    const key = `${item.concept_id}/${item.moment_id}`;
    const target = targets.find(t => t.concept_id === item.concept_id && t.id === item.moment_id);
    const c = timeline.concepts.find(c => c.id === item.concept_id);
    requireValue(target && c && !seen.has(key), '없는 설명 구간 또는 중복 검수: ' + key);
    seen.add(key);
    requireValue(['pass', 'changes_requested', 'unverified'].includes(item.verdict) && ['observed', 'code_inference', 'unverified'].includes(item.basis), '설명 verdict/basis가 필요하다');
    for (const field of ['observed_subject', 'observed_action', 'observed_result', 'text_dependency']) requireValue(typeof item[field] === 'string' && item[field].trim(), '설명 관찰 누락: ' + field);
    requireValue(Array.isArray(item.evidence) && (item.basis !== 'observed' || item.evidence.length) && item.evidence.every(p => report.evidence.some(e => e.path === p)), '설명 관찰은 실제 검수 evidence에 연결한다');
    if (item.verdict === 'pass') {
      requireValue(item.basis === 'observed', '코드 추론·미확인으로 화면 이해를 통과시키지 않는다');
      const frames = [...(report.coverage.original_frames ?? []), ...(report.coverage.mobile_frames ?? [])];
      requireValue(frames.some(f => f.frame >= c.from && f.frame < c.end && item.evidence.includes(f.evidence)), '설명 pass는 해당 개념의 실제 화면 표본에 연결한다');
      let covered = c.from;
      for (const [from, end] of [...report.coverage.playback_ranges].sort((a, b) => a[0] - b[0])) if (from <= covered && end > covered) covered = end;
      if (target.motion_required) requireValue(covered >= c.end, '동작 설명 통과에는 해당 개념 연속 확인 범위가 필요하다');
    }
  }
  if (report.verdict === 'pass') {
    const text = report.text_review;
    requireValue(text?.verdict === 'pass' && typeof text.observation === 'string' && text.observation.trim(), '추가 문구·고정 자막의 실제 읽기 부담 검수가 필요하다');
    const samples = [...(report.coverage.original_frames ?? []), ...(report.coverage.mobile_frames ?? [])];
    requireValue(Array.isArray(text.evidence) && text.evidence.length && text.evidence.every(p => report.evidence.some(e => e.path === p)) && samples.some(s => text.evidence.includes(s.evidence)), '문구 검수를 실제 화면 표본에 연결한다');
  }
  if (report.verdict === 'pass') requireValue(targets.every(t => report.explanations.some(e => e.concept_id === t.concept_id && e.moment_id === t.id && e.verdict === 'pass')), '미확인·실패한 핵심 설명을 남긴 채 visual pass로 기록할 수 없다');
}
