import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hash, json } from "./contracts.mjs";
import { PROMPT_REGISTRY, PROMPT_VERSION, promptStatus, readPromptRegistry } from "./prompt.mjs";
import { productionProfileErrors } from "../production-profile.mjs";
import { listTracks } from "../music-library.mjs";

// "앞으로 모든 새 영상에 ○○" 요청이 바꾸는 전역 장치. 편은 start 때 버전·사본을 고정하므로 기존 편에는 소급되지 않는다.
// 각 함수는 바꾼 파일 목록(changed)을 돌려준다. scripts/defaults.mjs가 그 파일만 명시해 자동 커밋한다(settings-commit.mjs).
export const DEFAULTS_FILE = "config/production-defaults.json";
export const PROFILE_FILE = "config/production-profile.json";
const PROFILE_ARCHIVE = (id, version) => `config/production-profiles/${id}-${version}.json`;
const VOICE_KEYS = ["provider", "voice_id", "voice_name", "model", "language", "audio_tempo", "audio_pitch", "emotion_preset"];

const read = (repo, rel) => json(join(repo, rel));
const write = (repo, rel, value) => writeFileSync(join(repo, rel), JSON.stringify(value, null, 2) + "\n");
const today = () => {
  const d = new Date(), pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// .env는 make_narration.py와 같은 규칙으로 읽는다(빈 값은 없는 것, 따옴표·뒤 주석 제거). 값만 필요하다.
export const envValue = (repo, name, env = process.env) => {
  const direct = (env[name] ?? "").trim();
  if (direct) return { value: direct, from: "환경변수" };
  const file = join(repo, ".env");
  if (!existsSync(file)) return null;
  for (let line of readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const at = line.indexOf("=");
    if (line.slice(0, at).trim() !== name) continue;
    let value = line.slice(at + 1).trim();
    if (value.length > 1 && `'"`.includes(value[0]) && value.at(-1) === value[0]) value = value.slice(1, -1);
    else value = value.replace(/\s#.*$/, "").trim();
    return value ? { value, from: ".env" } : null;
  }
  return null;
};

const semver = (v) => /^(\d+)\.(\d+)\.(\d+)$/.exec(v ?? "")?.slice(1).map(Number);
const newer = (a, b) => { const x = semver(a), y = semver(b); if (!x || !y) return false; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** 지금 새 편에 적용되는 기본값. "지금 기본값이 뭔지 보여줘". */
export const showDefaults = (repo, { env = process.env } = {}) => {
  const defaults = read(repo, DEFAULTS_FILE);
  const prompt = promptStatus(repo);
  const profile = read(repo, PROFILE_FILE);
  const archives = readdirSync(join(repo, "config/production-profiles")).filter((f) => f.startsWith(profile.id + "-")).map((f) => f.slice(profile.id.length + 1, -5)).sort((a, b) => (newer(a, b) ? 1 : -1));
  const hook = read(repo, "config/hook-style.json"), attribution = read(repo, "config/attribution-style.json");
  const voice = defaults.narration?.voice ?? null;
  const envVoice = envValue(repo, "TYPECAST_VOICE_ID", env);
  let music = null;
  try { const tracks = listTracks(repo); music = { tracks: tracks.length, missing_files: tracks.filter((t) => !t.present).map((t) => t.id) }; } catch (error) { music = { error: error.message }; }
  return {
    prompt: { version: prompt.version, path: prompt.path, sha256: prompt.sha256, registered: Boolean(prompt.registered), matches_registry: prompt.matches },
    profile: { id: profile.id, version: profile.version, caption: { font_family: profile.caption?.font_family, font_size: profile.caption?.font_size, top: profile.caption?.top, side_inset: profile.caption?.side_inset, segmentation: profile.caption?.segmentation }, archived_versions: archives },
    narration: {
      config: voice, env_override: envVoice ? { voice_id: envVoice.value, from: envVoice.from } : null,
      effective_for_new_episode: envVoice ? { ...(voice ?? {}), voice_id: envVoice.value, voice_name: envValue(repo, "TYPECAST_VOICE_NAME", env)?.value ?? null } : voice,
      note: "음성을 이미 만든 편은 그 편의 02_production/voice.json을 따른다.",
    },
    hook_style: { version: hook.version, file: "config/hook-style.json", change_flow: "개발" },
    attribution_style: { version: attribution.version, file: "config/attribution-style.json", change_flow: "개발" },
    logo_package: defaults.logo_package,
    music_library: music,
  };
};

/** 새 편의 기본 보이스·속도. env(.env TYPECAST_VOICE_ID)가 있으면 config 값보다 우선하므로 경고한다. */
export const setVoice = (repo, patch, { env = process.env } = {}) => {
  const update = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  for (const key of Object.keys(update)) if (!VOICE_KEYS.includes(key)) throw new Error("바꿀 수 없는 음성 항목: " + key);
  if (!Object.keys(update).length) throw new Error("바꿀 값이 없다 — --voice-id · --voice-name · --tempo · --pitch · --emotion 중 하나 이상");
  if (update.voice_id !== undefined && !/^tc_[0-9a-z]+$/i.test(update.voice_id)) throw new Error("Typecast voice_id 형식(tc_…)이 아니다: " + update.voice_id);
  if (update.audio_tempo !== undefined && !(Number.isFinite(update.audio_tempo) && update.audio_tempo >= 0.5 && update.audio_tempo <= 2)) throw new Error("audio_tempo는 0.5~2.0 사이 수다");
  if (update.audio_pitch !== undefined && !(Number.isInteger(update.audio_pitch) && update.audio_pitch >= -12 && update.audio_pitch <= 12)) throw new Error("audio_pitch는 -12~12 정수다");
  const defaults = read(repo, DEFAULTS_FILE);
  const before = defaults.narration?.voice ?? null;
  // 보이스를 바꾸면 이전 이름이 남지 않게 한다.
  const next = { ...(before ?? {}), ...(update.voice_id && update.voice_name === undefined ? { voice_name: null } : {}), ...update };
  defaults.narration = { ...(defaults.narration ?? {}), voice: next };
  write(repo, DEFAULTS_FILE, defaults);
  const warnings = [];
  const envVoice = envValue(repo, "TYPECAST_VOICE_ID", env);
  if (envVoice && (update.voice_id !== undefined || update.voice_name !== undefined) && envVoice.value !== next.voice_id) {
    warnings.push(`${envVoice.from}의 TYPECAST_VOICE_ID(${envVoice.value})가 설정돼 있어 새 편에는 이 config 보이스가 적용되지 않는다. 바꾸려면 저장소 루트 .env의 TYPECAST_VOICE_ID(필요하면 TYPECAST_VOICE_NAME)를 같은 값으로 고치거나 줄을 지운다 — "API 키 등록.cmd"로 다시 등록해도 된다.`);
  }
  warnings.push("이미 음성을 만든 편은 그 편의 voice.json을 따른다 — 기존 편에는 소급되지 않는다.");
  return { before, after: next, changed: [DEFAULTS_FILE], warnings };
};

/** 기본 프롬프트 본문을 고친 뒤 새 버전을 등록한다. 이전 본문은 등록부 보관본으로 남는다. */
export const bumpPrompt = (repo, { note = null } = {}) => {
  const status = promptStatus(repo);
  if (status.matches) return { changed: [], version: status.version, reason: "본문이 등록된 " + status.version + "와 같다 — 버전을 올리지 않았다" };
  if (!status.template.trim() || status.template.split("[기사 URL]").length !== 2) throw new Error("본문에 [기사 URL] 치환 위치가 정확히 하나 있어야 한다 — 고친 뒤 다시 실행한다");
  const registry = readPromptRegistry(repo);
  const numbers = [status.version, ...registry.versions.map((v) => v.version)].map((v) => Number(PROMPT_VERSION.exec(v)?.[1] ?? 0));
  const version = "v2-original@" + (Math.max(...numbers) + 1);
  const archive = `config/production-prompts/${version}.txt`;
  if (existsSync(join(repo, archive))) throw new Error("보관본이 이미 있다: " + archive);
  copyFileSync(join(repo, status.path), join(repo, archive));
  registry.versions.push({ version, sha256: status.sha256, archive, recorded_at: today(), note });
  write(repo, PROMPT_REGISTRY, registry);
  const defaults = read(repo, DEFAULTS_FILE);
  defaults.production_prompt = { ...defaults.production_prompt, version };
  write(repo, DEFAULTS_FILE, defaults);
  return { from: status.version, version, changed: [status.path, archive, PROMPT_REGISTRY, DEFAULTS_FILE] };
};

/** 프로필 값을 고치기 전에 현재 버전을 보관한다. 기존 편은 이 보관본으로 계속 컴파일된다. */
export const archiveProfile = (repo) => {
  const profile = read(repo, PROFILE_FILE);
  const rel = PROFILE_ARCHIVE(profile.id, profile.version);
  if (existsSync(join(repo, rel))) {
    if (!sameJson(read(repo, rel), profile)) throw new Error(`${rel}가 이미 있고 현재 프로필과 다르다 — 값을 이미 고쳤다면 profile-bump로 새 버전을 올린다`);
    return { changed: [], archive: rel, reason: "이미 보관돼 있다" };
  }
  copyFileSync(join(repo, PROFILE_FILE), join(repo, rel));
  return { changed: [rel], archive: rel };
};

/** 보관 후 값을 고친 프로필에 새 버전을 매긴다. */
export const bumpProfile = (repo, version) => {
  const profile = read(repo, PROFILE_FILE);
  if (!semver(version)) throw new Error("새 버전은 x.y.z 형식이다");
  if (!newer(version, profile.version)) throw new Error(`새 버전 ${version}은 현재 ${profile.version}보다 커야 한다`);
  const rel = PROFILE_ARCHIVE(profile.id, profile.version);
  if (!existsSync(join(repo, rel))) throw new Error(`${profile.version} 보관본이 없다 — 값을 고치기 전에 profile-archive를 먼저 실행한다 (보관본 없이 올리면 ${profile.version} 편 컴파일이 깨진다)`);
  if (sameJson(read(repo, rel), profile)) throw new Error("프로필 값이 보관본과 같다 — 바꿀 값을 먼저 고친다");
  if (existsSync(join(repo, PROFILE_ARCHIVE(profile.id, version)))) throw new Error(`${version} 보관본이 이미 있다 — 다른 버전을 쓴다`);
  const next = { ...profile, version };
  const errors = productionProfileErrors(next);
  if (errors.length) throw new Error(errors.join("\n"));
  write(repo, PROFILE_FILE, next);
  return { from: profile.version, version, changed: [PROFILE_FILE, rel] };
};

/** 같은 라벨에 다른 내용이 붙는 빈틈을 찾는다. */
export const defaultsIntegrity = (repo) => {
  const errors = [];
  const prompt = promptStatus(repo);
  if (!prompt.registered) errors.push(`기본 프롬프트 ${prompt.version}가 ${PROMPT_REGISTRY}에 없다`);
  else if (!prompt.matches) errors.push(`기본 프롬프트 본문이 ${prompt.version} 등록 해시와 다르다 — npm run defaults -- prompt-bump`);
  for (const entry of readPromptRegistry(repo).versions) {
    if (!entry.archive || !existsSync(join(repo, entry.archive))) errors.push(`${entry.version} 보관본이 없다`);
    else if (hash(readFileSync(join(repo, entry.archive), "utf8").replace(/\r\n/g, "\n")) !== entry.sha256) errors.push(`${entry.version} 보관본 해시가 등록과 다르다`);
  }
  const profile = read(repo, PROFILE_FILE);
  const rel = PROFILE_ARCHIVE(profile.id, profile.version);
  if (existsSync(join(repo, rel)) && !sameJson(read(repo, rel), profile)) errors.push(`프로필 ${profile.version} 보관본과 현재 값이 다르다 — 값을 고쳤다면 profile-bump로 새 버전을 올린다`);
  errors.push(...productionProfileErrors(profile));
  return errors;
};
