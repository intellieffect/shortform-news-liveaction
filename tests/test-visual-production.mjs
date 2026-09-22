import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, realpathSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {VISUAL_CONTRACT, validateVisualPlan, screenTextInventory} from '../scripts/lib/visual-plan.mjs';
import {startProduction} from '../scripts/lib/production/start.mjs';
import {beginProductionAction, finishProductionAction, productionStatus, productionReviewInput, adoptNarration} from '../scripts/lib/production/state.mjs';
import {hash} from '../scripts/lib/production/contracts.mjs';
import {workspace} from '../scripts/lib/production/contracts.mjs';
import {validateExplanationReview, visualWork} from '../scripts/lib/production/visual-work.mjs';
import {auditScreenText} from '../scripts/lib/screen-text-audit.mjs';
const project = new URL('../', import.meta.url).pathname;
const put = (root, p, v) => {mkdirSync(dirname(join(root, p)), {recursive:true});writeFileSync(join(root, p), typeof v === 'string' ? v : JSON.stringify(v));};
const plan = () => ({schema_version:'1.0', pilot:'fresh', concepts:[{id:'pull', narration_lines:['s01'], elements:[{id:'name', kind:'text', role:'necessary-label', text:'대상'}], visual:{purpose:'explain', focus:'같은 대상의 변화', moments:[{id:'turn', narration_lines:['s01'], subject:'길쭉한 물질', action:'양끝을 다르게 당김', result:'같은 물질이 돌아감', motion_required:true}], realization:{method:'code', asset_ids:[], job_ids:[], code_role:'관계와 방향 제어'}}}]});
function fixture(t) {
 const repo=realpathSync(mkdtempSync(join(tmpdir(),'visual-production-')));
 t.after(()=>rmSync(repo,{recursive:true,force:true}));
 for(const dir of ['scripts','config','plugin','presets']) cpSync(join(project,dir),join(repo,dir),{recursive:true});
 cpSync(join(project,'package.json'),join(repo,'package.json'));
 put(repo,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt',readFileSync(join(project,'docs/PRODUCTION_PROMPT_V2_RESTORED.txt'),'utf8'));
 const start=startProduction({id:'fresh',repo,url:'https://example.invalid/article',duration:[60,90],request:'이 기사로 숏폼 만들어줘. https://example.invalid/article'});
 const prefix='news/fresh/02_production/';
 put(repo,prefix+'concepts.json',plan());put(repo,prefix+'narration.txt','양끝을 다르게 당기면 돌아갑니다.');
 return {repo,start,prefix,w:workspace('fresh',repo)};
}
function proof(f, name, phase='still') {
 const art=`out/pilots/fresh/qa/${name}.${phase==='still'?'png':'mp4'}`, report=`out/pilots/fresh/qa/${name}.json`;
 const attempt=beginProductionAction('fresh','scene_proof',{repo:f.repo,outputs:[art,report]});
 mkdirSync(dirname(join(f.repo,art)),{recursive:true});
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=108x192:r=30',...(phase==='still'?['-frames:v','1']:['-t','1','-c:v','libx264','-pix_fmt','yuv420p']),join(f.repo,art)]);
 const data={schema:'scene-proof@1',concept_id:'pull',phase,scope:'composite',artifact:art,verdict:'usable',observation:'test fixture observation; not actual video quality',tool:'test',...(phase==='motion'?{continuous_viewing:true,viewed_seconds:[0,1]}:{})};
 put(f.repo,report,data);return {attempt,art,report,data};
}
test('new start exposes visual work with no topic hints; legacy remains unchanged',t=>{
 const f=fixture(t);assert.equal(f.start.context.request.visual_contract,VISUAL_CONTRACT);
 assert.equal(f.start.context.work.visual.status,'invalid');
 assert.ok(f.start.context.instructions.some(p=>p.endsWith('visual-production.md')));
 const v=JSON.parse(readFileSync(join(f.repo,f.prefix+'visual-system.json')));
 assert.equal(validateVisualPlan({concepts:plan(),visualSystem:v}).errors.length,0);
 assert.equal(validateVisualPlan({concepts:{},visualSystem:{}}).active,false);
 assert.ok(validateVisualPlan({concepts:plan(),visualSystem:{},required:true}).errors.some(e=>e.code==='visual-contract'));
});
test('missing action, unrelated narration, missing text, and unlinked generation fail technically',()=>{
 const concepts=plan(),visualSystem={visual_contract:VISUAL_CONTRACT,media:{assets:[]},generation_jobs:[]};
 concepts.concepts[0].visual.moments[0].action='';concepts.concepts[0].visual.moments[0].narration_lines=['wrong'];
 delete concepts.concepts[0].elements[0].text;concepts.concepts[0].visual.realization.method='generated';
 const codes=validateVisualPlan({concepts,visualSystem}).errors.map(e=>e.code);
 for(const code of ['visual-moment','visual-moment-lines','screen-text-content','visual-generation-plan']) assert.ok(codes.includes(code));
});
test('early composite proof works before narration/timeline; experience stays blind; code edits stale it',t=>{
 const f=fixture(t),p=proof(f,'early');finishProductionAction('fresh',p.attempt.id,{repo:f.repo});
 let s=productionStatus('fresh',{repo:f.repo,includeContext:true});
 assert.equal(s.actions.narration.status,'unrecorded');assert.equal(s.actions.scene_proof.status,'current');
 assert.equal(s.context.work.visual.scene_proofs[0].status,'current');
 assert.ok(s.context.work.visual.tasks.some(t=>t.phase==='motion'));
 const exp=productionReviewInput('fresh',{repo:f.repo,source:'scene',phase:'experience'});
 assert.equal(exp.context,undefined);assert.equal(exp.files[0].media.kind,'image');
 const intent=productionReviewInput('fresh',{repo:f.repo,source:'scene',phase:'intent'});
 assert.equal(intent.context.visual.review_targets[0].action,'양끝을 다르게 당김');
 put(f.repo,'src/editorial/episodes/fresh.tsx','export const Scene = () => <div>추가 설명</div>;');
 s=productionStatus('fresh',{repo:f.repo,includeContext:true});
 assert.equal(s.actions.scene_proof.status,'stale');
 // Existing-file changes are tracked; new imported/source entry is a new input too.
 assert.equal(s.context.work.visual.scene_proofs[0].status,'stale');
});
test('input mutation during proof and output mutation after proof cannot remain current',t=>{
 const f=fixture(t),p=proof(f,'changed');put(f.repo,f.prefix+'narration.txt','다른 원고');
 assert.throws(()=>finishProductionAction('fresh',p.attempt.id,{repo:f.repo}),/바뀌었다/);
});
test('a PNG cannot satisfy a motion claim; genuine clip can be recorded separately',t=>{
 const f=fixture(t),p=proof(f,'false-motion');p.data.phase='motion';put(f.repo,p.report,p.data);
 assert.throws(()=>finishProductionAction('fresh',p.attempt.id,{repo:f.repo}),/정지 이미지/);
});
test('motion proof registers actual media and later tampering is stale',t=>{
 const f=fixture(t),p=proof(f,'motion','motion');finishProductionAction('fresh',p.attempt.id,{repo:f.repo});
 assert.equal(productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.visual.scene_proofs[0].phase,'motion');
 writeFileSync(join(f.repo,p.art),'changed');
 assert.equal(productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.visual.scene_proofs[0].status,'stale');
});
test('generation status is linked to actual adopted asset and missing original is surfaced',t=>{
 const f=fixture(t),v=JSON.parse(readFileSync(join(f.repo,f.prefix+'visual-system.json'))),c=plan();
 c.concepts[0].visual.realization={method:'generated',asset_ids:[],job_ids:['flow'],generated_role:'물질의 변형 전체'};
 v.generation_jobs=[{id:'flow',kind:'overlay-video',purpose:'밀려나는 움직임',status:'planned'}];
 put(f.repo,f.prefix+'concepts.json',c);put(f.repo,f.prefix+'visual-system.json',v);
 assert.ok(visualWork(f.w).tasks.some(t=>t.kind==='generation'&&t.status==='planned'));
 v.generation_jobs[0]={...v.generation_jobs[0],status:'accepted',provider:'Higgsfield',model:'test-model',prompt_path:'02_production/prompt.txt',output:'02_production/flow.mp4',observation:'동작 확인'};
 assert.ok(validateVisualPlan({concepts:c,visualSystem:v}).errors.some(e=>e.code==='generation-adoption'));
 v.media.assets.push({id:'flow',source:'02_production/flow-keyed.mp4',file:'editorial/flow.mp4',generation_job:'flow'});
 put(f.repo,f.prefix+'visual-system.json',v);
 assert.ok(visualWork(f.w).tasks.find(t=>t.kind==='generation').errors.includes('missing output'));
});
test('text inventory compares caption overlap and AST flags literal bypass without counting labels as quality',t=>{
 const f=fixture(t),inv=screenTextInventory(plan(),{fps:30,events:[{element_id:'name',from:0,end:30}]},{lines:[{start:0,end:1,text:'같은 대상'}]});
 assert.equal(inv[0].repeated_in_caption,true);
 put(f.repo,'src/editorial/episodes/fresh.tsx','const Scene = () => <div>추가 설명<span>{"다시 쓴 설명"}</span></div>;');
 const audit=auditScreenText(f.repo,'fresh',inv);assert.equal(audit.warnings.length,2);
});
test('final explanation pass requires observation and actual motion coverage, not code inference',t=>{
 const f=fixture(t),timeline={concepts:[{id:'pull',from:0,end:30}]};
 const report={verdict:'pass',text_review:{verdict:'pass',observation:'자막과 추가 문구 실물 확인',evidence:['frame.png']},evidence:[{path:'frame.png'}],coverage:{playback_ranges:[[0,30]],original_frames:[{frame:10,evidence:'frame.png'}]},explanations:[{concept_id:'pull',moment_id:'turn',verdict:'pass',basis:'code_inference',observed_subject:'물질',observed_action:'끌림',observed_result:'회전',text_dependency:'라벨 없이 작용 확인',evidence:['frame.png']}]};
 assert.throws(()=>validateExplanationReview(f.w,report,timeline),/코드 추론/);
 report.explanations[0].basis='observed';report.coverage.playback_ranges=[];
 assert.throws(()=>validateExplanationReview(f.w,report,timeline),/연속 확인/);
 report.coverage.playback_ranges=[[0,15],[15,30]];assert.doesNotThrow(()=>validateExplanationReview(f.w,report,timeline));
 report.explanations=[];assert.throws(()=>validateExplanationReview(f.w,report,timeline),/핵심 설명/);
});
test('full editorial bundle enforces new intake contract even if visual flag is removed', async t=>{
 const {loadEditorialBundle,validateEditorialData}=await import('../scripts/lib/editorial.mjs');
 const legacy=loadEditorialBundle(join(project,'news/hani_superbubble_n44_restored_v2'));
 const original=validateEditorialData(legacy);assert.equal(original.errors.length,0);
 const checked=validateEditorialData({...legacy,visualContractRequired:true});
 assert.ok(checked.errors.some(e=>e.code==='visual-contract'));
 assert.ok(checked.errors.some(e=>e.code==='visual-purpose'));
});
test('one-frame MP4 cannot masquerade as motion proof',t=>{
 const f=fixture(t),art='out/pilots/fresh/qa/one.mp4',report='out/pilots/fresh/qa/one.json';
 const a=beginProductionAction('fresh','scene_proof',{repo:f.repo,outputs:[art,report]});
 mkdirSync(dirname(join(f.repo,art)),{recursive:true});
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=108x192:r=30','-frames:v','1','-c:v','libx264',join(f.repo,art)]);
 put(f.repo,report,{schema:'scene-proof@1',concept_id:'pull',phase:'motion',scope:'composite',artifact:art,verdict:'usable',observation:'fixture',tool:'test',continuous_viewing:true,viewed_seconds:[0,0.03]});
 assert.throws(()=>finishProductionAction('fresh',a.id,{repo:f.repo}),/한 프레임/);
});
test('removing both intake and visual flags cannot silently turn a new episode into legacy',t=>{
 const f=fixture(t),r='news/fresh/00_brief/request.json',v=f.prefix+'visual-system.json';
 for(const p of [r,v]) {const data=JSON.parse(readFileSync(join(f.repo,p)));delete data.visual_contract;put(f.repo,p,data);}
 const s=productionStatus('fresh',{repo:f.repo,includeContext:true});
 assert.equal(s.context.work.visual.status,'invalid');
 assert.ok(s.completion.blockers.some(b=>b.code==='changed-intake-contract'));
});
test('unsafe planned generation path is a plan error but resume remains usable',t=>{
 const f=fixture(t),p=f.prefix+'visual-system.json',v=JSON.parse(readFileSync(join(f.repo,p)));
 v.generation_jobs=[{id:'bad',kind:'image',purpose:'fixture',status:'planned',prompt_path:'../../../etc/passwd'}];put(f.repo,p,v);
 const s=productionStatus('fresh',{repo:f.repo,includeContext:true});
 assert.ok(s.context.work.visual.tasks.some(e=>e.code==='generation-path'));
});
test('moving literal text to an imported shared component does not evade the diagnostic',t=>{
 const f=fixture(t);put(f.repo,'src/editorial/episodes/fresh.tsx',"import {Shared} from '../shared-scene'; export const Scene=()=> <Shared/>;");
 put(f.repo,'src/editorial/shared-scene.tsx','export const Shared=()=> <div>공통에 숨은 설명</div>;');
 assert.equal(auditScreenText(f.repo,'fresh',[]).warnings[0].file,'src/editorial/shared-scene.tsx');
});
test('actual screen-text renderer requires global time and renders declared copy at that time',async()=>{
 const {createRequire}=await import('node:module'),{default:ts}=await import('typescript'),{default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
 const req=createRequire(import.meta.url),cache=new Map();
 const load=file=>{
   if(cache.has(file))return cache.get(file);
   const out=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
   const module={exports:{}};cache.set(file,module.exports);
   const localRequire=name=>name.startsWith('.')?load(join(dirname(file),name+'.ts')):req(name);
   new Function('require','module','exports',out)(localRequire,module,module.exports);return module.exports;
 };
 const {EditorialScreenText}=load(join(project,'src/editorial/ScreenText.tsx'));
 const pilot={concepts:plan(),timeline:{events:[{id:'name_show',element_id:'name',from:100,settled:110,to:190,end:200,easing:{enter:'linear',exit:'linear'}}]}};
 const props={pilot,elementId:'name',eventId:'name_show',style:{color:'red',left:20}};
 assert.throws(()=>renderToStaticMarkup(React.createElement(EditorialScreenText,props)),/globalFrame/);
 assert.equal(renderToStaticMarkup(React.createElement(EditorialScreenText,{...props,globalFrame:50})),'');
 const html=renderToStaticMarkup(React.createElement(EditorialScreenText,{...props,globalFrame:150}));
 assert.ok(html.includes('대상'));assert.ok(html.includes('data-screen-text="name"'));assert.ok(html.includes('color:red'));
 assert.equal(renderToStaticMarkup(React.createElement(EditorialScreenText,{...props,globalFrame:201})),'');
});

function gatedFixture(t, motion = true) {
 const f=fixture(t), c=plan();
 c.concepts[0].elements.push({id:'cloud',kind:'diagram',role:'metaphor'});
 c.concepts[0].visual.moments[0].subject_ids=['cloud'];
 c.concepts[0].visual.moments[0].motion_required=motion;
 put(f.repo,f.prefix+'concepts.json',c);
 put(f.repo,'src/editorial/scenes/fresh.tsx','export default function Scene(){return null;}');
 put(f.repo,f.prefix+'scene-proof.json',{schema:'scene-proof-config@1',concept_id:'pull',component:'src/editorial/scenes/fresh.tsx',duration_seconds:1,captions:[{narration_line:'s01',text:'돌아갑니다.',from:0,end:1}]});
 return f;
}
function gatedProof(f,name,phase='still',verdict='usable') {
 const p=proof(f,name,phase);p.data.verdict=verdict;
 p.data.rendering={kind:'shared-scene-proof@1',config:f.prefix+'scene-proof.json',component:'src/editorial/scenes/fresh.tsx',asset_ids:[],profile_sha256:hash(readFileSync(join(f.repo,'config/production-profile.json')))};
 put(f.repo,p.report,p.data);finishProductionAction('fresh',p.attempt.id,{repo:f.repo});return p;
}
test('first scene blocks narration and adoption on missing, revise, unverified and absent motion',t=>{
 const f=gatedFixture(t);
 const blocked=()=>{assert.throws(()=>beginProductionAction('fresh','narration',{repo:f.repo}),/first-scene/);assert.throws(()=>adoptNarration('fresh',{repo:f.repo}),/첫 핵심/);};
 blocked();gatedProof(f,'revise','still','revise');blocked();
 gatedProof(f,'still');blocked();gatedProof(f,'unverified','motion','unverified');blocked();
 gatedProof(f,'ready','motion');
 const status=productionStatus('fresh',{repo:f.repo,includeContext:true});
 assert.equal(status.context.work.first_scene.ready,true);
 assert.equal(status.actions.narration.runnable,true);
 const a=beginProductionAction('fresh','narration',{repo:f.repo});assert.equal(a.first_scene.proof_ids.length,2);
});
test('a static explanation needs only its selected still, other concepts do not require early proofs',t=>{
 const f=gatedFixture(t,false),c=JSON.parse(readFileSync(join(f.repo,f.prefix+'concepts.json')));
 c.concepts.push({...c.concepts[0],id:'later'});put(f.repo,f.prefix+'concepts.json',c);
 gatedProof(f,'static');assert.equal(productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.first_scene.ready,true);
});
test('changing actual scene component or artifact invalidates first scene admission',t=>{
 const f=gatedFixture(t,false),p=gatedProof(f,'original');
 put(f.repo,'src/editorial/scenes/fresh.tsx','export default function Scene(){return "changed";}');
 assert.equal(productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.first_scene.ready,false);
 gatedProof(f,'revised');writeFileSync(join(f.repo,p.art),'changed old artifact');
 // Only the latest proof of a phase is used; tampering older superseded work does not block.
 assert.equal(productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.first_scene.ready,true);
 writeFileSync(join(f.repo,'out/pilots/fresh/qa/revised.png'),'changed');
 assert.equal(productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.first_scene.ready,false);
});
test('question-as-action, text-only subject and orphan generation cannot pass admission',t=>{
 const f=gatedFixture(t,false),c=JSON.parse(readFileSync(join(f.repo,f.prefix+'concepts.json'))),v=JSON.parse(readFileSync(join(f.repo,f.prefix+'visual-system.json')));
 c.concepts[0].visual.moments[0].action='왜 회전할까요?';c.concepts[0].visual.moments[0].subject_ids=['name'];
 v.generation_jobs=[{id:'orphan',kind:'video',purpose:'visual motion',status:'planned'}];
 put(f.repo,f.prefix+'concepts.json',c);put(f.repo,f.prefix+'visual-system.json',v);gatedProof(f,'incomplete');
 const codes=productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.first_scene.blockers.map(b=>b.code);
 for(const code of ['first-scene-action','first-scene-subject','generation-orphan'])assert.ok(codes.includes(code));
});
test('legacy narration admission unchanged; removing new intake flag cannot bypass',t=>{
 const f=gatedFixture(t,false),r='news/fresh/00_brief/request.json',q=JSON.parse(readFileSync(join(f.repo,r)));delete q.scene_gate;put(f.repo,r,q);
 assert.equal(productionStatus('fresh',{repo:f.repo}).actions.narration.runnable,false);
 // Explicit fixture of a pre-gate episode, not a supported production downgrade.
 const run=JSON.parse(readFileSync(f.w.runFile));delete run.scene_gate;put(f.repo,f.w.rel(f.w.runFile),run);
 assert.equal(productionStatus('fresh',{repo:f.repo}).actions.narration.runnable,true);
});
test('standalone substitute image without shared composition provenance cannot pass',t=>{
 const f=gatedFixture(t,false),p=proof(f,'standalone');finishProductionAction('fresh',p.attempt.id,{repo:f.repo});
 assert.ok(productionStatus('fresh',{repo:f.repo,includeContext:true}).context.work.first_scene.blockers.some(b=>b.code==='first-scene-composite'));
});
