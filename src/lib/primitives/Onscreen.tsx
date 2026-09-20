import React from "react";
import { Img } from "remotion";
import { usePilotFile } from "../../pilot/pilot";
import type { Style } from "../../pilot/types";
import { H, type BeatClock } from "./clock";
import { rand, type GraphicSpec } from "./Graphics";

// 온스크린 카드 부품 (layer: overlays) — 대본 「자막(온스크린 텍스트)」 열의 문구를 컷 성격에 맞는 조판으로 앉힌다.
// 문구는 원문 그대로. 조판(크기·구조·등장 순서)은 우리 몫 (사용자 2026-08-29).
// 등장 타이밍은 낱말 단위: 각 요소의 in(초, 비트 시작 기준) = 내레이션에서 그 말을 하는 순간.
//   hook_title@1 · stat_block@1 · quote_slab@1 · cta_bar@1
// 2026-08-30 「텍스트 걷어내기」: 문구를 그대로 띄우던 3종을 그림으로 바꿨다 —
//   arrow_step@1 → timeline_axis@1 (연도 축 + 점 증가) · equation_block@1 → threshold@1 (한계선) · bullet_list@1 → icon_strip@1 (아이콘 3칸)
export const ONSCREEN_IDS = new Set(["hook_title@1", "arrow_step@1", "stat_block@1", "equation_block@1", "bullet_list@1", "quote_slab@1", "cta_bar@1", "timeline_axis@1", "threshold@1", "icon_strip@1"]);

const SHADOW = "0 2px 20px rgba(0,0,0,0.85)";
type P = { spec: GraphicSpec; style: Style; clock: BeatClock };
const os1 = (style: Style) =>
  style.onscreen ?? { center_y: 0.4, size: 88, sub_size: 40, weight: 800, scrim: 0.55, scrim_span: 0.34, rise_px: 14, in_frames: 10, line_height: 1.22 };

// 공통 스크림 — 자막의 '밴드'와 다른 언어(가로 전체 그라디언트)로 층을 구분한다
const Scrim: React.FC<{ style: Style; cy: number; op: number; amount?: number; span?: number }> = ({ style, cy, op, amount, span }) => {
  const os = os1(style);
  const a = amount ?? os.scrim;
  if (a <= 0) return null;
  const h = H * (span ?? os.scrim_span);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: cy - h / 2,
        height: h,
        opacity: op,
        background: `linear-gradient(180deg, rgba(11,15,26,0) 0%, rgba(11,15,26,${a}) 26%, rgba(11,15,26,${a}) 74%, rgba(11,15,26,0) 100%)`,
      }}
    />
  );
};

const Frame: React.FC<{ style: Style; cy: number; align?: "center" | "left"; children: React.ReactNode }> = ({ style, cy, align = "center", children }) => (
  <div
    style={{
      position: "absolute",
      left: style.safe.x,
      right: style.safe.x,
      top: cy,
      translate: "0px -50%",
      textAlign: align,
      display: "flex",
      flexDirection: "column",
      alignItems: align === "left" ? "flex-start" : "center",
      gap: 0,
    }}
  >
    {children}
  </div>
);

// 요소 하나의 등장(페이드 + 상승). in 은 비트 시작 기준 초. (훅이 아니다 — map 안에서도 쓴다)
const enter = (clock: BeatClock, style: Style, sec = 0) => {
  const os = os1(style);
  const f = Math.round(sec * clock.fps);
  return { opacity: clock.anim(f, os.in_frames), translate: `0px ${clock.anim(f, os.in_frames, os.rise_px, 0)}px` };
};

