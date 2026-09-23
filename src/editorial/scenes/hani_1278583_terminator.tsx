import React from "react";
import { AbsoluteFill, Img, Interactive, Sequence, interpolate, Easing } from "remotion";
import { Video } from "@remotion/media";
import { SceneProofMedia, type SceneProofSceneProps } from "../SceneProof";

/**
 * 반달의 명암 경계선에서 그림자가 길어지는 이유를 보이는 장면.
 * 같은 대상을 유지한 채 ① 실제 상현달 → 경계선 확대(위치창 유지)
 * ② 같은 충돌구 지형에서 햇빛 각도가 내려가며 그림자가 길어짐(생성 재구성)
 * ③ 실제 사진으로 확인 ④ 보름달과 대조.
 * 시간값은 호출자가 준다 — 시안은 길이 비율, 본편은 timeline 사건.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) };
const easeInOut = { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) };

export const GOLD = "#f2b879";
export const COOL = "#a8cfe6";

/** 확대 중심(상현달 원본 1080×1920 좌표계의 명암 경계선 위) */
const FOCUS_X = 596;
const FOCUS_Y = 810;
const ZOOM = 3.1;


export type TerminatorTiming = {
  /** 상현달 등장(0→1) */
  moonIn: number;
  /** 경계선 확대 진행(0→1) */
  zoom: number;
  /** 위치창 표시(0→1). 확대 곡선과 분리해 빠르게 띄우고 컷까지 유지한다. */
  locator: number;
  /** 재구성 도해 표시(0→1) */
  model: number;
  /** 재구성 영상이 시작하는 지역 프레임 */
  modelStartFrame: number;
  /** 재구성 영상의 재생 속도. 노출 구간 안에서 빛의 하강이 끝까지 진행되게 맞춘다. */
  modelPlaybackRate?: number;
  /** 실제 사진 표시(0→1) */
  real: number;
  /** 보름달 교차(0→1) */
  full: number;
};

export type TerminatorLabels = {
  modelProvenance?: React.ReactNode;
  realProvenance?: React.ReactNode;
  full?: React.ReactNode;
};

export type TerminatorAssets = { fq: string; model: string; real: string; full: string };

/** 햇빛이 들어오는 각도. 0이면 거의 머리 위, 1이면 낮게 옆에서. */

/** 화면 전체를 덮는 라벨 층. 글자는 지정한 좌표에 그대로 놓이고 세로로 접히지 않는다. */
const Layer: React.FC<{ name: string; opacity: number; children?: React.ReactNode }> = ({ name, opacity, children }) =>
  children ? (
    <Interactive.Div
      name={name}
      style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none", whiteSpace: "nowrap" }}
    >
      {children}
    </Interactive.Div>
  ) : null;

