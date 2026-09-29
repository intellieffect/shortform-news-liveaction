import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {hookLayoutIssues} from '../scripts/lib/hook-layout.mjs';

const req = createRequire(import.meta.url);
const root = new URL('../', import.meta.url).pathname;
const style = req('../config/hook-style.json');
// Execute the actual React tree without a browser/media render. Only frame and delay hooks are substituted.
const renderer = () => {
  let frame = 0;
  const cache = new Map();
  const load = file => {
    if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'));
    if (cache.has(file)) return cache.get(file);
    const module = {exports:{}};
    cache.set(file, module.exports);
    const js = ts.transpileModule(readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true}}).outputText;
    const localRequire = name => {
      if (name === 'remotion') return {...req(name), useCurrentFrame:()=>frame,
        useDelayRender:()=>({delayRender:()=>1,continueRender:()=>{},cancelRender:e=>{throw e;}}),
        Interactive:{Div:({name,children,...props})=>React.createElement('div',props,children)}};
      if (!name.startsWith('.')) return req(name);
      const base = resolve(dirname(file),name);
      const target = [base,base+'.ts',base+'.tsx',base+'/index.ts'].find(existsSync);
      return load(target);
    };
    new Function('require','module','exports',js)(localRequire,module,module.exports);
    return module.exports;
  };
  return {load, at:(f,Component,props)=>{frame=f;return renderToStaticMarkup(React.createElement(Component,props));}};
};
const event = (id, from, settled, to, end) => ({id,element_id:'question',concept_id:'opening',kind:'label',from,settled,to,end,easing:{enter:'linear',move:'linear',exit:'linear'}});
const phrase = {id:'question',text:'별이\n사라진다고요?',text_event:event('text',10,20,70,80),underline_event:event('line',20,40,70,80)};

test('hook is absent before/after its own window and yellow growth follows supplied event speed',()=>{
  const r=renderer(),{HookOverlayTrack}=r.load(resolve(root,'src/lib/editorial/HookOverlayTrack.tsx'));
  const props={hook:{style,phrases:[phrase]}};
  assert.equal(r.at(9,HookOverlayTrack,props),'');
  const middle=r.at(30,HookOverlayTrack,props);
  assert.match(middle,/별이/); assert.match(middle,/사라진다고요/);
  assert.match(middle,/background-color:#FFD43B/); assert.match(middle,/scale:0.5 1/);
  assert.match(middle,/font-size:104px/); assert.match(middle,/left:140px/);
  assert.equal(r.at(80,HookOverlayTrack,props),'');
  const slow={hook:{style,phrases:[{...phrase,underline_event:event('line',20,60,70,80)}]}};
  assert.match(r.at(30,HookOverlayTrack,slow),/scale:0.25 1/);
});

test('different phrase windows and typography are data driven; no kicker/title pair required',()=>{
  const r=renderer(),{HookOverlayTrack}=r.load(resolve(root,'src/lib/editorial/HookOverlayTrack.tsx'));
  const later={...phrase,id:'later',text:'다음 질문',text_event:event('t2',80,90,110,120),underline_event:event('u2',90,100,110,120),layout:{font_size:120,width:720,center_y:840}};
  const html=r.at(95,HookOverlayTrack,{hook:{style,phrases:[phrase,later]}});
  assert.doesNotMatch(html,/별이/);assert.match(html,/다음 질문/);assert.match(html,/font-size:120px/);assert.match(html,/left:180px/);
  assert.equal(r.at(50,HookOverlayTrack,{}),'');
});

test('same declared hook is not rendered twice by ordinary screen text',()=>{
  const r=renderer(),{EditorialScreenText}=r.load(resolve(root,'src/editorial/ScreenText.tsx'));
  const pilot={concepts:{concepts:[{elements:[{id:phrase.id,kind:'text',role:'hook',text:phrase.text}]}]},timeline:{events:[phrase.text_event],hook_overlay:{phrases:[phrase]}}};
  assert.equal(r.at(30,EditorialScreenText,{pilot,elementId:phrase.id,eventId:'text',globalFrame:30}),'');
  delete pilot.timeline.hook_overlay;
  assert.match(r.at(30,EditorialScreenText,{pilot,elementId:phrase.id,eventId:'text',globalFrame:30}),/별이/);
});

test('layout keeps large text and fixed yellow/center contract while permitting art direction',()=>{
  assert.deepEqual(hookLayoutIssues({font_size:96,center_y:820,width:820,text_color:'#FFFFFF',shadow:'none'},'p'),[]);
  for(const layout of [{font_size:32},{width:1200},{center_y:NaN},{underline_color:'#000000'},{center_x:300},{text_color:'transparent'}]) assert.ok(hookLayoutIssues(layout,'p').length);
});

test('proof frame shift moves hook, scene events, credits and source cues together without mutating master',()=>{
  const r=renderer(),{shiftEditorialTimeline}=r.load(resolve(root,'src/lib/editorial/proof-time.ts'));
  const t={total_frames:200,concepts:[{from:0,end:100}],events:[phrase.text_event],hook_overlay:{phrases:[phrase]},audio_cues:[{frame:20}],attribution:{sources:[{from:0,end:100}],pages:[{from:100,end:200}]}};
  const shifted=shiftEditorialTimeline(t,-30);
  assert.equal(shifted.hook_overlay.phrases[0].text_event.from,-20);
  assert.equal(shifted.hook_overlay.phrases[0].underline_event.settled,10);
  assert.equal(shifted.events[0].from,-20);
  assert.equal(shifted.attribution.sources[0].from,-30);
  assert.equal(shifted.attribution.pages[0].from,70);
  assert.equal(t.hook_overlay.phrases[0].text_event.from,10);
});


test('runtime uses compiled style snapshot rather than live global defaults',()=>{
 const r=renderer(),{HookOverlayTrack}=r.load(resolve(root,'src/lib/editorial/HookOverlayTrack.tsx'));
 const html=r.at(30,HookOverlayTrack,{hook:{style:{...style,font_size:112},phrases:[phrase]}});
 assert.match(html,/font-size:112px/);
});
