#!/usr/bin/env node
/**
 * out/ 감사 — pilot.json(대장)을 기준으로 out/ 의 렌더 산출물을 분류한다.
 * 아무것도 지우지 않는다. 분류표와 삭제 후보 목록만 낸다.
 *
 *   node scripts/out-audit.mjs [--root <dir>] [--json]
 *
 * 분류
 *   DELIVER   pilot.json versions[].file 이 가리키는 납품본. md5 가 있으면 대조한다
 *   MISS      대장에 있는데 파일이 없다 (대장 ↔ 실물 불일치)
 *   SRC       납품본과 같은 길이인 고비트레이트 렌더 원본(재인코딩 전).
 *             확정 납품편(status=delivered)의 마지막 판이면 keep, 아니면 삭제 후보
 *   DUP       다른 파일과 내용이 같다(md5 동일). 원본이 DELIVER 면 사본이 후보
 *   STAGE     조립 단계 렌더(4-x)·프리뷰. 검토가 끝나 소비처가 없다.
 *             데이터는 커밋돼 있으나 engine_commit 이 옮겨가 재렌더는 보장되지 않는다
 *   KEEP-deliver deliver/ 안의 파일. 사람이 납품본으로 묶어둔 것이라 대장에 없어도 후보가 아니다
 *   LINK      심링크 — input 저장소 참조와 deliver/LATEST 포인터. 세지도 지우지도 않는다
 *   ASSET     소재 클립·수집 원본(review/ · *_assets/) — 산출물이 아니라 자료. 손대지 않는다
 *   KEEP-held 지난 out:prune 에서 사람이 --keep 으로 남기기로 한 파일
 *   KEEP-copy 같은 내용의 사본이 전부 후보가 됐을 때 남기는 한 벌
 *   HOLD      대장이 "파일 유실"(file:null)로 적어둔 판과 길이가 맞는 고아.
 *             유실본 복구 후보 — 판정 전까지 지우지 않는다
 *   ORPHAN    대장이 모르는 나머지 렌더
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const rootArg = argv.indexOf('--root');
const ROOT = path.resolve(rootArg >= 0 ? argv[rootArg + 1] : process.cwd());
const AS_JSON = argv.includes('--json');
const OUT = path.join(ROOT, 'out');
const REPORT_DIR = path.join(OUT, '_audit');

const rel = (p) => path.relative(ROOT, p);
const mb = (b) => (b / 1024 / 1024).toFixed(1) + 'MB';
const sum = (rows) => rows.reduce((a, r) => a + r.size, 0);

if (!fs.existsSync(OUT)) {
  console.error(`out/ 이 없다: ${OUT}`);
  process.exit(1);
}

// ── 대장 읽기 ────────────────────────────────────────────────────────────────
const pilots = [];
const pilotsDir = path.join(ROOT, 'pilots');
for (const id of fs.readdirSync(pilotsDir).sort()) {
  const f = path.join(pilotsDir, id, 'pilot.json');
  if (fs.existsSync(f)) pilots.push(JSON.parse(fs.readFileSync(f, 'utf8')));
}

/** 대장이 가리키는 납품본: 경로 → {pilot, version, isLast} */
const ledger = new Map();
/** 대장이 파일 유실로 적어둔 판 (file:null) — 복구 후보 대조용 */
const lost = [];
/** 지난 out:prune 에서 사용자가 --keep 으로 남긴 파일 — 다시 후보로 올리지 않는다 */
const heldBefore = new Map();
/** out:prune 의 --keep 조각. 파일을 옮겨도 보존 결정이 풀리지 않게 경로 조각으로도 본다 */
const heldFragments = new Set();
const researchDir = path.join(ROOT, 'docs/research');
if (fs.existsSync(researchDir)) {
  for (const d of fs.readdirSync(researchDir)) {
    const m = path.join(researchDir, d, 'pruned-manifest.json');
    if (!fs.existsSync(m)) continue;
    for (const run of JSON.parse(fs.readFileSync(m, 'utf8')).runs ?? []) {
      for (const k of run.kept ?? []) {
        heldBefore.set(path.normalize(k.path), k.by);
        if (k.by) heldFragments.add(k.by); // 사람이 말한 건 경로가 아니라 조각이다 — 옮겨도 따라간다
      }
    }
  }
}
for (const p of pilots) {
  const versions = p.versions ?? [];
  versions.forEach((v, i) => {
    if (!v.file) {
      if (v.duration_sec != null) lost.push({ pilot: p, version: v });
      return;
    }
    ledger.set(path.normalize(v.file), { pilot: p, version: v, isLast: i === versions.length - 1 });
  });
}
/** 대장이 명시한 렌더 원본 — 추론하지 않는다 (2026-09-02, pilot.json versions[].master) */
const masters = new Map();
for (const p of pilots)
  for (const v of p.versions ?? [])
    if (v.master) masters.set(path.normalize(v.master), { pilot: p, version: v });

