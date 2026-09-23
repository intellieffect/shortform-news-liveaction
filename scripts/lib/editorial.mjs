import {validateVisualPlan} from './visual-plan.mjs';
import {SCREEN_TEXT_POLICY, screenTextPolicyIssues} from './screen-text-policy.mjs';
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readProductionProfile, productionProfileErrors } from "./production-profile.mjs";

const ID = /^[a-z][a-z0-9_-]*$/;
const SCRIPT_POLICIES = new Set(["editorial-owned", "script-faithful"]);
const SCOPE_VALUES = new Set(["delegated", "locked", "approval-required"]);
const MEDIA = new Set(["footage", "image", "diagram", "hybrid", "text"]);
const ROLES = new Set(["evidence", "metaphor", "tone"]);
const TEXT_ROLES = new Set(["necessary-label", "condition", "provenance"]);
const EASING = new Set(["ease-out", "ease-in-out", "ease-in", "linear", "cubic-in", "cubic-out", "quad-in"]);
// The agent-facing specification uses the same values as validation.
export const editorialContract = () => ({
  script_policies: [...SCRIPT_POLICIES], creative_scope: [...SCOPE_VALUES],
  representation_kinds: [...MEDIA], representation_roles: [...ROLES],
  text_roles: [...TEXT_ROLES], easing: [...EASING],
});
const validEasing = (value) => EASING.has(value) || (
  Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) &&
  value[0] >= 0 && value[0] <= 1 && value[2] >= 0 && value[2] <= 1
);

export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const normalizeNarration = (raw) => {
  const source = raw.sentences ?? raw.lines;
  if (!Array.isArray(source)) throw new Error("narration.json: sentences 또는 lines 배열이 필요하다");
  return source.map((line, index) => ({
    id: line.id,
    index,
    text: line.text ?? line.spoken_text ?? line.spoken ?? "",
    start: line.start,
    end: line.end,
    words: line.words ?? [],
  }));
};

export const narrationWordHash = (lines) => sha256(JSON.stringify(lines.flatMap((line) => line.words)));

const issue = (list, code, where, message) => list.push({ code, where, message });
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const unique = (values) => values.length === new Set(values).size;
const object = (value) => value && typeof value === "object" && !Array.isArray(value);

const resolvePoint = (point, lineById, fps, errors, where) => {
  if (!object(point?.anchor)) {
    issue(errors, "motion-anchor-required", where, "각 시점은 line+token_index+word 앵커를 가져야 한다");
    return null;
  }
  const { line, token_index: tokenIndex, word, edge = "start", offset_frames: offset = 0 } = point.anchor;
  const narrationLine = lineById.get(line);
  if (!narrationLine) {
    issue(errors, "motion-anchor-line", where, `내레이션 줄 ${line}이 없다`);
    return null;
  }
  if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex >= narrationLine.words.length) {
    issue(errors, "motion-anchor-token", where, `${line} token_index=${tokenIndex}가 범위를 벗어난다`);
    return null;
  }
  const token = narrationLine.words[tokenIndex];
  if (token.text !== word) {
    issue(errors, "motion-anchor-word", where, `${line}[${tokenIndex}]은 "${token.text}"인데 "${word}"를 기대한다`);
    return null;
  }
  if (!new Set(["start", "end"]).has(edge)) {
    issue(errors, "motion-anchor-edge", where, `edge=${edge}; start 또는 end만 허용한다`);
    return null;
  }
  if (!Number.isInteger(offset)) {
    issue(errors, "motion-anchor-offset", where, "offset_frames는 정수여야 한다");
    return null;
  }
  return Math.round(token[edge] * fps) + offset;
};

const noAbsoluteFrames = (value, errors, path = "motion") => {
  if (Array.isArray(value)) return value.forEach((v, i) => noAbsoluteFrames(v, errors, `${path}[${i}]`));
  if (!object(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "frame" || key.endsWith("_frame")) issue(errors, "motion-absolute-frame", `${path}.${key}`, "손으로 적은 절대 프레임은 허용하지 않는다");
    noAbsoluteFrames(child, errors, `${path}.${key}`);
  }
};

