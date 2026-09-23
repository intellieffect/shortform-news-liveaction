import {Circle, Layout, LayoutProps, Line, Txt, initial, signal} from '@motion-canvas/2d';
import {SignalValue, SimpleSignal, Vector2} from '@motion-canvas/core';
import {theme} from '../lib/theme';

export interface LineGraphProps extends LayoutProps {
  /** 데이터 [[x,y],…] — 정규화 전 원값 */
  data?: SignalValue<[number, number][]>;
  graphWidth?: SignalValue<number>;
  graphHeight?: SignalValue<number>;
  /** 0→1: 선이 왼쪽부터 그려지고 포인트가 선 끝을 따라 이동 */
  progress?: SignalValue<number>;
  xLabel?: SignalValue<string>;
  yLabel?: SignalValue<string>;
}

/**
 * 라인 그래프 — 축 2개 + 데이터 폴리라인(end 로 드로우) + 선두 포인트.
 * progress 0→1 로 굴리면 "선이 그려지는" 애니메이션. 눈금·격자는 넣지 않는다(숏폼 최소주의).
 */
export class LineGraph extends Layout {
  @initial([]) @signal() public declare readonly data: SimpleSignal<[number, number][], this>;
  @initial(700) @signal() public declare readonly graphWidth: SimpleSignal<number, this>;
  @initial(420) @signal() public declare readonly graphHeight: SimpleSignal<number, this>;
  @initial(0) @signal() public declare readonly progress: SimpleSignal<number, this>;
  @initial('') @signal() public declare readonly xLabel: SimpleSignal<string, this>;
  @initial('') @signal() public declare readonly yLabel: SimpleSignal<string, this>;

  private points(): Vector2[] {
    const d = this.data();
    if (d.length === 0) return [new Vector2(0, 0)];
    const xs = d.map(p => p[0]), ys = d.map(p => p[1]);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const w = this.graphWidth(), h = this.graphHeight();
    return d.map(([x, y]) => new Vector2(
      ((x - x0) / (x1 - x0 || 1)) * w - w / 2,
      h / 2 - ((y - y0) / (y1 - y0 || 1)) * h,
    ));
  }

  public constructor(props?: LineGraphProps) {
    super({...props});
    const w = () => this.graphWidth(), h = () => this.graphHeight();
    this.add(
      <>
        {/* 축 */}
        <Line points={() => [[-w() / 2, -h() / 2], [-w() / 2, h() / 2], [w() / 2, h() / 2]]}
              stroke={theme.guide} lineWidth={4} />
        <Txt text={this.xLabel} fontSize={36} fill={theme.dim} fontFamily={theme.fontFamily}
             position={() => [w() / 2 - 20, h() / 2 + 40]} />
        <Txt text={this.yLabel} fontSize={36} fill={theme.dim} fontFamily={theme.fontFamily}
             position={() => [-w() / 2, -h() / 2 - 40]} />
        {/* 데이터 라인 — end 로 드로우 */}
        <Line points={() => this.points()} stroke={theme.accent} lineWidth={theme.stroke}
              radius={8} end={this.progress} lineCap={'round'} />
        {/* 선두 포인트 */}
        <Circle
          size={26}
          fill={theme.accent}
          opacity={() => (this.progress() > 0 ? 1 : 0)}
          position={() => {
            const pts = this.points();
            const t = this.progress() * (pts.length - 1);
            const i = Math.min(Math.floor(t), pts.length - 2);
            const f = t - i;
            return pts.length < 2 ? pts[0] : Vector2.lerp(pts[i], pts[i + 1], f);
          }}
        />
      </>,
    );
  }
}
