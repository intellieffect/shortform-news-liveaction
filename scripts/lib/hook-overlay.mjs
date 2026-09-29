import {HOOK_STYLE_V2, HOOK_STYLE_V3, LEGACY_HOOK_STYLE, hookLayoutIssues, hookRunsIssues, compileHookRuns, hookTargetWidthIssues, hookRowsLayoutIssues, hookRowsIssues, compileHookRows} from "./hook-layout.mjs";
import {hookRowWidthIssues} from "./hook-typography.mjs";
// 공통 후킹 오버레이 계약 (hook-overlay@4 1회 연속 표시, 기존 @1·@2·@3 호환). 문서: plugin/skills/shortform-news-pipeline/reference/hook-overlay.md
// 구조만 검사한다 — 문구의 의미·매력·읽기 시간은 원고·실물 검수 몫이다. 시간 수치를 고정하지 않는다.
export const HOOK_POLICY = "hook-overlay@4";
export const HOOK_POLICY_V3 = "hook-overlay@3";
export const HOOK_POLICY_V2 = "hook-overlay@2";
export const HOOK_POLICY_V1 = "hook-overlay@1";
const POLICIES = [HOOK_POLICY, HOOK_POLICY_V3, HOOK_POLICY_V2, HOOK_POLICY_V1];
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
  if (policy != null && !POLICIES.includes(policy)) issue("hook-policy", "request.json hook_overlay", `알 수 없는 후킹 계약: ${policy}`);
  const required = POLICIES.includes(policy);
  const hook = story?.hook;
  const linked = linkedHookElementIds({ story, concepts });

  // 선언되지 않은 role:hook은 어떤 경우에도 오류다 — 화면 문구 제한 우회 방지.
  for (const concept of concepts?.concepts ?? []) for (const element of concept?.elements ?? [])
    if (element?.role === HOOK_ROLE && !linked.has(element.id))
      issue("hook-element-unlinked", `concepts.${concept.id}.${element.id}`, "role:hook 요소는 story.hook.phrases에 연결해야 한다");

  if (hook == null) {
    if (required) issue("hook-required", "story.json hook", `${policy} 편은 첫 나레이션 문장에 연결한 hook이 필요하다`);
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

  if (policy === HOOK_POLICY && phrases.length !== 1)
    issue('hook-once', 'story.json hook.phrases', '후킹은 한 문구의 rows로 한 번만 표시한다. 줄별 순차 등장은 허용한다');

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
    // @3·@4는 rows 필수, @1·@2는 rows를 명시하면 이행한다. rows와 옛 runs는 섞지 않는다.
    const authored = phrase.rows !== undefined || [HOOK_POLICY, HOOK_POLICY_V3].includes(policy);
    let runs = null, rowsValid = false;
    if (phrase.rows !== undefined && phrase.runs !== undefined) issue("hook-rows", where, "rows와 runs를 함께 쓸 수 없다. rows가 runs를 대체한다");
    else if (authored) {
      if (phrase.runs !== undefined) issue("hook-rows", where + ".runs", `${HOOK_POLICY}는 runs 대신 rows를 쓴다`);
      const layoutErrors = hookRowsLayoutIssues(phrase.layout, where + ".layout");
      const rowErrors = phrase.rows === undefined ? [{code: "hook-rows", where: where + ".rows", message: "작성한 줄 rows가 필요하다"}] : hookRowsIssues(phrase.rows, element.text, where + ".rows");
      errors.push(...layoutErrors, ...rowErrors);
      rowsValid = !layoutErrors.length && !rowErrors.length && phrase.runs === undefined;
      if (rowsValid) errors.push(...hookRowWidthIssues(phrase.rows, phrase.layout.width, where));
    } else {
      errors.push(...hookLayoutIssues(phrase.layout, where + '.layout'));
      const runErrors = hookRunsIssues(phrase.runs, element.text, where + '.runs', policy === HOOK_POLICY_V2);
      errors.push(...runErrors);
      runs = Array.isArray(phrase.runs) && !runErrors.length ? compileHookRuns(phrase.runs, phrase.layout) : null;
      if (runs) errors.push(...hookTargetWidthIssues(runs, phrase.layout, where));
    }
    if (concept.id !== openingConcept?.id) issue("hook-opening-concept", where, "후킹 문구는 첫 발화를 포함한 같은 도입 개념에 둔다");
    if (element.kind !== "text" || element.role !== HOOK_ROLE) issue("hook-element-role", where, `${elementId}는 kind:"text", role:"hook"이어야 한다`);
    if (!hasText(element.text)) issue("hook-element-text", where, `${elementId}에 표시할 text가 없다`);
    if (index === 0 && first && !(concept.narration_lines ?? []).includes(first.id))
      issue("hook-concept-first-line", where, `첫 문구 요소는 첫 줄 ${first.id}을 가진 개념에 있어야 한다 (현재 ${concept.id})`);

    // 사건 검사: 존재·종류·소유·도입 앵커·프레임 범위·창. 창이 유효할 때만 사건을 돌려준다.
    const checkEvent = (id, kind, key, at) => {
      const event = eventById.get(id);
      if (!event) { issue("hook-event-missing", at, `event ${id}가 없다`); return null; }
      if (event.kind !== kind) issue("hook-event-kind", at, `${key} 사건 ${id}는 kind:"${kind}"여야 한다`);
      if (event.element_id !== elementId || event.concept_id !== concept.id) issue("hook-event-owner", at, `${id}는 ${concept.id}.${elementId}를 참조해야 한다`);
      for (const point of ["from", "settled", "to", "end"]) {
        if (!(openingConcept?.narration_lines ?? []).includes(event.timing?.[point]?.anchor?.line))
          issue("hook-opening-anchor", at, `${id}.${point}는 도입 개념의 발화 앵커여야 한다`);
      }
      const points = ["from", "settled", "to", "end"].map((point) => event[point]);
      if (!points.every(Number.isFinite)) return null; // 앵커 오류는 motion 검사가 보고한다
      const [from, settled, to, end] = points;
      if (from < 0 || (Number.isFinite(totalFrames) && end > totalFrames)) issue("hook-frame-range", at, `${id}는 본문 프레임 범위 안에 있어야 한다`);
      if (!(from < settled)) issue("hook-window", at, `${id}: 등장 구간(from<settled)이 필요하다`);
      if (!(settled < to)) issue("hook-window", at, `${id}: 완전 표시 구간(settled<to)이 필요하다`);
      if (!(to <= end)) issue("hook-window", at, `${id}: to≤end가 아니다`);
      return event;
    };
    const pair = {text: checkEvent(textId, "label", "text", where), underline: checkEvent(underlineId, "motion", "underline", where)};
    // 밑줄은 대상이 든 줄의 글자 사건 안에 산다 — 줄 사건이 없으면 문구 사건.
    let underlineHost = pair.text;
    const rowEvents = new Map();
    if (rowsValid) phrase.rows.forEach((row, rowIndex) => {
      const id = row.text_event_id;
      if (id === undefined) return;
      const at = `${where}.rows[${rowIndex}]`;
      if (seenEvents.has(id)) { issue("hook-duplicate-ref", at, `event ${id}를 두 번 참조한다`); return; }
      seenEvents.add(id);
      const event = checkEvent(id, "label", "row text", at);
      if (!event) return;
      if (pair.text && (event.from < pair.text.from || event.end > pair.text.end))
        issue("hook-row-outside", at, `줄 사건 ${event.from}..${event.end}가 문구 글자 ${pair.text.from}..${pair.text.end} 밖이다`);
      rowEvents.set(id, event);
      if (row.runs.some((run) => run.underline === true)) underlineHost = event;
    });
    if (policy === HOOK_POLICY && rowsValid && pair.text) {
      const windows = phrase.rows.map(row => rowEvents.get(row.text_event_id) ?? pair.text).sort((a,b) => a.from - b.from);
      let end = windows[0]?.end;
      for (const window of windows.slice(1)) {
        if (window.from >= end) issue('hook-once', where, '후킹 줄 사이에 빈 구간이 있어 사라졌다 재등장한다');
        end = Math.max(end, window.end);
      }
    }
    if (underlineHost && pair.underline && (pair.underline.from < underlineHost.from || pair.underline.end > underlineHost.end))
      issue("hook-underline-outside", where, `밑줄 ${pair.underline.from}..${pair.underline.end}가 글자 ${underlineHost.from}..${underlineHost.end} 밖이다`);
    if (index === 0 && pair.text && first && Number.isFinite(fps)) {
      const lineEnd = Math.round(first.end * fps);
      if (pair.text.timing?.from?.anchor?.line !== first.id) issue("hook-first-anchor", where, `첫 문구의 from 앵커는 첫 줄 ${first.id}이어야 한다`);
      if (pair.text.from < 0 || pair.text.from >= lineEnd) issue("hook-first-anchor", where, `첫 문구가 첫 발화(0..${lineEnd}f) 안에서 시작하지 않는다: ${pair.text.from}f`);
      if (rowsValid) {
        const firstVisible = Math.min(...phrase.rows.map(row => (rowEvents.get(row.text_event_id) ?? pair.text).from));
        if (firstVisible >= lineEnd) issue("hook-first-anchor", where, `실제 표시할 첫 줄이 첫 발화 끝 ${lineEnd}f 이후에 시작한다: ${firstVisible}f`);
      }
    }
    const previous = compiled.at(-1);
    if (pair.text && previous && pair.text.from < previous.text_event.from)
      issue("hook-phrase-order", where, "문구는 등장 순서대로 적는다");
    if (pair.text && pair.underline) compiled.push({ id: elementId, text: element.text, text_event: pair.text, underline_event: pair.underline, ...(phrase.layout ? {layout: {...phrase.layout}} : {}), ...(runs ? {runs} : {}), ...(rowsValid ? {rows: compileHookRows(phrase.rows, rowEvents)} : {}) });
  }
  const rowsMode = phrases.some((phrase) => object(phrase) && phrase.rows !== undefined) || [HOOK_POLICY, HOOK_POLICY_V3].includes(policy);
  if (rowsMode && phrases.some((phrase) => object(phrase) && phrase.rows === undefined))
    issue("hook-rows", "story.json hook.phrases", "rows를 쓰는 편은 모든 문구를 rows로 작성한다");
  // 옛 runs 경로만 크기·색 위계를 기계 검사한다. rows는 밑줄 대상만 요구하고 시각 품질은 실물 검수 몫이다.
  if (!rowsMode && (policy === HOOK_POLICY_V2 || compiled.some(p => p.runs)) && !errors.length) {
    const styled = compiled.flatMap(phrase => (phrase.runs ?? []).map(run => ({
      role: run.role,
      size: run.font_size,
      color: run.text_color,
    })));
    const support = styled.filter(run => run.role === 'support'), emphasis = styled.filter(run => run.role === 'emphasis');
    if (!support.length || !emphasis.length || !support.some(a => emphasis.some(b => a.size !== b.size || a.color.toLowerCase() !== b.color.toLowerCase())))
      issue('hook-hierarchy', 'story.json hook.phrases', '보조·강조 구절 사이에 실제 크기 또는 색의 위계가 필요하다. 문구 개수나 두 단계 동작은 강제하지 않는다');
  }
  const valid = !errors.length;
  return { errors, overlay: valid ? { style: structuredClone(rowsMode ? HOOK_STYLE_V3 : policy === HOOK_POLICY_V2 || compiled.some(p => p.runs) ? HOOK_STYLE_V2 : LEGACY_HOOK_STYLE), phrases: compiled } : null, exemptElementIds: valid ? linked : new Set() };
};
