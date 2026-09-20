// 4편 «우주택배» — globe_arc · orbit_path · disc_dims · capsule_section · nosignal · motion_clip
import { Video } from "@remotion/media";
import { usePilotFile } from "../../../pilot/pilot";
import type { Style } from "../../../pilot/types";
import { W, H, type BeatClock } from "../clock";
import { rand, type GraphicSpec } from "./contracts";

// ── 4편 «우주택배» 2026-08-30~31: 스타폴(특정 실물, 생성 금지)의 제원·궤도·구조를 코드 도해로 ─────────
// globe_arc@1 — 지구 림 위 두 지점을 잇는 아크가 낱말 시각에 그어지고 끝점이 맥동한다. 글자 없음('1시간'은 자막 팝).
export const GlobeArc: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { earth_center?: { x: number; y: number }; earth_r?: number; arc_h?: number; arc_in?: number; arc_sec?: number; end_in?: number; partial?: number; flat?: { x1: number; x2: number; y: number } };
  const { colors } = style;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), 8);
  const cx = p.earth_center?.x ?? 540, cy = p.earth_center?.y ?? 1560, R = p.earth_r ?? 900;
  const arcH = p.arc_h ?? 520;
  const partial = p.partial ?? 1;
  const a1 = (-158 * Math.PI) / 180, a2 = (-22 * Math.PI) / 180; // 림 위 두 지점(왼쪽 → 오른쪽)
  // flat 모드: 림 원 없이 지정 y 의 하단 아크만 — 배경 피사체(예: 공중투하 상자)와의 관통 회피 (4편 b17, 2026-08-31)
  const x1 = p.flat ? p.flat.x1 : cx + Math.cos(a1) * R, y1 = p.flat ? p.flat.y : cy + Math.sin(a1) * R;
  const x2 = p.flat ? p.flat.x2 : cx + Math.cos(a2) * R, y2 = p.flat ? p.flat.y : cy + Math.sin(a2) * R;
  const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - arcH; // 정점
  const prog = clock.anim(Math.round((p.arc_in ?? 0) * clock.fps), Math.round((p.arc_sec ?? 1.2) * clock.fps)) * partial;
  // 끝점: 베지어 t=prog 위치
  const bez = (t: number) => ({ x: (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2, y: (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2 });
  const tip = bez(prog);
  const endOn = clock.anim(Math.round((p.end_in ?? 0) * clock.fps), 8);
  const pulse = clock.textAnim ? 0.6 + 0.4 * Math.abs(Math.sin((clock.localFrame / clock.fps) * Math.PI * 1.6)) : 1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {/* 지구 림(지형 없음 — facts #23). flat 모드에선 생략 */}
        {p.flat ? null : <circle cx={cx} cy={cy} r={R} fill="rgba(60,110,180,0.10)" stroke="rgba(150,200,255,0.55)" strokeWidth={3} />}
        {/* 출발점 */}
        <circle cx={x1} cy={y1} r={10} fill={colors.text} opacity={0.9} />
        {/* 아크 — pathLength=1 로 진행도 그리기 */}
        <path d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} fill="none" stroke={colors.accent} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - prog} opacity={0.95} />
        {/* 진행 끝점 + 맥동 */}
        {prog > 0.01 ? <circle cx={tip.x} cy={tip.y} r={11} fill={colors.accent} /> : null}
        {prog > 0.01 && endOn > 0 ? <circle cx={tip.x} cy={tip.y} r={11 + 22 * pulse} fill="none" stroke={colors.accent} strokeWidth={3} opacity={endOn * (1 - 0.6 * pulse)} /> : null}
      </svg>
    </div>
  );
};

