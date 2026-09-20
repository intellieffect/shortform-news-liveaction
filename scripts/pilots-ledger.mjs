import { sharedIds } from './lib/episode-selection.mjs';
// 편 대장 — pilots/*/pilot.json 을 모아 pilots/index.json(기계용) 과 docs/PILOTS.md(사람용 표) 를 생성한다.
//   상태·진행의 SoT 는 Linear, 여기는 편의 정체·납품본·미결 게이트만. 사용: npm run pilots
//   --check : 쓰지 않고 지금 파일과 비교만 한다(낡았으면 exit 1). check:all 이 부른다 —
//             6편 pilot.json 이 13:58 에 생겼는데 대장은 09:24 판이었다(구조 점검 2026-09-02). 생성물은 낡아도 소리를 안 낸다.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO, readActive } from "./lib/pilot.mjs";
import { buildVideoLibrary } from "./lib/video-library.mjs";

const dir = join(REPO, "pilots");
const active = new Set(readActive());
const pilots = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (process.argv.includes("--local") || sharedIds(REPO).includes(d.name)) && existsSync(join(dir, d.name, "pilot.json")))
  .map((d) => JSON.parse(readFileSync(join(dir, d.name, "pilot.json"), "utf8")))
  .sort((a, b) => (a.started ?? "").localeCompare(b.started ?? "") || a.id.localeCompare(b.id));

const CHECK = process.argv.includes("--check");
const index = pilots.map((p) => ({ ...p, active: active.has(p.id) }));
const indexOut = JSON.stringify(index, null, 2) + "\n";

const final = (p) => (p.versions ?? []).at(-1);
// docs: "a.md · b/ · 메모" — 경로 조각은 <…> 로 감싼 링크로(공백이 있어도 안전), 나머지는 글자로. 예전엔 통째로 [docs](../…) 라 공백에서 링크가 끊겼다.
const docsCell = (docs) => {
  if (!docs) return "—";
  return docs.split(" · ").map((part) => {
    const path = part.trim();
    const isPath = /^(docs|news|pilots|design)\//.test(path) && !/\s\(/.test(path);
    if (!isPath) return path;
    const label = path.replace(/\/$/, "").split("/").pop();
    return `[${label}](<../${path}>)`;
  }).join(" · ");
};
const rows = pilots.map((p, i) => {
  const f = final(p);
  return `| ${i + 1} | \`${p.id}\`${active.has(p.id) ? "" : " ○"} | ${p.title ?? "—"} | ${p.client ?? "—"} | ${p.status ?? "—"} | ${p.started ?? "—"} → ${p.delivered ?? "—"} | ${f ? `${f.label}${f.md5 ? ` \`${f.md5.slice(0, 8)}…\`` : ""}${f.lufs != null ? ` ${f.lufs} LUFS` : ""}` : "—"} | ${(p.gates_open ?? []).length} | ${docsCell(p.docs)}${p.linear ? ` · ${p.linear}` : ""} |`;
});
const md = `# 파일럿 대장

생성 파일 — \`npm run pilots\` 가 \`pilots/*/pilot.json\` 에서 만든다. 손으로 고치지 않는다(고칠 곳은 각 편의 \`pilot.json\`).
순서 = \`started\`. \`○\` = \`pilots/active.json\` 에 없음(Studio 에 안 뜸, 폴더·git 에는 있음). 상태·진행의 SoT 는 Linear.

| # | id | 제목 | 클라이언트 | 상태 | 착수 → 납품 | 납품본 | 미결 게이트 | 문서 |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

## 구조

\`\`\`
pilots/<id>/           편별 데이터(beats·overlays·shots·assets·audio·render.config JSON + pilot.json). id = news/<id> 폴더명
pilots/active.json     Studio 에 등록할 편 → npm run pilots:index 가 pilots/index.ts 생성
public/pilots/<id>/    파생 미디어 캐시(git 제외) — 지워도 npm run sync -- <root> 로 복원
out/pilots/<id>/       렌더·QA(git 제외). 납품본은 pilot.json versions[].md5 로 고정
docs/research/<날짜>-<편>/   raw·summary·gates
\`\`\`

편 추가: \`npm run sync -- news/<id>\` (폴더·active·index·pilot.json 뼈대까지) → \`pilot.json\` 채우기 → \`npm run pilots\`.
`;
const targets = [[join(dir, "index.json"), indexOut], [join(REPO, "docs", "PILOTS.md"), md]];
if (CHECK) {
  const stale = targets.filter(([f, body]) => !existsSync(f) || readFileSync(f, "utf8") !== body).map(([f]) => relative(REPO, f));
  console.log(stale.length ? `ledger: 낡음 ${stale.join(" · ")} — npm run pilots` : `ledger: 최신 (${pilots.length}편)`);
  process.exit(stale.length ? 1 : 0);
}
for (const [f, body] of targets) writeFileSync(f, body);
console.log(`pilots/index.json · docs/PILOTS.md: ${pilots.length}편 (active ${active.size})`);

// 완성 상태를 대장에 등록하면 사용자용 목록도 함께 갱신한다 (--check에서는 실행하지 않음).
const library = buildVideoLibrary({ root: REPO });
for (const warning of library.warnings) console.warn(`목록 확인: ${warning}`);
console.log(`제작 영상 목록: ${library.videos.length}편`);
