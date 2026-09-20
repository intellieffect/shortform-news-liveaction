// 생성 파일 — scripts/pilots-index.mjs 가 pilots/active.json 에서 만든다. 손으로 고치지 않는다.
import type { PilotData } from "../src/pilot/pilot";
import type { EditorialPilotData } from "../src/editorial/pilot";
import { buildEditorialPilot } from "../src/editorial/pilot";
import timeline_0 from "./hani_superbubble_n44_restored_v2/timeline.json";
import narration_0 from "./hani_superbubble_n44_restored_v2/narration.json";
import story_0 from "./hani_superbubble_n44_restored_v2/story.json";
import concepts_0 from "./hani_superbubble_n44_restored_v2/concepts.json";
import visual_system_0 from "./hani_superbubble_n44_restored_v2/visual-system.json";
import audio_0 from "./hani_superbubble_n44_restored_v2/audio.json";
import pilot_0 from "./hani_superbubble_n44_restored_v2/pilot.json";
import { EditorialEpisode as editorial_episode_0 } from "../src/editorial/episodes/hani_superbubble_n44_restored_v2";

export const PILOTS: PilotData[] = [
];

export const EDITORIAL_PILOTS: EditorialPilotData[] = [
  buildEditorialPilot({ id: "hani_superbubble_n44_restored_v2", timeline: timeline_0, narration: narration_0, story: story_0, concepts: concepts_0, visualSystem: visual_system_0, audio: audio_0, manifest: pilot_0, component: editorial_episode_0 }),
];
