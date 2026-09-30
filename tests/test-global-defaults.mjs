import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO } from '../scripts/lib/pilot.mjs';
import { prepareProductionPrompt, promptStatus } from '../scripts/lib/production/prompt.mjs';
import { archiveProfile, bumpProfile, bumpPrompt, defaultsIntegrity, setVoice, showDefaults } from '../scripts/lib/production/global-defaults.mjs';
import { readProductionProfile } from '../scripts/lib/production-profile.mjs';

const PROMPT = 'docs/PRODUCTION_PROMPT_V2_RESTORED.txt';
const read = (repo, rel) => JSON.parse(readFileSync(join(repo, rel), 'utf8'));
const fixture = (t) => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), '기본값 테스트 ')));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  cpSync(join(REPO, 'config'), join(repo, 'config'), { recursive: true });
  mkdirSync(join(repo, 'docs'));
  cpSync(join(REPO, PROMPT), join(repo, PROMPT));
  return repo;
};
const noEnv = { PATH: process.env.PATH };

test('저장소의 현재 기본값은 등록부·보관본과 일치한다', () => {
  assert.deepEqual(defaultsIntegrity(REPO), []);
  assert.equal(promptStatus(REPO).matches, true);
});

test('지금 기본값 보기: 프롬프트·프로필·보이스·후킹·출처 스타일', (t) => {
  const repo = fixture(t);
  const d = showDefaults(repo, { env: noEnv });
  assert.match(d.prompt.version, /^v2-original@\d+$/);
  assert.equal(d.prompt.matches_registry, true);
  assert.equal(d.profile.id, 'hani-shortform');
  assert.equal(d.narration.config.voice_name, 'Sanghyun');
  assert.equal(d.narration.env_override, null);
  assert.equal(d.hook_style.change_flow, '개발');
  assert.equal(d.music_library.tracks, 0);
});

test('프롬프트 본문만 고치고 버전을 안 올리면 start가 거절하고, prompt-bump 후에는 새 버전으로 기록된다', (t) => {
  const repo = fixture(t);
  const before = promptStatus(repo).version;
  appendFileSync(join(repo, PROMPT), '\n배경음악은 공용 폴더의 곡을 먼저 검토한다.\n');
  assert.throws(() => prepareProductionPrompt(repo, 'https://example.invalid/a'), /등록 해시와 다르다 — 본문을 고쳤다면 npm run defaults -- prompt-bump/);
  assert.ok(defaultsIntegrity(repo).some((e) => /prompt-bump/.test(e)));
  const r = bumpPrompt(repo, { note: '공용 음원 우선' });
  const n = Number(before.split('@')[1]) + 1;
  assert.equal(r.version, 'v2-original@' + n);
  assert.ok(existsSync(join(repo, `config/production-prompts/v2-original@${n}.txt`)));
  assert.equal(read(repo, 'config/production-defaults.json').production_prompt.version, r.version);
  const prepared = prepareProductionPrompt(repo, 'https://example.invalid/a');
  assert.equal(prepared.record.version, r.version);
  assert.match(prepared.applied, /공용 폴더의 곡을 먼저/);
  // 이전 버전 본문은 보관본에 그대로 남는다.
  assert.doesNotMatch(readFileSync(join(repo, `config/production-prompts/${before}.txt`), 'utf8'), /공용 폴더의 곡을 먼저/);
  assert.deepEqual(defaultsIntegrity(repo), []);
  assert.deepEqual(bumpPrompt(repo).changed, []);
});

test('Windows CRLF 체크아웃도 같은 본문으로 본다', (t) => {
  const repo = fixture(t);
  writeFileSync(join(repo, PROMPT), readFileSync(join(repo, PROMPT), 'utf8').replace(/\n/g, '\r\n'));
  assert.equal(promptStatus(repo).matches, true);
});

test('[기사 URL] 자리가 없어진 본문은 등록하지 않는다', (t) => {
  const repo = fixture(t);
  writeFileSync(join(repo, PROMPT), readFileSync(join(repo, PROMPT), 'utf8').replace('[기사 URL]', '기사'));
  assert.throws(() => bumpPrompt(repo), /\[기사 URL\]/);
});

