import React from 'react';
import {AbsoluteFill, Img, Interactive, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {eventOpacity, eventProgress} from '../../lib/editorial';
import type {EditorialEpisodeProps, EditorialPilotData} from '../pilot';

const clamp = {extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const BLUE='#94d9f4', GOLD='#efbb7e';
const event = (p:EditorialPilotData,id:string) => {const e=p.timeline.events.find(x=>x.id===id); if(!e)throw new Error(`missing ${id}`);return e;};
const Alpha:React.FC<{pilot:EditorialPilotData;id:string;children:React.ReactNode;style?:React.CSSProperties}>=({pilot,id,children,style})=>{const f=useCurrentFrame();return <Interactive.Div style={{position:'absolute',opacity:eventOpacity(f,event(pilot,id)),...style}}>{children}</Interactive.Div>};
const Provenance:React.FC<{text:string}>=({text})=><div style={{position:'absolute',left:80,right:80,bottom:115,fontSize:/모형|재구성/.test(text)?44:25,lineHeight:1.45,color:'#d5dce6',textShadow:'0 2px 6px #000',whiteSpace:'pre-line'}}>{text}</div>;
const Shade=()=> <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,8,20,.1),transparent 57%,rgba(0,5,14,.18) 70%,rgba(0,5,14,.85) 100%)'}}/>;
const stars=Array.from({length:115},(_,i)=>({x:((i*733+39)%1080),y:((i*467+21)%1920),r:i%9===0?2:0.8,o:.1+(i%5)*.055}));
const seed=(i:number)=> {const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n)};
const clouds=Array.from({length:112},(_,i)=>({a:seed(i+1)*Math.PI*2,r:80+Math.sqrt(seed(i+301))*380,s:35+seed(i+831)*75,h:seed(i+151)}));
const lights=[[-60,-55,12],[60,20,16],[-25,95,10],[100,-75,9],[-130,28,7]];

