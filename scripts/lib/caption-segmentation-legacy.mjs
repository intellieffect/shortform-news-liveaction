// Frozen pre-1.4 segmentation for archived production profiles.
const estimatedWidth = (text, fontSize) => [...text].reduce((sum, char) => sum + (/\s/u.test(char) ? 0.35 : /[\x20-\x7e]/.test(char) ? 0.7 : 1), 0) * fontSize;

export const splitLegacyCaptionWords = (words, profile) => {
  const maxWidth = profile.canvas.width - 2 * (profile.caption.side_inset + profile.caption.padding_x);
  const fontSize = profile.caption.font_size;
  if (!(maxWidth > 0 && fontSize > 0)) throw new Error("유효한 자막 프로필이 필요하다");
  const chunks = [];
  let chunk = [];
  const flush = () => { if (chunk.length) chunks.push(chunk); chunk = []; };
  for (const word of words) {
    if (/(?:[^0-9][,，、]|[,，、][^0-9\s”’"')])/.test(word.text.replace(/[,，、][”’"')]*$/, ""))) throw new Error(`쉼표 앞뒤 발화의 개별 단어 시각이 필요하다: ${word.text}`);
    if (estimatedWidth(word.text, fontSize) > maxWidth) throw new Error(`자막 토큰이 한 줄보다 길다: ${word.text}`);
    const candidate = [...chunk, word].map(w => w.text).join(" ");
    if (chunk.length && (estimatedWidth(candidate, fontSize) > maxWidth || word.start - chunk.at(-1).end > 0.8)) flush();
    chunk.push(word);
    if (/[,.!?。！？，、][”’"')]*$/.test(word.text)) flush();
  }
  flush();
  return chunks.map(chunk => ({ text: chunk.map(w => w.text).join(" "), start: chunk[0].start, end: chunk.at(-1).end, words: chunk }));
};
