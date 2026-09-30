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

export type HookRun = {
  text: string;
  role: "support" | "emphasis";
  underline?: boolean;
  font_family: "GmarketSans" | "Pretendard";
  font_weight: number;
  font_size: number;
  text_color: string;
  letter_spacing: number;
};
export type HookRow = {
  align: "left" | "center" | "right";
  line_height: number;
  gap_after: number;
  runs: HookRun[];
  text_event?: CompiledEvent;
};

export type LegacyHookStyle = Omit<typeof import("../../../config/hook-styles/hook-style-v2.json"), "support_font_size" | "support_text_color"> & {support_font_size?: number; support_text_color?: string};
export type AuthoredHookStyle = typeof import("../../../config/hook-style.json");

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
  hook_overlay?: {
    style: LegacyHookStyle | AuthoredHookStyle;
    phrases: {id: string; text: string; text_event: CompiledEvent; underline_event: CompiledEvent; rows?: HookRow[]; runs?: {text: string; role: "support" | "emphasis"; underline?: boolean; font_size: number; text_color: string}[]; layout?: {center_y?: number; width?: number; font_size?: number; text_color?: string; shadow?: string}}[];
  };
  attribution?: {
    style: typeof import("../../../config/attribution-style.json");
    sources: {asset_id?:string; asset_ids?:string[]; text:string; from:number; end:number}[];
    pages: {from:number; end:number; categories:{title:string; lines:string[]}[]}[];
  };
  source: {
    narration_word_sha256: string;
    story_sha256: string;
    concepts_sha256: string;
    motion_sha256: string;
    visual_system_sha256: string;
    production_profile_sha256?: string;
  };
};
