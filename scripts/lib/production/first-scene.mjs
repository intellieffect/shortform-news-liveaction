import {SCENE_PROOF_CONFIG_SCHEMA, SCENE_PROOF_RENDERING_KIND, SCENE_COMPONENT_ROOT, sceneProofConfigPath, sceneProofPhases} from '../scene-proof-contract.mjs';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {hash, json} from './contracts.mjs';
import {sceneProofs} from './visual-work.mjs';
import {validateVisualPlan} from '../visual-plan.mjs';

import {FIRST_SCENE_GATE, LEGACY_FIRST_SCENE_GATE, sceneReviewErrors} from './scene-review.mjs';
const read = (w, name) => { try { return existsSync(join(w.production, name)) ? json(join(w.production, name)) : {}; } catch (e) { return {_parse_error: e.message}; } };

// Admission to costly narration, not a narration dependency: later visual edits
// must not invalidate already generated audio or require all scenes up front.
export function firstSceneReadiness(w, state) {
  if (!state.scene_gate && !w.request?.scene_gate) return {required: false, ready: true, proof_ids: []};
  const blockers = [], add = (code, detail) => blockers.push({code, detail});
  if (![FIRST_SCENE_GATE, LEGACY_FIRST_SCENE_GATE].includes(state.scene_gate ?? w.request?.scene_gate)) add('first-scene-contract', '지원하지 않는 초기 장면 계약');
  if (!w.request || (state.intake_sha256 && hash(readFileSync(join(w.root, '00_brief/request.json'))) !== state.intake_sha256)) add('first-scene-intake', '보존된 시작 요청이 변경 또는 삭제됐다');
  const config = read(w, 'scene-proof.json'), concepts = read(w, 'concepts.json'), visual = read(w, 'visual-system.json');
  if (config._parse_error) add('first-scene-config', 'scene-proof.json JSON 오류: ' + config._parse_error);
  const cs = concepts.concepts ?? [], selected = cs.find(c => c.id === config.concept_id);
  if (config.schema !== SCENE_PROOF_CONFIG_SCHEMA || !selected) add('first-scene-selection', 'scene-proof.json에서 기사 핵심 개념 하나와 공통 합성 경로를 선택한다');
  if (selected && cs.some(c => c.visual?.purpose === 'explain') && selected.visual?.purpose !== 'explain') add('first-scene-selection', '설명 개념이 있다면 첫 핵심 시안도 설명 개념에서 선택한다');
  if (!selected) return {required: true, ready: false, concept_id: config.concept_id ?? null, blockers, proof_ids: []};
  try {
    if (typeof config.component !== 'string' || !config.component.startsWith(SCENE_COMPONENT_ROOT) || !config.component.endsWith('.tsx') || !existsSync(w.path(config.component))) add('first-scene-component', '실제 재사용 장면 컴포넌트가 필요하다');
  } catch { add('first-scene-component', '안전하지 않은 장면 경로'); }
  if (!Number.isFinite(config.duration_seconds) || config.duration_seconds <= 0) add('first-scene-duration', '실제 시안 길이가 필요하다');
  const plan = validateVisualPlan({concepts: {concepts: [selected]}, visualSystem: {...visual, generation_jobs: (visual.generation_jobs ?? []).filter(j => selected.visual?.realization?.job_ids?.includes(j.id)), media: {assets: (visual.media?.assets ?? []).filter(a => selected.visual?.realization?.asset_ids?.includes(a.id))}}, required: true});
  // Other scenes may still be in design. Check their job ownership separately below.
  for (const e of plan.errors.filter(e => !['generation-orphan'].includes(e.code))) add(e.code, e.message);
  const r = selected.visual?.realization, ids = r?.asset_ids ?? [];
  for (const m of selected.visual?.moments ?? []) {
    if (!Array.isArray(m.subject_ids) || !m.subject_ids.length || m.subject_ids.some(id => !(selected.elements ?? []).some(e => e.id === id && e.kind !== 'text'))) add('first-scene-subject', 'moment.subject_ids를 화면의 실제 비문자 대상 요소에 연결한다');
    if (/[?？]\s*$/.test(m.action ?? '') || m.action === selected.question || m.subject === m.action || m.action === m.result) add('first-scene-action', '질문·복사 문구 대신 대상에 보일 작용/비교 관계와 결과를 적는다');
  }
  const assets = visual.media?.assets ?? [], jobs = visual.generation_jobs ?? [];
  for (const j of jobs) {
    const owners = cs.filter(c => c.visual?.realization?.job_ids?.includes(j.id));
    if (!['failed', 'rejected'].includes(j.status) && !owners.length) add('generation-orphan', `생성 작업 ${j.id}의 사용 장면을 연결하거나 기각 이유를 기록한다`);
  }
  for (const id of ids) {
    const a = assets.find(a => a.id === id);
    try { if (!a?.source || !existsSync(w.path(`news/${w.id}/${a.source}`))) add('first-scene-asset', `실제 채택 재료 누락: ${id}`); }
    catch { add('first-scene-asset', `안전하지 않은 자산 경로: ${id}`); }
    if (a?.generation_job && !r?.job_ids?.includes(a.generation_job)) add('first-scene-generation', `${id}의 생성 작업을 장면 realization.job_ids에도 연결한다`);
  }
  for (const id of r?.job_ids ?? []) {
    const j = jobs.find(j => j.id === id);
    if (j?.status !== 'accepted' || !assets.some(a => ids.includes(a.id) && a.generation_job === id)) add('first-scene-generation', `생성 작업 ${id}의 채택 판단과 장면 자산 연결이 필요하다`);
    for (const key of ['prompt_path', 'output']) {
      try { if (!j?.[key] || !existsSync(w.path(`news/${w.id}/${j[key]}`))) add('first-scene-generation', `${id}: ${key} 원본 누락`); }
      catch { add('first-scene-generation', `${id}: 안전하지 않은 ${key}`); }
    }
  }
  const proofs = sceneProofs(w, state), chosen = [];
  for (const phase of sceneProofPhases(selected)) {
    const p = proofs.findLast(p => p.concept_id === selected.id && p.scope === 'composite' && p.phase === phase);
    if (!p || p.status !== 'current' || p.verdict !== 'usable') add('first-scene-proof', `${phase}: ${p?.status ?? 'unrecorded'}/${p?.verdict ?? 'unverified'} — 실물 확인·수정 후 기록한다. 미시청은 통과로 바꾸지 않는다`);
    if (!p) continue;
    chosen.push(p.receipt_id);
    const artifactHash = existsSync(w.path(p.artifact)) ? hash(readFileSync(w.path(p.artifact))) : null;
    // Exclude this report itself when checking prior revise observations.
    for (const error of sceneReviewErrors(w, {...state, attempts: state.attempts.filter(a => a.id !== p.receipt_id)}, p, artifactHash)) add('first-scene-review', error);
    const render = p.rendering;
    if (render?.kind !== SCENE_PROOF_RENDERING_KIND || render.config !== sceneProofConfigPath(w.id) || render.component !== config.component || JSON.stringify([...(render.asset_ids ?? [])].sort()) !== JSON.stringify([...ids].sort()) || render.profile_sha256 !== hash(readFileSync(join(w.repo, 'config/production-profile.json')))) add('first-scene-composite', `${phase}: 현재 실제 자산·장면 컴포넌트·공통 자막을 쓴 시안이 필요하다. scripts/scene-proof.mjs 사용`);
    if (phase === 'motion' && (p.continuous_viewing !== true || !Array.isArray(p.viewed_seconds) || p.viewed_seconds[0] !== 0 || p.viewed_seconds[1] < config.duration_seconds - 0.05)) add('first-scene-viewing', '핵심 동작의 전체 시안 확인 범위가 필요하다. 프레임 표본만 봤다면 unverified를 유지한다');
  }
  return {required: true, ready: blockers.length === 0, concept_id: selected.id, blockers, proof_ids: chosen};
}
