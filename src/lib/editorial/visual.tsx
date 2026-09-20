import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import type { Overlay, Style } from "../../pilot/types";
import { DEFAULT_PRODUCTION_PROFILE, type ProductionProfile } from "./profile";
import { CaptionPreflight } from "./CaptionPreflight";
import { captionRuns, type EditorialCaptionLine } from "./caption-text";
export type { EditorialCaptionLine } from "./caption-text";

export const EDITORIAL_CAPTION_PRESET = {
  accent: DEFAULT_PRODUCTION_PROFILE.caption.accent,
  fontSize: DEFAULT_PRODUCTION_PROFILE.caption.font_size,
  anchorY: DEFAULT_PRODUCTION_PROFILE.caption.top / DEFAULT_PRODUCTION_PROFILE.canvas.height,
  backdrop: true,
} as const;

export const editorialCaptionStyle = (style: Style): Style => ({
  ...style,
  colors: { ...style.colors, accent: EDITORIAL_CAPTION_PRESET.accent },
  sizes: { ...style.sizes, caption: EDITORIAL_CAPTION_PRESET.fontSize },
  caption: { ...style.caption, anchor_y: EDITORIAL_CAPTION_PRESET.anchorY, backdrop: true },
});

export const editorialCaptionOverlay = (overlay: Overlay): Overlay => ({
  ...overlay,
  emphasis: overlay.emphasis.map((item) => ({ ...item, pop: false })),
});

export const FullBleed: React.FC<{ children: React.ReactNode; shade?: boolean }> = ({ children, shade = true }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    {children}
    {shade ? <AbsoluteFill style={{ background: "linear-gradient(transparent 58%,rgba(5,10,18,.12) 70%,rgba(5,10,18,.64) 100%)" }} /> : null}
  </AbsoluteFill>
);

export const EditorialCaptionTrack: React.FC<{ lines: EditorialCaptionLine[]; fps: number; profile?: ProductionProfile }> = ({ lines, fps, profile = DEFAULT_PRODUCTION_PROFILE }) => {
  const caption = profile.caption;
  const frame = useCurrentFrame();
  const active = lines.find((line, index) => {
    const start = Math.max(0, Math.round(line.start * fps) - caption.lead_frames);
    const next = lines[index + 1];
    const end = Math.min(Math.ceil(line.end * fps), next ? Math.max(0, Math.round(next.start * fps) - caption.lead_frames) : Infinity);
    return frame >= start && frame < end;
  });
  if (!active) return <CaptionPreflight lines={lines} profile={profile} />;
  const start = Math.max(0, Math.round(active.start * fps) - caption.lead_frames);
  return (
    <>
    <CaptionPreflight lines={lines} profile={profile} />
    <Interactive.Div
      name="공통 자막"
      style={{
        position: "absolute",
        left: caption.side_inset,
        right: caption.side_inset,
        top: caption.top,
        textAlign: "center",
        wordBreak: "keep-all",
        opacity: interpolate(frame, [start, start + caption.enter_frames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        }),
        translate: interpolate(frame, [start, start + caption.enter_frames], [`0px ${caption.rise_px}px`, "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        }),
      }}
    >
      <Interactive.Div
        name="자막 배경"
        style={{
          // box_height 가 있으면 수령 규격대로 바 높이를 고정한다(글자는 세로 중앙). 없으면 글자 높이로 정한다.
          display: caption.box_height ? "inline-flex" : "inline-block",
          alignItems: caption.box_height ? "center" : undefined,
          height: caption.box_height,
          maxWidth: profile.canvas.width - caption.side_inset * 2,
          background: caption.backdrop,
          padding: caption.box_height ? `0px ${caption.padding_x}px` : `${caption.padding_y}px ${caption.padding_x}px`,
          borderRadius: caption.radius,
        }}
      >
        <Interactive.Div
          name="자막 문장"
          style={{
            fontFamily: caption.font_family,
            fontSize: caption.font_size,
            fontWeight: caption.weight,
            lineHeight: caption.line_height,
            color: caption.color,
            whiteSpace: caption.max_lines === 1 ? "nowrap" : "pre-line",
          }}
        >
          {captionRuns(active).map((run, index) => run.emphasized ? (
            <span key={`${active.id}-${index}`} style={{ color: caption.accent, fontWeight: caption.emphasis_weight }}>{run.text}</span>
          ) : run.text)}
        </Interactive.Div>
      </Interactive.Div>
    </Interactive.Div>
    </>
  );
};
