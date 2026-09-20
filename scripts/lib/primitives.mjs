// 부품 id 등기처 — **소스가 정본이다.** 하드코딩 사본을 만들지 않는다.
//
// 왜(감사 2026-09-02): 같은 온스크린 집합을 `check-shots`(소스 파싱)와 `layout-43`(하드코딩)이
// 두 방법으로 두 번 유지하고 있었다. 우연히 일치했고, 둘 다 폐기 3종을 안고 있었다.
// 실측 등기처는 문서가 말하는 4군데가 아니라 6군데였다 — 이 파일이 그중 둘(layout-43·MOTION_GFX)을 없앤다.
//
// 남는 등기처 넷:
//   ① 렌더러 switch  src/lib/primitives/{Graphics,Onscreen}.tsx 의 `case "<id>"`  ← 무엇이 실제로 그려지나
//   ② 라우팅 집합    Onscreen.tsx 의 ONSCREEN_IDS                                 ← 카드로 그릴 id (Beat.tsx)
//   ③ 레지스트리     docs/specs/primitives.registry.v1.json                        ← 계약(bind·impl·props·rules·motion)
//   ④ props 스키마   docs/specs/primitives.props.schema.v1.2.json                  ← 값의 형태
// 넷의 어긋남은 `npm run check:registry` 가 본다.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./pilot.mjs";

const read = (rel) => { try { return readFileSync(join(REPO, rel), "utf8"); } catch { return ""; } };

export const RENDERER_FILES = ["src/lib/primitives/Graphics.tsx", "src/lib/primitives/Onscreen.tsx"];
export const ONSCREEN_SRC = "src/lib/primitives/Onscreen.tsx";
export const REGISTRY_PATH = "docs/specs/primitives.registry.v1.json";
export const PROPS_SCHEMA_PATH = "docs/specs/primitives.props.schema.v1.2.json";

// ① 렌더러가 실제로 그리는 id → 어느 파일의 case 인가
export const renderedIds = () => {
  const m = new Map();
  for (const f of RENDERER_FILES)
    for (const x of read(f).matchAll(/case\s+"([^"]+@\d+)"/g)) if (!m.has(x[1])) m.set(x[1], f);
  return m;
};
export const implementedIds = () => new Set(renderedIds().keys());

// ② 온스크린 카드로 라우팅되는 id (Beat.tsx 가 이 집합만 OnscreenByType 으로 보낸다)
export const onscreenIds = () => new Set(
  (read(ONSCREEN_SRC).match(/ONSCREEN_IDS\s*=\s*new Set\(\[([^\]]*)\]/)?.[1] ?? "")
    .split(",").map((x) => x.trim().replace(/^"|"$/g, "")).filter(Boolean),
);

// ③ 레지스트리
export const readRegistry = () => {
  const p = join(REPO, REGISTRY_PATH);
  if (!existsSync(p)) return { reg: null, byId: new Map() };
  const reg = JSON.parse(readFileSync(p, "utf8"));
  return { reg, byId: new Map((reg.primitives ?? []).map((x) => [x.id, x])) };
};

// 화면 내 변화를 만드는 부품(헌장 B3 면제) — registry `motion: true` 가 정본.
// 하드코딩 목록이 아니라 부품 계약 옆에 두는 이유: B3 면제 여부는 그 부품의 성질이다.
export const motionIds = (reg) => new Set((reg?.primitives ?? []).filter((p) => p.motion === true).map((p) => p.id));
