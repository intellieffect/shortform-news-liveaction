// Technical links only. A complete plan is not evidence of visual understanding.
export const VISUAL_CONTRACT = 'visual-explanation@1';
const text = (x) => typeof x === 'string' && x.trim().length > 0;
const list = (x) => Array.isArray(x) ? x : [];
const id = (x) => /^[a-z][a-z0-9_-]*$/.test(x ?? '');
const path = (x) => text(x) && !x.startsWith('/') && !x.includes('\\') && !x.split('/').includes('..');

export function validateVisualPlan({concepts, visualSystem, required = false}) {
  const errors = [], warnings = [];
  const add = (code, where, message) => errors.push({code, where, message});
  const contract = visualSystem?.visual_contract;
  if (!required && contract == null) return {errors, warnings, active: false};
  if (contract !== VISUAL_CONTRACT) add('visual-contract', 'visual-system.json', `새 제작에는 ${VISUAL_CONTRACT}가 필요하다`);
  const cs = list(concepts?.concepts), assets = list(visualSystem?.media?.assets);
  const jobs = list(visualSystem?.generation_jobs);
  const assetIds = new Set(assets.map(a => a.id)), jobIds = new Set(jobs.map(j => j.id));
  if (!cs.length) add('visual-concepts-missing', 'concepts.json', '화면 설계가 아직 없다');
  if (visualSystem?.generation_jobs != null && !Array.isArray(visualSystem.generation_jobs)) add('generation-jobs', 'visual-system.json', 'generation_jobs는 배열이다');
  if (jobIds.size !== jobs.length) add('generation-duplicate', 'generation_jobs', '생성 작업 id가 중복된다');
  for (const c of cs) {
    const v = c.visual, where = `concepts.${c.id}.visual`;
    if (!v || !['explain', 'observe', 'quote', 'atmosphere'].includes(v.purpose) || !text(v.focus)) {
      add('visual-purpose', where, 'purpose와 먼저 보여줄 focus가 필요하다');
      continue;
    }
    const r = v.realization;
    if (!r || !['source', 'generated', 'code', 'hybrid'].includes(r.method) || !Array.isArray(r.asset_ids) || !Array.isArray(r.job_ids)) {
      add('visual-realization', where, 'method와 asset_ids/job_ids 배열로 실제 재료를 연결한다');
    } else {
      for (const a of r.asset_ids) if (!assetIds.has(a)) add('visual-asset-link', where, `없는 자산: ${a}`);
      for (const j of r.job_ids) if (!jobIds.has(j)) add('visual-job-link', where, `없는 생성 작업: ${j}`);
      if (r.method === 'generated' && !r.job_ids.length) add('visual-generation-plan', where, '생성 표현에는 실제 생성 작업을 연결한다');
      if (r.job_ids.length && !text(r.generated_role)) add('visual-generated-role', where, '생성할 외형 또는 동작의 역할이 필요하다');
      if (['code', 'hybrid'].includes(r.method) && !text(r.code_role)) add('visual-code-role', where, '코드가 담당할 정보·동작·합성 역할이 필요하다');
    }
    const moments = list(v.moments);
    if (v.purpose === 'explain' && !moments.length) add('visual-moments', where, '핵심 설명의 대상·작용/관계·보이는 결과를 연결한다');
    if (new Set(moments.map(m => m.id)).size !== moments.length) add('visual-moment-duplicate', where, '설명 구간 id가 중복된다');
    for (const m of moments) {
      if (!id(m.id) || !text(m.subject) || !text(m.action) || !text(m.result) || typeof m.motion_required !== 'boolean') add('visual-moment', where, 'moment id/subject/action/result/motion_required가 필요하다');
      if (!Array.isArray(m.narration_lines) || !m.narration_lines.length || m.narration_lines.some(l => !list(c.narration_lines).includes(l))) add('visual-moment-lines', where, '설명 구간은 해당 개념의 발화 줄에 연결한다');
    }
    for (const e of list(c.elements).filter(e => e.kind === 'text')) {
      if (!text(e.text)) add('screen-text-content', `${where}.${e.id}`, '화면에 표시할 정확한 text를 기록한다');
      if (text(e.text) && e.text.split(/\n/).length > 2) warnings.push({code: 'screen-text-load', where: e.id, message: '여러 줄 문구: 고정 자막과 함께 실제 읽기 부담을 확인한다'});
    }
  }
  for (const j of jobs) {
    const where = `generation_jobs.${j.id}`;
    if (!id(j.id) || !['image', 'video', 'overlay-video'].includes(j.kind) || !text(j.purpose) || !['planned', 'running', 'failed', 'rejected', 'accepted'].includes(j.status)) add('generation-job', where, 'id/kind/purpose/status가 필요하다');
    for (const field of ['prompt_path', 'output']) if (j[field] != null && !path(j[field])) add('generation-path', where, `${field}는 안전한 편 상대 경로여야 한다`);
    if (j.status !== 'planned' && (!text(j.provider) || !text(j.model) || !path(j.prompt_path))) add('generation-provenance', where, '실제 provider/model과 편 상대 prompt_path가 필요하다');
    if (['accepted', 'rejected', 'failed'].includes(j.status) && !text(j.observation)) add('generation-observation', where, '실제 동작·외형 또는 실패 원인을 기록한다');
    if (['accepted', 'rejected'].includes(j.status) && !path(j.output)) add('generation-output', where, '생성 원본의 편 상대 output 경로가 필요하다');
    if (j.status === 'accepted' && !assets.some(a => a.generation_job === j.id)) add('generation-adoption', where, '채택 생성물을 media.assets의 generation_job으로 연결한다');
  }
  for (const a of assets) if (a.generation_job && !jobs.some(j => j.id === a.generation_job && j.status === 'accepted')) add('generation-asset', `assets.${a.id}`, '채택 자산은 accepted 생성 작업을 참조해야 한다');
  return {errors, warnings, active: true};
}

export function visualReviewTargets(concepts) {
  return list(concepts?.concepts).flatMap(c => list(c.visual?.moments).map(m => ({concept_id: c.id, ...m})));
}

// The actual runtime text and captions are compared by reviewers; this is the declared inventory.
export function screenTextInventory(concepts, timeline, narration) {
  return list(concepts?.concepts).flatMap(c => list(c.elements).filter(e => e.kind === 'text').map(e => {
    const events = list(timeline?.events).filter(x => x.element_id === e.id);
    const captions = list(narration?.captions ?? narration?.sentences ?? narration?.lines);
    const overlaps = captions.filter(n => events.some(x => n.start * timeline.fps < x.end && n.end * timeline.fps > x.from));
    const compact = s => String(s ?? '').replace(/\s+/g, '');
    return {concept_id: c.id, element_id: e.id, text: e.text ?? null, role: e.role,
      ranges: events.map(e => [e.from, e.end]), captions: overlaps.map(n => n.caption_text ?? n.text ?? n.spoken_text),
      repeated_in_caption: Boolean(compact(e.text)) && compact(overlaps.map(n => n.caption_text ?? n.text ?? n.spoken_text).join(' ')).includes(compact(e.text)),
      timing_status: events.length ? 'linked' : 'unlinked', inspection: 'declared_not_observed'};
  }));
}
