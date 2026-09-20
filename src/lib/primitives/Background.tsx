import { AbsoluteFill, Img, interpolate, Easing } from "remotion";
import { usePilotFile } from "../../pilot/pilot";
import { Video } from "@remotion/media";
import type { Beat, Crop, Shot, Style } from "../../pilot/types";
import { H, W, type BeatClock } from "./clock";

// 화면층 부품 묶음 (layer: shots)
//   crop_frame@1  — 원본의 crop 비율 영역을 1080×1920 에 cover
//   kenburns@1    — motion.scale_from→to, dx/dy (motion=false 면 중간값 정지)
//   split@1       — 전/후 비교 상하 분할 + 라벨
//   clip          — 사전 트림 무음 클립 (motion 일 때만)
//   dim_gradient@1 — 상·하단 가독성 그라디언트

// crop_frame@1
export const cropStyle = (crop: Crop | null, srcSize: [number, number] | null, boxW = W, boxH = H): React.CSSProperties => {
  // Tailwind preflight 가 img 에 max-width:100%; height:auto 를 먹이므로 명시적으로 푼다.
  if (!crop || !srcSize) {
    return { position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover" };
  }
  const [sw, sh] = srcSize;
  const rw = crop.w * sw;
  const rh = crop.h * sh;
  const s = Math.max(boxW / rw, boxH / rh);
  return {
    position: "absolute",
    maxWidth: "none",
    width: sw * s,
    height: sh * s,
    left: -crop.x * sw * s - (rw * s - boxW) / 2,
    top: -crop.y * sh * s - (rh * s - boxH) / 2,
  };
};

type Props = { readonly beat: Beat; readonly shot: Shot | null; readonly style: Style; readonly clock: BeatClock; readonly showPlan?: boolean };

export const Background: React.FC<Props> = ({ beat, shot, style, clock, showPlan = false }) => {
  const file = usePilotFile();
  const { colors, safe } = style;
  const kb = shot?.visual.motion;
  // kenburns@1
  const kbScale = kb ? interpolate(clock.t, [0, 1], [kb.scale_from, kb.scale_to], { easing: Easing.inOut(Easing.quad) }) : 1;
  const kbTranslate = kb ? `${interpolate(clock.t, [0, 1], [0, (kb.dx ?? 0) * W])}px ${interpolate(clock.t, [0, 1], [0, (kb.dy ?? 0) * H])}px` : "0px 0px";
  const clip = clock.motion ? shot?.visual.clip : undefined;

  const dim = shot?.visual.dim ?? 0;
  const Dim = dim > 0 ? <AbsoluteFill style={{ backgroundColor: "#000", opacity: dim }} /> : null;
  if (shot?.visual.file && shot.visual.split && shot.visual.split.direction === "wipe") {
    // wipe@1 — 전(crops[0]) 위에 후(crops[1])가 좌→우로 드러난다. motion=false 면 절반 지점 정지. 증거 이미지 훼손 없음
    const sp = shot.visual.split;
    const prog = clock.motion ? interpolate(clock.localFrame, [Math.round(0.3 * clock.fps), Math.round(2.0 * clock.fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }) : 0.5;
    const edge = Math.round(prog * W);
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={file(shot.visual.file)} style={cropStyle(sp.crops[0], shot.visual.src_size)} />
        <div style={{ position: "absolute", left: 0, top: 0, width: edge, height: H, overflow: "hidden" }}>
          <Img src={file(shot.visual.file)} style={cropStyle(sp.crops[1], shot.visual.src_size)} />
        </div>
        <div style={{ position: "absolute", left: edge - 2, top: 0, width: 4, height: H, background: colors.accent, opacity: 0.9 }} />
        {sp.labels?.[0] ? <div style={{ position: "absolute", right: safe.x, top: 24, fontSize: 30, color: colors.text, background: "rgba(11,15,26,0.6)", padding: "6px 14px", borderRadius: 6, opacity: 1 - prog }}>{sp.labels[0]}</div> : null}
        {sp.labels?.[1] ? <div style={{ position: "absolute", left: safe.x, top: 24, fontSize: 30, color: colors.text, background: "rgba(11,15,26,0.6)", padding: "6px 14px", borderRadius: 6, opacity: prog }}>{sp.labels[1]}</div> : null}
        {Dim}
      </AbsoluteFill>
    );
  }
  if (shot?.visual.file && shot.visual.split) {
    // split@1
    return (
      <AbsoluteFill>
        {shot.visual.split.crops.map((c, i) => {
          const n = shot.visual.split!.crops.length;
          const top = (H / n) * i;
          return (
            <div key={i} style={{ position: "absolute", left: 0, top, width: W, height: H / n, overflow: "hidden" }}>
              <Img src={file(shot.visual.file!)} style={cropStyle(c, shot.visual.src_size, W, H / n)} />
              <div style={{ position: "absolute", left: safe.x, top: 24, fontSize: 30, color: colors.text, background: "rgba(11,15,26,0.6)", padding: "6px 14px", borderRadius: 6 }}>
                {shot.visual.split!.labels[i]}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  if (clip) {
    // 4-1: 사전 트림된 무음 클립. 크롭은 스틸과 같은 비율 규칙(cropStyle)을 클립 해상도에 적용
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Video src={file(clip.file)} muted style={cropStyle(shot!.visual.crop, clip.src_size)} />
        {Dim}
      </AbsoluteFill>
    );
  }
  if (shot?.visual.file) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, scale: String(kbScale), translate: kbTranslate, transformOrigin: "center center" }}>
          <Img src={file(shot.visual.file)} style={cropStyle(shot.visual.crop, shot.visual.src_size)} />
        </div>
        {Dim}
      </AbsoluteFill>
    );
  }
  // 계획 placeholder — 편집 모드(showPlan)에서만. 최종 렌더엔 절대 안 나온다 (A1)
  if (!showPlan || beat.role === "endcard") return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div style={{ marginTop: safe.y + 16, color: colors.muted, fontSize: 30, lineHeight: 1.4, opacity: 0.6, textAlign: "center", padding: `0 ${safe.x}px`, wordBreak: "keep-all" }}>
        {shot ? (
          <>
            <div style={{ fontWeight: 700 }}>
              [{shot.visual.type}/{shot.visual.source}] {shot.visual.label}
            </div>
            {shot.gen ? (
              <div style={{ fontSize: 28, marginTop: 16 }}>
                생성 {shot.gen.status}
                {shot.gen.from ? ` (${shot.gen.from} 재사용)` : ""}
                {shot.gen.i2v ? ` → i2v ${shot.gen.i2v.duration_sec ?? "공유"}s` : ""}
              </div>
            ) : null}
          </>
        ) : (
          "[화면 미정]"
        )}
      </div>
    </AbsoluteFill>
  );
};

// dim_gradient@1
export const DimGradient: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(11,15,26,0.55) 0%, rgba(11,15,26,0) 30%, rgba(11,15,26,0) 50%, rgba(11,15,26,0.85) 100%)`,
    }}
  />
);