// 숫자 + 단위: 숫자는 초대형 accent, 뒤따르는 조사·단위는 작게 흰색
const NumberUnit: React.FC<{ text: string; size: number; style: Style }> = ({ text, size, style }) => {
  // "현재 16,100기" → 현재 / 16,100 / 기,  "10만 기" → 10만 / 기,  "4배" → 4 / 배
  const m = /^(.*?)([0-9][0-9,.]*\s*(?:만|억|천)?)(.*)$/.exec(text.trim());
  const pre = m ? m[1].trim() : "";
  const num = m ? m[2].trim() : text;
  const post = m ? m[3].trim() : "";
  const small = Math.round(size * 0.42);
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
      {pre ? <span style={{ fontSize: small, fontWeight: 800, color: style.colors.text, marginRight: 12 }}>{pre}</span> : null}
      <span style={{ fontSize: size, fontWeight: 900, color: style.colors.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{num}</span>
      {post ? <span style={{ fontSize: small, fontWeight: 800, color: style.colors.text, marginLeft: 8 }}>{post}</span> : null}
    </span>
  );
};

const Chip: React.FC<{ text: string; style: Style; tone?: "accent" | "plain"; size?: number }> = ({ text, style, tone = "accent", size = 40 }) => (
  <span
    style={{
      display: "inline-block",
      fontSize: size,
      fontWeight: 800,
      color: tone === "accent" ? style.colors.accent : style.colors.text,
      background: "rgba(11,15,26,0.55)",
      border: `2px solid ${tone === "accent" ? style.colors.accent : "rgba(255,255,255,0.35)"}`,
      borderRadius: 999,
      padding: "6px 20px",
      letterSpacing: "0.01em",
    }}
  >
    {text}
  </span>
);

// hook_title@1 — 훅: 키워드 칩 → 주장(초대형) → accent 밑줄이 좌→우로 그어진다
export const HookTitle: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as { kicker?: string; kicker_in?: number; title?: string; title_in?: number; y?: number; scrim?: number };
  const os = os1(style);
  const cy = H * (p.y ?? os.center_y);
  const k = enter(clock, style, p.kicker_in ?? 0);
  const t = enter(clock, style, p.title_in ?? 0);
  const swipe = clock.anim(Math.round((p.title_in ?? 0) * clock.fps) + 6, 14);
  return (
    <>
      <Scrim style={style} cy={cy} op={Math.max(k.opacity, t.opacity)} amount={p.scrim} />
      <Frame style={style} cy={cy}>
        {p.kicker ? <div style={{ ...k, fontSize: Math.round(os.size * 0.5), fontWeight: 800, color: style.colors.accent, textShadow: SHADOW, marginBottom: 10 }}>{p.kicker}</div> : null}
        {p.title ? (
          <div style={{ ...t }}>
            <div style={{ fontSize: Math.round(os.size * 1.5), fontWeight: 900, color: style.colors.text, lineHeight: 1.05, textShadow: SHADOW, wordBreak: "keep-all" }}>{p.title}</div>
            <div style={{ height: 6, background: style.colors.accent, marginTop: 14, width: `${Math.round(swipe * 100)}%`, marginLeft: "auto", marginRight: "auto" }} />
          </div>
        ) : null}
      </Frame>
    </>
  );
};

// arrow_step@1 — 전/후: 앞 상태는 칩, 화살표 뒤 결과는 초대형 숫자
export const ArrowStep: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as { before?: string; before_in?: number; arrow?: string; after?: string; after_in?: number; y?: number; scrim?: number; align?: "center" | "left" };
  const os = os1(style);
  const cy = H * (p.y ?? os.center_y);
  const bIn = enter(clock, style, p.before_in ?? 0);
  const aIn = enter(clock, style, p.after_in ?? 0);
  return (
    <>
      <Scrim style={style} cy={cy} op={Math.max(bIn.opacity, aIn.opacity)} amount={p.scrim} />
      <Frame style={style} cy={cy} align={p.align}>
        {p.before ? (
          <div style={{ ...bIn, textShadow: SHADOW }}>
            <Chip text={p.before} style={style} tone="plain" size={Math.round(os.size * 0.46)} />
          </div>
        ) : null}
        {p.after ? (
          <div style={{ ...aIn, display: "flex", alignItems: "center", gap: 18, marginTop: p.before ? 18 : 0, textShadow: SHADOW }}>
            <span style={{ fontSize: Math.round(os.size * 0.9), fontWeight: 900, color: style.colors.accent, lineHeight: 1 }}>{p.arrow ?? "→"}</span>
            <NumberUnit text={p.after} size={Math.round(os.size * 1.5)} style={style} />
          </div>
        ) : null}
      </Frame>
    </>
  );
};

