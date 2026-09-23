import {Layout, LayoutProps, Txt, initial, signal} from '@motion-canvas/2d';
import {SignalValue, SimpleSignal, createComputed} from '@motion-canvas/core';
import {theme} from '../lib/theme';

export interface StatNumberProps extends LayoutProps {
  /** 애니메이션되는 값 — yield* stat().value(목표, 초) 로 굴린다 */
  value?: SignalValue<number>;
  unit?: SignalValue<string>;
  label?: SignalValue<string>;
  decimals?: SignalValue<number>;
  numberSize?: SignalValue<number>;
  /** 숫자 행 표시(카운트 시작 전 0 노출 방지용) */
  valueOpacity?: SignalValue<number>;
}

/**
 * 수치 카운터 — 숫자(강조색) + 단위 + 위 라벨.
 * 값 signal 하나를 도형(LinkedBar 등)과 공유하면 숫자·도형이 함께 움직인다.
 */
export class StatNumber extends Layout {
  @initial(0) @signal() public declare readonly value: SimpleSignal<number, this>;
  @initial('') @signal() public declare readonly unit: SimpleSignal<string, this>;
  @initial('') @signal() public declare readonly label: SimpleSignal<string, this>;
  @initial(0) @signal() public declare readonly decimals: SimpleSignal<number, this>;
  @initial(theme.h1) @signal() public declare readonly numberSize: SimpleSignal<number, this>;
  @initial(1) @signal() public declare readonly valueOpacity: SimpleSignal<number, this>;

  public constructor(props?: StatNumberProps) {
    super({layout: true, direction: 'column', alignItems: 'center', gap: 8, ...props});
    const text = createComputed(() =>
      this.value().toLocaleString('ko-KR', {
        minimumFractionDigits: this.decimals(),
        maximumFractionDigits: this.decimals(),
      }),
    );
    this.add(
      <>
        <Txt
          text={this.label}
          fontFamily={theme.fontFamily}
          fontSize={theme.h4}
          fill={theme.dim}
          opacity={() => (this.label() ? 1 : 0)}
          shadowColor={theme.shadowColor}
          shadowBlur={theme.shadowBlur}
        />
        <Layout layout direction={'row'} alignItems={'end'} gap={10} opacity={this.valueOpacity}>
          <Txt
            text={text}
            fontFamily={theme.fontFamily}
            fontWeight={800}
            fontSize={this.numberSize}
            fill={theme.accent}
            shadowColor={theme.shadowColor}
            shadowBlur={theme.shadowBlur}
          />
          <Txt
            text={this.unit}
            fontFamily={theme.fontFamily}
            fontWeight={600}
            fontSize={() => this.numberSize() * 0.45}
            fill={theme.ink}
            padding={[0, 0, 14, 0]}
            shadowColor={theme.shadowColor}
            shadowBlur={theme.shadowBlur}
          />
        </Layout>
      </>,
    );
  }
}
