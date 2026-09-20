// 9편 «베텔게우스 동반별» — wave_period
import type { Style } from "../../../pilot/types";
import { W, H, type BeatClock } from "../clock";
import { DIAGRAM, Tube } from "../diagram";
import { SPACE_TUBE, durF, type GraphicSpec } from "./contracts";

// ── 9편 도해 1종 (2026-09-04) ────────────────────────────────────────────────
// 나머지 도해는 전부 앞 편 부품 재사용(compare·measure·dot·radius_map·orbit_path).
// 이 편의 신규는 「밝기가 주기로 흔들린다」 하나 — 파형은 자와 컴퍼스로 그릴 수 있다(tier 1).

/** wave_period@1 — 밝기 변화 파형. 곡선이 왼쪽에서 오른쪽으로 그어지고,
 *  마루→마루 브래킷이 「한 주기」를 가리킨다. **수치 라벨은 없다 — 숫자는 자막이 말한다**(rules 9, 복창 금지).
 *  형태는 DIAGRAM 계약 안에서만: 굵기·이징을 새로 만들지 않는다. */
export const WavePeriod: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { cycles?: number; amp_px?: number; w_px?: number; y?: number; draw_sec?: number; bracket?: boolean };
  const cycles = p.cycles ?? 2.25;
  const amp = p.amp_px ?? 110;
  const bw = p.w_px ?? 780;
  const cy = p.y != null ? Math.round(p.y * H) : 760;
  const x0 = (W - bw) / 2;

  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const draw = clock.anim(inF, durF(p.draw_sec ?? 1.4, clock.fps));

  // 파형 — 마루에서 시작해(밝음) 골로 내려간다. 점 60개 폴리라인이면 충분하다.
  const N = 60;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    pts.push([x0 + bw * k, cy - amp * Math.cos(k * cycles * 2 * Math.PI)]);
  }
  const upto = Math.max(2, Math.round(N * draw));
  const d = pts.slice(0, upto + 1).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  // 브래킷: 첫 마루(k=0) → 둘째 마루(k=1/cycles). 곡선이 거기까지 그어진 뒤에 선다.
  const bx0 = x0, bx1 = x0 + bw / cycles;
  const by = cy - amp - 46;
  const bracketOn = p.bracket === false ? 0 : clock.anim(inF + durF((p.draw_sec ?? 1.4) * (1 / cycles) + 0.15, clock.fps), DIAGRAM.fade_f);

  const { colors } = style;
  const head = pts[Math.min(upto, N)];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: appear }}>
      {/* 기준선 — 흐리게. 파형이 무엇에서 벗어나는지의 축 */}
      <line x1={x0} y1={cy} x2={x0 + bw} y2={cy} stroke={colors.text} strokeWidth={DIAGRAM.w.guide} opacity={0.35} />
      <Tube d={d} w={DIAGRAM.w.main} {...SPACE_TUBE} />
      {/* 그리는 머리 = 별의 지금 밝기 — 점이 곡선을 탄다 */}
      <circle cx={head[0]} cy={head[1]} r={9} fill={colors.accent} opacity={draw < 1 ? 1 : 0.9} />
      {/* 한 주기 브래킷 — 마루에서 마루까지 */}
      <g opacity={bracketOn}>
        <line x1={bx0} y1={by} x2={bx1} y2={by} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
        <line x1={bx0} y1={by} x2={bx0} y2={by + 18} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
        <line x1={bx1} y1={by} x2={bx1} y2={by + 18} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
      </g>
    </svg>
  );
};

/** orbit_apsis@1 — 타원 궤도를 도는 점이 **가장 먼 지점**에서 멈추고, 그 자리가 마커로 선다.
 *  「가장 멀리 벌어지는 시점을 계산해」의 동사를 그린다. 라벨·수치 없음(자막이 말한다).
 *  중심 별은 따뜻한 색(적색초거성 자리) — 파란 지구 링을 재사용하지 않는다(4-3R 이슈5). */
export const OrbitApsis: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { cx?: number; y?: number; cy?: number; a_px?: number; b_px?: number; travel_sec?: number; star_r?: number };
  const { colors } = style;
  const cx = p.cx ?? 540;
  const cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 700);
  const A = p.a_px ?? 330, B = p.b_px ?? 205;
  // 중심 별은 타원의 **초점**에 둔다 — 그래야 「가장 먼 지점」이 실제로 존재한다
  const c = Math.sqrt(Math.max(0, A * A - B * B));
  const fx = cx - c, fy = cy;
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  // 근점(초점 가까운 쪽, θ=π)에서 출발해 원점(θ=0)에서 멈춘다 — out-cubic 이라 끝에서 저절로 감속
  const k = clock.anim(inF + Math.round(0.2 * clock.fps), durF(p.travel_sec ?? 1.8, clock.fps));
  const th = Math.PI * (1 - k);
  const px = cx + A * Math.cos(th), py = cy + B * Math.sin(th);
  const apx = cx + A, apy = cy;                       // 최원점
  const markOn = clock.anim(inF + Math.round(((p.travel_sec ?? 1.8) + 0.3) * clock.fps), DIAGRAM.fade_f);
  const d = ellipsePathLocal(cx, cy, A, B);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: appear }}>
      <path d={d} fill="none" stroke={colors.text} strokeWidth={DIAGRAM.w.guide} opacity={0.55} />
      {/* 중심 별 — 따뜻한 색, 초점 위치 */}
      <circle cx={fx} cy={fy} r={p.star_r ?? 16} fill={colors.accent} opacity={0.95} />
      <circle cx={fx} cy={fy} r={(p.star_r ?? 16) * 2.1} fill={colors.accent} opacity={0.18} />
      {/* 도는 점(동반별) */}
      <circle cx={px} cy={py} r={9} fill={colors.text} />
      {/* 최원점 마커 — 도착한 뒤에 선다 */}
      <g opacity={markOn}>
        <circle cx={apx} cy={apy} r={22} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
        <line x1={apx} y1={apy - 34} x2={apx} y2={apy - 52} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
      </g>
    </svg>
  );
};
const ellipsePathLocal = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
