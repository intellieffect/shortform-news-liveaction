import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, win32 } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { REPO } from '../scripts/lib/pilot.mjs';
import { addTrack, checkLibrary, creditLine, listTracks, readCatalog, safeFileName, trackIdFrom, useTrack, CATALOG } from '../scripts/lib/music-library.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const put = (file, body) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2) + '\n'); };
// 한글·공백이 든 저장소 경로에서 동작해야 한다(한겨레 Windows 사용자 폴더).
const fixture = (t) => {
  const repo = mkdtempSync(join(tmpdir(), '공용 음원 테스트 '));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  return repo;
};
const audio = (n) => Buffer.concat([Buffer.from('ID3'), Buffer.alloc(256, n)]);

test('파일 이름은 Windows 금지 문자·예약 이름을 피하고 한글·공백은 보존한다', () => {
  assert.equal(safeFileName('봄 바람: 테마?.mp3'), '봄 바람_ 테마_.mp3');
  assert.equal(safeFileName('con.mp3'), '_con.mp3');
  assert.equal(safeFileName('끝에 점. '), '끝에 점');
  // macOS가 주는 NFD 한글을 NFC로 저장해 Windows와 같은 이름이 되게 한다.
  assert.equal(safeFileName('새벽.mp3'.normalize('NFD')), '새벽.mp3'.normalize('NFC'));
  assert.equal(trackIdFrom('새벽 공기 (Remix).mp3'), '새벽-공기-remix');
  // 목록·명령이 쓰는 상대경로는 Windows에서도 한 파일을 가리킨다.
  assert.equal(win32.join('C:\\Users\\한겨레 편집부\\repo', ...'library/music/files'.split('/'), '봄 바람.mp3'), 'C:\\Users\\한겨레 편집부\\repo\\library\\music\\files\\봄 바람.mp3');
});

test('파일만 주면 넣는다 — 라이선스·사용 범위·크레딧을 요구하지 않고 출처·해시·추가일은 자동 기록', async (t) => {
  const repo = fixture(t);
  const src = join(repo, '받은 파일', 'Music - 봄 바람 by 한겨레.mp3');
  put(src, audio(1));
  const r = await addTrack({ repo, input: src });
  assert.equal(r.added, true);
  assert.equal(r.track.license, null);
  assert.equal(r.track.usage_scope, null);
  assert.equal('credit' in r.track, false);
  assert.equal(r.track.source, '보유');
  assert.equal(r.track.sha256, sha(audio(1)));
  assert.match(r.track.added_at, /^\d{4}-\d{2}-\d{2}$/);
  // 끝 크레딧 음악 줄 = 파일 이름(확장자 제외)
  assert.equal(r.credit, 'Music - 봄 바람 by 한겨레');
  assert.equal(creditLine(r.track), 'Music - 봄 바람 by 한겨레');
  assert.deepEqual(checkLibrary(repo), []);
});

test('로컬 한글 파일 → 공용 폴더 복사·해시·라이선스 기록, 같은 음원은 중복 추가하지 않는다', async (t) => {
  const repo = fixture(t);
  const src = join(repo, '받은 파일', '봄 바람 테마.mp3');
  put(src, audio(2));
  const r = await addTrack({ repo, input: src, license: '한겨레 보유', usage: '한겨레 숏폼' });
  assert.equal(r.added, true);
  assert.equal(r.track.id, '봄-바람-테마');
  assert.equal(r.track.source, '보유');
  assert.equal(r.track.sha256, sha(audio(2)));
  assert.deepEqual(r.changed, [CATALOG]);
  assert.ok(existsSync(join(repo, 'library', 'music', 'files', '봄 바람 테마.mp3')));
  assert.equal(r.track.license, '한겨레 보유');
  const again = await addTrack({ repo, input: src });
  assert.equal(again.added, false);
  assert.equal(readCatalog(repo).tracks.length, 1);
  assert.deepEqual(checkLibrary(repo), []);
  const listed = listTracks(repo, { verify: true });
  assert.equal(listed[0].present, true);
  assert.equal(listed[0].hash_ok, true);
});

