// 생성 대상 배지 — 시트 2차(3′ 뒤)와 슬라이드가 **같은 규칙**을 읽는다.
// 왜 한 곳인가: 손으로 두 곳에 두면 갈라진다(감사 F4). 여기가 정본이고 BeatSheet.tsx·build-slides.mjs 가 임포트한다.
//
// 「시트에 생성물을 올리지 않는다」(3′ 헌장 — 1차 시트는 수집 기준으로 승인받는다, track-3prime.md)가 금지한 것은 *아직 만들지도 않은 AI 영상*이지
// **어느 비트가 생성 대상인지 표시하는 것이 아니다** — 그건 확인 1 의 제출 요건이다(게이트 11).

/** @param {{visual?:{source?:string}, gen?:{status?:string, prompt?:string|null}|null}|null|undefined} shot */
export const genBadge = (shot) => {
  const g = shot?.gen;
  const src = shot?.visual?.source;
  if (src === "generated") return { text: "AI 생성", tone: "on" };      // 생성물이 화면에 들어간다
  if (!g) return null;
  if (g.status === "superseded" || g.status === "rejected") return null; // 실사·MC 로 대체됨 — 표시하지 않는다
  if (g.status === "planned") return { text: "AI 생성 예정", tone: "plan" }; // 3′ 에서 대상 확정, 아직 안 만듦
  return { text: "AI 후보", tone: "cand" };                              // 만들었으나 채택 안 됨 / 판정 중
};

export const BADGE_COLOR = { on: "#E8834A", plan: "#F2C744", cand: "#8B93A3" };
