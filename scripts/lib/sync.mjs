// sync 의 JSON 계약 — 「무엇을 어디서 복사하나」를 sync-pilot 과 낡음 검사가 **같은 표**로 본다.
//
// 왜 따로 있나: pilots/<id>/*.json 은 news/<id> 의 스냅샷이다. 스냅샷은 낡아도 소리를 안 낸다 —
// 6편에서 shots 를 13 비트로 고쳤는데 게이트는 pilots/ 의 12 비트를 판정했다(구조 점검 2026-09-02).
// 복사 자체는 렌더 중 동결이라는 값이 있어 남기고(pilots/ 존치 결정), **낡음을 묻는 검사**를 붙인다.
// 검사가 sync 와 다른 표를 들고 있으면 검사가 먼저 낡는다 — 그래서 표는 여기 하나다.
//
// render.config.json 은 이 표에 없다. 조립 층 토글은 pilots/<id>/ 가 **소유**한다 — 02_production 에 두면
// sync 가 편집을 덮어쓴다(6편에서 5번). sync 는 없을 때 기본값을 만들 뿐 복사하지 않는다.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirs, inputRoot, stripPilotPrefixDeep } from "./pilot.mjs";
import { engineMismatch, sourceEngine, EDITORIAL_ENGINE } from "./engine.mjs";

/** pilots/<id>/<name> ← <root>/<src> */
export const jsonSources = (root) => ({
  "beats.json": join(root, "02_production", "beats.json"),
  "overlays.json": join(root, "02_production", "overlays.json"),
  "shots.json": join(root, "02_production", "shots.json"),
  "assets.json": join(root, "01_input", "assets.json"),
  "audio.json": join(root, "02_production", "audio.json"),
});

export const editorialSources = (root) => ({
  "narration.json": join(root, "02_production", "narration.json"),
  "story.json": join(root, "02_production", "story.json"),
  "concepts.json": join(root, "02_production", "concepts.json"),
  "motion.json": join(root, "02_production", "motion.json"),
  "visual-system.json": join(root, "02_production", "visual-system.json"),
  "timeline.json": join(root, "02_production", "timeline.json"),
});

/** sync 가 쓰는 직렬화 그대로 — 옛 "pilot/…" 접두 제거 + 2칸 들여쓰기 + 개행. 비교도 이걸로 한다(포맷 차이는 낡음이 아니다). */
export const normalizeJson = (obj) => JSON.stringify(stripPilotPrefixDeep(obj), null, 2) + "\n";

/**
 * pilots/<id>/ 가 news/<id> 보다 낡았나. { stale: [name], missing: [name], ok }
 * 소스가 없는 파일은 판정하지 않는다(sync 도 못 만든다 — shots 빈 파일·audio 기본값은 첫 sync 가 소스부터 만든다).
 */
export const syncStatus = (id, root = inputRoot(id), data = dirs(id).data) => {
  const stale = [], missing = [];
  const editorial = sourceEngine(root) === EDITORIAL_ENGINE;
  const sources = editorial
    ? { "assets.json": jsonSources(root)["assets.json"], "audio.json": jsonSources(root)["audio.json"], ...editorialSources(root) }
    : jsonSources(root);
  const mismatch = engineMismatch(root, data);
  if (mismatch) stale.push(`pilot.json(engine ${mismatch.manifest}≠${mismatch.source})`);
  for (const [name, src] of Object.entries(sources)) {
    if (!existsSync(src)) continue;
    const dst = join(data, name);
    if (!existsSync(dst)) { missing.push(name); continue; }
    let want, have;
    try { want = normalizeJson(JSON.parse(readFileSync(src, "utf8"))); have = normalizeJson(JSON.parse(readFileSync(dst, "utf8"))); }
    catch { stale.push(`${name}(JSON 깨짐)`); continue; }
    if (want !== have) stale.push(name);
  }
  return { stale, missing, ok: !stale.length && !missing.length };
};

export const syncHint = (id) => `npm run sync -- news/${id}`;

// 복사와 의존성 추적이 같은 소스 선택 순서를 사용한다.
export const audioSourceCandidates = (root, file) => {
  const name = file.split("/").pop();
  return ["", "script_v1"].flatMap((sub) =>
    ["derived", "bgm", "sfx", ""].map((dir) => join(root, "02_production", "external_assets", sub, "audio", dir, name)),
  );
};