export const validateEditorialData = ({ story, concepts, motion, visualSystem, narration, productionProfile, visualContractRequired = false, screenTextPolicy = null }) => {
  const visualCheck = validateVisualPlan({concepts, visualSystem, required: visualContractRequired});
  const errors = [...visualCheck.errors], warnings = [...visualCheck.warnings];
  // screen-text@1 편만 적용한다. 이전 편의 기록된 표기는 소급해 막지 않는다.
  if (screenTextPolicy === SCREEN_TEXT_POLICY) {
    const policy = screenTextPolicyIssues({ concepts, narration });
    errors.push(...policy.errors); warnings.push(...policy.warnings);
  }
  let lines = [];
  try { lines = normalizeNarration(narration); }
  catch (error) { issue(errors, "narration-shape", "narration.json", error.message); }
  const lineIds = lines.map((line) => line.id);
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const lineIndex = new Map(lineIds.map((id, i) => [id, i]));
  for (const line of lines) {
    if (!hasText(line.id) || !ID.test(line.id)) issue(errors, "narration-line-id", "narration.json", `잘못된 line id: ${line.id}`);
    if (!Number.isFinite(line.start) || !Number.isFinite(line.end) || line.end <= line.start) issue(errors, "narration-line-time", line.id, "start < end가 필요하다");
    if (!Array.isArray(line.words) || !line.words.length) issue(errors, "narration-words", line.id, "단어 시각이 없다");
  }
  if (!unique(lineIds)) issue(errors, "narration-line-duplicate", "narration.json", "line id가 중복된다");

  if (story?.schema_version !== "1.0") issue(errors, "story-schema", "story.json", "schema_version은 1.0이어야 한다");
  if (story?.mode !== "editorial-concept") issue(errors, "story-mode", "story.json", "mode는 editorial-concept여야 한다");
  if (!SCRIPT_POLICIES.has(story?.script_policy)) issue(errors, "story-script-policy", "story.json", "script_policy가 유효하지 않다");
  const pilotIds = [story?.pilot, concepts?.pilot, motion?.pilot, narration?.pilot].filter(Boolean);
  if (!pilotIds.length || new Set(pilotIds).size !== 1) issue(errors, "editorial-pilot-mismatch", "editorial bundle", "모든 파일의 pilot id가 같아야 한다");
  for (const key of ["script", "assets", "diagrams", "audio"]) {
    if (!SCOPE_VALUES.has(story?.creative_scope?.[key])) issue(errors, "story-creative-scope", `story.json creative_scope.${key}`, "delegated/locked/approval-required 중 하나가 필요하다");
  }
  if (!hasText(story?.question)) issue(errors, "story-question", "story.json", "시청자가 따라갈 질문이 필요하다");
  if (!hasText(story?.takeaway)) issue(errors, "story-takeaway", "story.json", "마지막에 이해할 결론이 필요하다");
  if (story?.credits != null && (!Array.isArray(story.credits) || story.credits.some((credit) => !hasText(credit)))) issue(errors, "story-credits", "story.json", "credits는 비어 있지 않은 문자열 배열이어야 한다");
  if (!Array.isArray(story?.concept_order) || !story.concept_order.length || !unique(story.concept_order)) issue(errors, "story-concept-order", "story.json", "중복 없는 concept_order가 필요하다");

  if (visualSystem?.schema_version !== "1.0") issue(errors, "visual-schema", "visual-system.json", "schema_version은 1.0이어야 한다");
  let profile = null;
  if (visualSystem?.production_profile != null) {
    profile = productionProfile ?? readProductionProfile(visualSystem.production_profile);
    const profileErrors = productionProfileErrors(profile);
    for (const message of profileErrors) issue(errors, "production-profile-invalid", "config/production-profile.json", message);
    const reference = visualSystem.production_profile;
    if (reference.id !== profile?.id || reference.version !== profile?.version) issue(errors, "production-profile-version", "visual-system.json", "사용 가능한 제작 프로필의 id/version과 다르다");
    if (!profileErrors.length) {
      for (const key of ["width", "height", "fps"]) if (visualSystem.canvas?.[key] !== profile.canvas[key]) issue(errors, "production-profile-canvas", `visual-system.json canvas.${key}`, "적용 제작 프로필과 출력 규격이 다르다");
      if (motion?.fps !== profile.canvas.fps) issue(errors, "production-profile-fps", "motion.json", "프로필과 발화 시간표의 fps가 다르다");
      // 숫자 스타일을 편별 메타데이터에 다시 적으면 실제 프로필과 어긋날 수 있다.
      if (Object.keys(visualSystem.caption ?? {}).some((key) => key !== "preset")) issue(errors, "caption-profile-duplicate", "visual-system.json caption", "프로필을 사용하는 편은 caption.preset만 참조한다. 실제 스타일은 config/production-profile.json에서 관리한다");
      if (visualSystem.caption?.preset !== profile.caption.preset) issue(errors, "caption-profile-mismatch", "visual-system.json caption.preset", "제작 프로필의 자막 preset과 다르다");
    }
  }
  if (visualSystem?.caption?.preset !== "betelgeuse-v1") issue(errors, "caption-preset", "visual-system.json", "후보 트랙 자막은 betelgeuse-v1을 쓴다");
  if (profile?.caption?.max_lines === 1) {
    const captions = narration?.captions ?? narration?.sentences ?? narration?.lines;
    if (!Array.isArray(captions) || !captions.length) issue(errors, "caption-segments", "narration.json captions", "한 줄 자막 구간이 필요하다");
    else for (const [index, caption] of captions.entries()) {
      const text = caption?.caption_text ?? caption?.text ?? caption?.spoken_text ?? "";
      const where = `narration.json captions[${index}]`;
      if (!hasText(text)) issue(errors, "caption-text", where, "빈 자막 구간은 허용하지 않는다");
      if (/[\r\n\u2028\u2029]/.test(text)) issue(errors, "caption-single-line", where, "한 줄 자막에는 줄바꿈을 넣지 않는다. 긴 문장은 실제 단어 시각에 맞춰 captions 구간으로 나눈다");
      if (!Number.isFinite(caption?.start) || !Number.isFinite(caption?.end) || caption.start < 0 || caption.end <= caption.start || caption.end > motion?.total_frames / motion?.fps + 1 / motion?.fps)
        issue(errors, "caption-time", where, "영상 안의 유효한 start/end가 필요하다");
      if (index && caption?.start < captions[index - 1]?.end) issue(errors, "caption-overlap", where, "자막 구간은 시간순이며 겹치지 않아야 한다");
    }
  }
  if (visualSystem?.text?.persistent_top_text !== false) issue(errors, "persistent-top-text", "visual-system.json", "상단 고정 설명은 끈다");
  if (visualSystem?.text?.explanatory_notes !== false) issue(errors, "explanatory-note", "visual-system.json", "제작 과정·도해 부연문구는 화면에 두지 않는다");
  if (visualSystem?.media?.full_bleed_default !== true) issue(errors, "full-bleed-default", "visual-system.json", "영상·이미지는 전체 화면을 기본값으로 둔다");
  const visualAssets = visualSystem?.media?.assets;
  if (visualAssets != null && !Array.isArray(visualAssets)) issue(errors, "visual-media-assets", "visual-system.json media.assets", "assets는 배열이어야 한다");
  for (const [index, asset] of (Array.isArray(visualAssets) ? visualAssets : []).entries()) {
    const where = `visual-system.json media.assets[${index}]`;
    if (!hasText(asset?.id) || !ID.test(asset.id)) issue(errors, "visual-media-id", where, "미디어 id가 필요하다");
    if (!hasText(asset?.source) || asset.source.startsWith("/") || asset.source.includes("..")) issue(errors, "visual-media-source", where, "source는 편 루트 안의 안전한 상대경로여야 한다");
    if (!hasText(asset?.file) || !asset.file.startsWith("editorial/") || asset.file.includes("..")) issue(errors, "visual-media-file", where, "file은 editorial/ 아래의 안전한 편 상대경로여야 한다");
    if (asset?.trim && (!Number.isFinite(asset.trim.from_sec) || asset.trim.from_sec < 0 || !Number.isFinite(asset.trim.duration_sec) || asset.trim.duration_sec <= 0))
      issue(errors, "visual-media-trim", where, "trim은 0 이상의 from_sec과 양수 duration_sec이 필요하다");
  }
  if (!Number.isInteger(visualSystem?.mobile?.max_simultaneous_labels) || visualSystem.mobile.max_simultaneous_labels < 1)
    issue(errors, "mobile-label-budget", "visual-system.json", "동시 라벨 예산은 양의 정수여야 한다");

  const conceptList = concepts?.concepts;
  noAbsoluteFrames(concepts, errors, "concepts");
  if (concepts?.schema_version !== "1.0" || !Array.isArray(conceptList) || !conceptList.length) issue(errors, "concepts-schema", "concepts.json", "schema_version 1.0과 concepts 배열이 필요하다");
  const conceptIds = Array.isArray(conceptList) ? conceptList.map((c) => c.id) : [];
  if (!unique(conceptIds)) issue(errors, "concept-id-duplicate", "concepts.json", "concept id가 중복된다");
  if (JSON.stringify(story?.concept_order ?? []) !== JSON.stringify(conceptIds)) issue(errors, "concept-order-mismatch", "concepts.json", "story.concept_order와 concepts 배열 순서가 다르다");
  const conceptById = new Map((conceptList ?? []).map((c) => [c.id, c]));
  const usedLines = new Map();
  const elementOwner = new Map();
  for (let ci = 0; ci < (conceptList ?? []).length; ci++) {
    const concept = conceptList[ci], where = `concepts.${concept?.id ?? ci}`;
    if (!ID.test(concept?.id ?? "")) issue(errors, "concept-id", where, "id 형식이 잘못됐다");
    if (!hasText(concept?.question) || !hasText(concept?.takeaway)) issue(errors, "concept-meaning", where, "질문과 takeaway가 필요하다");
    if (!Array.isArray(concept?.narration_lines) || !concept.narration_lines.length) issue(errors, "concept-lines", where, "narration_lines가 필요하다");
    const indices = (concept?.narration_lines ?? []).map((id) => lineIndex.get(id));
    if (indices.some((i) => i == null)) issue(errors, "concept-line-missing", where, "없는 narration line을 참조한다");
    const present = indices.filter((i) => i != null);
    if (present.some((v, i) => i && v !== present[i - 1] + 1)) issue(errors, "concept-lines-contiguous", where, "한 개념의 내레이션 줄은 연속해야 한다");
    for (const id of concept?.narration_lines ?? []) {
      if (usedLines.has(id)) issue(errors, "concept-line-overlap", where, `${id}가 ${usedLines.get(id)}와 겹친다`);
      usedLines.set(id, concept.id);
    }
    for (const prerequisite of concept?.prerequisites ?? []) {
      const pi = conceptIds.indexOf(prerequisite);
      if (pi < 0 || pi >= ci) issue(errors, "concept-prerequisite", where, `${prerequisite}는 앞선 개념이어야 한다`);
    }
    if (!MEDIA.has(concept?.representation?.kind) || !ROLES.has(concept?.representation?.role) || !hasText(concept?.representation?.why))
      issue(errors, "representation-choice", where, "표현 kind/role/why가 필요하다");
    if (["footage", "image", "hybrid"].includes(concept?.representation?.kind) && concept?.representation?.full_bleed !== true && !hasText(concept?.representation?.layout_exception))
      issue(errors, "full-bleed-media", where, "영상·이미지는 full_bleed:true, 아니면 구체적인 layout_exception이 필요하다");
    if (!object(concept?.state) || !Array.isArray(concept.state.keep) || !Array.isArray(concept.state.add) || !Array.isArray(concept.state.remove))
      issue(errors, "concept-state", where, "keep/add/remove 상태 배열이 필요하다");
    if (!Number.isInteger(concept?.mobile?.max_simultaneous_labels) || concept.mobile.max_simultaneous_labels < 1 || concept.mobile.max_simultaneous_labels > (visualSystem?.mobile?.max_simultaneous_labels ?? 3))
      issue(errors, "concept-mobile-budget", where, "개념별 동시 라벨 예산이 전역 예산 안에 있어야 한다");
    const elements = concept?.elements ?? [];
    if (!Array.isArray(elements) || !elements.length) issue(errors, "concept-elements", where, "유지·변화시킬 elements가 필요하다");
    for (const element of elements) {
      if (!ID.test(element?.id ?? "") || elementOwner.has(element?.id)) issue(errors, "element-id", where, `element id가 잘못됐거나 중복된다: ${element?.id}`);
      elementOwner.set(element?.id, concept.id);
      if (element?.kind === "text" && !TEXT_ROLES.has(element?.role)) issue(errors, "screen-text-role", `${where}.${element?.id}`, "화면 텍스트는 necessary-label/condition/provenance만 허용한다");
    }
    for (const id of concept?.mobile?.focal_priority ?? []) if (!elements.some((element) => element.id === id))
      issue(errors, "mobile-focal-element", where, `focal_priority의 ${id}가 elements에 없다`);
  }
  let activeElements = new Set();
  for (const concept of conceptList ?? []) {
    const where = `concepts.${concept.id}.state`;
    const state = object(concept.state) ? concept.state : { keep: [], add: [], remove: [] };
    const keep = Array.isArray(state.keep) ? state.keep : [];
    const add = Array.isArray(state.add) ? state.add : [];
    const remove = Array.isArray(state.remove) ? state.remove : [];
    for (const [name, values] of Object.entries({ keep, add, remove })) {
      if (!unique(values)) issue(errors, "concept-state-duplicate", `${where}.${name}`, "같은 요소가 중복된다");
      for (const id of values) if (!ID.test(id) || !elementOwner.has(id)) issue(errors, "concept-state-element", `${where}.${name}`, `존재하는 element id가 아니다: ${id}`);
    }
    const assignments = [...keep, ...add, ...remove];
    if (!unique(assignments)) issue(errors, "concept-state-conflict", where, "같은 요소를 keep/add/remove에 동시에 둘 수 없다");
    for (const id of keep) if (!activeElements.has(id)) issue(errors, "concept-state-keep", where, `${id}는 앞 장면에서 활성 상태가 아니다`);
    for (const id of remove) if (!activeElements.has(id)) issue(errors, "concept-state-remove", where, `${id}는 앞 장면에서 활성 상태가 아니다`);
    for (const id of add) if (elementOwner.get(id) !== concept.id) issue(errors, "concept-state-add", where, `${id}는 현재 개념이 정의한 요소가 아니다`);
    for (const id of activeElements) if (!keep.includes(id) && !remove.includes(id)) issue(errors, "concept-state-unhandled", where, `${id}를 keep 또는 remove로 명시해야 한다`);
    for (const element of concept.elements ?? []) if (!add.includes(element.id)) issue(errors, "concept-state-add", where, `${element.id}가 elements에 있지만 add에 없다`);
    activeElements = new Set([...keep, ...add]);
  }
  for (const line of lineIds) if (!usedLines.has(line)) issue(errors, "concept-line-unassigned", "concepts.json", `${line}이 어느 개념에도 없다`);

  const fps = motion?.fps;
  if (motion?.schema_version !== "1.0" || !Number.isInteger(fps) || fps <= 0) issue(errors, "motion-schema", "motion.json", "schema_version 1.0과 양의 fps 정수가 필요하다");
  if (!Number.isInteger(motion?.total_frames) || motion.total_frames <= 0) issue(errors, "motion-total-frames", "motion.json", "양의 total_frames 정수가 필요하다");
  const actualHash = narrationWordHash(lines);
  if (motion?.narration_word_sha256 !== actualHash) issue(errors, "motion-narration-stale", "motion.json", `단어 시각 해시가 다르다: ${actualHash}`);
  noAbsoluteFrames(motion, errors);
  const compiledEvents = [];
  const eventIds = new Set();
  for (const event of motion?.events ?? []) {
    const where = `motion.${event?.id ?? "(id 없음)"}`;
    if (!ID.test(event?.id ?? "") || eventIds.has(event.id)) issue(errors, "motion-event-id", where, "event id가 잘못됐거나 중복된다");
    eventIds.add(event?.id);
    if (!conceptById.has(event?.concept_id)) issue(errors, "motion-concept", where, `concept ${event?.concept_id}가 없다`);
    if (elementOwner.get(event?.element_id) !== event?.concept_id) issue(errors, "motion-element", where, `element ${event?.element_id}가 해당 개념에 없다`);
    for (const id of event?.coexist_with ?? []) if (!elementOwner.has(id)) issue(errors, "motion-coexist-element", where, `coexist_with의 ${id}가 없다`);
    for (const key of ["enter", "move", "exit"]) if (!validEasing(event?.easing?.[key])) issue(errors, "motion-easing", `${where}.easing.${key}`, "easing 이름 또는 유효한 cubic-bezier [x1,y1,x2,y2]가 필요하다");
    const points = {};
    for (const key of ["from", "settled", "to", "end"]) points[key] = resolvePoint(event?.timing?.[key], lineById, fps, errors, `${where}.${key}`);
    if (Object.values(points).every(Number.isFinite) && !(points.from <= points.settled && points.settled <= points.to && points.to <= points.end))
      issue(errors, "motion-order", where, `from≤settled≤to≤end가 아니다: ${JSON.stringify(points)}`);
    if (event?.kind === "label" && Number.isFinite(points.to) && Number.isFinite(points.settled) && points.to - points.settled < 12)
      issue(warnings, "motion-label-hold", where, `완전히 읽히는 구간이 ${points.to - points.settled}f로 짧다`);
    compiledEvents.push({ ...event, ...points });
  }
  const compiledById = new Map(compiledEvents.map((e) => [e.id, e]));
  for (const event of compiledEvents) for (const dependency of event.depends_on ?? []) {
    const parent = compiledById.get(dependency.event_id);
    if (!parent) issue(errors, "motion-dependency", `motion.${event.id}`, `event ${dependency.event_id}가 없다`);
    else if (parent[dependency.point ?? "settled"] > event.from) issue(errors, "motion-dependency-order", `motion.${event.id}`, `${dependency.event_id}.${dependency.point ?? "settled"} 전에 시작한다`);
  }
  for (const concept of conceptList ?? []) {
    const labels = compiledEvents.filter((event) => event.concept_id === concept.id && event.kind === "label" && Number.isFinite(event.settled));
    const probes = labels.flatMap((e) => [e.settled, e.to]);
    const concurrent = probes.reduce((max, frame) => Math.max(max, labels.filter((e) => e.settled <= frame && frame < e.to).length), 0);
    if (concurrent > (concept?.mobile?.max_simultaneous_labels ?? 0)) issue(warnings, "mobile-label-overflow", `concepts.${concept.id}`, `동시 라벨 ${concurrent}개가 계획 예산 ${concept?.mobile?.max_simultaneous_labels ?? 0}개를 넘는다 — 실제 모바일 화면에서 주목 대상과 조건 관계를 검수한다`);
    for (const pair of concept.semantic_pairs ?? []) {
      const a = compiledEvents.find((e) => e.element_id === pair.condition_element), b = compiledEvents.find((e) => e.element_id === pair.value_element);
      if (!a || !b) issue(errors, "semantic-pair-event", `concepts.${concept.id}`, `${pair.id}의 두 요소에 motion event가 필요하다`);
      else if (Math.max(a.settled, b.settled) >= Math.min(a.to, b.to)) issue(errors, "semantic-pair-overlap", `concepts.${concept.id}`, `${pair.id}의 조건과 값이 함께 보이지 않는다`);
    }
  }

  const conceptFrames = (conceptList ?? []).flatMap((concept, index, all) => {
    const first = lineById.get(concept.narration_lines[0]), last = lineById.get(concept.narration_lines.at(-1));
    if (!first || !last) return [];
    const previous = index ? lineById.get(all[index - 1].narration_lines.at(-1)) : null;
    const next = index + 1 < all.length ? lineById.get(all[index + 1].narration_lines[0]) : null;
    const derivedFrom = index === 0 ? 0 : Math.round(((previous?.end ?? first.start) + first.start) * fps / 2);
    const derivedEnd = next ? Math.round((last.end + next.start) * fps / 2) : Math.max(Math.round(last.end * fps), motion?.total_frames ?? 0);
    const from = concept.range?.from ? resolvePoint(concept.range.from, lineById, fps, errors, `concepts.${concept.id}.range.from`) : derivedFrom;
    const end = concept.range?.end ? resolvePoint(concept.range.end, lineById, fps, errors, `concepts.${concept.id}.range.end`) : derivedEnd;
    return { id: concept.id, from, end, duration: end - from, narration_lines: concept.narration_lines };
  });
  const conceptFrameById = new Map(conceptFrames.map((concept) => [concept.id, concept]));
  for (const concept of conceptFrames) {
    if (!Number.isFinite(concept.from) || !Number.isFinite(concept.end) || concept.duration <= 0)
      issue(errors, "concept-frame-range", `concepts.${concept.id}.range`, `컴파일된 구간 ${concept.from}..${concept.end}가 유효하지 않다`);
    if (Number.isFinite(concept.end) && concept.end > motion?.total_frames)
      issue(errors, "concept-after-video", `concepts.${concept.id}.range`, `${concept.end}f가 total_frames ${motion?.total_frames} 뒤다`);
  }
  for (const event of compiledEvents) {
    const concept = conceptFrameById.get(event.concept_id);
    if (concept && Number.isFinite(event.from) && Number.isFinite(event.end) && (event.from < concept.from - 12 || event.end > concept.end + 12))
      issue(errors, "motion-outside-concept", `motion.${event.id}`, `${event.from}..${event.end}가 개념 ${concept.from}..${concept.end} 밖이다`);
    if (Number.isFinite(event.end) && event.end > motion?.total_frames)
      issue(errors, "motion-after-video", `motion.${event.id}`, `${event.end}f가 total_frames ${motion?.total_frames} 뒤다`);
    for (const id of event.coexist_with ?? []) {
      const other = compiledEvents.find((candidate) => candidate.element_id === id);
      if (other && Math.max(event.settled, other.settled) >= Math.min(event.to, other.to))
        issue(errors, "motion-coexist-overlap", `motion.${event.id}`, `${id}와 완전 표시 구간이 겹치지 않는다`);
    }
  }
  const audioCues = [];
  for (const cue of motion?.audio_cues ?? []) {
    if (cue?.kind !== "sfx" || !hasText(cue?.asset) || !cue.asset.startsWith("audio/") || cue.asset.includes("..") || !Number.isFinite(cue?.gain_db))
      issue(errors, "audio-cue-shape", `motion.audio_cues.${cue?.id}`, "SFX cue에는 안전한 audio/ 상대경로와 gain_db가 필요하다");
    const event = compiledById.get(cue?.bind?.event_id), point = cue?.bind?.point ?? "from";
    const offset = cue?.bind?.offset_frames ?? 0;
    if (!event || !["from", "settled", "to", "end"].includes(point) || !Number.isFinite(event[point])) issue(errors, "audio-event-bind", `motion.audio_cues.${cue?.id}`, "존재하는 motion event 시점에 묶어야 한다");
    else if (!Number.isInteger(offset) || event[point] + offset < 0 || event[point] + offset >= motion.total_frames) issue(errors, "audio-event-range", `motion.audio_cues.${cue?.id}`, "SFX 시점은 영상 안의 정수 프레임이어야 한다");
    else audioCues.push({ ...cue, frame: event[point] + offset });
  }
  const proofMap = new Map();
  const addProof = (frame, label) => {
    if (!Number.isFinite(frame) || !Number.isFinite(motion?.total_frames)) return;
    const safe = Math.max(0, Math.min(motion.total_frames - 1, Math.round(frame)));
    const labels = proofMap.get(safe) ?? [];
    labels.push(label);
    proofMap.set(safe, labels);
  };
  for (const concept of conceptFrames) {
    addProof(concept.from, `concept:${concept.id}:from`);
    addProof(concept.end - 1, `concept:${concept.id}:end`);
  }
  for (const event of compiledEvents) for (const point of ["from", "settled", "to", "end"]) addProof(event[point], `event:${event.id}:${point}`);
  if (profile) for (const event of compiledEvents) {
    addProof(event.from - 1, `event:${event.id}:before`);
    addProof((event.from + event.settled) / 2, `event:${event.id}:enter-mid`);
    addProof((event.to + event.end) / 2, `event:${event.id}:exit-mid`);
  }
  const proofFrames = [...proofMap.entries()].sort(([a], [b]) => a - b).map(([frame, labels], index) => ({
    id: `p${String(index + 1).padStart(3, "0")}`,
    frame,
    labels,
  }));
  const timeline = {
    schema_version: "1.0",
    pilot: story?.pilot,
    fps,
    total_frames: motion?.total_frames,
    source: { narration_word_sha256: actualHash, story_sha256: sha256(JSON.stringify(story)), concepts_sha256: sha256(JSON.stringify(concepts)), motion_sha256: sha256(JSON.stringify(motion)), visual_system_sha256: sha256(JSON.stringify(visualSystem)) },
    concepts: conceptFrames,
    events: compiledEvents,
    audio_cues: audioCues,
    proof_frames: proofFrames,
  };
  if (profile) {
    timeline.production_profile = structuredClone(profile);
    timeline.source.production_profile_sha256 = sha256(JSON.stringify(profile));
  }
  return { errors, warnings, timeline };
};

