// 범용 부품 — counter · evidence_card · dot · measure · icon · diagram · veil · reveal · erase
import { Img, interpolate, Easing } from "remotion";
import { usePilotFile } from "../../../pilot/pilot";
import type { Style } from "../../../pilot/types";
import { clamp, W, H, type BeatClock } from "../clock";
import { rand, type GraphicSpec } from "./contracts";


const fmtKo = (n: number) => {
  // ko-compact: 1,760,000 → "176만", 16,000 → "1만 6천"
  if (n >= 10000) {
    const man = Math.floor(n / 10000);
    const rest = n - man * 10000;
    if (rest >= 1000 && man < 10) return `${man}만 ${Math.floor(rest / 1000)}천`;
    return `${man}만`;
  }
  return String(Math.round(n));
};


export const Counter: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const file = usePilotFile();
  const p = spec.props as { from: number; to: number; suffix?: string; duration?: number; center?: { x: number; y: number }; earth?: { file: string; size: number }; dots?: number; label?: string; format?: "ko" | "arabic" };
  const { colors, sizes } = style;
  const inF = Math.round((spec.in ?? 0.2) * clock.fps);
  const durF = Math.round((p.duration ?? 1.4) * clock.fps);
  const prog = clock.textAnim ? interpolate(clock.localFrame, [inF, inF + durF], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  const value = p.from + (p.to - p.from) * prog;
  const cx = p.center?.x ?? 540;
  const cy = p.center?.y ?? 760;
  const size = p.earth?.size ?? 420;
  const n = p.dots ?? 360;
  const rnd = rand(7);
  const dots = Array.from({ length: n }, (_, i) => {
    const a = rnd() * Math.PI * 2;
    const r = size * 0.55 + rnd() * size * 0.55;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.62, s: 3 + rnd() * 4, k: i / n };
  });
  // 숫자 층도 온스크린과 같은 스크림을 쓴다 — 밝고 복잡한 배경(도트 시뮬레이션) 위 가독성 (4-3 검토 2026-08-29)
  const os = style.onscreen;
  const scrimTop = cy + size / 2 - 46;
  const scrimH = sizes.headline * 1.1 + 150;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clock.anim(Math.max(0, inF - 6), 8) }}>
      {os && os.scrim > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scrimTop,
            height: scrimH,
            background: `linear-gradient(180deg, rgba(11,15,26,0) 0%, rgba(11,15,26,${os.scrim}) 26%, rgba(11,15,26,${os.scrim}) 74%, rgba(11,15,26,0) 100%)`,
          }}
        />
      ) : null}
      {p.earth ? (
        <Img src={file(p.earth.file)} style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2, width: size, height: size, maxWidth: "none", filter: "drop-shadow(0 0 40px rgba(120,160,255,0.35))" }} />
      ) : null}
      {dots.map((d, i) =>
        d.k <= prog ? <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: d.s, height: d.s, borderRadius: "50%", background: colors.accent, opacity: 0.85 }} /> : null,
      )}
      {/* 읽는 순서대로: 라벨(무엇의 수인가) → 숫자 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + size / 2 + 24, textAlign: "center" }}>
        {p.label ? <div style={{ fontSize: 42, fontWeight: 700, color: colors.text, marginBottom: 10, textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}>{p.label}</div> : null}
        <div style={{ fontSize: sizes.headline, fontWeight: 800, color: colors.accent, lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,0.85)" }}>
          {p.format === "arabic" ? Math.round(value).toLocaleString("en-US") : fmtKo(value)}
          <span style={{ fontSize: sizes.caption, color: colors.text, fontWeight: 700 }}>{p.suffix ?? ""}</span>
        </div>
      </div>
    </div>
  );
};

export const EvidenceCard: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const file = usePilotFile();
  const p = spec.props as {
    file: string;
    src_size: [number, number];
    crop: { x: number; y: number; w: number; h: number };
    highlight?: { x: number; y: number; w: number; h: number } | null; // 원본 비율
    quote?: string | null; // 카드 아래 인용 구절(원문 그대로)
    source: string;
    x?: number;
    y?: number;
    w?: number;
    doc_opacity?: number; // 문서 크롭을 배경화(0.5 등) — 구절 텍스트가 주인공일 때 (B6)
    quote_size?: number;
  };
  const { colors, safe } = style;
  const w = p.w ?? 920;
  const x = p.x ?? safe.x;
  const y = p.y ?? 620;
  const [sw, sh] = p.src_size;
  const scale = w / (p.crop.w * sw);
  const h = Math.round(p.crop.h * sh * scale);
  const inF = Math.round((spec.in ?? 0.2) * clock.fps);
  const hl = p.highlight;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: clock.anim(inF, 10), translate: `0px ${clock.anim(inF, 10, 30, 0)}px` }}>
      <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: 10, background: "#fff", boxShadow: "0 12px 40px rgba(0,0,0,0.6)", opacity: p.doc_opacity ?? 1 }}>
        <Img src={file(p.file)} style={{ position: "absolute", maxWidth: "none", width: sw * scale, height: sh * scale, left: -p.crop.x * sw * scale, top: -p.crop.y * sh * scale }} />
        {hl ? (
          <div
            style={{
              position: "absolute",
              left: (hl.x - p.crop.x) * sw * scale - 6,
              top: (hl.y - p.crop.y) * sh * scale - 4,
              width: hl.w * sw * scale + 12,
              height: hl.h * sh * scale + 8,
              background: "rgba(255,209,102,0.45)",
              border: "3px solid rgba(255,209,102,0.95)",
              borderRadius: 4,
              scale: `${clock.anim(inF + 8, 10, 0, 1)} 1`,
              transformOrigin: "left center",
            }}
          />
        ) : null}
      </div>
      {p.quote ? (
        <div style={{ marginTop: 18, fontSize: p.quote_size ?? 34, lineHeight: 1.35, color: colors.text, fontWeight: 700, wordBreak: "keep-all", opacity: clock.anim(inF + 10, 8) }}>
          “{p.quote}”
        </div>
      ) : null}
      <div style={{ marginTop: 10, fontSize: 28, color: colors.muted, opacity: clock.anim(inF + 12, 8) }}>{p.source}</div>
    </div>
  );
};

export const Dot: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { x: number; y: number; r?: number; pulse?: boolean; label?: string };
  const { colors } = style;
  const r = p.r ?? 10;
  const inF = Math.round((spec.in ?? 0.3) * clock.fps);
  const period = Math.round(1.2 * clock.fps);
  const ph = clock.textAnim && p.pulse ? (Math.max(0, clock.localFrame - inF) % period) / period : 0.5;
  const glow = 1 + Math.sin(ph * Math.PI * 2) * 0.25;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: clock.anim(inF, 10) }}>
      <div style={{ position: "absolute", left: p.x - r * 5, top: p.y - r * 5, width: r * 10, height: r * 10, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0) 70%)`, scale: String(glow) }} />
      <div style={{ position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: "#fff", boxShadow: `0 0 ${r * 3}px ${r}px rgba(255,255,255,0.8)` }} />
      {p.label ? <div style={{ position: "absolute", left: p.x + r * 3, top: p.y - 20, fontSize: 30, color: colors.text, fontWeight: 700, whiteSpace: "nowrap" }}>{p.label}</div> : null}
    </div>
  );
};

export const Measure: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const file = usePilotFile();
  const p = spec.props as { x?: number; y?: number; unit: number; label_w?: number; a: { label: string; value: number; image?: { file: string; size: number } }; b: { label: string; value: number }; note?: string };
  const { colors, safe } = style;
  const x = p.x ?? safe.x;
  const y = p.y ?? 980;
  const inF = Math.round((spec.in ?? 0.3) * clock.fps);
  const barH = 44;
  const grow = clock.anim(inF + 6, 16, 0, 1);
  const imgSize = p.a.image?.size ?? 120;
  const rowGap = 28;
  const labelW = p.label_w ?? 260;
  const row = (label: string, value: number, i: number, color: string, image?: { file: string; size: number }) => (
    <div key={i} style={{ position: "absolute", left: 0, top: i * (barH + rowGap + 20), height: barH + 20, display: "flex", alignItems: "center", gap: 16 }}>
      {image ? <Img src={file(image.file)} style={{ width: imgSize, height: imgSize, maxWidth: "none", marginLeft: -imgSize * 0.1 }} /> : <div style={{ width: imgSize }} />}
      <div style={{ width: labelW - imgSize, fontSize: 32, fontWeight: 700, color: colors.text, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ height: barH, width: p.unit * value * grow, background: color, borderRadius: 8 }} />
      <div style={{ fontSize: 40, fontWeight: 800, color, marginLeft: 10 }}>{value === 1 ? "1" : `×${value}`}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, right: safe.x, opacity: clock.anim(inF, 10) }}>
      {row(p.a.label, p.a.value, 0, colors.text, p.a.image)}
      {row(p.b.label, p.b.value, 1, colors.accent)}
      {p.note ? <div style={{ position: "absolute", top: 2 * (barH + rowGap + 20) + 6, fontSize: 34, fontWeight: 600, color: colors.text, opacity: 0.9, textShadow: "0 2px 12px rgba(0,0,0,0.8)", whiteSpace: "pre-line", lineHeight: 1.3, maxWidth: 920, wordBreak: "keep-all" }}>{p.note}</div> : null}
    </div>
  );
};

// Tabler Icons (MIT) 경로 — stroke 아이콘, 색·굵기 토큰 주입
const ICONS: Record<string, string[]> = {
  sun: ["M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"],
  satellite: ["M3.707 6.293l2.586 -2.586a1 1 0 0 1 1.414 0l5.586 5.586a1 1 0 0 1 0 1.414l-2.586 2.586a1 1 0 0 1 -1.414 0l-5.586 -5.586a1 1 0 0 1 0 -1.414", "M6 10l-3 3l3 3l3 -3", "M10 6l3 -3l3 3l-3 3", "M12 12l1.5 1.5", "M14.5 17a2.5 2.5 0 0 0 2.5 -2.5", "M15 21a6 6 0 0 0 6 -6"],
  planet: ["M18.816 13.58c2.292 2.138 3.546 4 3.092 4.9c-.745 1.46 -5.783 -.259 -11.255 -3.838c-5.47 -3.579 -9.304 -7.664 -8.56 -9.123c.464 -.91 2.926 -.444 5.803 .805", "M5 12a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"],
  mirror: ["M4 8l8 -4l8 4v8l-8 4l-8 -4z", "M12 4v16"], // 추상 사각 반사판 (실물 아님)
  ground: ["M2 20h20", "M6 20c2 -6 10 -6 12 0"],
};

export const Icon: React.FC<{ name: string; size: number; color: string; stroke?: number }> = ({ name, size, color, stroke = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {(ICONS[name] ?? []).map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

export const Diagram: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { nodes: { icon: string; x: number; y: number; label: string; size?: number }[]; arrows: [number, number][]; title?: string };
  const { colors } = style;
  const inF = Math.round((spec.in ?? 0.3) * clock.fps);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clock.anim(inF, 10) }}>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={colors.accent} />
          </marker>
        </defs>
        {p.arrows.map(([a, b], i) => {
          const A = p.nodes[a];
          const B = p.nodes[b];
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const len = Math.hypot(dx, dy);
          const pad = (A.size ?? 96) / 2 + 14;
          const x1 = A.x + (dx / len) * pad;
          const y1 = A.y + (dy / len) * pad;
          const x2 = B.x - (dx / len) * pad;
          const y2 = B.y - (dy / len) * pad;
          const draw = clock.anim(inF + 8 + i * 8, 14, 0, 1);
          return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * draw} y2={y1 + (y2 - y1) * draw} stroke={colors.accent} strokeWidth={5} strokeLinecap="round" markerEnd={draw > 0.95 ? "url(#arrowhead)" : undefined} />;
        })}
      </svg>
      {p.nodes.map((nd, i) => {
        const s = nd.size ?? 96;
        return (
          <div key={i} style={{ position: "absolute", left: nd.x - s / 2, top: nd.y - s / 2, width: s, textAlign: "center", opacity: clock.anim(inF + i * 6, 8) }}>
            <div style={{ width: s, height: s, borderRadius: "50%", background: "rgba(11,15,26,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={nd.icon} size={s * 0.62} color={colors.text} />
            </div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: colors.text, whiteSpace: "nowrap", translate: `${-(200 - s) / 2}px 0px`, width: 200 }}>{nd.label}</div>
          </div>
        );
      })}
      {p.title ? <div style={{ position: "absolute", left: 0, right: 0, top: Math.min(...p.nodes.map((n) => n.y)) - 130, textAlign: "center", fontSize: 30, color: colors.muted }}>{p.title}</div> : null}
    </div>
  );
};

// veil@1 — 확산광이 겹쳐 밤하늘 전체가 밝아지는 원리(개념 도해).
// 실제 관측 흉내가 아니라 도해다 — shot.label_overlay 로 "개념 도해" 표기 필수(facts).
export const Veil: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as { dots?: number; build_sec?: number; veil_opacity?: number; top_y?: number; height?: number };
  const { colors } = style;
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const durF = Math.max(1, Math.round((p.build_sec ?? 1.6) * clock.fps));
  const prog = clock.textAnim ? interpolate(clock.localFrame, [inF, inF + durF], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  const n = p.dots ?? 220;
  const top = p.top_y ?? 120;
  const h = p.height ?? 900;
  const rnd = rand(11);
  const pts = Array.from({ length: n }, (_, i) => ({ x: rnd() * 1080, y: top + rnd() * h, s: 3 + rnd() * 5, k: i / n }));
  const veil = (p.veil_opacity ?? 0.3) * prog;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clock.anim(Math.max(0, inF - 4), 8) }}>
      {/* 겹칠수록 차오르는 옅은 막 */}
      <div style={{ position: "absolute", left: 0, right: 0, top, height: h, background: `linear-gradient(180deg, rgba(207,227,255,${veil}) 0%, rgba(207,227,255,${veil * 0.75}) 55%, rgba(207,227,255,0) 100%)` }} />
      {pts.map((d, i) =>
        d.k <= prog ? (
          <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: d.s, height: d.s, borderRadius: "50%", background: colors.quote, opacity: 0.5 + 0.4 * (1 - d.k), boxShadow: `0 0 ${d.s * 3}px rgba(207,227,255,0.8)` }} />
        ) : null,
      )}
    </div>
  );
};

