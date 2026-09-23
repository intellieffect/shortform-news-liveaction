/** 채널 도해 토큰 — 색·타이포는 여기서만. 편 고유 값 금지(엔진은 편을 모른다). */
export const theme = {
  ink: '#F2F5F8',        // 기본 선·글자 (다크 배경 위)
  dim: '#8FA0AF',        // 보조 선·라벨
  accent: '#FFC24B',     // 강조 (채널 노랑) — 핵심 수치에만
  guide: '#3A4652',      // 안내선·눈금
  fontFamily: 'Pretendard, "Apple SD Gothic Neo", sans-serif',
  h1: 132,               // 주인공 수치 (output layer43 위계와 동일)
  h3: 50,                // 칩·비교 대상
  h4: 44,                // 보조 텍스트 하한 (규칙: ≥44px)
  stroke: 6,             // 기본 선 굵기 (1080폭 기준)
  safeX: 80,             // 안전영역
  safeY: 100,
  // 밝은 배경(태양 표면 등) 위에 알파로 얹힐 때 도해가 스스로 대비를 갖는다 — 5편 4-3 실측 2026-09-01.
  // output 코드 부품이 '어두운 아웃라인 2겹'으로 푸는 것과 같은 문제를 MC 는 그림자로 푼다.
  shadowColor: 'rgba(6,8,12,0.9)',
  shadowBlur: 22,
};
/** 자막 밴드(y 0.66~) 위에서 끝난다 — 도해 배치 상한 */
export const CAPTION_BAND_Y = 0.66;
