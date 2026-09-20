import type { ProductionProfile } from "./profile";

export type EditorialEasing = "ease-out" | "ease-in-out" | "ease-in" | "linear" | "cubic-in" | "cubic-out" | "quad-in" | [number, number, number, number];

export type CompiledConcept = {
  id: string;
  from: number;
  end: number;
  duration: number;
  narration_lines: string[];
};

export type CompiledEvent = {
  id: string;
  concept_id: string;
  element_id: string;
  kind: "label" | "motion" | "media";
  from: number;
  settled: number;
  to: number;
  end: number;
  easing: { enter: EditorialEasing; move: EditorialEasing; exit: EditorialEasing };
};

export type CompiledAudioCue = {
  id: string;
  kind: "sfx";
  asset: string;
  gain_db: number;
  frame: number;
};

export type EditorialProofFrame = { id: string; frame: number; labels: string[] };

export type EditorialTimeline = {
  schema_version: "1.0";
  pilot: string;
  fps: number;
  total_frames: number;
  concepts: CompiledConcept[];
  events: CompiledEvent[];
  audio_cues: CompiledAudioCue[];
  proof_frames: EditorialProofFrame[];
  production_profile?: ProductionProfile;
  source: {
    narration_word_sha256: string;
    story_sha256: string;
    concepts_sha256: string;
    motion_sha256: string;
    visual_system_sha256: string;
    production_profile_sha256?: string;
  };
};
