import React from 'react';
import {registerRoot,Composition,AbsoluteFill,Interactive,interpolate,useCurrentFrame,staticFile,Easing} from 'remotion';
import {Video,Audio} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {EditorialCaptionTrack} from '../../../../../../../src/lib/editorial/visual';
import timing from './timing.json';
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFMedium.ttf'),weight:'500'});
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFBold.ttf'),weight:'700'});
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const rows=[
 {name:'스페이스엑스',detail:'우주데이터센터',value:100,color:'#f4ddbb'},
 {name:'이-스페이스',detail:'시나몬',value:30,color:'#abc6d6'},
 {name:'중국 위성군',detail:'여러 계획의 합계',value:20,color:'#8baabf'},
 {name:'리플렉트 오비탈',detail:'우주거울 · 2035년 목표',value:5,color:'#7493ac'},
];
const Scene=()=>{const f=useCurrentFrame();return <AbsoluteFill style={{background:'#02070e',fontFamily:'GmarketSans',color:'#f5f6f8',overflow:'hidden'}}>
 <Video src={staticFile('references/scale/v1/earth-original.webm')} trimBefore={76*30} playbackRate={timing.backgroundRate} muted objectFit="cover" style={{position:'absolute',left:-850,width:3414,height:1920,filter:'brightness(1.5)'}} />
 <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(2,7,15,.84) 0%,rgba(2,7,15,.82) 38%,rgba(2,7,15,.6) 57%,rgba(2,7,15,.05) 73%,rgba(2,7,15,.1) 100%)'}}/>
 <Interactive.Div name="신청 계획 조건" style={{position:'absolute',left:104,top:170,fontSize:44,color:'#c9d1db',opacity:interpolate(f,[0,12],[0,1],clamp)}}>주요 위성 신청·계획</Interactive.Div>
 <Interactive.Div name="공통 영점 기준선" style={{position:'absolute',left:104,top:275,width:2,height:interpolate(f,[8,34],[0,852],clamp),background:'rgba(210,223,236,.4)'}} />
 {rows.map((r,i)=>{const start=timing.rowFrames[i],bar=timing.barFrames[i],value=timing.valueFrames[i],y=282+i*216;return <React.Fragment key={r.name}>
 <Interactive.Div name={r.name+' 이름'} style={{position:'absolute',left:128,top:y,fontSize:48,fontWeight:500,opacity:interpolate(f,[start,start+8],[0,1],clamp),translate:interpolate(f,[start,start+12],['0px 8px','0px 0px'],clamp)}}>{r.name}<span style={{fontSize:36,color:'#b1bdcc',marginLeft:20}}>{r.detail}</span></Interactive.Div>
 <Interactive.Div name={r.name+' 비례 막대'} style={{position:'absolute',left:106,top:y+78,width:interpolate(f,[bar,bar+28],[0,620*r.value/100],{...clamp,easing:Easing.bezier(.22,.8,.2,1)}),height:48,background:`linear-gradient(180deg,${r.color},${r.color}dc)`,boxShadow:'inset 0 1px 0 rgba(255,255,255,.25)'}} />
 <Interactive.Div name={r.name+' 고정 수치'} style={{position:'absolute',left:106+620*r.value/100+22,top:y+72,fontSize:58,fontWeight:700,color:r.color,opacity:interpolate(f,[value,value+6],[0,1],clamp)}}>{r.value}만 기</Interactive.Div>
 </React.Fragment>})}
 <Interactive.Div name="영점" style={{position:'absolute',left:92,top:1148,fontSize:32,color:'#9da9b8',opacity:interpolate(f,[25,35],[0,1],clamp)}}>0</Interactive.Div>
 {timing.audio && <><Audio src={staticFile('references/scale/v1/narration.wav')} volume={1}/><Audio src={staticFile('references/scale/v1/settle.wav')} volume={1}/></>}
 <EditorialCaptionTrack lines={timing.captions} fps={30}/>
 </AbsoluteFill>};
registerRoot(()=> <Composition id="ReferenceScale" component={Scene} width={1080} height={1920} fps={30} durationInFrames={timing.durationFrames}/>);
