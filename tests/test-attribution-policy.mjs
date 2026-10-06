import test from 'node:test';
import assert from 'node:assert/strict';
import {compileAttribution, ATTRIBUTION_POLICY} from '../scripts/lib/attribution.mjs';
const options = {fps:30, contentFrames:300, policy:'attribution@2', assets:[{id:'moon', attribution_kind:'institution', attribution_evidence:'https://www.nasa.gov/image-article/moon/'}]};
const input = () => ({sources:[{asset_id:'moon',text:'NASA / Jane Smith',start:0,end:8}],pages:[{duration:3,categories:[{title:'자료',lines:['NASA / Jane Smith','Pexels / contributor','Higgsfield']}]}]});
test('official designated names allowed, cut duration independent, all end credits retained and pages exactly 3s',()=>{
  const data=input(), before=structuredClone(data), r=compileAttribution(data,options);
  assert.deepEqual(r.errors,[]); assert.deepEqual(data,before);
  assert.equal(r.attribution.sources[0].end,240);
  assert.deepEqual(r.attribution.pages[0],{from:300,end:390,categories:data.pages[0].categories});
  assert.equal(r.totalFrames,390);
  delete data.pages[0].duration;
  assert.equal(compileAttribution(data,options).attribution.pages[0].end,390);
  assert.equal(data.pages[0].duration,undefined);
});
test('new contract rejects long credits, unknown policies, missing credits and provider sources',()=>{
  for (const duration of [5,2,0,null]) { const d=input();d.pages[0].duration=duration;assert.ok(compileAttribution(d,options).errors.length); }
  assert.ok(compileAttribution(input(),{...options,policy:'attribution@99'}).errors.length);
  assert.ok(compileAttribution(null,options).errors.length);
  for (const text of ['Pexels / Jane','pexel','Higgsfield','NASA + Pexels']) {const d=input();d.sources[0].text=text;assert.ok(compileAttribution(d,options).errors.length);}
  for (const asset of [{id:'moon'}, {id:'moon',attribution_kind:'stock',attribution_evidence:'https://www.nasa.gov/'},{id:'moon',attribution_kind:'institution',attribution_evidence:'https://www.pexels.com/a'},{id:'moon',attribution_kind:'institution',attribution_evidence:'not a url'}])
    assert.ok(compileAttribution(input(),{...options,assets:[asset]}).errors.length);
});
test('mixed linked sources cannot disguise providers as an official source',()=>{
  const d=input();d.sources[0].asset_ids=['moon','stock'];
  assert.ok(compileAttribution(d,{...options,assets:[...options.assets,{id:'stock',attribution_kind:'stock'}]}).errors.length);
});
test('old contract keeps its duration and provider labels',()=>{
  const d=input();d.pages[0].duration=11;d.sources[0].text='Pexels';
  const r=compileAttribution(d,{...options,policy:null,assets:[{id:'moon'}]});
  assert.deepEqual(r.errors,[]);assert.equal(r.totalFrames,630);
});

const o3 = {...options, policy:ATTRIBUTION_POLICY};
const in3 = () => ({sources:[{asset_id:'moon',text:'NASA / Jane Smith',start:0,end:8}],pages:[{duration:3,categories:[{title:'참조 기사',lines:['한겨레 · 홍길동','달 기사 제목']},{title:'이미지·관측 근거',lines:['NASA / Jane Smith','ESA / Roscosmos']}]}]});
test('attribution@3: 상단 표기와 같은 줄은 끝 크레딧에서 자동 제외, 입력은 그대로',()=>{
  const d=in3(), before=structuredClone(d), r=compileAttribution(d,o3);
  assert.deepEqual(r.errors,[]); assert.deepEqual(d,before);
  assert.deepEqual(r.attribution.pages[0].categories[1].lines,['ESA / Roscosmos']);
  const all=in3(); all.pages[0].categories[1].lines=['NASA / Jane Smith'];
  const r2=compileAttribution(all,o3); assert.deepEqual(r2.errors,[]); assert.deepEqual(r2.attribution.pages[0].categories.map(c=>c.title),['참조 기사']);
});
test('attribution@3: 최대 2장, 허용 카테고리 2종, 음악·AI·음성 금지, 참조 기사 끝 번호·날짜 금지',()=>{
  const three=in3(); three.pages=[0,1,2].map(()=>structuredClone(in3().pages[0])); three.pages.forEach((p,i)=>p.categories[1].lines=['x'+i]);
  assert.ok(compileAttribution(three,o3).errors.some(e=>/최대 2장/.test(e.message)));
  const two=in3(); two.pages.push({duration:3,categories:[{title:'이미지·관측 근거',lines:['ESO']}]});
  assert.deepEqual(compileAttribution(two,o3).errors,[]);
  for (const title of ['음악','효과음','AI 시각화','음성','이미지·영상']) {const d=in3();d.pages[0].categories.push({title,lines:['x']});assert.ok(compileAttribution(d,o3).errors.length,title);}
  for (const line of ['Higgsfield','AI 생성 이미지','Music - 봄','효과음: 땡','Typecast 음성']) {const d=in3();d.pages[0].categories[1].lines=[line];assert.ok(compileAttribution(d,o3).errors.length,line);}
  for (const line of ['한겨레 · 홍길동 (1269147)','제목 (2026-09-28)','제목（1269147）']) {const d=in3();d.pages[0].categories[0].lines=[line];assert.ok(compileAttribution(d,o3).errors.length,line);}
  const noArticle=in3();noArticle.pages[0].categories.shift();assert.ok(compileAttribution(noArticle,o3).errors.length);
});