// orbit_path@1 — 지구 원 + 저궤도 1.5바퀴(위성 점이 돌며 궤적을 남김) → 재진입 → 착수(1,300km 눈금 + 물결). '계획 경로 · 축척 아님' sub 는 부품이 그린다(facts #9·#10 가드레일).
export const OrbitPath: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { phase?: "orbit" | "descent"; center?: { x: number; y: number }; earth_r?: number; orbit_r?: number; laps?: number; orbit_in?: number; lap_sec?: number; reentry_in?: number; distance_label?: string; distance_in?: number; splash_in?: number; label?: string };
  const { colors } = style;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), 8);
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 900, Re = p.earth_r ?? 230, Ro = p.orbit_r ?? 310;
  const laps = p.laps ?? 1.5;
  const descent = p.phase === "descent";
  const start = -90; // 위성 출발각(위)
  const orbitProg = descent ? 1 : clock.anim(Math.round((p.orbit_in ?? 1.5) * clock.fps), Math.round((p.lap_sec ?? 1.5) * laps * clock.fps));
  const ang = ((start + 360 * laps * orbitProg) * Math.PI) / 180;
  const sx = cx + Math.cos(ang) * Ro, sy = cy + Math.sin(ang) * Ro;
  const reentryOn = clock.anim(Math.round((p.reentry_in ?? 99) * clock.fps), 10);
  // descent: 재진입점(궤도 오른쪽 45°)에서 착수점으로 내려가는 곡선
  const rx = cx + Math.cos((-45 * Math.PI) / 180) * Ro, ry = cy + Math.sin((-45 * Math.PI) / 180) * Ro;
  const spx = cx + 330, spy = cy + 360; // 착수점(우하) — 자막 밴드(0.66) 위에서 끝난다
  const dProg = descent ? clock.anim(0, Math.round(1.0 * clock.fps)) : 0;
  const splashOn = clock.anim(Math.round((p.splash_in ?? 99) * clock.fps), 10);
  const distOn = clock.anim(Math.round((p.distance_in ?? 99) * clock.fps), 8);
  const ripple = clock.textAnim ? (clock.localFrame / clock.fps) % 1.2 : 0.5;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={Re} fill="rgba(60,110,180,0.14)" stroke="rgba(150,200,255,0.6)" strokeWidth={3} />
        <circle cx={cx} cy={cy} r={Ro} fill="none" stroke={colors.text} strokeOpacity={descent ? 0.28 : 0.35} strokeWidth={2} strokeDasharray="9 13" />
        {!descent ? (
          <>
            {/* 궤적(현재 랩) + 위성 점 — 1.5바퀴는 점이 돌아온 뒤 반 바퀴 더 도는 것으로 표현 */}
            <circle cx={cx} cy={cy} r={Ro} fill="none" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, laps * orbitProg)} transform={`rotate(${start} ${cx} ${cy})`} opacity={0.9} />
            {orbitProg > 0.005 ? <circle cx={sx} cy={sy} r={10} fill={colors.accent} /> : null}
            {reentryOn > 0 ? <path d={`M${rx} ${ry} q 60 90 40 190`} fill="none" stroke={colors.accent} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - reentryOn} /> : null}
          </>
        ) : (
          <>
            <circle cx={cx} cy={cy} r={Ro} fill="none" stroke={colors.accent} strokeWidth={4} opacity={0.5} transform={`rotate(${start} ${cx} ${cy})`} />
            {/* 하강 곡선 → 착수점 */}
            <path d={`M${rx} ${ry} Q ${rx + 210} ${ry + 260} ${spx} ${spy}`} fill="none" stroke={colors.accent} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - dProg} />
            {/* 서부 해안 기준점(왼쪽) ↔ 착수점 거리 눈금 */}
            <g opacity={distOn}>
              <line x1={cx - 300} y1={spy - 150} x2={spx} y2={spy - 150} stroke={colors.text} strokeWidth={3} strokeDasharray="12 10" />
              <line x1={cx - 300} y1={spy - 166} x2={cx - 300} y2={spy - 134} stroke={colors.text} strokeWidth={4} />
              <line x1={spx} y1={spy - 166} x2={spx} y2={spy - 134} stroke={colors.text} strokeWidth={4} />
            </g>
            {/* 착수 물결 */}
            {splashOn > 0 ? (
              <g opacity={splashOn}>
                <circle cx={spx} cy={spy} r={10} fill={colors.accent} />
                <circle cx={spx} cy={spy} r={16 + 44 * ripple} fill="none" stroke={colors.accent} strokeWidth={3} opacity={Math.max(0, 0.9 - ripple)} />
                <circle cx={spx} cy={spy} r={16 + 44 * Math.max(0, ripple - 0.4)} fill="none" stroke={colors.accent} strokeWidth={2} opacity={Math.max(0, 0.7 - ripple)} />
              </g>
            ) : null}
          </>
        )}
      </svg>
      {descent && p.distance_label ? (
        <div style={{ position: "absolute", left: cx - 300, width: spx - (cx - 300), top: spy - 232, textAlign: "center", fontSize: 54, fontWeight: 900, color: colors.text, opacity: distOn, textShadow: "0 2px 16px rgba(0,0,0,0.85)", fontVariantNumeric: "tabular-nums" }}>
          {p.distance_label}
        </div>
      ) : null}
      {p.label ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: cy - Ro - 96, textAlign: "center", fontSize: 40, fontWeight: 700, color: colors.text, opacity: 0.85 * appear, textShadow: "0 2px 14px rgba(0,0,0,0.85)" }}>{p.label}</div>
      ) : null}
    </div>
  );
};