test('프로필: 보관 → 값 수정 → 새 버전, 기존 버전 편은 보관본으로 읽힌다', (t) => {
  const repo = fixture(t);
  const current = read(repo, 'config/production-profile.json');
  assert.throws(() => bumpProfile(repo, '9.0.0'), /보관본이 없다|같다/);
  const archived = archiveProfile(repo);
  assert.equal(archived.archive, `config/production-profiles/${current.id}-${current.version}.json`);
  assert.throws(() => bumpProfile(repo, '9.0.0'), /보관본과 같다/);
  const edited = { ...current, caption: { ...current.caption, font_size: current.caption.font_size + 4 } };
  writeFileSync(join(repo, 'config/production-profile.json'), JSON.stringify(edited, null, 2) + '\n');
  assert.ok(defaultsIntegrity(repo).some((e) => /profile-bump/.test(e)));
  assert.throws(() => bumpProfile(repo, current.version), /보다 커야/);
  const r = bumpProfile(repo, '9.0.0');
  assert.equal(r.version, '9.0.0');
  assert.deepEqual(defaultsIntegrity(repo), []);
  const old = readProductionProfile({ id: current.id, version: current.version }, repo);
  assert.equal(old.caption.font_size, current.caption.font_size);
  assert.equal(readProductionProfile({ id: current.id, version: '9.0.0' }, repo).caption.font_size, current.caption.font_size + 4);
});

test('보이스 변경: config에 기록, .env TYPECAST_VOICE_ID가 있으면 경고', (t) => {
  const repo = fixture(t);
  const r = setVoice(repo, { voice_id: 'tc_abc123', voice_name: '민지', audio_tempo: 1.1 }, { env: noEnv });
  assert.equal(read(repo, 'config/production-defaults.json').narration.voice.voice_id, 'tc_abc123');
  assert.equal(r.after.audio_tempo, 1.1);
  assert.ok(!r.warnings.some((w) => /TYPECAST_VOICE_ID/.test(w)));
  assert.ok(r.warnings.some((w) => /소급되지 않는다/.test(w)));
  writeFileSync(join(repo, '.env'), 'TYPECAST_API_KEY=x\nTYPECAST_VOICE_ID="tc_envvoice"  \n');
  const warned = setVoice(repo, { voice_id: 'tc_other1' }, { env: noEnv });
  assert.ok(warned.warnings.some((w) => /\.env의 TYPECAST_VOICE_ID\(tc_envvoice\)/.test(w)));
  assert.equal(warned.after.voice_name, null);
  assert.equal(showDefaults(repo, { env: noEnv }).narration.effective_for_new_episode.voice_id, 'tc_envvoice');
  assert.throws(() => setVoice(repo, { audio_tempo: 3 }, { env: noEnv }), /0\.5~2\.0/);
  assert.throws(() => setVoice(repo, { voice_id: 'Sanghyun' }, { env: noEnv }), /tc_/);
});

