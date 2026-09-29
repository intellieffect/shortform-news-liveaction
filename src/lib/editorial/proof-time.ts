import type {CompiledEvent, EditorialTimeline} from './types';

/** Freeze every shared time-based layer at the same proof frame, including hook text and underline. */
export const shiftEditorialTimeline = (timeline: EditorialTimeline, delta: number): EditorialTimeline => {
  const event = (value: CompiledEvent): CompiledEvent => ({...value,
    from: value.from + delta, settled: value.settled + delta, to: value.to + delta, end: value.end + delta,
  });
  return {...timeline,
    total_frames: timeline.total_frames + delta,
    concepts: timeline.concepts.map(value => ({...value, from:value.from + delta, end:value.end + delta})),
    events: timeline.events.map(event),
    hook_overlay: timeline.hook_overlay ? {...timeline.hook_overlay, phrases:timeline.hook_overlay.phrases.map(phrase=>({...phrase,text_event:event(phrase.text_event),underline_event:event(phrase.underline_event),...(phrase.rows ? {rows:phrase.rows.map(row=>({...row,...(row.text_event ? {text_event:event(row.text_event)} : {})}))} : {})}))} : undefined,
    attribution: timeline.attribution ? {...timeline.attribution,
      sources:timeline.attribution.sources.map(value=>({...value,from:value.from+delta,end:value.end+delta})),
      pages:timeline.attribution.pages.map(value=>({...value,from:value.from+delta,end:value.end+delta})),
    } : undefined,
    audio_cues:timeline.audio_cues.map(value=>({...value,frame:value.frame+delta})),
  };
};
