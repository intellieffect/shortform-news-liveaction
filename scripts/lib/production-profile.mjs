import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyStyleOverride, styleOverrideIssues } from "./design-styles.mjs";

// 편에서만 고쳐 볼 자막 값: visual-system.json production_profile.override.caption. 버전·출력 규격·자막 계약은 바꾸지 않는다.
const FIXED_CAPTION_KEYS = ["preset", "segmentation", "max_lines"];
export const profileOverrideIssues = (profile, override) => {
  if (override === undefined) return [];
  if (!override || typeof override !== "object" || Array.isArray(override) || Object.keys(override).some((key) => key !== "caption")) return ["production_profile.override는 caption 값만 담는다"];
  const fixed = Object.keys(override.caption ?? {}).filter((key) => FIXED_CAPTION_KEYS.includes(key));
  if (fixed.length) return [`production_profile.override.caption.${fixed[0]}는 편에서 바꿀 수 없다`];
  return styleOverrideIssues(profile, override, "production_profile.override");
};

export const readProductionProfile = (reference, repo) => {
  const profile = readProfileVersion(reference, repo);
  // 잘못된 override는 적용하지 않는다 — editorial 검사가 profileOverrideIssues로 거절한다.
  return reference?.override && !profileOverrideIssues(profile, reference.override).length ? applyStyleOverride(profile, reference.override) : profile;
};

const readProfileVersion = (reference, repo) => {
  const current = JSON.parse(readFileSync(repo ? join(repo, "config/production-profile.json") : new URL("../../config/production-profile.json", import.meta.url), "utf8"));
  if (!reference || (reference.id === current.id && reference.version === current.version)) return current;
  if (/^[a-z0-9_-]+$/.test(reference.id ?? "") && /^\d+\.\d+\.\d+$/.test(reference.version ?? "")) {
    const archive = repo ? join(repo, `config/production-profiles/${reference.id}-${reference.version}.json`) : new URL(`../../config/production-profiles/${reference.id}-${reference.version}.json`, import.meta.url);
    if (existsSync(archive)) return JSON.parse(readFileSync(archive, "utf8"));
  }
  // 없는 버전은 호출자의 id/version 검사에서 거절한다.
  return current;
};

export const productionProfileErrors = (profile) => {
  const errors = [];
  if (profile?.schema_version !== "1.0" || typeof profile?.id !== "string" || !profile.id.trim() || typeof profile?.version !== "string" || !profile.version.trim()) errors.push("schema_version 1.0과 id/version 문자열이 필요하다");
  for (const key of ["width", "height", "fps"]) {
    if (!Number.isInteger(profile?.canvas?.[key]) || profile.canvas[key] <= 0) errors.push(`canvas.${key}는 양의 정수여야 한다`);
  }
  const caption = profile?.caption;
  if (caption?.segmentation != null && !["font-semantic@1", "font-semantic@2"].includes(caption.segmentation)) errors.push("알 수 없는 caption.segmentation 계약");
  if (caption?.max_lines != null && caption.max_lines !== 1) errors.push("caption.max_lines는 1이어야 한다");
  for (const key of ["preset", "font_family", "color", "accent", "backdrop"]) {
    if (typeof caption?.[key] !== "string" || !caption[key].trim()) errors.push(`caption.${key} 문자열이 필요하다`);
  }
  for (const key of ["font_size", "weight", "emphasis_weight", "enter_frames"]) {
    if (!Number.isInteger(caption?.[key]) || caption[key] <= 0) errors.push(`caption.${key}는 양의 정수여야 한다`);
  }
  for (const key of ["top", "side_inset", "padding_y", "padding_x", "radius", "lead_frames", "rise_px"]) {
    if (!Number.isInteger(caption?.[key]) || caption[key] < 0) errors.push(`caption.${key}는 0 이상의 정수여야 한다`);
  }
  if (!Number.isFinite(caption?.line_height) || caption.line_height <= 0) errors.push("caption.line_height는 양수여야 한다");
  if (caption?.top >= profile?.canvas?.height || caption?.side_inset * 2 >= profile?.canvas?.width) errors.push("자막 기준 위치가 캔버스 밖이다");
  return errors;
};
