// 7편 «로먼우주망원경» — mirror_match · fov_ratio · cosmic_share
import type { Style } from "../../../pilot/types";
import { W, H, type BeatClock } from "../clock";
import { DIAGRAM, DiagramDefs } from "../diagram";
import { SPACE_TUBE, durF, type GraphicSpec } from "./contracts";

// ── 7편 «로먼우주망원경» 도해 3종 (2026-09-03) ──────────────────────────────────
// 배경이 허블 실사·발사 실사·딥필드라 6편의 슬레이트 계약(SPACE_TUBE)을 그대로 쓴다.
// 형태는 DIAGRAM 계약 안에서만 — 부품 안에서 새 굵기·새 화살촉을 만들지 않는다.

/** mirror_match@1 — **지름이 같다**를 보이는 도해.
 *  single = 원 하나 + 치수선. pair = 두 번째 원이 위에서 내려와 **포개진다**.
 *  나란히 놓지 않는다 — 나란히 두면 「다르다」로 읽힌다(registry rules). */
export const MirrorMatch: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { mode?: "single" | "pair"; d_m: number; who?: string; cx?: number; cy?: number; y?: number; r_px?: number };
  const { colors } = style;
  // y(비율)는 layer43_plan 이 파생한다 — px 를 부품에서 정하지 않는다(R1-05)
  const cx = p.cx ?? 540, cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 780), R = p.r_px ?? 200;
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const pair = p.mode === "pair";
  const k = pair ? clock.anim(inF, durF(0.7, clock.fps)) : 1;
  const drop = pair ? (1 - k) * -190 : 0;         // 두 번째 원이 내려와 앉는다
  const labOn = clock.anim(inF + Math.round(0.35 * clock.fps), DIAGRAM.fade_f);
  const dimY = cy + R + 62;                        // 치수선은 원 아래
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {/* 기준 원 — pair 에서는 앞 비트의 허블 원이 자리를 지킨다.
              **포개면 하나로 보인다**(7편 v2 검토 A3) — pair 일 때 기준 원을 흰 파선으로 그려
              두 번째 원(accent 실선)과 겹쳐도 두 개임이 읽히게 한다 */}
          <circle cx={cx} cy={cy} r={R} fill="rgba(207,227,255,0.06)" stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.sub} />
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={SPACE_TUBE.highlight}
            strokeWidth={pair ? DIAGRAM.w.guide : DIAGRAM.w.sub * DIAGRAM.tube.highlight}
            strokeDasharray={pair ? "26 18" : undefined} opacity={0.95} />
          {pair ? (
            <g transform={`translate(0 ${drop})`} opacity={0.35 + 0.65 * k}>
              <circle cx={cx} cy={cy} r={R} fill={colors.accent} fillOpacity={0.16} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.45} />
            </g>
          ) : null}
          {/* 치수선 — 지름 하나만 */}
          <line x1={cx - R} y1={dimY} x2={cx + R} y2={dimY} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} opacity={labOn} />
          <line x1={cx - R} y1={dimY - 16} x2={cx - R} y2={dimY + 16} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} opacity={labOn} />
          <line x1={cx + R} y1={dimY - 16} x2={cx + R} y2={dimY + 16} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} opacity={labOn} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 80, width: W - 160, top: dimY + 24, textAlign: "center", opacity: labOn }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: pair ? colors.accent : colors.text, textShadow: "0 2px 18px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>
          {p.d_m} m
        </div>
        {p.who ? <div style={{ marginTop: 6, fontSize: 42, fontWeight: 700, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.who}</div> : null}
      </div>
    </div>
  );
};

/** fov_ratio@1 — **면적비**로 그리는 시야 배수. 한 칸에서 격자가 자라 ratio 만큼 칸을 채운다.
 *  작은 사각형은 격자의 한 칸과 **같은 크기**여야 한다 — 다르게 그리면 배수가 거짓이 된다. */
