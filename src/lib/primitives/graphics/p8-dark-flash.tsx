// 8편 «암흑물질 섬광» — detector_cell · energy_window · compare
import type { Style } from "../../../pilot/types";
import { W, H, type BeatClock } from "../clock";
import { DIAGRAM, DiagramDefs, Tube } from "../diagram";
import { SPACE_TUBE, durF, rand, type GraphicSpec } from "./contracts";

// ── 8편 도해 3종 (2026-09-03) ────────────────────────────────────────────────
// 배경이 지하 갱도·저온 증기·어두운 추상이라 6·7편의 슬레이트 계약(SPACE_TUBE)을 그대로 쓴다.
// 형태는 DIAGRAM 계약 안에서만 — 부품 안에서 새 굵기·새 화살촉·새 이징을 만들지 않는다.
//
// **왜 이 편에 도해가 10비트나 되나**: 실사가 구조적으로 막혔다.
//   ① 암흑물질은 실사가 존재할 수 없다(facts #2) ② 검출기 실물은 권리로 전부 막혔다(RIGHTS.md)
//   ③ 실존 시설·인물이라 생성도 금지(facts §AI 금지). 남은 길이 코드 도해다.

/** detector_cell@1 — 액체 제논 검출기의 **구조 도해**. 실물 사진이 아니다.
 *  상태 셋을 한 부품이 잇는다: structure(b03) → filled(b04) → recoil(b07).
 *  **LZ 의 외관을 닮게 그리지 않는다** — 원통·액체면·상하 광증폭관 배열까지만.
 *  기관명·제품명 라벨을 붙이지 않는다(고유명사는 자막이 말한다). */
