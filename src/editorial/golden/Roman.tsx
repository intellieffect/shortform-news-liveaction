import {
  AbsoluteFill,
  Img,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  colors,
  ease,
  move,
  FullMedia,
  TimedReveal,
  fadePhases,
  leave,
  SceneProps,
  Sky,
  Text,
  asset,
} from "./shared";
import { timing } from "./timing";
const Question: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    mirrors = timing(story, chapter, "mirrors"),
    names = [
      timing(story, chapter, "hubble_name"),
      timing(story, chapter, "roman_name"),
    ];
  if (f < mirrors.from)
    return (
      <>
        <FullMedia
          src={asset(story, "editorial/roman-mirror.mp4")}
          rate={0.45}
        />
      </>
    );
  return (
    <>
      <Sky />
      <Interactive.Svg
        name="거울 비교 도해"
        width="1080"
        height="1920"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="mirror-glass" cx="35%" cy="24%">
            <stop stopColor="#f5fcff" />
            <stop offset=".24" stopColor="#b4e1eb" />
            <stop offset=".45" stopColor="#4f7b9b" />
            <stop offset=".74" stopColor="#1e354f" />
            <stop offset="1" stopColor="#82b6d4" />
          </radialGradient>
          <linearGradient id="mirror-edge">
            <stop stopColor="#dceff5" />
            <stop offset=".48" stopColor="#39576e" />
            <stop offset="1" stopColor="#d5eafa" />
          </linearGradient>
        </defs>
        {([-1, 1] as const).map((direction, i) => (
          <Interactive.G
            key={direction}
            name={i ? "로먼 거울" : "허블 거울"}
            style={{ translate: `${direction * interpolate(f, [mirrors.from, mirrors.settled], [0, 230], move)}px 0px` }}
          >
            <circle cx="540" cy="785" r="205" fill="url(#mirror-edge)" />
            <circle cx="540" cy="785" r="192" fill="url(#mirror-glass)" />
            <circle
              cx="540"
              cy="785"
              r="37"
              fill="#081524"
              stroke="#aacad9"
              strokeWidth="6"
            />
            <path
              d="M405 670Q530 595 665 672"
              fill="none"
              stroke="#edfaff66"
              strokeWidth="6"
            />
            <Interactive.Text
              name={i ? "로먼 라벨" : "허블 라벨"}
              x="540"
              y="1110"
              textAnchor="middle"
              fontFamily="Pretendard"
              fontSize="66"
              fontWeight="700"
              style={{
                opacity: interpolate(f, [names[i].from, names[i].settled, names[i].to, names[i].end], [0, 1, 1, 0], fadePhases),
                fill: i ? colors.warm : colors.blue,
              }}
            >
              {i ? "로먼" : "허블"}
            </Interactive.Text>
          </Interactive.G>
        ))}
      </Interactive.Svg>
      <TimedReveal at={timing(story, chapter, "diameter")} rise={14}>
        <Text y={300} size={142}>
          2.4m
        </Text>
      </TimedReveal>
    </>
  );
};
const Camera: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    det = timing(story, chapter, "detectors"),
    join = timing(story, chapter, "join");
  if (f < det.from)
    return (
      <>
        <FullMedia src={asset(story, "editorial/roman-wfi.mp4")} rate={0.4} />
      </>
    );
  return (
    <>
      <Sky />
      <Interactive.Div
        style={{
          position: "absolute",
          left: 165,
          top: 510,
          width: 750,
          height: 900,
          opacity: interpolate(f, [det.to, det.end], [1, 0], leave),
        }}
      >
        {Array.from({ length: 18 }, (_, i) => {
          const col = i % 3,
            row = Math.floor(i / 3);
          return (
            <Interactive.Div
              key={i}
              style={{
                position: "absolute",
                left: col * 250 + interpolate(f, [join.from, join.settled], [16, 0], move) / 2,
                top: row * 150 + interpolate(f, [join.from, join.settled], [16, 0], move) / 2,
                width: 250 - interpolate(f, [join.from, join.settled], [16, 0], move),
                height: 150 - interpolate(f, [join.from, join.settled], [16, 0], move),
                overflow: "hidden",
                opacity: interpolate(f, [det.from, det.from + 8], [0, 1], ease),
                boxShadow: "0 0 0 2px #8bb9d644",
              }}
            >
              <Img
              src={asset(story, "editorial/roman-field.jpg")}
                style={{
                  position: "absolute",
                  width: 750,
                  maxWidth: "none",
                  height: 900,
                  objectFit: "cover",
                  left: -col * 250,
                  top: -row * 150,
                  opacity: interpolate(
                    f,
                    [det.from + i * 1.1, det.from + i * 1.1 + 10],
                    [0.12, 1],
                    ease,
                  ),
                }}
              />
              <Interactive.Div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#6294ac",
                  opacity: interpolate(
                    f,
                    [det.from + i * 1.1, det.from + i * 1.1 + 10],
                    [0.58, 0],
                    ease,
                  ),
                }}
              />
            </Interactive.Div>
          );
        })}
      </Interactive.Div>
      <TimedReveal at={timing(story, chapter, "detector_count")} rise={14}>
        <Text y={290} size={118} color={colors.blue}>
          18개
        </Text>
      </TimedReveal>
    </>
  );
};
const Field: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    expand = timing(story, chapter, "expand");
  return (
    <>
      <AbsoluteFill style={{ background: "#061321" }} />
      <Interactive.Div
        style={{
          position: "absolute",
          left: 90,
          top: 485,
          width: 900,
          height: 900,
          overflow: "hidden",
        }}
      >
        <Img
          src={asset(story, "editorial/roman-field.jpg")}
          style={{ width: 900, height: 900, objectFit: "cover", opacity: 0.17 }}
        />
        <Interactive.Div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 900,
            height: 900,
            clipPath: `inset(${(900 - interpolate(f, [expand.from, expand.settled], [90, 900], move)) / 2}px)`,
          }}
        >
          <Img
            src={asset(story, "editorial/roman-field.jpg")}
            style={{ width: 900, height: 900, objectFit: "cover" }}
          />
        </Interactive.Div>
        <Interactive.Div
          style={{
            position: "absolute",
            left:
              (900 -
                interpolate(
                  f,
                  [expand.from, expand.settled],
                  [90, 900],
                  move,
                )) /
              2,
            top:
              (900 -
                interpolate(
                  f,
                  [expand.from, expand.settled],
                  [90, 900],
                  move,
                )) /
              2,
            width: interpolate(
              f,
              [expand.from, expand.settled],
              [90, 900],
              move,
            ),
            height: interpolate(
              f,
              [expand.from, expand.settled],
              [90, 900],
              move,
            ),
            border: "3px solid #ffcd88",
            boxSizing: "border-box",
          }}
        />
        <Interactive.Div
          style={{
            position: "absolute",
            left: 405,
            top: 405,
            width: 90,
            height: 90,
            border: "4px solid #b2e8ff",
            boxSizing: "border-box",
          }}
        />
      </Interactive.Div>
      <TimedReveal at={timing(story, chapter, "area")} rise={14}>
        <Text y={320} size={116} color={colors.warm}>
          약 100배 면적
        </Text>
      </TimedReveal>
      <TimedReveal at={timing(story, chapter, "hubble_field")}>
        <Interactive.Div
          style={{
            position: "absolute",
            left: 625,
            top: 900,
            fontSize: 44,
            fontWeight: 700,
            textShadow: "0 2px 8px #000,0 0 5px #000",
            color: colors.blue,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: -40,
              top: 33,
              width: 27,
              height: 2,
              background: colors.blue,
            }}
          />
          허블
        </Interactive.Div>
      </TimedReveal>
      <TimedReveal at={timing(story, chapter, "roman_field")}>
        <Interactive.Div
          style={{
            position: "absolute",
            right: 90,
            top: 1398,
            fontSize: 44,
            color: colors.warm,
          }}
        >
          로먼
        </Interactive.Div>
      </TimedReveal>
    </>
  );
};
const Science: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    exp = timing(story, chapter, "expansion_media").from;
  return (
    <>
      {f < exp ? (
        <FullMedia src={asset(story, "editorial/roman-field.jpg")} photo />
      ) : (
        <FullMedia
          src={asset(story, "editorial/roman-dark-energy.mp4")}
          rate={0.6}
        />
      )}
    </>
  );
};
export const Roman: React.FC<SceneProps> = (p) => {
  if (p.chapter.id === "question") return <Question {...p} />;
  if (p.chapter.id === "camera") return <Camera {...p} />;
  if (p.chapter.id === "field") return <Field {...p} />;
  if (p.chapter.id === "science") return <Science {...p} />;
  return (
    <>
      <FullMedia
        src={asset(p.story, "editorial/roman-360.mp4")}
        rate={0.4}
        rotate
      />
    </>
  );
};
