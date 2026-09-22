import {registerRoot,Composition,AbsoluteFill,Interactive,interpolate,useCurrentFrame,staticFile,Easing,CanvasImage,Sequence} from 'remotion';
import {Video,Audio} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {EditorialCaptionTrack} from '../../../../../../../src/lib/editorial/visual';
import timing from './timing.json';
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFMedium.ttf'),weight:'500'});
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFBold.ttf'),weight:'700'});
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease={...clamp,easing:Easing.bezier(.45,0,.2,1)};
const source=staticFile('references/observation/v1/observation.jpg');
// Crop is always an affine transform of the untouched ESO image.
// Final source window: x=184,y=514,w=210,h=210. Original crosshair remains whole.
const Scene=()=>{const f=useCurrentFrame();const z=interpolate(f,[timing.zoomStart,timing.zoomEnd],[0,1],ease);const crop=1009+(210-1009)*z;const cx=184*z,cy=514*z;const s=880/crop;return <AbsoluteFill style={{background:'#050910',fontFamily:'GmarketSans',color:'#fff',overflow:'hidden'}}>
 <Video src={staticFile('references/observation/v1/vlt.mp4')} muted playbackRate={.8} objectFit="cover" style={{position:'absolute',left:-1370,top:0,width:3414,height:1920}}/>
 <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(3,7,12,.5),rgba(3,7,12,.4) 58%,rgba(3,7,12,.08) 75%,rgba(3,7,12,.4))'}}/>
 <Interactive.Div name="관측 자료 등장과 퇴장" style={{position:'absolute',inset:0,opacity:interpolate(f,[6,28,282,312],[0,1,1,0],clamp),translate:interpolate(f,[6,28,282,312],['0px 60px','0px 0px','0px 0px','0px -38px'],ease),scale:interpolate(f,[6,28,282,312],[.965,1,1,.985],ease),transformOrigin:'540px 740px'}}>
 <Interactive.Div name="관측 원본 연속 확대" style={{position:'absolute',left:100,top:300,width:880,height:880,overflow:'hidden',background:'#4c3000',boxShadow:'0 25px 70px rgba(0,0,0,.45)',border:'1px solid rgba(255,245,222,.36)'}}>
  <CanvasImage src={source} style={{position:'absolute',left:-cx*s,top:-cy*s,width:1009*s,height:1006*s,maxWidth:'none'}}/>
 </Interactive.Div>
 <Interactive.Div name="전체 위치 보기" style={{position:'absolute',left:742,top:110,width:238,height:237,background:'#0a0e14',border:'2px solid rgba(255,245,222,.7)',boxShadow:'0 8px 25px #0008',opacity:interpolate(f,[timing.zoomStart,timing.zoomStart+15],[0,1],clamp)}}>
  <CanvasImage src={source} style={{width:238,height:237}}/>
  <Interactive.Div name="실제 확대 영역" style={{position:'absolute',left:cx/1009*238,top:cy/1006*237,width:crop/1009*238,height:crop/1006*237,border:'2px solid #a8d2e5',boxSizing:'border-box'}}/>
 </Interactive.Div>
 </Interactive.Div>
 {timing.audio && <Sequence from={timing.audioStart}><Audio src={staticFile('references/observation/v1/narration.wav')}/></Sequence>}
 <EditorialCaptionTrack lines={timing.captions} fps={30}/>
 </AbsoluteFill>};
registerRoot(()=> <Composition id="ReferenceObservation" component={Scene} width={1080} height={1920} fps={30} durationInFrames={timing.durationFrames}/>);
