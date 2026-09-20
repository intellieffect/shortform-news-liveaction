#!/usr/bin/env node
// 렌더 전 자동 가드 — PreToolUse(Bash) 훅. `npm run shots:check` 를 렌더 직전에 자동으로 돌린다.
//
// 왜: check-shots 는 errors 26 / warns 14 를 잡지만 **사람이 부를 때만** 돌았다. 5편에서 어긴 규칙
//     3건 중 이 검사가 커버하는 것은 하나도 안 어겼다 — 효과는 입증됐고 호출이 수동이었을 뿐이다.
//     (근거: docs/research/2026-09-01-solar-swirl-v1-review/summary.md 「규칙 위반의 기전」)
//
// 계약
//   stdin  : 훅 입력 JSON ({ tool_name, tool_input: { command } })
//   exit 0 : 통과 (렌더 진행). 경고가 있으면 stdout 에 systemMessage JSON 으로 보여만 준다
//   exit 2 : 차단 (렌더 안 함). stderr 에 ERROR 목록 — 모델이 읽는다
//   그 밖  : 없다. **fail-open** — 편 id 를 못 찾거나 검사 스크립트가 죽으면 통과시킨다.
//            가드가 작업을 못 하게 만들면 사람이 훅을 꺼버린다. warns 로는 절대 막지 않는다.
//
// **이 스크립트는 플러그인이 아니라 프로젝트에 산다** (2026-09-02).
//   플러그인은 배포되면 ~/.claude/plugins/cache/ 로 복사되는데, 거기서는 어떤 상대경로로도
//   저장소의 scripts/lib/pilot.mjs 에 닿을 수 없다. 이 가드는 저장소 코드를 import 하고
//   저장소에서 `npm run shots:check` 를 돌리는 **프로젝트 결합 스크립트**다.
//   플러그인이 배포하는 것은 훅 *선언*(hooks.json)이고, 구현은 프로젝트가 갖는다.
//   스크립트가 없는 프로젝트에서는 아래 fail-open 계약대로 조용히 통과한다.
//
// 편 id 해결은 **직접 구현하지 않는다** — `scripts/lib/pilot.mjs` 의 resolvePilotId 를 그대로 쓴다.
// 같은 규약을 두 곳에 적으면 한쪽이 바뀔 때 가드가 조용히 어긋난다(5편 「두 문서가 서로를 안 보면 둘 다 통과」).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { REPO, ID_RE, compId, resolvePilotId, inputRoot } from "./lib/pilot.mjs";
import { syncStatus, syncHint } from "./lib/sync.mjs";
import { FP_NAME, fingerprint, readFp, writeFp, diff, framesArg, completedRenderAfter } from "./lib/render-scope.mjs";
import { editorialPreflight } from "./lib/editorial-preflight.mjs";

// 편 root 는 **직접 짐작하지 않는다** — lib/pilot.mjs 의 inputRoot 가 단일 소스다.
// 2026-09-02 저장소 통합 전에는 여기도 ~/Projects/shortform-news-input/work 를 하드코딩하고 있었다
// (G5 를 고칠 때 SHORTFORM_INPUT_ROOT 폴백 때문에 grep 에 안 걸려 넷째 하드코딩으로 남아 있었다).

const pass = (msg) => {
  if (msg) process.stdout.write(JSON.stringify({ systemMessage: msg, suppressOutput: true }) + "\n");
  process.exit(0);
};

let stdin = "";
try { stdin = readFileSync(0, "utf8"); } catch { pass(); }
let cmd = "";
try { cmd = JSON.parse(stdin)?.tool_input?.command ?? ""; } catch { pass(); }
if (!cmd) pass();

