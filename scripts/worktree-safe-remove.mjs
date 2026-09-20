#!/usr/bin/env node
/**
 * 워크트리 제거 — **지우기 전에 무엇이 사라지는지 센다.**
 *
 * 왜 (2026-09-03 사고): `git worktree remove` 는 **추적 파일의 변경만 보고 막는다.**
 * gitignore 된 것은 「없는 것」으로 취급해 조용히 지운다 — 7편에서 그렇게
 * `deliver/v1·v2·v3` 영상·마스터·커버, 클립 15개(1.1GB), `narration.wav` 가 한 번에 사라졌다.
 * 확정 직후의 납품본이었다. 기록: docs/research/2026-09-03-pipeline-restructure/incident-worktree-remove.md
 *
 * 등급
 *   ✗ 막는다   `out/pilots/<id>/deliver/`      납품본. 재현이 보장되지 않는다(TTS seed 없음 → 파형이 다르다)
 *              **단, 주 작업트리에 같은 파일이 다 있으면 통과한다**(2026-09-05 보강) —
 *              그전에는 「옮긴 뒤 다시 돌려라」고 안내해 놓고 목적지를 안 봐서, 옮겼는데도 계속 막혔다.
 *              결국 --force 를 쓰게 되고 **실제로 옮겼는지 아무도 확인 안 한 채 지우는** 구멍이 있었다.
 *   ⚠ 경고     `external_assets/` 미디어     `npm run fetch:assets` 로 복구된다(_search 원장)
 *              `audio/*.wav|mp3`             TTS 는 이력이 없다 — 재생성 + warp-narration 이 필요하다
 *              `public/pilots/`              `npm run restore:media` 로 복구된다
 *
 * 사용: node scripts/worktree-safe-remove.mjs <워크트리 경로> [--yes] [--force]
 *   기본은 **검사만** 한다. `--yes` 라야 실제로 지운다. `--force` 는 납품본이 있어도 지운다(권하지 않는다).
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { REPO } from "./lib/pilot.mjs";

const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith("--"));
if (!target) { console.error("usage: worktree-safe-remove.mjs <워크트리 경로> [--yes] [--force]"); process.exit(2); }
const GO = argv.includes("--yes");
const FORCE = argv.includes("--force");
const wt = resolve(target);
if (!existsSync(wt)) { console.error(`없다: ${wt}`); process.exit(1); }
// 주 작업트리 경로 — `REPO` 는 이 스크립트가 있는 트리(=워크트리)라 옮길 곳으로 못 쓴다.
const MAIN = (() => {
  const r = spawnSync("git", ["worktree", "list", "--porcelain"], { encoding: "utf8", cwd: wt });
  const first = (r.stdout ?? "").split("\n").find((l) => l.startsWith("worktree "));
  return first ? first.slice("worktree ".length).trim() : REPO;
})();
if (resolve(wt) === resolve(MAIN)) {
  console.error(`${wt} 는 **주 작업트리**다 — git worktree remove 로 지우는 대상이 아니다.`);
  process.exit(2);
}

const du = (p) => { // 바이트 합 (얕은 재귀)
  let n = 0;
  const walk = (d) => {
    let ents = [];
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const f = join(d, e.name);
      if (e.isDirectory()) walk(f);
      else try { n += statSync(f).size; } catch { /* 심링크·경합 */ }
    }
  };
  walk(p);
  return n;
};
const MB = (b) => `${(b / 1e6).toFixed(0)}MB`;

/** 디렉터리의 (상대경로 → 바이트) 지도. 크기까지 봐야 「이름만 같은 빈 파일」을 못 속인다. */
const fileMap = (root) => {
  const out = new Map();
  const walk = (d, pre) => {
    let ents = [];
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const f = join(d, e.name), k = pre ? `${pre}/${e.name}` : e.name;
      if (e.isDirectory()) walk(f, k);
      else try { out.set(k, statSync(f).size); } catch { /* 심링크·경합 */ }
    }
  };
  walk(root, "");
  return out;
};

