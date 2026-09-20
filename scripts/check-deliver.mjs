#!/usr/bin/env node
/**
 * 납품본 무결성 — **대장(`pilot.json versions[]`)이 가리키는 md5 와 실물을 대조한다.**
 *
 * 왜 (2026-09-03): 규약은 「납품본은 이름이 아니라 대장의 md5 가 기준」인데 **아무도 그걸 검사하지 않았다.**
 * 7편 `final_v4` 의 대장 md5 `62c85599…` 는 디스크의 어느 파일과도 맞지 않는다 —
 * 믹스 재조정(master_gain -2 → -1.3) 뒤 다시 렌더했는데 대장이 1차 값에 멈춘 것으로 보인다.
 * `MANIFEST.txt` 는 실물에서 md5 를 계산하므로 **대장과 다른 값을 적고도 아무 말을 안 했다.**
 *
 * **md5 가 다르다고 「기록이 낡았다」가 아니다.** 7편에서 그렇게 읽고 대장을 실물에 맞출 뻔했다 —
 * `bytes`·`master_md5`·MANIFEST 가 다 맞아서 「1차 렌더 값에 멈춘 것」으로 보였는데,
 * 디코드해 보니 **납품본이 손상**돼 있었다(567/2557 프레임, 오류 12,115줄). 마스터는 멀쩡했다.
 * **크기가 같은데 md5 가 다르면 다른 렌더가 아니다 — 같은 파일이 깨진 것이다.** 그 갈래를 가드가 판정한다.
 *
 * 판정
 *   ERROR  크기 같음 + md5 다름     — **내용 손상**. 디코드로 확인하고 마스터에서 다시 만든다
 *   ERROR  크기 다름 + md5 다름     — 기록이 낡았거나 다른 판이다
 *   SKIP   file 이 null / 파일 없음   — 덮여서 미보존이거나(3편 v9·4편 v1) out/ 이 git 제외라 클론에 없다.
 *                                      **없는 것은 결함이 아니다** — 미디어 SKIP 과 같은 규약이다
 *
 * 사용: node scripts/check-deliver.mjs [<id>…]     (check:all 이 편 루프 앞에서 한 번 돌린다)
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { REPO, insideRepo, readActive } from "./lib/pilot.mjs";

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const active = readActive();
const targets = ids.length ? ids : active;

const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const errors = [], skips = [];
let checked = 0;

for (const id of targets) {
  const pj = join(REPO, "pilots", id, "pilot.json");
  if (!existsSync(pj)) continue;
  const p = JSON.parse(readFileSync(pj, "utf8"));
  for (const v of p.versions ?? []) {
    const label = `${id} ${v.label ?? v.version ?? "?"}`;
    if (v.status === "lost") continue;                       // 유실은 기록이지 대조 대상이 아니다
    if (!v.md5) continue;
    if (!v.file) { skips.push(`${label} — file 없음(덮여서 미보존)`); continue; }
    const abs = insideRepo(v.file);
    if (!abs || !existsSync(abs)) { skips.push(`${label} — ${v.file} 없음`); continue; }
    const got = md5(abs);
    checked += 1;
    if (got === v.md5) continue;
    const size = statSync(abs).size;
    const sameSize = v.bytes != null && v.bytes === size;
    const head = `${label}: 대장 ${v.md5.slice(0, 8)}… ≠ 실물 ${got.slice(0, 8)}…`;
    if (sameSize) {
      // 크기가 같은데 내용이 다르다 = 다른 렌더가 아니다. 디코드해서 실제로 깨졌는지 센다(불일치일 때만 — 비싸다)
      let frames = "?";
      try {
        frames = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-count_frames",
          "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", abs],
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().replace(/,$/, "");   // 손상 파일은 stderr 로 수만 줄을 뱉는다
      } catch { /* ffprobe 없으면 프레임 수는 비운다 */ }
      const want = v.duration_sec && v.fps ? Math.round(v.duration_sec * v.fps) : null;
      errors.push(`[deliver-corrupt] ${head} — **크기가 같다**(${v.bytes} B) → 다른 렌더가 아니라 **내용 손상**이다`
        + (want ? ` · 프레임 ${frames}/${want}` : ` · 프레임 ${frames}`)
        + `\n         마스터(${v.master ?? "없음"})가 성하면 거기서 다시 인코딩한다 — 대장을 실물에 맞추지 않는다`);
    } else {
      errors.push(`[deliver-md5] ${head} — 크기도 다르다(대장 ${v.bytes ?? "?"} B / 실물 ${size} B) → 기록이 낡았거나 다른 판이다 (${v.file})`);
    }
  }
}

console.log(`deliver: 대조 ${checked}건 · ERROR ${errors.length}${skips.length ? ` · SKIP ${skips.length}(파일 없음 — out/ 은 git 제외)` : ""}`);
for (const e of errors) console.log(`ERROR ${e}`);
if (errors.length) console.log(`\n대장이 SoT 다. **먼저 어느 쪽이 깨졌는지 가른다** — 크기가 같으면 파일 손상이고, 크기가 다르면 기록이 낡은 것이다.\n손상이면 마스터에서 다시 인코딩하고, 기록이 낡았으면 대장을 고친다. 둘 다 아니면 새 v<N+1> 이다.`);
process.exit(errors.length ? 1 : 0);
