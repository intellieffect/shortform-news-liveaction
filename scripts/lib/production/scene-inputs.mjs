import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {sourceInputs} from '../source-inputs.mjs';
import {optionalSceneTrials} from '../scene-proof-contract.mjs';

// Only the chosen scene's semantics and dependencies: unrelated cuts may evolve
// while the first scene is being checked. No derived narration is needed.
export function selectedSceneInputs(w) {
  const p = name => join(w.production, name);
  if (!existsSync(p('scene-proof.json'))) return null;
  try {
    const config = JSON.parse(readFileSync(p('scene-proof.json'), 'utf8'));
    const concepts = JSON.parse(readFileSync(p('concepts.json'), 'utf8'));
    const visual = JSON.parse(readFileSync(p('visual-system.json'), 'utf8'));
    const c = concepts.concepts?.find(c => c.id === config.concept_id);
    if (!c) return null;
    const assets = (visual.media?.assets ?? []).filter(a => c.visual?.realization?.asset_ids?.includes(a.id) || a.id === 'project_logo');
    const jobs = (visual.generation_jobs ?? []).filter(j => c.visual?.realization?.job_ids?.includes(j.id));
    const lines = readFileSync(p('narration.txt'), 'utf8').split(/\r?\n/).filter(s => s.trim());
    const narration = (c.narration_lines ?? []).map(id => [id, lines[Number(id.replace(/^s/, '')) - 1] ?? null]);
    const semantic = {concept: c, narration, assets, jobs, logo: visual.project_logo, profile: visual.production_profile, canvas: visual.canvas, caption: visual.caption};
    const optional = optionalSceneTrials(w);
    if (optional) {
      // Audience context accompanies the review, not the rendered image. Other
      // config changes (including captions/timing/component) still stale it.
      const {viewer_context: _viewerContext, ...renderConfig} = config;
      semantic.config = renderConfig;
    }
    const inputs = [...(optional ? [] : [p('scene-proof.json')]), p('facts.md'), join(w.repo, 'config/production-profile.json'), join(w.repo, 'scripts/scene-proof.mjs'),
      ...sourceInputs(w.repo, [w.rel(w.path(config.component)), 'src/editorial/SceneProof.tsx']),
      ...assets.map(a => w.path(`news/${w.id}/${a.source}`)),
      ...jobs.flatMap(j => [j.prompt_path, j.output].filter(Boolean).map(path => w.path(`news/${w.id}/${path}`)))];
    const fonts = join(w.repo, 'public/fonts');
    if (existsSync(fonts)) inputs.push(...readdirSync(fonts).map(f => join(fonts, f)));
    return {inputs, semantic: createHash('sha256').update(JSON.stringify(semantic)).digest('hex')};
  } catch {
    // Half-written/invalid config stays visible in readiness; resume is usable.
    return null;
  }
}
