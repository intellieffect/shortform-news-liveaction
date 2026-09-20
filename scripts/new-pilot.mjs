#!/usr/bin/env node
// 제공 대본(script-faithful)의 기존 스캐폴드. 기사 위임 제작은 produce start로 진입한다.
// 이 명령은 기사 위임용 예시 설명·장면을 실제 편에 복사하지 않는다.
//
// 사용: node scripts/new-pilot.mjs <id> --url <기사 URL> [--title <제목>] [--client hani] [--mode script-faithful|editorial-concept] [--fetch]
//   <id> = snake_case 영소문자·숫자·_ (예 hani_disc_flip) — 이 이름이 news·pilots·public·out·design 다섯 층을 묶는다(CLAUDE.md §파일럿 구조)
//
// 왜: 6편까지 폴더를 손으로 팠다. 편마다 01_input(원문)/02_production(파생) 경계가 같은데 사람이 매번 세우면 한 번은 어긋난다.
import { existsSync, mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { REPO, assertPilotId } from "./lib/pilot.mjs";

const argv = process.argv.slice(2);
const opt = (n) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : null);
const id = argv.find((a) => !a.startsWith("--"));
if (!id) { console.error("usage: new-pilot.mjs <id> --url <기사 URL> [--title <제목>] [--client hani] [--mode script-faithful|editorial-concept] [--fetch]"); process.exit(2); }
assertPilotId(id);
const url = opt("url") ?? "";
const title = opt("title") ?? "";
const client = opt("client") ?? id.split("_")[0];
const mode = opt("mode") ?? "script-faithful";
if (mode === "editorial-concept") {
  console.error("기사 위임 제작은 produce start <id> --url <URL> --duration <최소초:최대초> --request-file <요청 원문>을 사용한다. 예시 설명·장면을 실제 편에 복사하지 않는다.");
  process.exit(2);
}
if (!new Set(["script-faithful", "editorial-concept"]).has(mode)) { console.error(`지원하지 않는 --mode: ${mode}`); process.exit(2); }
const root = join(REPO, "news", id);
if (existsSync(root)) { console.error(`이미 있다: news/${id}`); process.exit(1); }

const dirs = [
  "00_brief",
  "01_input/01_원문_기사", "01_input/05_참고자료",
  "02_production/narration_drafts", "02_production/external_assets/_search", "02_production/external_assets/_rejected",
  "02_production/audio", "02_production/voice_samples", "02_production/scripts",
];
for (const d of dirs) mkdirSync(join(root, d), { recursive: true });

const T = join(REPO, "plugin", "skills", "shortform-news-input", "templates");
const S = join(REPO, "plugin", "skills", "shortform-news-input", "scripts");
// G2 — 날짜는 **KST**. `toISOString()` 은 UTC 라 한국 시각 오전 9시 전에 연 편이 전날로 기록된다.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const fill = (s) => s.replaceAll("<pilot>", title || id).replaceAll("<YYYY-MM-DD HH:MM>", `${today} (스캐폴드)`);
const made = [];
const put = (rel, body) => { writeFileSync(join(root, rel), body); made.push(rel); };
const cp = (from, rel) => { if (existsSync(from)) { copyFileSync(from, join(root, rel)); made.push(rel); } };

