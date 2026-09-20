import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hash, json, repositoryPath } from "./contracts.mjs";

// 현재 통합 저장소의 선택만 읽는다. 편을 만들기 전에 모든 입력을 검증한다.
export const readProjectDefaults = (repo, profile) => {
  const config = join(repo, "config/production-defaults.json");
  if (!existsSync(config)) throw new Error("새 편 제작 기본값이 없다: config/production-defaults.json");
  const settings = json(config);
  if (settings.schema_version !== "restored-production-defaults@1") throw new Error("제작 기본값 버전이 유효하지 않다");
  const guide = readFileSync(repositoryPath(repo, settings.guide), "utf8");
  const manifestPath = repositoryPath(repo, settings.logo_package);
  const manifest = json(manifestPath), logo = manifest.logo;
  if (logo?.state !== "ready") throw new Error("새 편에 연결할 수령 로고가 없다");
  const source = repositoryPath(repo, join(dirname(settings.logo_package), logo.source));
  const bytes = readFileSync(source);
  if (hash(bytes) !== logo.sha256) throw new Error("로고 해시가 수령 패키지와 다르다");
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("로고는 PNG여야 한다");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (![logo.x, logo.y, logo.width, logo.height].every(Number.isFinite) || logo.x < 0 || logo.y < 0 || logo.width <= 0 || logo.height <= 0 || logo.x + logo.width > profile.canvas.width || logo.y + logo.height > profile.canvas.height || !width || !height || Math.abs(width / height - logo.width / logo.height) > 0.01) throw new Error("로고 배치 또는 종횡비가 유효하지 않다");
  return { guide, bytes, snapshot: { ...settings, guide_sha256: hash(guide), logo: { version: manifest.version, sha256: logo.sha256, file: "editorial/brand-logo.png", x: logo.x, y: logo.y, width: logo.width, height: logo.height } } };
};
