import type { ComponentType } from "react";
import { staticFile } from "remotion";
import type { AudioCfg } from "../pilot/pilot";
import type { EditorialCaptionLine } from "../lib/editorial/visual";
import type { EditorialTimeline } from "../lib/editorial/types";
import { LEGACY_PRODUCTION_PROFILE, type ProductionProfile } from "../lib/editorial/profile";

export type EditorialEpisodeProps = { pilot: EditorialPilotData };

export type EditorialNarrationLine = EditorialCaptionLine & { words: { text: string; start: number; end: number }[] };
type RawNarration = {
  pilot: string;
  lines?: EditorialNarrationLine[];
  sentences?: (EditorialNarrationLine & { spoken_text?: string; caption_words?: EditorialNarrationLine["words"] })[];
  captions?: EditorialCaptionLine[];
};

export type EditorialPilotData = {
  id: string;
  engine: "editorial-concept@1";
  compId: string;
  timeline: EditorialTimeline;
  profile: ProductionProfile;
  narration: { pilot: string; lines: EditorialNarrationLine[]; captions?: EditorialCaptionLine[] };
  story: Record<string, unknown>;
  concepts: Record<string, unknown>;
  visualSystem: Record<string, unknown>;
  audio: AudioCfg;
  fps: number;
  totalFrames: number;
  speech: (readonly [number, number])[];
  Component: ComponentType<EditorialEpisodeProps>;
  file: (rel: string) => string;
};

export type EditorialPilotRaw = {
  id: string;
  timeline: unknown;
  narration: unknown;
  story: unknown;
  concepts: unknown;
  visualSystem: unknown;
  audio: unknown;
  manifest: unknown;
  component: ComponentType<EditorialEpisodeProps>;
};

export const buildEditorialPilot = (raw: EditorialPilotRaw): EditorialPilotData => {
  const manifest = raw.manifest as { engine?: string };
  if (manifest.engine !== "editorial-concept@1") throw new Error(`${raw.id}: editorial-concept@1 manifest가 아니다`);
  const timeline = raw.timeline as EditorialTimeline;
  const narrationRaw = raw.narration as RawNarration;
  const sourceLines = narrationRaw.sentences ?? narrationRaw.lines;
  if (!Array.isArray(sourceLines) || !sourceLines.length) throw new Error(`${raw.id}: narration sentences/lines가 없다`);
  const narration: EditorialPilotData["narration"] = {
    pilot: narrationRaw.pilot,
    lines: sourceLines.map((line) => ({ ...line, text: line.text ?? (line as { spoken_text?: string }).spoken_text ?? "", words: line.words ?? [] })),
    captions: narrationRaw.captions,
  };
  if (timeline.pilot !== raw.id || narration.pilot !== raw.id) throw new Error(`${raw.id}: timeline/narration pilot id가 다르다`);
  if (!Number.isInteger(timeline.total_frames) || timeline.total_frames <= 0) throw new Error(`${raw.id}: timeline.total_frames가 유효하지 않다`);
  return {
    id: raw.id,
    engine: "editorial-concept@1",
    compId: raw.id.replace(/[^a-zA-Z0-9-]/g, "-"),
    timeline,
    profile: timeline.production_profile ?? LEGACY_PRODUCTION_PROFILE,
    narration,
    story: raw.story as Record<string, unknown>,
    concepts: raw.concepts as Record<string, unknown>,
    visualSystem: raw.visualSystem as Record<string, unknown>,
    audio: raw.audio as AudioCfg,
    fps: timeline.fps,
    totalFrames: timeline.total_frames,
    speech: narration.lines.map((line) => [Math.round(line.start * timeline.fps), Math.round(line.end * timeline.fps)] as const),
    Component: raw.component,
    file: (rel: string) => staticFile(`pilots/${raw.id}/${rel}`),
  };
};