const GasModel:React.FC<EditorialEpisodeProps>=({pilot})=>{
 const f=useCurrentFrame(); const wind=eventProgress(f,event(pilot,'wind_push'),'move');const shock=eventProgress(f,event(pilot,'shock_push'),'move');const pile=eventProgress(f,event(pilot,'pile_up'),'move');const born=eventProgress(f,event(pilot,'birth_glow'),'move');const front=wind*235+shock*140;
 return <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 43%,#112634 0%,#071321 45%,#030b16 82%)'}}>
  <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position:'absolute'}}>
   <defs>
    <filter id="n44wisps" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".016 .024" numOctaves="3" seed="17" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="42" xChannelSelector="R" yChannelSelector="G"/></filter>
    <radialGradient id="n44cloud"><stop offset="0" stopColor="#dcaa76" stopOpacity=".65"/><stop offset=".5" stopColor="#9f6d4a" stopOpacity=".4"/><stop offset="1" stopColor="#875138" stopOpacity="0"/></radialGradient>
    <radialGradient id="n44cool"><stop offset="0" stopColor="#c1dfe7" stopOpacity=".55"/><stop offset=".52" stopColor="#6293aa" stopOpacity=".24"/><stop offset="1" stopColor="#3d657a" stopOpacity="0"/></radialGradient>
    <radialGradient id="n44star"><stop offset="0" stopColor="white"/><stop offset=".13" stopColor="#e2f7ff" stopOpacity=".95"/><stop offset=".4" stopColor="#6ebdef" stopOpacity=".24"/><stop offset="1" stopColor="#4aaae0" stopOpacity="0"/></radialGradient>
    <radialGradient id="n44new"><stop offset="0" stopColor="white"/><stop offset=".15" stopColor="#fff0c9"/><stop offset=".45" stopColor="#edb35c" stopOpacity=".4"/><stop offset="1" stopColor="#ef9849" stopOpacity="0"/></radialGradient>
   </defs>
   {stars.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o}/>)}
   <g transform="translate(540 840)">
    <g filter="url(#n44wisps)">{clouds.map((c,i)=>{const radius=c.r<front?front+(c.r/460)*36:c.r;const dense=1+pile*.4;return <g key={i} transform={`translate(${Math.cos(c.a)*radius} ${Math.sin(c.a)*radius*.9}) rotate(${c.a*180/Math.PI})`} opacity={.7+pile*.18}>
     <ellipse rx={c.s/dense} ry={c.s*.77/dense} fill={'url(#n44cloud)'} />
     <ellipse rx={c.s*.56/dense} ry={c.s*.29} fill={'url(#n44cloud)'} opacity=".6" />
    </g>})}</g>
    {Array.from({length:22},(_,i)=>{const a=i*Math.PI*2/22;const r=95+((f*2.2+i*39)%310);const op=interpolate(f,[event(pilot,'wind_push').from,event(pilot,'wind_push').from+10,event(pilot,'wind_push').to,event(pilot,'wind_push').end],[0,.85,.85,0],clamp);return <line key={i} x1={Math.cos(a)*r} y1={Math.sin(a)*r*.9} x2={Math.cos(a)*(r+42)} y2={Math.sin(a)*(r+42)*.9} stroke={BLUE} strokeWidth="5" strokeLinecap="round" opacity={op}/>;})}
    <ellipse rx={100+shock*325} ry={90+shock*293} fill="none" stroke="#d6f6ff" strokeWidth={3+(1-shock)*3} opacity={shock>0?Math.sin(shock*Math.PI)*.8:0}/>
    {lights.map(([x,y,r],i)=><g key={i} transform={`translate(${x} ${y})`}><circle r={r*4.8*(1+.14*Math.sin((f+i*11)/28))} fill="url(#n44star)"/><circle r={r*.44} fill="#f3fcff"/><path d={`M-${r*1.7} 0H${r*1.7}M0 -${r*1.7}V${r*1.7}`} stroke="#c8eafa" strokeWidth="1" opacity=".6"/></g>)}
    <circle cx="100" cy="-75" r={20+shock*120} fill="url(#n44star)" opacity={shock>0?Math.sin(shock*Math.PI):0}/>
    {[[-.6,380],[.85,405],[2.65,387]].map(([a,r],i)=><g key={i} transform={`translate(${Math.cos(a)*r} ${Math.sin(a)*r*.9})`} opacity={born}><circle r={78} fill="url(#n44new)"/><circle r={5+born*2} fill="#fff4cb"/></g>)}
   </g>
  </svg>
  <Alpha pilot={pilot} id="stars_label" style={{top:300,left:80,right:80,textAlign:'center',fontSize:54,fontWeight:700,color:BLUE}}>무거운 별들</Alpha>
  <Alpha pilot={pilot} id="wind_label" style={{top:350,left:90,right:90,textAlign:'center'}}><div style={{fontSize:78,fontWeight:700,color:BLUE}}>항성풍</div><div style={{fontSize:44,marginTop:18,color:'#d4e6ec'}}>별에서 바깥으로 흐르는 입자</div></Alpha>
  <Alpha pilot={pilot} id="shock_label" style={{top:350,left:90,right:90,textAlign:'center'}}><div style={{fontSize:76,fontWeight:700,color:BLUE}}>초신성의 충격파</div></Alpha>
  <Alpha pilot={pilot} id="shell_label_show" style={{top:1290,left:80,right:80,textAlign:'center',fontSize:54,fontWeight:700,color:GOLD}}>밀려 쌓인 가스 껍질</Alpha>
  <Alpha pilot={pilot} id="birth_label" style={{top:340,left:80,right:80,textAlign:'center',fontSize:54,fontWeight:700,color:GOLD}}>다음 별의 재료</Alpha>
  <Provenance text="항성풍·초신성에 의한 형성 모형"/>
  <AbsoluteFill style={{opacity:interpolate(f,[pilot.timeline.concepts.find(x=>x.id==='forces')!.from,pilot.timeline.concepts.find(x=>x.id==='forces')!.from+24],[1,0],clamp),pointerEvents:'none'}}><Img src={pilot.file('editorial/n44.jpg')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 50%'}}/></AbsoluteFill>
 </AbsoluteFill>
};

