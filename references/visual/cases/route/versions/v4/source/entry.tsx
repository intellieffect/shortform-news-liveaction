import {AbsoluteFill,Composition,registerRoot,staticFile} from 'remotion';
import {Audio,Video} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {EditorialCaptionTrack} from '../../../../../../../src/lib/editorial/visual';
import timing from './timing.json';
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFMedium.ttf'),weight:'500'});
void loadFont({family:'GmarketSans',url:staticFile('fonts/GmarketSansTTFBold.ttf'),weight:'700'});
const footer={position:'absolute',left:80,right:80,bottom:120,fontFamily:'GmarketSans',fontSize:27,lineHeight:1.45,color:'#e6eef0',textShadow:'0 2px 8px #00121d'} as const;
const Visual=()=> <AbsoluteFill style={{background:'#031f29'}}>
 <Video src={staticFile('references/route/v4/06-generated-unified-v3.mp4')} trimBefore={33} playbackRate={1.25} muted style={{width:1080,height:1920,objectFit:'cover'}}/>
 <div style={footer}>개념도 · 축척 아님</div>
</AbsoluteFill>;
const Scene=()=> <AbsoluteFill><Visual/><Audio src={staticFile('references/route/v4/6-narration-polish-v2.wav')}/><EditorialCaptionTrack lines={timing.captions} fps={30}/></AbsoluteFill>;
registerRoot(()=> <Composition id="ReferenceRoute" component={Scene} width={1080} height={1920} fps={30} durationInFrames={timing.frames}/>);
