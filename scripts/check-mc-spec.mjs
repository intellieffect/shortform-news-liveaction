#!/usr/bin/env node
/**
 * MC 씬 계약 검사 — <root>/02_production/mc_spec.md 안의 ```json 블록을 읽어
 *   ① 요소끼리 2D bbox 겹침 (allow_overlap 에 선언한 쌍은 제외)
 *   ② 안전영역 x 80~1000 · 자막 밴드 y<1267
 *   ③ 선언 union bbox vs **렌더된 알파의 실측 bbox** — 계약이 낡았는지
 * 를 본다.
 *
 * 왜 y 만으로는 안 되나(5편 2026-09-01): b08 의 두 원은 y 대역이 100% 겹치는데 충돌이 아니고(나란히 놓은 설계),
 * x 로만 벌어진 충돌은 y 검사가 통째로 놓친다. 충돌은 2D 사각형 겹침이다.
 * 텍스트 폭은 폰트 메트릭이라 코드 상수로 예측이 안 된다 — 1회 렌더 후 실측치를 계약에 되기입한다.
 *
 * **스펙이 없으면 통과**하던 것을 뒤집었다(감사 2026-09-02): rules §5c ② "MC 를 쓰면 씬 계약을 먼저" 에 대한
 * 집행이 사실상 0 이었다 — 규칙을 어긴 상태(파일 없음)가 통과 조건이었다. 이제 `shots.graphics` 에
 * `motion_clip@1` 이 있는데 스펙이 없으면 `[mc-spec-required]` **오류**다.
 * 코드가 붙은 줄은 가드 세대(`pilot.json.guards`)가 등급을 정한다 — 선언 안 한 옛 편에서는 `check-all` 이 경고로 내린다.
 *
 * 사용: node scripts/check-mc-spec.mjs <root> [--shots <path>] [--no-alpha]
 * 좌표계: 씬 중심 원점(Motion Canvas). px = [540 + x, 960 + y]
 */
import { FFMPEG } from "./lib/tools.mjs";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { dirs, pilotIdFromRoot } from "./lib/pilot.mjs";

const argv = process.argv.slice(2);
const root = argv[0] && !argv[0].startsWith("--") && resolve(argv[0]);
const noAlpha = argv.includes("--no-alpha");
const shotsArg = argv.includes("--shots") ? argv[argv.indexOf("--shots") + 1] : null;
if (!root) { console.error("usage: check-mc-spec.mjs <pilot root> [--shots <path>] [--no-alpha]"); process.exit(2); }
const specPath = join(root, "02_production", "mc_spec.md");

// MC 를 쓰는 편인가 — shots.graphics 에 motion_clip@1 이 있으면 씬 계약이 **먼저** 있어야 한다 (rules §5c ②)
const shotsPath = shotsArg ? resolve(shotsArg) : join(root, "02_production", "shots.json");
const mcBeats = (() => {
  try {
    return (JSON.parse(readFileSync(shotsPath, "utf8")).shots ?? [])
      .filter((s) => (s.graphics ?? []).some((g) => g.id === "motion_clip@1")).map((s) => s.beat);
  } catch { return []; }
})();
if (!existsSync(specPath)) {
  if (!mcBeats.length) { console.log("mc_spec.md 없음 · shots 에 motion_clip@1 없음 — MC 를 쓰지 않는 편이다"); process.exit(0); }
  console.log(`mc_spec: 씬 0`);
  console.log(`ERROR [mc-spec-required] ${specPath} 가 없는데 shots.graphics 에 motion_clip@1 이 있다 (${mcBeats.join("·")}) — 씬 계약이 먼저다(rules §5c ②)`);
  process.exit(1);
}

const SAFE_X = [80, 1000], BAND_Y = 1267, W = 1080, H = 1920;
const toPx = (b) => [540 + b[0], 960 + b[1], 540 + b[2], 960 + b[3]];
const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const errors = [], warns = [];

