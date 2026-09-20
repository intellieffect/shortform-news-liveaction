import { execFileSync } from 'node:child_process';
// 저장소 안 마크다운의 상대 링크 검사 — 플러그인만이 아니라 저장소 전체.
//
// 왜: 2026-09-02 에 플러그인을 두 번 옮겼고(.claude/skills/ → 안쪽 → plugin/) 두 번 다 링크가 깨졌다.
//     깊이가 4 → 6 → 4 로 바뀌는데 링크는 `../` 개수로 적혀 있다. 사람이 셀 일이 아니다.
//     첫 검사기는 **저장소 밖으로 나가는 링크를 건너뛰어** 21건을 놓쳤다 — 밖으로 나가는 것도 깨진 것이다.
//     둘째 검사기는 **plugin/ 만 봐서** 스킬이 이사한 뒤 저장소 쪽에서 스킬을 가리키던 25건을 놓쳤다
//     (docs/INDEX.md 20 · design/thumbnails 4 · docs/specs 1 — 구조 점검 2026-09-02). 그래서 범위가 저장소 전체다.
//
// 판정 셋: ESCAPE = 저장소 밖을 가리킨다(설치본·클론에는 그 파일이 없다) · MISSING = 저장소 안인데 파일이 없다
//         · SPACE = 타깃에 공백이 있어 링크로 안 읽힌다(<…> 로 감싸거나 %20). 대장이 `[docs](../input work/…)` 를 만들고 있었는데
//           앞 두 판정은 이걸 **건너뛰었다**(공백에서 매치가 끊겨 링크로 안 보였다).
// 제외: node_modules · .git · out · public(파생물) · .claude(벤더링 remotion-* 스킬) · 심링크(2편이 1편 폴더를 링크한다 — 두 번 세지 않는다).
//
// 사용: node scripts/check-links.mjs [경로 …]   기본 = 저장소 전체. 예: npm run check:links -- plugin
import { readdirSync, readFileSync, existsSync, lstatSync } from "node:fs";
import { join, dirname, relative, resolve, normalize } from "node:path";

const REPO = resolve(new URL("..", import.meta.url).pathname);
const SKIP = new Set(["node_modules", ".git", "out", "public", ".claude"]);
const tracked = new Set(execFileSync('git', ['-C', REPO, 'ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean));
const local = process.argv.includes('--local');
const args = process.argv.slice(2).filter(x=>x!=='--local');
const roots = args.length ? args.map(p=>resolve(p)) : local ? [REPO] : [...tracked].filter(p=>p.endsWith('.md') && !p.startsWith('.claude/') && !p.startsWith('out/')).map(p=>join(REPO,p));

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  if (lstatSync(p).isSymbolicLink()) return [];
  if (e.isDirectory()) return SKIP.has(e.name) ? [] : walk(p);
  return e.name.endsWith(".md") ? [p] : [];
});

// [label](target) — target 은 <…> 로 감싸면 공백 허용. http(s)·mailto·앵커만은 건너뛴다.
const LINK = /\]\((?:<([^>]+)>|([^)\s#]+))(?:#[^)]*)?\)/g;
const SPACED = /\]\(([^)<][^)]*\s[^)]*)\)/g;
const escaped = [], missing = [], spaced = [];
let files = 0;
for (const root of roots) {
  const list = existsSync(root) ? (lstatSync(root).isDirectory() ? walk(root) : [root]) : [];
  for (const f of list) {
    files++;
    const rel = relative(REPO, f);
    const text = readFileSync(f, "utf8");
    // 공백 든 타깃은 경로처럼 생긴 것만 — `「…」(회사의 밤 개념도)` 같은 산문 괄호는 링크가 아니다(오탐 2건 실측)
    for (const m of text.matchAll(SPACED)) if (/^(\.{1,2}\/|[\w.-]+\/)/.test(m[1]) || /\.(md|json|html?|png|jpe?g|webp|mp4|webm|txt|csv|pdf)$/i.test(m[1])) spaced.push([rel, m[1]]);
    for (const m of text.matchAll(LINK)) {
      const raw = m[1] ?? m[2];
      if (/^(https?:|mailto:|[a-z]+:\/\/)/i.test(raw)) continue;
      let t;
      try { t = normalize(join(dirname(rel), decodeURI(raw))); } catch { t = normalize(join(dirname(rel), raw)); }
      if (t.startsWith("..")) escaped.push([rel, raw]);
      else if (!existsSync(join(REPO, t)) || (!local && !tracked.has(t) && ![...tracked].some(p=>p.startsWith(t.replace(/\/$/, "")+"/")))) missing.push([rel, raw, t]);
    }
  }
}
for (const [f, l] of escaped) console.log(`ESCAPE  ${f}: ${l} — 저장소 밖을 가리킨다`);
for (const [f, l, t] of missing) console.log(`MISSING ${f}: ${l} → ${t}`);
for (const [f, l] of spaced) console.log(`SPACE   ${f}: ${l} — 공백이 있어 링크로 안 읽힌다(<…> 또는 %20)`);
const n = escaped.length + missing.length + spaced.length;
console.log(n ? `\nlinks: 문제 ${n} (밖 ${escaped.length} · 없음 ${missing.length} · 공백 ${spaced.length}) / ${files} 파일` : `links: 문제 0 / ${files} 파일`);
process.exit(n ? 1 : 0);