export const TerminatorScene: React.FC<{
  assets: TerminatorAssets;
  timing: TerminatorTiming;
  labels?: TerminatorLabels;
}> = ({ assets, timing, labels = {} }) => {
  const { moonIn, zoom, locator, model, modelStartFrame, modelPlaybackRate = 1, real, full } = timing;
  const scale = interpolate(zoom, [0, 1], [1, ZOOM], easeInOut);
  const lift = interpolate(zoom, [0, 1], [0, 120], easeInOut);
  // 위치창(전체 달) 안에서 지금 보고 있는 영역
  const locW = 200;
  const locH = (locW * 1920) / 1080;
  const boxW = locW / scale;
  const boxH = locH / scale;
  const boxX = ((FOCUS_X - 1080 / (2 * scale)) / 1080) * locW;
  const boxY = ((FOCUS_Y - 1920 / (2 * scale)) / 1920) * locH;

  return (
    <AbsoluteFill style={{ backgroundColor: "#03080f", overflow: "hidden" }}>
      {/* ① 실제 상현달 — 경계선으로 확대 */}
      <Interactive.Div
        name="상현달 전면과 경계선 확대"
        style={{ position: "absolute", inset: 0, opacity: moonIn * (1 - full) * (1 - model) }}
      >
        <Img
          src={assets.fq}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: String(scale),
            translate: `0px ${lift}px`,
            transformOrigin: `${FOCUS_X}px ${FOCUS_Y}px`,
          }}
        />
      </Interactive.Div>

      {/* ④ 보름달 — 같은 시각화의 정면광 상태 */}
      <Interactive.Div name="보름달 대조" style={{ position: "absolute", inset: 0, opacity: full }}>
        <Img src={assets.full} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Interactive.Div>

      {/* ② 같은 충돌구 지형에서 햇빛이 내려오며 그림자가 길어진다 (생성 재구성) */}
      <Sequence from={modelStartFrame} layout="none">
        <Interactive.Div name="충돌구 재구성 영상" style={{ position: "absolute", inset: 0, opacity: model }}>
          <Video src={assets.model} muted objectFit="cover" playbackRate={modelPlaybackRate} style={{ width: "100%", height: "100%" }} />
        </Interactive.Div>
      </Sequence>

      {/* ③ 실제 관측 사진 */}
      <Interactive.Div name="실제 경계선 사진" style={{ position: "absolute", inset: 0, opacity: real }}>
        <Img
          src={assets.real}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "42% 50%", scale: String(interpolate(real, [0, 1], [1.06, 1.0], easeOut)) }}
        />
      </Interactive.Div>

      {/* 위치창 — 확대하는 동안 전체 달의 어디인지 유지 */}
      <Interactive.Div
        name="전체 달 위치창"
        style={{
          position: "absolute",
          left: 74,
          top: 150,
          width: locW,
          height: locH,
          opacity: locator * (1 - model) * (1 - real) * (1 - full),
          border: "2px solid rgba(232,240,250,.55)",
          background: "#04090f",
          overflow: "hidden",
        }}
      >
        <Img src={assets.fq} style={{ width: locW, height: locH, objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            left: boxX,
            top: boxY,
            width: boxW,
            height: boxH,
            border: `2px solid ${GOLD}`,
            boxSizing: "border-box",
          }}
        />
      </Interactive.Div>

      <Layer name="재구성 표기" opacity={model}>{labels.modelProvenance}</Layer>
      <Layer name="실사 출처" opacity={real}>{labels.realProvenance}</Layer>
      <Layer name="보름달 조건" opacity={full}>{labels.full}</Layer>
      {/* 아래쪽 자막 구역의 대비 확보 */}
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg,rgba(3,8,15,.45) 0%,rgba(3,8,15,0) 18%,rgba(3,8,15,0) 62%,rgba(3,8,15,.55) 100%)", pointerEvents: "none" }}
      />
    </AbsoluteFill>
  );
};

/** 시안용 — 길이 비율로 같은 장면을 돌린다. 본편은 timeline 사건으로 같은 컴포넌트를 쓴다. */
const Scene: React.FC<SceneProofSceneProps> = ({ asset, frame, fps, durationInFrames }) => {
  const s = (sec: number) => sec * fps;
  const at = (from: number, to: number, opts = easeOut) => interpolate(frame, [s(from), s(to)], [0, 1], opts);
  const modelStart = Math.round(s(3.6));
  const proofLabel = (text: string, style: React.CSSProperties): React.ReactNode => (
    <div style={{ position: "absolute", ...style }}>{text}</div>
  );
  return (
    <TerminatorScene
      assets={{
        fq: asset("fq_still").src,
        model: asset("crater_model_v").src,
        real: asset("crater_real").src,
        full: asset("full_still").src,
      }}
      timing={{
        moonIn: at(0, 0.5),
        zoom: at(1.2, 3.4, easeInOut),
        locator: at(1.6, 2.2) * (1 - at(3.4, 3.9)),
        model: at(3.6, 4.1) * (1 - at(11.2, 11.7)),
        modelStartFrame: modelStart,
        real: at(11.2, 11.8) * (1 - at(12.9, 13.4)),
        full: at(12.9, 13.6, easeInOut) * (1 - at(Math.max(15.2, durationInFrames / fps), 99)),
      }}
      labels={{
        modelProvenance: proofLabel("충돌구 지형 재구성 · AI 생성", { left: 80, top: 1380, fontSize: 44, color: "#eef3f8", textShadow: "0 3px 12px rgba(0,0,0,.9)" }),
        realProvenance: proofLabel("NASA · 아르테미스 2호 촬영", { left: 80, top: 1380, fontSize: 44, color: "#eef3f8", textShadow: "0 3px 12px rgba(0,0,0,.9)" }),
        full: proofLabel("보름달 · 정면광", { left: 80, top: 300, fontSize: 54, fontWeight: 700, color: "#eef3f8", textShadow: "0 3px 10px #000" }),
      }}
    />
  );
};

export const SceneProofMediaRef = SceneProofMedia;
export default Scene;
