import {useLayoutEffect, useRef} from 'react';
import {Interactive, useCurrentFrame, useDelayRender} from 'remotion';
import type {EditorialTimeline} from './types';
import {eventOpacity, eventProgress} from './timing';
type HookStyle = NonNullable<EditorialTimeline['hook_overlay']>['style'];

type Phrase = NonNullable<EditorialTimeline['hook_overlay']>['phrases'][number];

const HookPhrase: React.FC<{phrase: Phrase; frame: number; hookStyle: HookStyle}> = ({phrase, frame, hookStyle}) => {
  const ref = useRef<HTMLDivElement>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const s = {...hookStyle, ...phrase.layout};
  const visible = frame >= phrase.text_event.from && frame < phrase.text_event.end;
  useLayoutEffect(() => {
    if (!visible || !ref.current) return;
    const handle = delayRender('후킹 문구 넘침 검사');
    let active = true;
    void document.fonts.ready.then(() => {
      if (!active) return;
      const node = ref.current;
      if (node && (node.scrollWidth > node.clientWidth + 1 || s.center_y - node.offsetHeight / 2 < 0 || s.center_y + node.offsetHeight / 2 > 1920)) {
        cancelRender(new Error(`[hook-overflow] ${phrase.id}: 문구/줄바꿈/폭을 조정한다. 글자를 자동 축소하지 않는다`));
      } else continueRender(handle);
    });
    return () => {active = false; continueRender(handle);};
  }, [visible, phrase.id, s.width, s.font_size, s.center_y, phrase.text, delayRender, continueRender, cancelRender]);
  if (!visible) return null;
  return <Interactive.Div ref={ref} name={`hook ${phrase.id}`} data-hook-overlay={phrase.id} style={{
    position: 'absolute', left: hookStyle.center_x - s.width / 2, top: s.center_y,
    width: s.width, translate: '0 -50%', textAlign: 'center', pointerEvents: 'none',
    color: s.text_color, fontFamily: hookStyle.font_family, fontWeight: 700,
    fontSize: s.font_size, lineHeight: hookStyle.line_height, whiteSpace: 'pre-line', wordBreak: 'keep-all',
    textShadow: s.shadow, opacity: eventOpacity(frame, phrase.text_event),
  }}>
    <span style={{display: 'inline-block', maxWidth: '100%'}}>
      {phrase.text}
      <Interactive.Div name={`hook underline ${phrase.id}`} style={{
        height: hookStyle.underline_height, marginTop: hookStyle.underline_gap,
        backgroundColor: hookStyle.underline_color, boxShadow: s.shadow,
        scale: `${eventProgress(frame, phrase.underline_event)} 1`, transformOrigin: 'center',
        opacity: eventOpacity(frame, phrase.underline_event),
      }} />
    </span>
  </Interactive.Div>;
};

/** A separate shared layer; never suppresses the spoken caption track. */
export const HookOverlayTrack: React.FC<{hook: EditorialTimeline['hook_overlay']}> = ({hook}) => {
  const frame = useCurrentFrame();
  return <>{hook?.phrases.map(phrase => <HookPhrase key={phrase.id} phrase={phrase} frame={frame} hookStyle={hook.style} />)}</>;
};
