import {AbsoluteFill,Composition,Sequence,registerRoot,staticFile,useCurrentFrame} from 'remotion';
import {Audio,Video} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {EditorialCaptionTrack} from '../../../../../../../src/lib/editorial/visual';
import timing from './timing.json';
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFMedium.ttf'),weight:'500'});
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFBold.ttf'),weight:'700'});
const footer={position:'absolute',left:80,right:80,bottom:120,fontFamily:'GmarketSans',fontSize:27,lineHeight:1.45,color:'#e6eef0',textShadow:'0 2px 8px #00121d'} as const;
const Visual=()=>{const f=useCurrentFrame();return <AbsoluteFill style={{background:'#160d08',overflow:'hidden'}}>
 <Sequence durationInFrames={56}><Video src={staticFile('references/match-cut/v2/coffee.mp4')} trimBefore={64} muted style={{position:'absolute',width:3640.89,height:1920,maxWidth:'none',left:-1173.33,top:0}}/></Sequence>
 <Sequence from={56} durationInFrames={186}><Video src={staticFile('references/match-cut/v2/solar.mp4')} muted style={{position:'absolute',width:1623.79,height:1920,maxWidth:'none',left:-304.49,top:0}}/></Sequence>
 <div style={footer}>{f<56?'Engin Akyurt / Pexels':'착색 관측 · NSF/NSO/AURA/MPS · CC BY 4.0'}</div>
</AbsoluteFill>};
const Scene=()=> <AbsoluteFill><Visual/><Audio src={staticFile('references/match-cut/v2/8-narration.wav')}/><EditorialCaptionTrack lines={timing.captions} fps={30}/></AbsoluteFill>;
registerRoot(()=> <Composition id="ReferenceMatchCut" component={Scene} width={1080} height={1920} fps={30} durationInFrames={timing.frames}/>);
