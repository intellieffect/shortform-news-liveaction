#!/usr/bin/env node
/**
 * 전 편 검사 러너 — 가드를 추가할 때 **옛 편이 안 깨졌는지**를 한 번에 본다.
 *
 * 왜 필요한가(감사 2026-09-01): 규칙 감사 제약이 "가드를 추가하면 옛 편 5개에 대해 ERROR 0 을 실측"인데
 * 그걸 실행할 명령이 없었다. 게다가 소급 실측(새 규칙을 옛 편에 거꾸로 적용해 편향을 보는 것)의
 * 실행기이기도 하다 — 5편이 3단 판정에서 한 번 하고 만 그 절차를 상시화한다.
 *
 * 네 가지를 러너가 흡수한다(개별 가드는 안 고친다):
 *   ① 미디어 캐시 결합 — public/pilots/<id>/ 가 없으면 `clip … not in public/` 은 결함이 아니라 SKIP 이다.
 *   ② 규약 이전 편 — layer43_plan.layout 이 없으면 layout:43 은 N/A(스크립트 단독으로는 exit 1 이 맞다).
 *   ③ 가드 세대 — **[코드]가 붙은 줄은 편이 등급을 정한다**: pilot.json.guards 에 선언했으면 오류,
 *      선언 안 했으면 경고. 승격(warn→ERROR)과 완화(ERROR→warn)가 같은 규칙의 양쪽이다 —
 *      가드가 옛 편에 소급되면 안 되는데 새 편에는 오류여야 할 때(예: mc-spec-required) 이게 필요하다.
 *   ④ 스냅샷 낡음 — pilots/<id>/ 가 news/<id> 보다 낡았으면 그 편은 **오류**(sync 열). 낡은 사본 위의 나머지 검사는 실제 데이터를 본 것이 아니다.
 *
 * 편 루프 앞에 `check-registry.mjs` 를 한 번 돌린다 — 등기 오류는 편이 아니라 저장소의 상태다.
 * 같은 자리에서 `check-links.mjs`(md 상대링크)와 `pilots-ledger.mjs --check`(대장 신선도)도 돈다 —
 * 구조 점검 2026-09-02: 스킬이 이사한 뒤 링크 25개가 깨져 있었고 대장은 6편을 몰랐는데, 어느 검사도 묻지 않았다.
 *
 * 사용: node scripts/check-all.mjs [<id> …] [--restore] [--json]
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { REPO, dirs, readActive, inputRoot } from "./lib/pilot.mjs";
import { syncStatus, syncHint } from "./lib/sync.mjs";
import { editorialPreflight } from "./lib/editorial-preflight.mjs";

const argv = process.argv.slice(2);
const wantJson = argv.includes("--json");
const wantRestore = argv.includes("--restore");
const ids = argv.filter((a) => !a.startsWith("--"));
const pilots = ids.length ? ids : readActive();

const MEDIA_MISS = /clip .* not in public\/pilots/;
const CODE = /^\[([a-z0-9-]+)\]/;   // 숫자를 빼면 gen-count-1 같은 코드가 조용히 안 잡힌다(2026-09-01 실측)
const run = (script, args, directory = "scripts") => {
  const r = spawnSync(process.execPath, [join(REPO, directory, script), ...args], { encoding: "utf8", cwd: REPO });
  return { out: `${r.stdout ?? ""}${r.stderr ?? ""}`, code: r.status };
};

// ⓪ 편과 무관한 등기 검사 — 편 루프 밖에서 한 번. 「쓰이지 않는 거짓 등기」는 편별 검사가 못 본다
const regRun = run("check-registry.mjs", []);
const regErr = (regRun.out.match(/^ERROR /gm) ?? []).length;
const regWarn = (regRun.out.match(/^warn  /gm) ?? []).length;
if (!wantJson) {
  console.log(`registry: ERROR ${regErr} · warn ${regWarn}`);
  for (const line of regRun.out.split("\n")) if (line.startsWith("ERROR ")) console.log(`  ${line}`);
}

// ⓪-2 저장소 상태 둘 더 — 링크·대장. 편이 아니라 저장소가 낡은 것이라 편 루프 밖.
// 커밋된 심링크 — 저장소의 상태다(편이 아니라). 2026-09-03 사고 2차: 절대·자기참조 심링크가 머지에서 추적 파일을 지웠다
const symRun = run("check-symlinks.mjs", []);
const symErr = (symRun.out.match(/^ERROR /gm) ?? []).length;
if (symErr) { console.log(symRun.out.trim()); } else { console.log(symRun.out.trim().split("\n")[0]); }

// 납품본 무결성 — 대장 md5 ↔ 실물. 규약은 「납품본은 대장의 md5 가 기준」인데 검사가 없었다(2026-09-03)
const delRun = run("check-deliver.mjs", []);
const delErr = (delRun.out.match(/^ERROR /gm) ?? []).length;
console.log(delErr ? delRun.out.trim() : delRun.out.trim().split("\n")[0]);

// ⓪-3 결함 장부 채점 — 장부 스키마·유령 guard(선언-실체 대조). 편이 아니라 저장소의 상태라 편 루프 밖 (2026-09-04 eval harness)
const dfRun = run("eval-defects.mjs", []);
const dfErr = dfRun.code ? 1 : 0;
if (!wantJson) {
  console.log(dfRun.out.trim().split("\n").slice(0, 2).join(" — "));
  if (dfErr) for (const line of dfRun.out.split("\n")) if (/^  ERROR /.test(line)) console.log(line);
}

// ⓪-4 editorial-concept 후보 트랙 — 기준편 4개 + 의도적 결함 주입.
// 문서만 승격되고 실제 앵커·조건쌍·모바일 예산 가드가 안 도는 상태를 막는다.
const editorialRun = run("test-editorial-track.mjs", [], "tests");
const editorialErr = editorialRun.code ? 1 : 0;
if (!wantJson) {
  console.log(editorialRun.out.trim().split("\n").at(-1));
  if (editorialErr) for (const line of editorialRun.out.split("\n")) if (line.startsWith("ERROR ")) console.log(`  ${line}`);
}

const linksRun = run("check-links.mjs", []);
const linksErr = linksRun.code ? (linksRun.out.match(/^(ESCAPE|MISSING|SPACE) /gm) ?? []).length || 1 : 0;
const ledgerRun = run("pilots-ledger.mjs", ["--check"]);
const ledgerErr = ledgerRun.code ? 1 : 0;
if (!wantJson) {
  console.log(linksRun.out.trim().split("\n").at(-1));
  console.log(ledgerRun.out.trim().split("\n").at(-1));
  if (linksErr) for (const line of linksRun.out.split("\n")) if (/^(ESCAPE|MISSING|SPACE) /.test(line)) console.log(`  ${line}`);
}

const rows = [];
for (const id of pilots) {
  const { data, pub } = dirs(id);
  const P = existsSync(join(data, "pilot.json")) ? JSON.parse(readFileSync(join(data, "pilot.json"), "utf8")) : {};
  const root = inputRoot(id);
  const guards = new Set(P.guards ?? []);
  const shots = join(data, "shots.json");
  const row = { id, guards: [...guards], warn: 0, err: 0, skip: 0, promoted: [], relaxed: [], layout: "?", mc: "?", sync: "?", notes: [] };

  if (!existsSync(root)) { row.notes.push("input root 없음"); row.layout = row.mc = row.sync = "N/A"; rows.push(row); continue; }
  // 스냅샷 낡음 — 낡은 pilots/ 위의 나머지 검사는 실제 데이터를 본 것이 아니다. 오류로 센다.
  const ss = syncStatus(id, root);
  if (ss.ok) row.sync = "ok";
  else { row.sync = `낡음 ${ss.stale.length + ss.missing.length}`; row.err += 1; row.notes.push(`sync 낡음: ${[...ss.stale, ...ss.missing].join(", ")} → ${syncHint(id)}`); }
  if (wantRestore && !existsSync(pub)) run("restore-media.mjs", [id]);

  if (P.engine === "editorial-concept@1") {
    const editorial = editorialPreflight(id, root);
    row.layout = row.mc = row.captions = "concept";
    row.err += editorial.errors.length;
    row.warn += editorial.warnings.length;
    for (const error of editorial.errors) row.notes.push(`editorial: ${error}`);
    for (const warning of editorial.warnings) row.notes.push(`editorial warn [${warning.code}] ${warning.where}: ${warning.message}`);
    rows.push(row);
    continue;
  }

  // 줄 등급 매기기 — [코드] 가 붙었으면 편의 가드 세대가 등급을 정한다(선언 = 오류 / 미선언 = 경고)
  const grade = (out) => {
    for (const line of out.split("\n")) {
      const isErr = line.startsWith("ERROR "), isWarn = line.startsWith("warn ");
      if (!isErr && !isWarn) continue;
      if (isErr && MEDIA_MISS.test(line)) { row.skip += 1; continue; }
      const m = line.replace(/^(ERROR|warn)\s+/, "").match(CODE);
      if (!m) { if (isErr) row.err += 1; else row.warn += 1; continue; }
      if (guards.has(m[1])) { row.err += 1; if (isWarn) row.promoted.push(m[1]); }
      else { row.warn += 1; if (isErr) row.relaxed.push(m[1]); }
    }
  };

  // ① shots — 미디어 없으면 그 오류만 SKIP 으로 강등
  grade(run("check-shots.mjs", [root, shots]).out);
  if (row.skip) row.notes.push(`미디어 없음 ${row.skip}건 SKIP (npm run check:all -- --restore)`);

  // ② layout:43 — layer43_plan.layout 이 없는 편은 N/A
  const S = existsSync(shots) ? JSON.parse(readFileSync(shots, "utf8")) : {};
  if (!S.layer43_plan?.layout) row.layout = "N/A";
  else {
    const l = run("layout-43.mjs", [root, "--check"]);
    const n = (l.out.match(/problem\s/g) ?? []).length;
    row.layout = n ? `problem ${n}` : "ok";
    row.err += n;
  }

  // ③ mc:check — 씬 계약. **스펙이 없어도 돌린다**(MC 를 쓰는데 없으면 그게 결함이다, 2026-09-02)
  const hasSpec = existsSync(join(root, "02_production", "mc_spec.md"));
  const usesMc = (S.shots ?? []).some((x) => (x.graphics ?? []).some((g) => g.id === "motion_clip@1"));
  if (!hasSpec && !usesMc) row.mc = "N/A";
  else {
    const before = { err: row.err, warn: row.warn };
    const m = run("check-mc-spec.mjs", [root, "--shots", shots, ...(existsSync(pub) && hasSpec ? [] : ["--no-alpha"])]);
    grade(m.out);
    const de = row.err - before.err, dw = row.warn - before.warn;
    row.mc = de ? `err ${de}` : dw ? `warn ${dw}` : "ok";
    if (hasSpec && !existsSync(pub)) row.notes.push("mc: 알파 실측 생략(--no-alpha)");
  }
  // ④ captions — 4-2 텍스트 모션. **렌더 없이** 줄 나눔·노출을 잰다.
  //    7편은 층을 건너뛰어 이 계산을 최종 검토 뒤에야 했고 즉시 3건이 나왔다(G9) → 러너로 옮겼다.
  {
    const c = run("check-captions.mjs", [root, "--quiet"]);
    const n = (c.out.match(/^warn\s/gm) ?? []).length;
    row.captions = n ? `warn ${n}` : "ok";
    row.warn += n;
    for (const l of c.out.split("\n")) if (l.startsWith("warn")) row.notes.push(l.replace(/^warn\s+\[caption\]\s*/, "자막 "));
  }
  rows.push(row);
}