// disc_dims@1 — 세로 원통 실루엣이 납작한 원반(3.1 : 0.75 비례)으로 눌리고 치수선이 낱말 시각에 붙는다. 글자는 치수뿐(facts #14).
export const DiscDims: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { phase?: "squash" | "flat"; center?: { x: number; y: number }; width?: number; tall_in?: number; squash_in?: number; dia_label?: string; dia_in?: number; height_label?: string; height_in?: number };
  const { colors } = style;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 800, Wd = p.width ?? 460;
  const flat = p.phase === "flat";
  const appear = clock.anim(Math.round(((flat ? 0 : (p.tall_in ?? 0.6))) * clock.fps), 10);
  const sq = flat ? 1 : clock.anim(Math.round((p.squash_in ?? 2.1) * clock.fps), Math.round(0.8 * clock.fps));
  // 원통(세로) → 원반: 폭 150→Wd, 높이 430→Wd*0.242 (3.1:0.75)
  const w = 150 + (Wd - 150) * sq;
  const h = 430 + (Wd * 0.242 - 430) * sq;
  const ry = Math.min(w * 0.16, 40);
  const diaOn = clock.anim(Math.round((p.dia_in ?? 99) * clock.fps), 8);
  const heiOn = clock.anim(Math.round((p.height_in ?? 99) * clock.fps), 8);
  const top = cy - h / 2, bot = cy + h / 2, left = cx - w / 2, right = cx + w / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {/* 몸통(측면) — 실물처럼 보이지 않는 선 도해 */}
        <rect x={left} y={top} width={w} height={h} rx={ry} fill="rgba(200,225,255,0.10)" stroke={colors.text} strokeWidth={3.5} />
        <ellipse cx={cx} cy={top + ry * 0.9} rx={w / 2 - 4} ry={ry * 0.8} fill="none" stroke={colors.text} strokeOpacity={0.5} strokeWidth={2} />
        {/* 지름 치수선(아래) */}
        <g opacity={diaOn}>
          <line x1={left} y1={bot + 46} x2={right} y2={bot + 46} stroke={colors.accent} strokeWidth={4} />
          <line x1={left} y1={bot + 32} x2={left} y2={bot + 60} stroke={colors.accent} strokeWidth={4} />
          <line x1={right} y1={bot + 32} x2={right} y2={bot + 60} stroke={colors.accent} strokeWidth={4} />
        </g>
        {/* 높이 치수선(오른쪽) */}
        <g opacity={heiOn}>
          <line x1={right + 44} y1={top} x2={right + 44} y2={bot} stroke={colors.accent} strokeWidth={4} />
          <line x1={right + 30} y1={top} x2={right + 58} y2={top} stroke={colors.accent} strokeWidth={4} />
          <line x1={right + 30} y1={bot} x2={right + 58} y2={bot} stroke={colors.accent} strokeWidth={4} />
        </g>
      </svg>
      {p.dia_label ? (
        <div style={{ position: "absolute", left: cx - 200, width: 400, top: bot + 70, textAlign: "center", fontSize: 58, fontWeight: 900, color: colors.accent, opacity: diaOn, textShadow: "0 2px 16px rgba(0,0,0,0.85)", fontVariantNumeric: "tabular-nums" }}>{p.dia_label}</div>
      ) : null}
      {p.height_label ? (
        <div style={{ position: "absolute", left: right + 70, top: cy - 34, fontSize: 58, fontWeight: 900, color: colors.accent, opacity: heiOn, textShadow: "0 2px 16px rgba(0,0,0,0.85)", fontVariantNumeric: "tabular-nums" }}>{p.height_label}</div>
      ) : null}
    </div>
  );
};

