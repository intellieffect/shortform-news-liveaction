import {AbsoluteFill,CanvasImage,Interactive,interpolate,useCurrentFrame,staticFile,Easing} from 'remotion';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export const QuoteScene=()=>{const f=useCurrentFrame();return <AbsoluteFill style={{background:'#000',color:'#080909'}}>
<Interactive.Div name="종이 발췌 등장" style={{position:'absolute',inset:0,opacity:interpolate(f,[0,18],[0,1],clamp),translate:interpolate(f,[0,24],['0px 45px','0px 0px'],{...clamp,easing:Easing.out(Easing.cubic)})}}>
<CanvasImage src={staticFile('references/quote/v2/paper.png')} style={{width:1080,height:1920}}/>
<div style={{position:'absolute',left:192,top:412,fontFamily:'QuoteSerif',fontSize:43}}>Blue Origin · 2026.05.28</div>
<div style={{position:'absolute',left:192,top:528,width:720,height:2,background:'#8d8981'}}/>
<div style={{position:'absolute',left:195,top:650,fontFamily:'QuoteSerif',fontSize:113,lineHeight:1.04,letterSpacing:-4}}>
<div><span style={{position:'absolute',left:-43}}>“</span>We experienced</div><div>an anomaly</div><div>during today’s</div>
<div style={{position:'relative',whiteSpace:'nowrap'}}><svg width="460" height="110" style={{position:'absolute',left:-9,top:5,overflow:'visible'}}><defs><clipPath id="marker"><rect width={interpolate(f,[39,79],[0,460],clamp)} height="120"/></clipPath><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035 .1" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter></defs><g clipPath="url(#marker)"><path d="M5 10 L450 7 L455 92 L7 97Z" fill="#5581f1" opacity=".73" filter="url(#rough)"/><path d="M0 17 L455 14 L452 101 L4 105Z" fill="#416eeb" opacity=".3" filter="url(#rough)"/></g></svg><span style={{position:'relative'}}>hotfire test.”</span></div></div>
</Interactive.Div></AbsoluteFill>};
