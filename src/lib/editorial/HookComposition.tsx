import {useLayoutEffect, useRef} from 'react';
import {Interactive, useDelayRender} from 'remotion';
import type {EditorialTimeline} from './types';
import {eventOpacity, eventProgress} from './timing';

type Hook = NonNullable<EditorialTimeline['hook_overlay']>;
type Phrase = Hook['phrases'][number];

/** Authored rows have their own geometry. Invisible rows retain their space. */
export const AuthoredHookPhrase: React.FC<{phrase: Phrase; frame: number; hookStyle: Hook['style']}> = ({phrase, frame, hookStyle}) => {
  const ref = useRef<HTMLDivElement>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const visible = frame >= phrase.text_event.from && frame < phrase.text_event.end;
  const width = phrase.layout?.width ?? NaN;
  const centerY = phrase.layout?.center_y ?? NaN;
  const shadow = phrase.layout?.shadow ?? hookStyle.shadow;
  useLayoutEffect(() => {
    if (!visible || !ref.current) return;
    const handle = delayRender('후킹 조판 폰트·실제 경계 검사');
    let active = true;
    const check = async () => {
      for (const row of phrase.rows ?? []) for (const run of row.runs) {
        const faces = await document.fonts.load(`${run.font_weight} ${run.font_size}px "${run.font_family}"`, run.text);
        if (!active) return;
        if (!faces.length) throw new Error(`[hook-font] ${phrase.id}: ${run.font_family}/${run.font_weight} 로드 실패`);
      }
      await document.fonts.ready;
      if (!active || !ref.current) return;
      const box = ref.current.getBoundingClientRect();
      const nodes = [...ref.current.querySelectorAll<HTMLElement>('[data-hook-run], [data-hook-underline]')];
      // Remotion can mount the composition offscreen during metadata selection.
      // Convert DOM bounds to composition-local coordinates, not viewport coordinates.
      const scale = box.width / width;
      const top = centerY - ref.current.offsetHeight / 2;
      if (!Number.isFinite(width) || !Number.isFinite(centerY) || scale <= 0 ||
        top < 0 || top + ref.current.offsetHeight > 1920 || nodes.some(node => {
          const r = node.getBoundingClientRect();
          return r.left < box.left - scale || r.right > box.right + scale ||
            top + (r.top - box.top) / scale < -1 || top + (r.bottom - box.top) / scale > 1921;
        })) throw new Error(`[hook-overflow] ${phrase.id}: 줄 구성·서체·간격·배치를 조정한다. 자동 축소하지 않는다`);
      continueRender(handle);
    };
    void check().catch((error: unknown) => {if (active) cancelRender(error instanceof Error ? error : new Error(String(error)));});
    return () => {active = false; continueRender(handle);};
  }, [visible, phrase.id, phrase.rows, width, centerY, delayRender, continueRender, cancelRender]);
  if (!visible) return null;
  return <Interactive.Div ref={ref} name={`hook composition ${phrase.id}`} data-hook-overlay={phrase.id} data-hook-composition style={{
    position: 'absolute', left: hookStyle.center_x - width / 2, top: centerY,
    width, display: 'flex', flexDirection: 'column', translate: '0 -50%', pointerEvents: 'none', textShadow: shadow,
    fontSize: 0, lineHeight: 0,
  }}>
    {phrase.rows?.map((row, index) => <Interactive.Div key={index} name={`hook row ${phrase.id} ${index}`} data-hook-row={index} style={{
      display: 'flex', flexShrink: 0, justifyContent: row.align === 'left' ? 'flex-start' : row.align === 'right' ? 'flex-end' : 'center',
      alignItems: 'baseline', height: row.line_height, marginBottom: row.gap_after,
      paddingBottom: row.runs.some(run => run.underline) ? hookStyle.underline_gap + hookStyle.underline_height : 0,
      boxSizing: 'content-box', whiteSpace: 'pre',
      opacity: eventOpacity(frame, row.text_event ?? phrase.text_event),
    }}>
      {row.runs.map((run, runIndex) => <Interactive.Div key={runIndex} name={`hook run ${phrase.id} ${index} ${runIndex}`} data-hook-run data-hook-role={run.role} data-hook-underline-target={run.underline || undefined} style={{
        display: 'inline-block', position: 'relative', flexShrink: 0,
        fontFamily: run.font_family, fontWeight: run.font_weight, fontSize: run.font_size,
        letterSpacing: run.letter_spacing, lineHeight: 1, color: run.text_color,
      }}>
        {run.text}
        {run.underline ? <Interactive.Div name={`hook underline ${phrase.id}`} data-hook-underline style={{
          position: 'absolute', left: 0, right: 0, bottom: -hookStyle.underline_gap - hookStyle.underline_height,
          height: hookStyle.underline_height, backgroundColor: hookStyle.underline_color, boxShadow: shadow,
          scale: `${eventProgress(frame, phrase.underline_event)} 1`, transformOrigin: 'center',
          opacity: eventOpacity(frame, phrase.underline_event),
        }} /> : null}
      </Interactive.Div>)}
    </Interactive.Div>)}
  </Interactive.Div>;
};
