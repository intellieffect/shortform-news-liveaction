#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

// URL 의 pathname 은 Windows 에서 `/D:/...` 가 되고 공백·한글은 %20 그대로다 — fileURLToPath 를 쓴다.
const repo = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoot = join(repo, "out", "tmp");
mkdirSync(temporaryRoot, { recursive: true });
const output = mkdtempSync(join(temporaryRoot, "caption-layout-"));
const entry = join(output, "entry.tsx");
writeFileSync(entry, `
import React, {useLayoutEffect} from "react";
import { AbsoluteFill, Composition, registerRoot, staticFile, useDelayRender } from "remotion";
import { loadFont } from "@remotion/fonts";
import {HookOverlayTrack} from "../../../src/lib/editorial/HookOverlayTrack";
import {AttributionTrack} from "../../../src/lib/editorial/AttributionTrack";
import { EditorialCaptionTrack, type EditorialCaptionLine } from "../../../src/lib/editorial/visual";
import { DEFAULT_PRODUCTION_PROFILE, type ProductionProfile } from "../../../src/lib/editorial/profile";
void loadFont({ family: "GmarketSans", url: staticFile("fonts/GmarketSansTTFMedium.ttf"), weight: "500" });
void loadFont({ family: "GmarketSans", url: staticFile("fonts/GmarketSansTTFBold.ttf"), weight: "700" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-Regular.otf"), weight: "400" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-Bold.otf"), weight: "700" });
void loadFont({ family: "Pretendard", url: staticFile("fonts/Pretendard-ExtraBold.otf"), weight: "800" });
const HookWidthCheck: React.FC<{hook: any}> = ({hook}) => {
  const {delayRender,continueRender,cancelRender}=useDelayRender();
  useLayoutEffect(()=>{
    if(!hook) return;
    const handle=delayRender('hook target width comparison');let active=true;
    void document.fonts.ready.then(()=>{
      if(!active) return;
      const target=document.querySelector('[data-hook-underline-target]');
      const underline=document.querySelector('[data-hook-underline]');
      if(!target?.firstChild || !underline) {cancelRender(new Error('missing hook target'));return;}
      const range=document.createRange();range.selectNode(target.firstChild);
      const width=range.getBoundingClientRect().width;
      if(Math.abs(width-underline.getBoundingClientRect().width)>1) cancelRender(new Error('underline differs from text width'));
      else continueRender(handle);
    });
    return ()=>{active=false;continueRender(handle);};
  },[hook,delayRender,continueRender,cancelRender]);
  return <HookOverlayTrack hook={hook}/>;
};
const Page: React.FC<{ lines: EditorialCaptionLine[]; profile: ProductionProfile; attribution?: any; hook?: any }> = ({ lines, profile, attribution, hook }) => (
  <AbsoluteFill style={{ backgroundColor: "#071622", color: "white" }}>
    <EditorialCaptionTrack lines={lines} profile={profile} fps={30} />
    <AttributionTrack attribution={attribution} />
    <HookWidthCheck hook={hook} />
  </AbsoluteFill>
);
const Root = () => <Composition id="CaptionCheck" component={Page} width={1080} height={1920} fps={30} durationInFrames={300} defaultProps={{ lines: [], profile: DEFAULT_PRODUCTION_PROFILE }} />;
registerRoot(Root);
`);
const profile = JSON.parse(readFileSync(join(repo, "config/production-profile.json")));
const legacy = JSON.parse(readFileSync(join(repo, "config/production-profiles/hani-shortform-1.0.0.json")));
const lines = [
  { id: "first", text: "한 줄 자막입니다.", start: 0, end: 1.4, emphasis: ["자막"] },
  { id: "next", text: "600km로", start: 1.4, end: 2, emphasis: ["600km로"] },
  { id: "last", text: "상승합니다.", start: 2, end: 3 },
];
const serveUrl = await bundle({ entryPoint: entry, publicDir: join(repo, "public"), symlinkPublicDir: true });
const render = async (name, captions, config = profile, frame = 18, scale = 1, attribution, hook) => {
  const inputProps = { lines: captions, profile: config, attribution, hook };
  const composition = await selectComposition({ serveUrl, id: "CaptionCheck", inputProps });
  return renderStill({ serveUrl, composition, inputProps, frame, scale,
    output: join(output, `${name}.png`), imageFormat: "png", logLevel: "error" });
};
await render("single-line", lines);
await render("next-mobile", lines, profile, 55, 1 / 3);
const overflow = [...lines, { id: "late-overflow", text: "폭을 넘는 아주 긴 자막을 화면 밖으로 보내거나 작게 줄이지 않고 발화에 맞춰 나눠야 합니다.", start: 5, end: 8 }];
await assert.rejects(render("overflow-must-fail", overflow), /\[caption-width\].*late-overflow/);
await assert.rejects(render("newline-must-fail", [{ ...lines[0], text: "첫째\n둘째" }]), /\[caption-single-line\]/);
// 조립 단계의 실측 분절 결과가 브라우저 폭 검사도 통과한다(프로필 1.4 글자폭756).
await render("measured-segments", [
  { id: "m1", text: "연구진은 은하의 씨앗인", start: 0, end: 1.5 },
  { id: "m2", text: "암흑물질 덩어리를 비튼,", start: 1.5, end: 3, emphasis: ["암흑물질", "덩어리를", "비튼,"] },
], profile, 60);
await render("legacy-two-lines", [{ ...lines[0], text: "이전 편의\n두 줄 자막" }], legacy);
console.log("caption runtime: PASS — 원해상/모바일 한 줄, 화면 밖의 후속 구간 폭 초과·줄바꿈 거절, 이전 프로필 두 줄 보존");
console.log("검사 이미지: " + output);

const creditStyle=JSON.parse(readFileSync(join(repo,"config/attribution-style.json")));
const attribution={style:creditStyle,sources:[{asset_id:"moon",text:"자료: NASA Scientific\nVisualization Studio",from:0,end:90}],pages:[{from:90,end:240,categories:[{title:"참조 기사",lines:["한겨레 · 달 관측의 날"]},{title:"이미지·영상",lines:["NASA Scientific Visualization Studio"]}]}]};
await render("source-credit",lines,profile,18,1,attribution);
await render("end-credits",lines,profile,100,1,attribution);
await assert.rejects(render("source-overflow",lines,profile,18,1,{...attribution,sources:[{...attribution.sources[0],text:"긴 출처 ".repeat(120)}]}),/attribution-overflow/);
console.log("attribution runtime: PASS — 공통 출처·카테고리별 크레딧, 넘침 거절");


// Real DOM/loaded-font measurement, not just a CSS string assertion.
const hookStyle=JSON.parse(readFileSync(join(repo,"config/hook-style.json")));
const hookEvent={id:"test",element_id:"hook",concept_id:"opening",kind:"label",from:0,settled:5,to:60,end:70,easing:{enter:"linear",move:"linear",exit:"linear"}};
const hook={style:hookStyle,phrases:[{id:"hook",text:"익숙한 상식이\n뒤집혔다",text_event:hookEvent,underline_event:{...hookEvent,kind:"motion"},runs:[
  {text:"익숙한 상식이\n",role:"support",font_size:64,text_color:"#FFD43B"},
  {text:"뒤집혔다",role:"emphasis",underline:true,font_size:104,text_color:"#FFFFFF"},
]}]};
await render("hook-measured-underline",lines,profile,30,1,undefined,hook);
console.log("hook runtime: PASS — actual loaded-font text width equals settled underline width");