test('URL 음원은 받은 뒤 원 출처 URL과 함께 기록한다', async (t) => {
  const repo = fixture(t);
  const body = audio(3);
  const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'audio/mpeg' }); res.end(body); });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/music/%EC%83%88%EB%B2%BD%20%EA%B3%B5%EA%B8%B0.mp3`;
  const r = await addTrack({ repo, input: url });
  assert.equal(r.track.file, '새벽 공기.mp3');
  assert.equal(r.track.source, url);
  assert.equal(r.track.sha256, sha(body));
  assert.equal(r.credit, '새벽 공기');
});

test('음원이 아닌 확장자·중복 id는 거절한다', async (t) => {
  const repo = fixture(t);
  put(join(repo, 'a.txt'), 'x');
  await assert.rejects(addTrack({ repo, input: join(repo, 'a.txt') }), /음원 확장자/);
  put(join(repo, 'x', '곡.mp3'), audio(4));
  put(join(repo, 'y', '곡.wav'), audio(5));
  await addTrack({ repo, input: join(repo, 'x', '곡.mp3') });
  await assert.rejects(addTrack({ repo, input: join(repo, 'y', '곡.wav') }), /id "곡"가 이미 있다/);
});

test('편에서 쓰면 bgm 폴더 복사·audio.json·RIGHTS.md·끝 크레딧 음악 줄(파일 이름)이 연결된다', async (t) => {
  const repo = fixture(t);
  const id = 'hani_1299999';
  const root = join(repo, 'news', id);
  put(join(root, '00_brief', 'request.json'), { pilot: id });
  put(join(root, '02_production', 'visual-system.json'), { attribution: { sources: [], pages: [{ duration: 3, categories: [{ title: '참조 기사', lines: ['https://example.invalid/a'] }] }] } });
  put(join(repo, '받은 파일', '밤 산책.mp3'), audio(6));
  await addTrack({ repo, input: join(repo, '받은 파일', '밤 산책.mp3') });
  const r = useTrack({ repo, track: '밤 산책', episode: 'news/' + id });
  assert.equal(r.episode, id);
  const copied = join(root, '02_production', 'external_assets', 'audio', 'bgm', '밤 산책.mp3');
  assert.equal(sha(readFileSync(copied)), sha(audio(6)));
  const a = JSON.parse(readFileSync(join(root, '02_production', 'audio.json'), 'utf8'));
  assert.equal(a.bgm.file, 'audio/밤 산책.mp3');
  assert.equal(a.bgm.asset, 'library:밤-산책');
  assert.equal(a.bgm.credit, '밤 산책');
  const rights = readFileSync(join(root, '01_input', '05_참고자료', 'RIGHTS.md'), 'utf8');
  assert.match(rights, /library-music:밤-산책/);
  // 라이선스 미기재는 오류가 아니라 기록으로 남는다.
  assert.match(rights, /\| 라이선스 \| 미기재 \|/);
  assert.match(rights, /\| 끝 크레딧 음악 줄 \| 밤 산책 \(파일 이름\) \|/);
  const v = JSON.parse(readFileSync(join(root, '02_production', 'visual-system.json'), 'utf8'));
  assert.deepEqual(v.attribution.pages[0].categories.at(-1), { title: '음악', lines: ['밤 산책'] });
  // 다시 실행해도 기록이 겹치지 않는다.
  const again = useTrack({ repo, track: '밤-산책', episode: id });
  assert.deepEqual(again.changed, ['02_production/audio.json']);
  assert.equal(readFileSync(join(root, '01_input', '05_참고자료', 'RIGHTS.md'), 'utf8').split('library-music:').length, 2);
});

test('없는 편·없는 곡·파일 없는 곡은 명확히 거절한다', async (t) => {
  const repo = fixture(t);
  put(join(repo, 's', '곡 하나.mp3'), audio(7));
  await addTrack({ repo, input: join(repo, 's', '곡 하나.mp3') });
  assert.throws(() => useTrack({ repo, track: '곡 하나', episode: 'hani_1' }), /편을 찾지 못했다/);
  put(join(repo, 'news', 'hani_1', '00_brief', 'request.json'), {});
  assert.throws(() => useTrack({ repo, track: '없는 곡', episode: 'hani_1' }), /공용 폴더에 "없는 곡" 곡이 없다/);
  rmSync(join(repo, 'library', 'music', 'files', '곡 하나.mp3'));
  assert.throws(() => useTrack({ repo, track: '곡 하나', episode: 'hani_1' }), /백업에서 복원/);
  assert.ok(checkLibrary(repo).some((e) => /파일이 없다/.test(e)));
});

test('CLI: add → list → use (한글·공백 경로)', (t) => {
  const repo = fixture(t);
  put(join(repo, 'news', 'hani_2', '00_brief', 'request.json'), {});
  put(join(repo, '내 음원', '비 오는 날.wav'), audio(8));
  const run = (...args) => spawnSync(process.execPath, [join(REPO, 'scripts', 'music.mjs'), ...args, '--repo', repo], { encoding: 'utf8' });
  const added = run('add', join(repo, '내 음원', '비 오는 날.wav'), '--no-commit');
  assert.equal(added.status, 0, added.stderr);
  assert.match(added.stdout, /끝 크레딧 음악 줄: 비 오는 날/);
  assert.doesNotMatch(added.stdout + added.stderr, /라이선스/);
  const listed = run('list');
  assert.match(listed.stdout, /\| 비-오는-날 \| 비 오는 날 \| 보유 \| \d{4}-\d{2}-\d{2} \| 미기재 \| 있음 \|/);
  const used = run('use', '비-오는-날', 'hani_2');
  assert.equal(used.status, 0, used.stderr);
  assert.match(used.stdout, /npm run sync -- news\/hani_2/);
  assert.equal(JSON.parse(readFileSync(join(repo, 'news', 'hani_2', '02_production', 'audio.json'), 'utf8')).bgm.credit, '비 오는 날');
});

test('CLI add는 catalog.json만 자동 커밋하고 음원 파일은 올리지 않는다', (t) => {
  const repo = fixture(t);
  const git = (...args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  writeFileSync(join(repo, '.gitignore'), readFileSync(join(REPO, '.gitignore')));
  put(join(repo, 'library', 'music', 'catalog.json'), { schema_version: 'music-library@1', tracks: [] });
  git('init', '-q', '-b', 'main'); git('config', 'user.name', '테스트'); git('config', 'user.email', 't@example.invalid');
  git('add', '-A'); git('commit', '-q', '-m', 'init');
  put(join(repo, '내 음원', '아침 뉴스.mp3'), audio(9));
  const r = spawnSync(process.execPath, [join(REPO, 'scripts', 'music.mjs'), 'add', join(repo, '내 음원', '아침 뉴스.mp3'), '--repo', repo], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /커밋: [0-9a-f]+ \(library\/music\/catalog\.json만\)/);
  assert.equal(git('show', '--name-only', '--format=', 'HEAD').stdout.trim(), 'library/music/catalog.json');
  assert.match(git('log', '-1', '--format=%s').stdout, /^공용 음원: 아침-뉴스 추가$/m);
  assert.equal(git('ls-files', 'library/music/files').stdout, '');
});