// ── 파일 수집 ────────────────────────────────────────────────────────────────
const links = [];
const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.name === '.DS_Store' || e.name === '_audit') continue;
    if (e.isSymbolicLink()) {
      links.push(p); // 대상은 다른 저장소에 있다 — out/ 의 용량이 아니다
      continue;
    }
    e.isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
};
const all = walk(OUT);
const videos = all.filter((p) => /\.(mp4|mov)$/i.test(p) && fs.statSync(p).size > 1024 * 1024);

const md5 = (p) => execFileSync('md5', ['-q', p]).toString().trim();
/** 중간 프레임 한 장의 md5 — 재인코딩은 그림을 보존하므로 같은 판이면 일치한다 */
const _fh = new Map();
const frameHash = (abs, at) => {
  const key = abs + '@' + at.toFixed(2);
  if (_fh.has(key)) return _fh.get(key);
  let v = null;
  try {
    v = execFileSync('/opt/homebrew/bin/ffmpeg',
      ['-nostdin', '-loglevel', 'error', '-ss', String(at), '-i', abs,
       '-frames:v', '1', '-vf', 'scale=64:114', '-f', 'md5', '-'],
      { maxBuffer: 1 << 20 }).toString().trim();
  } catch { v = null; }
  _fh.set(key, v);
  return v;
};

const probe = (p) => {
  try {
    const raw = execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name:format=duration',
      '-of', 'default=nw=1:nk=1', p,
    ]).toString().trim().split('\n');
    return { codec: raw[0], duration: Number(raw[1]) };
  } catch {
    return { codec: '?', duration: NaN };
  }
};

