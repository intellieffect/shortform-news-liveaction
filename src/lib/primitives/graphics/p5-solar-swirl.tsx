// 5편 «태양 소용돌이» — khi_shear · field_line · edge_mark · count_marks
import type { Style } from "../../../pilot/types";
import { W, H, type BeatClock } from "../clock";
import { DIAGRAM, DiagramDefs, Tube, Arrow } from "../diagram";
import { FluxRope3D } from "../Graphics3D";
import { BRIGHT_TUBE, type GraphicSpec } from "./contracts";

// ── 5편 «태양 소용돌이» 부품 3종 (2026-09-01) ─────────────────────────────
// 셋 다 "동작·구조 묘사"라 코드 부품이다(rules §10 — 숫자가 주인공이면 Motion Canvas).
// 공통: 면+셰이딩 무텍스처, 자막 밴드(y<1267) 위에서 끝, 안전영역 x≥80.

const spiralPath = (cx: number, cy: number, r: number, turns: number, a0: number, dir: number) => {
  const seg: string[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const rr = r * t;
    seg.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return "M" + seg.join(" L");
};

// khi_shear@1 — 켈빈-헬름홀츠 기본형. 위아래 두 층이 다른 속도로 흐르다 경계가 말려 소용돌이가 된다 (facts #14).
// b11 은 배경이 파도 실사라 면은 반투명, 또렷한 것은 경계선과 소용돌이뿐이다.
export const KhiShear: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { v_top?: number; v_bottom?: number; amp?: number; wavelength_px?: number; roll_in?: number; roll_sec?: number; band_y?: number; band_h?: number };
  const { colors } = style;
  const y0 = p.band_y ?? 760, bh = p.band_h ?? 420, mid = y0 + bh / 2;
  const amp = p.amp ?? 46, wl = p.wavelength_px ?? 300;
  const vT = p.v_top ?? 1.0, vB = p.v_bottom ?? 0.35;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), 10);
  const roll = clock.lin(Math.round((p.roll_in ?? 0) * clock.fps), Math.round((p.roll_sec ?? 1.6) * clock.fps), 0, 1);
  const drift = clock.motion ? clock.localFrame * 1.6 : 60;
  const x0 = 80, x1 = W - 80;

  // 경계선 — 진폭이 roll 에 비례해 자라고, 마루가 흐름 방향으로 기운다(전단 비대칭)
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 6) {
    const ph = ((x + drift) / wl) * Math.PI * 2;
    const y = mid + amp * roll * Math.sin(ph + roll * 0.8 * Math.sin(ph));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const line = "M" + pts.join(" L");

  // 마루마다 소용돌이 — 말림이 진행될수록 감는 바퀴 수가 는다
  const crests: { x: number; y: number }[] = [];
  for (let k = -1; k < (x1 - x0) / wl + 1; k++) {
    const x = x0 + ((wl * (0.25 + k) - drift) % wl + wl) % wl + wl * k;
    if (x < x0 + 40 || x > x1 - 40) continue;
    crests.push({ x, y: mid + amp * roll });
  }
  const arrow = (y: number, len: number, o: number) => (
    <g opacity={0.85 * o}>
      <line x1={x0 + 40} y1={y} x2={x0 + 40 + len} y2={y} stroke={colors.text} strokeWidth={5} strokeLinecap="round" />
      <path d={`M${x0 + 40 + len} ${y} l-18 -10 l0 20 Z`} fill={colors.text} />
    </g>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {/* 두 층 — 위는 밝게, 아래는 어둡게. 배경을 죽이지 않게 반투명 */}
        <rect x={x0} y={y0} width={x1 - x0} height={bh / 2} fill="rgba(220,232,246,0.14)" />
        <rect x={x0} y={mid} width={x1 - x0} height={bh / 2} fill="rgba(16,22,34,0.34)" />
        <path d={line} fill="none" stroke={colors.text} strokeWidth={4} strokeLinecap="round" />
        {crests.map((c, i) => (
          <path key={i} d={spiralPath(c.x, c.y - amp * roll * 0.5, 34 * roll, 1.1 * roll, -Math.PI / 2, 1)} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinecap="round" opacity={roll} />
        ))}
        {/* 속도 차 — 화살표 길이가 v 에 비례 */}
        {arrow(y0 + bh * 0.18, 150 * vT, clock.anim(Math.round((spec.in ?? 0) * clock.fps) + 6, 10))}
        {arrow(y0 + bh * 0.82, 150 * vB, clock.anim(Math.round((spec.in ?? 0) * clock.fps) + 12, 10))}
      </svg>
    </div>
  );
};