export const DetectorCell: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    state?: "structure" | "filled" | "recoil";
    fill?: number; pmt?: boolean; recoil?: boolean; label_in?: number;
    cx?: number; cy?: number; y?: number; w_px?: number; h_px?: number;
  };
  const { colors } = style;
  // y(비율)는 layer43_plan 이 파생한다 — px 를 부품에서 정하지 않는다(R1-05)
  const cx = p.cx ?? 540;
  const cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 760);
  const bw = p.w_px ?? 420, bh = p.h_px ?? 560;
  const x0 = cx - bw / 2, y0 = cy - bh / 2, x1 = cx + bw / 2, y1 = cy + bh / 2;
  const rx = bw / 2, ry = 46;                       // 원통 위·아래 타원 반지름

  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const state = p.state ?? "structure";
  const isFilled = state !== "structure";
  const isRecoil = state === "recoil" || p.recoil === true;

  // 액체는 **아래에서 위로** 찬다. fill 은 값이지 장식이 아니다 — 임의로 바꾸지 않는다
  const fillTarget = isFilled ? (p.fill ?? 0.72) : 0;
  const fillK = clock.anim(inF + Math.round(0.2 * clock.fps), durF(1.1, clock.fps));
  const fill = fillTarget * fillK;
  const surfY = y1 - ry - (bh - ry * 2) * fill;      // 액체면 y

  // 반동 — 입자가 비스듬히 들어와 원자핵과 부딪히고, 그 자리에서 섬광과 전하가 난다
  const rF = inF + Math.round(0.35 * clock.fps);
  const travel = clock.anim(rF, durF(0.55, clock.fps));
  const hit = clock.anim(rF + durF(0.55, clock.fps), durF(0.28, clock.fps));
  const nx = cx + bw * 0.13, ny = surfY + (y1 - ry - surfY) * 0.42;   // 충돌 지점 = 액체 안
  const sx = nx - bw * 0.62, sy = ny - bh * 0.52;                      // 입자 진입점
  const px = sx + (nx - sx) * travel, py = sy + (ny - sy) * travel;

  const pmtOn = p.pmt !== false;
  const labOn = clock.anim(inF + Math.round((p.label_in ?? 0.35) * clock.fps), DIAGRAM.fade_f);
  const pmts = (yy: number, key: string) =>
    Array.from({ length: 7 }, (_, i) => {
      const gx = x0 + 40 + ((bw - 80) / 6) * i;
      // 섬광이 나면 광증폭관이 받는다 — 충돌 지점에 가까운 것부터 밝다
      const near = 1 - Math.min(1, Math.abs(gx - nx) / (bw * 0.7));
      const lit = isRecoil ? hit * (0.25 + 0.75 * near) : 0;
      return (
        <g key={`${key}${i}`}>
          <circle cx={gx} cy={yy} r={17} fill={SPACE_TUBE.core} stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.guide} />
          <circle cx={gx} cy={yy} r={11} fill={colors.accent} fillOpacity={0.22 + 0.68 * lit} />
        </g>
      );
    });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {/* 액체 — 원통 안에서만. 위쪽 타원이 액체면이다 */}
          {fill > 0.01 ? (
            <g>
              <path
                d={`M${x0} ${surfY} L${x0} ${y1 - ry} A${rx} ${ry} 0 0 0 ${x1} ${y1 - ry} L${x1} ${surfY} Z`}
                fill={colors.accent} fillOpacity={0.15}
              />
              <ellipse cx={cx} cy={surfY} rx={rx} ry={ry} fill={colors.accent} fillOpacity={0.20} />
              <ellipse cx={cx} cy={surfY} rx={rx} ry={ry} fill="none" stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} opacity={0.92} />
            </g>
          ) : null}

          {/* 반동 — 입자 자취 → 충돌 → 섬광·전하 */}
          {isRecoil ? (
            <g>
              <Tube d={`M${sx} ${sy} L${px} ${py}`} w={DIAGRAM.w.guide}
                outline={SPACE_TUBE.outline} core={SPACE_TUBE.core} highlight={SPACE_TUBE.highlight} opacity={0.9} />
              <circle cx={nx} cy={ny} r={13} fill={SPACE_TUBE.highlight} opacity={0.55 + 0.45 * hit} />
              {hit > 0.01 ? (
                <g filter="url(#dg_glow)" opacity={hit}>
                  <circle cx={nx} cy={ny} r={18 + 46 * hit} fill={colors.accent} fillOpacity={0.30 * (1 - hit * 0.55)} />
                  {/* 두 갈래 — 기사가 말하는 「미세한 섬광과 전하 흐름」(facts #19). 하나만 그리면 축약이다 */}
                  <path d={`M${nx} ${ny} L${nx - 84} ${ny - 66}`} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} strokeLinecap="round" />
                  <path d={`M${nx} ${ny} L${nx + 92} ${ny + 54}`} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} strokeLinecap="round" />
                </g>
              ) : null}
            </g>
          ) : null}

          {/* 원통 — 옆선 두 개 + 위·아래 타원 */}
          <path d={`M${x0} ${y0 + ry} L${x0} ${y1 - ry}`} stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.sub} strokeLinecap="round" />
          <path d={`M${x1} ${y0 + ry} L${x1} ${y1 - ry}`} stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.sub} strokeLinecap="round" />
          <path d={`M${x0} ${y0 + ry} L${x0} ${y1 - ry}`} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.sub * DIAGRAM.tube.highlight} strokeLinecap="round" opacity={0.95} />
          <path d={`M${x1} ${y0 + ry} L${x1} ${y1 - ry}`} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.sub * DIAGRAM.tube.highlight} strokeLinecap="round" opacity={0.95} />
          <ellipse cx={cx} cy={y1 - ry} rx={rx} ry={ry} fill="none" stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.sub} />
          <ellipse cx={cx} cy={y1 - ry} rx={rx} ry={ry} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.sub * DIAGRAM.tube.highlight} opacity={0.9} />
          <ellipse cx={cx} cy={y0 + ry} rx={rx} ry={ry} fill="rgba(207,227,255,0.05)" stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.sub} />
          <ellipse cx={cx} cy={y0 + ry} rx={rx} ry={ry} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.sub * DIAGRAM.tube.highlight} opacity={0.9} />

          {/* 광증폭관 배열 — 위·아래 두 줄 */}
          {pmtOn ? <g opacity={labOn}>{pmts(y0 + ry + 44, "t")}{pmts(y1 - ry - 44, "b")}</g> : null}
        </g>
      </svg>
    </div>
  );
};