// stat_block@1 — 수치가 주인공: 비교 대상은 작게, 값은 초대형, 전제는 아래 작게
export const StatBlock: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as {
    lead?: string; lead_in?: number; compare?: string; value?: string; value_in?: number; tail?: string; sub?: string; sub_in?: number; y?: number; scrim?: number;
    bar?: { a: { label: string; value: number; image?: { file: string; size: number } }; b: { label: string; value: number }; unit?: number; in?: number };
  };
  const os = os1(style);
  const cy = H * (p.y ?? os.center_y);
  const l = enter(clock, style, p.lead_in ?? 0);
  const v = enter(clock, style, p.value_in ?? 0);
  const sv = enter(clock, style, p.sub_in ?? p.value_in ?? 0); // 4편: sub 도 낱말 시각(#16 '양산 시')
  return (
    <>
      <Scrim style={style} cy={cy} op={Math.max(l.opacity, v.opacity)} amount={p.scrim} />
      <Frame style={style} cy={cy}>
        {p.lead ? <div style={{ ...l, fontSize: Math.round(os.size * 0.5), fontWeight: 800, color: style.colors.text, opacity: 0.9, textShadow: SHADOW }}>{p.lead}</div> : null}
        {p.value ? (
          <div style={{ ...v, display: "flex", alignItems: "baseline", gap: 14, marginTop: 14, textShadow: SHADOW }}>
            {p.compare ? <span style={{ fontSize: Math.round(os.size * 0.62), fontWeight: 700, color: style.colors.text }}>{p.compare}</span> : null}
            <NumberUnit text={p.value} size={Math.round(os.size * 1.7)} style={style} />
            {p.tail ? <span style={{ fontSize: Math.round(os.size * 0.62), fontWeight: 700, color: style.colors.text }}>{p.tail}</span> : null}
          </div>
        ) : null}
        {p.sub ? <div style={{ ...sv, fontSize: os.sub_size, fontWeight: 600, color: style.colors.text, opacity: Math.min(0.85, (sv.opacity as number ?? 1)), marginTop: 12, textShadow: SHADOW }}>{p.sub}</div> : null}
        {p.bar ? <CompareBars bar={p.bar} style={style} clock={clock} /> : null}
      </Frame>
    </>
  );
};

