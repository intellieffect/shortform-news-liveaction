export const SCENE_PROOF_CONFIG_SCHEMA = 'scene-proof-config@1';
export const SCENE_PROOF_REPORT_SCHEMA = 'scene-proof@1';
export const SCENE_PROOF_RENDERING_KIND = 'shared-scene-proof@1';
export const SCENE_COMPONENT_ROOT = 'src/editorial/scenes/';
export const sceneProofConfigPath = id => `news/${id}/02_production/scene-proof.json`;
export const sceneProofPhases = concept => ['still', ...((concept.visual?.moments ?? []).some(m => m.motion_required) ? ['motion'] : [])];
