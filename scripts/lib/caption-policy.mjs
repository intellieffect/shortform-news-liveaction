import {splitCaptionWords} from './caption-segmentation.mjs';

// New-contract captions are derived from preserved timed words and authored
// hints. Reassemble instead of silently editing/deleting text in the output.
export const captionPolicyIssues = (narration, profile) => {
  const errors = [];
  const issue = message => errors.push({code:'caption-semantic',where:'narration.json captions',message});
  const lines = narration?.sentences ?? narration?.lines;
  if (!Array.isArray(lines) || !Array.isArray(narration?.captions)) {
    issue('의미 분절 계약은 원문 단어 시각과 파생 captions가 필요하다');
    return errors;
  }
  try {
    const expected = lines.flatMap(line => {
      const words = line.caption_words ?? line.words;
      if (!Array.isArray(words) || !words.length) throw new Error(`${line.id}: 실제 자막 단어 시각이 필요하다`);
      const text = line.caption_text ?? line.text;
      if (typeof text !== 'string' || words.map(w=>w.text).join(' ') !== text.trim().replace(/\s+/g,' '))
        throw new Error(line.id+': 자막 단어가 원문 전체와 다르다. 축약하거나 누락하지 않는다');
      for (const [i, word] of words.entries()) if (!word || typeof word.text !== 'string' || !word.text.trim() || !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.end <= word.start || (i && word.start < words[i-1].end))
        throw new Error(line.id+': 실제 단어 시각이 유효하지 않다');
      return splitCaptionWords(words, profile, {hints:line.caption_segmentation,where:line.id});
    });
    const snapshot = captions => captions.map(c => ({text:c.text,start:c.start,end:c.end}));
    if (JSON.stringify(snapshot(expected)) !== JSON.stringify(snapshot(narration.captions)))
      issue('자막이 보존된 단어·의미 분절과 다르다. 고유명사/서술어 경계는 caption-segmentation.json에 작성하고 자막을 재조립한다. 축약·임의 시각·폭 확대는 허용하지 않는다');
  } catch (error) { issue(error.message); }
  return errors;
};
