// 6편 «은하 90도 뒤집힘» — disc_flip · mass_share · orbit_stretch · two_speed_ring · disc_crossing
import type { Style } from "../../../pilot/types";
import { W, H, type BeatClock } from "../clock";
import { DIAGRAM, DiagramDefs, Tube, Arrow } from "../diagram";
import { SPACE_TUBE, DEG, durF, ellipsePath, type GraphicSpec } from "./contracts";

// disc_flip@1 — 원반이 축을 유지한 채 90도 이상 기운다. 각도 호가 같이 자란다.
//   mode='plane' 은 상상도 위에 겹칠 때(원반 평면선 + 방향 화살만, 은하 본체를 다시 그리지 않는다)
//   sun=true 면 원반 위 점 하나가 함께 끌려간다 — 라벨은 붙이지 않는다(자막이 이름을 말한다)
export const DiscFlip: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    mode?: "plane" | "disc"; tilt_from?: number; tilt_to?: number; tilt_in?: number; tilt_sec?: number;
    arc?: boolean; arc_label?: string; arc_in?: number; center?: { x: number; y: number }; disc_r?: number;
    sun?: boolean; sun_in?: number; axis?: boolean;
  };
  const { colors } = style;
  const plane = p.mode === "plane";
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 740, R = p.disc_r ?? (plane ? 300 : 330);
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), DIAGRAM.fade_f);
  const from = p.tilt_from ?? 0, to = p.tilt_to ?? 100;
  const k = clock.anim(Math.round((p.tilt_in ?? 0.6) * clock.fps), durF(p.tilt_sec ?? 1.6, clock.fps));
  const tilt = from + (to - from) * k;
  const arcOn = p.arc ? clock.anim(Math.round((p.arc_in ?? 1.6) * clock.fps), DIAGRAM.fade_f) : 0;
  const sunOn = p.sun ? clock.anim(Math.round((p.sun_in ?? 0.8) * clock.fps), DIAGRAM.fade_f) : 0;
  const w = plane ? DIAGRAM.w.sub : DIAGRAM.w.main;
  // 원반 = 옆에서 본 얇은 타원. 기울기는 화면 안에서의 회전각
  const disc = ellipsePath(cx, cy, R, R * 0.15, tilt);
  // 축 = 원반에 수직
  const an = (tilt + 90) * DEG;
  const ax = Math.cos(an), ay = Math.sin(an), aL = R * 0.72;
  // 각도 호 — 처음 축 방향에서 지금까지
  const a0 = (from + 90) * DEG, aR = R * 0.46;
  const large = Math.abs(tilt - from) > 180 ? 1 : 0;
  const sweep = tilt > from ? 1 : 0;
  const arcD = `M${cx + Math.cos(a0) * aR} ${cy + Math.sin(a0) * aR} A${aR} ${aR} 0 ${large} ${sweep} ${cx + ax * aR} ${cy + ay * aR}`;
  const sr = R * 0.62, sc = Math.cos(tilt * DEG), ss = Math.sin(tilt * DEG);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <defs>
          {/* 원반 면 — 가운데가 밝고 가장자리가 흐려진다. 외곽선만 그리면 「고리」로 읽힌다(시안 1판) */}
          <linearGradient id="df_face" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#CFE3FF" stopOpacity="0.10" />
            <stop offset="50%" stopColor="#E8EEF7" stopOpacity="0.46" />
            <stop offset="100%" stopColor="#CFE3FF" stopOpacity="0.10" />
          </linearGradient>
        </defs>
        <g filter="url(#dg_lift)">
          {plane ? (
            /* 평면선 — 상상도 위에는 직선 하나. 타원을 얹으면 그림 위의 고리로 읽힌다 */
            <Tube d={`M${cx - Math.cos(tilt * DEG) * R} ${cy - Math.sin(tilt * DEG) * R} L${cx + Math.cos(tilt * DEG) * R} ${cy + Math.sin(tilt * DEG) * R}`} w={w} {...SPACE_TUBE} />
          ) : (
            <>
              <path d={disc} fill="url(#df_face)" />
              <Tube d={disc} w={w} {...SPACE_TUBE} />
            </>
          )}
          {/* 축 — 원반이 무엇을 기준으로 도는지. 한쪽만, 짧게 */}
          {p.axis === false ? null : (
            <Arrow x={cx} y={cy} dx={ax * aL} dy={ay * aL} color={colors.text} w={DIAGRAM.w.guide} opacity={0.85} />
          )}
          {/* 각도 호 */}
          {arcOn > 0 ? (
            <g opacity={arcOn}>
              <path d={arcD} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} strokeLinecap="round" />
              <line x1={cx} y1={cy} x2={cx + Math.cos(a0) * aR * 1.12} y2={cy + Math.sin(a0) * aR * 1.12} stroke={colors.accent} strokeWidth={3} strokeDasharray="10 12" opacity={0.7} />
            </g>
          ) : null}
          {/* 태양 점 — 라벨 없음 */}
          {sunOn > 0 ? (
            <g opacity={sunOn}>
              <circle cx={cx + sr * sc} cy={cy + sr * ss} r={16} fill={colors.accent} filter="url(#dg_glow)" />
              <circle cx={cx + sr * sc} cy={cy + sr * ss} r={7} fill="#FFFFFF" />
            </g>
          ) : null}
        </g>
      </svg>
      {p.arc_label && arcOn > 0 ? (
        <div style={{ position: "absolute", left: cx - 260, width: 520, top: cy - aR - 118, textAlign: "center", fontSize: 64, fontWeight: 900, color: colors.accent, opacity: arcOn, textShadow: "0 2px 18px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>{p.arc_label}</div>
      ) : null}
    </div>
  );
};

