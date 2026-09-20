import { useLayoutEffect } from "react";
import { useDelayRender } from "remotion";
import { captionRuns, type EditorialCaptionLine } from "./caption-text";
import type { ProductionProfile } from "./profile";

// 모든 구간을 실제 폰트로 측정한다. 첫 프레임에 자막이 없어도 넘치는 구간을 발견한다.
export const CaptionPreflight: React.FC<{ lines: EditorialCaptionLine[]; profile: ProductionProfile }> = ({ lines, profile }) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  useLayoutEffect(() => {
    if (profile.caption.max_lines !== 1) return;
    const handle = delayRender("공통 한 줄 자막 폭 검사");
    let active = true;
    let released = false;
    const release = () => { if (!released) { released = true; continueRender(handle); } };
    const check = async () => {
      const { caption } = profile;
      const fontSample = lines.map((line) => line.caption_text ?? line.text).join(" ");
      const loaded = await Promise.all([caption.weight, caption.emphasis_weight].map((weight) =>
        document.fonts.load(`${weight} ${caption.font_size}px "${caption.font_family}"`, fontSample)));
      if (!active) return;
      if (loaded.some((faces) => !faces.length)) throw new Error(`[caption-font] ${caption.font_family}: 실제 자막 폰트 로드를 확인할 수 없다`);
      const available = profile.canvas.width - 2 * (caption.side_inset + caption.padding_x);
      const probe = document.createElement("div");
      Object.assign(probe.style, {
        position: "fixed", left: "-100000px", top: "0", width: "max-content",
        whiteSpace: "nowrap", fontFamily: caption.font_family, fontSize: `${caption.font_size}px`,
        fontWeight: String(caption.weight), lineHeight: String(caption.line_height),
        letterSpacing: "normal", padding: "0", margin: "0", border: "0",
      });
      document.body.appendChild(probe);
      try {
        for (const line of lines) {
          const text = line.caption_text ?? line.text;
          if (/[\r\n\u2028\u2029]/.test(text)) throw new Error(`[caption-single-line] ${line.id}: 줄바꿈을 별도 발화 구간으로 나눠야 한다`);
          probe.replaceChildren(...captionRuns(line).map((run) => {
            const span = document.createElement("span");
            span.textContent = run.text;
            span.style.fontWeight = String(run.emphasized ? caption.emphasis_weight : caption.weight);
            return span;
          }));
          const width = probe.getBoundingClientRect().width;
          if (width > available + 0.5) throw new Error(`[caption-width] ${line.id}: ${Math.ceil(width)}px > ${available}px. 글자를 축소하거나 자르지 말고 실제 단어 시각에 맞춰 captions 구간을 나눈다: ${text}`);
        }
      } finally { probe.remove(); }
      release();
    };
    void check().catch((error: unknown) => { if (active) cancelRender(error instanceof Error ? error : new Error(String(error))); });
    return () => { active = false; release(); };
  }, [lines, profile, delayRender, continueRender, cancelRender]);
  return null;
};
