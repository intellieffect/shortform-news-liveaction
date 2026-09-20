import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';

export const episodeForPath = (path) => {
  const m = path.match(/^(?:news|pilots)\/([a-z0-9_]+)\//) || path.match(/^(?:public|out)\/pilots\/([a-z0-9_]+)\//) || path.match(/^design\/thumbnails\/([a-z0-9_]+)\//) || path.match(/^src\/editorial\/episodes\/([a-z0-9_]+)(?:\.tsx$|\/)/);
  return m?.[1] ?? null;
};
export const safeRelative = (p) => typeof p === 'string' && p && !p.startsWith('/') && !p.includes('\\') && !p.split('/').some(v => v === '..' || v === '.' || v === '') && !p.includes('\0');
export const forbiddenPath = p => /^(?:\.env(?:\.|$)|node_modules(?:\/|$)|internal\/|out\/(?!pilots\/)|experiments\/|src\/experiments\/|docs\/research\/|reference-library\/|\.claude\/worktrees\/|\.claude\/settings.local.json$|\.codex\/config.toml$|\.mcp.json$|pilots\/(?:local.json|active.json|index.ts|index.json)$|docs\/PILOTS.md$|CUSTOMER-MANIFEST.json$|distribution\/customer\/templates\/)/.test(p);
export const stagedTree = (repo, ref = null) => {
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const entries = (ref ? git('ls-tree', '-r', '-z', ref) : git('ls-files', '--stage', '-z')).split('\0').filter(Boolean).map(line => {
    const [meta, path] = line.split('\t'); const parts = meta.split(' ');
    return { mode: parts[0], oid: ref ? parts[2] : parts[1], stage: ref ? '0' : parts[2], path };
  });
  return { entries, read: p => git('show', (ref ?? '') + ':' + p) };
};
export const sharingErrors = (entries, read) => {
  const errors = []; const add = text => errors.push(text);
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
    if (/\.(?:json|md|txt|ya?ml|env)$/.test(p)) {
      let content; try { content = read(p); } catch { add('staged 파일 읽기 실패: ' + p); continue; }
      if (/(?:sk-(?:proj-|ant-)[A-Za-z0-9_-]{32,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content)) add('비밀값 패턴 확인 필요: ' + p);
    }
    if (entry.mode === '160000') add('외부 저장소 의존 금지: ' + p);
    if (id && entry.mode === '120000') add('공유 편 symlink 금지: ' + p);
  }
  // 실제 source의 상대 import가 미선정 로컬 파일에 의존하지 않도록 index에서 검증한다.
  for (const p of files) if (p.startsWith('src/') && /\.(?:tsx?|mjs|js)$/.test(p)) {
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
