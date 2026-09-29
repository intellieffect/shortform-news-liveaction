import {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useDelayRender} from 'remotion';
import type {EditorialTimeline} from './types';

export const AttributionTrack: React.FC<{attribution:EditorialTimeline['attribution']}> = ({attribution}) => {
  const frame=useCurrentFrame();
  const ref=useRef<HTMLDivElement>(null);
  const {delayRender,continueRender,cancelRender}=useDelayRender();
  const page=attribution?.pages.find(p=>frame>=p.from && frame<p.end);
  const cue=attribution?.sources.find(c=>frame>=c.from && frame<c.end);
  useLayoutEffect(()=>{
    if (!ref.current) return;
    const handle=delayRender('출처·크레딧 넘침 검사');
    let active=true;
    void document.fonts.ready.then(()=>{
      if (!active) return;
      const node=ref.current;
      if (node && (node.scrollWidth>node.clientWidth+1 || node.scrollHeight>node.clientHeight+1)) cancelRender(new Error('[attribution-overflow] 글자를 줄이거나 출처를 생략하지 말고 줄/페이지를 나눈다'));
      else continueRender(handle);
    });
    return ()=>{active=false;continueRender(handle);};
  },[page,cue,delayRender,continueRender,cancelRender]);
  if (!attribution) return null;
  if (page) {
    const s=attribution.style.end;
    return <AbsoluteFill style={{background:s.background}}><div ref={ref} style={{position:'absolute',left:s.left,top:s.top,width:s.width,height:s.height,color:s.color,fontFamily:'GmarketSans',fontSize:s.font_size,lineHeight:`${s.line_height}px`,textAlign:'left',overflowWrap:'anywhere'}}>
      {page.categories.map((c,i)=><div key={i} style={{marginBottom:s.category_gap}}><div style={{fontWeight:700}}>{c.title}</div>{c.lines.map((line,j)=><div key={j} style={{whiteSpace:'pre-wrap'}}>{line}</div>)}</div>)}
    </div></AbsoluteFill>;
  }
  if (!cue) return null;
  const s=attribution.style.source;
  return <div ref={ref} style={{position:'absolute',left:s.left,top:s.top,width:s.width,maxHeight:s.line_height*2,padding:'0 12px',boxSizing:'border-box',color:s.color,fontFamily:'GmarketSans',fontWeight:500,fontSize:s.font_size,lineHeight:`${s.line_height}px`,whiteSpace:'pre-line',wordBreak:'keep-all',textAlign:'left',textShadow:s.shadow}}>{cue.text}</div>;
};
