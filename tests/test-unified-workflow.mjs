import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { REPO } from '../scripts/lib/pilot.mjs';
import { activeIds, sharedIds, localIds, addLocalId } from '../scripts/lib/episode-selection.mjs';
import { startProduction } from '../scripts/lib/production/start.mjs';
import { productionStatus, productionRenderErrors } from '../scripts/lib/production/state.mjs';
import { recipe, workspace } from '../scripts/lib/production/contracts.mjs';
import { stagedTree, sharingErrors } from '../scripts/lib/sharing.mjs';
const put=(file,body)=>{mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,typeof body==='string'?body:JSON.stringify(body,null,2)+'\n');};
const temp=t=>{const r=mkdtempSync(join(tmpdir(),'shortform-unified-'));t.after(()=>rmSync(r,{recursive:true,force:true}));return r;};
const fixture=t=>{const r=temp(t);for(const dir of ['scripts','config','plugin','presets'])cpSync(join(REPO,dir),join(r,dir),{recursive:true});put(join(r,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt'),readFileSync(join(REPO,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt'),'utf8'));cpSync(join(REPO,'package.json'),join(r,'package.json'));return r;};
const request={id:'short_request',url:'https://example.invalid/article',duration:[60,90],request:'이 기사로 숏폼 만들어봐. https://example.invalid/article'};