// stat_block 안의 비교 막대 — 같은 사실(달 1 : 위성 4)을 그림으로. 별도 부품(measure@1)과 한 비트에 같이 두지 않는다.
const CompareBars: React.FC<{ bar: NonNullable<{ a: { label: string; value: number; image?: { file: string; size: number } }; b: { label: string; value: number }; unit?: number; in?: number }>; style: Style; clock: BeatClock }> = ({ bar, style, clock }) => {
  const file = usePilotFile();
  const inF = Math.round((bar.in ?? 0) * clock.fps);
  const grow = clock.anim(inF, 16);
  const op = clock.anim(inF, 8);
  const unit = bar.unit ?? 120;
  const barH = 44;
  const Row = ({ label, value, image, accent }: { label: string; value: number; image?: { file: string; size: number }; accent: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, height: Math.max(barH, image?.size ?? 0) }}>
      <div style={{ width: 120, display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
        {image ? <Img src={file(image.file)} style={{ width: image.size, height: image.size, maxWidth: "none" }} /> : null}
        <span style={{ fontSize: 30, fontWeight: 700, color: style.colors.text, whiteSpace: "nowrap" }}>{label}</span>
      </div>
      <div style={{ width: Math.round(unit * value * grow), height: barH, borderRadius: 8, background: accent ? style.colors.accent : "rgba(255,255,255,0.85)" }} />
      <span style={{ fontSize: 34, fontWeight: 900, color: accent ? style.colors.accent : style.colors.text, opacity: grow > 0.95 ? 1 : 0 }}>{accent ? `×${value}` : `${value}`}</span>
    </div>
  );
  return (
    <div style={{ marginTop: 26, opacity: op, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
      <Row label={bar.a.label} value={bar.a.value} image={bar.a.image} accent={false} />
      <Row label={bar.b.label} value={bar.b.value} accent />
    </div>
  );
};

// equation_block@1 — 좌변(수치) → '=' 칩이 얹힌 구분선 → 우변(뜻)
export const EquationBlock: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as {
    lhs: string; lhs_in?: number; rhs: string; rhs_in?: number; sign?: string; y?: number; scrim?: number;
    evidence?: { file: string; src_size: [number, number]; crop: { x: number; y: number; w: number; h: number }; quote?: string; source?: string; in?: number };
  };
  const os = os1(style);
  const cy = H * (p.y ?? os.center_y);
  const l = enter(clock, style, p.lhs_in ?? 0);
  const r = enter(clock, style, p.rhs_in ?? 0);
  const grow = clock.anim(Math.round((p.rhs_in ?? 0) * clock.fps), 12);
  return (
    <>
      <Scrim style={style} cy={cy} op={Math.max(l.opacity, r.opacity)} amount={p.scrim} />
      <Frame style={style} cy={cy}>
        <div style={{ ...l, textShadow: SHADOW }}>
          <NumberUnit text={p.lhs} size={Math.round(os.size * 1.7)} style={style} />
        </div>
        <div style={{ position: "relative", width: `${Math.round(grow * 62)}%`, height: 3, background: style.colors.accent, opacity: 0.75, margin: "20px 0" }} />
        <div style={{ ...r, display: "flex", alignItems: "center", gap: 16, textShadow: SHADOW }}>
          <span style={{ fontSize: Math.round(os.size * 0.6), fontWeight: 900, color: style.colors.accent }}>{p.sign ?? "="}</span>
          <span style={{ fontSize: Math.round(os.size * 0.82), fontWeight: 800, color: style.colors.text, wordBreak: "keep-all" }}>{p.rhs}</span>
        </div>
        {p.evidence ? <EvidenceStrip ev={p.evidence} style={style} clock={clock} /> : null}
      </Frame>
    </>
  );
};

// equation_block 안의 근거 스트립 — 문서 크롭 + 인용 구절 + 소출처. 같은 사실의 근거를 같은 비트에.
const EvidenceStrip: React.FC<{ ev: NonNullable<{ file: string; src_size: [number, number]; crop: { x: number; y: number; w: number; h: number }; quote?: string; source?: string; in?: number }>; style: Style; clock: BeatClock }> = ({ ev, style, clock }) => {
  const file = usePilotFile();
  const inF = Math.round((ev.in ?? 0) * clock.fps);
  const op = clock.anim(inF, 10);
  const W = 920;
  const scale = W / (ev.src_size[0] * ev.crop.w);
  const h = Math.round(ev.src_size[1] * ev.crop.h * scale);
  return (
    <div style={{ marginTop: 26, width: W, opacity: op, textAlign: "left" }}>
      <div style={{ width: W, height: h, overflow: "hidden", borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)", background: "#fff", opacity: 0.6 }}>
        <Img src={file(ev.file)} style={{ width: ev.src_size[0] * scale, height: ev.src_size[1] * scale, maxWidth: "none", translate: `${-ev.crop.x * ev.src_size[0] * scale}px ${-ev.crop.y * ev.src_size[1] * scale}px` }} />
      </div>
      {ev.quote ? <div style={{ marginTop: 10, fontSize: 32, fontWeight: 700, color: style.colors.text, lineHeight: 1.3, textShadow: SHADOW }}>“{ev.quote}”</div> : null}
      {ev.source ? <div style={{ marginTop: 4, fontSize: 24, color: style.colors.muted }}>{ev.source}</div> : null}
    </div>
  );
};

// bullet_list@1 — 항목 나열: accent 사각 불릿 + 기준선, 항목마다 제 시각에 등장
export const BulletList: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as { items: { text: string; in?: number }[]; y?: number; scrim?: number };
  const os = os1(style);
  const cy = H * (p.y ?? os.center_y);
  const ops = p.items.map((it) => enter(clock, style, it.in ?? 0));
  return (
    <>
      <Scrim style={style} cy={cy} op={Math.max(...ops.map((o) => o.opacity))} amount={p.scrim} />
      <Frame style={style} cy={cy} align="left">
        {p.items.map((it, i) => (
          <div key={i} style={{ ...ops[i], display: "flex", alignItems: "center", gap: 20, marginTop: i ? 20 : 0, textShadow: SHADOW }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: style.colors.accent, flex: "none" }} />
            <span style={{ fontSize: Math.round(os.size * 0.86), fontWeight: 800, color: style.colors.text, wordBreak: "keep-all" }}>{it.text}</span>
          </div>
        ))}
      </Frame>
    </>
  );
};

// quote_slab@1 — 선언·인용: 왼쪽 accent 기둥 + 줄별 등장 (따옴표 없음 — facts #27)
export const QuoteSlab: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as { lines: { text: string; in?: number }[]; y?: number; scrim?: number };
  const os = os1(style);
  const cy = H * (p.y ?? os.center_y);
  const ops = p.lines.map((l) => enter(clock, style, l.in ?? 0));
  const bar = clock.anim(Math.round((p.lines[0]?.in ?? 0) * clock.fps), 14);
  return (
    <>
      <Scrim style={style} cy={cy} op={Math.max(...ops.map((o) => o.opacity))} amount={p.scrim} />
      <Frame style={style} cy={cy} align="left">
        <div style={{ display: "flex", gap: 26, alignItems: "stretch" }}>
          <div style={{ width: 6, background: style.colors.accent, borderRadius: 3, opacity: 0.9, scale: `1 ${bar}`, transformOrigin: "top" }} />
          <div>
            {p.lines.map((l, i) => (
              <div key={i} style={{ ...ops[i], fontSize: Math.round(os.size * 1.12), fontWeight: 800, color: style.colors.text, lineHeight: 1.22, letterSpacing: "0.01em", textShadow: SHADOW, wordBreak: "keep-all" }}>
                {l.text}
              </div>
            ))}
          </div>
        </div>
      </Frame>
    </>
  );
};

