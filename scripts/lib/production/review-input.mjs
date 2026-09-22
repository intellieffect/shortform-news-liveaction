import {sceneReviewCandidate, priorSceneRevisions} from './scene-review.mjs';
import {visualWork} from './visual-work.mjs';
import {referenceContext} from '../visual-references.mjs';
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileSnapshot, json } from "./contracts.mjs";
import { productionIssues, productionReviewTemplate } from "./review.mjs";

// 읽기 전용 입력 구성. 관찰·검수 판정·실행 기록을 생성하지 않는다.
const mediaExtension = /\.(png|jpe?g|webp|tiff?|bmp|mp4|mov|webm|mkv|m4v|wav|mp3|m4a|ogg|flac)$/i;
export const inputReference = (w, path, expected) => {
  const sha256 = fileSnapshot(w, [path])[path];
  return { path, sha256, status: !sha256 ? "missing" : expected && expected !== sha256 ? "changed" : "present", ...(expected ? { expected_sha256: expected } : {}) };
};
const productionPath = (w, name) => w.rel(join(w.production, name));
const refs = (w, names) => names.map((name) => inputReference(w, productionPath(w, name)));
const directory = (w, path) => ({ path, status: existsSync(w.path(path)) ? "present" : "missing" });

export const episodeMaterials = (w) => {
  const prefix = "news/" + w.id + "/";
  const visual = existsSync(join(w.production, "visual-system.json")) ? json(join(w.production, "visual-system.json")) : {};
  return {
    originals: directory(w, prefix + "01_input"),
    candidates: directory(w, prefix + "02_production/external_assets"),
    records: ["01_input/assets.json", "01_input/MANIFEST.md", "01_input/05_참고자료/INDEX.md", "01_input/05_참고자료/RIGHTS.md", "02_production/asset_gaps.json", "02_production/asset_brief.md", "02_production/external_assets/candidates.json", "02_production/external_assets/SOURCES.md", "02_production/RIGHTS.md"].map((path) => inputReference(w, prefix + path)),
    selected: (visual.media?.assets ?? []).map((asset) => ({ id: asset.id ?? null, source: asset.source ? directory(w, prefix + asset.source) : null, file: asset.file ?? null })),
    note: "이번 편의 자료 경로다. 존재·선택 기록은 적합성·권리·실물 확인 판정이 아니다. 다른 위치의 후보는 현재 제작 노트에서 찾는다.",
  };
};

export const availableReviewInputs = (w, state, actions) => Object.fromEntries([["scene", "scene_proof"], ["preview", "proof"], ["render", "render"]].map(([source, action]) => {
  const receipt = state.receipts[action];
  let candidate = null, unavailable = null;
  if (source === 'scene') {
    try { candidate = sceneReviewCandidate(w, state); } catch (error) { unavailable = error.message; }
  }
  return [source, {
    action, status: actions[action].status, reasons: actions[action].reasons,
    reviewable: source === 'scene' ? Boolean(candidate) : actions[action].status === 'current',
    ...(unavailable ? {unavailable} : {}),
    receipt_id: source === 'scene' ? candidate?.attempt.id ?? null : receipt?.id ?? null, source_commit: source === 'scene' ? candidate?.attempt.source_commit ?? null : receipt?.source_commit ?? null,
    outputs: Object.entries(source === 'scene' ? candidate?.outputs ?? {} : receipt?.outputs ?? {}).map(([path, expected]) => inputReference(w, path, expected)),
    command: { executable: "node", args: [join(w.repo, "scripts/produce.mjs"), "review-input", w.id, "--source", source, "--phase", "experience"] },
  }];
}));

export const episodeObservations = (w, state, actions) => {
  const reports = state.attempts.filter((a) => a.status === "succeeded" && a.validation?.kind === "review").map((attempt) => {
    const { report, report_path: path } = attempt.validation;
    return {
      receipt_id: attempt.id, action: attempt.action, action_status: actions[attempt.action].status,
      latest_receipt: state.receipts[attempt.action]?.id === attempt.id,
      artifact: report.artifact, report: inputReference(w, path, attempt.outputs_sha256?.[path]),
      raw_report: inputReference(w, report.raw_report.path, report.raw_report.sha256),
    };
  });
  const folder = join(w.production, "reviews");
  const linked = new Set(reports.flatMap((r) => [r.report.path, r.raw_report.path]));
  const notes = existsSync(folder) ? readdirSync(folder).sort().filter((name) => /\.(md|json|txt)$/i.test(name) && statSync(w.path(productionPath(w, "reviews/" + name))).isFile())
    .map((name) => productionPath(w, "reviews/" + name)).filter((path) => !linked.has(path)).map((path) => ({ ...inputReference(w, path), artifact_binding: "unrecorded" })) : [];
  return { reports, notes, issues: productionIssues(state), note: "과거 관찰의 시간은 해당 artifact 기준이다. 미연결 노트는 현재 시안의 검수 완료로 가져오지 않는다. 수정·재확인은 기존 resolve/rechecks로 연결한다." };
};

