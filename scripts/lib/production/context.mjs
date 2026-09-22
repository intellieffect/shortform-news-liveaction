import {visualWork} from './visual-work.mjs';
import {referenceContext} from '../visual-references.mjs';
import { episodePrompt } from './prompt.mjs';
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hash, json } from "./contracts.mjs";
import { availableReviewInputs, episodeMaterials, episodeObservations } from "./review-input.mjs";

export const productionContext = (w, state, actions, completion) => {
  const p = (file) => join(w.production, file);
  const story = existsSync(p("story.json")) ? json(p("story.json")) : {};
  const paths = ["facts.md", "story.json", "concepts.json", "narration.txt", "narration.json", "motion.json", "visual-system.json", "audio.json", "direction.md", "decisions.md", "review-actions.md"]
    .filter((f) => existsSync(p(f))).map((f) => w.rel(p(f)));
  // The checkout is the instruction source of truth, including when an older
  // compatible installed bridge invokes this engine. Invocation identity is reported separately.
  const pluginRoot = join(w.repo, "plugin");
  const stage = !existsSync(p("facts.md")) ? "research" : !story.question || !existsSync(p("concepts.json")) || !existsSync(p("narration.txt")) ? "design" : actions.render.status !== "current" ? "production" : "review";
  const references = {
    research: ["shortform-news-input/reference/intake.md", "shortform-news-input/reference/facts.md", "shortform-news-input/reference/sourcing.md"],
    design: ["shortform-news-pipeline/reference/editorial-concept-track.md", "shortform-news-pipeline/reference/visual-direction.md"],
    production: ["shortform-news-input/reference/narration.md", "shortform-news-pipeline/reference/motion-timing.md", "shortform-news-pipeline/reference/production-state.md"],
    review: ["shortform-news-pipeline/reference/review-loop.md"],
  };
  let rawRequest = null;
  if (w.request) rawRequest = readFileSync(w.path("news/" + w.id + "/" + w.request.raw_request), "utf8");
  const visual = visualWork(w, state);
  const reviewInputs = availableReviewInputs(w, state, actions);
  const referencesForStage = [...references[stage]];
  if (Object.values(reviewInputs).some((input) => input.status === "current")) referencesForStage.push("shortform-news-pipeline/reference/review-loop.md");
  return {
    production_prompt: episodePrompt(w),
    reference_library: referenceContext(w),
    production_defaults: existsSync(join(w.root, "00_brief/production-defaults.json")) ? {
      snapshot: json(join(w.root, "00_brief/production-defaults.json")),
      guide: w.rel(join(w.root, "00_brief/production-defaults.md")),
      text: readFileSync(join(w.root, "00_brief/production-defaults.md"), "utf8"),
    } : null,
    stage, request: w.request, raw_request: rawRequest,
    repository: { root: w.repo, editorial_schema: join(w.repo, "docs/specs/editorial-concept.schema.md"), profile: join(w.repo, "config/production-profile.json"), entry: join(w.repo, "scripts/produce.mjs") },
    request_preserved: w.request ? hash(rawRequest) === w.request.raw_request_sha256 : null,
    profile: existsSync(join(w.repo, "config/production-profile.json")) ? { path: "config/production-profile.json", current: json(join(w.repo, "config/production-profile.json")), changed_since_start: w.request ? hash(readFileSync(join(w.repo, "config/production-profile.json"))) !== w.request.profile.sha256 : null } : null,
    instructions: ["shortform-news-pipeline/reference/visual-production.md", "shortform-news-pipeline/reference/creative-authority.md", "shortform-news-pipeline/reference/generation-provider.md", "shortform-news-pipeline/reference/quality-review.md", "shortform-news-pipeline/reference/visual-references.md", ...new Set(referencesForStage)].map((file) => join(pluginRoot, "skills", file)),
    creative_files: ["story.json", "concepts.json", "narration.txt", "motion.json", "audio.json"].map((file) => ({ path: w.rel(p(file)), status: existsSync(p(file)) ? "present" : "unwritten" })),
    source_directory: w.rel(join(w.root, "01_input")),
    scene_source: "src/editorial/episodes/" + w.id + ".tsx",
    note: "stage는 필요한 참고 자료를 고르는 안내다. 자료·원고·도해를 왕복하고 새 장면을 직접 작성할 수 있다. 파일 존재가 검수 통과를 뜻하지 않는다.",
    question: story.question ?? null, takeaway: story.takeaway ?? null, creative_scope: story.creative_scope ?? w.request?.creative_scope,
    sources: paths,
    narration: existsSync(p("narration.txt")) ? readFileSync(p("narration.txt"), "utf8") : null,
    decisions: ["direction.md", "decisions.md", "review-actions.md"].filter((f) => existsSync(p(f))).map((f) => ({ path: w.rel(p(f)), text: readFileSync(p(f), "utf8") })),
    work: {
      visual,
      materials: episodeMaterials(w), review_inputs: reviewInputs,
      observations: { ...episodeObservations(w, state, actions), issues: completion.issues },
      refresh: Object.entries(actions).filter(([, action]) => action.status !== "current").map(([action, value]) => ({ action, status: value.status, reasons: value.reasons, runnable: value.runnable })),
      note: "현재 편의 근거와 기술 작업 상태다. 다음 설명·자료·표현과 수정 범위는 제작자가 선택한다.",
    },
    review_directory: w.rel(p("reviews")),
    review_note: "기존 검수 문서는 과거 근거다. 현재 실물에 대한 통과로 자동 가져오지 않는다.",
  };
};