export const FovRatio: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { ratio: number; small_label?: string; big_label?: string; cx?: number; cy?: number; y?: number; unit_px?: number };
  const { colors } = style;
  const side = Math.max(2, Math.round(Math.sqrt(p.ratio)));      // 100 → 10×10
  const u = p.unit_px ?? 62;
  const gw = side * u;
  const cx = p.cx ?? 540, cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 760);
  const x0 = cx - gw / 2, y0 = cy - gw / 2;
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const grow = clock.anim(inF + Math.round(0.25 * clock.fps), durF(1.3, clock.fps));
  const shown = Math.round(grow * side * side);
  const labOn = clock.anim(inF + Math.round(1.1 * clock.fps), DIAGRAM.fade_f);
  const cells = [];
  for (let i = 0; i < side * side; i++) {
    if (i >= shown) break;
    const r = Math.floor(i / side), c = i % side;
    cells.push(<rect key={i} x={x0 + c * u + 2} y={y0 + r * u + 2} width={u - 4} height={u - 4} fill={colors.accent} fillOpacity={0.16} stroke={colors.accent} strokeWidth={2} />);
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {cells}
          {/* 허블 한 칸 — 격자의 첫 칸과 같은 크기, 흰 테두리로 구분 */}
          <rect x={x0 + 2} y={y0 + 2} width={u - 4} height={u - 4} fill="rgba(255,255,255,0.14)" stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} />
          <rect x={x0} y={y0} width={gw} height={gw} fill="none" stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.guide} opacity={0.8} />
        </g>
      </svg>
      {p.small_label ? (
        <div style={{ position: "absolute", left: x0 - 20, top: y0 - 56, fontSize: 38, fontWeight: 800, color: colors.text, textShadow: "0 2px 14px rgba(0,0,0,0.9)", opacity: appear }}>{p.small_label}</div>
      ) : null}
      {p.big_label ? (
        <div style={{ position: "absolute", left: 80, width: W - 160, top: y0 + gw + 34, textAlign: "center", opacity: labOn }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: colors.accent, textShadow: "0 2px 18px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>×{p.ratio}</div>
          <div style={{ marginTop: 4, fontSize: 42, fontWeight: 700, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.big_label}</div>
        </div>
      ) : null}
    </div>
  );
};

/** cosmic_share@1 — 원이 비율만큼 조각으로 갈리고 **지정한 한 조각만** 밝게 남는다.
 *  면적이 비율을 말한다. 세 라벨을 동시에 띄우지 않는다 — 자막과 경쟁한다(rules §5b). */
export const CosmicShare: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { parts: [string, number][]; highlight?: number; cx?: number; cy?: number; y?: number; r_px?: number };
  const { colors } = style;
  const cx = p.cx ?? 540, cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 760), R = p.r_px ?? 270;
  const hi = p.highlight ?? p.parts.length - 1;
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const split = clock.anim(inF + Math.round(0.2 * clock.fps), durF(0.9, clock.fps));
  const focus = clock.anim(inF + Math.round(1.0 * clock.fps), durF(0.6, clock.fps));
  const total = p.parts.reduce((s, x) => s + x[1], 0) || 100;
  const arc = (a0: number, a1: number) => {
    const P = (a: number) => [cx + R * Math.cos(a - Math.PI / 2), cy + R * Math.sin(a - Math.PI / 2)];
    const [sx, sy] = P(a0), [ex, ey] = P(a1);
    return `M${cx} ${cy} L${sx.toFixed(1)} ${sy.toFixed(1)} A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)} Z`;
  };
  let acc = 0;
  const slices = p.parts.map(([, pct], i) => {
    const a0 = (acc / total) * Math.PI * 2, a1 = ((acc + pct) / total) * Math.PI * 2;
    acc += pct;
    const isHi = i === hi;
    const op = isHi ? 1 : 1 - 0.72 * focus;   // 나머지는 물러난다
    return (
      <path key={i} d={arc(a0, a0 + (a1 - a0) * split)}
        fill={isHi ? colors.accent : "rgba(207,227,255,0.10)"} fillOpacity={isHi ? 0.34 + 0.4 * focus : 1}
        stroke={isHi ? colors.accent : SPACE_TUBE.outline} strokeWidth={isHi ? DIAGRAM.w.guide : 3} opacity={op} />
    );
  });
  const labOn = clock.anim(inF + Math.round(1.15 * clock.fps), DIAGRAM.fade_f);
  const hiPart = p.parts[hi];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {slices}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.sub * DIAGRAM.tube.highlight} opacity={0.75} />
        </g>
      </svg>
      {hiPart ? (
        <div style={{ position: "absolute", left: 80, width: W - 160, top: cy + R + 44, textAlign: "center", opacity: labOn }}>
          <div style={{ fontSize: 78, fontWeight: 900, color: colors.accent, textShadow: "0 2px 18px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>{hiPart[1]}%</div>
          <div style={{ marginTop: 4, fontSize: 42, fontWeight: 700, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{hiPart[0]}</div>
        </div>
      ) : null}
    </div>
  );
};
