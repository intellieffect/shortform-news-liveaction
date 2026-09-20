import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { ease, move } from "./shared";

const seeds = Array.from({ length: 2600 }, (_, i) => {
  const u = (((Math.sin(i * 127.1 + 17) * 43758.5453) % 1) + 1) % 1;
  const v = (((Math.sin(i * 311.7 + 29) * 13758.215) % 1) + 1) % 1;
  const r = Math.pow(u, 0.58) * 475;
  return {
    r,
    a: v * Math.PI * 2,
    size: i % 37 === 0 ? 3.6 : i % 9 === 0 ? 2.1 : 1.25,
    c: i % 4 === 0 ? "#ffcf94" : "#bce8ff",
  };
});

type Span = { from: number; settled: number };

/** 설명용 별 원반. 궤도나 나선팔 개수를 실측 결과로 제시하지 않는다. */
export const Galaxy: React.FC<{
  tilt?: number;
  tiltFrom?: number;
  tiltTiming?: Span;
  y?: number;
  yFrom?: number;
  yTiming?: Span;
  scale?: number;
  halo?: number;
  haloTiming?: Span;
  axis?: boolean;
  ghost?: boolean;
}> = ({
  tilt = 0,
  tiltFrom = 0,
  tiltTiming,
  y = 810,
  yFrom = 810,
  yTiming,
  scale = 1,
  halo = 0,
  haloTiming,
  axis = false,
  ghost = false,
}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Svg
      name="은하 도해"
      width={1080}
      height={1920}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      <defs>
        <radialGradient id="galaxy-core">
          <stop stopColor="#fff2d8" stopOpacity=".7" />
          <stop offset=".13" stopColor="#eed7ad" stopOpacity=".4" />
          <stop offset=".4" stopColor="#84ceef" stopOpacity=".17" />
          <stop offset="1" stopColor="#61b5e2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="halo-cloud">
          <stop stopColor="#ffd098" stopOpacity="0" />
          <stop offset=".75" stopColor="#ffc074" stopOpacity=".06" />
          <stop offset="1" stopColor="#ffc074" stopOpacity=".18" />
        </radialGradient>
      </defs>
      {halo > 0 || haloTiming ? (
        <Interactive.G
          name="은하 헤일로"
          style={{
            opacity: haloTiming
              ? interpolate(
                  frame,
                  [haloTiming.from, haloTiming.settled],
                  [0, halo],
                  ease,
                )
              : halo,
            translate: yTiming
              ? interpolate(
                  frame,
                  [yTiming.from, yTiming.settled],
                  [`540px ${yFrom}px`, `540px ${y}px`],
                  move,
                )
              : `540px ${y}px`,
          }}
        >
          <ellipse
            rx={500 * scale}
            ry={390 * scale}
            fill="url(#halo-cloud)"
            stroke="#e7b675"
            strokeOpacity=".35"
            strokeWidth="2"
          />
          <Interactive.G
            name="회전하는 헤일로 별"
            style={{ scale: `${scale} ${scale * 0.78}` }}
          >
            <Interactive.G
              name="헤일로 별 회전"
              style={{
                rotate: interpolate(
                  frame,
                  [0, 2000],
                  ["0deg", "68.75493541569878deg"],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  },
                ),
              }}
            >
              {seeds.slice(0, 180).map((p, i) => {
                const radius = i % 10 === 0 ? 3 : 1.8;
                return (
                  <ellipse
                    key={i}
                    cx={Math.cos(p.a) * p.r}
                    cy={Math.sin(p.a) * p.r}
                    rx={radius / scale}
                    ry={radius / (scale * 0.78)}
                    fill="#ffc582"
                    opacity=".7"
                  />
                );
              })}
            </Interactive.G>
          </Interactive.G>
        </Interactive.G>
      ) : null}
      {ghost ? (
        <Interactive.G
          name="이전 회전축"
          style={{
            opacity: 0.22,
            translate: yTiming
              ? interpolate(
                  frame,
                  [yTiming.from, yTiming.settled],
                  [`540px ${yFrom}px`, `540px ${y}px`],
                  move,
                )
              : `540px ${y}px`,
          }}
        >
          <ellipse
            rx={460 * scale}
            ry={175 * scale}
            fill="none"
            stroke="#acd8ea"
            strokeWidth="2"
            strokeDasharray="8 12"
          />
          <path
            d={`M0 ${-355 * scale}V${355 * scale}`}
            stroke="#b3d9e9"
            strokeWidth="3"
            strokeDasharray="8 12"
          />
        </Interactive.G>
      ) : null}
      <Interactive.G
        name="은하 원반 위치"
        style={{
          translate: yTiming
            ? interpolate(
                frame,
                [yTiming.from, yTiming.settled],
                [`540px ${yFrom}px`, `540px ${y}px`],
                move,
              )
            : `540px ${y}px`,
        }}
      >
        <Interactive.G
          name="은하 원반 방향"
          style={{
            rotate: tiltTiming
              ? interpolate(
                  frame,
                  [tiltTiming.from, tiltTiming.settled],
                  [`${tiltFrom}deg`, `${tilt}deg`],
                  move,
                )
              : `${tilt}deg`,
          }}
        >
          <Interactive.G name="은하 원반 크기" style={{ scale }}>
            <ellipse rx="535" ry="220" fill="url(#galaxy-core)" />
            <ellipse rx="270" ry="98" fill="url(#galaxy-core)" />
            <Interactive.G
              name="은하 원반의 납작한 비율"
              style={{ scale: "1 0.365" }}
            >
              <Interactive.G
                name="은하 원반 별 회전"
                style={{
                  rotate: interpolate(
                    frame,
                    [0, 2000],
                    ["0deg", "240.64227395494578deg"],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    },
                  ),
                }}
              >
                {seeds.map((p, i) => (
                  <ellipse
                    key={i}
                    cx={Math.cos(p.a) * p.r}
                    cy={Math.sin(p.a) * p.r + (Math.sin(i * 11) * 7) / 0.365}
                    rx={p.size}
                    ry={p.size / 0.365}
                    fill={p.c}
                    opacity={0.35 + (1 - p.r / 475) * 0.5}
                  />
                ))}
              </Interactive.G>
            </Interactive.G>
            <ellipse rx="48" ry="24" fill="url(#galaxy-core)" />
            {axis ? (
              <Interactive.G
                name="현재 회전축"
                stroke="#fdf4d7"
                strokeWidth="3.5"
              >
                <path d="M0 -355 V355" />
                <path d="M-11 -334 L0 -355 L11 -334" fill="none" />
                <circle r="7" fill="#fff1d0" />
              </Interactive.G>
            ) : null}
          </Interactive.G>
        </Interactive.G>
      </Interactive.G>
      {axis ? (
        <Interactive.G
          name="은하 중심점"
          style={{
            translate: yTiming
              ? interpolate(
                  frame,
                  [yTiming.from, yTiming.settled],
                  [`540px ${yFrom}px`, `540px ${y}px`],
                  move,
                )
              : `540px ${y}px`,
          }}
        >
          <circle r="7" fill="#fff7e5" />
        </Interactive.G>
      ) : null}
    </Interactive.Svg>
  );
};
