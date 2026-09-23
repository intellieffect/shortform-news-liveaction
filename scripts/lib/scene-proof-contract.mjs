export const SCENE_PROOF_CONFIG_SCHEMA = 'scene-proof-config@1';
export const SCENE_PROOF_REPORT_SCHEMA = 'scene-proof@1';
export const SCENE_PROOF_RENDERING_KIND = 'shared-scene-proof@1';
export const SCENE_COMPONENT_ROOT = 'src/editorial/scenes/';
export const OPTIONAL_SCENE_GATE = 'first-core-scene@5';
export const optionalSceneTrials = (w, state = {}) => w.request?.scene_gate === OPTIONAL_SCENE_GATE && (!state.scene_gate || state.scene_gate === OPTIONAL_SCENE_GATE);
export const sceneGateMismatch = (w, state = {}) => Boolean(state.scene_gate && w.request?.scene_gate && state.scene_gate !== w.request.scene_gate);
export const sceneProofConfigPath = id => `news/${id}/02_production/scene-proof.json`;
export const sceneProofPhases = (concept, gate) => {
  if (gate === OPTIONAL_SCENE_GATE) return [];
  const motion = (concept.visual?.moments ?? []).some(m => m.motion_required);
  return gate === 'first-core-scene@4' && motion ? ['motion'] : ['still', ...(motion ? ['motion'] : [])];
};