// capsule_section@1 v2 — 상판+방열판 2층 단면(면·셰이딩) → 냉가스 제트 → 방열판 분리(잔상) → 낙하산. facts #18·#19·#20.
// v2(2026-08-31, 사용자 "도해 어설픔" + input 판정): 슬레이트 면 셰이딩(무텍스처 개념 도해) · 분사 = 백색 냉가스 제트(facts 정정 — 질소 냉가스, 화염 금지) ·
// 방열판 열 표현은 하단 에지 글로우만(#E85D2B, 채널 노랑과 분리) · 요소→라벨 리더선 · 전개 easeOutBack.
const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; const x = t - 1; return 1 + c3 * x * x * x + c1 * x * x; };
export const CapsuleSection: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { phase?: "thrusters" | "separate"; center?: { x: number; y: number }; width?: number; plate_label?: string; shield_label?: string; labels_in?: number; thruster_label?: string; thruster_in?: number; separate_in?: number; chute_in?: number };
  const { colors } = style;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 760, Wd = p.width ?? 420;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), 10);
  const labOn = clock.anim(Math.round((p.labels_in ?? 0) * clock.fps + 6), 8);
  const thrOn = p.phase === "thrusters" ? clock.anim(Math.round((p.thruster_in ?? 99) * clock.fps), 8) : 0;
  const sep = p.phase === "separate" ? clock.anim(Math.round((p.separate_in ?? 99) * clock.fps), Math.round(0.7 * clock.fps)) : 0;
  const chuteLin = p.phase === "separate" ? clock.lin(Math.round((p.chute_in ?? 99) * clock.fps), Math.round(0.8 * clock.fps), 0, 1) : 0;
  const chute = chuteLin > 0 ? easeOutBack(chuteLin) : 0;
  const plateH = Wd * 0.14, lipH = plateH * 0.34;
  const left = cx - Wd / 2, right = cx + Wd / 2;
  const plateY = cy - plateH;
  const shieldY = cy + 4 + sep * 300;
  const shieldDepth = Wd * 0.24;
  const t = clock.textAnim ? clock.localFrame / clock.fps : 1;
  const jet = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 4));
  const chTop = plateY - (250 + 90 * chute) * chute;
  const chW = 210 * chute;
  const SL = "#3E4C5A", SD = "#242E38", SB = "#1B232B"; // 슬레이트 셰이딩(무텍스처 — input 판정 조건)
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="cs_heat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="55%" stopColor="rgba(232,93,43,0)" />
            <stop offset="100%" stopColor="rgba(232,93,43,0.55)" />
          </linearGradient>
        </defs>
        {/* 상판(Top Plate): 상면 밝은 타원 + 옆면 어두운 띠 — 두께감 */}
        <path d={`M${left + 26} ${plateY} L${right - 26} ${plateY} L${right} ${cy} L${left} ${cy} Z`} fill={SD} stroke={colors.text} strokeOpacity={0.85} strokeWidth={2.5} />
        <ellipse cx={cx} cy={plateY + 3} rx={Wd / 2 - 28} ry={lipH} fill={SL} stroke={colors.text} strokeOpacity={0.6} strokeWidth={2} />
        {/* 방열판(Heat Shield): 곡면 + 하단 에지 열 글로우(냉가스 분사와 무관 — 재진입 열) */}
        <g opacity={1 - 0.25 * sep} transform={`translate(0 ${shieldY - cy - 4})`}>
          <path d={`M${left} ${cy + 4} L${right} ${cy + 4} Q ${cx} ${cy + 4 + shieldDepth * 2.1} ${left} ${cy + 4} Z`} fill={SB} stroke={colors.text} strokeOpacity={0.85} strokeWidth={2.5} />
          <path d={`M${left} ${cy + 4} L${right} ${cy + 4} Q ${cx} ${cy + 4 + shieldDepth * 2.1} ${left} ${cy + 4} Z`} fill="url(#cs_heat)" />
        </g>
        {/* 분리 잔상 + 간격 점선 */}
        {sep > 0.02 ? (
          <>
            <path d={`M${left} ${cy + 4} L${right} ${cy + 4} Q ${cx} ${cy + 4 + shieldDepth * 2.1} ${left} ${cy + 4} Z`} fill="none" stroke={colors.text} strokeOpacity={0.18} strokeWidth={2} strokeDasharray="6 8" />
            <line x1={cx} y1={cy + 10} x2={cx} y2={shieldY + 2} stroke={colors.text} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="4 8" />
          </>
        ) : null}
        {/* 냉가스 제트(질소 — facts 정정 2026-08-31): 백색 반투명 펄스, 화염·주황 금지 */}
        {p.phase === "thrusters" ? (
          <g opacity={thrOn}>
            {[left + 64, right - 64].map((tx, i) => {
              const dir = i === 0 ? -1 : 1;
              return (
                <g key={i}>
                  <rect x={tx - 13} y={plateY - lipH - 24} width={26} height={20} rx={3} fill={SD} stroke={colors.text} strokeOpacity={0.8} strokeWidth={2} />
                  {[0, 1, 2].map((k) => (
                    <ellipse key={k} cx={tx + dir * (30 + k * 26) * jet} cy={plateY - lipH - 34 - (18 + k * 15) * jet} rx={13 - k * 3} ry={8 - k * 2}
                      fill="#DCE8F2" opacity={(0.5 - k * 0.14) * jet} />
                  ))}
                </g>
              );
            })}
          </g>
        ) : null}
        {/* 낙하산: 캐노피 3분할 곡면 + 산줄 4가닥, easeOutBack 전개 */}
        {chute > 0.02 ? (
          <g opacity={Math.min(1, chuteLin * 1.6)}>
            <path d={`M${cx - chW} ${chTop} Q ${cx} ${chTop - 190 * chute} ${cx + chW} ${chTop} Q ${cx} ${chTop + 34 * chute} ${cx - chW} ${chTop} Z`} fill={SL} stroke={colors.text} strokeOpacity={0.85} strokeWidth={2.5} />
            <path d={`M${cx - chW * 0.5} ${chTop - 66 * chute} Q ${cx - chW * 0.25} ${chTop + 8 * chute} ${cx - chW * 0.36} ${chTop + 12 * chute}`} fill="none" stroke={colors.text} strokeOpacity={0.4} strokeWidth={2} />
            <path d={`M${cx + chW * 0.5} ${chTop - 66 * chute} Q ${cx + chW * 0.25} ${chTop + 8 * chute} ${cx + chW * 0.36} ${chTop + 12 * chute}`} fill="none" stroke={colors.text} strokeOpacity={0.4} strokeWidth={2} />
            {[-0.9, -0.35, 0.35, 0.9].map((k, i) => (
              <line key={i} x1={cx + chW * k} y1={chTop + (k === -0.9 || k === 0.9 ? 6 : 10) * chute} x2={cx + 60 * k * 0.4} y2={plateY - 6} stroke={colors.text} strokeOpacity={0.7} strokeWidth={2} />
            ))}
          </g>
        ) : null}
        {/* 요소→라벨 리더선 */}
        <g opacity={labOn}>
          <line x1={right - 20} y1={plateY + (cy - plateY) / 2} x2={right + 18} y2={plateY - 4} stroke={colors.text} strokeOpacity={0.5} strokeWidth={2} />
          <line x1={cx + Wd * 0.28} y1={shieldY + shieldDepth * 0.9} x2={right + 18} y2={shieldY + 34} stroke={colors.accent} strokeOpacity={0.5} strokeWidth={2} />
        </g>
      </svg>
      {p.plate_label ? <div style={{ position: "absolute", left: right + 24, top: plateY - 10, fontSize: 38, fontWeight: 800, color: colors.text, opacity: labOn, textShadow: "0 2px 14px rgba(0,0,0,0.9)", whiteSpace: "nowrap" }}>{p.plate_label}</div> : null}
      {p.shield_label ? <div style={{ position: "absolute", left: right + 24, top: shieldY + 26, fontSize: 38, fontWeight: 800, color: colors.accent, opacity: labOn, textShadow: "0 2px 14px rgba(0,0,0,0.9)", whiteSpace: "nowrap" }}>{p.shield_label}</div> : null}
      {p.phase === "thrusters" && p.thruster_label ? <div style={{ position: "absolute", left: 0, right: 0, top: plateY - 150, textAlign: "center", fontSize: 44, fontWeight: 800, color: colors.text, opacity: thrOn, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.thruster_label}</div> : null}
    </div>
  );
};

