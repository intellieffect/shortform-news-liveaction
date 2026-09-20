import { AbsoluteFill } from "remotion";
import type { Beat, Overlay, Shot, Style } from "./types";
import { BACKDROP_IDS, Background, BeatIdTag, Caption, CreditTag, CtaCard, DimGradient, Endcard, GraphicByType, Headline, Inset, LabelTag, QuoteCard, SafeGuides, useBeatClock } from "../lib/primitives";
import { OnscreenByType, ONSCREEN_IDS } from "../lib/primitives/Onscreen";

// 비트 1개 = 부품 조립. BeatSheet(격자)·Slides·ShortformNews(시퀀스)가 같은 컴포넌트를 쓴다.
// 층 순서: 배경(shots) → 그라디언트 → 텍스트 카드/자막(overlays) → 인셋·라벨·출처 → 편집 태그
// 모션·전환·오디오 토글은 props(motion / textAnim)로만 — 슬라이드는 둘 다 false.

type Props = {
  readonly beat: Beat;
  readonly overlay: Overlay;
  readonly shot: Shot | null;
  readonly style: Style;
  readonly guides?: boolean;
  readonly showId?: boolean; // 편집 중 비트 번호 표시 (render.config.debug.show_beat_id)
  readonly motion?: boolean; // 4-1 화면 모션 층
  readonly textAnim?: boolean; // 4-2 텍스트 모션 층
  readonly graphics?: boolean; // 4-3 그래픽 층 (shots.graphics[]). 슬라이드는 완성 상태로 표시
  readonly cutTextAfter?: number; // 4-4 디졸브: 이 로컬 프레임부터 텍스트·그래픽 층을 컷(배경만 페이드) — 자막 겹침 방지
};

const norm = (t: string) => t.replace(/["'“”‘’.,?!\s]/g, "");

export const BeatFrame: React.FC<Props> = ({ beat, overlay, shot, style, guides = false, showId = false, motion = false, textAnim = false, graphics = true, cutTextAfter }) => {
  const clock = useBeatClock(beat, { motion, textAnim });
  const textOn = cutTextAfter == null || clock.localFrame < cutTextAfter;
  const isHook = beat.role === "hook";
  const card = overlay.card;
  // 인셋 크레딧도 표기한다 — CC BY 는 화면 표기 의무인데 inset.credit 소비처가 없었다(9편 4-3R 이슈10, 전 편 공통)
  const creditParts = [shot?.credit ?? overlay.credit, ...(shot?.insets ?? []).map((i) => i.credit)].filter(Boolean);
  const credit = [...new Set(creditParts)].join("  ·  ") || null;
  const hasOnscreen = (shot?.graphics ?? []).some((g) => ONSCREEN_IDS.has(g.id)); // 대본 온스크린 텍스트가 있으면 훅 헤드라인 슬롯은 쓰지 않는다

  return (
    <AbsoluteFill
      style={{
        backgroundColor: style.colors.bg,
        fontFamily: `${style.font_family}, system-ui, sans-serif`,
      }}
    >
      <Background beat={beat} shot={shot} style={style} clock={clock} showPlan={showId} />
      {/* 배경 감광(scrim@1)은 **배경 바로 위**다 — 자막·온스크린·도해 아래에서 배경만 누른다.
          아래 graphics 자리에 두면 글자와 도해까지 눌린다(7편 v2 실측 G12) */}
      {graphics ? shot?.graphics?.filter((g) => BACKDROP_IDS.has(g.id)).map((g, i) => <GraphicByType key={"bd" + i} spec={g} style={style} clock={clock} />) : null}
      <DimGradient />

      {textOn ? (
        <>
          {isHook && !hasOnscreen && overlay.headline?.text ? <Headline overlay={overlay} style={style} clock={clock} /> : null}
          {card?.type === "quote" ? <QuoteCard beat={beat} card={card} style={style} clock={clock} /> : null}
          {card?.type === "cta" ? <CtaCard card={card} style={style} clock={clock} /> : null}
          {card?.type === "endcard" ? <Endcard card={card} style={style} clock={clock} /> : null}
          {/* 자막 — 내레이션 그대로. 온스크린 카드가 문장을 통째로 말하는 비트는 replaces_caption_line 으로 그 줄을 비운다(사용자 2026-08-30 '텍스트 걷어내기'). graphics 층이 꺼져 있으면 replaces_caption_line 도 무시한다(대체할 그래픽이 없으므로 줄이 통째로 사라진다 — 4-2 b06 버그) (사용자 결정 2026-08-29: 온스크린 텍스트는 별개 층). 엔드카드만 예외 */}
          {/* 온스크린(인용 카드)이 자막과 동일 텍스트를 말할 때만 자막 생략 — 요약·다른 문구면 자막 유지 (사용자 2026-08-30) */}
          {overlay.caption && card?.type !== "endcard" && !(card?.type === "quote" && norm(card.text) === norm(overlay.caption.text)) ? <Caption beat={beat} overlay={overlay} style={style} clock={clock} skipLines={(shot?.graphics ?? []).filter((g) => graphics || ONSCREEN_IDS.has(g.id)).flatMap((g) => (Array.isArray(g.replaces_caption_line) ? g.replaces_caption_line : g.replaces_caption_line != null ? [g.replaces_caption_line] : []))} /> : null}

          {/* 온스크린 텍스트(대본 자막)는 텍스트층 — graphics 토글과 무관하게 항상 */}
          {shot?.graphics?.filter((g) => ONSCREEN_IDS.has(g.id)).map((g, i) => <OnscreenByType key={"os" + i} spec={g} style={style} clock={clock} />)}
          {graphics ? shot?.graphics?.filter((g) => !ONSCREEN_IDS.has(g.id) && !BACKDROP_IDS.has(g.id)).map((g, i) => <GraphicByType key={i} spec={g} style={style} clock={clock} />) : null}
          {shot?.insets?.map((ins, i) => <Inset key={i} inset={ins} style={style} clock={clock} />)}
          {shot?.label_overlay ? <LabelTag text={shot.label_overlay} style={style} clock={clock} reserveRight={showId ? 200 : 0} inSec={shot.label_overlay_in ?? 0} /> : null}
          {credit ? <CreditTag text={credit} style={style} /> : null}
        </>
      ) : null}

      {showId ? <BeatIdTag id={beat.id} style={style} /> : null}
      {guides ? <SafeGuides style={style} /> : null}
    </AbsoluteFill>
  );
};
