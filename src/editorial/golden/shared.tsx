import {
  AbsoluteFill,
  Easing,
  Img,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Video } from "@remotion/media";
import type { EditorialTimeline } from "../../lib/editorial";
import type { CueTiming } from "./timing";

export type StoryLine = { id: string; text: string; start: number; end: number; words: { text: string; start: number; end: number }[] };
export type Chapter = { id: string; from: number; to: number };
export type Story = { id: string; lines: StoryLine[]; credits: string[]; chapters: Chapter[]; editorialTimeline: EditorialTimeline };
export type SceneProps = { story: Story; chapter: Chapter };
export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
export const ease = { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) };
export const move = { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) };
export const leave = { ...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0) };
export const fadePhases = {
  ...clamp,
  easing: [ease.easing, Easing.linear, leave.easing],
};
export const colors = {
  white: "#fffaf0",
  muted: "#b5c6d0",
  blue: "#75d3ff",
  warm: "#ffbd75",
  dark: "#030911",
  mint: "#88eadb",
};
export const asset = (s: Story, p: string) => staticFile(`pilots/${s.id}/${p}`);
export const cue = (s: Story, c: Chapter, id: string, word?: string) => {
  const l = s.lines.find((l) => l.id === id);
  if (!l) throw Error(id);
  const w = word ? l.words.find((w) => w.text.includes(word)) : null;
  if (word && !w) throw Error(`${id}:${word}`);
  return Math.round((w?.start ?? l.start) * 30) - c.from;
};
export const Reveal: React.FC<{
  from?: number;
  to?: number;
  inFrames?: number;
  outFrames?: number;
  rise?: number;
  children: React.ReactNode;
}> = ({ from = 0, to, inFrames = 10, outFrames = 8, rise = 0, children }) => {
  const f = useCurrentFrame();
  return (
    <Interactive.Div
      name="의미가 바뀌는 순간"
      style={{
        position: "absolute",
        inset: 0,
        opacity: interpolate(
          f,
          to === undefined
            ? [from, from + inFrames]
            : [from, from + inFrames, to, to + outFrames],
          to === undefined ? [0, 1] : [0, 1, 1, 0],
          to === undefined ? ease : fadePhases,
        ),
        translate: `0px ${interpolate(f, [from, from + inFrames], [rise, 0], ease)}px`,
      }}
    >
      {children}
    </Interactive.Div>
  );
};
export const TimedReveal: React.FC<{
  at: CueTiming;
  rise?: number;
  children: React.ReactNode;
}> = ({ at, rise = 0, children }) => (
  <Reveal
    from={at.from}
    inFrames={at.settled - at.from}
    to={at.to}
    outFrames={at.end - at.to}
    rise={rise}
  >
    {children}
  </Reveal>
);
export const Sky: React.FC<{ warm?: boolean }> = ({ warm = false }) => (
  <AbsoluteFill
    style={{
      background: warm
        ? "radial-gradient(ellipse at 50% 43%,#563320 0%,#201d25 36%,#050b13 78%)"
        : "radial-gradient(ellipse at 50% 42%,#19394d 0%,#0b1b2b 35%,#030911 78%)",
    }}
  >
    <Interactive.Svg name="별 배경" width="1080" height="1920">
      {Array.from({ length: 90 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 431.73) % 1080}
          cy={(i * 251.91) % 1920}
          r={i % 5 === 0 ? 1.7 : 0.8}
          fill="#e4f6ff"
          opacity={0.15 + (i % 7) / 18}
        />
      ))}
    </Interactive.Svg>
  </AbsoluteFill>
);
export const Text: React.FC<{
  children: React.ReactNode;
  y: number;
  size?: number;
  color?: string;
  align?: "left" | "center";
  weight?: number;
}> = ({
  children,
  y,
  size = 64,
  color = colors.white,
  align = "center",
  weight = 700,
}) => (
  <Interactive.Div
    style={{
      position: "absolute",
      top: y,
      left: 80,
      right: 80,
      textAlign: align,
      color,
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1.24,
      letterSpacing: -1.8,
      whiteSpace: "pre-line",
      wordBreak: "keep-all",
      textShadow: "0 2px 12px #0009",
    }}
  >
    {children}
  </Interactive.Div>
);
export const FullMedia: React.FC<{
  src: string;
  photo?: boolean;
  start?: number;
  rate?: number;
  position?: string;
  shade?: number;
  rotate?: boolean;
}> = ({
  src,
  photo = false,
  start = 0,
  rate = 1,
  position = "50% 50%",
  shade = 0,
  rotate = false,
}) => (
  <AbsoluteFill>
    {photo ? (
      <Img
        src={src}
        style={{
          width: 1080,
          height: 1920,
          objectFit: "cover",
          objectPosition: position,
        }}
      />
    ) : (
      <Video
        src={src}
        trimBefore={start}
        playbackRate={rate}
        muted
        objectFit="cover"
        style={
          rotate
            ? {
                position: "absolute",
                width: 1920,
                height: 1080,
                left: -420,
                top: 420,
                rotate: "90deg",
                maxWidth: "none",
                objectPosition: position,
              }
            : { width: 1080, height: 1920, objectPosition: position }
        }
      />
    )}
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg,#02081144,rgba(2,8,17,${shade}) 35%,rgba(2,8,17,${shade}) 60%,#02081155 76%,#020811bb 100%)`,
      }}
    />
  </AbsoluteFill>
);
export const Credits: React.FC<{ story: Story }> = ({ story }) => (
  <Interactive.Div
    name="출처 크레딧"
    style={{
      position: "absolute",
      zIndex: 100,
      left: 80,
      right: 80,
      bottom: 125,
      padding: "28px 25px",
      fontSize: 44,
      color: "#c4d0d9",
      lineHeight: 1.6,
      textAlign: "center",
      background: "#020811bb",
    }}
  >
    {story.credits.map((c) => (
      <Interactive.Div key={c}>{c}</Interactive.Div>
    ))}
  </Interactive.Div>
);
