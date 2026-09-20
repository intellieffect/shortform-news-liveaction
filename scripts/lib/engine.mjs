import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SCRIPT_ENGINE = "script-faithful@1";
export const EDITORIAL_ENGINE = "editorial-concept@1";
export const ENGINES = new Set([SCRIPT_ENGINE, EDITORIAL_ENGINE]);

export const sourceEngine = (root) => (existsSync(join(root, "02_production", "story.json")) || (existsSync(join(root, "00_brief/request.json")) && JSON.parse(readFileSync(join(root, "00_brief/request.json"), "utf8")).mode === "editorial-concept")) ? EDITORIAL_ENGINE : SCRIPT_ENGINE;

export const manifestEngine = (dataDir) => {
  const path = join(dataDir, "pilot.json");
  if (!existsSync(path)) return null;
  const engine = JSON.parse(readFileSync(path, "utf8")).engine ?? SCRIPT_ENGINE;
  if (!ENGINES.has(engine)) throw new Error(`지원하지 않는 pilot engine: ${engine}`);
  return engine;
};

export const engineMismatch = (root, dataDir) => {
  const source = sourceEngine(root);
  const manifest = manifestEngine(dataDir);
  return manifest && manifest !== source ? { source, manifest } : null;
};