// field_line@1 — 자기력선 다발 **하나의 도해가 두 비트에 걸쳐 서사를 갖는다**.
//   b14 phase "twist" : 소용돌이가 다발을 감아 꼰다 (facts #17·#18)
//   b15 phase "snap"  : 꼬인 상태에서 **이어받아** 팽팽해지고(가늘어짐) → 끊어지며 섬광 → 되말려 튕기고 → 위·아래로 다시 이어진다 (facts #20)
// 왜 합쳤나: 4편 capsule_section@1(phase thrusters→separate)이 증명한 구조. 5편 v2 는 field_twist@1·reconnect@1 로
//   나뉘어 있어 b14→b15 의 **인과(꼬임 → 끊어짐)가 화면에서 끊겼고**, 부품당 투입이 절반이 됐다(4편 부품당 2.2비트 vs 5편 1.0).
//   기하(튜브 다발·꼬임 함수)를 공유하므로 b15 는 b14 가 끝난 모양 그대로에서 시작한다 — 같은 물건이라는 게 보인다.
// 대비: 태양 실사가 고대비·고주파라 튜브는 3겹(어두운 테두리 → 코어 → 하이라이트). 색 계약은 BRIGHT_TUBE (rules §5c).
export const FieldLine: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    phase?: "twist" | "snap";
    lines?: number; turns?: number; x?: number; y?: number; w?: number; h?: number;
    twist_in?: number; twist_sec?: number;
    taut_in?: number; taut_sec?: number; snap_at?: number; recoil_sec?: number; rejoin_in?: number; rejoin_sec?: number;
    scrim?: number; three?: boolean;
  };
  const { colors } = style;
  const phase = p.phase ?? "twist";
  const bx = p.x ?? 140, by = p.y ?? 520, bw = p.w ?? 800, bh = p.h ?? 700;
  const cx = bx + bw / 2, cy = by + bh / 2;
  const F = (sec: number) => Math.round(sec * clock.fps);
  const appear = clock.anim(F(spec.in ?? 0), 10);
  const spin = clock.motion ? clock.localFrame * 0.05 : 1.2;

  // twist 는 b14 에서 자라고, b15 는 **1 에서 시작**한다 — 앞 비트가 끝낸 모양을 이어받는다
  const tw = phase === "twist" ? clock.lin(F(p.twist_in ?? 0.3), F(p.twist_sec ?? 1.8), 0, 1) : 1;
  const taut = phase === "snap" ? clock.lin(F(p.taut_in ?? 1.2), F(p.taut_sec ?? 0.62), 0, 1) : 0;
  const snap = phase === "snap" ? clock.lin(F(p.snap_at ?? 1.88), F(0.35), 0, 1) : 0;
  const rec = phase === "snap" ? clock.lin(F((p.snap_at ?? 1.88) + 0.06), F(p.recoil_sec ?? 1.1), 0, 1) : 0;
  const flash = snap * (1 - snap) * 4;

  // ── 표준 도상을 따른다 (레퍼런스 조사 2026-09-01) ──────────────────────────
  //   twist: **twisted flux rope** — 광구 소용돌이가 자속관을 뿌리에서 비튼다. 나선 가닥이 원통을 감고,
  //          cos(θ)>0 구간은 관 **앞**(굵고 밝게) / <0 은 **뒤**(가늘고 어둡게)로 갈라 3D 를 만든다.
  //   snap : **X-점 재연결** — 반평행 자기력선이 수직으로 모여들고(유입), X 에서 끊어졌다 이어지며
  //          굽은 선이 좌우로 튕긴다(유출 제트). 자기 장력이 튕기는 것이 곧 자막의 "고무줄처럼"이다.
  //   폐기한 시안: ① 사인파 다발 5줄(v2~v3) — 꼬임이 꼬임으로 안 보였다 ② 밝은 영역 경계 말림(논문 도판 언어)
  //          — 프레임을 통째로 덮어 배경·자막과 싸웠다. b11 처럼 배경이 없는 비트용으로는 유효.
  if (phase === "twist" && p.three) {
    // 3D 판 — 가닥끼리의 가림·음영·정반사를 광원에 맡긴다 (Graphics3D.tsx FluxRope3D)
    return (
      <div style={{ position: "absolute", inset: 0, opacity: appear }}>
        <FluxRope3D style={style} clock={clock} box={{ x: bx, y: by, w: bw, h: bh }} tw={tw} />
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          <DiagramDefs />
          <defs>
            <radialGradient id="fx3_swirl" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={cx} cy={by + bh - 84} rx={bw * 0.5} ry={bw * 0.17} fill="url(#fx3_swirl)" opacity={tw} />
          <g filter="url(#dg_organic)">
            <Tube d={spiralPath(cx, by + bh - 84, 112 * tw, 2.1, spin, 1)} w={DIAGRAM.w.sub}
                  outline={BRIGHT_TUBE.outline} core={BRIGHT_TUBE.coreHot} highlight={colors.accent} opacity={tw} />
          </g>
        </svg>
      </div>
    );
  }
  if (phase === "twist") {
    // 표준 도상 = **twisted flux rope** — 원통(관) 겉을 나선 가닥이 감는다. 리본(평면 띠)이 아니다.
    // 3D 는 앞/뒤로 만든다: cos(θ)>0 인 구간은 관 **앞**(굵고 밝게), <0 은 **뒤**(가늘고 어둡게).
    const R = bw * 0.27;                       // 관 반지름
    const yTop = by + 30, yBot = by + bh - 150; // 아래는 뿌리 소용돌이 자리
    const L = yBot - yTop;
    const T = 0.45 + 1.35 * tw;                 // 감김 수 — 2.7 은 스프링처럼 보였다(실측). 태양 자속관은 1~2 바퀴
    // 가닥 = **가변 폭 채움 리본**. SVG stroke 는 굵기가 일정해 원통이 안 된다 —
    // 실루엣(θ=±90°)으로 갈수록 가늘어져야 관을 감아 도는 것으로 보인다. depth = cos(θ) 가 그 폭이다.
    const P = 220;
    const pt = (k: number, n: number) => {
      const t = n / P;
      const th = t * T * Math.PI * 2 + (k * 2 * Math.PI) / 3 + spin;
      return { x: cx + R * Math.sin(th), y: yTop + t * L, c: Math.cos(th), th };
    };
    const ribbons = (k: number, front: boolean) => {
      const out: { fill: string; hi: string }[] = [];
      let run: { x: number; y: number; c: number }[] = [];
      const flush = () => {
        if (run.length > 2) {
          const hwOf = (c: number) => (DIAGRAM.w.main / 2) * (0.30 + 0.70 * Math.abs(c));
          const l = run.map((q) => `${(q.x - hwOf(q.c)).toFixed(1)},${q.y.toFixed(1)}`);
          const r = [...run].reverse().map((q) => `${(q.x + hwOf(q.c)).toFixed(1)},${q.y.toFixed(1)}`);
          // 하이라이트 = 리본 중심에서 광원(좌상) 쪽으로 치우친 얇은 선
          const h = run.map((q) => `${(q.x - hwOf(q.c) * 0.42).toFixed(1)},${q.y.toFixed(1)}`);
          out.push({ fill: "M" + l.join(" L") + " L" + r.join(" L") + " Z", hi: "M" + h.join(" L") });
        }
        run = [];
      };
      for (let n = 0; n <= P; n++) {
        const q = pt(k, n);
        if (q.c > 0 === front) run.push(q); else flush();
      }
      flush();
      return out;
    };
    return (
      <div style={{ position: "absolute", inset: 0, opacity: appear }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          <DiagramDefs />
          <defs>
            <linearGradient id="fx_tube" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(10,7,4,0)" /><stop offset="30%" stopColor="rgba(18,12,7,0.34)" />
              <stop offset="52%" stopColor="rgba(52,36,19,0.30)" /><stop offset="74%" stopColor="rgba(14,10,6,0.36)" />
              <stop offset="100%" stopColor="rgba(10,7,4,0)" />
            </linearGradient>
            <linearGradient id="fx_fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000000" /><stop offset="14%" stopColor="#FFFFFF" />
              <stop offset="86%" stopColor="#FFFFFF" /><stop offset="100%" stopColor="#000000" />
            </linearGradient>
            <mask id="fx_mask"><rect x={cx - R * 1.2} y={yTop} width={R * 2.4} height={L} fill="url(#fx_fade)" /></mask>
            <radialGradient id="fx_swirl" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* 관 몸통 — 면(원통 셰이딩). 가닥만 있으면 '선'이고, 몸통이 있어야 '관'이다 */}
          <rect x={cx - R * 1.12} y={yTop} width={R * 2.24} height={L} fill="url(#fx_tube)" mask="url(#fx_mask)" />
          {/* 뒤로 도는 가닥 — 관 뒤라 어둡고 좁다 */}
          <g filter="url(#dg_organic)" opacity={0.85}>
            {[0, 1, 2].map((k) => ribbons(k, false).map((rb, m) => (
              <path key={`b${k}_${m}`} d={rb.fill} fill="rgba(10,7,4,0.86)" stroke="rgba(10,7,4,0.9)" strokeWidth={2} />
            )))}
          </g>
          {/* 앞으로 도는 가닥 — 채움 리본 + 테두리 + 치우친 하이라이트 */}
          <g filter="url(#dg_organic)">
            {[0, 1, 2].map((k) => ribbons(k, true).map((rb, m) => (
              <g key={`f${k}_${m}`}>
                <path d={rb.fill} fill={k === 0 ? BRIGHT_TUBE.coreHot : BRIGHT_TUBE.core}
                      stroke={BRIGHT_TUBE.outline} strokeWidth={5.5} strokeLinejoin="round" />
                <path d={rb.hi} fill="none" stroke={k === 0 ? colors.accent : BRIGHT_TUBE.highlight}
                      strokeWidth={DIAGRAM.w.main * DIAGRAM.tube.highlight} strokeLinecap="round" opacity={0.92} />
              </g>
            )))}
          </g>
          {/* 뿌리 소용돌이 — 관을 비트는 주체. 자막 밴드(1267) 위에서 끝난다 */}
          <ellipse cx={cx} cy={yBot + 66} rx={R * 1.9} ry={R * 0.62} fill="url(#fx_swirl)" opacity={tw} />
          <g filter="url(#dg_organic)">
            <Tube d={spiralPath(cx, yBot + 66, 112 * tw, 2.1, spin, 1)} w={DIAGRAM.w.sub}
                  outline={BRIGHT_TUBE.outline} core={BRIGHT_TUBE.coreHot} highlight={colors.accent} opacity={tw} />
          </g>
        </svg>
      </div>
    );
  }
  if (phase === "snap") {
    const conv = bh * 0.19 * (1 - 0.60 * taut);        // 유입 — 위아래 층이 모여든다
    const out = bw * 0.22 * rec;                        // 유출 — 꼭짓점이 좌우로 벌어진다(= 고무줄이 튕긴다)
    const mxL = cx - out, mxR = cx + out;
    const seg = (y: number, xEnd: number, xStart: number) => {
      const yEnd = y + (cy - y) * rec;                  // rec=1 이면 꼭짓점(중앙 높이)에서 만난다
      const bow = (cy - y) * 0.22 * rec;                // 장력으로 살짝 휜다
      return `M${xStart} ${y} Q${(xStart + xEnd) / 2} ${y + bow} ${xEnd} ${yEnd}`;
    };
    const rows = [0, 1, 2];
    // 굵기 위계: 가장 안쪽 층이 main, 바깥으로 갈수록 sub → guide (한 도해에 main 은 하나)
    const rowW = (r: number) => [DIAGRAM.w.main, DIAGRAM.w.sub, DIAGRAM.w.guide * 1.6][r];
    const Line: React.FC<{ d: string; r: number }> = ({ d, r }) => (
      <Tube d={d} w={rowW(r)} outline={BRIGHT_TUBE.outline}
            core={r === 0 ? BRIGHT_TUBE.coreHot : BRIGHT_TUBE.core}
            highlight={r === 0 ? colors.accent : BRIGHT_TUBE.highlight} />
    );
    return (
      <div style={{ position: "absolute", inset: 0, opacity: appear }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          <DiagramDefs />
          <defs>
            <radialGradient id="fl_scrim2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(4,6,10,0.92)" /><stop offset="62%" stopColor="rgba(4,6,10,0.74)" /><stop offset="100%" stopColor="rgba(4,6,10,0)" />
            </radialGradient>
          </defs>
          {p.scrim ? <ellipse cx={cx} cy={cy} rx={bw * 1.0} ry={bh * 0.9} fill="url(#fl_scrim2)" opacity={p.scrim} /> : null}
          {/* 전류 시트 — 두 반평행 층이 맞닿는 면 */}
          <line x1={bx + 40} y1={cy} x2={bx + bw - 40} y2={cy} stroke={colors.accent} strokeWidth={4} strokeDasharray="14 16" opacity={0.6 * taut * (1 - rec)} />
          <g filter="url(#dg_organic)">
          {rows.map((r) => {
            const yU = cy - conv - r * 46, yL = cy + conv + r * 46;
            return (
              <g key={r}>
                <Line d={seg(yU, mxL, bx - 40)} r={r} /><Line d={seg(yL, mxL, bx - 40)} r={r} />
                <Line d={seg(yU, mxR, bx + bw + 40)} r={r} /><Line d={seg(yL, mxR, bx + bw + 40)} r={r} />
              </g>
            );
          })}
          </g>
          {/* 유입(수직으로 모임) → 유출(좌우 제트) */}
          <Arrow x={cx} y={cy - bh * 0.44} dx={0} dy={76} color={colors.accent} opacity={0.9 * taut * (1 - rec * 2)} />
          <Arrow x={cx} y={cy + bh * 0.44} dx={0} dy={-76} color={colors.accent} opacity={0.9 * taut * (1 - rec * 2)} />
          <Arrow x={mxL - 40} y={cy} dx={-104} dy={0} color={colors.accent} opacity={1.1 * rec - 0.15} />
          <Arrow x={mxR + 40} y={cy} dx={104} dy={0} color={colors.accent} opacity={1.1 * rec - 0.15} />
          {flash > 0.01 ? (
            <>
              <g filter="url(#dg_glow)">
                <circle cx={cx} cy={cy} r={24 + 30 * snap} fill="#FFF6E2" opacity={0.9 * flash} />
                <circle cx={cx} cy={cy} r={38 + 200 * snap} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.sub * (1 - snap) + 3} opacity={0.85 * flash} />
              </g>
            </>
          ) : null}
        </svg>
      </div>
    );
  }
  return null;
};

