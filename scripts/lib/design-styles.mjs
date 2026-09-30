import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 후킹 디자인·크레딧 디자인 버전 보관본. 자막 프로필(production-profile.mjs)과 같은 방식이다.
// config/<kind>.json은 새 편에 붙는 기본값의 작업본이고, 버전마다 보관본이 있다. 편은 start 때 visual-system.json에
// {version}을 기록하고, 컴파일은 그 버전의 보관본을 읽어 timeline에 스냅숏한다(렌더는 timeline만 읽는다).
// 버전 기록이 없는 기존 편은 이 장치 이전의 값인 legacy 버전으로 읽힌다.
// 편에서만 고쳐 볼 값은 visual-system.json <key>.override에 적는다. 마음에 들면 defaults의 <kind>-bump --from-episode로 새 버전이 된다.
const hookArchive = (version) => `config/hook-styles/hook-style-v${/^hook-style@(\d+)$/.exec(version)?.[1]}.json`;
const attributionArchive = (version) => `config/attribution-styles/attribution-style-${version}.json`;
export const DESIGN_STYLES = {
  "hook-style": {
    key: "hook_style", label: "후킹 디자인", file: "config/hook-style.json", legacy: "hook-style@3",
    valid: (v) => /^hook-style@\d+$/.test(v ?? ""), archive: hookArchive,
    next: (v) => "hook-style@" + (Number(/^hook-style@(\d+)$/.exec(v)[1]) + 1),
    // hook-style@1·@2는 hook-overlay@1·@2 계약이 고정해 쓰는 보관본이다(hook-layout.mjs). 편 기록 대상은 @3부터다.
    first: 3,
  },
  "attribution-style": {
    key: "attribution_style", label: "크레딧 디자인", file: "config/attribution-style.json", legacy: "1.0.0",
    valid: (v) => /^\d+\.\d+\.\d+$/.test(v ?? ""), archive: attributionArchive,
    next: (v) => { const [a, b] = v.split(".").map(Number); return `${a}.${b + 1}.0`; },
  },
};
const specOf = (kind) => { const spec = DESIGN_STYLES[kind]; if (!spec) throw new Error("알 수 없는 디자인 설정: " + kind); return spec; };
const readJson = (repo, rel) => JSON.parse(readFileSync(repo ? join(repo, rel) : new URL("../../" + rel, import.meta.url), "utf8"));
const present = (repo, rel) => existsSync(repo ? join(repo, rel) : new URL("../../" + rel, import.meta.url));
const plain = (v) => v && typeof v === "object" && !Array.isArray(v);

/** 보관본 기준으로 override가 바꿀 수 있는 값인지 본다. 없는 항목·다른 자료형·version은 거절한다. */
export const styleOverrideIssues = (base, override, where = "override") => {
  if (override === undefined) return [];
  if (!plain(override)) return [`${where}는 객체다`];
  const errors = [];
  for (const [key, value] of Object.entries(override)) {
    if (key === "version" || !(key in base)) { errors.push(`${where}.${key}는 바꿀 수 없는 항목이다`); continue; }
    if (plain(base[key])) errors.push(...styleOverrideIssues(base[key], value, `${where}.${key}`));
    else if (typeof value !== typeof base[key] || (typeof value === "number" && !Number.isFinite(value)) || (typeof value === "string" && !value.trim())) errors.push(`${where}.${key}는 ${typeof base[key]} 값이다`);
  }
  return errors;
};
// 보관본의 항목 순서를 유지한다 — override가 없으면 보관본과 바이트 단위로 같은 스냅숏이 나온다.
export const applyStyleOverride = (base, override) => {
  if (!override) return structuredClone(base);
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(override)) out[key] = plain(base[key]) ? applyStyleOverride(base[key], value) : value;
  return out;
};

/** 편의 기록(visual-system.json <key>)을 실제 스타일로 푼다. 기록이 없으면 legacy 버전이다. */
export const resolveDesignStyle = (kind, reference, repo) => {
  const spec = specOf(kind);
  if (reference != null && !plain(reference)) return { errors: [`${spec.key}는 {version} 객체다`], style: null, version: null };
  const version = reference?.version ?? spec.legacy;
  if (!spec.valid(version) || (spec.first && Number(version.split("@")[1]) < spec.first)) return { errors: [`${spec.key}.version 형식이 잘못됐다: ${version}`], style: null, version };
  const rel = spec.archive(version);
  if (!present(repo, rel)) return { errors: [`${spec.label} ${version} 보관본(${rel})이 없다`], style: null, version };
  const base = readJson(repo, rel);
  if (base.version !== version) return { errors: [`${rel}의 version이 ${version}가 아니다`], style: null, version };
  const errors = styleOverrideIssues(base, reference?.override, `${spec.key}.override`);
  return { errors, style: errors.length ? null : applyStyleOverride(base, reference?.override), version };
};

/** start가 편에 기록할 지금 기본값. 작업본이 보관본과 다르면(버전을 안 올리고 값만 고침) 거절한다. */
export const currentDesignStyle = (kind, repo) => {
  const spec = specOf(kind);
  const current = readJson(repo, spec.file);
  const errors = designStyleIntegrity(kind, repo);
  if (errors.length) throw new Error(errors.join("\n"));
  return { version: current.version, style: current };
};

export const designStyleIntegrity = (kind, repo) => {
  const spec = specOf(kind);
  const current = readJson(repo, spec.file);
  if (!spec.valid(current.version)) return [`${spec.file} version 형식이 잘못됐다: ${current.version}`];
  const rel = spec.archive(current.version);
  if (!present(repo, rel)) return [`${spec.label} ${current.version} 보관본(${rel})이 없다`];
  if (JSON.stringify(readJson(repo, rel)) !== JSON.stringify(current)) return [`${spec.file} 값이 ${current.version} 보관본과 다르다 — 값을 고쳤다면 npm run defaults -- ${kind}-bump 로 새 버전을 올린다`];
  return [];
};