// nosignal@1 — 자료 화면 없는 '비공개' 구간의 어두운 노이즈 그레인(방송 UI 흉내 금지, 글자 없음). 프레임마다 결정적 난수.
export const NoSignal: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, clock }) => {
  const p = spec.props as { intensity?: number; seed?: number };
  const k = p.intensity ?? 0.4;
  const frameSeed = (p.seed ?? 1) * 100003 + (clock.textAnim ? clock.localFrame : 12);
  const rnd = rand(frameSeed);
  const n = 240;
  const dots = Array.from({ length: n }, () => ({ x: rnd() * W, y: rnd() * H, w: 2 + rnd() * 5, h: 1 + rnd() * 3, o: rnd() * 0.12 * k * 2 }));
  const band = clock.textAnim ? ((clock.localFrame * 14) % (H + 400)) - 200 : H * 0.3;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {dots.map((d, i) => <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} fill="#cfd8e6" opacity={d.o} />)}
        <rect x={0} y={band} width={W} height={120} fill="#cfd8e6" opacity={0.035 * k * 2} />
      </svg>
    </div>
  );
};



// motion_clip@1 — Motion Canvas 등 외부 도해 도구가 만든 알파 클립(webm yuva420p)을 그래픽 층에 얹는다 (2026-08-31 사용자 지시).
//   props: file(public 기준) · from_sec(클립 내 시작) · len_sec · x/y/w/h(기본 풀프레임) · opacity
//   씬 좌표는 클립 안에 구워져 오므로 기본은 풀프레임 1:1. 낱말 시각은 씬 제작 시점에 반영(spec = 부탁 J).
export const MotionClip: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, clock }) => {
  const file = usePilotFile();
  const p = spec.props as { file: string; from_sec?: number; len_sec?: number; x?: number; y?: number; w?: number; h?: number; opacity?: number; fade_f?: number };
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  if (!p.file) return null;
  // textAnim=false(시트·슬라이드)면 정지 포스터 대신 클립 중간 프레임이 보이도록 Video 는 그대로 두되 일시정지 상태가 된다
  return (
    <div style={{ position: "absolute", left: p.x ?? 0, top: p.y ?? 0, width: p.w ?? W, height: p.h ?? H, opacity: (p.opacity ?? 1) * clock.anim(inF, p.fade_f ?? 6) }}>
      <Video src={file(p.file)} muted trimBefore={Math.round((p.from_sec ?? 0) * clock.fps)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none" }} />
    </div>
  );
};