// cta_bar@1 — 마무리: 알약 테두리 안에 한 줄
export const CtaBar: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as { text: string; in?: number; y?: number; scrim?: number };
  const os = os1(style);
  const cy = H * (p.y ?? os.center_y);
  const a = enter(clock, style, p.in ?? 0);
  return (
    <>
      <Scrim style={style} cy={cy} op={a.opacity} amount={p.scrim} span={0.2} />
      <Frame style={style} cy={cy}>
        <div style={{ ...a, textShadow: SHADOW }}>
          <Chip text={p.text} style={style} tone="accent" size={Math.round(os.size * 0.78)} />
        </div>
      </Frame>
    </>
  );
};


// ── 2026-08-30 텍스트 걷어내기: 대본 자막을 글자 대신 그림으로 ─────────────────────────

// timeline_axis@1 — 대본 C2 「2019년 스타링크 발사 → 현재 16,100기」
// 연도 축 위에 점이 좌→우로 불어나고 끝에서 숫자가 멈춘다. 남는 글자는 연도와 숫자뿐.
export const TimelineAxis: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as {
    y?: number; start_label?: string; dots?: number; dots_in?: number; grow_sec?: number;
    value?: string; value_in?: number; scrim?: number; seed?: number;
    milestones?: { label: string; value?: string; in?: number; dots?: number; grow_sec?: number }[]; sub?: string; sub_in?: number; // 3편: 연도 눈금 3개(2028·2030·2035) + 전제 라벨("회사 계획·목표", facts #12–14)
  };
  const os = os1(style);
  const cy = H * (p.y ?? 0.52);
  const ms = p.milestones ?? [];
  const msX = (i: number) => (ms.length <= 1 ? (style.safe.x + 1080 - style.safe.x) / 2 : style.safe.x + 90 + ((1080 - 2 * style.safe.x - 180) * i) / (ms.length - 1));
  const msOps = ms.map((m) => enter(clock, style, m.in ?? 0));
  const subOp = enter(clock, style, p.sub_in ?? 0);
  const x0 = style.safe.x;
  const x1 = 1080 - style.safe.x;
  const ms0 = p.milestones ?? [];
  // milestone별 dots가 있으면 연도마다 수치가 늘어나는 만큼 점이 누적된다(사용자 2026-08-30). 없으면 기존 방식(총량이 grow_sec 동안 차오름)
  const stepped = ms0.length > 0 && ms0.some((m) => m.dots != null);
  const total = stepped ? Math.max(...ms0.map((m) => m.dots ?? 0), 1) : (p.dots ?? 1);
  let n: number;
  if (stepped) {
    const t = clock.textAnim ? clock.localFrame / clock.fps : 1e9;
    let cur = 0, prev = 0;
    for (const m of ms0) {
      const mi = m.in ?? 0, target = m.dots ?? 0, gs = m.grow_sec ?? 0.6;
      if (t >= mi) { cur = mi + gs > t ? prev + (target - prev) * ((t - mi) / gs) : target; prev = target; }
    }
    n = Math.round(cur);
  } else {
    const grow = clock.lin(Math.round((p.dots_in ?? 0) * clock.fps), Math.round((p.grow_sec ?? 1.6) * clock.fps), 0, 1);
    n = (p.dots ?? 1) === 0 ? 0 : Math.max(1, Math.round(total * grow));
  }
  const r = rand(p.seed ?? 23);
  const dots = Array.from({ length: total }, (_, i) => ({
    x: total === 1 ? x0 : x0 + (i / (total - 1)) * (x1 - x0) + (r() - 0.5) * 10,
    y: cy - 16 - r() * 96,
    rad: 2.6 + r() * 2.6,
  })).map((d) => (stepped ? { ...d, y: cy - 14 - r() * 64, rad: 2.2 + r() * 2.2 } : d)); // stepped: 점 띠는 축 바로 위 64px — milestone 숫자(위쪽)와 겹치지 않게
  // stepped: 점이 축을 따라 왼쪽부터 차오르게(연도 순) x로 정렬
  if (stepped) dots.sort((a, b) => a.x - b.x);
  const v = enter(clock, style, p.value_in ?? 0);
  const axisIn = clock.anim(0, os.in_frames);
  return (
    <>
      <Scrim style={style} cy={cy - 40} op={axisIn} amount={p.scrim} span={0.3} />
      <svg width={1080} height={H} viewBox={`0 0 1080 ${H}`} style={{ position: "absolute", inset: 0, opacity: axisIn }}>
        {total === 1 && !stepped && (p.dots ?? 1) !== 0 ? <circle cx={dots[0].x} cy={dots[0].y} r={22} fill={style.colors.accent} opacity={0.22} /> : null}
        {dots.slice(0, n).map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={total === 1 ? 10 : d.rad} fill={style.colors.accent} opacity={0.9} />)}
        <line x1={x0} y1={cy} x2={x1} y2={cy} stroke={style.colors.text} strokeWidth={2} opacity={0.45} />
        <line x1={x0} y1={cy - 12} x2={x0} y2={cy + 12} stroke={style.colors.text} strokeWidth={3} opacity={0.8} />
      </svg>
      {p.start_label ? (
        <div style={{ position: "absolute", left: x0, top: cy + 20, fontSize: Math.round(os.size * 0.4), fontWeight: 800, color: style.colors.text, opacity: 0.85 * axisIn, textShadow: SHADOW }}>{p.start_label}</div>
      ) : null}
      {p.value ? (
        <div style={{ ...v, position: "absolute", right: style.safe.x, top: cy - 210, textAlign: "right", textShadow: SHADOW }}>
          <NumberUnit text={p.value} size={Math.round(os.size * 1.5)} style={style} />
        </div>
      ) : null}
      {ms.map((m, i) => (
        <div key={i} style={{ ...msOps[i], position: "absolute", left: msX(i) - 200, width: 400, textAlign: "center", top: cy - 196, textShadow: SHADOW }}>
          {m.value ? <div><NumberUnit text={m.value} size={Math.round(os.size * 0.95)} style={style} /></div> : null}
          <div style={{ width: 3, height: 20, background: style.colors.text, opacity: 0.8, margin: "8px auto 0" }} />
          <div style={{ fontSize: Math.round(os.size * 0.48), fontWeight: 800, color: style.colors.text, marginTop: 84 }}>{m.label}</div>
        </div>
      ))}
      {p.sub ? (
        <div style={{ ...subOp, position: "absolute", left: 0, right: 0, top: cy + 130, textAlign: "center", fontSize: os.sub_size, fontWeight: 700, color: style.colors.text, opacity: 0.85 * subOp.opacity, textShadow: SHADOW }}>{p.sub}</div>
      ) : null}
    </>
  );
};