// reveal@1 — 어두운 덮개가 중심에서 바깥으로 물러나며 배경을 드러낸다. 배경 사진은 그대로(증거), 덮개만 움직인다.
export const Reveal: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, clock }) => {
  const p = spec.props as { duration?: number; from?: number; to?: number; center?: { x: number; y: number }; cover_opacity?: number };
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const durF = Math.max(1, Math.round((p.duration ?? 2.0) * clock.fps));
  const prog = clock.textAnim || clock.motion ? interpolate(clock.localFrame, [inF, inF + durF], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  const r0 = p.from ?? 0.08, r1 = p.to ?? 1.1;
  const r = (r0 + (r1 - r0) * prog) * 100;
  const cx = p.center?.x ?? 540, cy = p.center?.y ?? 900;
  const a = p.cover_opacity ?? 0.86;
  return <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(11,15,26,0) ${Math.max(0, r - 8)}%, rgba(11,15,26,${a}) ${r + 4}%)` }} />;
};


// erase@1 — 위성 하나가 하늘을 가로지르고, 지나간 경로 위의 별이 꺼진다.
// 대본 C1 「스타링크가 별을 지운다?」를 글자 대신 동작으로. 배경(ELT 타임랩스) 위에 얹는 코드 오버레이 —
// 실제 관측 결과를 흉내 내지 않도록 별은 명백한 도형 점이고, label_overlay 로 도해임을 밝힌다.
export const Erase: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock }> = ({ spec, style, clock }) => {
  const p = spec.props as {
    stars?: number; seed?: number; from?: [number, number]; to?: [number, number];
    band?: number; sweep_sec?: number; trail?: number; area?: [number, number, number, number];
  };
  const { colors } = style;
  const inF = clock.fps * (spec.in ?? 0);
  const durF = clock.fps * (p.sweep_sec ?? 2);
  const prog = clock.lin(Math.round(inF), Math.round(durF), 0, 1);
  const [x0, y0] = p.from ?? [140, 360];
  const [x1, y1] = p.to ?? [960, 1180];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const band = p.band ?? 120;
  const [ax, ay, aw, ah] = p.area ?? [100, 300, 880, 900];
  const r = rand(p.seed ?? 7);
  const stars = Array.from({ length: p.stars ?? 84 }, () => {
    const x = ax + r() * aw;
    const y = ay + r() * ah;
    const rad = 2 + r() * 3.2;
    const u = ((x - x0) * dx + (y - y0) * dy) / (len * len);
    const perp = Math.abs((x - x0) * dy - (y - y0) * dx) / len;
    return { x, y, rad, u, hit: perp < band };
  });
  const px = x0 + dx * prog;
  const py = y0 + dy * prog;
  const tail = p.trail ?? 170;
  const tx = px - (dx / len) * tail;
  const ty = py - (dy / len) * tail;
  const flying = prog > 0.001 && prog < 0.999;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      {stars.map((s, i) => {
        const fade = s.hit && prog > s.u ? Math.max(0, 1 - (prog - s.u) * 16) : 1;
        return <circle key={i} cx={s.x} cy={s.y} r={s.rad} fill={colors.text} opacity={0.8 * fade} />;
      })}
      {flying ? (
        <>
          <line x1={tx} y1={ty} x2={px} y2={py} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" opacity={0.95} />
          <circle cx={px} cy={py} r={7} fill={colors.text} />
        </>
      ) : null}
    </svg>
  );
};