const specs = [...readFileSync(specPath, "utf8").matchAll(/```json\s*([\s\S]*?)```/g)]
  .map((m) => { try { return JSON.parse(m[1]); } catch (e) { errors.push(`mc_spec.md json 파싱 실패: ${e.message}`); return null; } })
  .filter(Boolean);
if (!specs.length) warns.push("mc_spec.md 에 json 계약 블록이 없다 — 서술만으로는 검사할 수 없다");

const pub = dirs(pilotIdFromRoot(root)).pub;
for (const s of specs) {
  const tag = `${s.scene ?? "?"}(${s.beat ?? "?"})`;
  const els = s.elements ?? [];
  if (!els.length) { warns.push(`${tag}: elements 미기재 — 겹침을 검사할 수 없다`); }
  const allow = new Set((s.allow_overlap ?? []).map((p) => [...p].sort().join("|")));
  // ① 쌍별 2D 겹침
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j];
    if (!a.box || !b.box) continue;
    if (hit(a.box, b.box) && !allow.has([a.id, b.id].sort().join("|")))
      errors.push(`${tag}: ${a.id} ↔ ${b.id} 겹침 — 의도한 것이면 allow_overlap 에 선언한다`);
  }
  // ② 프레임·안전영역·자막 밴드
  for (const e of els) {
    if (!e.box) continue;
    const [x0, y0, x1, y1] = toPx(e.box);
    if (x0 < SAFE_X[0] || x1 > SAFE_X[1]) errors.push(`${tag}: ${e.id} 안전영역 밖 (px x ${Math.round(x0)}~${Math.round(x1)}, 허용 ${SAFE_X.join("~")})`);
    if (y1 >= BAND_Y) errors.push(`${tag}: ${e.id} 자막 밴드 침범 (px y 끝 ${Math.round(y1)} ≥ ${BAND_Y})`);
    if (y0 < 0 || y1 > H) errors.push(`${tag}: ${e.id} 프레임 밖 (px y ${Math.round(y0)}~${Math.round(y1)})`);
  }
  // ③ 선언 union vs 렌더 실측
  const clip = s.clip && join(pub, s.clip);
  if (!noAlpha && clip && existsSync(clip) && els.some((e) => e.box)) {
    const boxes = els.filter((e) => e.box).map((e) => toPx(e.box));
    const dec = [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])),
                 Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))];
    try {
      const at = s.measure_at_sec ?? 3;
      const raw = execFileSync(FFMPEG,
        ["-nostdin", "-loglevel", "error", "-c:v", "libvpx-vp9", "-ss", String(at), "-i", clip,
         "-frames:v", "1", "-vf", "alphaextract,format=gray", "-f", "rawvideo", "-"],
        { maxBuffer: 1 << 28 });
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2)
        if (raw[y * W + x] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const M = 24; // 그림자·안티에일리어싱 여유
      if (x0 < dec[0] - M || y0 < dec[1] - M || x1 > dec[2] + M || y1 > dec[3] + M)
        errors.push(`${tag}: 계약이 낡았다 — 선언 union px [${dec.map(Math.round)}] vs 렌더 실측 [${x0},${y0},${x1},${y1}]`);
      if (y1 >= BAND_Y) errors.push(`${tag}: 렌더 실측이 자막 밴드 침범 (y ${y1} ≥ ${BAND_Y})`);
    } catch (e) { warns.push(`${tag}: 알파 실측 실패 — ${String(e.message).slice(0, 80)}`); }
  } else if (clip && !existsSync(clip)) warns.push(`${tag}: 클립 ${s.clip} 없음 (restore:media 후 재검사)`);
  // 좌표 밖 계약 — 있으면 사람이 읽는다, 없으면 경고
  if (!s.claims) warns.push(`${tag}: claims 미기재 — 이 씬이 화면에 주장하는 수치를 적는다(근거 없는 수치 방지)`);
  if (!s.occludes) warns.push(`${tag}: occludes 미기재 — 배경의 무엇을 가리는지 적는다(b08 v1 이 진짜 과립을 가렸다)`);
}
console.log(`mc_spec: 씬 ${specs.length}`);
for (const w of warns) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
process.exit(errors.length ? 1 : 0);
