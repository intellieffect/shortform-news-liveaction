import {HOOK_STYLE, hookLayoutIssues} from "./hook-layout.mjs";
// 공통 후킹 오버레이 계약 (hook-overlay@1). 문서: plugin/skills/shortform-news-pipeline/reference/hook-overlay.md
// 구조만 검사한다 — 문구의 의미·매력·읽기 시간은 원고·실물 검수 몫이다. 시간 수치를 고정하지 않는다.
export const HOOK_POLICY = "hook-overlay@1";
export const HOOK_ROLE = "hook";

const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const REFS = ["element_id", "text_event_id", "underline_event_id"];

const findElement = (concepts, id) => {
  for (const concept of concepts?.concepts ?? []) for (const element of concept?.elements ?? [])
    if (element?.id === id) return { concept, element };
  return null;
};

// story.hook이 참조한 id 중 실제 role:hook 텍스트 요소인 것. 예외 판정은 전체 검증 통과 뒤에만 쓴다.
export const linkedHookElementIds = ({ story, concepts }) => new Set(
  (Array.isArray(story?.hook?.phrases) ? story.hook.phrases : [])
    .map((phrase) => phrase?.element_id)
    .filter((id) => {
      const found = typeof id === "string" && findElement(concepts, id);
      return found && found.element.kind === "text" && found.element.role === HOOK_ROLE;
    }),
);

