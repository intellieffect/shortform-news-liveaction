import type {CSSProperties} from 'react';
import type {EditorialPilotData} from './pilot';
import {eventOpacity} from '../lib/editorial/timing';

/** Exact declared copy, free art direction. This is not a fixed label template.
 * globalFrame is required even outside a Sequence; never silently use local time.
 */
export const EditorialScreenText: React.FC<{
  pilot: EditorialPilotData;
  elementId: string;
  eventId: string;
  style?: CSSProperties;
  globalFrame: number;
}> = ({pilot, elementId, eventId, style, globalFrame}) => {
  if (!Number.isFinite(globalFrame)) throw new Error("화면 문구에는 전역 globalFrame이 필요하다");
  const concepts = pilot.concepts as {concepts?: {elements?: {id: string; kind: string; role: string; text?: string}[]}[]};
  const element = concepts.concepts?.flatMap(c => c.elements ?? []).find(e => e.id === elementId);
  const event = pilot.timeline.events.find(e => e.id === eventId && e.element_id === elementId);
  if (!element || element.kind !== 'text' || !element.text || !event) throw new Error(`화면 문구/사건 연결 누락: ${elementId}/${eventId}`);
  const opacity = eventOpacity(globalFrame, event);
  if (opacity <= 0) return null;
  return <div data-screen-text={elementId} data-text-role={element.role}
    style={{position: 'absolute', whiteSpace: 'pre-line', ...style, opacity: opacity * Number(style?.opacity ?? 1)}}>{element.text}</div>;
};