const DOC_DIRS = ['docs', 'pilots', '.claude/skills', 'README.md'].filter((d) =>
  fs.existsSync(path.join(ROOT, d)),
);
/** 감사 스냅샷은 모든 파일을 적으므로 인용으로 세면 안 된다 — 삭제 안전성 신호가 오염된다 */
const NOT_A_CITATION = /(^|\/)(audit-before|audit-after|report)\.md$|(^|\/)out\/_audit\//;
const citedBy = (base) => {
  try {
    return execFileSync('grep', ['-rl', '--', base, ...DOC_DIRS], { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean).filter((f) => !NOT_A_CITATION.test(f));
  } catch {
    return [];
  }
};

const rows = videos.map((p) => ({
  path: rel(p),
  abs: p,
  size: fs.statSync(p).size,
  md5: md5(p),
  cited: citedBy(path.basename(p)),
  ...probe(p),
}));

// ── 분류 ────────────────────────────────────────────────────────────────────
const byMd5 = new Map();
for (const r of rows) {
  if (!byMd5.has(r.md5)) byMd5.set(r.md5, []);
  byMd5.get(r.md5).push(r);
}

for (const r of rows) {
  const hit = ledger.get(path.normalize(r.path));
  if (hit) {
    r.kind = 'DELIVER';
    r.who = `${hit.pilot.id}/${hit.version.label}`;
    r.md5ok = hit.version.md5 ? (hit.version.md5 === r.md5 ? 'MATCH' : 'DIFFER') : '—';
  }
}

for (const r of rows) {
  if (r.kind) continue;

  // 대장이 master 로 가리키는 파일 — **이름 짝 추론보다 먼저**. 지우려면 대장에서 먼저 뺀다
  const mh = masters.get(path.normalize(r.path));
  if (mh) {
    r.kind = 'SRC-keep';
    r.who = `${mh.pilot.id}/${mh.version.label} 렌더 원본 (대장 versions[].master)`;
    continue;
  }

  // deliver/ 안은 사람이 납품본으로 묶어둔 것이다 — 대장에 없어도 후보로 올리지 않는다.
  // 지우려면 사람이 버전 폴더째 지운다.
  if (/(^|\/)deliver\//.test(r.path)) {
    r.kind = 'KEEP-deliver';
    r.who = '납품 폴더(deliver/) 안';
    continue;
  }

  // 지난 정리에서 사람이 남기기로 한 파일이다
  const heldBy =
    heldBefore.get(path.normalize(r.path)) ?? [...heldFragments].find((f) => r.path.includes(f));
  if (heldBy) {
    r.kind = 'KEEP-held';
    r.who = `지난 정리에서 보존 결정 ("${heldBy}")`;
    continue;
  }

  // 내용이 같은 납품본이 따로 있으면 사본이다
  const twin = byMd5.get(r.md5).find((o) => o !== r && o.kind === 'DELIVER');
  if (twin) {
    r.kind = 'DUP';
    r.who = `= ${twin.path}`;
    continue;
  }

  // 소재 클립·수집 원본은 산출물이 아니다 (review/ 하위 자료 폴더)
  if (/_assets\//.test(r.path) || /\/review\/[^/]+\//.test(r.path)) {
    r.kind = 'ASSET';
    r.who = '소재·수집본';
    continue;
  }

  // ⚠ 아래 추론은 **옛 `_h264` 이름 짝 전용 잔존물**이다 (2026-09-02 실측: SRC-keep 0행 = 죽은 코드였다).
  //   규약 이름 짝 `<id>_v<N>.mp4` ↔ `.master.mp4` 는 여기서 성립하지 않는다 — stage 의 마스터는
  //   `ShortformNews_*.master.mp4` 라 그 이름과 만날 일이 없고, deliver/ 안의 짝은 위 KEEP-deliver 가 먼저 먹는다.
  //   **정본은 대장 `versions[].master` 다**(위 masters 맵). 정규식을 고치지 말고 대장에 경로를 적는다.
  // 납품본의 렌더 원본(재인코딩 전) 찾기 — 이름 짝(X.mp4 ↔ X_h264.mp4)이 가장 확실하고,
  // 이름이 안 맞으면 같은 폴더·같은 길이·더 큰 크기로 본다.
  //   ⚠ 층 렌더(ShortformNews_4-N)는 **마스터가 될 수 없다** — 층이 빠진 중간물이라 길이만 같다.
  //     5편 실측(2026-09-01): v4(72.0MB)보다 큰 4-2(73.1MB)가 "렌더 원본"으로 잡혀
  //     deliver/v4/…master.mp4 로 복사될 뻔했다. 길이·크기만 보면 이걸 못 가린다.
  const LAYER_RENDER = /(^|\/)ShortformNews_\d-\d[\w.-]*\.mp4$/;
  const srcOf = (f) => {
    // 후보는 r.path 다(f 는 납품본) — 5편에서 이 변수를 헷갈려 가드가 안 걸렸다
    if (LAYER_RENDER.test(r.path) && !/\.master\.mp4$/.test(r.path)) return false;
    const abs = path.join(ROOT, f);
    const byName = f.replace(/_h264\.mp4$/, '.mp4');
    if (byName !== f && path.normalize(byName) === path.normalize(r.path)) return true;
    if (path.dirname(f) !== path.dirname(r.path)) return false;
    if (/_h264\.mp4$/.test(f) && fs.existsSync(path.join(ROOT, f.replace(/_h264\.mp4$/, '.mp4')))) {
      return false; // 저 배포본은 이미 제 이름의 원본을 갖고 있다
    }
    // ⚠ **이름 짝이 아니면 마스터가 아니다** (5편 2026-09-01 폐기된 휴리스틱)
    //   옛 규칙 "같은 폴더·같은 길이·더 큰 크기"는 '이 판의 마스터'와 '비슷한 다른 판'을 구별하지 못한다.
    //   실측 3연속 오탐: ① 층 렌더 4-2 ② v2 시절 4-6.master(중간 프레임 md5 가 달랐다)
    //   ③ 직전 판 v3(중간은 같고 b15·b16 만 다르다 — 프레임 표본을 늘려도 못 가린다).
    //   규약이 이미 이름을 정해 뒀다: 납품 h264 `<id>_v<N>.mp4` ↔ 렌더 원본 `<id>_v<N>.master.mp4`.
    //   짝이 없으면 **마스터가 없는 것**이다(h264 로 직접 렌더한 편). 없는 것을 지어내지 않는다.
    return false;
  };
  const src =
    [...ledger.entries()].find(
      ([f]) => path.normalize(f.replace(/_h264\.mp4$/, '.mp4')) === path.normalize(r.path),
    ) ??
    [...ledger.entries()].find(
      ([f, e]) =>
        e.version.duration_sec != null &&
        Math.abs(e.version.duration_sec - r.duration) < 0.06 &&
        srcOf(f),
    );
  if (src) {
    const [, e] = src;
    // 마지막 판 = 그 편이 지금 채택한 판. 납품 확정이 아니어도 원본을 남긴다.
    r.kind = e.isLast ? 'SRC-keep' : 'SRC-drop';
    r.who = `${e.pilot.id}/${e.version.label} 렌더 원본`;
    continue;
  }

  // 대장이 유실로 적어둔 판과 길이가 맞으면 복구 후보다 — 지우면 안 된다
  const isStageName = /_4-\d|_preview|_prev\./.test(path.basename(r.path));
  const recover = lost.find((e) =>
    e.version.md5
      ? e.version.md5 === r.md5 // 유실판의 md5 를 알면 정확히 맞춘다
      : !isStageName &&
        Number.isFinite(r.duration) &&
        Math.abs(e.version.duration_sec - r.duration) < 0.11,
  );
  if (recover) {
    r.kind = 'HOLD';
    r.who = `${recover.pilot.id}/${recover.version.label} 유실본 복구 후보`;
    continue;
  }

  if (isStageName) {
    r.kind = 'STAGE';
    r.who = '조립 단계';
    continue;
  }

  // 사본끼리만 중복인 경우(납품본 아님) — 두 번째 이후를 사본으로 본다
  const group = byMd5.get(r.md5);
  if (group.length > 1 && group.indexOf(r) > 0) {
    r.kind = 'DUP';
    r.who = `= ${group[0].path}`;
    continue;
  }

  r.kind = 'ORPHAN';
  r.who = '대장 미등록';
}

// 보존이 확정된 사본이 따로 있으면 그건 DUP 이다 — 분류 순서와 무관하게 다시 본다.
const PRUNE_KINDS_PRE = new Set(['SRC-drop', 'DUP', 'STAGE', 'ORPHAN']);
for (const r of rows) {
  if (!PRUNE_KINDS_PRE.has(r.kind)) continue;
  const twin = byMd5.get(r.md5).find((o) => o !== r && !PRUNE_KINDS_PRE.has(o.kind));
  if (twin && r.kind !== 'STAGE') {
    r.kind = 'DUP';
    r.who = `= ${twin.path}`;
  }
}

// 안전장치 — 같은 내용(md5)이 통째로 사라지지 않게 한 벌은 남긴다.
// 문서가 더 많이 인용한 사본, 같으면 큰 사본을 남긴다.
const PRUNE_KINDS = new Set(['SRC-drop', 'DUP', 'STAGE', 'ORPHAN']);
for (const group of byMd5.values()) {
  if (group.length < 2) continue;
  if (group.some((r) => !PRUNE_KINDS.has(r.kind))) continue;
  if (group.every((r) => r.kind === 'STAGE')) continue; // 단계 렌더는 한 벌도 남길 필요가 없다
  const survivor = [...group].sort(
    (a, b) => b.cited.length - a.cited.length || b.size - a.size,
  )[0];
  survivor.kind = 'KEEP-copy';
  survivor.who = `이 내용의 마지막 사본 (${group.length - 1}개 사본은 삭제 후보)`;
}

const missing = [
  ...[...ledger.entries()]
    .filter(([p]) => !fs.existsSync(path.join(ROOT, p)))
    .map(([p, e]) => ({ path: p, who: `${e.pilot.id}/${e.version.label}` })),
  ...[...masters.entries()]
    .filter(([p]) => !fs.existsSync(path.join(ROOT, p)))
    .map(([p, e]) => ({ path: p, who: `${e.pilot.id}/${e.version.label} 렌더 원본` })),
];

// ── 보고 ────────────────────────────────────────────────────────────────────
const ORDER = ['DELIVER', 'KEEP-deliver', 'SRC-keep', 'KEEP-held', 'KEEP-copy', 'HOLD', 'ASSET', 'SRC-drop', 'DUP', 'STAGE', 'ORPHAN'];
const PRUNABLE = new Set(['SRC-drop', 'DUP', 'STAGE', 'ORPHAN']);
const groups = ORDER.map((k) => [k, rows.filter((r) => r.kind === k).sort((a, b) => b.size - a.size)]);
const prune = rows.filter((r) => PRUNABLE.has(r.kind)).sort((a, b) => b.size - a.size);

const lines = [];
const say = (s = '') => lines.push(s);

say(`# out/ 감사 — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
say();
say(`대상 \`${rel(OUT)}\` · 영상 ${rows.length}개 · 합계 ${mb(sum(rows))}`);
say();
say('| 분류 | 개수 | 용량 | 뜻 |');
say('|---|--:|--:|---|');
const MEAN = {
  DELIVER: '대장이 인정한 납품본 — 지우지 않는다',
  'KEEP-deliver': 'deliver/ 안 — 사람이 납품본으로 묶은 것. 후보로 올리지 않는다',
  'SRC-keep': '확정 납품편의 렌더 원본(고비트레이트) — 남긴다',
  'KEEP-held': '지난 정리에서 사람이 남기기로 한 파일',
  'KEEP-copy': '같은 내용이 통째로 사라지지 않게 남기는 한 벌',
  HOLD: '대장이 유실로 적어둔 판의 복구 후보 — 판정 전까지 보류',
  ASSET: '소재 클립·수집 원본 — 산출물이 아니다, 손대지 않는다',
  'SRC-drop': '폐기 세대의 렌더 원본 — 삭제 후보',
  DUP: '내용이 같은 사본 — 삭제 후보',
  STAGE: '조립 단계 렌더 4-x·프리뷰 — 소비처 없음. 다만 재렌더는 보장되지 않는다',
  ORPHAN: '대장이 모르는 렌더 — 삭제 후보',
};
for (const [k, rs] of groups) if (rs.length) say(`| ${k} | ${rs.length} | ${mb(sum(rs))} | ${MEAN[k]} |`);
say();
say(`**삭제 후보 ${prune.length}개 / ${mb(sum(prune))}** · 보존 ${rows.length - prune.length}개 / ${mb(sum(rows) - sum(prune))}`);
say();

const bad = rows.filter((r) => r.md5ok === 'DIFFER');
if (missing.length || bad.length) {
  say('## ⚠ 대장 ↔ 실물 불일치');
  say();
  for (const m of missing) say(`- MISS \`${m.path}\` — ${m.who} (대장에 있는데 파일이 없다)`);
  for (const r of bad) say(`- DIFFER \`${r.path}\` — ${r.who} (md5 가 대장과 다르다)`);
  say();
}

for (const [k, rs] of groups) {
  if (!rs.length) continue;
  say(`## ${k} — ${rs.length}개 / ${mb(sum(rs))}`);
  say();
  say('| 용량 | 길이 | 문서인용 | 파일 | 근거 |');
  say('|--:|--:|--:|---|---|');
  for (const r of rs) {
    const d = Number.isFinite(r.duration) ? r.duration.toFixed(1) + 's' : '—';
    const ok = r.md5ok && r.md5ok !== '—' ? ` (md5 ${r.md5ok})` : '';
    const c = r.cited.length ? `${r.cited.length}곳` : '—';
    say(`| ${mb(r.size)} | ${d} | ${c} | \`${r.path}\` | ${r.who}${ok} |`);
  }
  say();
}

if (links.length) {
  const seen = links.map((l) => {
    let target = null;
    try {
      target = fs.readlinkSync(l);
    } catch {
      /* 읽을 수 없는 링크 */
    }
    const abs = target ? path.resolve(path.dirname(l), target) : null;
    return {
      link: l,
      target,
      ok: abs ? fs.existsSync(abs) : false,
      pointer: path.basename(l) === 'LATEST',
    };
  });
  const broken = seen.filter((e) => !e.ok);
  say(`## LINK — ${links.length}개`);
  say();
  say(
    '심링크다 — input 저장소 참조와 `deliver/LATEST` 포인터. 대상은 이 경로가 차지하는 용량이 아니므로 세지 않고, 삭제 후보도 되지 않는다.',
  );
  say();
  for (const e of seen.filter((x) => x.pointer)) {
    say(`- 납품 포인터 \`${rel(e.link)}\` → \`${e.target ?? '?'}\`${e.ok ? '' : '  ⚠ 깨짐'}`);
  }
  for (const e of seen.filter((x) => !x.pointer).slice(0, 5)) {
    say(`- \`${rel(e.link)}\`\n  → \`${e.target ?? '?'}\``);
  }
  const rest = seen.filter((x) => !x.pointer).length - 5;
  if (rest > 0) say(`- … 그 밖 ${rest}개`);
  if (broken.length) {
    say();
    say(`**⚠ 깨진 심링크 ${broken.length}개** — 대상이 없다.`);
    for (const e of broken) say(`- \`${rel(e.link)}\` → \`${e.target ?? '?'}\``);
  }
  say();
}

const nonVideo = all.filter((p) => !videos.includes(p));
say(`## 그 밖`);
say();
say(`영상이 아닌 파일 ${nonVideo.length}개 / ${mb(sum(nonVideo.map((p) => ({ size: fs.statSync(p).size }))))} — qa 스틸·시트·크레딧 문서. 이 감사는 손대지 않는다.`);
say();

const report = lines.join('\n');
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, 'report.md'), report);
fs.writeFileSync(
  path.join(REPORT_DIR, 'prune-candidates.txt'),
  prune.map((r) => r.path).join('\n') + (prune.length ? '\n' : ''),
);

if (AS_JSON) {
  console.log(JSON.stringify({ rows, missing, prune: prune.map((r) => r.path) }, null, 2));
} else {
  console.log(report);
  console.log(`보고서  ${rel(path.join(REPORT_DIR, 'report.md'))}`);
  console.log(`후보목록 ${rel(path.join(REPORT_DIR, 'prune-candidates.txt'))}  (${prune.length}개 / ${mb(sum(prune))})`);
  console.log('\n이 명령은 아무것도 지우지 않는다. 목록을 확인한 뒤 삭제 여부를 정한다.');
}