// edge_mark@1 — b09 "그 과립의 **가장자리**에서". 배경(확대 시간차)의 과립 경계를 훑어 지시한다.
// 곡선 하나가 그려지며 그 위에 소용돌이 표시가 얹힌다 — 낱말 '가장자리'를 화면이 수행.
export const EdgeMark: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { path?: string | null; draw_in?: number; draw_sec?: number; marks?: { x: number; y: number }[]; label?: string };
  const { colors } = style;
  const F = (s: number) => Math.round(s * clock.fps);
  const appear = clock.anim(F(spec.in ?? 0), 8);
  const draw = clock.lin(F(p.draw_in ?? 0.2), Math.round((p.draw_sec ?? 1.1) * clock.fps), 0, 1);
  // path: null 이면 곡선을 그리지 않고 **표시만** 남긴다.
  // 자·컴퍼스 판별(rules §5c): 유기적 경계를 손으로 훑은 곡선은 실사가 이미 보여주는 것을 어설프게 덧그린다.
  // 지시의 기능은 원(기하)이 하고, 경계 자체는 배경 실사가 한다.
  const d = p.path === null ? null : (p.path ?? `M180 980 C 330 760, 470 900, 600 700 S 830 520, 930 560`);
  const marks = p.marks ?? [{ x: 470, y: 838 }, { x: 690, y: 640 }];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        {/* 지시선 = sub 굵기(주인공은 배경의 실제 가장자리다). 그려지며 나타난다 */}
        {d ? (
          <g filter="url(#dg_organic)">
            <path d={d} fill="none" stroke={BRIGHT_TUBE.outline} strokeWidth={DIAGRAM.w.sub} strokeLinecap="round"
                  pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <path d={d} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.sub * DIAGRAM.tube.highlight * 1.5} strokeLinecap="round"
                  pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          </g>
        ) : null}
        <g filter="url(#dg_lift)">
          {marks.map((m, i) => {
            const on = clock.anim(F((p.draw_in ?? 0.2) + 0.75 + i * 0.28), DIAGRAM.fade_f);
            return (
              <g key={i} opacity={on}>
                <circle cx={m.x} cy={m.y} r={30} fill="none" stroke={BRIGHT_TUBE.outline} strokeWidth={DIAGRAM.w.guide * 1.6} />
                <circle cx={m.x} cy={m.y} r={30} fill="none" stroke="#FFFFFF" strokeWidth={DIAGRAM.w.guide * 0.72} />
                <path d={spiralPath(m.x, m.y, 19, 1.25, -Math.PI / 2, 1)} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.guide * 0.65} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// count_marks@1 — b10 "초미세 소용돌이 **수십 개**가". 마커가 하나씩 켜지며 개수를 화면이 센다.
export const CountMarks: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { n?: number; start_in?: number; step_sec?: number; box?: { x: number; y: number; w: number; h: number }; seed?: number };
  const { colors } = style;
  const F = (s: number) => Math.round(s * clock.fps);
  const appear = clock.anim(F(spec.in ?? 0), 8);
  const n = p.n ?? 24, step = p.step_sec ?? 0.07, s0 = p.start_in ?? 0.3;
  const bx = p.box?.x ?? 110, by = p.box?.y ?? 430, bw = p.box?.w ?? 860, bh = p.box?.h ?? 720;
  let sd = p.seed ?? 7;
  const rnd = () => { sd = (sd * 1103515245 + 12345) % 2147483648; return sd / 2147483648; };
  const pts = Array.from({ length: n }, () => ({ x: bx + rnd() * bw, y: by + rnd() * bh, r: 13 + rnd() * 11 }));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        {/* 표시는 guide 굵기 — 주인공은 배경의 진짜 소용돌이다. 표시가 그걸 덮으면 안 된다 */}
        <g filter="url(#dg_lift)">
          {pts.map((m, i) => {
            const on = clock.anim(F(s0 + i * step), 6);
            if (on <= 0.01) return null;
            return (
              <g key={i} opacity={on}>
                <circle cx={m.x} cy={m.y} r={m.r} fill="rgba(6,8,13,0.55)" stroke={BRIGHT_TUBE.outline} strokeWidth={DIAGRAM.w.guide} />
                <path d={spiralPath(m.x, m.y, m.r * 0.78, 1.2, -Math.PI / 2, 1)} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.guide * 0.52} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