test('짧은 요청은 원문 그대로, 실제 V2 원본과 URL 적용본은 자동 동결',t=>{
 const repo=fixture(t);const s=startProduction({...request,repo});
 const original=readFileSync(join(REPO,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt'),'utf8');
 assert.equal(s.context.raw_request,request.request);assert.equal(s.context.production_prompt.status,'preserved');
 assert.equal(s.context.production_prompt.template_text,original);assert.equal(s.context.production_prompt.text,original.replace('[기사 URL]',request.url));
 put(join(repo,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt'),'전역 변경 [기사 URL]');
 const again=productionStatus(request.id,{repo,includeContext:true});assert.equal(again.context.production_prompt.text,s.context.production_prompt.text);
 rmSync(join(repo,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt'));
 assert.equal(productionStatus(request.id,{repo,includeContext:true}).context.production_prompt.status,'preserved');
 assert.throws(()=>startProduction({...request,id:'missing',repo}),/ENOENT/);assert.equal(existsSync(join(repo,'news/missing')),false);
});
test('V2 치환 불가·저장본 변조·누락을 탐지하고 구형 편에 소급하지 않음',t=>{
 const repo=fixture(t);startProduction({...request,repo});
 const applied=join(repo,'news/short_request/00_brief/production-prompt-applied.txt');put(applied,'변조');
 assert.equal(productionStatus(request.id,{repo,includeContext:true}).context.production_prompt.status,'invalid');
 assert.ok(productionRenderErrors(request.id,{repo}).some(x=>x.includes('production-prompt')));
 rmSync(applied);assert.equal(productionStatus(request.id,{repo,includeContext:true}).context.production_prompt.status,'invalid');
 const path=join(repo,'news/short_request/00_brief/request.json');const raw=JSON.parse(readFileSync(path));delete raw.production_prompt;put(path,raw);
 assert.equal(productionStatus(request.id,{repo,includeContext:true}).context.production_prompt.status,'legacy-unrecorded');
 put(join(repo,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt'),'URL 없음');assert.throws(()=>startProduction({...request,id:'invalid',repo}),/치환/);assert.equal(existsSync(join(repo,'news/invalid')),false);
});
test('로컬 편 등록과 생성 인덱스는 공유 목록을 바꾸지 않고 clean 환경은 공유 편만 사용',t=>{
 const repo=fixture(t);const config=join(repo,'config/shared-episodes.json');put(config,{schema:'shared-episodes@1',episodes:[{id:'shared',files:[]}]});const original=readFileSync(config,'utf8');
 for(const id of ['shared','local']){put(join(repo,'pilots',id,'pilot.json'),{engine:'editorial-concept@1'});for(const n of ['timeline','narration','story','concepts','visual-system','audio'])put(join(repo,'pilots',id,n+'.json'),{});put(join(repo,'src/editorial/episodes',id+'.tsx'),'export const EditorialEpisode = () => null;');}
 addLocalId(repo,'local');assert.deepEqual(activeIds(repo,false),['shared','local']);assert.deepEqual(activeIds(repo,true),['shared']);assert.equal(readFileSync(config,'utf8'),original);
 execFileSync(process.execPath,[join(repo,'scripts/pilots-index.mjs')],{env:{...process.env,SHORTFORM_SHARED_ONLY:'0'}});
 assert.match(readFileSync(join(repo,'pilots/index.ts'),'utf8'),/episodes\/local/);
 execFileSync(process.execPath,[join(repo,'scripts/pilots-index.mjs')],{env:{...process.env,SHORTFORM_SHARED_ONLY:'1'}});
 assert.doesNotMatch(readFileSync(join(repo,'pilots/index.ts'),'utf8'),/episodes\/local/);
 assert.deepEqual(localIds(repo),['local']);assert.deepEqual(sharedIds(repo),['shared']);
});
test('다른 편 추가·수정은 렌더 의존성에서 제외, 명시적으로 import한 공통 코드 포함',t=>{
 const repo=fixture(t);startProduction({...request,repo});put(join(repo,'src/index.ts'),"import './Root';");put(join(repo,'src/Root.tsx'),"import '../pilots/index'; import './lib/shared';");put(join(repo,'src/lib/shared.ts'),'export const x=1;');put(join(repo,'pilots/index.ts'),'');put(join(repo,'src/editorial/episodes/short_request.tsx'),'export const x=1;');
 const before=recipe(workspace(request.id,repo),'render').inputs;
 put(join(repo,'src/editorial/episodes/unrelated.tsx'),'bad syntax');put(join(repo,'src/experiments/old.tsx'),'bad syntax');put(join(repo,'pilots/index.ts'),'changed generated registry');
 assert.deepEqual(recipe(workspace(request.id,repo),'render').inputs,before);assert.ok(before.some(x=>x.endsWith('src/lib/shared.ts')));assert.ok(before.some(x=>x.endsWith('episodes/short_request.tsx')));assert.ok(!before.some(x=>x.endsWith('pilots/index.ts')));
});
test('공유 검사는 실제 staged 트리를 검사하며 미선정 편·로컬 목록·누락 자산 거절',()=>{
 const tree=stagedTree(REPO);const selection=JSON.parse(readFileSync(join(REPO,'config/shared-episodes.json')));
 // 실제 N44 fixture는 index와 작업트리의 기존 파일을 사용한다. 신규 config만 주입한다.
 const blocked=new Set(['CUSTOMER-MANIFEST.json','pilots/active.json','pilots/index.ts','pilots/index.json','docs/PILOTS.md']);
 const entries=tree.entries.filter(x=>!blocked.has(x.path));if(!entries.some(x=>x.path==='config/shared-episodes.json'))entries.push({path:'config/shared-episodes.json',mode:'100644',stage:'0'});
 const read=p=>p==='config/shared-episodes.json'?JSON.stringify(selection):p.startsWith('references/')?tree.read(p):readFileSync(join(REPO,p),'utf8');
 assert.deepEqual(sharingErrors(entries,read),[]);
 assert.ok(sharingErrors([...entries,{path:'news/private_episode/02_production/story.json',mode:'100644'}],read).some(x=>x.includes('미선정')));
 assert.ok(sharingErrors([...entries,{path:'pilots/local.json',mode:'100644'}],read).some(x=>x.includes('로컬 전용')));
 const media='news/hani_superbubble_n44_restored_v2/02_production/media/pan-silent.mp4';
 assert.ok(sharingErrors(entries.filter(x=>x.path!==media),read).some(x=>x.includes(media)));
});

test('push 검사에서 옛 개발 이력을 LFS 업로드 전에 거절',()=>{
 const result=spawnSync(process.execPath,[join(REPO,'scripts/pre-push.mjs'),'origin','unused'],{cwd:REPO,input:'refs/heads/old a4dd8ceb159fd04d60cb6cc513d4cbc6d4f6b660 refs/heads/main 0000000000000000000000000000000000000000\n',encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/공유 이력 밖/);
});


test('최종 트리에서 삭제한 미선정 자료도 중간 커밋에 있으면 push 거절',t=>{
 const repo=temp(t);
 execFileSync('git',['clone','--shared','--no-checkout',REPO,repo],{stdio:'pipe'});
 const git=(args,input)=>execFileSync('git',['-C',repo,...args],{input,encoding:'utf8',env:{...process.env,GIT_AUTHOR_NAME:'Test',GIT_AUTHOR_EMAIL:'test@example.invalid',GIT_COMMITTER_NAME:'Test',GIT_COMMITTER_EMAIL:'test@example.invalid'}}).trim();
 const base=git(['rev-parse','HEAD']);git(['read-tree',base]);
 const blob=git(['hash-object','-w','--stdin'],'private fixture');
 git(['update-index','--add','--cacheinfo','100644',blob,'news/private_episode/02_production/story.json']);
 const bad=git(['commit-tree',git(['write-tree']),'-p',base,'-m','private intermediate']);
 const tip=git(['commit-tree',git(['rev-parse',base+'^{tree}']),'-p',bad,'-m','removed at tip']);
 const result=spawnSync(process.execPath,[join(REPO,'scripts/pre-push.mjs'),'origin','unused'],{cwd:repo,input:`refs/heads/test ${tip} refs/heads/main ${base}\n`,encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/미선정/);
});