/** energy_window@1 — 에너지 축 위에 **통상 창**과 **확장 창**을 겹쳐 놓고 사건 지점을 찍는다.
 *  축은 **선형**이다 — 로그 축을 쓰면 248 이 270 창 안이라는 사실이 안 보인다.
 *  사건 점은 **하나**다(facts #9 「단 하나」). */
export const EnergyWindow: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    usual_max: number; extended_max: number; event: number; unit?: string;
    usual_label?: string; extended_label?: string; window_in?: number; event_in?: number;
    cx?: number; cy?: number; y?: number;
  };
  const { colors } = style;
  const cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 760);
  const ax0 = 130, ax1 = W - 130, axw = ax1 - ax0;
  const span = p.extended_max * 1.06;
  const X = (v: number) => ax0 + (v / span) * axw;

  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const wF = inF + Math.round((p.window_in ?? 0) * clock.fps);
  const grow1 = clock.anim(wF, durF(0.5, clock.fps));                       // 통상 창
  const grow2 = clock.anim(wF + durF(0.5, clock.fps), durF(0.7, clock.fps)); // 확장 창
  const eF = inF + Math.round((p.event_in ?? 1.2) * clock.fps);
  const evOn = clock.anim(eF, durF(0.35, clock.fps));

  const bandY = cy, bh1 = 46, bh2 = 92;
  const u = p.unit ?? "keV";
  const tick = (v: number, label: string, on: number) => (
    <g key={label} opacity={on}>
      <line x1={X(v)} y1={bandY + bh2 / 2} x2={X(v)} y2={bandY + bh2 / 2 + 22} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} />
    </g>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {/* 확장 창 — 넓은 띠(윤곽만) */}
          <rect x={X(0)} y={bandY - bh2 / 2} width={(X(p.extended_max) - X(0)) * grow2} height={bh2}
            rx={10} fill={colors.accent} fillOpacity={0.10} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
          {/* 통상 창 — 좁은 띠(면색). 두 창은 **0 에서 같이 시작한다** */}
          <rect x={X(0)} y={bandY - bh1 / 2} width={(X(p.usual_max) - X(0)) * grow1} height={bh1}
            rx={8} fill={SPACE_TUBE.core} stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.guide} />
          <rect x={X(0)} y={bandY - bh1 / 2} width={(X(p.usual_max) - X(0)) * grow1} height={bh1}
            rx={8} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={2.5} opacity={0.55} />
          {/* 축 */}
          <line x1={ax0} y1={bandY + bh2 / 2 + 2} x2={ax1} y2={bandY + bh2 / 2 + 2} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} opacity={0.85} />
          {tick(0, "0", grow1)}
          {tick(p.usual_max, "u", grow1)}
          {tick(p.extended_max, "x", grow2)}
          {/* 사건 — 점 하나 */}
          {evOn > 0.01 ? (
            <g filter="url(#dg_glow)" opacity={evOn}>
              <line x1={X(p.event)} y1={bandY - bh2 / 2 - 54} x2={X(p.event)} y2={bandY + bh2 / 2} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
              <circle cx={X(p.event)} cy={bandY} r={16} fill={SPACE_TUBE.highlight} />
            </g>
          ) : null}
        </g>
      </svg>
      {/* 라벨 — 숫자는 축 아래, 창 이름은 띠 위 */}
      <div style={{ position: "absolute", left: 0, top: bandY + bh2 / 2 + 76, width: W, opacity: grow2 }}>
        <div style={{ position: "absolute", left: X(p.usual_max) - 110, width: 220, textAlign: "center", fontSize: 44, fontWeight: 800, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>
          {p.usual_max}
        </div>
        <div style={{ position: "absolute", left: X(p.extended_max) - 110, width: 220, textAlign: "center", fontSize: 44, fontWeight: 800, color: colors.text, textShadow: "0 2px 14px rgba(0,0,0,0.9)", fontVariantNumeric: "tabular-nums" }}>
          {p.extended_max}
        </div>
      </div>
      {/* 라벨은 **창마다** 붙는다. 하나만 붙이면 그 라벨이 넓은 띠를 가리키는 것처럼 읽혀
          「통상 50 미만 / 이번 270 확장」의 대비가 글자로 성립하지 않는다(8편 P7 이슈 5·6) */}
      {p.usual_label ? (
        <div style={{ position: "absolute", left: X(0), top: bandY + bh2 / 2 + 14, whiteSpace: "nowrap", fontSize: 44, fontWeight: 800, color: SPACE_TUBE.highlight, textShadow: "0 2px 14px rgba(0,0,0,0.95)", opacity: grow1 }}>
          {p.usual_label}
        </div>
      ) : null}
      {p.extended_label ? (
        <div style={{ position: "absolute", left: X(p.usual_max), width: X(p.extended_max) - X(p.usual_max), top: bandY - bh2 / 2 - 56, textAlign: "center", fontSize: 44, fontWeight: 800, color: colors.accent, textShadow: "0 2px 14px rgba(0,0,0,0.95)", opacity: grow2 }}>
          {p.extended_label}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: Math.min(W - 380, Math.max(0, X(p.event) - 190)), top: bandY - bh2 / 2 - 148, width: 380, textAlign: "center", opacity: evOn }}>
        <div style={{ fontSize: 76, fontWeight: 900, color: colors.accent, textShadow: "0 2px 20px rgba(0,0,0,0.92)", fontVariantNumeric: "tabular-nums" }}>
          {p.event} {u}
        </div>
      </div>
    </div>
  );
};

