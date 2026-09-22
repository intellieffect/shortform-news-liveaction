import {registerRoot,Composition,AbsoluteFill,Interactive,interpolate,useCurrentFrame,staticFile,Easing,Img,Sequence} from 'remotion';
import {Video,Audio} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {EditorialCaptionTrack} from '../../../../../../../src/lib/editorial/visual';
import timing from './timing.json';
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFMedium.ttf'),weight:'500'});
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFBold.ttf'),weight:'700'});
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease={...clamp,easing:Easing.bezier(.3,0,.2,1)};
// Freeze one real ESO sky frame. Linear-light additive veiling changes sky background,
// not individual stars; the .25 display exposure gain is fixed in both states.
const StarField=({p}:{p:number})=><svg width="1080" height="1320" viewBox="0 0 1080 1320"><defs><filter id="skyLight" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="linearRGB"><feComponentTransfer><feFuncR type="linear" slope=".25" intercept={.12*p}/><feFuncG type="linear" slope=".25" intercept={.14*p}/><feFuncB type="linear" slope=".25" intercept={.18*p}/></feComponentTransfer></filter></defs><image href={staticFile('references/scattering/v1/sky-source.png')} x="-1300" y="-70" width="3840" height="2160" filter="url(#skyLight)"/></svg>;
const Scene=()=>{const f=useCurrentFrame();const sky=interpolate(f,timing.brighten,[0,1],ease);return <AbsoluteFill style={{background:'#050a13',fontFamily:'GmarketSans',color:'#f8f2e7',overflow:'hidden'}}>
 <Video src={staticFile('references/scattering/v1/vlt.mp4')} muted playbackRate={.8} objectFit="cover" style={{position:'absolute',left:-1370,top:0,width:3414,height:1920,filter:'brightness(.7)'}}/>
 <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(2,7,17,.73),rgba(3,8,19,.58) 58%,rgba(3,7,12,.08) 78%,rgba(3,7,12,.3))'}}/>
 <Interactive.Div name="Higgsfield 반사와 산란 영상" style={{position:'absolute',inset:0,opacity:interpolate(f,[5,24,...timing.transition],[0,1,1,0],clamp)}}>
  {f<62 ? <>
   <Img src={staticFile('references/scattering/v1/frames/0032.png')} style={{position:'absolute',inset:0,width:1080,height:1920,clipPath:'inset(700px 0 0 0)'}}/>
   <div style={{position:'absolute',inset:0,height:700,overflow:'hidden'}}>
   <Img src={staticFile('references/scattering/v1/frames/0001.png')} style={{position:'absolute',inset:0,width:1080,height:1920,clipPath:`inset(0 ${1080-interpolate(f,[27,55],[1080,0],clamp)}px 0 0)`}}/>
   <Img src={staticFile('references/scattering/v1/frames/0032.png')} style={{position:'absolute',inset:0,width:1080,height:1920,clipPath:`inset(0 0 0 ${interpolate(f,[27,55],[1080,0],clamp)}px)`}}/>
   </div>
  </> : <Img src={staticFile(`references/scattering/v1/frames/${String(Math.round(interpolate(f,[62,75,105,148],[32,45,85,150],clamp))).padStart(4,'0')}.png`)} style={{position:'absolute',inset:0,width:1080,height:1920}}/>}
  <Interactive.Div name="대기 위치" style={{position:'absolute',left:95,top:850,fontSize:44,color:'#e7f5ff',textShadow:'0 2px 6px #0008',opacity:interpolate(f,[80,94],[0,1],clamp)}}>대기</Interactive.Div>
 </Interactive.Div>
 <Interactive.Div name="같은 별의 대비 변화" style={{position:'absolute',left:0,top:0,width:1080,height:1320,overflow:'hidden',maskImage:'linear-gradient(180deg,#000 0%,#000 80%,transparent 100%)',opacity:interpolate(f,[timing.transition[0],timing.transition[1],...timing.exit],[0,1,1,0],clamp)}}><StarField p={sky}/></Interactive.Div>
 {timing.audio && <Sequence from={timing.audioStart}><Audio src={staticFile('references/scattering/v1/narration.wav')}/></Sequence>}
 <EditorialCaptionTrack lines={timing.captions} fps={30}/>
 </AbsoluteFill>};
registerRoot(()=> <Composition id="ReferenceScatteringMotionGraphic" component={Scene} width={1080} height={1920} fps={30} durationInFrames={timing.durationFrames}/>);