// events는 컴파일된 motion 사건(from/settled/to/end 프레임). lines는 정규화된 내레이션 줄.
export const validateHookOverlay = ({ story, concepts, lines, events, fps, totalFrames, policy = null }) => {
  const errors = [];
  const issue = (code, where, message) => errors.push({ code, where, message });
  if (policy != null && policy !== HOOK_POLICY) issue("hook-policy", "request.json hook_overlay", `알 수 없는 후킹 계약: ${policy}`);
  const required = policy === HOOK_POLICY;
  const hook = story?.hook;
  const linked = linkedHookElementIds({ story, concepts });

  // 선언되지 않은 role:hook은 어떤 경우에도 오류다 — 화면 문구 제한 우회 방지.
  for (const concept of concepts?.concepts ?? []) for (const element of concept?.elements ?? [])
    if (element?.role === HOOK_ROLE && !linked.has(element.id))
      issue("hook-element-unlinked", `concepts.${concept.id}.${element.id}`, "role:hook 요소는 story.hook.phrases에 연결해야 한다");

  if (hook == null) {
    if (required) issue("hook-required", "story.json hook", `${HOOK_POLICY} 편은 첫 나레이션 문장에 연결한 hook이 필요하다`);
    return { errors, overlay: null, exemptElementIds: new Set() };
  }
  if (!object(hook)) {
    issue("hook-shape", "story.json hook", "hook은 {narration_line, phrases} 객체여야 한다");
    return { errors, overlay: null, exemptElementIds: new Set() };
  }
  const first = lines[0];
  if (!first || hook.narration_line !== first.id)
    issue("hook-first-line", "story.json hook.narration_line", `첫 나레이션 줄 ${first?.id}이어야 한다: ${hook.narration_line}`);
  const phrases = hook.phrases;
  if (!Array.isArray(phrases) || !phrases.length) {
    issue("hook-phrases", "story.json hook.phrases", "문구가 한 개 이상 필요하다");
    return { errors, overlay: null, exemptElementIds: new Set() };
  }

  const eventById = new Map((events ?? []).map((event) => [event.id, event]));
  const seenElements = new Set(), seenEvents = new Set();
  const compiled = [];
  const openingConcept = findElement(concepts, phrases[0]?.element_id)?.concept;
  for (const [index, phrase] of phrases.entries()) {
    const where = `story.json hook.phrases[${index}]`;
    if (!object(phrase) || REFS.some((key) => !hasText(phrase[key]))) {
      issue("hook-phrase-shape", where, "element_id·text_event_id·underline_event_id가 필요하다");
      continue;
    }
    const { element_id: elementId, text_event_id: textId, underline_event_id: underlineId } = phrase;
    if (seenElements.has(elementId)) issue("hook-duplicate-ref", where, `element ${elementId}를 두 번 참조한다`);
    for (const id of [textId, underlineId]) if (seenEvents.has(id)) issue("hook-duplicate-ref", where, `event ${id}를 두 번 참조한다`);
    if (textId === underlineId) issue("hook-duplicate-ref", where, "글자와 밑줄은 서로 다른 사건이어야 한다");
    seenElements.add(elementId); seenEvents.add(textId); seenEvents.add(underlineId);

    const found = findElement(concepts, elementId);
    if (!found) { issue("hook-element-missing", where, `element ${elementId}가 없다`); continue; }
    const { concept, element } = found;
    errors.push(...hookLayoutIssues(phrase.layout, where + '.layout'));
    if (concept.id !== openingConcept?.id) issue("hook-opening-concept", where, "후킹 문구는 첫 발화를 포함한 같은 도입 개념에 둔다");
    if (element.kind !== "text" || element.role !== HOOK_ROLE) issue("hook-element-role", where, `${elementId}는 kind:"text", role:"hook"이어야 한다`);
    if (!hasText(element.text)) issue("hook-element-text", where, `${elementId}에 표시할 text가 없다`);
    if (index === 0 && first && !(concept.narration_lines ?? []).includes(first.id))
      issue("hook-concept-first-line", where, `첫 문구 요소는 첫 줄 ${first.id}을 가진 개념에 있어야 한다 (현재 ${concept.id})`);

    const pair = {};
    for (const [key, id, kind] of [["text", textId, "label"], ["underline", underlineId, "motion"]]) {
      const event = eventById.get(id);
      if (!event) { issue("hook-event-missing", where, `event ${id}가 없다`); continue; }
      if (event.kind !== kind) issue("hook-event-kind", where, `${key} 사건 ${id}는 kind:"${kind}"여야 한다`);
      if (event.element_id !== elementId || event.concept_id !== concept.id) issue("hook-event-owner", where, `${id}는 ${concept.id}.${elementId}를 참조해야 한다`);
      for (const point of ["from", "settled", "to", "end"]) {
        if (!(openingConcept?.narration_lines ?? []).includes(event.timing?.[point]?.anchor?.line))
          issue("hook-opening-anchor", where, `${id}.${point}는 도입 개념의 발화 앵커여야 한다`);
      }
      const points = ["from", "settled", "to", "end"].map((point) => event[point]);
      if (!points.every(Number.isFinite)) continue; // 앵커 오류는 motion 검사가 보고한다
      const [from, settled, to, end] = points;
      if (from < 0 || (Number.isFinite(totalFrames) && end > totalFrames)) issue("hook-frame-range", where, `${id}는 본문 프레임 범위 안에 있어야 한다`);
      if (!(from < settled)) issue("hook-window", where, `${id}: 등장 구간(from<settled)이 필요하다`);
      if (!(settled < to)) issue("hook-window", where, `${id}: 완전 표시 구간(settled<to)이 필요하다`);
      if (!(to <= end)) issue("hook-window", where, `${id}: to≤end가 아니다`);
      pair[key] = event;
    }
    if (pair.text && pair.underline && (pair.underline.from < pair.text.from || pair.underline.end > pair.text.end))
      issue("hook-underline-outside", where, `밑줄 ${pair.underline.from}..${pair.underline.end}가 글자 ${pair.text.from}..${pair.text.end} 밖이다`);
    if (index === 0 && pair.text && first && Number.isFinite(fps)) {
      const lineEnd = Math.round(first.end * fps);
      if (pair.text.timing?.from?.anchor?.line !== first.id) issue("hook-first-anchor", where, `첫 문구의 from 앵커는 첫 줄 ${first.id}이어야 한다`);
      if (pair.text.from < 0 || pair.text.from >= lineEnd) issue("hook-first-anchor", where, `첫 문구가 첫 발화(0..${lineEnd}f) 안에서 시작하지 않는다: ${pair.text.from}f`);
    }
    const previous = compiled.at(-1);
    if (pair.text && previous && pair.text.from < previous.text_event.from)
      issue("hook-phrase-order", where, "문구는 등장 순서대로 적는다");
    if (pair.text && pair.underline) compiled.push({ id: elementId, text: element.text, text_event: pair.text, underline_event: pair.underline, ...(phrase.layout ? {layout: {...phrase.layout}} : {}) });
  }
  const valid = !errors.length;
  return { errors, overlay: valid ? { style: structuredClone(HOOK_STYLE), phrases: compiled } : null, exemptElementIds: valid ? linked : new Set() };
};
