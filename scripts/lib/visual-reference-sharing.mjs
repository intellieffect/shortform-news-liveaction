import { createHash } from "node:crypto";
// Validate the staged reference package, including LFS object IDs, without reading working files.
export function referenceSharingErrors(entries, read) {
  const paths = new Set(entries.map((e) => e.path)),
    errors = [],
    prefix = "references/visual/";
  const add = (m) => errors.push("레퍼런스 공유: " + m);
  const safe = (p) =>
    typeof p === "string" &&
    p.startsWith(prefix) &&
    !p.includes("\\") &&
    !p.split("/").some((x) => !x || x === "." || x === "..");
  const parse = (p) => {
    if (!paths.has(p)) throw new Error("파일 누락: " + p);
    return JSON.parse(read(p));
  };
  const hasConfig = paths.has("config/shared-references.json");
  if (!hasConfig) {
    if ([...paths].some((p) => p.startsWith("references/")))
      add("선정 설정 누락");
    return errors;
  }
  try {
    const selected = parse("config/shared-references.json"),
      collection = parse(prefix + "collection.json");
    if (
      selected.schema !== "shared-references@1" ||
      !Array.isArray(selected.cases) ||
      collection.schema !== "visual-reference-collection@1" ||
      !Array.isArray(collection.cases)
    )
      throw new Error("선정/세트 형식 오류");
    const allowed = new Set(),
      versions = new Set();
    for (const p of selected.common ?? []) {
      if (![prefix + "README.md", prefix + "collection.json"].includes(p))
        throw new Error("공통 파일 경계 오류: " + p);
      allowed.add(p);
    }
    for (const p of [prefix + "collection.json", collection.guide])
      if (!allowed.has(p)) add("공통 파일 미선정: " + p);
    for (const c of selected.cases) {
      if (
        !/^[a-z][a-z0-9-]*$/.test(c.id) ||
        !/^v\d+$/.test(c.version) ||
        !Array.isArray(c.files) ||
        versions.has(c.id + "@" + c.version)
      )
        throw new Error("사례 선정 형식/중복 오류");
      versions.add(c.id + "@" + c.version);
      const dir = prefix + `cases/${c.id}/versions/${c.version}/`;
      for (const p of c.files) {
        if (!safe(p) || !p.startsWith(dir) || allowed.has(p))
          throw new Error("파일 경계/중복 오류: " + p);
        allowed.add(p);
      }
      const manifest = dir + "case.json",
        item = parse(manifest);
      if (item.id !== c.id || item.version !== c.version)
        throw new Error("사례 ID/버전 불일치");
      for (const p of [
        manifest,
        dir + "source/entry.tsx",
        dir + "source/timing.json",
        dir + "validation.md",
        ...Object.values(item.files ?? {}),
        ...(item.inventory ?? []).map((x) => x.path),
      ]) {
        if (!safe(p) || !p.startsWith(dir) || !allowed.has(p) || !paths.has(p))
          add("선정 의존 파일 누락: " + p);
      }
      if (!Array.isArray(item.inventory) || !item.inventory.length)
        add("재현 파일 목록 누락: " + c.id);
      for (const f of item.inventory ?? []) {
        if (!/^[a-f0-9]{64}$/.test(f.sha256)) add("파일 해시 오류: " + f.path);
        if (
          paths.has(f.path) &&
          !/\.(mp4|webm|wav|png|jpg)$/.test(f.path) &&
          createHash("sha256").update(read(f.path)).digest("hex") !== f.sha256
        )
          add("파일 해시 불일치: " + f.path);
        if (paths.has(f.path) && /\.(mp4|webm|wav|png|jpg)$/.test(f.path)) {
          const body = read(f.path),
            oid = /^oid sha256:([a-f0-9]{64})$/m.exec(body)?.[1];
          if (
            !body.startsWith("version https://git-lfs.github.com/spec/v1\n") ||
            oid !== f.sha256
          )
            add("미디어 LFS/해시 불일치: " + f.path);
        }
      }
      if (
        !item.inventory?.some(
          (f) => f.path === item.files?.src && f.sha256 === item.video_sha256,
        )
      )
        add("확정 영상 해시 불일치");
    }
    for (const c of collection.cases)
      if (
        !versions.has(c.id + "@" + c.version) ||
        c.manifest !== prefix + `cases/${c.id}/versions/${c.version}/case.json`
      )
        add("공통 세트 사례 미선정");
    for (const p of allowed) if (!paths.has(p)) add("선정 파일 누락: " + p);
    for (const e of entries)
      if (e.path.startsWith("references/")) {
        if (!allowed.has(e.path)) add("미선정 파일: " + e.path);
        if (e.mode === "120000" || e.mode === "160000")
          add("외부 의존 링크 금지: " + e.path);
      }
  } catch (e) {
    add(e.message);
  }
  return [...new Set(errors)];
}