// 1. 렌더 명령인가 — settings.json 의 `if` 로 이미 좁혔지만 여기서 한 번 더 (`if` 는 접두 일치라 넓다).
//    still·sheet·slides·studio 는 렌더가 아니다 — 「렌더 없이 확인하는 사다리」를 막지 않는다.
const IS_RENDER = [
  /(^|[\s;&|(])npm\s+run\s+render(\s|$)/,               // npm run render -- <id> …
  /(^|[\s;&|(])(npx\s+)?remotion\s+render(\s|$)/,       // npx remotion render src/index.ts <comp> …
  /pilot-run\.mjs\s+render(\s|$)/,                      // node scripts/pilot-run.mjs render …
].some((re) => re.test(cmd));
if (!IS_RENDER) process.exit(0);

// 2. 편 id — 공용 resolvePilotId(--pilot → 위치 인자 → $PILOT → active 1편)에 맡긴다.
//    앞에 컴포지션 id 역인식만 둔다: `npx remotion render … ShortformNews-hani-solar-swirl` 은
//    위치 인자에 맨 id 가 없어 공용 규약으로는 안 풀린다.
//    못 찾으면 fail-open. 여기서 막으면 인자 규약이 조금만 달라도 렌더가 통째로 멈춘다.
const known = (() => {
  try { return readdirSync(join(REPO, "pilots"), { withFileTypes: true }).filter((d) => d.isDirectory() && ID_RE.test(d.name)).map((d) => d.name); }
  catch { return []; }
})();
if (!known.length) pass();

const pilotId = (() => {
  const comp = cmd.match(/(?:ShortformNews|BeatSheet|Slides|BeatStill)-([A-Za-z0-9-]+)/)?.[1];
  const byComp = comp && known.find((id) => compId(id) === comp);
  if (byComp) return byComp;
  try {
    const { id } = resolvePilotId(cmd.split(/\s+/));   // 공용 규약 (throw = 미해결)
    return known.includes(id) ? id : null;            // --pilot/$PILOT 로 온 값은 실재 확인
  } catch { return null; }
})();
if (!pilotId) pass();

// 3. check-shots 는 input 정본 루트(<root>/02_production, 01_input)를 읽는다.
//    검증 대상 shots 는 **렌더가 실제로 읽는** pilots/<id>/shots.json 으로 덮어쓴다(2번째 인자).
const root = inputRoot(pilotId);
const shots = join(REPO, "pilots", pilotId, "shots.json");
const checker = join(REPO, "scripts", "check-shots.mjs");
if (!existsSync(root))
  pass(`검사 건너뜀 (${pilotId}: 입력 경로 없음 — SHORTFORM_INPUT_ROOT 로 덮을 수 있다) — 렌더는 그대로 진행합니다`);

// editorial-concept@1은 legacy shots가 없어도 여기서 실제 render timeline을 직접 대조한다.
try {
  const editorial = editorialPreflight(pilotId, root);
  if (editorial.editorial) {
    if (editorial.errors.length) {
      process.stderr.write(`렌더 차단 — editorial-concept@1 계약 오류 ${editorial.errors.length}건.\n${editorial.errors.map((line) => `ERROR ${line}`).join("\n")}\n`);
      process.exit(2);
    }
    pass(`editorial:check OK (${pilotId})`);
  }
} catch (e) { pass(`editorial 엔진 판정 실패 (${pilotId}) — 렌더는 그대로 진행합니다: ${String(e?.message ?? e).slice(0, 200)}`); }

if (!existsSync(shots) || !existsSync(checker))
  pass(`shots:check 건너뜀 (${pilotId}: 입력 경로 없음 — SHORTFORM_INPUT_ROOT 로 덮을 수 있다) — 렌더는 그대로 진행합니다`);

// 3-0. 렌더가 읽는 pilots/<id>/ 가 news/<id> 보다 낡았으면 막는다 — 낡은 스냅샷을 렌더하면 검토가 거짓이 된다.
//      (도구가 못 돌면 fail-open, 낡음은 실측이라 fail-closed.)
try {
  const ss = syncStatus(pilotId, root);
  if (!ss.ok) {
    process.stderr.write(`렌더 차단 — pilots/${pilotId}/ 가 news/${pilotId} 보다 낡았다: ${[...ss.stale, ...ss.missing].join(", ")}\n${syncHint(pilotId)} 뒤 다시 렌더한다.\n`);
    process.exit(2);
  }
} catch (e) { pass(`sync 낡음 검사 실패 (${pilotId}) — 렌더는 그대로 진행합니다: ${String(e?.message ?? e).slice(0, 200)}`); }

const r = spawnSync(process.execPath, [checker, root, shots], { cwd: REPO, encoding: "utf8", timeout: 60_000 });
if (r.error || r.status == null || r.status > 1)
  pass(`shots:check 실행 실패 (${pilotId}) — 렌더는 그대로 진행합니다: ${(r.error?.message ?? r.stderr ?? "").slice(0, 300)}`);

const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
const lines = out.split("\n");
const errors = lines.filter((l) => l.startsWith("ERROR "));
const warns = lines.filter((l) => l.startsWith("warn "));

if (r.status === 1 && errors.length) {
  process.stderr.write(
    `렌더 차단 — npm run shots:check -- ${root} 가 ERROR ${errors.length}건.\n` +
      `고치고 다시 렌더한다. 경고(warn ${warns.length}건)는 차단 사유가 아니다.\n\n` +
      errors.join("\n") + "\n",
  );
  process.exit(2);
}
if (r.status === 1) pass(`shots:check exit 1 인데 ERROR 줄이 없다 (${pilotId}) — 통과시킵니다`); // 형식이 바뀌어도 막지 않는다

const shotsNote = warns.length
  ? `shots:check OK (${pilotId}) — ERROR 0, warn ${warns.length}건:\n` + warns.slice(0, 12).join("\n")
  : null;

// ── 4. 렌더 범위 — 「바뀐 비트만 다시 본다」를 계산해서 강제한다 (2026-09-04) ──────────
//
// commands.md 의 구간 렌더 규칙이 8편에서 지켜지지 않아 풀 렌더가 4회 돌았다. 규칙은 있고
// 가드가 없었다. 여기서는 문서를 인용하지 않고 **바뀐 비트와 그 프레임 구간을 계산해서** 내민다.
//
// 막는 경우는 둘뿐이고 **둘 다 사람이 이미 본 결과를 다시 만드는 경우**다.
//   ① 직전 렌더 이후 입력이 하나도 안 바뀜 → 있는 mp4 를 보면 된다
//   ② 비트 단위 수정만 있고 그 구간이 전편의 일부 → --frames 로 그 구간만
// 편 단위 입력(소리·렌더 설정·비트 격자·레이아웃)이 바뀌었으면 **통과**시킨다 — 전편이 영향을 받는다.
// 지문이 없거나 읽다 실패하면 통과(fail-open). 리셋은 out/pilots/<id>/.render-scope.json 삭제.
const HAS_FRAMES = /--frames[= ]/.test(cmd);
const OVERRIDE = /SKIP_RENDER_SCOPE_GUARD=1/.test(cmd);

if (HAS_FRAMES || OVERRIDE) pass(shotsNote); // 이미 구간 렌더거나, 사람이 명시적으로 끈 호출

let scopeNote = null;
try {
  const pilotsDir = join(REPO, "pilots", pilotId);
  const outDir = join(REPO, "out", "pilots", pilotId);
  const fpPath = join(outDir, FP_NAME);

  const cur = fingerprint(pilotsDir);
  const prev = readFp(fpPath);

  if (prev && completedRenderAfter(outDir, prev.at)) {
    const d = diff(prev, cur);

    if (!d.globalChanged.length && !d.changedBeats.length) {
      process.stderr.write(
        `렌더 차단 — 직전 풀 렌더 이후 ${pilotId} 의 렌더 입력이 하나도 바뀌지 않았다.\n` +
          `같은 결과가 out/pilots/${pilotId}/ 에 이미 있다. 그것을 보면 된다.\n\n` +
          `정말 다시 만들어야 하면: SKIP_RENDER_SCOPE_GUARD=1 을 명령 앞에 붙인다.\n`,
      );
      process.exit(2);
    }

    if (!d.globalChanged.length && d.changedBeats.length) {
      const beatsDoc = JSON.parse(readFileSync(join(pilotsDir, "beats.json"), "utf8"));
      const fr = framesArg(beatsDoc, d.changedBeats);
      if (fr) {
        process.stderr.write(
          `렌더 차단 — 직전 렌더 이후 바뀐 것은 ${d.changedBeats.length}/${d.total} 비트뿐이다: ${d.changedBeats.join(" ")}\n` +
            `전편(${fr.last}프레임)을 다시 돌리지 말고 그 구간만 본다 (전환 8프레임 포함):\n\n` +
            `  npm run render -- ${pilotId} out/pilots/${pilotId}/scope.mp4 --frames=${fr.arg} --scale=0.5\n\n` +
            `납품본처럼 전편이 필요하면: SKIP_RENDER_SCOPE_GUARD=1 을 명령 앞에 붙인다.\n` +
            `(소리·렌더 설정·비트 격자·레이아웃이 바뀐 렌더는 이 검사에 걸리지 않는다.)\n`,
        );
        process.exit(2);
      }
      scopeNote = `렌더 범위 — 비트 ${d.changedBeats.length}/${d.total} 변경이지만 구간이 사실상 전편이라 풀 렌더로 진행합니다`;
    }

    if (d.globalChanged.length) {
      scopeNote = `렌더 범위 — 편 단위 입력이 바뀌어 풀 렌더가 맞습니다: ${d.globalChanged.join(", ")}`;
    }
  }

  writeFp(fpPath, cur); // 이번 렌더의 기준선
} catch (e) {
  pass([shotsNote, `렌더 범위 검사 건너뜀 (${pilotId}) — 렌더는 그대로 진행합니다: ${String(e?.message ?? e).slice(0, 160)}`].filter(Boolean).join("\n"));
}

pass([shotsNote, scopeNote].filter(Boolean).join("\n") || null);