const previewMedia = (w, path) => {
  const data = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,avg_frame_rate,nb_frames,duration:format=format_name,duration", "-of", "json", w.path(path)], { encoding: "utf8", timeout: 15000, maxBuffer: 4 * 1024 * 1024 }));
  const video = data.streams?.find((s) => s.codec_type === "video"), audio = data.streams?.find((s) => s.codec_type === "audio");
  if (!video && !audio) throw new Error("검토할 영상·이미지·음향 스트림이 없다: " + path);
  const still = video && /image2|(?:png|jpeg|webp|tiff|bmp)_pipe/.test(data.format?.format_name ?? "");
  const [n, d = 1] = String(video?.avg_frame_rate ?? "0").split("/").map(Number);
  const duration = Number(video?.duration ?? data.format?.duration);
  return {
    kind: still ? "image" : video ? "video" : "audio",
    width: video?.width ?? null, height: video?.height ?? null,
    fps: !still && Number.isFinite(n / d) && n / d > 0 ? n / d : null,
    duration: !still && Number.isFinite(duration) ? duration : null,
    total_frames: !still && Number.isInteger(Number(video?.nb_frames)) ? Number(video.nb_frames) : null,
    audio_present: Boolean(audio), inspection: "metadata_only",
  };
};

export const buildReviewInput = (w, state, actions, { source, phase }) => {
  if (!["scene", "preview", "render"].includes(source)) throw new Error("--source scene|preview|render를 지정한다");
  if (!["experience", "intent"].includes(phase)) throw new Error("--phase experience|intent를 지정한다");
  if (source === 'scene') {
    const {attempt, report, outputs} = sceneReviewCandidate(w, state);
    const result = {contract: 'scene-review-input@2', pilot: w.id, source, phase, receipt_id: attempt.id,
      attempt_status: attempt.status,
      files: [{...inputReference(w, report.artifact, outputs[report.artifact]), scope: report.scope, phase: report.phase, media: previewMedia(w, report.artifact)}],
      observation_status: 'not_performed', purpose: 'early_scene_review_not_final',
      instructions: phase === 'experience'
        ? '시안만 먼저 보고 실제로 읽힌 대상·관계·변화·결과와 문자 의존, 확인 도구·범위를 원문으로 반환한다. 제작 의도를 추측해 보충하지 않는다.'
        : '초견 원문을 보존한 뒤 발화·사실·계획과 대조한다. 설명의 의미, 재료·수단의 적합성, 자막 분절, 공통 레퍼런스의 완성도와 이전 revise를 실제로 재확인한다. docs/SCENE-PROOF.md의 review 형식으로 반환한다.'};
    if (phase === 'intent') result.context = {
      visual: visualWork(w, state), reference_library: referenceContext(w),
      documents: refs(w, ['facts.md', 'concepts.json', 'narration.txt', 'scene-proof.json', 'visual-system.json', 'direction.md', 'decisions.md']),
      previous_revisions: priorSceneRevisions(state, report),
      note: '정지 시안의 동작 의미는 unverified로 남긴다. 미시청은 통과가 아니다. 초기 시안은 최종 독립 검수를 대신하지 않는다.',
    };
    return result;
  }
  const action = source === "render" ? "render" : "proof", receipt = state.receipts[action];
  if (actions[action].status !== "current") throw new Error("현재 " + action + " 기록이 필요하다: " + actions[action].status + " — resume으로 입력과 결과를 확인한다");
  const artifact = source === "render" ? productionReviewTemplate(w, state, "review_visual").artifact : null;
  const timeline = json(join(w.production, "timeline.json"));
  const command = state.attempts.find((attempt) => attempt.id === receipt.id)?.command;
  const files = Object.entries(receipt.outputs).filter(([path]) => source === "render" || mediaExtension.test(path)).map(([path, expected]) => {
    const ref = inputReference(w, path, expected);
    if (ref.status !== "present") throw new Error("시안이 없거나 기록된 해시와 다르다: " + path);
    const frameArg = command?.args?.find((arg) => /^--frame=\d+$/.test(arg));
    return { ...ref, recorded_frame: source === "preview" && Object.keys(receipt.outputs).length === 1 && frameArg ? Number(frameArg.split("=")[1]) : null, media: source === "render" ? { kind: "video", ...receipt.validation.media, audio_present: true, inspection: "recorded_technical_validation" } : previewMedia(w, path) };
  });
  if (!files.length) throw new Error("proof 기록에 지원하는 이미지·영상·음향 파일이 없다");
  const result = {
    schema_version: "1.0", contract: "production-review-input@1", pilot: w.id, source, phase,
    receipt_id: receipt.id, source_commit: receipt.source_commit, input_sha256: receipt.inputs.sha256,
    episode_clock: { fps: timeline.fps, total_frames: timeline.total_frames, duration: timeline.total_frames / timeline.fps },
    artifact,
    files, purpose: source === "render" ? "final_artifact_review_input" : "production_preview_input",
    observation_status: "not_performed",
    note: "입력 파일과 기술 정보를 구성했다. 실제 사용 도구·관찰·시청·청취 범위는 검수자가 별도로 반환한다. 이 출력은 review-template 보고서가 아니다.",
  };
  if (phase === "intent") result.context = {
    visual: visualWork(w, state),
    reference_library: referenceContext(w),
    documents: refs(w, ["facts.md", "story.json", "concepts.json", "narration.txt", "narration.json", "timeline.json", "motion.json", "visual-system.json", "audio.json", "direction.md", "decisions.md", "review-actions.md"]),
    materials: episodeMaterials(w), observations: episodeObservations(w, state, actions),
    note: "먼저 받은 실물 관찰과 이번 편의 의도·사실·원래 문제를 대조한다. 이미 의도를 본 검수라면 노출 사실을 남긴다.",
  };
  // probe 중 파일이 바뀌면 같은 입력인 것처럼 전달하지 않는다.
  for (const file of files) if (fileSnapshot(w, [file.path])[file.path] !== file.sha256) throw new Error("입력 구성 중 시안이 바뀌었다: " + file.path);
  return result;
};
