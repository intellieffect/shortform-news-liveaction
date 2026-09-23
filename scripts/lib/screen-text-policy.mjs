// 화면 추가 문구 정책 (screen-text@1, 2026-09-23 사용자 지시).
// 1) 상상도·AI 재구성·출처·라이선스·「관측 아님」 같은 표기 텍스트를 화면에 넣지 않는다 → CREDITS.md·게시 설명란.
// 2) 나레이션을 다시 적는 설명 문장을 넣지 않는다. 화면 문구는 대상·기준에 붙는 짧은 키워드다.
// 판정은 문구 자체만 본다. 짧은 키워드가 실제로 기준에 붙어 읽히는지는 실물 검수 몫이다.
export const SCREEN_TEXT_POLICY = "screen-text@1";

const PROVENANCE = /상상도|재구성|AI\s*생성|생성\s*이미지|개념도|원리\s*도해|도해\s*·|관측\s*아님|측정\s*아님|실제\s*(데이터|사진)\s*아님|모델\s*예측|시뮬레이션|사진\s*[:：]|출처|자료\s*[:：]|CC\s*BY|CC0|Wikimedia|Pexels|NASA\s*\/|ESA\s*\/|©/i;
const HANGUL = /[가-힣]/;

// 한글이 든 두 글자 이상 어절만 센다. 영문·숫자 고유명(LHS 1140b, He, 2024)은 키워드로 본다.
const words = (text) => String(text).split(/[\s·,:：/|↑↓→←()\[\]]+/).map((t) => t.replace(/[.!?…"'“”‘’]+$/g, "")).filter((t) => t.length >= 2 && HANGUL.test(t));
const spokenCorpus = (narration) => [
  ...(narration?.sentences ?? []).flatMap((s) => [s.text, s.spoken_text]),
  ...(narration?.captions ?? []).map((c) => c.text),
].filter(Boolean).join(" ");
// 어미·조사 차이는 앞부분이 같으면 같은 말로 본다 (남습니다/남음은 구분하지 못한다 — 실물 검수 몫)
const spoken = (corpus, word) => corpus.includes(word) || (word.length >= 3 && corpus.includes(word.slice(0, -1)));

export const screenTextPolicyIssues = ({ concepts, narration }) => {
  const errors = [], warnings = [];
  const corpus = spokenCorpus(narration);
  for (const concept of concepts?.concepts ?? []) for (const element of concept?.elements ?? []) {
    if (element?.kind !== "text") continue;
    const where = `concepts.${concept.id}.${element.id}`;
    const text = String(element.text ?? "");
    if (element.role === "provenance" || PROVENANCE.test(text))
      errors.push({ code: "screen-text-provenance", where, message: `화면에 출처·상상도·재구성·모델/관측 여부 표기를 넣지 않는다: "${text}". 출처는 CREDITS.md와 게시 설명란, 예측·조건은 나레이션 문장이나 화면의 형태 차이로 전달한다` });
    const ws = words(text);
    const restated = ws.filter((w) => spoken(corpus, w));
    if (ws.length >= 3 && restated.length / ws.length >= 0.5)
      errors.push({ code: "screen-text-restates", where, message: `나레이션을 다시 적는 설명 문구다: "${text}" (${restated.join("·")}). 대상·기준에 붙는 키워드 하나로 줄이거나 형태·움직임으로 보여준다` });
    else if (ws.length >= 4)
      warnings.push({ code: "screen-text-sentence", where, message: `키워드가 아닌 설명 문장이다: "${text}". 인용·표 본문이 아니면 키워드로 줄이거나 형태·움직임으로 보여준다` });
    if (text.includes("\n") && ws.length >= 2)
      warnings.push({ code: "screen-text-stack", where, message: `여러 줄 문구를 쌓았다: "${text.replace(/\n/g, " / ")}". 한 대상에 한 키워드로 나눈다` });
  }
  return { errors, warnings };
};

// JSX 직접 문구(auditScreenText)에도 표기 텍스트 판정을 적용한다.
export const isProvenanceText = (text) => PROVENANCE.test(String(text));
