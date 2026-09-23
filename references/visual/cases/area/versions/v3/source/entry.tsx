import {AbsoluteFill, CanvasImage, Composition, Easing, Interactive, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {loadFont} from '@remotion/fonts';
import {EditorialCaptionTrack} from '../../../../../../../src/lib/editorial/visual';
import timing from './timing.json';

void loadFont({family: 'GmarketSans', url: staticFile('fonts/GmarketSansTTFMedium.ttf'), weight: '500'});
void loadFont({family: 'GmarketSans', url: staticFile('fonts/GmarketSansTTFBold.ttf'), weight: '700'});

void loadFont({family: 'Pretendard', url: staticFile('fonts/Pretendard-Bold.otf'), weight: '700'});
void loadFont({family: 'Pretendard', url: staticFile('fonts/Pretendard-Regular.otf'), weight: '400'});

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = {...clamp, easing: Easing.bezier(.22, .8, .25, 1)};
// Exact relative area: 900² / 90² = 100. The unit IS grid cell (4, 4).
const FIELD = {x: 90, y: 495, side: 900};
const UNIT = {x: 450, y: 855, side: 90};
const CX = UNIT.x + UNIT.side / 2;
const CY = UNIT.y + UNIT.side / 2;

export const RomanAreaV3 = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [92, 124], [0, 1], easeOut);
  const side = UNIT.side + (FIELD.side - UNIT.side) * progress;
  const x = UNIT.x + (FIELD.x - UNIT.x) * progress;
  const y = UNIT.y + (FIELD.y - UNIT.y) * progress;

  return <AbsoluteFill style={{backgroundColor: '#02060c', fontFamily: 'Pretendard', color: '#fff8eb'}}>
    {/* Static framing throughout: no background pan, zoom, scale or resolution change. */}
    <CanvasImage src={staticFile('references/area/v3/galaxy-clean.png')}
      style={{position: 'absolute', width: 1188, height: 2112, left: -99, top: -56}} />
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <mask id="revealed-field">
          <rect width={1080} height={1920} fill="white" />
          <rect x={x} y={y} width={side} height={side} fill="black" />
        </mask>
        <mask id="outside-unit">
          <rect width={1080} height={1920} fill="white" />
          <rect x={UNIT.x} y={UNIT.y} width={UNIT.side} height={UNIT.side} fill="black" />
        </mask>
      </defs>
      <rect width={1080} height={1920} fill="#02060c" opacity={.80} mask="url(#revealed-field)" />
    </svg>

    <Interactive.Div name="Area reveal boundary" style={{position: 'absolute', left: x, top: y, width: side, height: side,
      boxSizing: 'border-box', border: '4px solid #a5dfef',
      opacity: interpolate(frame, [92, 98], [0, 1], clamp)}} />

    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0,
      opacity: interpolate(frame, [124, 136, 195, 225], [0, 1, 1, 0], clamp)}}>
      <g stroke="#b4e6f5" strokeWidth={2} strokeOpacity={.53} mask="url(#outside-unit)">
        {Array.from({length: 9}, (_, i) => <g key={i}>
          <line x1={FIELD.x + (i + 1) * UNIT.side} y1={FIELD.y} x2={FIELD.x + (i + 1) * UNIT.side} y2={FIELD.y + FIELD.side} />
          <line x1={FIELD.x} y1={FIELD.y + (i + 1) * UNIT.side} x2={FIELD.x + FIELD.side} y2={FIELD.y + (i + 1) * UNIT.side} />
        </g>)}
      </g>
    </svg>

    <Interactive.Div name="Preserved unit area" style={{position: 'absolute', left: UNIT.x, top: UNIT.y,
      width: UNIT.side, height: UNIT.side, boxSizing: 'border-box', border: '4px solid #fff5df',
      backgroundColor: '#fff0ce0d',
      opacity: interpolate(frame, [0, 12], [.3, 1], clamp)}} />
    <Interactive.Div name="Unit emphasis on spoken one" style={{position: 'absolute', left: UNIT.x - 1, top: UNIT.y - 1,
      width: UNIT.side + 2, height: UNIT.side + 2, boxSizing: 'border-box', border: '2px solid #fff9ed',
      boxShadow: '0 0 20px #fff0cc88',
      opacity: interpolate(frame, [59, 65, 79], [0, .9, 0], clamp)}} />

    <Interactive.Div name="One enters at spoken one" style={{position: 'absolute', left: CX - 55, top: CY - 133,
      width: 110, height: 72, textAlign: 'center', fontSize: 72, lineHeight: '72px', fontWeight: 700,
      textShadow: '0 2px 14px #02060c, 0 0 5px #02060c',
      opacity: interpolate(frame, [59, 66, 195, 225], [0, 1, 1, 0], clamp),
      translate: interpolate(frame, [59, 69], ['0px 9px', '0px 0px'], easeOut)}}>1</Interactive.Div>

    <Interactive.Div name="Hundred appears and settles with expansion" style={{position: 'absolute', left: 140, top: FIELD.y - 141,
      width: 800, height: 110, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 16,
      color: '#b0e5f5', fontWeight: 700, lineHeight: '110px', textShadow: '0 3px 18px #02060c',
      opacity: interpolate(frame, [117, 124, 195, 225], [0, 1, 1, 0], clamp),
      scale: interpolate(frame, [117, 124, 132], [.86, 1.035, 1], clamp),
      translate: interpolate(frame, [117, 124], ['0px 14px', '0px 0px'], easeOut)}}>
      <span style={{fontSize: 58, fontWeight: 400}}>약</span>
      <span style={{fontSize: 104, letterSpacing: -3}}>100배</span>
    </Interactive.Div>
    <EditorialCaptionTrack lines={timing.captions} fps={30} />
    <Audio src={staticFile('references/area/v3/original-audio.m4a')} />
  </AbsoluteFill>;
};

registerRoot(() => <Composition id="ReferenceAreaV3" component={RomanAreaV3}
  width={1080} height={1920} fps={30} durationInFrames={300} />);
