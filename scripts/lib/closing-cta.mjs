// 마지막 CTA 공통 계약 (closing-cta@1, 2026-10-06 고객 요청 4번 + 사용자 결정).
// 새 편: 마지막 나레이션 문장이 CTA 문구와 정확히 같고, 그 말이 나오는 구간에 노란 알약 문구가 공통 레이어로 뜬다.
// request.json closing_cta 가 없는 옛 편은 검사하지 않는다. 문구·스타일은 이 버전에 고정한다 — 바꾸려면 새 버전을 만든다.
export const CLOSING_CTA_POLICY = "closing-cta@1";
const POLICIES = [CLOSING_CTA_POLICY];
export const CLOSING_CTA_NARRATION = "여러분은 어떻게 생각하시나요? 댓글로 의견 남겨주세요.";
export const CLOSING_CTA_PILL = "구독과 댓글 부탁드려요";
// 알약은 나레이션 끝줄의 「댓글로」 어절부터 보인다. 앵커가 없으면 마지막 줄 시작부터 보인다.
const ANCHOR_WORD = "댓글로";
export const CLOSING_CTA_STYLE = {
  center_x: 540, center_y: 770, font_size: 60, font_weight: 700, color: "#FFD16A", outline_px: 2,
  background: "rgba(8,12,22,0.72)", padding_x: 52, padding_y: 24, radius: 999, max_width: 900,
  enter_frames: 8, exit_frames: 8, hold_after_frames: 12,
};

const squash = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// lines: normalizeNarration 결과. 반환 closing_cta 는 timeline.closing_cta 로 그대로 싣는다.
export const compileClosingCta = ({ policy = null, lines, fps, contentFrames }) => {
  const errors = [];
  const issue = (code, where, message) => errors.push({ code, where, message });
  if (policy == null) return { errors, closing_cta: null };
  if (!POLICIES.includes(policy)) { issue("closing-cta-policy", "request.json closing_cta", `알 수 없는 마지막 CTA 계약: ${policy}`); return { errors, closing_cta: null }; }
  const last = lines.at(-1);
  if (!last) { issue("closing-cta-line", "narration.json", "마지막 나레이션 문장이 없다"); return { errors, closing_cta: null }; }
  if (squash(last.text) !== CLOSING_CTA_NARRATION)
    issue("closing-cta-line", `narration.json ${last.id}`, `${policy} 편의 마지막 나레이션 문장은 정확히 "${CLOSING_CTA_NARRATION}"이어야 한다: "${squash(last.text)}"`);
  if (!Number.isFinite(fps) || !Number.isFinite(contentFrames) || !Number.isFinite(last.start) || !Number.isFinite(last.end)) return { errors, closing_cta: null };
  const word = (last.words ?? []).find((w) => squash(w.text).startsWith(ANCHOR_WORD));
  const from = Math.max(0, Math.round((Number.isFinite(word?.start) ? word.start : last.start) * fps));
  const end = Math.min(contentFrames, Math.round(last.end * fps) + CLOSING_CTA_STYLE.hold_after_frames);
  if (!(from < end)) issue("closing-cta-window", `narration.json ${last.id}`, `CTA 알약 구간이 비었다: ${from}..${end}f`);
  return { errors, closing_cta: errors.length ? null : { policy, text: CLOSING_CTA_PILL, from, end, style: structuredClone(CLOSING_CTA_STYLE) } };
};
