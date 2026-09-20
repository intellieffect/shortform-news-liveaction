import { interpolate } from "remotion";
import type { Beat, Overlay, Style } from "../../pilot/types";
import { clamp, tokenize, type BeatClock } from "./clock";

// caption@1 + emphasis@1 (layer: overlays)
//   한 번에 한 줄(lines_timed), 각 줄은 첫 단어 발화 3f 전 페이드+16px 상승. 중앙 정렬.
//   강조 토큰은 색, pop=true 토큰만 발화 순간 세로 1→1.12→1 팝. 슬라이드(textAnim=false)는 전체 줄 정지.

type Props = { readonly beat: Beat; readonly overlay: Overlay; readonly style: Style; readonly clock: BeatClock; readonly skipLines?: number[] };


// 강조 토큰을 [따옴표 접두][핵심어][조사+구두점]으로 나눈다. "4.8킬로미터를" → 4.8킬로미터 + 를, "'에아렌딜-1'." → ' + 에아렌딜-1 + '.
// 숫자 뒤 만·천·억은 단위라 핵심어에 남긴다("5만").
const PARTICLE = /(에서는|에서도|에서|으로는|으로도|으로|이라고|라고|까지|부터|처럼|보다|에는|에도|에선|엔|은|는|이|가|을|를|의|에|로|도|와|과|만)$/;
export const splitCore = (tok: string): { pre: string; core: string; post: string } => {
  const m = /^(["'“‘]*)(.*?)(["'”’]*[.,?!]*)$/.exec(tok) ?? [tok, "", tok, ""];
  const pre = m[1], body = m[2], tail = m[3];
  const pm = PARTICLE.exec(body);
  if (pm && pm.index > 0) {
    const core = body.slice(0, pm.index);
    if (!(/\d$/.test(core) && /^(만|천|억)$/.test(pm[0]))) return { pre, core, post: pm[0] + tail };
  }
  return { pre, core: body, post: tail };
};

export const Caption: React.FC<Props> = ({ beat, overlay, style, clock, skipLines = [] }) => {
  const { colors, sizes, safe, caption } = style;
  const cap = overlay.caption;
  if (!cap) return null;
  const { localFrame, fps, anim, textAnim } = clock;
  const emphasisSet = new Set(overlay.emphasis.map((e) => e.text));
  const popSet = new Set(overlay.emphasis.filter((e) => e.pop).map((e) => e.text));
  const captionTop = 1920 * caption.anchor_y;

  const speechInF = beat.speech_start != null ? Math.max(0, Math.round((beat.speech_start - beat.start) * fps) - 3) : 0;
  const wordLocalF = (idx: number) => {
    const w = cap.words[idx];
    return w ? Math.round((w.start - beat.start) * fps) : 0;
  };
  const timed = cap.lines_timed ?? null;
  const lineInF = (i: number) => {
    const st = timed?.[i]?.start;
    return st == null ? 0 : Math.max(0, Math.round((st - beat.start) * fps) - 3);
  };
  let activeLine = -1;
  if (textAnim && timed) {
    for (let i = 0; i < timed.length; i++) if (localFrame >= lineInF(i)) activeLine = i;
  }

  let tokenCursor = 0;
  const renderLine = (line: string, key: number, tokenStart?: number) => {
    const toks = tokenize(line);
    const startIdx = tokenStart ?? tokenCursor;
    tokenCursor = startIdx + toks.length;
    return (
      <div key={key} style={{ fontSize: sizes.caption, lineHeight: caption.line_height, color: "#EAEEF5", fontWeight: 600, textAlign: "center" }}>
        {toks.map((tok, i) => {
          const em = emphasisSet.has(tok);
          // 연속 강조 묶음("1만 6천")은 첫 토큰의 시각으로 같이 팝
          let runStart = startIdx + i;
          while (runStart > 0 && emphasisSet.has(cap.words[runStart - 1]?.text ?? "")) runStart -= 1;
          const wf = wordLocalF(em ? runStart : startIdx + i);
          const pop = em && popSet.has(tok) && textAnim ? interpolate(localFrame, [wf, wf + 3, wf + 10], [1, 1.12, 1], clamp) : 1;
          // 강조 색은 핵심어(숫자·고유명사)에만 — 조사·구두점·따옴표는 흰색 (사용자 2026-08-30)
          const parts = em ? splitCore(tok) : null;
          return (
            <span key={i}>
              <span style={{ display: "inline-block", scale: `1 ${pop}`, transformOrigin: "center bottom" }}>
                {parts ? (
                  <>
                    {parts.pre ? <span style={{ color: colors.text, fontWeight: 600 }}>{parts.pre}</span> : null}
                    <span style={{ color: colors.accent, fontWeight: 800 }}>{parts.core}</span>
                    {parts.post ? <span style={{ color: colors.text, fontWeight: 600 }}>{parts.post}</span> : null}
                  </>
                ) : (
                  <span style={{ color: colors.text, fontWeight: 600 }}>{tok}</span>
                )}
              </span>
              {i < toks.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    );
  };

  // 자막 뒤 반투명 밴드(B3): 밝은 배경(도표·설원)에서도 읽히게. 글자 폭만큼만 — inline-block
  const backdrop: React.CSSProperties = caption.backdrop
    ? { display: "inline-block", background: "rgba(11,15,26,0.62)", padding: "8px 24px", borderRadius: 16, boxDecorationBreak: "clone" }
    : {};
  const wrap = (children: React.ReactNode, opacity: number, rise: number) => (
    <div style={{ position: "absolute", left: safe.x, right: safe.x, top: captionTop, wordBreak: "keep-all", textAlign: "center", opacity, translate: `0px ${rise}px` }}>
      <div style={backdrop}>{children}</div>
    </div>
  );
  if (textAnim && timed) {
    if (activeLine < 0 || skipLines.includes(activeLine)) return null; // 그래픽이 대신하는 줄(B4)은 비움
    return wrap(renderLine(timed[activeLine].text, activeLine, timed[activeLine].token_start), anim(lineInF(activeLine), 6), anim(lineInF(activeLine), 6, 16, 0));
  }
  return wrap(cap.lines.map((line, i) => (skipLines.includes(i) ? null : renderLine(line, i))), anim(speechInF, 8), anim(speechInF, 8, 24, 0));
};