const python = ['python3', 'python'].find((cmd) => spawnSync(cmd, ['--version']).status === 0);
test('make_narration.py 보이스 결정 순서: 편 voice.json → env → config → 코드', { skip: !python && 'python 없음' }, (t) => {
  const repo = fixture(t);
  const scripts = join(repo, 'news', 'hani_1', '02_production', 'scripts');
  mkdirSync(scripts, { recursive: true });
  cpSync(join(REPO, 'plugin/skills/shortform-news-input/scripts/make_narration.py'), join(scripts, 'make_narration.py'));
  const run = (env = {}) => {
    const r = spawnSync(python, [join(scripts, 'make_narration.py'), '--print-voice'], { cwd: repo, encoding: 'utf8', env: { ...noEnv, ...env } });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  let v = run();
  assert.equal(v.source, 'config/production-defaults.json narration.voice');
  assert.equal(v.voice.voice_name, 'Sanghyun');
  setVoice(repo, { voice_id: 'tc_cfg1', voice_name: '설정', audio_tempo: 1.2, audio_pitch: 1 }, { env: noEnv });
  v = run();
  assert.equal(v.voice.voice_id, 'tc_cfg1');
  assert.equal(v.voice.audio_pitch, 1);
  v = run({ TYPECAST_VOICE_ID: 'tc_env1' });
  assert.equal(v.source, '환경변수/.env TYPECAST_VOICE_ID');
  assert.equal(v.voice.voice_id, 'tc_env1');
  assert.equal(v.voice.audio_tempo, 1.2);
  writeFileSync(join(repo, 'news', 'hani_1', '02_production', 'voice.json'), JSON.stringify({ provider: 'typecast', voice_id: 'tc_episode', voice_name: '편 고정', audio_tempo: 1.0 }));
  v = run({ TYPECAST_VOICE_ID: 'tc_env1' });
  assert.equal(v.source, '편 02_production/voice.json');
  assert.equal(v.voice.voice_id, 'tc_episode');
  assert.equal(v.voice.audio_tempo, 1.0);
  // 제공자 기록만 있는 voice.json은 고정값으로 보지 않는다.
  writeFileSync(join(repo, 'news', 'hani_1', '02_production', 'voice.json'), JSON.stringify({ provider: 'typecast' }));
  assert.equal(run().voice.voice_id, 'tc_cfg1');
});

test('CLI: npm run defaults 표와 check', (t) => {
  const repo = fixture(t);
  const run = (...args) => spawnSync(process.execPath, [join(REPO, 'scripts', 'defaults.mjs'), ...args, '--repo', repo], { encoding: 'utf8', env: noEnv });
  const shown = run();
  assert.equal(shown.status, 0, shown.stderr);
  assert.match(shown.stdout, /\| 기본 보이스 \| Sanghyun/);
  assert.equal(run('check').status, 0);
  const voice = run('voice', '--voice-id', 'tc_cli1', '--tempo', '1.05');
  assert.equal(voice.status, 0, voice.stderr);
  assert.match(voice.stdout, /소급되지 않는다/);
});

const git = (repo, ...args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
const gitFixture = (t) => {
  const repo = fixture(t);
  cpSync(join(REPO, '.gitignore'), join(repo, '.gitignore'));
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.name', '테스트');
  git(repo, 'config', 'user.email', 'test@example.invalid');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');
  return repo;
};
const cliIn = (repo, ...args) => spawnSync(process.execPath, [join(REPO, 'scripts', 'defaults.mjs'), ...args, '--repo', repo], { encoding: 'utf8', env: noEnv });

test('설정 변경은 그 파일만 main에 자동 커밋한다 (보이스·프롬프트·프로필)', (t) => {
  const repo = gitFixture(t);
  writeFileSync(join(repo, '작업 중 메모.txt'), '다른 변경');
  const voice = cliIn(repo, 'voice', '--voice-id', 'tc_commit1', '--voice-name', '민수');
  assert.equal(voice.status, 0, voice.stderr);
  assert.match(voice.stdout, /커밋: [0-9a-f]+ "기본값: 새 편 보이스 민수/);
  assert.equal(git(repo, 'show', '--name-only', '--format=', 'HEAD').stdout.trim(), 'config/production-defaults.json');
  assert.ok(git(repo, 'ls-files', '--others', '-z').stdout.split('\0').includes('작업 중 메모.txt'));

  appendFileSync(join(repo, PROMPT), '\n추가 원칙.\n');
  const bump = cliIn(repo, 'prompt-bump', '--note', '추가 원칙');
  assert.equal(bump.status, 0, bump.stderr);
  const files = git(repo, 'show', '--name-only', '--format=', 'HEAD').stdout.trim().split('\n').sort();
  assert.equal(files.length, 4);
  assert.ok(files.includes('config/production-prompts/registry.json') && files.includes(PROMPT));

  assert.equal(cliIn(repo, 'profile-archive').status, 0);
  const profile = read(repo, 'config/production-profile.json');
  writeFileSync(join(repo, 'config/production-profile.json'), JSON.stringify({ ...profile, caption: { ...profile.caption, top: profile.caption.top - 20 } }, null, 2) + '\n');
  const pb = cliIn(repo, 'profile-bump', '9.1.0');
  assert.equal(pb.status, 0, pb.stderr);
  assert.match(git(repo, 'log', '-1', '--format=%s').stdout, /기본값: 자막 프로필 9\.1\.0/);
  assert.equal(git(repo, 'status', '--short', '--', 'config').stdout, '');
});

test('다른 staged 변경이 있으면 자동 커밋을 멈추고 파일 변경은 남긴다', (t) => {
  const repo = gitFixture(t);
  writeFileSync(join(repo, 'a.txt'), 'x');
  git(repo, 'add', 'a.txt');
  const r = cliIn(repo, 'voice', '--tempo', '1.1');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /커밋하지 않음: 자동 커밋 중단: 이미 커밋 대기/);
  assert.equal(read(repo, 'config/production-defaults.json').narration.voice.audio_tempo, 1.1);
  assert.equal(git(repo, 'log', '--format=%s').stdout.trim(), 'init');
  const skip = cliIn(repo, 'voice', '--tempo', '1.2', '--no-commit');
  assert.match(skip.stdout, /커밋하지 않음: --no-commit/);
});