/** compare@1 — 두 값을 나란히 세우고 **기준선과의 간격**을 밝힌다.
 *  두 값을 같은 프레임에 둔다 — 2.6 을 혼자 두면 「발견」으로 읽힌다(8편 facts #29).
 *  단위는 한 번만. `gap_in` 은 **새 숫자를 만들지 않는다** — 이미 선 두 값 사이만 밝힌다. */
export const Compare: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    a: { label: string; value: string | number };
    b: { label: string; value: string | number };
    unit?: string; a_in?: number; b_in?: number; gap_in?: number;
    cx?: number; cy?: number; y?: number; scrim?: number;
  };
  const { colors } = style;
  const cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 760);
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const aOn = clock.anim(inF + Math.round((p.a_in ?? 0) * clock.fps), DIAGRAM.fade_f);
  const bOn = clock.anim(inF + Math.round((p.b_in ?? 0.6) * clock.fps), DIAGRAM.fade_f);
  const gapOn = p.gap_in != null ? clock.anim(inF + Math.round(p.gap_in * clock.fps), durF(0.4, clock.fps)) : 0;

  const ax = 300, bx = 760;            // 두 값의 x 중심 — 왼쪽이 이번 값, 오른쪽이 기준
  // 긴 값(「2.6~3.1」)이 컨테이너를 넘어 안전영역을 침범했다(9편 4-3R 실측 x1072) — 글자 수로 크기를 줄인다
  const fz = (v: string | number) => (String(v).length > 4 ? 96 : 132);
  const barY = cy + 96;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      {p.scrim ? <div style={{ position: "absolute", inset: 0, background: "#070A10", opacity: p.scrim }} /> : null}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {/* 기준선 — 오른쪽 값 아래에 선다. 왼쪽은 아직 못 미친다 */}
          <line x1={ax - 130} y1={barY} x2={ax + 130} y2={barY} stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} opacity={0.85 * aOn} />
          <line x1={bx - 130} y1={barY} x2={bx + 130} y2={barY} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} opacity={0.95 * bOn} />
          {/* 간격 — gap_in 일 때만. 새 숫자 없이 두 값 사이만 밝힌다 */}
          {gapOn > 0.01 ? (
            <g opacity={gapOn} filter="url(#dg_glow)">
              <line x1={ax + 140} y1={barY} x2={bx - 140} y2={barY} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} strokeDasharray="18 14" />
              <line x1={ax + 140} y1={barY - 20} x2={ax + 140} y2={barY + 20} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
              <line x1={bx - 140} y1={barY - 20} x2={bx - 140} y2={barY + 20} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
            </g>
          ) : null}
        </g>
      </svg>
      <div style={{ position: "absolute", left: ax - 220, width: 440, top: cy - 96, textAlign: "center", opacity: aOn }}>
        <div style={{ fontSize: fz(p.a.value), fontWeight: 900, lineHeight: 1, color: colors.text, textShadow: "0 2px 22px rgba(0,0,0,0.92)", fontVariantNumeric: "tabular-nums" }}>{p.a.value}</div>
        <div style={{ marginTop: 14, fontSize: 44, fontWeight: 700, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.a.label}</div>
      </div>
      <div style={{ position: "absolute", left: bx - 220, width: 440, top: cy - 96, textAlign: "center", opacity: bOn }}>
        <div style={{ fontSize: fz(p.b.value), fontWeight: 900, lineHeight: 1, color: colors.accent, textShadow: "0 2px 22px rgba(0,0,0,0.92)", fontVariantNumeric: "tabular-nums" }}>{p.b.value}</div>
        <div style={{ marginTop: 14, fontSize: 44, fontWeight: 700, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.b.label}</div>
      </div>
      {/* 단위는 한 번만 */}
      {p.unit ? (
        <div style={{ position: "absolute", left: 0, width: W, top: barY + 26, textAlign: "center", opacity: bOn }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{p.unit}</div>
        </div>
      ) : null}
    </div>
  );
};

/** event_grid@1 — **점 여럿 중 하나**를 보이는 도해. 상태 셋을 한 부품이 잇는다:
 *  scan(b05, 220개가 훑린다) → hit(b06, **하나만 밝다**) → expand(b19, 옆으로 이어진다).
 *
 *  왜 새로 만들었나: `timeline_axis@1` 의 milestone 은 **라벨이지 점이 아니다** — 균등 배치된 글자라
 *  「220개 중 이 하나」를 가리키지 못한다. 8편 P7 판정: *"220개 점이 전부 같은 색·같은 크기다.
 *  「단 하나」를 말하는 건 오직 글자뿐"* — 이 편의 핵심 컷이 그래서 죽었다.
 *  공용 부품을 고치면 3·5편이 흔들리므로 이 편 부품으로 만든다. */
export const EventGrid: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    state?: "scan" | "hit" | "expand"; n?: number; highlight?: number | null;
    label?: string; label_in?: number; marks_in?: number; grow_sec?: number;
    start_label?: string; end_label?: string; y?: number; seed?: number;
  };
  const { colors } = style;
  const cy = p.y != null ? Math.round(p.y * H) : 760;
  const x0 = 110, x1 = W - 190;   // 우측 여유 — expand 꼬리(+80)가 안전영역 1000 을 넘지 않게(P7 N5)
  const n = p.n ?? 220;
  const state = p.state ?? "scan";
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const mF = inF + Math.round((p.marks_in ?? 0) * clock.fps);
  const grow = clock.lin(mF, durF(p.grow_sec ?? 1.4, clock.fps), 0, 1);
  // expand 는 왼쪽부터 다시 차오르지 않는다 — 이미 찬 밭 **오른쪽으로** 이어진다
  const shown = state === "expand" ? n : Math.max(1, Math.round(n * grow));
  const extra = state === "expand" ? Math.round(n * 0.45 * grow) : 0;
  const r = rand(p.seed ?? 19);
  const band = 150;                                   // 점 밭 세로 폭
  const marks = Array.from({ length: n }, (_, i) => ({
    x: x0 + (i / (n - 1)) * (x1 - x0),
    y: cy - band / 2 + r() * band,
    rad: 2.4 + r() * 2.2,
  }));
  const hi = p.highlight != null ? marks[Math.min(n - 1, Math.max(0, p.highlight))] : null;
  const hitOn = state === "scan" ? 0 : clock.anim(mF + durF(0.2, clock.fps), durF(0.45, clock.fps));
  const labOn = clock.anim(inF + Math.round((p.label_in ?? 0.4) * clock.fps), DIAGRAM.fade_f);
  const ex = Array.from({ length: extra }, (_, i) => ({
    x: x1 + 6 + (i / Math.max(1, extra - 1)) * 70,   // 오른쪽 끝 밖으로 이어지는 꼬리
    y: cy - band / 2 + r() * band, rad: 2.0 + r() * 1.8,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: appear }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <DiagramDefs />
        <g filter="url(#dg_lift)">
          {marks.slice(0, shown).map((m, i) =>
            i === p.highlight && hitOn > 0.01 ? null : (
              <circle key={i} cx={m.x} cy={m.y} r={m.rad} fill={colors.text} opacity={0.30 - 0.14 * hitOn} />
            ))}
          {ex.map((m, i) => <circle key={`e${i}`} cx={m.x} cy={m.y} r={m.rad} fill={colors.text} opacity={0.22} />)}
          <line x1={x0} y1={cy + band / 2 + 26} x2={x1 + (extra ? 80 : 0)} y2={cy + band / 2 + 26}
            stroke={SPACE_TUBE.highlight} strokeWidth={DIAGRAM.w.guide} opacity={0.55} />
          {/* 지목된 하나 — 밝고, 크고, 눈금이 선다. 나머지는 그 사이 더 어두워진다 */}
          {hi && hitOn > 0.01 ? (
            <g filter="url(#dg_glow)" opacity={hitOn}>
              <line x1={hi.x} y1={hi.y} x2={hi.x} y2={cy + band / 2 + 26} stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} />
              <circle cx={hi.x} cy={hi.y} r={7 + 11 * hitOn} fill={colors.accent} />
              <circle cx={hi.x} cy={hi.y} r={7 + 11 * hitOn} fill="none" stroke={SPACE_TUBE.highlight} strokeWidth={3} />
            </g>
          ) : null}
        </g>
      </svg>
      {p.start_label ? (
        <div style={{ position: "absolute", left: x0, top: cy + band / 2 + 40, fontSize: 44, fontWeight: 800,
          color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)", opacity: labOn }}>{p.start_label}</div>
      ) : null}
      {p.end_label ? (
        <div style={{ position: "absolute", right: 110, top: cy + band / 2 + 40, fontSize: 44, fontWeight: 800,
          color: colors.muted, textShadow: "0 2px 14px rgba(0,0,0,0.9)", opacity: labOn }}>{p.end_label}</div>
      ) : null}
      {/* 라벨은 점 밭 **위**에 — 밭 안에 두면 점이 글자를 관통한다(P7 이슈 8) */}
      {p.label ? (
        <div style={{ position: "absolute", left: 0, width: W, top: cy - band / 2 - 112, textAlign: "center",
          opacity: state === "scan" ? labOn : hitOn }}>
          <div style={{ fontSize: 68, fontWeight: 900, color: state === "scan" ? colors.text : colors.accent,
            textShadow: "0 2px 20px rgba(0,0,0,0.92)", fontVariantNumeric: "tabular-nums" }}>{p.label}</div>
        </div>
      ) : null}
    </div>
  );
};

