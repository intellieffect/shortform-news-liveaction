#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO, assertPilotId } from './lib/pilot.mjs';
import { sharedSelection, sharedIds, localIds, setLocalIds } from './lib/episode-selection.mjs';
import { episodeForPath, safeRelative, forbiddenPath, sharingErrors, stagedTree } from './lib/sharing.mjs';
const [scope, action, id, ...rest] = process.argv.slice(2);
try {
  if (!scope || scope === 'list') {
    const shared = new Set(sharedIds(REPO)), local = new Set(localIds(REPO));
    const available = readdirSync(join(REPO, 'pilots'), { withFileTypes: true }).filter(d=>d.isDirectory() && existsSync(join(REPO,'pilots',d.name,'pilot.json'))).map(d=>({id:d.name, shared:shared.has(d.name), local_active:local.has(d.name)}));
    console.log(JSON.stringify(available,null,2));
  } else if (scope === 'local' && ['add','remove'].includes(action)) {
    assertPilotId(id);
    if (action==='add' && !existsSync(join(REPO,'pilots',id,'pilot.json'))) throw new Error('편 데이터가 없다. 제작 중이면 sync 후 등록한다');
    const before = localIds(REPO);
    setLocalIds(REPO, action==='add' ? [...new Set([...before,id])] : before.filter(x=>x!==id));
    try { execFileSync(process.execPath,[join(REPO,'scripts/pilots-index.mjs')],{cwd:REPO,stdio:'inherit'}); }
    catch(error) { setLocalIds(REPO,before); throw error; }
    console.log('로컬 활성 목록만 변경했다. 공유 선정 목록은 유지한다.');
  } else if (scope === 'share' && action === 'add') {
    assertPilotId(id);
    const key=rest.indexOf('--files');if(key<0||!rest[key+1])throw new Error('--files <정확한 저장소 상대 파일 배열 JSON>이 필요하다');
    const files=JSON.parse(readFileSync(resolve(rest[key+1]),'utf8'));
    if(!Array.isArray(files)||!files.length||files.some(p=>!safeRelative(p)||episodeForPath(p)!==id||forbiddenPath(p)))throw new Error('선정 편의 안전한 파일 목록만 허용한다');
    for (const file of files) {
      let part = REPO;
      for (const segment of file.split('/')) { part=join(part,segment); if(lstatSync(part).isSymbolicLink()) throw new Error('선정 파일 경로에 symlink가 있다: '+file); }
      if(!lstatSync(part).isFile()) throw new Error('선정 파일이 실제 파일이 아니다: '+file);
    }
    const selection=sharedSelection(REPO), previous=selection.episodes.find(ep=>ep.id===id);
    const merged=[...new Set([...(previous?.files??[]),...files])].sort();
    selection.episodes=selection.episodes.filter(ep=>ep.id!==id).concat({id,files:merged});
    const tree=stagedTree(REPO), names=new Set(tree.entries.map(x=>x.path));
    for(const path of merged) if(!names.has(path))tree.entries.push({path,mode:'100644',stage:'0'});
    const errors=sharingErrors(tree.entries,p=>p==='config/shared-episodes.json'?JSON.stringify(selection):merged.includes(p)?readFileSync(join(REPO,p),'utf8'):tree.read(p));
    if(errors.length)throw new Error(errors.join('\n'));
    writeFileSync(join(REPO,'config/shared-episodes.json'),JSON.stringify(selection,null,2)+'\n');
    execFileSync('git',['-C',REPO,'add','-f','--pathspec-from-file=-','--pathspec-file-nul'],{input:['config/shared-episodes.json',...merged].join('\0')+'\0'});
    execFileSync(process.execPath,[join(REPO,'scripts/check-sharing.mjs')],{cwd:REPO,stdio:'inherit'});
    console.log('선정 편만 staged 상태로 추가했다. diff 검토와 clean checkout 검증 후 일반 commit/push한다.');
  } else throw new Error('usage: episodes [list | local add/remove <id> | share add <id> --files <JSON>]');
} catch(error) { console.error(error.message); process.exitCode=1; }