/** 이 경로가 주 작업트리에 **그대로** 있나. { ok, missing[], total } */
const movedTo = (wtPath) => {
  const dst = join(MAIN, rel(wtPath));
  if (!existsSync(dst)) return { ok: false, missing: ["(폴더 자체가 없다)"], total: 0 };
  const a = fileMap(wtPath), b = fileMap(dst);
  const missing = [];
  for (const [k, size] of a) {
    if (!b.has(k)) missing.push(k);
    else if (b.get(k) !== size) missing.push(`${k} (크기 다름 ${size} ≠ ${b.get(k)})`);
  }
  return { ok: missing.length === 0, missing, total: a.size };
};
const rel = (p) => relative(wt, p) || ".";

// ── 무엇이 사라지나 ──────────────────────────────────────────────────────────
const blockers = [], warns = [];
const outDir = join(wt, "out/pilots");
if (existsSync(outDir))
  for (const id of readdirSync(outDir)) {
    const d = join(outDir, id, "deliver");
    if (existsSync(d)) blockers.push({ what: `${id} 납품본`, path: d, bytes: du(d) });
    const stage = join(outDir, id, "stage");
    if (existsSync(stage)) warns.push({ what: `${id} stage(중간물)`, path: stage, bytes: du(stage), fix: "재렌더" });
  }
const newsDir = join(wt, "news");
if (existsSync(newsDir))
  for (const id of readdirSync(newsDir)) {
    for (const [sub, fix] of [["02_production/external_assets", "npm run fetch:assets -- news/" + id],
                              ["02_production/audio", "TTS 재생성 + npm run warp-narration"]]) {
      const p = join(newsDir, id, sub);
      if (!existsSync(p)) continue;
      const b = du(p);
      if (b > 5e6) warns.push({ what: `${id} ${sub.split("/").pop()}`, path: p, bytes: b, fix });
    }
  }
const pub = join(wt, "public/pilots");
if (existsSync(pub)) { const b = du(pub); if (b > 5e6) warns.push({ what: "public 파생 캐시", path: pub, bytes: b, fix: "npm run restore:media" }); }

console.log(`worktree-safe-remove  ${wt}`);
// **목적지를 본다.** 이관이 끝난 것은 막지 않는다 — 그게 안내한 절차의 끝이다.
for (const b of blockers) b.moved = movedTo(b.path);
for (const w of warns) w.moved = movedTo(w.path);
const left = blockers.filter((b) => !b.moved.ok);
for (const b of blockers)
  console.log(b.moved.ok
    ? `  ✓ ${(b.what + " (이관됨)").padEnd(28)} ${MB(b.bytes).padStart(7)}  파일 ${b.moved.total}개가 주 작업트리에 그대로 있다`
    : `  ✗ ${b.what.padEnd(28)} ${MB(b.bytes).padStart(7)}  ${rel(b.path)}`);
for (const w of warns)
  console.log(w.moved.ok
    ? `  ✓ ${(w.what + " (이관됨)").padEnd(28)} ${MB(w.bytes).padStart(7)}  파일 ${w.moved.total}개`
    : `  ⚠ ${w.what.padEnd(28)} ${MB(w.bytes).padStart(7)}  ${rel(w.path)}   ← ${w.fix}`);
if (!blockers.length && !warns.length) console.log("  (지워도 잃을 게 없다)");

if (left.length && !FORCE) {
  const total = left.reduce((s, b) => s + b.bytes, 0);
  console.error(`
✗ 납품본이 ${left.length}건(${MB(total)}) **주 작업트리에 없다** — 지우지 않는다.
  납품본은 재현이 보장되지 않는다(TTS 가 seed 없이 생성돼 파형이 다시 안 나온다).
  먼저 주 작업트리(${MAIN.replace(process.env.HOME ?? "~", "~")})로 옮긴다:

${left.map((b) => `    rsync -a "${b.path}/" "${join(MAIN, rel(b.path))}/"`).join("\n")}
${left.flatMap((b) => b.moved.missing.slice(0, 5).map((m) => `      · 없는 것: ${m}`)).join("\n")}

  옮긴 뒤 같은 명령을 다시 돌린다 — **목적지를 다시 세어 통과시킨다.** 정말 버릴 거면 --force.`);
  process.exit(1);
}
if (!GO) { console.log("\n검사만 했다. 실제로 지우려면 --yes."); process.exit(0); }

const r = spawnSync("git", ["worktree", "remove", ...(FORCE ? ["--force"] : []), wt], { stdio: "inherit", cwd: REPO });
process.exit(r.status ?? 0);
