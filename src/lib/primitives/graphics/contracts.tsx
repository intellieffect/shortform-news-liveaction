// 도해 색 계약 · 공용 헬퍼 · 타입 — **부품 파일들이 공유하는 것만** 둔다.
// 부품은 파일 하나씩(2026-09-03 분리) — 여러 에이전트가 동시에 새 부품을 쓸 수 있게.
// ── 밝은 실사 위 도해 색 계약 (5편 2026-09-01) ────────────────────────────────
// 4편의 슬레이트 계약(#3E4C5A/#242E38/#1B232B)은 **검은 우주 배경**용이다. 태양 표면처럼
// 밝고 고대비·고주파인 배경 위에서는 그 면색이 그대로 묻힌다 — 도해가 스스로 대비를 만들어야 한다.
// 3겹: 어두운 테두리로 배경과 분리 → 어두운 코어로 부피 → 밝은 하이라이트로 광원 방향.
// (Motion Canvas 는 같은 문제를 theme.shadowColor/shadowBlur 로 푼다 — input tools/motion-canvas/src/lib/theme.ts)
export const BRIGHT_TUBE = {
  outline: "rgba(6,8,13,0.85)", // 테두리 — 배경이 무엇이든 도해 경계를 만든다
  core: "#221A12",              // 코어 — 채도 낮은 갈흑, 주황 배경과 같은 계열이라 이물감이 없다
  coreHot: "#7A4E12",           // 강조 가닥의 코어
  highlight: "#F2ECE2",         // 하이라이트 — 흰색(#FFF)이 아니라 아이보리(밝은 배경에서 흰색은 날아간다)
  scrim: "rgba(4,6,10,0.9)",    // 국소 스크림 중심색
} as const;

export type GraphicSpec = { id: string; in?: number; props: Record<string, unknown> };

export const SPACE_TUBE = {
  outline: "rgba(4,7,14,0.90)", // 별밭 위에서 도해 경계를 만든다
  core: "#26313E",              // 슬레이트 코어(4편 #242E38 계열)
  highlight: "#E8EEF7",         // 하이라이트 — 순백은 별과 섞인다
} as const;

export const DEG = Math.PI / 180;
/** 초 → 프레임. **길이는 1 프레임 아래로 못 내려간다** — 0 이면 interpolate 가
 *  "inputRange must be strictly monotonically increasing but got [0,0]" 로 죽는다.
 *  (4-4 렌더 frame 398 에서 b05 의 fill_sec 0.01 이 Math.round → 0 이 됐다, 2026-09-02) */
export const durF = (sec: number, fps: number) => Math.max(1, Math.round(sec * fps));
/** 중심·반지름·각도로 타원 경로. rot 은 도(°) */
export const ellipsePath = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
  const pts: string[] = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry;
    const c = Math.cos(rot * DEG), s = Math.sin(rot * DEG);
    pts.push(`${(cx + x0 * c - y0 * s).toFixed(1)} ${(cy + x0 * s + y0 * c).toFixed(1)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(" L")} Z`;
};

/** 결정적 의사난수 — 렌더 프레임마다 같은 점 배치. **난수 위치를 화면에 그대로 쓰지 않는다**(표시는 배경 실물 위에 정직하게, rules §5c) */
export const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
