// 3편 «우주거울» — orbit_deploy · radius_map
import type { Style } from "../../../pilot/types";
import { type BeatClock } from "../clock";
import { type GraphicSpec } from "./contracts";

// ── 3편 «우주거울» 2026-08-30: 실물이 없는 대상(위성·조명 범위)을 코드 도해로 ─────────────────
// orbit_deploy@1 — 지구 호 + 고도 눈금선이 625km까지 오르고, 궤도 위 거울이 접힌 상태에서 18m 정사각형으로 펼쳐진다.
// 남는 글자는 "625km"·"18m"뿐(facts #7·#9). 실물처럼 보이지 않는 선 도해 — shot.label_overlay 로 '도해' 표기.
export const OrbitDeploy: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    center?: { x: number; y: number }; earth_r?: number; alt_px?: number; alt_label?: string; alt_in?: number; alt_sec?: number;
    mirror_label?: string; mirror_in?: number; unfold_sec?: number; mirror_size?: number; sat_angle?: number; earth_fill?: number; earth_rim?: number; // earth_fill/rim: 지구 면·림 불투명도 — 자막 밴드(0.66~)와 겹칠 때 낮춘다 (사용자 2026-08-30 b04)
  };
  const { colors } = style;
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 2150; // 지구 중심은 프레임 아래(호만 보인다)
  const R = p.earth_r ?? 1450, alt = p.alt_px ?? 520;
  const appear = clock.anim(inF, 10);
  const altProg = clock.anim(Math.round((p.alt_in ?? 0.4) * clock.fps), Math.round((p.alt_sec ?? 0.9) * clock.fps));
  const unfold = clock.anim(Math.round((p.mirror_in ?? 2.0) * clock.fps), Math.round((p.unfold_sec ?? 1.2) * clock.fps));
  const ang = ((p.sat_angle ?? -90) * Math.PI) / 180;
  const sx = cx + Math.cos(ang) * (R + alt), sy = cy + Math.sin(ang) * (R + alt); // 위성(거울) 위치
  const gx = cx + Math.cos(ang) * R, gy = cy + Math.sin(ang) * R; // 지표 접점
  const tx = gx + (sx - gx) * altProg, ty = gy + (sy - gy) * altProg; // 눈금선 끝
  const size = (p.mirror_size ?? 300) * (0.12 + 0.88 * unfold);
  const labelIn = (sec: number) => clock.anim(Math.round(sec * clock.fps), 8);
  const altLabelOp = labelIn((p.alt_in ?? 0.4) + (p.alt_sec ?? 0.9) * 0.6);
  const mirLabelOp = labelIn((p.mirror_in ?? 2.0) + (p.unfold_sec ?? 1.2) * 0.7);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="od_earth" cx="50%" cy="50%" r="50%">
            <stop offset="90%" stopColor={`rgba(60,110,180,${p.earth_fill ?? 0.35})`} />
            <stop offset="100%" stopColor={`rgba(120,180,255,${p.earth_rim ?? 0.9})`} />
          </radialGradient>
        </defs>
        {/* 지구 호 */}
        <circle cx={cx} cy={cy} r={R} fill="url(#od_earth)" stroke={colors.text} strokeOpacity={0.55} strokeWidth={3} />
        {/* 궤도(점선) */}
        <circle cx={cx} cy={cy} r={R + alt} fill="none" stroke={colors.text} strokeOpacity={0.35 * altProg} strokeWidth={2} strokeDasharray="10 14" />
        {/* 고도 눈금선 */}
        <line x1={gx} y1={gy} x2={tx} y2={ty} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" />
        <line x1={gx - 22} y1={gy} x2={gx + 22} y2={gy} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" />
        {altProg > 0.98 ? <line x1={sx - 22} y1={sy} x2={sx + 22} y2={sy} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" /> : null}
        {/* 거울: 정사각형 + 대각 지지대(상상도의 구조를 선으로만) */}
        <g transform={`translate(${sx} ${sy}) rotate(-18)`} opacity={altProg}>
          <rect x={-size / 2} y={-size / 2} width={size} height={size} fill="rgba(200,225,255,0.18)" stroke={colors.text} strokeWidth={3} />
          <line x1={-size / 2} y1={-size / 2} x2={size / 2} y2={size / 2} stroke={colors.text} strokeOpacity={0.7} strokeWidth={2} />
          <line x1={size / 2} y1={-size / 2} x2={-size / 2} y2={size / 2} stroke={colors.text} strokeOpacity={0.7} strokeWidth={2} />
          <circle cx={0} cy={0} r={9} fill={colors.accent} />
        </g>
        {/* 18m 치수선(펼쳐진 뒤) — 거울 오른쪽 세로 치수 */}
        <g opacity={mirLabelOp}>
          <line x1={sx + size / 2 + 40} y1={sy - size / 2} x2={sx + size / 2 + 40} y2={sy + size / 2} stroke={colors.accent} strokeWidth={3} />
          <line x1={sx + size / 2 + 28} y1={sy - size / 2} x2={sx + size / 2 + 52} y2={sy - size / 2} stroke={colors.accent} strokeWidth={3} />
          <line x1={sx + size / 2 + 28} y1={sy + size / 2} x2={sx + size / 2 + 52} y2={sy + size / 2} stroke={colors.accent} strokeWidth={3} />
        </g>
      </svg>
      {p.alt_label ? (
        <div style={{ position: "absolute", right: 1080 - ((gx + sx) / 2 - 28), top: (gy + sy) / 2 - 30, fontSize: 60, fontWeight: 900, color: colors.accent, opacity: altLabelOp, textShadow: "0 2px 16px rgba(0,0,0,0.8)", fontVariantNumeric: "tabular-nums" }}>
          {p.alt_label}
        </div>
      ) : null}
      {p.mirror_label ? (
        <div style={{ position: "absolute", left: sx + size / 2 + 70, top: sy - 36, fontSize: 60, fontWeight: 900, color: colors.accent, opacity: mirLabelOp, textShadow: "0 2px 16px rgba(0,0,0,0.8)", fontVariantNumeric: "tabular-nums" }}>
          {p.mirror_label}
        </div>
      ) : null}
    </div>
  );
};

