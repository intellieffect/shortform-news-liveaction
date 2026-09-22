import {referenceSharingErrors} from './visual-reference-sharing.mjs';
import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';

export const episodeForPath = (path) => {
  const m = path.match(/^(?:news|pilots)\/([a-z0-9_]+)\//) || path.match(/^(?:public|out)\/pilots\/([a-z0-9_]+)\//) || path.match(/^design\/thumbnails\/([a-z0-9_]+)\//) || path.match(/^src\/editorial\/episodes\/([a-z0-9_]+)(?:\.tsx$|\/)/);
  return m?.[1] ?? null;
};
export const safeRelative = (p) => typeof p === 'string' && p && !p.startsWith('/') && !p.includes('\\') && !p.split('/').some(v => v === '..' || v === '.' || v === '') && !p.includes('\0');
// `.env.example` 은 값이 아니라 키 이름 목록이라 함께 보낸다 (.gitignore 도 예외로 둔다).
export const forbiddenPath = p => /^(?:\.env(?:$|\.(?!example$))|node_modules(?:\/|$)|internal\/|public\/references\/|out\/(?!pilots\/)|experiments\/|src\/experiments\/|docs\/research\/|reference-library\/|\.claude\/worktrees\/|\.claude\/settings.local.json$|\.codex\/config.toml$|\.mcp.json$|pilots\/(?:local.json|active.json|index.ts|index.json)$|docs\/PILOTS.md$|CUSTOMER-MANIFEST.json$|distribution\/customer\/templates\/)/.test(p);
// 개발자 한 사람의 컴퓨터에서만 성립하는 것이 납품 트리에 실리지 않게 한다.
// 값이 아니라 «접근 방법»을 막는 검사다 — 비밀값 패턴 검사는 따로 있다.
const LOCAL_ONLY_RULES = [
  // 연락처는 한 번 나가면 지울 수 없으므로 새 중간 커밋에서도 본다(`always`).
  { id: 'contact', always: true, re: /@intellieffect\.com/, why: '내부 연락처가 외부 요청에 실린다 — SHORTFORM_CONTACT 를 쓴다' },
  { id: 'browser', re: /\baside repl\b/i, why: '개발자 로컬 브라우저 도구를 지시한다 — 호스트에 연결된 도구를 확인하게 쓴다' },
  { id: 'path', re: /~\/(?:Projects|dev)\//, why: '개발자 컴퓨터의 절대경로다 — 저장소 상대경로로 쓴다' },
  // [-] 는 이 규칙 정의 자체가 자기 패턴에 걸리지 않게 하려고 쓴다. 찾는 것은 실제 호출이다.
  { id: 'keychain', re: /security find-generic[-]password/, why: 'macOS 키체인 전용 비밀키 읽기다 — 환경변수·.env 로 읽고 키체인은 darwin 폴백으로만 쓴다' },
];
// 옛 경로를 «지금 쓰라»가 아니라 «전에는 그랬다»로 인용하는 줄은 지시가 아니다.
// 경로에만 적용한다 — 키체인 호출과 내부 연락처는 어떤 설명을 붙여도 실리면 안 된다.
const OBSOLETE_MARKER = /전에는|폐기|옛 /;
export const localOnlyErrors = (p, text, { scope = 'all' } = {}) => {
  const out = new Set();
  const darwinGuarded = /sys\.platform\s*==\s*["']darwin["']|process\.platform\s*===\s*["']darwin["']/.test(text);
  for (const line of text.split('\n')) {
    for (const { id, re, why, always } of LOCAL_ONLY_RULES) {
      if (scope === 'pushed') continue;
      if (scope === 'new' && !always) continue;
      if (!re.test(line)) continue;
      if (id === 'keychain' && darwinGuarded) continue;
      if (id === 'path' && OBSOLETE_MARKER.test(line)) continue;
      out.add('로컬 전용 의존: ' + p + ' — ' + why);
    }
  }
  return [...out];
};
export const stagedTree = (repo, ref = null) => {
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const entries = (ref ? git('ls-tree', '-r', '-z', ref) : git('ls-files', '--stage', '-z')).split('\0').filter(Boolean).map(line => {
    const [meta, path] = line.split('\t'); const parts = meta.split(' ');
    return { mode: parts[0], oid: ref ? parts[2] : parts[1], stage: ref ? '0' : parts[2], path };
  });
  return { entries, read: p => git('show', (ref ?? '') + ':' + p) };
};
/**
 * `scope` 는 이 커밋이 검사에서 어디까지 받는지 정한다.
 *   'all'    — push 되는 끝 트리. 고객이 checkout 할 내용이므로 전부 본다.
 *   'new'    — 아직 어느 원격에도 없는 중간 커밋. 되돌릴 수 없는 것(`always` 규칙)만 본다.
 *   'pushed' — 이미 원격에 있는 커밋. 지금 와서 고칠 수 없으니 걸지 않는다.
 * 이 구분이 없으면 지난 이력 때문에 앞으로의 push 가 영영 막힌다.
 * 미선정 자료 혼입은 별개다 — 중간 커밋도 원격에 전달되므로 `scope` 와 무관하게 늘 본다.
 */
export const sharingErrors = (entries, read, { scope = 'all' } = {}) => {
  const errors = referenceSharingErrors(entries,read); const add = text => errors.push(text);
  const files = new Set(entries.map(x => x.path));
  let selection;
  try { selection = JSON.parse(read('config/shared-episodes.json')); } catch { return ['staged 공유 선정 목록을 읽을 수 없다']; }
  if (selection.schema !== 'shared-episodes@1' || !Array.isArray(selection.episodes)) return ['공유 선정 목록 형식 오류'];
  const allowed = new Map();
  for (const ep of selection.episodes) {
    if (!/^[a-z0-9_]+$/.test(ep.id) || allowed.has(ep.id) || !Array.isArray(ep.files)) { add('공유 편 ID/파일 목록 오류'); continue; }
    const set = new Set(ep.files); allowed.set(ep.id, set);
    if (set.size !== ep.files.length) add(ep.id + ': 중복 파일');
    for (const p of set) {
      if (!safeRelative(p) || episodeForPath(p) !== ep.id || forbiddenPath(p)) add('편 경계 밖 선정 파일: ' + p);
      if (!files.has(p)) add('선정 파일이 staged 트리에 없다: ' + p);
    }
  }
  for (const entry of entries) {
    const p = entry.path, id = episodeForPath(p);
    if (entry.stage && entry.stage !== '0') add('미해결 Git 충돌: ' + p);
    if (forbiddenPath(p)) add('로컬 전용 파일 혼입: ' + p);
    if (id && !allowed.get(id)?.has(p)) add('미선정 편/파일 혼입: ' + p);
    if (id && /(?:hf-account|hf-transactions|doctor\.json|execution-conditions|\.jsonl$)/.test(p)) add('내부 계정/세션 기록 혼입: ' + p);
    // `.env.example` 은 확장자 규칙에서 빠지므로 이름으로 더한다 — 새로 허용한 유일한 경로다.
    if (/\.(?:json|md|txt|ya?ml|env|py|mjs|cjs|jsx?|tsx?|sh)$/.test(p) || p === '.env.example') {
      let content; try { content = read(p); } catch { add('staged 파일 읽기 실패: ' + p); continue; }
      if (/(?:sk-(?:proj-|ant-)[A-Za-z0-9_-]{32,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content)) add('비밀값 패턴 확인 필요: ' + p);
      for (const e of localOnlyErrors(p, content, { scope })) add(e);
    }
    if (entry.mode === '160000') add('외부 저장소 의존 금지: ' + p);
    if (id && entry.mode === '120000') add('공유 편 symlink 금지: ' + p);
  }
  // 실제 source의 상대 import가 미선정 로컬 파일에 의존하지 않도록 index에서 검증한다.
  for (const p of files) if ((p.startsWith('src/') || p.startsWith('references/')) && /\.(?:tsx?|mjs|js)$/.test(p)) {
    let text; try { text=read(p); } catch { add('소스 읽기 실패: '+p); continue; }
    for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)) {
      const base=posix.normalize(posix.join(posix.dirname(p),match[1]));
      if(base==='pilots/index')continue;
      if(!safeRelative(base) || !['','.ts','.tsx','.mjs','.js','.json','.css','/index.ts','/index.tsx'].some(ext=>files.has(base+ext)))add('staged 소스 의존성 누락: '+p+' → '+match[1]);
    }
  }
  const requirePath = p => { if (!safeRelative(p) || !files.has(p)) add('공유 의존 파일 누락: ' + p); };
  const load = p => { requirePath(p); try { return JSON.parse(read(p)); } catch { add('JSON 읽기 실패: ' + p); return {}; } };
  for (const id of allowed.keys()) {
    const n = 'news/' + id + '/', p = 'pilots/' + id + '/', pub = 'public/pilots/' + id + '/';
    const pilot = load(p + 'pilot.json');
    if (pilot.engine !== 'editorial-concept@1') { add(id + ': 공유 추가는 현재 editorial-concept 계약만 지원'); continue; }
    requirePath('src/editorial/episodes/' + id + '.tsx');
    for (const name of ['story','concepts','motion','timeline','visual-system','narration','audio']) { requirePath(n+'02_production/'+name+'.json'); requirePath(p+name+'.json'); }
    const request = load(n+'00_brief/request.json'); requirePath(n+(request.raw_request || '00_brief/user-request.txt'));
    if (request.visual_references) requirePath(n+request.visual_references.path);
    if (request.production_prompt) for (const k of ['template','applied']) requirePath(n+request.production_prompt[k]);
    const v = load(p+'visual-system.json'), a = load(p+'audio.json'), t = load(p+'motion.json'), narration = load(p+'narration.json');
    for (const x of v.media?.assets ?? []) { requirePath(n+x.source); requirePath(pub+x.file); }
    if (narration.audio?.path) requirePath(n+narration.audio.path);
    for (const x of Object.values(narration.source ?? {})) if (typeof x === 'string' && x.includes('/')) requirePath(n+x);
    const audio = [a.narration?.file, a.bgm?.file, ...(a.sfx??[]).map(x=>x.file), ...(t.audio_cues??[]).map(x=>x.asset)].filter(Boolean);
    for (const f of audio) {
      requirePath(pub+f);
      if (f===a.narration?.file) continue;
      const name = posix.basename(f);
      const candidates = ['', 'script_v1'].flatMap(sub => ['derived','bgm','sfx',''].map(dir=>posix.join(n,'02_production/external_assets',sub,'audio',dir,name)));
      if (!candidates.some(c=>files.has(c))) add('sync 음향 원본 누락: '+f);
    }
    for (const x of pilot.thumbnails?.candidates ?? []) requirePath(x.file);
    if (pilot.thumbnails?.manifest) requirePath(pilot.thumbnails.manifest);
    for (const x of pilot.versions??[]) if(x.file) requirePath(x.file);
  }
  return [...new Set(errors)];
};
