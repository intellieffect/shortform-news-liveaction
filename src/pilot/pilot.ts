import { createContext, useContext } from "react";
import { staticFile } from "remotion";
import type { Beat, BeatsFile, Overlay, OverlaysFile, Shot, ShotsFile, Style } from "./types";

// 편(파일럿) 1개의 데이터 묶음. pilots/<id>/*.json 을 한 객체로 — 컴포지션·시트·슬라이드·부품은 전부 이 객체(Context)만 본다.
//   편 id = news/<id> 폴더명(snake_case). 컴포지션 id 는 Remotion 규칙(영숫자·하이픈)에 맞춰 compId 로.
//   미디어: JSON 의 file 은 편 상대경로(ext/…, video/…, audio/…) → file() 이 public/pilots/<id>/ 로 푼다.

export type Layers = { motion: boolean; text_anim: boolean; graphics: boolean; transitions: boolean; sound: boolean };
// 4-4 전환: 씬(문장) 경계만 크로스디졸브, 같은 씬 안은 컷. 훅은 프레임 0 노출이라 시작 페이드 없음. 끝은 페이드아웃.
export type Transitions = { crossfade_frames: number; scene_only: boolean; overrides: Record<string, number>; keep_text: string[]; end_fade_frames: number };
export type RenderConfig = { layers: Layers; transitions?: Transitions; debug?: { show_beat_id?: boolean } };
// 4-5 소리층 (docs/specs/audio.schema.md)
export type AudioCfg = {
  master_mix?: boolean;
  narration: { file: string; gain_db: number };
  bgm: { file: string | null; gain_db: number; duck_db: number; duck_attack_sec: number; duck_release_sec: number; fade_in_sec: number; fade_out_sec: number; start_offset_sec: number; loop: boolean; duck_ranges?: { from: number; to: number; gain_db: number; attack_sec?: number; release_sec?: number; why?: string }[] };
  sfx: { id: string; file: string | null; gain_db: number; at: string }[];
  master_gain_db: number;
};

export const LAYERS_OFF: Layers = { motion: false, text_anim: false, graphics: false, transitions: false, sound: false };
export const DEFAULT_TRANSITIONS: Transitions = { crossfade_frames: 10, scene_only: true, overrides: {}, keep_text: [], end_fade_frames: 12 };

export type PilotRaw = { id: string; beats: unknown; overlays: unknown; shots: unknown; audio: unknown; render: unknown; manifest?: unknown };

export type PilotData = {
  id: string;
  engine: "script-faithful@1";
  compId: string;
  beatsFile: BeatsFile;
  overlaysFile: OverlaysFile;
  shotsFile: ShotsFile;
  audio: AudioCfg;
  render: RenderConfig;
  beats: Beat[];
  style: Style;
  fps: number;
  totalFrames: number;
  layers: Layers;
  transitions: Transitions;
  showBeatId: boolean;
  speech: (readonly [number, number])[]; // 발화 구간(프레임) — BGM 덕킹 기준
  endcardFrame: number;
  resolveBeat: (id: string) => { beat: Beat; overlay: Overlay; shot: Shot | null };
  file: (rel: string) => string;
};

export const compId = (id: string) => id.replace(/[^a-zA-Z0-9-]/g, "-");

export const buildPilot = (raw: PilotRaw): PilotData => {
  const beatsFile = raw.beats as BeatsFile;
  const overlaysFile = raw.overlays as OverlaysFile;
  const shotsFile = (raw.shots ?? { schema_version: "0", shots: [] }) as ShotsFile;
  const audio = raw.audio as AudioCfg;
  const render = raw.render as RenderConfig;
  const manifest = (raw.manifest ?? {}) as { engine?: string };
  const engine = manifest.engine ?? "script-faithful@1";
  if (engine !== "script-faithful@1") throw new Error(`${raw.id}: buildPilot은 script-faithful@1만 받는다`);
  const beats = beatsFile.beats;
  const overlayByBeat = new Map<string, Overlay>(overlaysFile.overlays.map((o) => [o.beat, o]));
  const shotByBeat = new Map<string, Shot>((shotsFile.shots ?? []).map((s) => [s.beat, s]));
  const fps = beatsFile.fps;
  return {
    id: raw.id,
    engine,
    compId: compId(raw.id),
    beatsFile,
    overlaysFile,
    shotsFile,
    audio,
    render,
    beats,
    style: overlaysFile.style,
    fps,
    totalFrames: beatsFile.total_frames,
    layers: render.layers,
    transitions: render.transitions ?? DEFAULT_TRANSITIONS,
    showBeatId: render.debug?.show_beat_id ?? false,
    speech: beats.filter((b) => b.speech_start != null).map((b) => [Math.round(b.speech_start! * fps), Math.round(b.speech_end! * fps)] as const),
    endcardFrame: beats.find((b) => b.role === "endcard")?.start_frame ?? beatsFile.total_frames,
    resolveBeat: (id: string) => {
      const beat = beats.find((b) => b.id === id);
      if (!beat) throw new Error(`beat not found: ${id}`);
      const overlay = overlayByBeat.get(id);
      if (!overlay) throw new Error(`overlay not found: ${id}`);
      return { beat, overlay, shot: shotByBeat.get(id) ?? null };
    },
    file: (rel: string) => staticFile(`pilots/${raw.id}/${rel}`),
  };
};

export const PilotContext = createContext<PilotData | null>(null);

export const usePilot = (): PilotData => {
  const p = useContext(PilotContext);
  if (!p) throw new Error("usePilot(): PilotContext.Provider 밖에서 호출됨");
  return p;
};

// 부품용: 편 상대경로 → staticFile URL
export const usePilotFile = () => usePilot().file;