// radius_map@1 — 조명 범위: 배경(도시 항공) 위에 지름 4.8km 원이 자라고, 뒤 비트에서 '서울 사대문 안' 윤곽이 원 안에 들어온다.
// 실측 지도가 아니라 개념도(facts #11) — shot.label_overlay '개념도' 필수. 남는 글자는 "4.8km"·윤곽 이름뿐.
const SEOUL_4GATES_KM: [number, number][] = [[-1.9, 0.3], [-1.5, 1.15], [-0.4, 1.4], [0.9, 1.3], [1.75, 0.85], [1.95, -0.1], [1.4, -1.0], [0.2, -1.3], [-1.1, -1.15], [-1.85, -0.5]];
export const RadiusMap: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    center?: { x: number; y: number }; radius_px?: number; radius_km?: number; radius_in?: number; grow_sec?: number; label?: string;
    outline?: "seoul_4gates" | null; outline_in?: number; outline_label?: string; outline_done?: boolean;
  };
  const { colors } = style;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 820;
  const Rpx = p.radius_px ?? 380, Rkm = p.radius_km ?? 2.4;
  const kmToPx = Rpx / Rkm;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), 8);
  const grow = clock.anim(Math.round((p.radius_in ?? 0) * clock.fps), Math.round((p.grow_sec ?? 0.9) * clock.fps));
  const r = Rpx * grow;
  const labelOp = clock.anim(Math.round(((p.radius_in ?? 0) + (p.grow_sec ?? 0.9) * 0.7) * clock.fps), 8);
  const outOp = p.outline ? (p.outline_done ? 1 : clock.anim(Math.round((p.outline_in ?? 0) * clock.fps), 14)) : 0;
  const pts = p.outline === "seoul_4gates" ? SEOUL_4GATES_KM.map(([kx, ky]) => [cx + kx * kmToPx, cy - ky * kmToPx]) : [];
  const path = pts.length ? pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ") + " Z" : "";
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="rgba(255,209,102,0.16)" stroke={colors.accent} strokeWidth={5} />
        <circle cx={cx} cy={cy} r={Math.max(0, r - 14)} fill="none" stroke={colors.accent} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 12" />
        {/* 지름 치수선 — label 이 있을 때만(치수를 말할 때만 잰다. 9편 P7: label:null 인데 점선이 남았다) */}
        <g opacity={p.label ? labelOp : 0}>
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={colors.accent} strokeWidth={3} strokeDasharray="14 10" />
          <line x1={cx - r} y1={cy - 16} x2={cx - r} y2={cy + 16} stroke={colors.accent} strokeWidth={4} />
          <line x1={cx + r} y1={cy - 16} x2={cx + r} y2={cy + 16} stroke={colors.accent} strokeWidth={4} />
        </g>
        {path ? (
          <g opacity={outOp}>
            <path d={path} fill="rgba(255,255,255,0.10)" stroke={colors.text} strokeWidth={4} strokeLinejoin="round" />
            {pts.filter((_, i) => i % 3 === 0).map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={7} fill={colors.text} />)}
          </g>
        ) : null}
      </svg>
      {p.label ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: cy - r - 100, textAlign: "center", fontSize: 72, fontWeight: 900, color: colors.accent, opacity: labelOp, textShadow: "0 2px 16px rgba(0,0,0,0.8)", fontVariantNumeric: "tabular-nums" }}>
          {p.label}
        </div>
      ) : null}
      {p.outline_label ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: cy + 22, textAlign: "center", fontSize: 48, fontWeight: 800, color: colors.text, opacity: outOp, textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
          {p.outline_label}
        </div>
      ) : null}
    </div>
  );
};
