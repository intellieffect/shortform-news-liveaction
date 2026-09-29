import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {splitCaptionWords} from '../scripts/lib/narration-assembly.mjs';
import {compileAttribution} from '../scripts/lib/attribution.mjs';
import {productionProfileErrors,readProductionProfile} from '../scripts/lib/production-profile.mjs';
const p=JSON.parse(readFileSync(new URL('../config/production-profile.json',import.meta.url)));
const words=t=>t.split(' ').map((text,i)=>({text,start:i,end:i+.8}));
test('승인 좌표와 한줄 제약, 과거 프로필 보존',()=>{
 assert.deepEqual([p.caption.top,p.caption.side_inset,p.caption.max_lines,p.caption.box_height],[1400,150,1,94]);
 assert.deepEqual(productionProfileErrors(p),[]);
 assert.ok(productionProfileErrors({...p,caption:{...p.caption,max_lines:2}}).length);
 assert.equal(readProductionProfile({id:p.id,version:'1.2.0'}).caption.top,1523);
});
test('쉼표는 다음 시간 자막, 숫자쉼표 보존',()=>{
 const lines=splitCaptionWords(words('1,000개이고, 2개입니다.'),p);
 assert.deepEqual(lines.map(c=>c.text),['1,000개이고,','2개입니다.']);
 assert.equal(lines[1].start,1);assert.ok(lines.every(c=>!c.text.includes('\n')));
 assert.deepEqual(splitCaptionWords(words('하나， 둘'),p).map(c=>c.text),['하나，','둘']);
 assert.throws(()=>splitCaptionWords([{text:'하나,둘',start:0,end:1}],p),/개별 단어 시각/);
});
const input={sources:[{asset_id:'moon',text:'자료: NASA\nScientific Visualization Studio',start:0,end:2}],pages:[{duration:5,categories:[{title:'참조 기사',lines:['한겨레 기사']},{title:'이미지·영상',lines:['NASA']}]}]};
const opts={fps:30,contentFrames:90,assets:[{id:'moon'}],required:true};
test('자료 노출 구간과 본편 뒤 카테고리별 크레딧 컴파일',()=>{
 const r=compileAttribution(input,opts);assert.deepEqual(r.errors,[]);assert.equal(r.totalFrames,240);
 assert.deepEqual([r.attribution.sources[0].from,r.attribution.sources[0].end],[0,60]);
 assert.equal(r.attribution.pages[0].from,90);assert.equal(r.attribution.pages[0].categories.length,2);
 assert.equal(r.attribution.style.source.font_size,32);
});
test('출처 누락·자산오류·시간겹침·끝페이지 누락 거절',()=>{
 assert.ok(compileAttribution(null,opts).errors.length);
 for (const changes of [{pages:[]},{sources:[{...input.sources[0],asset_id:'missing'}]},{sources:[...input.sources,...input.sources]}]) assert.ok(compileAttribution({...input,...changes},opts).errors.length);
 assert.equal(compileAttribution(null,{...opts,required:false}).attribution,null);
});

test("동시 출처는 연결한 모든 자산을 검증",()=>{
 const cue={asset_ids:["moon","sky"],text:"Moon credit\nSky credit",start:0,end:2};
 assert.deepEqual(compileAttribution({...input,sources:[cue]},{...opts,assets:[{id:"moon"},{id:"sky"}]}).errors,[]);
 assert.ok(compileAttribution({...input,sources:[cue]},opts).errors.length);
});