// threshold@1 — 대본 C5 「"10만 기 = 천문학 연구의 한계선"」
// 위성이 아래에서 차올라 선에 닿는 순간 선 위 하늘이 덮인다. 남는 글자는 '10만' 하나.
export const Threshold: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as {
    y?: number; label?: string; label_in?: number; fill_in?: number; fill_sec?: number;
    over_in?: number; dots?: number; seed?: number; scrim?: number;
  };
  const os = os1(style);
  const lineY = H * (p.y ?? 0.44);
  const x0 = style.safe.x;
  const x1 = 1080 - style.safe.x;
  const bottom = H * 0.78;
  const fill = clock.lin(Math.round((p.fill_in ?? 0.3) * clock.fps), Math.round((p.fill_sec ?? 1.8) * clock.fps), 0, 1);
  const over = clock.anim(Math.round((p.over_in ?? 2.3) * clock.fps), 14);
  const total = p.dots ?? 260;
  const r = rand(p.seed ?? 41);
  const dots = Array.from({ length: total }, () => ({ x: x0 + r() * (x1 - x0), q: r(), rad: 2 + r() * 2.6 }));
  const top = bottom - (bottom - lineY) * fill;
  const l = enter(clock, style, p.label_in ?? 0);
  return (
    <>
      <svg width={1080} height={H} viewBox={`0 0 1080 ${H}`} style={{ position: "absolute", inset: 0 }}>
        {/* 선 위 하늘이 덮인다 = 관측 불가 */}
        <rect x={0} y={0} width={1080} height={lineY} fill={style.colors.bg} opacity={0.62 * over} />
        {dots.map((d, i) => {
          const y = bottom - (bottom - top) * d.q;
          return y >= top ? <circle key={i} cx={d.x} cy={y} r={d.rad} fill={style.colors.accent} opacity={0.82} /> : null;
        })}
        <line x1={x0} y1={lineY} x2={x1} y2={lineY} stroke={style.colors.accent} strokeWidth={3 + 4 * over} strokeDasharray={over > 0.5 ? "0" : "14 10"} opacity={0.95} />
      </svg>
      {p.label ? (
        <div style={{ ...l, position: "absolute", left: style.safe.x, top: lineY - 130, textShadow: SHADOW }}>
          <NumberUnit text={p.label} size={Math.round(os.size * 1.3)} style={style} />
        </div>
      ) : null}
    </>
  );
};

