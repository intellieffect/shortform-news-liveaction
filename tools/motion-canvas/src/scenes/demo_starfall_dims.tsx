import {makeScene2D, Rect} from '@motion-canvas/2d';
import {all, createRef, createSignal, waitFor, easeInOutCubic} from '@motion-canvas/core';
import {StatNumber} from '../components/StatNumber';
import {DimensionLine} from '../components/DimensionLine';
import {LinkedBar} from '../components/LinkedBar';
import {appearSequence} from '../lib/appear';
import {theme} from '../lib/theme';

/**
 * 데모: 스타폴 제원 (facts #14~#16) — 값·도형 연동 + 순차 등장 시연.
 * ① 원통이 원반으로 눌린다(도형) ② 지름·높이 치수선이 그려진다
 * ③ 무게 카운터 0→2.1 ④ 무게 vs 화물 비교 막대(값 연동).
 * 실전 투입 시 낱말 시각은 narration.json 에서 받아 waitFor 로 치환.
 */
export default makeScene2D(function* (view) {
  // 도형: 원통 → 원반 (지름 3.1m = 620px, 높이 0.75m = 150px — 1m=200px 비례 유지)
  const bodyW = createSignal(240);
  const bodyH = createSignal(620);
  const disc = createRef<Rect>();
  view.add(
    <Rect
      ref={disc}
      width={bodyW}
      height={bodyH}
      radius={() => Math.min(bodyW(), bodyH()) / 4}
      stroke={theme.ink}
      lineWidth={theme.stroke}
      y={-360}
    />,
  );

  const dimW = createRef<DimensionLine>();
  const dimH = createRef<DimensionLine>();
  view.add(<DimensionLine ref={dimW} label={'지름 3.1m'} length={620} y={-360 + 150 / 2 + 70} progress={0} />);
  view.add(
    <DimensionLine ref={dimH} label={'높이 0.75m'} length={150} vertical y={-360} x={620 / 2 + 60} progress={0} />,
  );

  // 수치: 무게 카운터 + 화물 비교 막대 (같은 signal 이 숫자·막대를 함께 움직인다)
  const mass = createRef<StatNumber>();
  const barMass = createRef<LinkedBar>();
  const barCargo = createRef<LinkedBar>();
  const cargo = createSignal(0);
  view.add(<StatNumber ref={mass} label={'본체 무게'} unit={'톤'} decimals={1} y={60} opacity={0} />);
  view.add(<LinkedBar ref={barMass} label={'본체'} unit={'톤'} max={2.5} y={330} opacity={0} />);
  view.add(<LinkedBar ref={barCargo} label={'화물 · 양산 시'} unit={'톤'} max={2.5} accent={false} y={430} opacity={0} value={cargo} />);

  // ① 원통 → 원반
  yield* waitFor(0.3);
  yield* all(bodyW(620, 0.8, easeInOutCubic), bodyH(150, 0.8, easeInOutCubic));
  // ② 치수선 드로우 (낱말 시각 자리)
  yield* dimW().progress(1, 0.5);
  yield* dimH().progress(1, 0.5);
  // ③ 순차 등장 + 값 굴리기 — 숫자와 막대가 같은 값으로 움직인다
  yield* appearSequence([mass(), barMass(), barCargo()], 0.35);
  yield* all(
    mass().value(2.1, 0.9),
    barMass().value(2.1, 0.9),
  );
  yield* cargo(1.0, 0.7);
  yield* waitFor(0.8);
});