export const loadEditorialBundle = (root) => {
  const production = existsSync(join(root, "02_production")) ? join(root, "02_production") : root;
  const narrationPath = existsSync(join(production, "narration.json")) ? join(production, "narration.json") : join(root, "narration.json");
  const request = existsSync(join(root, "00_brief/request.json")) ? readJson(join(root, "00_brief/request.json")) : null;
  return {
    screenTextPolicy: request?.screen_text ?? null,
    visualContractRequired: (existsSync(join(root, "00_brief/request.json")) && Boolean(readJson(join(root, "00_brief/request.json")).visual_contract)) || (existsSync(join(production, "run.json")) && Boolean(readJson(join(production, "run.json")).visual_contract)),
    story: readJson(join(production, "story.json")),
    concepts: readJson(join(production, "concepts.json")),
    motion: readJson(join(production, "motion.json")),
    visualSystem: readJson(join(production, "visual-system.json")),
    narration: readJson(narrationPath),
    production,
  };
};

export const validateEditorialBundle = (root, { write = false } = {}) => {
  const bundle = loadEditorialBundle(root);
  const result = validateEditorialData(bundle);
  if (write && !result.errors.length) writeFileSync(join(bundle.production, "timeline.json"), JSON.stringify(result.timeline, null, 2) + "\n");
  return result;
};
