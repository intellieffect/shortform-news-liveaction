import React from "react";

/**
 * 도해 형태 계약 + 공용 필터 (5편 2026-09-01).
 *
 * 왜: 색 계약(BRIGHT_TUBE)은 있었는데 **형태 계약이 없었다.** strokeWidth 실측이 4·2·3·5·7·2.5·6·16·11·8·6.4·4.5…
 * 로 흩어져 있어 부품마다 굵기·화살촉·라벨·이징이 제각각이었다 — 4편과 5편 도해를 나란히 놓으면 다른 손이 그린 것 같다.
 * 여기 있는 것만 쓴다. 부품 안에서 새 숫자를 만들지 않는다.
 */
export const DIAGRAM = {
  /** 선 굵기 3단계 (1080 폭 기준). 한 도해에 main 은 하나 */
  w: { main: 26, sub: 18, guide: 7 },
  /** 3겹 튜브 비율 — 테두리(1.0) : 코어 : 하이라이트 */
  tube: { core: 0.72, highlight: 0.26 },
  /** 화살촉 — 선 굵기의 배수 */
  arrow: { head: 2.4, spread: 0.8 },
  /** 등장 프레임 수 */
  fade_f: 10,
} as const;

/** 공용 필터 defs — 도해 SVG 안에 한 번 두고 filter="url(#dg_lift)" 등으로 참조 */
export const DiagramDefs: React.FC = () => (
  <defs>
    {/* dg_lift — 배경에서 떼어낸다. 3겹 아웃라인이 못 하는 '떠 있음'을 그림자가 만든다 */}
    <filter id="dg_lift" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="7" stdDeviation="11" floodColor="#05070C" floodOpacity="0.62" />
    </filter>
    {/* dg_organic — feTurbulence 로 선을 아주 조금 흔든다. 수학적으로 완벽한 곡선이 '컴퓨터가 그린 티'의 정체다 */}
    <filter id="dg_organic" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.010" numOctaves={2} seed={7} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={5.5} xChannelSelector="R" yChannelSelector="G" result="d" />
      <feDropShadow in="d" dx="0" dy="7" stdDeviation="11" floodColor="#05070C" floodOpacity="0.62" />
    </filter>
    {/* dg_glow — 섬광·강조에 */}
    <filter id="dg_glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="14" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
);

/** 3겹 튜브 — 모든 도해의 선은 이걸로 그린다 (테두리 → 코어 → 하이라이트) */
export const Tube: React.FC<{
  d: string; w?: number; outline: string; core: string; highlight: string; opacity?: number;
}> = ({ d, w = DIAGRAM.w.sub, outline, core, highlight, opacity = 1 }) => (
  <>
    <path d={d} fill="none" stroke={outline} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
    <path d={d} fill="none" stroke={core} strokeWidth={w * DIAGRAM.tube.core} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
    <path d={d} fill="none" stroke={highlight} strokeWidth={w * DIAGRAM.tube.highlight} strokeLinecap="round" strokeLinejoin="round" opacity={0.95 * opacity} />
  </>
);

/** 화살표 — 규격 하나. 길이·색만 받는다 */
export const Arrow: React.FC<{
  x: number; y: number; dx: number; dy: number; color: string; w?: number; opacity?: number;
}> = ({ x, y, dx, dy, color, w = DIAGRAM.w.guide, opacity = 1 }) => {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const hl = w * DIAGRAM.arrow.head, hw = hl * DIAGRAM.arrow.spread;
  const tipX = x + dx, tipY = y + dy;
  const bX = tipX - ux * hl, bY = tipY - uy * hl;
  return (
    <g opacity={Math.max(0, Math.min(1, opacity))}>
      <line x1={x} y1={y} x2={bX} y2={bY} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <path d={`M${tipX} ${tipY} L${bX - uy * hw} ${bY + ux * hw} L${bX + uy * hw} ${bY - ux * hw} Z`} fill={color} />
    </g>
  );
};
