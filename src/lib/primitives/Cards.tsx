import { AbsoluteFill } from "remotion";
import type { Beat, Card, Overlay, Style } from "../../pilot/types";
import type { GraphicSpec } from "./Graphics";
import { H, tokenize, type BeatClock } from "./clock";

// 텍스트 카드 부품 (layer: overlays)
//   headline@1  — 훅: 프레임 0 노출(8f settle), y top_y, 키워드만 강조. 킥커는 사용자 결정(현재 없음)
//   quote_card@1 — 연속 인용 비트를 한 블록으로: 앞 문장 유지, 이 비트 문장 순차 등장, 세로 중앙, 중앙 정렬
//   cta_card@1  — 의미 단위 줄, y center_y, 강조, 0.96→1 등장
//   endcard@1   — CTA 질문 상단 유지 + 크레딧 블록 (브랜드 자산 대기)
//   onscreen@1  — 대본 '자막(온스크린 텍스트)': 컷 단위 화면 중앙 큰 텍스트. 내레이션 자막(하단 고정)과 별개 층 (사용자 결정 2026-08-29)

const Tokens: React.FC<{ line: string; accent: Set<string> | string[]; colors: Style["colors"] }> = ({ line, accent, colors }) => {
  const has = (tok: string) => (Array.isArray(accent) ? accent.includes(tok) : accent.has(tok));
  return (
    <>
      {tokenize(line).map((tok, i, arr) => (
        <span key={i}>
          <span style={{ color: has(tok) ? colors.accent : colors.text }}>{tok}</span>
          {i < arr.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
};

export const Headline: React.FC<{ overlay: Overlay; style: Style; clock: BeatClock }> = ({ overlay, style, clock }) => {
  const { colors, sizes, safe } = style;
  const hl = overlay.headline;
  if (!hl) return null;
  const emphasisSet = new Set(overlay.emphasis.map((e) => e.text));
  return (
    <div style={{ position: "absolute", left: safe.x, right: safe.x, top: H * (style.headline?.top_y ?? 0.26), scale: String(clock.anim(0, 8, 1.03, 1)), transformOrigin: "left center" }}>
      {hl.kicker ? <div style={{ fontSize: 44, color: colors.accent, fontWeight: 700, marginBottom: 24 }}>{hl.kicker}</div> : null}
      <div style={{ fontSize: sizes.headline, lineHeight: 1.2, color: colors.text, fontWeight: 800, wordBreak: "keep-all" }}>
        <Tokens line={hl.text} accent={emphasisSet} colors={colors} />
      </div>
    </div>
  );
};

export const QuoteCard: React.FC<{ beat: Beat; card: Card; style: Style; clock: BeatClock }> = ({ beat, card, style, clock }) => {
  const { colors, sizes, safe } = style;
  const { anim, fps } = clock;
  const blk = card.block ?? { lines: [{ text: card.text, sentence: 0, beat: beat.id }], own_sentence: 0, sentence_count: 1, attribution: card.attribution, stagger_sec: 0.13, chars_per_sec: 0 };
  const delayF = Math.round((card.in_sec ?? 0) * fps); // 카드 지연 등장(낱말 시각) — 자막 도입부와의 이중 노출 완화 (4편 C4, 2026-08-31)
  const lh = sizes.card * (style.card?.line_height ?? 1.45);
  const attrH = blk.attribution ? sizes.attribution * 1.4 + 28 : 0;
  const cy = H * (style.card?.center_y ?? 0.5);
  // C10: 지금까지 나온 문장만으로 세로 중앙. 새 문장이 들어오는 비트에선 이전 중앙 위치 → 새 중앙 위치로 8f 이동
  const hUpTo = (sent: number) => blk.lines.filter((l) => l.sentence <= sent).length * lh + (sent === blk.sentence_count - 1 ? attrH : 0);
  const topNow = cy - hUpTo(blk.own_sentence) / 2;
  const topPrev = blk.own_sentence > 0 ? cy - hUpTo(blk.own_sentence - 1) / 2 : topNow;
  const top = topPrev + (topNow - topPrev) * anim(0, 8);
  const last = blk.lines.length - 1;
  let ownIdx = 0;
  return (
    <div style={{ position: "absolute", left: safe.x, right: safe.x, top, textAlign: "center", wordBreak: "keep-all" }}>
      {blk.lines.map((l, i) => {
        let op = 1;
        let rise = 0;
        if (l.sentence > blk.own_sentence) op = 0; // 아직 안 나온 문장: 자리만
        else if (l.sentence === blk.own_sentence) {
          const startF = delayF + Math.round(ownIdx * blk.stagger_sec * fps);
          ownIdx += 1;
          op = anim(startF, 8);
          rise = anim(startF, 8, 14, 0);
        }
        return (
          <div key={i} style={{ fontSize: sizes.card, lineHeight: lh + "px", color: colors.quote, fontWeight: 700, opacity: op, translate: `0px ${rise}px` }}>
            {i === 0 ? "“" : ""}
            {l.text}
            {i === last ? "”" : ""}
          </div>
        );
      })}
      {blk.attribution ? (
        <div style={{ fontSize: sizes.attribution, color: colors.muted, marginTop: 28, opacity: blk.own_sentence === blk.sentence_count - 1 ? anim(delayF + Math.round(ownIdx * blk.stagger_sec * fps) + 4, 8) : 0 }}>
          — {blk.attribution}
          {card.source ? <div style={{ fontSize: 28, color: colors.muted, marginTop: 8, opacity: 0.9 }}>{card.source}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

export const CtaCard: React.FC<{ card: Card; style: Style; clock: BeatClock }> = ({ card, style, clock }) => {
  const { colors, sizes, safe } = style;
  const { anim } = clock;
  return (
    <div style={{ position: "absolute", left: safe.x, right: safe.x, top: H * (style.cta?.center_y ?? 0.45), translate: "0px -50%", opacity: anim(0, 12), scale: String(anim(0, 14, 0.96, 1)), textAlign: "center" }}>
      {(card.lines ?? [card.text]).map((line, li) => (
        <div key={li} style={{ fontSize: sizes.cta ?? sizes.headline, lineHeight: 1.3, color: colors.text, fontWeight: 800, wordBreak: "keep-all" }}>
          <Tokens line={line} accent={card.emphasis ?? []} colors={colors} />
        </div>
      ))}
    </div>
  );
};

export const Endcard: React.FC<{ card: Card; style: Style; clock: BeatClock }> = ({ card, style, clock }) => {
  const { colors, sizes, safe } = style;
  return (
    <AbsoluteFill style={{ opacity: clock.anim(0, 14) }}>
      {card.question ? (
        <div style={{ position: "absolute", left: safe.x, right: safe.x, top: safe.y + 160, textAlign: "center" }}>
          {card.question.lines.map((line, li) => (
            <div key={li} style={{ fontSize: sizes.endcard_question ?? 52, lineHeight: 1.3, color: colors.text, fontWeight: 800, wordBreak: "keep-all" }}>
              <Tokens line={line} accent={card.question!.emphasis} colors={colors} />
            </div>
          ))}
        </div>
      ) : null}
      {(() => {
        // 크레딧 줄 수에 맞춰 수축한다 — 12줄 크레딧이 top 고정·무수축으로 프레임 밖에 잘렸다(9편 P7 b29, 전 편 공통).
        const n = (card.text ?? "").split("\n").length;
        const fz = card.text ? (n >= 12 ? 25 : n >= 8 ? 30 : 34) : 56;
        const top = card.question ? (n >= 8 ? H * 0.26 : H * 0.34) : (n >= 8 ? H * 0.28 : H * 0.4);
        return (
          <div style={{ position: "absolute", left: safe.x, right: safe.x, top, fontSize: fz, lineHeight: 1.45, color: colors.muted, whiteSpace: "pre-line", textAlign: "center", wordBreak: "keep-all" }}>
            {card.text || "엔드카드 (브랜드 자산 대기)"}
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

// onscreen@1 — 대본의 컷별 온스크린 텍스트. 화면 중앙(y), 줄은 props.lines 그대로, 강조 토큰만 accent.
// hook 비트는 프레임 0부터 노출(페이드 없음), 그 외는 10f 페이드.
export const OnscreenText: React.FC<{ spec: GraphicSpec; style: Style; clock: BeatClock; frame0?: boolean }> = ({ spec, style, clock, frame0 = false }) => {
  const p = spec.props as {
    lines: string[];
    emphasis?: string[];
    y?: number;
    size?: number;
    align?: "center" | "left";
    sub?: string;
    scrim?: number;
    variant?: "hook" | "arrow" | "stat" | "equation" | "list" | "statement" | "cta";
  };
  const { sizes, colors, safe } = style;
  const os = style.onscreen ?? { center_y: 0.4, size: sizes.headline, sub_size: 40, weight: 800, scrim: 0.55, scrim_span: 0.34, rise_px: 14, in_frames: 10, line_height: 1.22 };
  const inF = Math.round((spec.in ?? 0) * clock.fps);
  const op = frame0 ? 1 : clock.anim(inF, os.in_frames);
  const rise = frame0 ? 0 : clock.anim(inF, os.in_frames, os.rise_px, 0);
  const base = p.size ?? os.size;
  const cy = H * (p.y ?? os.center_y);
  const scrim = p.scrim ?? os.scrim;
  const span = H * os.scrim_span;
  const V = p.variant ?? "statement";
  const acc = new Set(p.emphasis ?? []);
  const shadow = "0 2px 20px rgba(0,0,0,0.85)";
  // 크기 단계 — 자막(56px 균일)과 달리 온스크린은 역할별로 벌린다
  const HERO = Math.round(base * 1.5);
  const BODY = Math.round(base * 1.0);
  const LEAD = Math.round(base * 0.56);
  const META = os.sub_size;
  const row = (children: React.ReactNode, k: number, st: React.CSSProperties = {}) => (
    <div key={k} style={{ wordBreak: "keep-all", textShadow: shadow, ...st }}>{children}</div>
  );
  // 강조 토큰만 키워 렌더 (stat)
  const mixed = (line: string, small: number, big: number) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
      {tokenize(line).map((tok, i) =>
        acc.has(tok) ? (
          <span key={i} style={{ fontSize: big, fontWeight: 900, color: colors.accent, lineHeight: 1 }}>{tok}</span>
        ) : (
          <span key={i} style={{ fontSize: small, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>{tok}</span>
        ),
      )}
    </span>
  );
  const tokens = (line: string, size: number, weight = os.weight) => (
    <span style={{ fontSize: size, fontWeight: weight, lineHeight: os.line_height }}>
      <Tokens line={line} accent={p.emphasis ?? []} colors={colors} />
    </span>
  );

  let body: React.ReactNode = null;
  if (V === "hook") {
    // 키워드를 위에 작게(색), 주장을 아래 크게 — 훅
    body = [row(tokens(p.lines[0], LEAD), 0, { color: colors.accent, fontWeight: 800, letterSpacing: "0.02em" }), row(<span style={{ fontSize: HERO, fontWeight: 900, color: colors.text, lineHeight: 1.05 }}>{p.lines.slice(1).join(" ")}</span>, 1, { marginTop: 6 })];
  } else if (V === "arrow") {
    // 전/후 대비: 앞 상태는 작게, 화살표 뒤 결과는 크게
    const tail = (p.lines[1] ?? "").replace(/^→\s*/, "");
    body = [
      row(tokens(p.lines[0], LEAD), 0, { opacity: 0.85 }),
      row(
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: BODY, color: colors.accent, fontWeight: 900 }}>→</span>
          {mixed(tail, BODY, HERO)}
        </span>,
        1,
        { marginTop: 10 },
      ),
    ];
  } else if (V === "stat") {
    // 수치가 주인공: 강조 토큰만 초대형
    body = [row(tokens(p.lines[0], LEAD), 0, { opacity: 0.85 }), row(mixed(p.lines.slice(1).join(" "), Math.round(base * 0.72), HERO), 1, { marginTop: 10 })];
  } else if (V === "equation") {
    // 좌변(수치) 크게 → 구분선 → 우변(뜻)
    const lhs = (p.lines[0] ?? "").replace(/\s*=\s*$/, "");
    body = [
      row(<span style={{ fontSize: HERO, fontWeight: 900, color: colors.accent, lineHeight: 1.05 }}>{lhs}</span>, 0),
      row(<div style={{ width: 120, height: 3, background: colors.accent, opacity: 0.7, margin: "16px auto" }} />, 1),
      row(<span style={{ fontSize: Math.round(base * 0.76), fontWeight: 800, color: colors.text }}>{p.lines.slice(1).join(" ")}</span>, 2),
    ];
  } else if (V === "list") {
    // 항목 나열: 왼쪽 정렬 + 불릿, 0.12s 간격 순차
    // 줄은 줄대로, 줄 안의 "·"만 항목 구분 — 대본 줄바꿈을 항목 경계로 존중한다("소행성 감시 ↓"가 한 항목)
    const items = p.lines.flatMap((l) => l.split("·")).map((x) => x.trim()).filter(Boolean);
    body = items.map((it, i) =>
      row(
        <span style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ width: 14, height: 14, background: colors.accent, flex: "none", borderRadius: 3 }} />
          <span style={{ fontSize: Math.round(base * 0.82), fontWeight: 800, color: colors.text }}>{it}</span>
        </span>,
        i,
        { marginTop: i ? 18 : 0, opacity: frame0 ? 1 : clock.anim(inF + Math.round(i * 0.12 * clock.fps), 8), textAlign: "left" },
      ),
    );
  } else if (V === "cta") {
    body = [row(<span style={{ fontSize: Math.round(base * 0.92), fontWeight: 900, color: colors.text }}>{p.lines.join(" ")}</span>, 0), row(<div style={{ width: 180, height: 4, background: colors.accent, margin: "18px auto 0" }} />, 1)];
  } else {
    // statement — 인용·선언: 위아래 얇은 선으로 문장을 앉힌다
    body = [
      row(<div style={{ width: 90, height: 2, background: colors.text, opacity: 0.45, margin: "0 auto 22px" }} />, -1),
      ...p.lines.map((l, i) => row(<span style={{ fontSize: Math.round(base * 1.12), fontWeight: 800, color: colors.text, letterSpacing: "0.01em" }}>{l}</span>, i)),
      row(<div style={{ width: 90, height: 2, background: colors.text, opacity: 0.45, margin: "22px auto 0" }} />, 99),
    ];
  }
  return (
    <>
      {scrim > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: cy - span / 2,
            height: span,
            opacity: op,
            background: `linear-gradient(180deg, rgba(11,15,26,0) 0%, rgba(11,15,26,${scrim}) 28%, rgba(11,15,26,${scrim}) 72%, rgba(11,15,26,0) 100%)`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: safe.x,
          right: safe.x,
          top: cy,
          translate: `0px calc(-50% + ${rise}px)`,
          textAlign: V === "list" ? "left" : "center",
          opacity: op,
          display: V === "list" ? "flex" : "block",
          flexDirection: "column",
          alignItems: V === "list" ? "flex-start" : undefined,
        }}
      >
        {body}
        {p.sub ? <div style={{ marginTop: 18, fontSize: META, lineHeight: 1.3, color: colors.text, opacity: 0.88, fontWeight: 600, wordBreak: "keep-all", textShadow: shadow }}>{p.sub}</div> : null}
      </div>
    </>
  );
};