// icon_strip@1 — 대본 C6 「소행성 감시 ↓ · 생태계 교란 · 대기질 저하」
// 세 칸이 자리를 먼저 잡고, 해당 말을 하는 순간 그 칸이 켜진다. 비트를 넘어 이어진다(b18 → b19).
const StripIcon: React.FC<{ kind: string; color: string; on: number }> = ({ kind, color, on }) => (
  <svg width={164} height={164} viewBox="-50 -50 100 100" style={{ opacity: 0.32 + 0.68 * on }}>
    {kind === "asteroid" ? (
      <>
        <path d="M -30 2 L -20 -26 L 4 -34 L 27 -18 L 32 6 L 16 28 L -10 32 L -28 18 Z" fill="none" stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <circle cx={-8} cy={-6} r={5} fill={color} opacity={0.55} />
        <circle cx={12} cy={10} r={3.4} fill={color} opacity={0.55} />
      </>
    ) : null}
    {kind === "bio" ? (
      <>
        <ellipse cx={-17} cy={-6} rx={16} ry={23} fill="none" stroke={color} strokeWidth={5} transform="rotate(-18 -17 -6)" />
        <ellipse cx={17} cy={-6} rx={16} ry={23} fill="none" stroke={color} strokeWidth={5} transform="rotate(18 17 -6)" />
        <line x1={0} y1={-28} x2={0} y2={28} stroke={color} strokeWidth={5} strokeLinecap="round" />
      </>
    ) : null}
    {kind === "air" ? (
      <>
        <path d="M -32 -16 q 16 -12 32 0 q 16 12 32 0" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
        <path d="M -32 2 q 16 -12 32 0 q 16 12 32 0" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
        <path d="M -32 20 q 16 -12 32 0 q 16 12 32 0" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
      </>
    ) : null}
  </svg>
);