// mass_share@1 — 큰 원(당시 우리 은하) 안에서 **면적** 비율이 차오른다.
//   화면엔 비율 하나만. 반지름 비가 아니라 면적 비로 채운다(√share).
export const MassShare: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { share: number; share_in?: number; fill_sec?: number; label?: string; sub?: string; center?: { x: number; y: number }; r_px?: number };
  const { colors } = style;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 720, R = p.r_px ?? 290;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), DIAGRAM.fade_f);
  const k = clock.anim(Math.round((p.share_in ?? 0.6) * clock.fps), durF(p.fill_sec ?? 1.1, clock.fps));
  const r = R * Math.sqrt(Math.max(0, Math.min(1, p.share))) * k;
  const labOn = clock.anim(Math.round(((p.share_in ?? 0.6) + (p.fill_sec ?? 1.1) * 0.7) * clock.fps), DIAGRAM.fade_f);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          <circle cx={cx} cy={cy} r={R} fill="rgba(207,227,255,0.05)" stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.sub} />
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.sub * DIAGRAM.tube.highlight} opacity={0.85} />
          {r > 2 ? (
            <>
              <circle cx={cx} cy={cy} r={r} fill={colors.accent} fillOpacity={0.26} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.5} />
            </>
          ) : null}
        </g>
      </svg>
      {p.label ? (
        <div style={{ position: "absolute", left: 80, width: W - 160, top: cy + R + 48, textAlign: "center", opacity: labOn }}>
          <div style={{ fontSize: 66, fontWeight: 900, color: colors.accent, textShadow: "0 2px 18px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>{p.label}</div>
          {p.sub ? <div style={{ marginTop: 8, fontSize: 40, fontWeight: 600, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.sub}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

// orbit_stretch@1 — 원에 가깝던 궤도들이 길쭉한 타원으로 늘어난다. 늘어나는 것은 **이심률**이다.
//   수십억 개는 그릴 수 없다 — 궤도 몇 개로 대표하고 개수를 주장하지 않는다.
export const OrbitStretch: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { ecc_from?: number; ecc_to?: number; stretch_in?: number; stretch_sec?: number; n_orbits?: number; label?: string; center?: { x: number; y: number } };
  const { colors } = style;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 730;
  const n = Math.max(1, Math.min(6, p.n_orbits ?? 4));
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), DIAGRAM.fade_f);
  const k = clock.anim(Math.round((p.stretch_in ?? 0.5) * clock.fps), durF(p.stretch_sec ?? 1.5, clock.fps));
  const e = (p.ecc_from ?? 0.05) + ((p.ecc_to ?? 0.94) - (p.ecc_from ?? 0.05)) * k;
  const a = 300; // 장반경 고정 — 궤도가 커지는 게 아니라 납작해진다
  const b = a * Math.sqrt(Math.max(0.02, 1 - e * e));
  const labOn = clock.anim(Math.round(((p.stretch_in ?? 0.5) + (p.stretch_sec ?? 1.5) * 0.8) * clock.fps), DIAGRAM.fade_f);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {Array.from({ length: n }).map((_, i) => {
            const rot = -18 + (i / Math.max(1, n - 1)) * 36; // ±18° — 한 방향으로 모은다
            const f = a * e; // 초점 이동 — 은하 중심이 초점에 온다
            const ox = cx - Math.cos(rot * DEG) * f, oy = cy - Math.sin(rot * DEG) * f;
            return <Tube key={i} d={ellipsePath(ox, oy, a, b, rot)} w={DIAGRAM.w.guide + 4} {...SPACE_TUBE} opacity={0.55 + 0.45 * (i === 0 ? 1 : 0)} />;
          })}
          <circle cx={cx} cy={cy} r={13} fill={colors.text} opacity={0.9} />
        </g>
      </svg>
      {p.label ? (
        <div style={{ position: "absolute", left: 80, width: W - 160, top: cy + 360, textAlign: "center", fontSize: 60, fontWeight: 900, color: colors.accent, opacity: labOn, textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}>{p.label}</div>
      ) : null}
    </div>
  );
};

// two_speed_ring@1 — 동심 두 띠에서 점이 각각 다른 속도로 돈다.
//   각속도 비는 **실제 값의 비(220:25)** 를 유지한다. 숫자를 자막·온스크린이 말하면 labels=false.
export const TwoSpeedRing: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { inner_kms: number; outer_kms: number; inner_in?: number; outer_in?: number; spin_sec?: number; center?: { x: number; y: number }; inner_r?: number; outer_r?: number; labels?: boolean };
  const { colors } = style;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 720;
  const ri = p.inner_r ?? 150, ro = p.outer_r ?? 300;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), DIAGRAM.fade_f);
  const inOn = clock.anim(Math.round((p.inner_in ?? 0.4) * clock.fps), DIAGRAM.fade_f);
  const outOn = clock.anim(Math.round((p.outer_in ?? 1.2) * clock.fps), DIAGRAM.fade_f);
  // 자막이 말하는 건 **선속도**(초속 220km / 25km)다. 원 위의 각속도는 ω = v / r 이므로
  // 두 점의 각속도 비는 (v_i/r_i) : (v_o/r_o) 다 — 선속도 비를 그대로 각속도에 쓰면 틀린다.
  // 안쪽이 spin_sec 에 한 바퀴 돌도록 잡고, 바깥은 그 비율만큼만 돈다.
  const spin = p.spin_sec ?? 3.0;
  const sec = clock.motion ? clock.localFrame / clock.fps : spin * 0.42; // 정지 시트에선 고정 위상
  const wi = (Math.PI * 2) / spin;
  const wo = wi * ((p.outer_kms / ro) / Math.max(1e-6, p.inner_kms / ri));
  const ai = -90 * DEG + sec * wi;
  const ao = -90 * DEG + sec * wo;
  const dot = (r: number, ang: number, on: number, hot: boolean) => (
    <g opacity={on}>
      <circle cx={cx + Math.cos(ang) * r} cy={cy + Math.sin(ang) * r} r={hot ? 19 : 15} fill={hot ? colors.accent : colors.quote} filter="url(#dg_glow)" />
      <circle cx={cx + Math.cos(ang) * r} cy={cy + Math.sin(ang) * r} r={hot ? 8 : 6} fill="#FFFFFF" />
    </g>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          <circle cx={cx} cy={cy} r={ro} fill="none" stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.guide + 6} opacity={outOn} />
          <circle cx={cx} cy={cy} r={ro} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={3} opacity={0.5 * outOn} strokeDasharray="6 16" />
          <ellipse cx={cx} cy={cy} rx={ri} ry={ri * 0.30} fill="rgba(207,227,255,0.06)" stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.guide + 6} opacity={inOn} />
          <ellipse cx={cx} cy={cy} rx={ri} ry={ri * 0.30} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={3.5} opacity={0.8 * inOn} />
          {dot(ro, ao, outOn, false)}
          {dot(ri, ai, inOn, true)}
        </g>
      </svg>
      {p.labels ? (
        <>
          <div style={{ position: "absolute", left: cx - 300, width: 600, top: cy + ro + 40, textAlign: "center", fontSize: 46, fontWeight: 800, color: colors.quote, opacity: outOn, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{`헤일로 · 초속 ${p.outer_kms}km`}</div>
          <div style={{ position: "absolute", left: cx - 300, width: 600, top: cy - ro - 96, textAlign: "center", fontSize: 52, fontWeight: 900, color: colors.accent, opacity: inOn, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{`원반 · 초속 ${p.inner_kms}km`}</div>
        </>
      ) : null}
    </div>
  );
};

// disc_crossing@1 — 왜소은하가 원반을 위아래로 관통하며 지나갈 때마다 꼬리를 잃는다.
//   개념 경로다 — 축척 아님. 꼬리는 **통과 뒤에만**(조석력의 순서).
export const DiscCrossing: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { passes?: number; path_in?: number; path_sec?: number; tail?: boolean; tail_in?: number; label?: string; center?: { x: number; y: number } };
  const { colors } = style;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 740;
  const R = 300;
  const appear = clock.anim(Math.round((spec.in ?? 0) * clock.fps), DIAGRAM.fade_f);
  const pathOn = clock.anim(Math.round((p.path_in ?? 0.4) * clock.fps), DIAGRAM.fade_f);
  const tailOn = p.tail ? clock.anim(Math.round((p.tail_in ?? 2.4) * clock.fps), DIAGRAM.fade_f) : 0;
  // 원반 — 옆에서 본 얇은 타원(수평)
  const disc = ellipsePath(cx, cy, R, R * 0.14, 0);
  // 관통 궤도 — 원반에 크게 기운 타원
  const orbit = ellipsePath(cx, cy, R * 0.62, R * 0.95, 74);
  // 위성 위치 — 궤도 위를 돈다(우리 은하의 1/10 크기)
  const th = (clock.motion ? clock.t : 0.5) * Math.PI * 2 * (p.passes ?? 1) - Math.PI / 2;
  const ex = Math.cos(th) * R * 0.62, ey = Math.sin(th) * R * 0.95;
  const c74 = Math.cos(74 * DEG), s74 = Math.sin(74 * DEG);
  const sx = cx + ex * c74 - ey * s74, sy = cy + ex * s74 + ey * c74;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          <path d={disc} fill="rgba(207,227,255,0.08)" />
          <Tube d={disc} w={DIAGRAM.w.main} {...SPACE_TUBE} />
          <g opacity={pathOn}>
            <path d={orbit} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} strokeDasharray="18 16" strokeLinecap="round" opacity={0.9} />
          </g>
          {/* 위성 — 우리 은하의 1/10 */}
          <g opacity={pathOn}>
            {tailOn > 0 ? (
              <path d={`M${sx} ${sy} q ${-Math.cos(th) * 60} ${-Math.sin(th) * 90} ${-Math.cos(th) * 150} ${-Math.sin(th) * 210}`} fill="none" stroke={colors.accent} strokeWidth={9} strokeLinecap="round" opacity={0.55 * tailOn} strokeDasharray="4 14" />
            ) : null}
            <circle cx={sx} cy={sy} r={R * 0.1} fill={colors.accent} fillOpacity={0.25} stroke={colors.accent} strokeWidth={6} />
          </g>
        </g>
      </svg>
      {p.label ? (
        <div style={{ position: "absolute", left: 80, width: W - 160, top: cy + R + 62, textAlign: "center", fontSize: 40, fontWeight: 700, color: colors.muted, opacity: pathOn, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.label}</div>
      ) : null}
    </div>
  );
};
