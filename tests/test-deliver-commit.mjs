import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readlinkSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { REPO } from '../scripts/lib/pilot.mjs';
import { deliverEpisode } from '../scripts/lib/production/finalize.mjs';
import { findEpisodesByUrl, defaultEpisodeId } from '../scripts/lib/production/episode-lookup.mjs';

const put = (file, body) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2) + '\n'); };
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
const URL_ = 'https://www.hani.co.kr/arti/science/science_general/1299999.html';
const ID = 'hani_1299999';

const fixture = (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'shortform-deliver-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  copyFileSync(join(REPO, '.gitignore'), join(repo, '.gitignore'));
  mkdirSync(join(repo, 'config'), { recursive: true }); copyFileSync(join(REPO, 'config/audio-loudness.json'), join(repo, 'config/audio-loudness.json'));
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', '테스트');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  git(repo, 'add', '.gitignore', 'config'); git(repo, 'commit', '-q', '-m', 'init');
  put(join(repo, 'news', ID, '00_brief/request.json'), { schema_version: '1.0', pilot: ID, mode: 'editorial-concept', source_url: URL_ });
  put(join(repo, 'news', ID, '00_brief/user-request.txt'), '이 기사로 숏폼 만들어줘 ' + URL_);
  put(join(repo, 'news', ID, '02_production/story.json'), { mode: 'editorial-concept' });
  put(join(repo, 'news', ID, '02_production/audio/narration.wav'), Buffer.alloc(64, 1));
  put(join(repo, 'src/editorial/episodes', ID + '.tsx'), 'export const EditorialEpisode = () => null;\n');
  put(join(repo, 'news', ID, '02_production/audio.json'), { loudness_contract: 'audio-loudness@1' });
  put(join(repo, 'pilots', ID, 'pilot.json'), { id: ID, title: null, status: 'drafting', delivered: null, article: { url: null }, versions: [] });
  put(join(repo, 'pilots', ID, 'timeline.json'), { fps: 30 });
  return repo;
};
const render = (repo, bytes) => {
  const path = 'out/pilots/' + ID + '/qa/production-' + bytes + '.mp4';
  put(join(repo, path), Buffer.alloc(128, bytes));
  put(join(repo, 'news', ID, '02_production/run.json'), { receipts: { render: { validation: { artifact: { path, sha256: sha(join(repo, path)) }, media: { duration: 60 } } } } });
  put(join(repo, 'news', ID, '02_production/reviews/audio-loudness.json'), { contract: 'audio-loudness@1', render_sha256: sha(join(repo, path)), verdict: { status: 'pass', checks: [] } });
};

test('확정하면 새 버전·LATEST·자동 커밋, 작업트리는 깨끗하고 미디어는 커밋되지 않는다', (t) => {
  const repo = fixture(t);
  render(repo, 1);
  const first = deliverEpisode(ID, { repo });
  assert.equal(first.version, 'v1');
  assert.equal(first.commit.committed, true);
  assert.equal(git(repo, 'status', '--porcelain'), '');
  const tracked = git(repo, 'ls-files').split('\n');
  assert.ok(tracked.includes('pilots/' + ID + '/pilot.json'));
  assert.ok(tracked.includes('src/editorial/episodes/' + ID + '.tsx'));
  assert.ok(tracked.includes('news/' + ID + '/00_brief/user-request.txt'));
  assert.ok(!tracked.some((p) => /\.(wav|mp4)$/.test(p)), '미디어는 커밋하지 않는다');
  assert.equal(readlinkSync(join(repo, 'out/pilots', ID, 'deliver/LATEST')), 'v1');
  const pilot = JSON.parse(readFileSync(join(repo, 'pilots', ID, 'pilot.json')));
  assert.equal(pilot.status, 'delivered');
  assert.equal(pilot.article.url, URL_);

  // 같은 영상을 다시 확정하면 새 버전을 만들지 않는다
  assert.match(deliverEpisode(ID, { repo }).skipped, /같은 영상/);

  // 수정본 → v2가 확정본
  render(repo, 2);
  assert.equal(deliverEpisode(ID, { repo, basis: 'user' }).version, 'v2');
  assert.equal(readlinkSync(join(repo, 'out/pilots', ID, 'deliver/LATEST')), 'v2');

  // 이전 판으로 되돌리기 = v1을 v3로 다시 확정
  const restored = deliverEpisode(ID, { repo, from: 'v1' });
  assert.equal(restored.version, 'v3');
  assert.equal(restored.sha256, first.sha256);
  assert.equal(git(repo, 'status', '--porcelain'), '');
  assert.equal(git(repo, 'log', '--format=%s').split('\n').filter((s) => s.startsWith('편 ')).length, 3);
});

test('다른 변경이 커밋 대기 중이면 섞지 않고 멈춘다', (t) => {
  const repo = fixture(t);
  render(repo, 1);
  put(join(repo, 'README.md'), 'x'); git(repo, 'add', 'README.md');
  assert.throws(() => deliverEpisode(ID, { repo }), /커밋 대기/);
});

test('같은 기사 URL은 같은 편을 가리키고 한겨레 기사는 hani_<번호> id', (t) => {
  const repo = fixture(t);
  assert.deepEqual(findEpisodesByUrl(repo, URL_.replace('www.', '') + '?utm=x#top'), [ID]);
  assert.deepEqual(findEpisodesByUrl(repo, 'https://www.hani.co.kr/arti/1.html'), []);
  assert.equal(defaultEpisodeId(URL_, 'fallback'), ID);
  assert.equal(defaultEpisodeId('https://example.invalid/a', 'fallback'), 'fallback');
});

test('한글·공백 경로가 든 편도 확정 커밋된다 — git 인용 표기(core.quotepath)를 삭제로 오인하지 않는다', (t) => {
  const repo = fixture(t);
  git(repo, 'config', 'core.quotepath', 'true'); // git 기본값. 사용자 전역 설정과 무관하게 인용 표기를 재현한다
  const names = ['01_input/01_원문_기사.md', '01_input/자료 목록 [1].txt', '02_production/대본 초안.md'];
  for (const name of names) put(join(repo, 'news', ID, name), name + '\n');
  render(repo, 1);
  const first = deliverEpisode(ID, { repo });
  assert.equal(first.commit.committed, true);
  const tracked = git(repo, 'ls-files', '-z').split('\0');
  for (const name of names) assert.ok(tracked.includes('news/' + ID + '/' + name), name + ' 이 커밋돼야 한다');

  // 두 번째 확정: 이미 추적 중인 한글 경로를 삭제 대상으로 오인하지 않고, 실제로 지운 파일만 기록에서 뺀다
  rmSync(join(repo, 'news', ID, names[2]));
  render(repo, 2);
  assert.equal(deliverEpisode(ID, { repo, basis: 'user' }).version, 'v2');
  assert.equal(git(repo, 'status', '--porcelain'), '');
  const after = git(repo, 'ls-files', '-z').split('\0');
  assert.ok(after.includes('news/' + ID + '/' + names[0]));
  assert.ok(after.includes('news/' + ID + '/' + names[1]));
  assert.ok(!after.includes('news/' + ID + '/' + names[2]), '지운 파일은 추적에서 빠진다');
});
