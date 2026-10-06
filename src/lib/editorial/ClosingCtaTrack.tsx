import {Interactive, interpolate, useCurrentFrame} from 'remotion';
import type {EditorialTimeline} from './types';

/** 마지막 CTA 알약(closing-cta@1). 공통 레이어 — 장면 코드에 넣지 않는다. 말자막은 그대로 둔다. */
export const ClosingCtaTrack: React.FC<{cta: EditorialTimeline['closing_cta']}> = ({cta}) => {
  const frame = useCurrentFrame();
  if (!cta || frame < cta.from || frame >= cta.end) return null;
  const s = cta.style;
  const enter = interpolate(frame, [cta.from, cta.from + s.enter_frames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const exit = interpolate(frame, [cta.end - s.exit_frames, cta.end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opacity = Math.min(enter, exit);
  return <Interactive.Div name="closing cta" data-closing-cta style={{
    position: 'absolute', left: s.center_x - s.max_width / 2, top: s.center_y, width: s.max_width,
    translate: `0 calc(-50% + ${(1 - enter) * 16}px)`, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity,
  }}>
    <div style={{
      padding: `${s.padding_y}px ${s.padding_x}px`, borderRadius: s.radius, background: s.background, border: `${s.outline_px}px solid ${s.color}`,
      color: s.color, fontFamily: 'GmarketSans', fontWeight: s.font_weight,
      fontSize: s.font_size, lineHeight: 1.2, whiteSpace: 'nowrap', textAlign: 'center',
    }}>{cta.text}</div>
  </Interactive.Div>;
};