put("README.md", `# 파일럿 — ${title || "<제목>"} (\`${id}\`)

${url ? `기사: ${url}` : "기사: <URL>"} · 클라이언트 \`${client}\` · 착수 ${today}

## 상태판

| 단계 | 상태 |
|---|---|
| 0 접수 | ✅ 스캐폴드 (\`npm run new\`) |
| 1 입력 게이트 | ⏳ 원문 보존(01_input/01_원문_기사) · 게재 사진·1차 출처·**라이선스는 자산마다** → 05_참고자료/INDEX.md · RIGHTS.md |
| 2 사실 잠금 | ⏳ 02_production/facts.md |
| 3 원고 | ⏳ narration_drafts/ → substitutions.json · narration.txt |
| 4 내레이션 | ⏳ scripts/make_narration.py → audio/narration.wav · narration.json |
| 5·6 자산 | ⏳ 01_input/assets.json · external_assets/SOURCES.md |
| output | ⏳ ${mode === "editorial-concept" ? `story → concepts → 원고/TTS → motion → editorial:compile → 통합 제작 → 내부 P5/P7 → 완성 시안` : `npm run sync -- news/${id} → beats → gaps → overlays → shots → 3′ → gate 4-3 → 4-0~4-3 → 4-3R → 4-4 → 4-5 → 4-6 → 커버`} |

절차는 플러그인 \`shortform-news\` 의 두 스킬(input → pipeline)이 단일 소스. 폴더 규약은 [news/README.md](../README.md).
`);
put("01_input/MANIFEST.md", fill(readFileSync(join(T, "MANIFEST.md"), "utf8")));
put("01_input/05_참고자료/RIGHTS.md", `# 권리 대장 — ${id}\n\n라이선스는 페이지가 아니라 **자산마다** 적는다(6편 RAS: 같은 보도자료 8건 중 문구가 붙은 것 1건). 문구가 없으면 미확보.\n\n| ref | 파일 | 크레딧(원문) | 라이선스 | 근거(문구 위치) | 판정 |\n|---|---|---|---|---|---|\n`);
put("02_production/facts.md", fill(readFileSync(join(T, "facts.md"), "utf8")));
put("02_production/external_assets/SOURCES.md", `# 외부 자산 대장 — ${id}\n\n정본은 \`01_input/assets.json\`. 여기엔 어디서 어떻게 얻었고 왜 골랐나. 라이선스 판정: **명시된 것만 쓴다** — 크레딧만 있고 문구가 없으면 미확보.\n`);
cp(join(T, "assets.skeleton.json"), "01_input/assets.json");
cp(join(T, "substitutions.example.json"), "02_production/substitutions.example.json");
cp(join(S, "make_narration.py"), "02_production/scripts/make_narration.py");

put("00_brief/raw_" + today.replaceAll("-", "") + "_intake.md", `# 접수 원문 — ${id} (${today})\n\n- 기사: ${url || "<URL>"}\n- 제작 모드: ${mode}\n- 지시 원문: <사용자 메시지 그대로>\n- 자료 범위(쓴다/안 쓴다): <원문 그대로>\n`);

// G3 — 한겨레 기사면 원문·메타·게재 이미지까지 받는다. 손으로 받으면 캡션·게재일시가 한 번은 빠진다.
if (argv.includes("--fetch")) {
  if (!url) { console.error("--fetch 에는 --url 이 필요하다"); process.exit(2); }
  if (/(^|\.)hani\.co\.kr$/.test(new URL(url).hostname)) {
    const r = spawnSync(process.execPath, [join(REPO, "scripts", "fetch-article.mjs"), "--url", url, "--root", `news/${id}`], { stdio: "inherit", cwd: REPO });
    if (r.status !== 0) console.error("⚠️ 기사 수집 실패 — 폴더는 섰다. `npm run fetch:article -- --url <URL> --root news/" + id + "` 로 다시.");
  } else {
    console.error(`⚠️ --fetch 는 한겨레 기사만 받는다(${new URL(url).hostname}) — 원문은 손으로 01_input/01_원문_기사/ 에 보존한다.`);
  }
}

console.log(`news/${id}/ 생성 — ${made.length} 파일`);
for (const m of made) console.log(`  ${m}`);
const fetched = existsSync(join(root, "01_input", "01_원문_기사", "MD5SUMS"));
console.log(`\n다음: ${fetched ? "원문 수령 완료(수정 금지) → RIGHTS.md 자산별 판정" : "01_input/01_원문_기사 에 원문 저장(수정 금지)"} → facts.md → ${mode === "editorial-concept" ? "story/concepts와 원고 왕복 → make_narration.py → motion → editorial:check/compile → episode renderer 구현·placeholder 제거" : "원고 → make_narration.py"} → assets.json → npm run sync -- news/${id}`);
