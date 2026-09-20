import {
  AbsoluteFill,
  Img,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Craft, attachment } from "./Craft";
import { timing } from "./timing";
import {
  asset,
  colors,
  cue,
  ease,
  move,
  clamp,
  FullMedia,
  TimedReveal,
  fadePhases,
  SceneProps,
  Sky,
  Text,
} from "./shared";
const Known: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    state = cue(story, chapter, "s03");
  return (
    <>
      <FullMedia
        src={asset(story, "hani_photo2.webp")}
        photo
        position="50% 50%"
        shade={interpolate(f, [state, state + 10], [0, 0.48], ease)}
      />
      {f >= state ? (
        <>
          <TimedReveal at={timing(story, chapter, "article_date")} rise={12}>
            <Text y={465} size={44}>
              2026. 6. 24. 기사 기준
            </Text>
          </TimedReveal>
          <TimedReveal at={timing(story, chapter, "deployed")} rise={14}>
            <Text y={570} size={108} color={colors.mint}>
              배치 확인
            </Text>
          </TimedReveal>
          <TimedReveal at={timing(story, chapter, "unpublished")} rise={14}>
            <Text y={990} size={83}>
              상세 결과 미공개
            </Text>
          </TimedReveal>
        </>
      ) : null}
    </>
  );
};
const Orbit: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    orbit = timing(story, chapter, "orbit"),
    rocket = timing(story, chapter, "rocket");
  return (
    <>
      <Sky />
      <Interactive.Div
        style={{
          position: "absolute",
          left: -70,
          top: 460,
          width: 1220,
          height: 705,
        }}
      >
        <Img
          src={asset(story, "editorial/earth.jpg")}
          style={{
            width: 1220,
            height: 705,
            objectFit: "cover",
            maskImage: "radial-gradient(ellipse,black 35%,transparent 69%)",
          }}
        />
      </Interactive.Div>
      <Interactive.Svg
        name="지구 궤도 도해"
        width={1080}
        height={1920}
        style={{ position: "absolute", inset: 0 }}
      >
        <ellipse
          cx="540"
          cy="800"
          rx="370"
          ry="400"
          fill="none"
          stroke="#91caff"
          strokeWidth="2"
          strokeDasharray="6 14"
        />
        <Interactive.G
          name="궤도 위 로켓"
          style={{
            opacity: interpolate(f, [rocket.from, rocket.settled, rocket.to, rocket.end], [0, 1, 1, 0], fadePhases),
            translate: `${540 + 370 * Math.cos(interpolate(f, [orbit.from, orbit.settled], [-Math.PI / 2, Math.PI * 2.5], clamp))}px ${800 + 400 * Math.sin(interpolate(f, [orbit.from, orbit.settled], [-Math.PI / 2, Math.PI * 2.5], clamp))}px`,
            rotate: `${(interpolate(f, [orbit.from, orbit.settled], [-Math.PI / 2, Math.PI * 2.5], clamp) * 180) / Math.PI + 90}deg`,
          }}
        >
          <rect x="-23" y="0" width="46" height="155" rx="7" fill="#c4ced7" />
          <rect x="-23" y="116" width="46" height="12" fill="#485260" />
          <path d="M-20 155 L-27 174 H27 L20 155" fill="#5c6670" />
          <path
            d="M-60 0 L-53 -25 H53 L60 0Z"
            fill="#e1e5e9"
            stroke="#8cafc2"
            strokeWidth="2"
          />
          <ellipse cx="0" cy="-25" rx="53" ry="10" fill="#acb9c6" />
        </Interactive.G>
      </Interactive.Svg>
      <TimedReveal at={timing(story, chapter, "orbit_count")} rise={12}>
        <Text y={1320} size={94} color={colors.blue}>
          한 바퀴 반
        </Text>
      </TimedReveal>
    </>
  );
};
const Return: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    shield = cue(story, chapter, "s05", "열차폐판이"),
    separate = timing(story, chapter, "separate"),
    canopy = timing(story, chapter, "chute"),
    split = separate.from,
    chute = canopy.from;
  const craftDrop = 130;
  return (
    <>
      <Sky warm />
      <AbsoluteFill
        style={{
          background: "linear-gradient(0deg,#2c738077,transparent 50%)",
          opacity: interpolate(f, [split, split + 28], [0, 1], ease),
        }}
      />
      <Interactive.Svg
        name="재진입 열 도해"
        width={1080}
        height={1920}
        style={{ position: "absolute", inset: 0, opacity: interpolate(f, [0, shield + 5, split, split + 12], [0, 0.85, 0.85, 0], ease) }}
      >
        <defs>
          <radialGradient id="heat-halo">
            <stop stopColor="#ffe4b4" stopOpacity=".6" />
            <stop offset=".35" stopColor="#ff7c2e" stopOpacity=".35" />
            <stop offset="1" stopColor="#de401b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="540" cy="1000" rx="430" ry="175" fill="url(#heat-halo)" />
        {Array.from({ length: 13 }, (_, i) => (
          <path
            key={i}
            d={`M${80 + i * 77} 1350 Q${150 + i * 62} 1140 ${290 + i * 42} 1020`}
            fill="none"
            stroke="#ffb46d"
            strokeWidth={i % 3 === 0 ? 3 : 1}
            opacity=".24"
          />
        ))}
      </Interactive.Svg>
      <Interactive.Div
        style={{
          position: "absolute",
          inset: 0,
          translate: `0px ${f < chute ? interpolate(f, [0, chute], [-150, 70], clamp) : interpolate(f, [chute, chapter.to - chapter.from], [70, 100], ease)}px`,
        }}
      >
        <Interactive.Div
          style={{
            position: "absolute",
            inset: 0,
            translate: `0px ${craftDrop}px`,
          }}
        >
          <Craft
            heat={interpolate(f, [0, shield + 5, split, split + 12], [0, 0.85, 0.85, 0], ease)}
            tilt={interpolate(f, [0, 30], [-0.12, 0], move)}
            scale={f < chute ? 1 : interpolate(f, [chute, chute + 20], [1, 0.77], ease)}
            separation={interpolate(
              f,
              [split, separate.settled],
              [0, 3.4],
              move,
            )}
            plateOpacity={interpolate(f, [chute, chute + 18], [1, 0], ease)}
          />
        </Interactive.Div>
        <Interactive.Svg
          name="낙하산 도해"
          width={1080}
          height={1920}
          style={{ position: "absolute", inset: 0, opacity: interpolate(f, [chute, canopy.settled], [0, 1], ease) }}
        >
          <defs>
            <linearGradient id="fabric">
              <stop stopColor="#c95735" />
              <stop offset=".45" stopColor="#ffebc6" />
              <stop offset=".62" stopColor="#f6d199" />
              <stop offset="1" stopColor="#c65635" />
            </linearGradient>
          </defs>
          <Interactive.G
            name="펼쳐지는 낙하산"
            style={{
              translate: "540px 480px",
              scale: `${interpolate(f, [chute, canopy.settled], [0, 1], ease)} ${0.4 + 0.6 * interpolate(f, [chute, canopy.settled], [0, 1], ease)}`,
            }}
          >
            <path
              d="M-340 0 C-340 -290 340 -290 340 0 Q260 -35 220 0 Q110 -35 0 0 Q-110 -35 -220 0 Q-260 -35 -340 0Z"
              fill="url(#fabric)"
              stroke="#fff0ce"
              strokeWidth="3"
            />
            <path
              d="M-220 0Q-195 -230 0 -220Q190 -230 220 0M0 -220V0"
              fill="none"
              stroke="#fff1d499"
              strokeWidth="3"
            />
          </Interactive.G>
          {[-340, -205, 0, 205, 340].map((x, i) => {
            const [px, py] = attachment(
              [-Math.PI, 2.1, Math.PI / 2, 1.04, 0][i],
              f < chute
                ? 1
                : interpolate(
                    f,
                    [chute, canopy.settled],
                    [1, 0.78],
                    ease,
                  ),
            );
            return (
              <path
                key={x}
                d={`M${540 + x * interpolate(f, [chute, canopy.settled], [0, 1], ease)} 480 L${px} ${py + craftDrop}`}
                stroke="#edf6f5"
                strokeWidth="3"
                fill="none"
              />
            );
          })}
        </Interactive.Svg>
      </Interactive.Div>
      <TimedReveal at={timing(story, chapter, "shield_label")} rise={12}>
        <Text y={1240} size={70}>
          열차폐판
        </Text>
      </TimedReveal>
      <TimedReveal at={timing(story, chapter, "split_label")} rise={12}>
        <Text y={1270} size={68}>
          판 분리
        </Text>
      </TimedReveal>
      <TimedReveal at={timing(story, chapter, "chute_label")} rise={12}>
        <Text y={1285} size={68}>
          낙하산
        </Text>
      </TimedReveal>
    </>
  );
};
const Purpose: React.FC<SceneProps> = ({ story, chapter }) => {
  const f = useCurrentFrame(),
    made = cue(story, chapter, "s08"),
    home = cue(story, chapter, "s08", "배송의");
  if (f >= made && f < home)
    return (
      <>
        <FullMedia
          src={asset(story, "editorial/glovebox.jpg")}
          photo
        />
      </>
    );
  if (f >= home)
    return (
      <>
        <FullMedia
          src={asset(story, "hani_photo1.webp")}
          photo
          position="35% 50%"
        />
      </>
    );
  return (
    <>
      <Sky />
      <Craft scale={0.8} />
      <TimedReveal at={timing(story, chapter, "payload_condition")} rise={12}>
        <Text y={1150} size={50}>
          향후 양산 시
        </Text>
      </TimedReveal>
      <TimedReveal at={timing(story, chapter, "payload")} rise={14}>
        <Text y={1250} size={116} color={colors.mint}>
          최대 1톤
        </Text>
      </TimedReveal>
    </>
  );
};
export const Starfall: React.FC<SceneProps> = (p) => {
  if (p.chapter.id === "identity")
    return (
      <>
        <FullMedia
          src={asset(p.story, "hani_photo1.webp")}
          photo
          position="35% 50%"
        />
      </>
    );
  if (p.chapter.id === "known") return <Known {...p} />;
  if (p.chapter.id === "orbit") return <Orbit {...p} />;
  if (p.chapter.id === "return") return <Return {...p} />;
  return <Purpose {...p} />;
};
