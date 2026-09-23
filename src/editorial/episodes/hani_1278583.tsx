import React from "react";
import { AbsoluteFill, Img, Interactive, Sequence, interpolate, useCurrentFrame, Easing } from "remotion";
import { Video } from "@remotion/media";
import { eventOpacity, eventProgress } from "../../lib/editorial";
import type { EditorialEpisodeProps, EditorialPilotData } from "../pilot";
import { EditorialScreenText } from "../ScreenText";
import { TerminatorScene, GOLD } from "../scenes/hani_1278583_terminator";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeInOut = { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) };

const ev = (pilot: EditorialPilotData, id: string) => {
  const found = pilot.timeline.events.find((e) => e.id === id);
  if (!found) throw new Error(`사건을 찾을 수 없다: ${id}`);
  return found;
};
const con = (pilot: EditorialPilotData, id: string) => {
  const found = pilot.timeline.concepts.find((c) => c.id === id);
  if (!found) throw new Error(`개념을 찾을 수 없다: ${id}`);
  return found;
};

/** 아래쪽 자막 구역과 위쪽 로고 주변의 대비를 확보한다. */
const Shade: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(180deg,rgba(3,8,15,.5) 0%,rgba(3,8,15,0) 16%,rgba(3,8,15,0) 60%,rgba(3,8,15,.6) 100%)",
      pointerEvents: "none",
    }}
  />
);

const Text: React.FC<{
  pilot: EditorialPilotData;
  elementId: string;
  eventId: string;
  style: React.CSSProperties;
}> = ({ pilot, elementId, eventId, style }) => {
  const frame = useCurrentFrame();
  return (
    <EditorialScreenText
      pilot={pilot}
      elementId={elementId}
      eventId={eventId}
      globalFrame={frame}
      style={{ whiteSpace: "nowrap", textShadow: "0 3px 12px rgba(0,0,0,.75)", ...style }}
    />
  );
};