export const IconStrip: React.FC<P> = ({ spec, style, clock }) => {
  const p = spec.props as { items: { icon: string; text?: string; in?: number | null }[]; y?: number; scrim?: number };
  const os = os1(style);
  const cy = H * (p.y ?? 0.42);
  const items = p.items ?? [];
  const anyOn = Math.max(0, ...items.map((it) => (it.in == null ? 0 : clock.anim(Math.round(it.in * clock.fps), os.in_frames))));
  return (
    <>
      <Scrim style={style} cy={cy} op={anyOn} amount={p.scrim ?? 0.6} span={0.3} />
      <div style={{ position: "absolute", left: style.safe.x, right: style.safe.x, top: cy, translate: "0px -50%", display: "flex", justifyContent: "space-between" }}>
        {items.map((it, i) => {
          const on = it.in == null ? 0 : clock.anim(Math.round(it.in * clock.fps), os.in_frames);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, translate: `0px ${clock.anim(it.in == null ? 1e6 : Math.round(it.in * clock.fps), os.in_frames, os.rise_px, 0)}px` }}>
              <StripIcon kind={it.icon} color={on > 0.5 ? style.colors.accent : style.colors.muted} on={on} />
              {it.text ? (
                <div style={{ fontSize: Math.max(44, Math.round(os.size * 0.5)), fontWeight: 800, color: on > 0.5 ? style.colors.text : style.colors.muted, opacity: 0.4 + 0.6 * on, textShadow: SHADOW, whiteSpace: "nowrap" }}>{it.text}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
};

export const OnscreenByType: React.FC<P> = ({ spec, style, clock }) => {
  switch (spec.id) {
    case "hook_title@1":
      return <HookTitle spec={spec} style={style} clock={clock} />;
    case "arrow_step@1":
      return <ArrowStep spec={spec} style={style} clock={clock} />;
    case "stat_block@1":
      return <StatBlock spec={spec} style={style} clock={clock} />;
    case "equation_block@1":
      return <EquationBlock spec={spec} style={style} clock={clock} />;
    case "bullet_list@1":
      return <BulletList spec={spec} style={style} clock={clock} />;
    case "quote_slab@1":
      return <QuoteSlab spec={spec} style={style} clock={clock} />;
    case "timeline_axis@1":
      return <TimelineAxis spec={spec} style={style} clock={clock} />;
    case "threshold@1":
      return <Threshold spec={spec} style={style} clock={clock} />;
    case "icon_strip@1":
      return <IconStrip spec={spec} style={style} clock={clock} />;
    case "cta_bar@1":
      return <CtaBar spec={spec} style={style} clock={clock} />;
    default:
      return null;
  }
};