/** mass_ratio@1 — **배수를 크기가 아니라 개수로** 그린다.
 *  기준(양성자) 1개 옆에 같은 크기 점이 줄지어 채워지고, 축약 기호가 나머지를 말한다.
 *
 *  왜 크기가 아닌가: 원·구를 200배 크게 그리면 지름인지 면적인지 부피인지가 갈린다.
 *    이 편 facts #13(D3)이 이미 100배↔200배 혼동을 금지하고 있어 이중으로 피해야 한다.
 *  왜 다 안 그리나: 3.7초에 200개는 세어지지 않는다. 점 몇 개 + 축약 + 도달 라벨의 3단이
 *    「많이 늘었다」는 방향성을 주고, 정확한 배수는 라벨이 확정한다.
 *  근거: sourcing 도판 회신 2026-09-04 — Isotype(Otto Neurath) 규칙 「키우지 말고 세라」.
 *    입자물리 공통 도상도 질량을 크기가 아니라 로그축 위 위치로 둔다(arXiv:2609.02608 Fig.2~4 · Commons Particle_chart_Log.svg).
 *  금지: 저울·시소 비유(근거 없는 은유), 충돌 도해 차용(그건 검출 원리이지 질량비가 아니다). */
export const MassRatio: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    unit_label?: string; ratio_label?: string;
    shown?: number; per_row?: number; count_in?: number; step_sec?: number;
    cx?: number; y?: number; cy?: number; w_px?: number;
  };
  const { colors } = style;
  const cx = p.cx ?? 540;
  const cy = p.y != null ? Math.round(p.y * H) : (p.cy ?? 760);
  const shown = Math.max(1, Math.min(40, p.shown ?? 16));
  const perRow = Math.max(1, p.per_row ?? 8);
  const r = 13, pitch = 52;                       // 기준과 반복 점은 **같은 크기**다
  const rows = Math.ceil(shown / perRow);
  const xLeft = cx - (perRow * pitch) / 2 + pitch / 2;

  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const appear = clock.anim(inF, DIAGRAM.fade_f);
  const countF = inF + Math.round((p.count_in ?? 1.2) * clock.fps);
  const stepF = Math.max(1, Math.round((p.step_sec ?? 0.055) * clock.fps));
  const lit = (i: number) => clock.anim(countF + i * stepF, 4);
  const doneF = countF + shown * stepF;
  // **축약 기호는 점보다 먼저 선다.** 「이건 전부가 아니다」가 먼저 서야 세는 행위가 성립한다 —
  // 다 찬 뒤에 세우면 그 사이 화면은 문자 그대로 「16배」다(shot-judge 2026-09-04: 3.68초 중 1.2초).
  const ell = clock.anim(countF - Math.round(0.15 * clock.fps), 6);
  const tail = clock.anim(doneF, 8);              // 도달 라벨만 다 찬 뒤에 선다

  const refY = cy - 132;                          // 기준 줄
  const rowY = (k: number) => cy - 6 + k * (pitch + 6);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, opacity: appear }}>
      <DiagramDefs />
      {/* 기준 — 이것이 없으면 배수가 아니라 그냥 수량이 된다 */}
      <circle cx={xLeft} cy={refY} r={r} fill={SPACE_TUBE.core} stroke={SPACE_TUBE.outline} strokeWidth={DIAGRAM.w.guide} />
      <circle cx={xLeft} cy={refY} r={r - 4} fill={colors.text} opacity={0.9} />
      <text x={xLeft + r + 22} y={refY + 12} fill={colors.text} fontSize={46} fontWeight={700} opacity={0.92}>
        {p.unit_label ?? "양성자"}
      </text>
      {/* 반복 — 하나씩 켜지는 것이 「센다」를 수행한다 */}
      {Array.from({ length: shown }, (_, i) => {
        const k = Math.floor(i / perRow), c = i % perRow;
        return (
          <circle key={i} cx={xLeft + c * pitch} cy={rowY(k)} r={r}
            fill={colors.accent} fillOpacity={0.28 + 0.62 * lit(i)}
            stroke={colors.accent} strokeWidth={DIAGRAM.w.guide} strokeOpacity={0.85 * lit(i)} />
        );
      })}
      {/* 축약 — **이 기호가 없으면 shown 이 거짓 개수가 된다** */}
      <text x={xLeft + (perRow - 1) * pitch + r + 26} y={rowY(rows - 1) + 16} fill={colors.accent} fontSize={52} fontWeight={800} opacity={0.9 * ell}>
        …
      </text>
      <text x={cx} y={rowY(rows - 1) + 96} textAnchor="middle" fill={colors.accent} fontSize={54} fontWeight={800} opacity={tail}>
        {p.ratio_label ?? "200배 이상"}
      </text>
    </svg>
  );
};
