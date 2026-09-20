#!/usr/bin/env node
/**
 * out/ 정리 — out-audit.mjs 가 삭제 후보로 분류한 파일만 지운다.
 *
 *   node scripts/out-prune.mjs [--root <dir>] [--keep <조각>]... [--trash] [--yes]
 *
 * 기본은 예행이다. --yes 를 붙여야 실제로 지운다. --trash 면 휴지통으로 보낸다(되돌릴 수 있다).
 * 지우기 전에 무엇이 있었는지(경로·크기·md5·길이·분류)를 묘비 명세로 남기고,
 * 지운 뒤 납품본(DELIVER) md5 를 전부 다시 대조해 무사한지 확인한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : null;
};
const ROOT = path.resolve(opt('--root') ?? process.cwd());
const GO = flag('--yes');
const keeps = argv.reduce((a, v, i) => (v === '--keep' ? [...a, argv[i + 1]] : a), []);

const HERE = path.dirname(new URL(import.meta.url).pathname);
const audit = JSON.parse(
  execFileSync('node', [path.join(HERE, 'out-audit.mjs'), '--root', ROOT, '--json'], {
    maxBuffer: 64 * 1024 * 1024,
  }).toString(),
);

const mb = (b) => (b / 1024 / 1024).toFixed(1) + 'MB';
const gb = (b) => (b / 1024 / 1024 / 1024).toFixed(2) + 'GB';
const byPath = new Map(audit.rows.map((r) => [r.path, r]));

const held = [];
const targets = [];
for (const p of audit.prune) {
  const why = keeps.find((k) => p.includes(k));
  (why ? held : targets).push({ ...byPath.get(p), heldBy: why });
}

const bytes = targets.reduce((a, r) => a + r.size, 0);

console.log(`대상 ${ROOT}`);
console.log(`후보 ${audit.prune.length}개 중 ${targets.length}개 삭제 · ${gb(bytes)} 회수`);
if (held.length) {
  console.log(`\n제외 ${held.length}개 (--keep)`);
  for (const r of held) console.log(`  보존  ${mb(r.size).padStart(8)}  ${r.path}   ← "${r.heldBy}"`);
}
console.log('\n삭제');
for (const r of targets) console.log(`  ${r.kind.padEnd(9)} ${mb(r.size).padStart(8)}  ${r.path}`);

if (!GO) {
  console.log('\n예행이다. 실제로 지우려면 --yes 를 붙인다.');
  process.exit(0);
}

// --trash 면 휴지통으로 보낸다(macOS /usr/bin/trash) — 사람이 되돌릴 수 있다.
// 묘비는 어느 쪽이든 남지만, 묘비는 기록이지 복구본이 아니다 — 어느 방식이었는지 반드시 적는다.
const TRASH = flag('--trash');
if (TRASH && !fs.existsSync('/usr/bin/trash')) {
  console.error('--trash 를 쓰려면 /usr/bin/trash 가 있어야 한다 (macOS 14+).');
  process.exit(1);
}

// ── 묘비: 무엇이 있었는지 남긴다 ───────────────────────────────────────────
const stamp = new Date().toISOString().slice(0, 10);
const docDir = path.join(ROOT, 'docs/research', `${stamp}-out-hygiene`);
fs.mkdirSync(docDir, { recursive: true });
const manifest = path.join(docDir, 'pruned-manifest.json');
const prior = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : { runs: [] };
prior.runs.push({
  at: new Date().toISOString(),
  root: path.basename(ROOT),
  method: TRASH ? 'trash' : 'delete',
  recoverable: TRASH, // trash 면 휴지통에서 되돌릴 수 있다. delete 는 영구다
  kept: held.map((r) => ({ path: r.path, size: r.size, md5: r.md5, by: r.heldBy })),
  removed: targets.map((r) => ({
    path: r.path,
    size: r.size,
    md5: r.md5,
    duration: r.duration,
    kind: r.kind,
    why: r.who,
    cited: r.cited,
  })),
});
fs.writeFileSync(manifest, JSON.stringify(prior, null, 2) + '\n');
console.log(`\n묘비 ${path.relative(ROOT, manifest)} — 지운 파일의 경로·md5·분류를 남겼다`);

// ── 삭제 ───────────────────────────────────────────────────────────────────
let n = 0;
const doomed = targets.map((r) => path.join(ROOT, r.path)).filter((a) => fs.existsSync(a));
if (TRASH) {
  for (let i = 0; i < doomed.length; i += 50) {
    execFileSync('/usr/bin/trash', doomed.slice(i, i + 50));
  }
  n = doomed.filter((a) => !fs.existsSync(a)).length;
  if (n !== doomed.length) {
    console.error(`✗ 휴지통으로 못 보낸 파일이 있다: ${doomed.length - n}개`);
    process.exit(1);
  }
} else {
  for (const abs of doomed) {
    fs.unlinkSync(abs);
    n++;
  }
}
// 빈 폴더 정리 (.DS_Store 만 남은 것 포함)
const tidy = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) tidy(path.join(dir, e.name));
  }
  const left = fs.readdirSync(dir);
  if (left.length && left.every((f) => f === '.DS_Store')) {
    for (const f of left) fs.unlinkSync(path.join(dir, f));
  }
  if (!fs.readdirSync(dir).length && dir !== path.join(ROOT, 'out')) fs.rmdirSync(dir);
};
tidy(path.join(ROOT, 'out'));
console.log(`삭제 ${n}개 · ${gb(bytes)} 회수`);

// ── 검증: 납품본이 전부 무사한가 ───────────────────────────────────────────
console.log('\n납품본 재검증');
let bad = 0;
for (const id of fs.readdirSync(path.join(ROOT, 'pilots')).sort()) {
  const f = path.join(ROOT, 'pilots', id, 'pilot.json');
  if (!fs.existsSync(f)) continue;
  for (const v of JSON.parse(fs.readFileSync(f, 'utf8')).versions ?? []) {
    if (!v.file) continue;
    const abs = path.join(ROOT, v.file);
    if (!fs.existsSync(abs)) {
      console.log(`  없음   ${v.file}  [${id}/${v.label}]`);
      bad++;
      continue;
    }
    if (!v.md5) {
      console.log(`  있음   ${v.file}  [${id}/${v.label}] (md5 기록 없음)`);
      continue;
    }
    const m = execFileSync('md5', ['-q', abs]).toString().trim();
    console.log(`  ${m === v.md5 ? 'MATCH ' : 'DIFFER'} ${v.file}  [${id}/${v.label}]`);
    if (m !== v.md5) bad++;
  }
}
console.log(bad ? `\n확인 필요 ${bad}건` : '\n납품본 전부 무사하다.');