if (wantJson) { console.log(JSON.stringify({ registry: { err: regErr, warn: regWarn, out: regRun.out }, links: { err: linksErr, out: linksRun.out }, ledger: { err: ledgerErr, out: ledgerRun.out }, defects: { err: dfErr, out: dfRun.out }, editorial: { err: editorialErr, out: editorialRun.out }, pilots: rows }, null, 2)); process.exit(regErr || linksErr || ledgerErr || dfErr || editorialErr || rows.some((r) => r.err) ? 1 : 0); }

const w = Math.max(...rows.map((r) => r.id.length), 4);
console.log(`${"편".padEnd(w)}  shots         layout43     mc     자막      sync    가드세대`);
for (const r of rows) {
  const g = r.guards.length ? `${r.guards.length}종${r.promoted.length ? ` (승격 ${r.promoted.length})` : ""}${r.relaxed.length ? ` (완화 ${[...new Set(r.relaxed)].join(",")})` : ""}` : "—";
  console.log(`${r.id.padEnd(w)}  w${String(r.warn).padEnd(3)} e${String(r.err).padEnd(3)} ${String(r.skip ? `s${r.skip}` : "").padEnd(4)} ${r.layout.padEnd(12)} ${r.mc.padEnd(6)} ${(r.captions ?? "—").padEnd(9)} ${r.sync.padEnd(7)} ${g}`);
  for (const n of r.notes) console.log(`${" ".repeat(w)}  · ${n}`);
}
const err = rows.reduce((a, r) => a + r.err, 0) + regErr + linksErr + ledgerErr + symErr + delErr + dfErr + editorialErr;
const skip = rows.reduce((a, r) => a + r.skip, 0);
console.log(`\nERROR ${err} / ${rows.length}편 + registry·links·ledger·editorial${skip ? ` · SKIP ${skip}(미디어 없음)` : ""}`);
process.exit(err ? 1 : 0);
