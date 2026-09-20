// 렌더 범위 지문 — 「직전 렌더 이후 무엇이 바뀌었나」를 비트 단위로 답한다.
//
// 왜: commands.md 에 「구간 렌더 — 한두 비트를 고치고 85초를 다시 돌리지 않는다」는 규칙이
//     2026-09-02 부터 있었다. 그런데 8편 P7 수정 라운드에서 **풀 렌더가 4회** 돌았다.
//     규칙은 있고 가드가 없었다 — 그 구간이 턴간 대기 97.5분의 최대 지분이다.
//     문서에 한 번 더 적는 대신, 렌더 직전에 「바뀐 비트는 이것뿐이고 명령은 이거다」를
//     계산해서 내민다. 규칙보다 계산된 명령이 지켜진다.
//
// 계약
//   - 지문은 `out/pilots/<id>/.render-scope.json` 에 산다. 파생물이라 gitignore 아래고,
//     지우면 「직전 렌더 없음」으로 되돌아간다 — 그게 이 가드의 리셋 방법이다.
//   - **읽는 쪽은 전부 fail-open.** 파일이 깨졌거나 스키마가 바뀌면 throw 하고,
//     부르는 쪽(pre-render-guard)이 통과시킨다. 가드가 작업을 막으면 사람이 훅을 꺼버린다.
//   - `generated_at` · `root` 는 지문에서 뺀다 — sync 를 돌릴 때마다 바뀌는 값이라
//     넣으면 「전부 바뀜」이 되어 가드가 아무 말도 못 하게 된다.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const FP_NAME = ".render-scope.json";

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** sync 마다 바뀌는 값은 지문에서 뺀다 — 안 그러면 매번 「전부 바뀜」이다. */
const VOLATILE = new Set(["generated_at", "root", "source", "_comment"]);
const stable = (obj) => {
  const out = {};
  for (const k of Object.keys(obj).sort()) if (!VOLATILE.has(k)) out[k] = obj[k];
  return out;
};

const byBeatId = (arr) => {
  const m = {};
  for (const it of arr ?? []) {
    const id = it?.beat ?? it?.id;
    if (id) m[id] = it;
  }
  return m;
};

/**
 * `pilots/<id>/` 의 렌더 입력을 두 갈래로 지문 뜬다.
 *   global — 비트에 매이지 않는 입력(소리·렌더 설정·비트 격자·그래픽 레이아웃).
 *            하나라도 바뀌면 전편이 영향을 받으므로 풀 렌더가 옳다.
 *   byBeat — 비트마다의 화면·자막·그래픽 계획. 여기만 바뀌면 그 비트만 다시 보면 된다.
 * 실패하면 throw — 부르는 쪽이 fail-open 한다.
 */
export function fingerprint(pilotsDir) {
  const f = (n) => join(pilotsDir, n);
  const shots = readJson(f("shots.json"));
  const overlays = readJson(f("overlays.json"));
  const beats = readJson(f("beats.json"));

  const global = {};
  for (const n of ["audio.json", "render.config.json", "story.json", "concepts.json", "motion.json", "visual-system.json", "timeline.json"]) {
    if (existsSync(f(n))) global[n] = sha(readFileSync(f(n), "utf8"));
  }
  // 비트 격자 자체가 바뀌면(길이·경계) 프레임 번호가 전부 밀린다 — 구간 렌더가 무의미하다.
  global["beats.grid"] = sha(
    JSON.stringify((beats.beats ?? []).map((b) => [b.id, b.start_frame, b.end_frame])),
  );
  // shots 루트에서 비트별 항목만 걷어낸 나머지 = 편 단위 계획(layer43_plan.layout, rules …)
  const { shots: _s, layer43_plan: plan, ...shotsRoot } = shots;
  global["shots.root"] = sha(JSON.stringify(stable(shotsRoot)));
  global["plan.layout"] = sha(JSON.stringify(plan?.layout ?? null));
  const { style, rules } = overlays;
  global["overlays.style"] = sha(JSON.stringify([style ?? null, rules ?? null]));

  const st = byBeatId(shots.shots);
  const ov = byBeatId(overlays.overlays);
  const byBeat = {};
  for (const b of beats.beats ?? []) {
    byBeat[b.id] = sha(JSON.stringify([st[b.id] ?? null, ov[b.id] ?? null, plan?.[b.id] ?? null]));
  }
  return { v: 1, at: new Date().toISOString(), global, byBeat };
}

export function readFp(path) {
  if (!existsSync(path)) return null;
  const fp = readJson(path);
  return fp?.v === 1 && fp.global && fp.byBeat ? fp : null;
}

export function writeFp(path, fp) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(fp, null, 1) + "\n");
}

/** prev → cur 사이에 바뀐 것. prev 가 없으면 「직전 렌더 없음」이라 판정하지 않는다. */
export function diff(prev, cur) {
  const globalChanged = [];
  for (const k of new Set([...Object.keys(prev.global), ...Object.keys(cur.global)])) {
    if (prev.global[k] !== cur.global[k]) globalChanged.push(k);
  }
  const ids = new Set([...Object.keys(prev.byBeat), ...Object.keys(cur.byBeat)]);
  const changedBeats = [...ids].filter((id) => prev.byBeat[id] !== cur.byBeat[id]).sort();
  return { globalChanged, changedBeats, total: Object.keys(cur.byBeat).length };
}

/**
 * 바뀐 비트를 `--frames=` 인자로. 전환(8프레임)이 걸치므로 앞뒤로 그만큼 넓히고,
 * 겹치거나 맞닿는 구간은 하나로 합친다. 전체를 덮으면 null — 그때는 풀 렌더가 옳다.
 */
export function framesArg(beatsDoc, ids, pad = 8) {
  const all = beatsDoc?.beats ?? [];
  if (!all.length || !ids.length) return null;
  const last = Math.max(...all.map((b) => b.end_frame ?? 0));
  const picked = all.filter((b) => ids.includes(b.id));
  if (!picked.length) return null;

  const ranges = picked
    .map((b) => [Math.max(0, (b.start_frame ?? 0) - pad), Math.min(last, (b.end_frame ?? 0) + pad)])
    .sort((a, b) => a[0] - b[0]);

  const merged = [ranges[0]];
  for (const [s, e] of ranges.slice(1)) {
    const tail = merged[merged.length - 1];
    if (s <= tail[1] + 1) tail[1] = Math.max(tail[1], e);
    else merged.push([s, e]);
  }
  const covered = merged.reduce((n, [s, e]) => n + (e - s), 0);
  if (covered >= last * 0.9) return null; // 사실상 전편이면 구간 렌더가 이득이 없다
  return { arg: merged.map(([s, e]) => `${s}-${e}`).join(","), covered, last };
}

/** 지문을 찍은 뒤 실제로 완료된 렌더가 있었나 — 있으면 「직전 풀 렌더」가 실재한다. */
export function completedRenderAfter(outDir, iso) {
  try {
    const t = Date.parse(iso);
    return readdirSync(outDir)
      .filter((n) => n.endsWith(".mp4"))
      .map((n) => statSync(join(outDir, n)))
      .some((s) => s.mtimeMs > t && s.size > 1_000_000); // 1MB 미만은 중단된 출력으로 본다
  } catch {
    return false;
  }
}
