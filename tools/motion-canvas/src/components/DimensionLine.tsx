import {Layout, LayoutProps, Line, Txt, initial, signal} from '@motion-canvas/2d';
import {SignalValue, SimpleSignal} from '@motion-canvas/core';
import {theme} from '../lib/theme';

export interface DimensionLineProps extends LayoutProps {
  /** 치수선 길이(px) — 잰 대상의 픽셀 길이와 맞춘다 */
  length?: SignalValue<number>;
  label?: SignalValue<string>;
  vertical?: SignalValue<boolean>;
  /** 0→1 로 굴리면 선이 그려지고 라벨이 떠오른다 */
  progress?: SignalValue<number>;
  /** 라벨 위치 재정의 (기본: 가로 [0,-44] / 세로 [46,0] 회전 90°) */
  labelPosition?: SignalValue<[number, number] | null>;
  labelRotation?: SignalValue<number | null>;
  strokeWidth?: SignalValue<number>;
  arrowSize?: SignalValue<number>;
}

/**
 * 치수선 — 양끝 화살표 + 중앙 라벨(지름·높이·폭·거리).
 * progress 를 0→1 로 애니메이션하면 선이 자라며 등장.
 */
export class DimensionLine extends Layout {
  @initial(300) @signal() public declare readonly length: SimpleSignal<number, this>;
  @initial('') @signal() public declare readonly label: SimpleSignal<string, this>;
  @initial(false) @signal() public declare readonly vertical: SimpleSignal<boolean, this>;
  @initial(1) @signal() public declare readonly progress: SimpleSignal<number, this>;
  @initial(null) @signal() public declare readonly labelPosition: SimpleSignal<[number, number] | null, this>;
  @initial(null) @signal() public declare readonly labelRotation: SimpleSignal<number | null, this>;
  @initial(4) @signal() public declare readonly strokeWidth: SimpleSignal<number, this>;
  @initial(14) @signal() public declare readonly arrowSize: SimpleSignal<number, this>;

  public constructor(props?: DimensionLineProps) {
    super({...props});
    const half = () => (this.length() * this.progress()) / 2;
    this.add(
      <>
        <Line
          points={() =>
            this.vertical()
              ? [[0, -half()], [0, half()]]
              : [[-half(), 0], [half(), 0]]
          }
          stroke={theme.ink}
          shadowColor={theme.shadowColor}
          shadowBlur={theme.shadowBlur}
          lineWidth={this.strokeWidth}
          startArrow
          endArrow
          arrowSize={this.arrowSize}
          opacity={() => (this.progress() > 0.05 ? 1 : 0)}
        />
        <Txt
          text={this.label}
          fontFamily={theme.fontFamily}
          fontWeight={700}
          fontSize={theme.h3}
          fill={theme.accent}
          opacity={() => Math.max(0, (this.progress() - 0.6) / 0.4)}
          position={() => this.labelPosition() ?? (this.vertical() ? [46, 0] : [0, -44])}
          rotation={() => this.labelRotation() ?? (this.vertical() ? 90 : 0)}
          shadowColor={theme.shadowColor}
          shadowBlur={theme.shadowBlur}
        />
      </>,
    );
  }
}
