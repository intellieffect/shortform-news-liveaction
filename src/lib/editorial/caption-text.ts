import { splitCore } from "../primitives/Caption";

export type EditorialCaptionLine = {
  id: string;
  text: string;
  caption_text?: string;
  emphasis?: string[];
  start: number;
  end: number;
  words?: { text: string; start: number; end: number }[];
};

// 실제 표시와 폭 검사가 같은 글자·강조 범위를 쓴다.
export const captionRuns = (line: EditorialCaptionLine) => {
  const emphasis = new Set(line.emphasis ?? []);
  return (line.caption_text ?? line.text).split(/(\s+)/).flatMap((text) => {
    const parts = splitCore(text);
    if (!text.trim() || (!emphasis.has(text) && !emphasis.has(parts.core))) return [{ text, emphasized: false }];
    return [
      { text: parts.pre, emphasized: false },
      { text: parts.core, emphasized: true },
      { text: parts.post, emphasized: false },
    ].filter((run) => run.text);
  });
};
