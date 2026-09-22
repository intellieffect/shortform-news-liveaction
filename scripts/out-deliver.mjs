#!/usr/bin/env node
/**
 * 납품본 묶기 — 대장(pilot.json)이 가리키는 판을 out/pilots/<id>/deliver/<ver>/ 로 모은다.
 *
 *   node scripts/out-deliver.mjs <id> [--extra <ver>=<경로>]... [--root <dir>] [--yes]
 *
 * 복사만 한다. 원본을 옮기지도 지우지도 않는다 — 삭제는 out:prune 의 몫이고 사람이 따로 승인한다.
 * 기본은 예행이다. --yes 를 붙여야 실제로 복사한다.
 *
 * 하는 일
 *   1. versions[] 중 file 이 있는 판마다 폴더 <ver> 를 만든다 (label → v<N>[-변종])
 *   2. 납품 h264 를 <id>_<ver>.mp4 로, **대장이 적은** 렌더 원본(versions[].master)을 <id>_<ver>.master.mp4 로 복사
 *   3. --extra 로 지정한 부속물(고지·썸네일)을 그 판 폴더에 복사
 *   4. MANIFEST.txt 를 pilot.json 에서 기계적으로 생성한다 — 손으로 쓰지 않는다
 *   5. deliver/LATEST → 마지막 판 (심링크. 감사는 심링크를 세지도 지우지도 않는다)
 *   6. 복사본 md5 를 다시 재서 원본과 대조하고, pilot.json 의 file 경로를 새 위치로 고친다
 *   7. **워크트리에서 돌렸으면 주 작업트리로도 복사한다** (2026-09-05 신설)
 *      워크트리는 지워지는 것이 정상이고 `out/` 은 gitignore 다 — 납품본이 거기에만 남으면
 *      워크트리를 지우는 순간 사라진다(2026-09-03 사고). 9편·8편 모두 실제로 그 상태였다.
 *      확정 직후 옮기는 것을 사람이 기억하게 두지 않는다.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildVideoLibrary } from './lib/video-library.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : null;
};
const ROOT = path.resolve(opt('--root') ?? process.cwd());
const GO = flag('--yes');
const ID = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
const extras = argv.reduce((a, v, i) => (v === '--extra' ? [...a, argv[i + 1]] : a), []);

if (!ID) {
  console.error('편 id 가 필요하다: node scripts/out-deliver.mjs <id> [--extra <ver>=<경로>] [--yes]');
  process.exit(1);
}

const PILOT = path.join(ROOT, 'pilots', ID, 'pilot.json');
if (!fs.existsSync(PILOT)) {
  console.error(`대장이 없다: ${path.relative(ROOT, PILOT)}`);
  process.exit(1);
}
const pilot = JSON.parse(fs.readFileSync(PILOT, 'utf8'));
// md5(1) 은 BSD 전용이다 — 다른 곳에서 이미 쓰는 node 해시로 같은 값을 낸다.
const md5 = (p) => createHash('md5').update(fs.readFileSync(p)).digest('hex');
const rel = (p) => path.relative(ROOT, p);
const mb = (b) => (b / 1024 / 1024).toFixed(1) + 'MB';

/** label → 버전 폴더 이름. 형용사를 걷어내고 v<N>[-변종] 만 남긴다 */
const verName = (label, i) => {
  const m = /^final[_-]v(\d+)(?:[_-](.+))?$/i.exec(label);
  if (m) return `v${m[1]}${m[2] ? '-' + m[2].toLowerCase().replace(/_/g, '-') : ''}`;
  return `v${i + 1}-${label.toLowerCase().replace(/_/g, '-')}`;
};

// ── 렌더 원본은 **대장에 적힌 경로**를 쓴다 (2026-09-02)
//   옛 판은 감사의 SRC-keep 행을 이름 짝으로 찾았는데, 그 짝(`<id>_v<N>.mp4` ↔ `.master.mp4`)은
//   같은 폴더만 보는 구현이라 stage 의 `ShortformNews_*.master.mp4` 와 영영 만나지 못했다 —
//   실측 SRC-keep 0행, 즉 masterOf 는 늘 undefined 인 죽은 코드였다. 추론을 그만두고 대장에 적는다.
//   versions[].master: 경로 = 그 판의 렌더 원본 / null = 마스터가 없다(지어내지 않는다) / 없음 = 아직 안 적었다
const masterOf = (v) => {
  if (v.master === undefined) {
    console.error(`⚠ ${v.label}: 대장에 master 가 없다 — pilot.json versions[].master 에 경로를 적거나, 없으면 null 로 명시한다`);
    return null;
  }
  if (v.master === null) return null;
  if (!fs.existsSync(path.join(ROOT, v.master))) {
    console.error(`⚠ ${v.label}: 대장의 master 가 가리키는 파일이 없다 — ${v.master}`);
    return null;
  }
  return { path: v.master };
};

