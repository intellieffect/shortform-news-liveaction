import { Img, Interactive, interpolate, useCurrentFrame } from "remotion";
import { Galaxy } from "./Galaxy";
import { timing } from "./timing";
import {
  asset,
  colors,
  cue,
  ease,
  move,
  FullMedia,
  TimedReveal,
  fadePhases,
  leave,
  SceneProps,
  Sky,
  Text,
} from "./shared";
const Question: React.FC<SceneProps> = ({ story, chapter }) => {
  const turn = timing(story, chapter, "question_turn");
  return (
    <>
      <Sky />
      <Galaxy
        tilt={104}
        tiltTiming={turn}
        y={820}
        scale={1.03}
        axis
        ghost
      />
    </>
  );
};
const Clue: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    disk = cue(story, chapter, "d03"),
    number = cue(story, chapter, "d03", "이백이십"),
    halo = timing(story, chapter, "halo"),
    hn = cue(story, chapter, "d04", "이십오");
  return (
    <>
      <Sky />
      <Interactive.Div
        style={{
          opacity: interpolate(f, [number, number + 20], [1, 0.65], ease),
        }}
      >
        <Galaxy
          y={665}
          yFrom={780}
          yTiming={{ from: disk, settled: disk + 24 }}
          scale={0.94}
          halo={1}
          haloTiming={halo}
        />
      </Interactive.Div>
      <TimedReveal at={timing(story, chapter, "disk_label")} rise={12}>
        <Text y={1100} size={66} color={colors.blue}>
          원반의 별
        </Text>
      </TimedReveal>
      {[
        { at: number, y: 1020, value: 220, name: "원반", color: colors.blue },
        {
          at: hn,
          y: 1220,
          value: 25,
          name: "헤일로(후광)",
          color: colors.warm,
        },
      ].map((b) => (
        <TimedReveal
          key={b.name}
          at={timing(
            story,
            chapter,
            b.value === 220 ? "disk_speed" : "halo_speed",
          )}
          rise={12}
        >
          <Interactive.Div
            style={{
              position: "absolute",
              left: 100,
              right: 100,
              top: b.y,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              color: b.color,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 700 }}>{b.name}</span>
            <span>
              <span style={{ fontSize: 38 }}>약 </span>
              <strong style={{ fontSize: 130, letterSpacing: -6 }}>
                {b.value}
              </strong>
              <span style={{ fontSize: 38 }}> km/s</span>
            </span>
          </Interactive.Div>
          <Interactive.Div
            style={{
              position: "absolute",
              left: 100,
              top: b.y + 155,
              width: 880,
              height: 12,
              borderRadius: 6,
              background: "#5f7c8b44",
            }}
          >
            <Interactive.Div
              style={{
                height: 12,
                borderRadius: 6,
                background: b.color,
                width: interpolate(
                  f,
                  [b.at, b.at + 22],
                  [0, (880 * b.value) / 220],
                  ease,
                ),
              }}
            />
          </Interactive.Div>
        </TimedReveal>
      ))}
    </>
  );
};
const Evidence: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    condition = cue(story, chapter, "d06"),
    samples = timing(story, chapter, "samples"),
    changed = cue(story, chapter, "d06", "원반");
  const phase = f < condition ? 0 : f < changed ? 1 : 2;
  const crop = [
    { x: 4, y: 220 },
    { x: 4, y: 220 },
    { x: 725, y: 4 },
  ][phase];
  return (
    <>
      <Sky />
      {f < condition ? (
        <>
          <TimedReveal at={timing(story, chapter, "sample_count")} rise={14}>
            <Text y={340} size={128} color={colors.blue}>
              25개
            </Text>
          </TimedReveal>
          <Interactive.Div
            style={{
              position: "absolute",
              left: 155,
              top: 600,
              width: 770,
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: 28,
              opacity: interpolate(f, [samples.to, samples.end], [1, 0], leave),
            }}
          >
            {Array.from({ length: 25 }, (_, i) => (
              <Interactive.Div
                key={i}
                style={{
                  height: 85,
                  opacity: interpolate(
                    f,
                    [
                      samples.from + Math.floor(i / 5),
                      samples.from + Math.floor(i / 5) + 8,
                    ],
                    [0, 0.9],
                    ease,
                  ),
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse,#eaf5fa 0%,#b8ddf088 8%,#417ea940 35%,transparent 70%)",
                  rotate: `${((i * 23) % 55) - 25}deg`,
                }}
              />
            ))}
          </Interactive.Div>
        </>
      ) : (
        <>
          <TimedReveal
            at={timing(
              story,
              chapter,
              phase === 1 ? "past_label" : "now_label",
            )}
            rise={12}
          >
            <Text y={390} size={58}>
              {phase === 1 ? "과거의 모습" : "현재의 모습"}
            </Text>
          </TimedReveal>
          {[
            { top: 510, h: 430, dy: 0, label: "정면" },
            { top: 1020, h: 255, dy: 141, label: "측면" },
          ].map((v) => (
            <Interactive.Div key={v.label}>
              <Interactive.Div
                style={{
                  position: "absolute",
                  left: 100,
                  top: v.top + 90,
                  fontSize: 44,
                  color: "#b5cbd7",
                }}
              >
                {v.label}
              </Interactive.Div>
              <Interactive.Div
                style={{
                  position: "absolute",
                  left: 287,
                  top: v.top,
                  width: 516,
                  height: v.h,
                  overflow: "hidden",
                  background: "#000",
                }}
              >
                <Img
                  src={asset(story, "editorial/auriga-halo-grid.png")}
                  style={{
                    position: "absolute",
                    width: 866 * 3.82,
                    maxWidth: "none",
                    left: -crop.x * 3.82,
                    top: -(crop.y + v.dy) * 3.82,
                  }}
                />
              </Interactive.Div>
            </Interactive.Div>
          ))}
        </>
      )}
    </>
  );
};
const Inference: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    merge = timing(story, chapter, "merge"),
    axis = timing(story, chapter, "axis");
  return (
    <>
      <Sky warm />
      <Galaxy
        y={780}
        scale={0.9}
        tilt={104}
        tiltTiming={axis}
        axis
        ghost
      />
      <Interactive.Div
        style={{
          position: "absolute",
          left:
            interpolate(f, [merge.from, merge.settled], [1020, 540], move) - 90,
          top:
            interpolate(f, [merge.from, merge.settled], [1100, 780], move) - 35,
          width: 180,
          height: 70,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse,#fff4da,#ffba7866 30%,transparent 70%)",
          opacity: interpolate(
            f,
            [merge.from, merge.from + 8, merge.to, merge.end],
            [0, 1, 1, 0],
            fadePhases,
          ),
        }}
      />
      <TimedReveal at={timing(story, chapter, "date")} rise={12}>
        <Text y={1210} size={68}>
          100억~110억 년 전
        </Text>
      </TimedReveal>
      <TimedReveal at={timing(story, chapter, "angle")} rise={14}>
        <Text y={1165} size={140} color={colors.warm}>
          90° 이상
        </Text>
        <Text y={1330} size={56}>
          회전축이 바뀌었을 가능성
        </Text>
      </TimedReveal>
    </>
  );
};
export const Disc: React.FC<SceneProps> = (p) => {
  if (p.chapter.id === "question") return <Question {...p} />;
  if (p.chapter.id === "clue") return <Clue {...p} />;
  if (p.chapter.id === "evidence") return <Evidence {...p} />;
  if (p.chapter.id === "inference") return <Inference {...p} />;
  return (
    <>
      <FullMedia
        src={asset(p.story, "editorial/paranal-bulge.mp4")}
        start={78}
        rate={0.4}
        position="60% 50%"
      />
    </>
  );
};
