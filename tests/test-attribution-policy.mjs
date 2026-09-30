import test from 'node:test';
import assert from 'node:assert/strict';
import {compileAttribution, ATTRIBUTION_POLICY} from '../scripts/lib/attribution.mjs';
const options = {fps:30, contentFrames:300, policy:ATTRIBUTION_POLICY, assets:[{id:'moon', attribution_kind:'institution', attribution_evidence:'https://www.nasa.gov/image-article/moon/'}]};
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