const Discovery:React.FC<EditorialEpisodeProps>=({pilot})=>{
 const f=useCurrentFrame();const e=event(pilot,'size_reveal');const freeze=interpolate(f,[e.from-12,e.from],[0,1],clamp);
 return <AbsoluteFill>
  <Video src={pilot.file('editorial/pan-silent.mp4')} muted trimBefore={60} objectFit="cover" style={{width:'100%',height:'100%',objectPosition:'50% 50%'}}/>
  <AbsoluteFill style={{opacity:freeze}}><Img src={pilot.file('editorial/n44.jpg')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 50%',scale:interpolate(f,[e.from,e.end],[1,1.035],clamp)}}/></AbsoluteFill>
  <Shade/>
  <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position:'absolute',opacity:interpolate(f,[e.from,e.from+18,646,658],[0,.9,.9,0],clamp),scale:interpolate(f,[e.from,e.end],[1,1.035],clamp)}}>
   <path d="M585 570 C450 568 330 712 290 920 C230 1110 325 1400 485 1460 C650 1490 820 1320 883 1150 C941 993 985 778 865 650 C797 577 674 550 585 570Z" fill="rgba(8,18,30,.08)" stroke="#efbb7e" strokeWidth="4" strokeDasharray="17 11"/>
   <path d="M190 590 L295 650 L388 723" fill="none" stroke="#efbb7e" strokeWidth="4"/>
  </svg>
  <Alpha pilot={pilot} id="name_reveal" style={{left:80,top:350}}><div style={{fontSize:106,fontWeight:800,letterSpacing:1}}>N44</div><div style={{fontSize:44,marginTop:12,color:'#e4edf3'}}>대마젤란은하의 성운</div></Alpha>
  <Alpha pilot={pilot} id="size_reveal" style={{left:80,top:345,right:80}}><div style={{fontSize:44,color:'#d2e6ee'}}>중앙 빈 공간의 가로</div><div style={{fontSize:106,fontWeight:800,lineHeight:1.4}}>약 <span style={{color:GOLD}}>210</span>광년</div></Alpha>
  <Alpha pilot={pilot} id="bubble_reveal" style={{left:80,top:1260,right:80,textAlign:'center',fontSize:76,fontWeight:700}}>슈퍼버블</Alpha>
  <Provenance text={f<e.from?'ESA/Hubble & NASA, D. Gouliermis,\nN. Bartmann (ESA/Hubble)':'ESA/Hubble & NASA, D. Gouliermis'}/>
 </AbsoluteFill>;
};
const Clearing:React.FC<EditorialEpisodeProps>=({pilot})=>{
 const c=pilot.timeline.concepts.find(x=>x.id==='clearing')!;
 return <AbsoluteFill><Sequence from={c.from} layout="none"><Video src={pilot.file('editorial/gas-clump.mp4')} muted objectFit="cover" style={{width:'100%',height:'100%'}}/></Sequence><Shade/><Provenance text="가스가 밀려나는 과정 · AI 재구성"/></AbsoluteFill>;
};
const Condense:React.FC<EditorialEpisodeProps>=({pilot})=>{
 const f=useCurrentFrame();const t=eventProgress(f,event(pilot,'clump_contract'),'move');
 return <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 44%,#152938,#030b16 76%)'}}>
  <svg width="1080" height="1920" viewBox="0 0 1080 1920">
   <defs><filter id="n44clumpTexture" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".013 .022" numOctaves="3" seed="21" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="65" xChannelSelector="R" yChannelSelector="G"/></filter><radialGradient id="n44knot"><stop offset="0" stopColor="#ffdbab" stopOpacity=".7"/><stop offset=".4" stopColor="#c28f63" stopOpacity=".32"/><stop offset="1" stopColor="#6b8092" stopOpacity="0"/></radialGradient></defs>
   {stars.map((v,i)=><circle key={i} cx={v.x} cy={v.y} r={v.r} fill="white" opacity={v.o}/>)}
   <g transform="translate(540 900)" filter="url(#n44clumpTexture)">
    {Array.from({length:38},(_,i)=>{const a=seed(i+65)*6.283;const rr=100+seed(i+95)*330;const r=rr*(1-t*.56);return <g key={i} transform={`translate(${Math.cos(a)*r} ${Math.sin(a)*r*.88}) rotate(${a*180/Math.PI})`}><ellipse rx={90+seed(i+43)*80} ry={60+seed(i+43)*70} fill="url(#n44knot)" opacity={.65+t*.3}/></g>})}
    {Array.from({length:10},(_,i)=>{const a=i*6.283/10;return <path key={i} d={`M${Math.cos(a)*410},${Math.sin(a)*360} Q${Math.cos(a+.2)*210},${Math.sin(a+.2)*210} ${Math.cos(a)*25},${Math.sin(a)*20}`} fill="none" stroke="#c9ad88" strokeWidth={7-t*2} opacity={.12+t*.24}/>})}
   </g>
  </svg>
  <Alpha pilot={pilot} id="clump_label" style={{left:80,right:80,top:345,fontSize:74,fontWeight:700,textAlign:'center',color:GOLD}}>차가운 가스의 응집</Alpha>
  <Provenance text="가스 응집의 첫 단계 · 과정 모형"/>
 </AbsoluteFill>;
};
const Census:React.FC<EditorialEpisodeProps>=({pilot})=>{
 const f=useCurrentFrame();const c=pilot.timeline.concepts.find(x=>x.id==='census')!;
 return <AbsoluteFill><Img src={pilot.file('editorial/n44.jpg')} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'53% 55%',scale:interpolate(f,[c.from,c.end],[1.22,1.34],clamp)}}/><Shade/>
  <Alpha pilot={pilot} id="count_reveal" style={{top:335,left:80,right:80}}><div style={{fontSize:45,color:'#e8eff4'}}>N44 일대에서 조사한 별 중</div><div style={{fontSize:132,fontWeight:800,lineHeight:1.45,color:GOLD}}>약 3만 개</div></Alpha>
  <Alpha pilot={pilot} id="hydrogen_reveal" style={{top:1230,left:80,right:80,fontSize:49,lineHeight:1.4,fontWeight:700}}>중심의 수소 핵융합<br/><span style={{color:GOLD}}>시작 전</span></Alpha>
  <Provenance text="ESA/Hubble & NASA, D. Gouliermis"/>
 </AbsoluteFill>;
};
const Closing:React.FC<EditorialEpisodeProps>=({pilot})=><AbsoluteFill><Sequence from={pilot.timeline.concepts.find(x=>x.id==='return')!.from} layout="none"><Video src={pilot.file('editorial/pan-silent.mp4')} muted trimBefore={510} objectFit="cover" style={{width:'100%',height:'100%',objectPosition:'62% 50%'}}/></Sequence><Shade/><div style={{position:'absolute',left:80,right:80,bottom:60,fontSize:24,lineHeight:1.4,color:'#d5dce6',textShadow:'0 2px 5px #000'}}>ESA/Hubble &amp; NASA, D. Gouliermis,<br/>N. Bartmann (ESA/Hubble)<br/>"Floating Cities" Kevin MacLeod (incompetech.com)<br/>Licensed under Creative Commons: By Attribution 4.0<br/>http://creativecommons.org/licenses/by/4.0/</div></AbsoluteFill>;

export const EditorialEpisode:React.FC<EditorialEpisodeProps>=({pilot})=>{
 const f=useCurrentFrame();const c=pilot.timeline.concepts.find(x=>f>=x.from&&f<x.end)??pilot.timeline.concepts[0];
 return <AbsoluteFill style={{fontFamily:'Pretendard',background:'#030b16'}}>
  {c.id==='discovery'?<Discovery pilot={pilot}/>:c.id==='forces'||c.id==='shell'?<GasModel pilot={pilot}/>:c.id==='clearing'?<Clearing pilot={pilot}/>:c.id==='condense'?<Condense pilot={pilot}/>:c.id==='census'?<Census pilot={pilot}/>:<Closing pilot={pilot}/>}
 </AbsoluteFill>;
};