/** ① 차오르다 반달에서 멈추는 달 */
const Intro: React.FC<EditorialEpisodeProps> = ({ pilot }) => {
  const frame = useCurrentFrame();
  const c = con(pilot, "intro");
  const wax = ev(pilot, "phase_wax");
  const clipFrames = 170;
  const videoOn = frame < c.from + clipFrames;
  const hold = interpolate(frame, [wax.settled, wax.end], [1, 1.06], easeInOut);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03080f" }}>
      {/* 차오름은 여러 초에 걸친 동작이라 사건의 enter 곡선을 그대로 쓰면 화면이 오래 어둡다.
          등장은 짧게 하고, 퇴장만 사건의 to→end를 따른다. */}
      <Interactive.Div
        name="차오르는 달"
        style={{
          position: "absolute",
          inset: 0,
          opacity:
            interpolate(frame, [c.from, c.from + 10], [0, 1], clamp) *
            interpolate(frame, [wax.to, Math.max(wax.end, wax.to + 1)], [1, 0], clamp),
        }}
      >
        {videoOn ? (
          <Sequence from={c.from} layout="none">
            <Video src={pilot.file("editorial/phases_fq.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
          </Sequence>
        ) : (
          <Img src={pilot.file("editorial/fq.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(hold) }} />
        )}
      </Interactive.Div>
      <Shade />
    </AbsoluteFill>
  );
};

/** ② 경계선에서 그림자가 길어지는 이유 */
const Terminator: React.FC<EditorialEpisodeProps> = ({ pilot }) => {
  const frame = useCurrentFrame();
  const show = ev(pilot, "fq_show");
  const zoom = ev(pilot, "edge_zoom");
  const model = ev(pilot, "model_show");
  const real = ev(pilot, "real_show");
  const full = ev(pilot, "full_cross");
  return (
    <>
      <TerminatorScene
        assets={{
          fq: pilot.file("editorial/fq.jpg"),
          model: pilot.file("editorial/crater_model.mp4"),
          real: pilot.file("editorial/crater_real.jpg"),
          full: pilot.file("editorial/full.jpg"),
        }}
        timing={{
          moonIn: eventOpacity(frame, show),
          zoom: eventProgress(frame, zoom, "move"),
          // 확대 사건의 enter 곡선을 그대로 쓰면 위치창이 2초에 걸쳐 서서히 나타나 실제로 보이는 시간이 거의 없다.
          // 빠르게 띄우고 생성 재구성으로 넘어가는 컷까지 유지한다.
          locator:
            interpolate(frame, [zoom.from, zoom.from + 8], [0, 1], clamp) *
            interpolate(frame, [zoom.to, Math.max(zoom.end, zoom.to + 1)], [1, 0], clamp),
          model: eventOpacity(frame, model),
          modelStartFrame: model.from,
          // 생성 영상 6.58초가 노출 구간 안에서 끝까지 진행되도록 속도를 맞춘다.
          modelPlaybackRate: Math.min(1.8, Math.max(0.6, 6.58 / Math.max(1, (real.from - model.from) / 30))),
          real: eventOpacity(frame, real),
          full: eventOpacity(frame, full),
        }}
      />
    </>
  );
};

/** ③ 초저녁에 가장 높이 — 황혼 하늘 위 지평선과 달의 하늘길 */
const Timing: React.FC<EditorialEpisodeProps> = ({ pilot }) => {
  const frame = useCurrentFrame();
  const c = con(pilot, "timing");
  const sky = ev(pilot, "sky_in");
  const horizon = ev(pilot, "horizon_in");
  const arc = ev(pilot, "arc_draw");
  const rise = ev(pilot, "moon_rise");
  const set = ev(pilot, "moon_set");
  const horizonT = eventProgress(frame, horizon, "move");
  const arcT = eventProgress(frame, arc, "move");
  const riseT = eventProgress(frame, rise, "move");
  const setT = eventProgress(frame, set, "move");
  // 해가 진 쪽(이 영상에서 노을이 남은 왼쪽)이 서쪽. 동쪽(오른쪽)에서 떠 남쪽 정점을 지나 서쪽 지평선으로 진다.
  const HY = 1440;
  const P0 = { x: 984, y: HY };
  const P1 = { x: 540, y: 96 };
  const P2 = { x: 96, y: HY };
  const at = (t: number) => ({
    x: (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x,
    y: (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y,
  });
  // 정점까지 오르고(riseT), '졌습니다'에서 서쪽 지평선까지 내려간다(setT).
  const u = 0.5 * riseT + 0.5 * setT;
  const moon = at(u);
  const apex = at(0.5);
  const arcLen = 2400;
  const R = 44;
  const hx = interpolate(horizonT, [0, 1], [540, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03080f" }}>
      <Interactive.Div name="황혼 하늘" style={{ position: "absolute", inset: 0, opacity: eventOpacity(frame, sky) }}>
        <Sequence from={c.from} layout="none">
          <Video src={pilot.file("editorial/twilight.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </Sequence>
      </Interactive.Div>
      {/* 지평선: 땅을 조금 더 가라앉히고 기준선을 긋는다 */}
      <Interactive.Div name="지평선" style={{ position: "absolute", inset: 0, opacity: eventOpacity(frame, horizon) }}>
        <div style={{ position: "absolute", left: 0, top: HY, width: 1080, height: 1920 - HY, background: "linear-gradient(180deg,rgba(3,8,15,.55),rgba(3,8,15,.85))" }} />
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
          <line x1={hx} y1={HY} x2={1080 - hx} y2={HY} stroke="rgba(247,239,223,.85)" strokeWidth="3" />
          <line x1={P0.x} y1={HY - 14} x2={P0.x} y2={HY + 14} stroke="rgba(247,239,223,.7)" strokeWidth="3" opacity={horizonT} />
          <line x1={P2.x} y1={HY - 14} x2={P2.x} y2={HY + 14} stroke="rgba(247,239,223,.7)" strokeWidth="3" opacity={horizonT} />
        </svg>
      </Interactive.Div>
      {/* 하늘길: 동쪽 지평선에서 서쪽 지평선까지 */}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0, opacity: eventOpacity(frame, arc) }}>
        <defs>
          <linearGradient id="hf_arcfade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f7efdf" stopOpacity="0.15" />
            <stop offset="0.18" stopColor="#f7efdf" stopOpacity="0.8" />
            <stop offset="0.82" stopColor="#f7efdf" stopOpacity="0.8" />
            <stop offset="1" stopColor="#f7efdf" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path d={`M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`} fill="none" stroke="url(#hf_arcfade)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`22 16`} pathLength={arcLen} strokeDashoffset={0} style={{ clipPath: `inset(0 ${(1 - arcT) * 100}% 0 0)` }} />
        {/* 남쪽 정점 표시: 정점에 도달하면 자리에 남는다 */}
        <g opacity={interpolate(riseT, [0.9, 1], [0, 1], clamp) * (1 - interpolate(setT, [0, 0.4], [0, 0.45], clamp))}>
          <circle cx={apex.x} cy={apex.y} r="9" fill="none" stroke="#f7efdf" strokeWidth="3" />
          <line x1={apex.x} y1={apex.y + R + 30} x2={apex.x} y2={apex.y + R + 96} stroke="rgba(247,239,223,.6)" strokeWidth="3" strokeDasharray="8 8" />
        </g>
        {/* 서쪽 지평선 착지점 */}
        <g opacity={interpolate(setT, [0.8, 1], [0, 1], clamp)}>
          <circle cx={P2.x} cy={HY} r="9" fill="#f7efdf" />
        </g>
      </svg>
      {/* 달 표식: 실제 상현달 사진을 작은 원으로 */}
      <Interactive.Div
        name="하늘길의 상현달"
        style={{
          position: "absolute",
          left: moon.x - R,
          top: moon.y - R,
          width: R * 2,
          height: R * 2,
          opacity: eventOpacity(frame, rise),
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: "0 0 36px 10px rgba(247,239,223,.35)",
          backgroundColor: "#0b1420",
        }}
      >
        <Img src={pilot.file("editorial/fq.jpg")} style={{ position: "absolute", width: 1080 * (R * 2 / 900), height: 1920 * (R * 2 / 900), left: -(540 - 450) * (R * 2 / 900), top: -(960 - 450) * (R * 2 / 900) }} />
      </Interactive.Div>
      <Shade />
      <Text pilot={pilot} elementId="dir_south" eventId="dir_in" style={{ left: 0, width: 1080, textAlign: "center", top: apex.y - R - 96, fontSize: 44, fontWeight: 600, color: "#cdd9e6", letterSpacing: 6 }} />
      <Text pilot={pilot} elementId="peak_label" eventId="peak_in" style={{ left: 0, width: 1080, textAlign: "center", top: apex.y + R + 104, fontSize: 64, fontWeight: 700, color: "#f7efdf" }} />
      <Text pilot={pilot} elementId="set_label" eventId="set_in" style={{ left: P2.x + 36, top: HY - 100, fontSize: 56, fontWeight: 700, color: "#f7efdf" }} />
      <Text pilot={pilot} elementId="cond_label" eventId="cond_in" style={{ left: 0, width: 1000, textAlign: "right", top: HY + 22, fontSize: 38, fontWeight: 500, color: "#cdd9e6" }} />
    </AbsoluteFill>
  );
};

/** ④ 어두운 평원 — 바다 */
const Maria: React.FC<EditorialEpisodeProps> = ({ pilot }) => {
  const frame = useCurrentFrame();
  const show = ev(pilot, "fq2_show");
  const ring = ev(pilot, "mare_ring");
  const t = eventProgress(frame, show, "move");
  const ringT = eventProgress(frame, ring, "move");
  const scale = interpolate(t, [0, 1], [1.0, 1.5], easeInOut);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03080f", overflow: "hidden" }}>
      <Interactive.Div
        name="상현달의 어두운 평원"
        style={{
          position: "absolute",
          inset: 0,
          opacity: eventOpacity(frame, show),
          scale: String(scale),
          transformOrigin: "790px 940px",
        }}
      >
        <Img src={pilot.file("editorial/fq.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0, opacity: eventOpacity(frame, ring) }}>
          <ellipse cx="878" cy="892" rx={92 * ringT} ry={78 * ringT} fill="none" stroke={GOLD} strokeWidth={3 / scale} strokeDasharray="14 10" />
          <ellipse cx="722" cy="1004" rx={124 * ringT} ry={92 * ringT} fill="none" stroke={GOLD} strokeWidth={3 / scale} strokeDasharray="14 10" transform="rotate(-18 722 1004)" />
        </svg>
      </Interactive.Div>
      <Shade />
    </AbsoluteFill>
  );
};

/** ⑤ 은하 중심 방향 */
const Sagittarius: React.FC<EditorialEpisodeProps> = ({ pilot }) => {
  const frame = useCurrentFrame();
  const pan = ev(pilot, "mw_pan");
  const t = eventProgress(frame, pan, "move");
  return (
    <AbsoluteFill style={{ backgroundColor: "#03080f", overflow: "hidden" }}>
      <Interactive.Div name="은하 중심부" style={{ position: "absolute", inset: 0, opacity: eventOpacity(frame, pan) }}>
        <Img
          src={pilot.file("editorial/mw.jpg")}
          style={{
            position: "absolute",
            height: "100%",
            width: "auto",
            maxWidth: "none",
            left: interpolate(t, [0, 1], [-140, -560], clamp),
            top: 0,
          }}
        />
      </Interactive.Div>
      <Shade />
    </AbsoluteFill>
  );
};

/** ⑥ 연혁과 다음 날 — 상현달 위의 시간축, 마지막에 경계선으로 */
const History: React.FC<EditorialEpisodeProps> = ({ pilot }) => {
  const frame = useCurrentFrame();
  const show = ev(pilot, "moon_end_show");
  const tl = ev(pilot, "tl_in");
  const y2009 = ev(pilot, "y2009_in");
  const y2010 = ev(pilot, "y2010_in");
  const next = ev(pilot, "next_in");
  const zoom = ev(pilot, "end_zoom");
  const tlT = eventProgress(frame, tl, "move");
  const tickT = eventProgress(frame, y2010, "move");
  const nextT = eventProgress(frame, next, "move");
  const zoomT = eventProgress(frame, zoom, "move");
  const LY = 356;
  const X0 = 120, X09 = 220, X10 = 400, X27 = 790, X1 = 990;
  const lineEnd = interpolate(tlT, [0, 1], [X0, X1], clamp);
  const ticks = Array.from({ length: 16 }, (_, i) => X10 + ((X27 - X10) * (i + 1)) / 17);
  const scale = interpolate(zoomT, [0, 1], [1, 1.7], easeInOut);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03080f", overflow: "hidden" }}>
      <Interactive.Div name="상현달로 회귀" style={{ position: "absolute", inset: 0, opacity: eventOpacity(frame, show) }}>
        <Img
          src={pilot.file("editorial/fq.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(scale), transformOrigin: "560px 1120px" }}
        />
      </Interactive.Div>
      <Shade />
      {/* 시간축: 위쪽 하늘 영역에 한 줄. 발화 순서대로 기점→정례화→다음 개최 */}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0, opacity: eventOpacity(frame, tl) }}>
        <line x1={X0} y1={LY} x2={lineEnd} y2={LY} stroke="rgba(247,239,223,.7)" strokeWidth="3" />
        <g opacity={eventOpacity(frame, y2009)}>
          <circle cx={X09} cy={LY} r="12" fill="#f7efdf" />
        </g>
        <g opacity={eventOpacity(frame, y2010)}>
          <circle cx={X10} cy={LY} r="12" fill="#f7efdf" />
          {ticks.map((x, i) => (
            <line key={i} x1={x} y1={LY - 9} x2={x} y2={LY + 9} stroke="rgba(247,239,223,.55)" strokeWidth="2" opacity={tickT * ticks.length > i ? 1 : 0} />
          ))}
        </g>
        <g opacity={eventOpacity(frame, next)}>
          <circle cx={X27} cy={LY} r={12 + 6 * nextT} fill={GOLD} />
          <circle cx={X27} cy={LY} r={22 + 10 * nextT} fill="none" stroke={GOLD} strokeWidth="3" opacity={0.6} />
        </g>
        <polygon points={`${X1},${LY} ${X1 - 18},${LY - 9} ${X1 - 18},${LY + 9}`} fill="rgba(247,239,223,.7)" opacity={interpolate(tlT, [0.95, 1], [0, 1], clamp)} />
      </svg>
      <Text pilot={pilot} elementId="y2009" eventId="y2009_in" style={{ left: X09 - 190, width: 380, textAlign: "center", top: LY + 30, fontSize: 38, lineHeight: 1.3, color: "#f7efdf", whiteSpace: "pre-line" }} />
      <Text pilot={pilot} elementId="y2010" eventId="y2010_in" style={{ left: X10 - 120, width: 240, textAlign: "center", top: LY - 138, fontSize: 40, lineHeight: 1.3, color: "#f7efdf", whiteSpace: "pre-line" }} />
      <Text pilot={pilot} elementId="next_note" eventId="note_in" style={{ left: X27 - 100, width: 200, textAlign: "center", top: LY - 96, fontSize: 40, fontWeight: 600, color: GOLD }} />
      <Text pilot={pilot} elementId="next_label" eventId="next_in" style={{ left: X27 - 250, width: 500, textAlign: "center", top: LY + 36, fontSize: 84, fontWeight: 700, color: GOLD, letterSpacing: 1 }} />
    </AbsoluteFill>
  );
};

export const EditorialEpisode: React.FC<EditorialEpisodeProps> = ({ pilot }) => {
  const frame = useCurrentFrame();
  const current =
    pilot.timeline.concepts.find((c) => frame >= c.from && frame < c.end) ?? pilot.timeline.concepts[0];
  return (
    <AbsoluteFill style={{ fontFamily: "GmarketSans", backgroundColor: "#03080f" }}>
      {current.id === "intro" ? (
        <Intro pilot={pilot} />
      ) : current.id === "terminator" ? (
        <Terminator pilot={pilot} />
      ) : current.id === "timing" ? (
        <Timing pilot={pilot} />
      ) : current.id === "maria" ? (
        <Maria pilot={pilot} />
      ) : current.id === "sagittarius" ? (
        <Sagittarius pilot={pilot} />
      ) : (
        <History pilot={pilot} />
      )}
    </AbsoluteFill>
  );
};
