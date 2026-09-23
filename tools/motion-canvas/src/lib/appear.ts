import {all, delay, ThreadGenerator} from '@motion-canvas/core';
import {Node} from '@motion-canvas/2d';

/**
 * 순차 등장 — 숏폼 규칙: 한 화면에 다 깔지 않고 핵심 요소를 하나씩.
 * 각 노드를 opacity 0→1 + y +24→0 으로 stepGap 간격 등장.
 * 사용 전 노드는 opacity(0) 초기화 필요.
 */
export function* appearSequence(
  nodes: Node[],
  stepGap = 0.4,
  duration = 0.35,
): ThreadGenerator {
  yield* all(
    ...nodes.map((n, i) =>
      delay(i * stepGap, (function* () {
        const y = n.position.y();
        n.position.y(y + 24);
        yield* all(n.opacity(1, duration), n.position.y(y, duration));
      })()),
    ),
  );
}
