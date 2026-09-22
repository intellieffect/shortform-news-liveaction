import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { createHash } from "node:crypto";
export const COLLECTION = "references/visual/collection.json";
export const REFERENCE_SNAPSHOT = "00_brief/visual-references.json";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const safe = (p) =>
  typeof p === "string" &&
  p.startsWith("references/visual/") &&
  !p.includes("\\") &&
  !p.split("/").some((x) => !x || x === "." || x === "..");
export function referenceFile(root, path) {
  if (!safe(path)) throw new Error("레퍼런스 경로 오류: " + path);
  const file = join(root, path),
    actual = realpathSync(file),
    home = realpathSync(root);
  if (!actual.startsWith(home + sep) || !statSync(actual).isFile())
    throw new Error("레퍼런스 파일 경계 오류: " + path);
  return file;
}
const bytes = (root, path) => readFileSync(referenceFile(root, path));
const json = (root, path) => JSON.parse(bytes(root, path));
export function readReferenceCollection(root) {
  const collection = json(root, COLLECTION);
  if (
    collection.schema !== "visual-reference-collection@1" ||
    !collection.version ||
    !Array.isArray(collection.cases) ||
    !collection.cases.length
  )
    throw new Error("레퍼런스 세트 형식 오류");
  const seen = new Set();
  const cases = collection.cases.map((ref) => {
    if (
      !/^[a-z][a-z0-9-]*$/.test(ref.id) ||
      !/^v\d+$/.test(ref.version) ||
      seen.has(ref.id)
    )
      throw new Error("레퍼런스 ID/버전 오류");
    seen.add(ref.id);
    const expected = `references/visual/cases/${ref.id}/versions/${ref.version}/case.json`;
    if (ref.manifest !== expected)
      throw new Error("레퍼런스 manifest 경계 오류");
    const raw = bytes(root, expected),
      c = JSON.parse(raw);
    if (
      c.id !== ref.id ||
      c.version !== ref.version ||
      !Array.isArray(c.beats) ||
      !Array.isArray(c.transfer) ||
      !Array.isArray(c.specific)
    )
      throw new Error("사례 형식 오류: " + ref.id);
    for (const p of Object.values(c.files ?? {})) {
      if (typeof p !== "string" || !p.startsWith(expected.slice(0, -9)))
        throw new Error("사례 파일 경계 오류");
      referenceFile(root, p);
    }
    for (const k of ["src", "poster", "walkthrough", "credits", "sourceGuide"])
      if (!c.files?.[k]) throw new Error("사례 필수 파일 누락: " + k);
    if (
      !/^[a-f0-9]{64}$/.test(c.video_sha256) ||
      sha(bytes(root, c.files.src)) !== c.video_sha256
    )
      throw new Error("확정 영상 누락·변경/LFS 미복원: " + ref.id);
    return { ...c, manifest: expected, manifest_sha256: sha(raw) };
  });
  return {
    ...collection,
    guide_sha256: sha(bytes(root, collection.guide)),
    collection_sha256: sha(bytes(root, COLLECTION)),
    cases,
  };
}
export function captureReferences(root) {
  if (!existsSync(join(root, COLLECTION))) return null;
  const c = readReferenceCollection(root);
  return {
    schema: "visual-reference-snapshot@1",
    version: c.version,
    guide: c.guide,
    guide_sha256: c.guide_sha256,
    guide_text: bytes(root, c.guide).toString("utf8"),
    collection_sha256: c.collection_sha256,
    purpose: c.purpose,
    criteria: c.criteria,
    requestText: c.requestText,
    cases: c.cases,
    inspection: "not_performed",
  };
}
export function referenceContext(w) {
  const snapshot = join(w.root, REFERENCE_SNAPSHOT),
    record = w.request?.visual_references;
  try {
    if (record) {
      if (
        record.path !== REFERENCE_SNAPSHOT ||
        !/^[a-f0-9]{64}$/.test(record.sha256)
      )
        throw new Error("보존 레퍼런스 기록 오류");
      const raw = readFileSync(snapshot);
      if (sha(raw) !== record.sha256)
        throw new Error("보존 레퍼런스 스냅샷 변경");
      const c = JSON.parse(raw);
      if (c.schema !== "visual-reference-snapshot@1")
        throw new Error("보존 레퍼런스 형식 오류");
      if (sha(c.guide_text) !== c.guide_sha256)
        throw new Error("보존 공통 안내 변경");
      for (const item of c.cases) {
        if (
          sha(bytes(w.repo, item.manifest)) !== item.manifest_sha256 ||
          sha(bytes(w.repo, item.files.src)) !== item.video_sha256
        )
          throw new Error("고정 사례 버전 누락 또는 변경: " + item.id);
        for (const p of Object.values(item.files)) referenceFile(w.repo, p);
      }
      return {
        ...c,
        status: "preserved",
        snapshot: w.rel(snapshot),
        inspection: "not_performed",
        note: "고정 세트를 제공했다. 열람 완료가 아니다. 실제 확인 범위는 direction.md/decisions.md에서 확인하고 기록한다.",
      };
    }
    const c = captureReferences(w.repo);
    return c
      ? {
          ...c,
          status: "legacy-current-guidance",
          inspection: "not_performed",
          note: "기존 편에는 과거 열람을 소급 기록하지 않는다. 현재 공통 세트를 새 작업 참고로 제공한다.",
        }
      : {
          status: "missing",
          inspection: "not_performed",
          note: "공통 레퍼런스가 없다. LFS와 프로젝트 납품 파일을 확인한다.",
        };
  } catch (error) {
    return {
      status: "invalid",
      inspection: "not_performed",
      error: error.message,
    };
  }
}
export function collectReferences(root, outDir) {
  try {
    const c = readReferenceCollection(root);
    const url = (p) =>
      relative(outDir, referenceFile(root, p))
        .split(sep)
        .map(encodeURIComponent)
        .join("/");
    return {
      ...c,
      status: "ready",
      warnings: [],
      cases: c.cases.map((item) => ({
        ...item,
        ...Object.fromEntries(
          Object.entries(item.files).map(([k, p]) => [k, url(p)]),
        ),
      })),
    };
  } catch (error) {
    return {
      status: existsSync(join(root, COLLECTION)) ? "invalid" : "missing",
      title: "표현 레퍼런스",
      cases: [],
      criteria: [],
      warnings: [error.message],
    };
  }
}