const probe = (p) => {
  try {
    const raw = execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate',
      '-of', 'default=nw=1:nk=1', p,
    ]).toString().trim().split('\n');
    const [n, d] = (raw[2] ?? '0/1').split('/');
    return `${raw[0]}x${raw[1]} @ ${Math.round(Number(n) / Number(d))} fps`;
  } catch {
    return '?';
  }
};

const DELIVER = path.join(ROOT, 'out', 'pilots', ID, 'deliver');
const live = pilot.versions.filter((v) => v.file);
if (!live.length) {
  console.log(`${ID}: 대장이 가리키는 파일이 없다 (file:null 뿐) — 묶을 것이 없다.`);
  process.exit(0);
}

const plan = [];
live.forEach((v, i) => {
  const ver = verName(v.label, pilot.versions.indexOf(v));
  const dir = path.join(DELIVER, ver);
  const src = path.join(ROOT, v.file);
  if (!fs.existsSync(src)) {
    console.error(`⚠ ${v.label}: 대장이 가리키는 파일이 없다 — ${v.file}`);
    process.exit(1);
  }
  const items = [{ from: src, to: path.join(dir, `${ID}_${ver}.mp4`), role: '납품 h264' }];
  const m = masterOf(v);
  if (m) items.push({ from: path.join(ROOT, m.path), to: path.join(dir, `${ID}_${ver}.master.mp4`), role: '렌더 원본' });
  for (const e of extras) {
    const [tgt, p] = e.split('=');
    if (tgt !== ver) continue;
    items.push({ from: path.resolve(ROOT, p), to: path.join(dir, path.basename(p)), role: '부속물' });
  }
  plan.push({ ver, dir, version: v, items, isLast: i === live.length - 1 });
});

console.log(`\n# ${ID} — ${pilot.title}  (${GO ? '실행' : '예행'})\n`);
for (const g of plan) {
  console.log(`## deliver/${g.ver}   ← 대장 label "${g.version.label}"${g.isLast ? '  (LATEST)' : ''}`);
  for (const it of g.items) {
    console.log(`   ${it.role.padEnd(8)} ${rel(it.from)}`);
    console.log(`            → ${rel(it.to)}  ${mb(fs.statSync(it.from).size)}`);
  }
  console.log();
}
const total = plan.flatMap((g) => g.items).reduce((a, it) => a + fs.statSync(it.from).size, 0);
console.log(`복사 ${plan.flatMap((g) => g.items).length}개 / ${mb(total)} — 원본은 그대로 둔다.`);

if (!GO) {
  console.log('\n예행이다. 실제로 복사하려면 --yes 를 붙인다.');
  process.exit(0);
}

