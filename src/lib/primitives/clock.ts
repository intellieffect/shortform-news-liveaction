import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { Beat } from "../../pilot/types";

// 비트 로컬 시계. 모든 부품은 이 시계만 본다 — Sequence 안에서는 0부터 시작하는 로컬 프레임.
//   motion=false  → 화면 모션(켄번스·클립)은 발화 중간 지점(t=0.5) 정지
//   textAnim=false → 텍스트·그래픽 애니는 항상 완성 상태(슬라이드·시트)
export type BeatClock = {
  localFrame: number;
  fps: number;
  t: number; // 0..1 비트 진행도 (motion=false 면 0.5)
  motion: boolean;
  textAnim: boolean;
  anim: (startF: number, len: number, from?: number, to?: number) => number; // out-cubic 이징, clamp
  lin: (startF: number, len: number, from: number, to: number) => number; // 선형, clamp
  secToF: (sec: number) => number; // 비트 시작 기준 초 → 로컬 프레임
};

export const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const useBeatClock = (beat: Beat, opts: { motion?: boolean; textAnim?: boolean } = {}): BeatClock => {
  const motion = opts.motion ?? false;
  const textAnim = opts.textAnim ?? false;
  const localFrame = useCurrentFrame();
  const total = Math.max(1, beat.duration_frames);
  const fps = Math.max(1, Math.round(beat.duration_frames / Math.max(beat.duration, 0.001)));
  const t = motion ? Math.min(1, Math.max(0, localFrame / total)) : 0.5;
  const anim = (startF: number, len: number, from = 0, to = 1) =>
    textAnim ? interpolate(localFrame, [startF, startF + len], [from, to], { ...clamp, easing: Easing.out(Easing.cubic) }) : to;
  const lin = (startF: number, len: number, from: number, to: number) =>
    textAnim ? interpolate(localFrame, [startF, startF + len], [from, to], clamp) : to;
  const secToF = (sec: number) => Math.round((sec - beat.start) * fps);
  return { localFrame, fps, t, motion, textAnim, anim, lin, secToF };
};

export const W = 1080;
export const H = 1920;

export const tokenize = (line: string) => line.split(" ");
