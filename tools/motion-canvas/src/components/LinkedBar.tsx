import {Layout, LayoutProps, Rect, Txt, initial, signal} from '@motion-canvas/2d';
import {SignalValue, SimpleSignal} from '@motion-canvas/core';
import {theme} from '../lib/theme';

export interface LinkedBarProps extends LayoutProps {
  /** 도형과 숫자가 공유하는 값 — max 대비 비율로 막대 길이가 정해진다 */
  value?: SignalValue<number>;
  max?: SignalValue<number>;
  barWidth?: SignalValue<number>;
  label?: SignalValue<string>;
  unit?: SignalValue<string>;
  decimals?: SignalValue<number>;
  accent?: SignalValue<boolean>;
  valueOpacity?: SignalValue<number>;
}

/**
 * 값-연동 막대 — 숫자와 막대 길이가 같은 signal 로 움직인다.
 * 비교(A vs B)는 LinkedBar 두 개에 같은 max 를 주면 면적 비례가 성립.
 */
export class LinkedBar extends Layout {
  @initial(0) @signal() public declare readonly value: SimpleSignal<number, this>;
  @initial(100) @signal() public declare readonly max: SimpleSignal<number, this>;
  @initial(560) @signal() public declare readonly barWidth: SimpleSignal<number, this>;
  @initial('') @signal() public declare readonly label: SimpleSignal<string, this>;
  @initial('') @signal() public declare readonly unit: SimpleSignal<string, this>;
  @initial(1) @signal() public declare readonly decimals: SimpleSignal<number, this>;
  @initial(true) @signal() public declare readonly accent: SimpleSignal<boolean, this>;
  @initial(1) @signal() public declare readonly valueOpacity: SimpleSignal<number, this>;

  public constructor(props?: LinkedBarProps) {
    super({layout: true, direction: 'column', gap: 10, ...props});
    this.add(
      <>
        <Layout layout direction={'row'} justifyContent={'space-between'} width={this.barWidth}>
          <Txt text={this.label} fontFamily={theme.fontFamily} fontSize={theme.h4} fill={theme.ink} />
          <Txt
            opacity={this.valueOpacity}
            text={() =>
              `${this.value().toLocaleString('ko-KR', {
                minimumFractionDigits: this.decimals(),
                maximumFractionDigits: this.decimals(),
              })}${this.unit()}`
            }
            fontFamily={theme.fontFamily}
            fontWeight={800}
            fontSize={theme.h4}
            fill={() => (this.accent() ? theme.accent : theme.ink)}
          />
        </Layout>
        <Rect width={this.barWidth} height={16} radius={8} fill={theme.guide}>
          <Rect
            width={() => Math.max(0, Math.min(1, this.value() / this.max())) * this.barWidth()}
            height={16}
            radius={8}
            fill={() => (this.accent() ? theme.accent : theme.ink)}
            layout={false}
            x={() => (Math.max(0, Math.min(1, this.value() / this.max())) * this.barWidth()) / 2 - this.barWidth() / 2}
          />
        </Rect>
      </>,
    );
  }
}