// ── 실행 ─────────────────────────────────────────────────────────────────────
let ledger = fs.readFileSync(PILOT, 'utf8');
for (const g of plan) {
  fs.mkdirSync(g.dir, { recursive: true });
  const copied = [];
  for (const it of g.items) {
    fs.copyFileSync(it.from, it.to);
    const a = md5(it.from);
    const b = md5(it.to);
    if (a !== b) {
      console.error(`✗ 복사본 md5 불일치: ${rel(it.to)}  ${a} ≠ ${b}`);
      process.exit(1);
    }
    copied.push({ ...it, md5: b });
  }
  const v = g.version;
  const main = copied[0];
  const master = copied.find((c) => c.role === '렌더 원본');
  const L = [];
  L.push(`id            ${pilot.id}`);
  L.push(`title         ${pilot.title}`);
  L.push(`version       ${g.ver}`);
  L.push(`ledger_label  ${v.label}`);
  L.push(`latest        ${g.isLast ? 'yes' : 'no'}`);
  L.push(`pilot_status  ${pilot.status}${pilot.delivered ? ` (delivered ${pilot.delivered})` : ''}`);
  L.push(`file          ${path.basename(main.to)}`);
  L.push(`md5           ${main.md5}`);
  if (master) L.push(`master        ${path.basename(master.to)}  md5 ${master.md5}`);
  L.push(`duration      ${v.duration_sec ?? '?'} s`);
  L.push(`resolution    ${probe(main.to)}`);
  L.push(`loudness      ${v.lufs ?? '?'} LUFS / true peak ${v.true_peak ?? '?'} dBTP`);
  L.push(`engine_commit ${pilot.engine_commit ?? '?'}`);
  // 통합 후 input 은 {path, commit, merged_from?} — repo 필드는 옛 편에만 있다(2026-09-02). 있으면 출처로 덧붙인다
  const mf = pilot.input?.merged_from;
  L.push(`input         ${pilot.input?.path ?? '?'} @ ${pilot.input?.commit ?? '?'}${mf ? `  (통합 전 ${mf.repo} ${mf.path ?? ''}${mf.branch ? ` · ${mf.branch}` : ''})` : ''}`);
  const ex = copied.filter((c) => c.role === '부속물').map((c) => path.basename(c.to));
  L.push(`extras        ${ex.length ? ex.join(' · ') : '—'}`);
  L.push(`generated     ${new Date().toISOString().slice(0, 10)} · scripts/out-deliver.mjs`);
  L.push('');
  L.push('이 파일은 pilot.json 에서 파생됐다. 손으로 고치지 않는다 — 대장을 고치고 다시 생성한다.');
  L.push('');
  L.push('note');
  L.push(String(v.note ?? '').replace(/^/gm, '  '));
  fs.writeFileSync(path.join(g.dir, 'MANIFEST.txt'), L.join('\n') + '\n');

  // 대장의 file 경로를 새 위치로
  const before = v.file;
  const after = rel(main.to);
  if (before !== after) {
    if (!ledger.includes(`"${before}"`)) {
      console.error(`✗ 대장에서 경로를 못 찾았다: ${before}`);
      process.exit(1);
    }
    ledger = ledger.replace(`"${before}"`, `"${after}"`);
  }
  console.log(`✓ deliver/${g.ver}  ${copied.length}개 복사 · md5 일치 · MANIFEST`);
}

const last0 = plan[plan.length - 1];

// ── 7. 주 작업트리로도 복사 ──────────────────────────────────────────────────
// `out/` 은 gitignore 라 워크트리에만 남는다. 워크트리는 지워지는 것이 정상이므로
// 확정 직후 옮겨 둔다 — worktree:remove 가 목적지를 세어 통과시키는 근거가 된다.
const MAIN_WT = (() => {
  try {
    const out = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
    const first = out.split('\n').find((l) => l.startsWith('worktree '));
    return first ? path.resolve(first.slice('worktree '.length).trim()) : null;
  } catch { return null; }
})();
if (MAIN_WT && path.resolve(ROOT) !== MAIN_WT) {
  const dst = path.join(MAIN_WT, 'out', 'pilots', ID, 'deliver');
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      const a = path.join(from, e.name), b = path.join(to, e.name);
      if (e.isSymbolicLink()) continue;                 // LATEST 는 아래에서 다시 건다
      if (e.isDirectory()) copyDir(a, b);
      else { fs.copyFileSync(a, b); n++; }
    }
  };
  copyDir(DELIVER, dst);
  const dl = path.join(dst, 'LATEST');
  try { fs.unlinkSync(dl); } catch { /* 없으면 그만 */ }
  try { fs.symlinkSync(last0.ver, dl); } catch { /* 심링크 불가 파일계 */ }
  console.log(`✓ 주 작업트리로 복사 ${n}개 → ${path.relative(MAIN_WT, dst)}`);
  console.log(`  (워크트리는 지워지는 것이 정상이다 — 납품본이 거기에만 남으면 같이 사라진다)`);
}

const last = plan[plan.length - 1];
const link = path.join(DELIVER, 'LATEST');
if (fs.existsSync(link) || fs.lstatSync(link, { throwIfNoEntry: false })) fs.unlinkSync(link);
fs.symlinkSync(last.ver, link);
console.log(`✓ deliver/LATEST → ${last.ver}`);

fs.writeFileSync(PILOT, ledger);
JSON.parse(fs.readFileSync(PILOT, 'utf8'));
console.log(`✓ 대장 갱신 ${rel(PILOT)}\n원본은 그대로다. 삭제는 npm run out:audit 으로 다시 본 뒤 out:prune 이 한다.`);

// 완성본 파일과 LATEST 갱신이 끝난 뒤 목록 생성. 예행에서는 이곳에 도달하지 않는다.
for (const root of [...new Set([ROOT, MAIN_WT].filter(Boolean))]) {
  const library = buildVideoLibrary({ root });
  for (const warning of library.warnings) console.warn(`목록 확인: ${warning}`);
  console.log(`✓ 제작 영상 목록 ${library.videos.length}편 → ${library.file}`);
}
